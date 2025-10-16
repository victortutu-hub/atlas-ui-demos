// src/atlas-analytics-dashboard.js (ENHANCED v4.1 - ML Actions Tracking)
// Real-time Analytics Dashboard cu Action Performance Tracking

class AtlasAnalyticsDashboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            simulator: null,
            metricsCollector: null,
            layoutInspector: null,
            isLive: false,
            refreshInterval: null,
            charts: {},
            selectedView: 'overview',
            historicalData: {
                atlas: [],
                static: []
            },
            winRate: 0,
            actionPerformance: new Map() // ⭐ NEW: Track action performance
        };

        this.render();
    }

    async connectedCallback() {
        await this.waitForDependencies();
        this.setupEventListeners();
        this.initCharts();
        this.startLiveUpdates();
    }

    disconnectedCallback() {
        this.stopLiveUpdates();
        this.destroyCharts();
    }

    useCollector() {
        return (window.ATLAS_MODE === 'prod') && (window.ATLAS_FLAGS?.collector === true) && !!this.state.metricsCollector;
    }

    computeFromCollector() {
        const coll = this.state.metricsCollector;
        const sessions = Array.isArray(coll?.state?.sessions) ? coll.state.sessions : [];
        const atlasData = sessions.filter(s => s.layoutType === 'atlas');
        const staticData = sessions.filter(s => s.layoutType === 'static');

        const calc = (arr) => {
            if (arr.length === 0) return {
                totalSessions: 0, ctr: 0, engagementRate: 0, conversionRate: 0,
                bounceRate: 0, avgTimeToAction: 0, avgEngagement: 0, avgAffordance: 0
            };
            const len = arr.length;
            const sum = (fn) => arr.reduce((a, b) => a + (fn(b) || 0), 0);
            return {
                totalSessions: len,
                ctr: arr.filter(s => s.clicked).length / len,
                engagementRate: arr.filter(s => s.engaged).length / len,
                conversionRate: arr.filter(s => s.converted).length / len,
                bounceRate: arr.filter(s => s.bounced).length / len,
                avgTimeToAction: sum(s => s.timeToAction) / len,
                avgEngagement: sum(s => s.engagementScore) / len,
                avgAffordance: sum(s => s.affordanceScore) / len
            };
        };

        // Adapt to dashboard's expected structure
        return {
            atlas: {
                sessions: atlasData.length,
                ctr: calc(atlasData).ctr,
                engagement: calc(atlasData).engagementRate,
                conversionRate: calc(atlasData).conversionRate,
                timeToAction: calc(atlasData).avgTimeToAction,
                bounceRate: calc(atlasData).bounceRate,
                avgAffordance: calc(atlasData).avgAffordance,
                componentMatches: 0
            },
            static: {
                sessions: staticData.length,
                ctr: calc(staticData).ctr,
                engagement: calc(staticData).engagementRate,
                conversionRate: calc(staticData).conversionRate,
                timeToAction: calc(staticData).avgTimeToAction,
                bounceRate: calc(staticData).bounceRate,
                avgAffordance: 0,
                componentMatches: 0
            },
            current: {
                persona: null,
                iterations: sessions.length,
                isRunning: false,
                lastAtlasLayout: null,
                lastStaticLayout: null
            },
            actions: new Map()
        };
    }


    async waitForDependencies() {
        let attempts = 0;
        while (!this.state.simulator && attempts < 50) {
            this.state.simulator = document.querySelector('atlas-simulation-integrated') ||
                document.querySelector('atlas-simulation-with-metrics');
            if (!this.state.simulator) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            attempts++;
        }

        attempts = 0;
        while (!this.state.metricsCollector && attempts < 50) {
            this.state.metricsCollector = document.querySelector('atlas-metrics-collector');
            if (!this.state.metricsCollector) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            attempts++;
        }

        this.state.layoutInspector = document.querySelector('atlas-layout-inspector');

        if (!window.Chart) {
            await this.loadChartJS();
        }

        console.log('[Dashboard] Dependencies loaded:', {
            simulator: !!this.state.simulator,
            metricsCollector: !!this.state.metricsCollector,
            layoutInspector: !!this.state.layoutInspector,
            chartJS: !!window.Chart
        });
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    startLiveUpdates() {
        this.state.isLive = true;
        this.state.refreshInterval = setInterval(() => {
            this.updateDashboard();
        }, 1000);
    }

    stopLiveUpdates() {
        this.state.isLive = false;
        if (this.state.refreshInterval) {
            clearInterval(this.state.refreshInterval);
            this.state.refreshInterval = null;
        }
    }

    updateDashboard() {
        if (!this.state.simulator) return;

        const metrics = this.collectMetrics();
        this.updateCharts(metrics);
        this.updateMetricCards(metrics);
        this.updateAffordancePanel(metrics);
        this.updateComponentPanel(metrics);
        this.updateActionPanel(metrics); // ⭐ NEW
        this.calculateWinRate(metrics);
    }

    collectMetrics() {
        const sim = this.state.simulator;

        const lastAtlasLayout = sim.state.lastAtlasLayout || {};
        const hasValidLayout = lastAtlasLayout && (lastAtlasLayout.structure || lastAtlasLayout.composition);

        return {
            atlas: {
                sessions: sim.state.atlasMetrics.sessions,
                ctr: sim.state.atlasMetrics.ctr,
                engagement: sim.state.atlasMetrics.engagement,
                conversionRate: sim.state.atlasMetrics.conversionRate,
                timeToAction: sim.state.atlasMetrics.timeToAction,
                bounceRate: sim.state.atlasMetrics.bounceRate,
                avgAffordance: sim.state.atlasMetrics.avgAffordance,
                componentMatches: sim.state.atlasMetrics.componentMatches
            },
            static: {
                sessions: sim.state.staticMetrics.sessions,
                ctr: sim.state.staticMetrics.ctr,
                engagement: sim.state.staticMetrics.engagement,
                conversionRate: sim.state.staticMetrics.conversionRate,
                timeToAction: sim.state.staticMetrics.timeToAction,
                bounceRate: sim.state.staticMetrics.bounceRate,
                avgAffordance: 0,
                componentMatches: 0
            },
            current: {
                persona: sim.state.currentPersona,
                iterations: sim.state.iterations,
                isRunning: sim.state.isRunning,
                lastAtlasLayout: hasValidLayout ? lastAtlasLayout : null,
                lastStaticLayout: sim.state.lastStaticLayout
            },
            actions: sim.state.actionStats || new Map() // ⭐ NEW
        };
    }

    calculateWinRate(metrics) {
        if (metrics.current.iterations < 10) {
            this.state.winRate = 0;
            return;
        }

        let atlasWins = 0;
        let totalComparisons = 0;

        const comparisons = [
            { atlas: metrics.atlas.ctr, static: metrics.static.ctr, inverse: false },
            { atlas: metrics.atlas.engagement, static: metrics.static.engagement, inverse: false },
            { atlas: metrics.atlas.conversionRate, static: metrics.static.conversionRate, inverse: false },
            { atlas: metrics.atlas.timeToAction, static: metrics.static.timeToAction, inverse: true },
            { atlas: metrics.atlas.bounceRate, static: metrics.static.bounceRate, inverse: true }
        ];

        comparisons.forEach(comp => {
            if (comp.static > 0) {
                totalComparisons++;
                if (comp.inverse) {
                    if (comp.atlas < comp.static) atlasWins++;
                } else {
                    if (comp.atlas > comp.static) atlasWins++;
                }
            }
        });

        this.state.winRate = totalComparisons > 0 ? (atlasWins / totalComparisons) * 100 : 0;

        const badge = this.shadowRoot.querySelector('[data-metric="winrate"]');
        if (badge) {
            badge.textContent = this.state.winRate.toFixed(0) + '%';
            badge.className = 'metric-value ' + this.getWinRateClass(this.state.winRate);
        }
    }

    getWinRateClass(winRate) {
        if (winRate >= 80) return 'win-excellent';
        if (winRate >= 60) return 'win-good';
        if (winRate >= 40) return 'win-fair';
        return 'win-poor';
    }

    initCharts() {
        const container = this.shadowRoot.querySelector('.charts-container');
        if (!container || !window.Chart) return;

        const chartConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#dfe6ff' }
                }
            },
            scales: {
                y: {
                    ticks: { color: '#8e9ab3' },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                },
                x: {
                    ticks: { color: '#8e9ab3' },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        };

        // Comparison Chart
        const comparisonCanvas = this.shadowRoot.querySelector('#comparison-chart');
        if (comparisonCanvas) {
            this.state.charts.comparison = new Chart(comparisonCanvas, {
                type: 'bar',
                data: {
                    labels: ['CTR', 'Engagement', 'Conversion', 'Bounce Rate'],
                    datasets: [
                        {
                            label: 'ATLAS',
                            data: [0, 0, 0, 0],
                            backgroundColor: 'rgba(122, 162, 255, 0.8)',
                            borderColor: '#7aa2ff',
                            borderWidth: 2
                        },
                        {
                            label: 'Static',
                            data: [0, 0, 0, 0],
                            backgroundColor: 'rgba(107, 114, 128, 0.6)',
                            borderColor: '#6b7280',
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    ...chartConfig,
                    scales: {
                        ...chartConfig.scales,
                        y: {
                            ...chartConfig.scales.y,
                            beginAtZero: true,
                            max: 1,
                            ticks: {
                                ...chartConfig.scales.y.ticks,
                                callback: (value) => (value * 100).toFixed(0) + '%'
                            }
                        }
                    },
                    plugins: {
                        ...chartConfig.plugins,
                        title: {
                            display: true,
                            text: 'All Metrics Comparison',
                            color: '#dfe6ff',
                            font: { size: 16, weight: 'bold' }
                        }
                    }
                }
            });
        }

        // Affordance Timeline
        const affordanceCanvas = this.shadowRoot.querySelector('#affordance-timeline');
        if (affordanceCanvas) {
            this.state.charts.affordance = new Chart(affordanceCanvas, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Affordance Score',
                            data: [],
                            borderColor: '#7aa2ff',
                            backgroundColor: 'rgba(122, 162, 255, 0.1)',
                            tension: 0.4,
                            fill: true,
                            borderWidth: 2,
                            pointRadius: 3,
                            pointHoverRadius: 5
                        }
                    ]
                },
                options: {
                    ...chartConfig,
                    scales: {
                        ...chartConfig.scales,
                        y: {
                            ...chartConfig.scales.y,
                            beginAtZero: true,
                            ticks: {
                                ...chartConfig.scales.y.ticks,
                                callback: function (value) {
                                    if (value > 1) {
                                        return (value * 100).toFixed(0) + '%';
                                    }
                                    return value.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        }

        // ⭐ NEW: Action Performance Chart
        const actionCanvas = this.shadowRoot.querySelector('#action-performance');
        if (actionCanvas) {
            this.state.charts.actionPerformance = new Chart(actionCanvas, {
                type: 'bar',
                data: {
                    labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
                    datasets: [
                        {
                            label: 'Avg Reward',
                            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            backgroundColor: 'rgba(245, 158, 11, 0.8)',
                            borderColor: '#f59e0b',
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    ...chartConfig,
                    scales: {
                        ...chartConfig.scales,
                        y: {
                            ...chartConfig.scales.y,
                            beginAtZero: true,
                            max: 1
                        }
                    },
                    plugins: {
                        ...chartConfig.plugins,
                        title: {
                            display: true,
                            text: 'ML Action Performance',
                            color: '#dfe6ff',
                            font: { size: 16, weight: 'bold' }
                        }
                    }
                }
            });
        }
    }

    updateCharts(metrics) {
        if (!window.Chart) return;

        // Update Comparison Chart
        if (this.state.charts.comparison) {
            this.state.charts.comparison.data.datasets[0].data = [
                metrics.atlas.ctr,
                metrics.atlas.engagement,
                metrics.atlas.conversionRate,
                metrics.atlas.bounceRate
            ];
            this.state.charts.comparison.data.datasets[1].data = [
                metrics.static.ctr,
                metrics.static.engagement,
                metrics.static.conversionRate,
                metrics.static.bounceRate
            ];
            this.state.charts.comparison.update('none');
        }

        // Update Affordance Timeline
        if (this.state.charts.affordance) {
            const chart = this.state.charts.affordance;
            const affordance = metrics.atlas.avgAffordance || 0;
            const iteration = metrics.current.iterations || 0;

            if (iteration >= 1) {
                const lastLabel = chart.data.labels[chart.data.labels.length - 1];

                if (lastLabel !== iteration) {
                    chart.data.labels.push(iteration);
                    chart.data.datasets[0].data.push(affordance);

                    if (chart.data.labels.length > 50) {
                        chart.data.labels.shift();
                        chart.data.datasets[0].data.shift();
                    }

                    chart.update('none');
                }
            }
        }

        // ⭐ NEW: Update Action Performance Chart
        if (this.state.charts.actionPerformance && metrics.actions) {
            const actionData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            for (let i = 0; i < 10; i++) {
                const stats = metrics.actions.get(i);
                if (stats) {
                    actionData[i] = stats.avgReward || 0;
                }
            }

            this.state.charts.actionPerformance.data.datasets[0].data = actionData;
            this.state.charts.actionPerformance.update('none');
        }
    }

    updateMetricCards(metrics) {
        this.updateMetric('sessions', metrics.current.iterations);
        this.updateMetric('affordance', (metrics.atlas.avgAffordance * 100).toFixed(0) + '%');
        this.updateMetric('matches', metrics.atlas.componentMatches.toFixed(1));
        this.updateMetric('advantage', this.calculateOverallAdvantage(metrics).toFixed(1) + '%');

        // ⭐ NEW: Update actions tried
        const actionsTried = metrics.actions ? metrics.actions.size : 0;
        this.updateMetric('actions-tried', actionsTried);
    }

    updateMetric(id, value) {
        const el = this.shadowRoot.querySelector(`[data-metric="${id}"]`);
        if (el) el.textContent = value;
    }

    updateAffordancePanel(metrics) {
        const panel = this.shadowRoot.querySelector('.affordance-details');
        if (!panel) return;

        const layout = metrics.current.lastAtlasLayout;

        let html = `
            <div class="affordance-item">
                <span class="label">Average Affordance Score:</span>
                <span class="value highlight">${(metrics.atlas.avgAffordance * 100).toFixed(0)}%</span>
            </div>
            <div class="affordance-item">
                <span class="label">Average Component Matches:</span>
                <span class="value highlight">${metrics.atlas.componentMatches.toFixed(1)}</span>
            </div>
            <div class="affordance-item">
                <span class="label">Total Sessions Analyzed:</span>
                <span class="value">${metrics.atlas.sessions}</span>
            </div>
            <div class="affordance-item">
                <span class="label">Simulation Status:</span>
                <span class="value">${metrics.current.isRunning ? '🟢 Running' : '⚫ Stopped'}</span>
            </div>
        `;

        // ⭐ NEW: Show ML Action info
        if (layout && layout.mlAction !== undefined && layout.mlAction !== null) {
            html += `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06);">
                    <div style="font-size: 12px; color: #8e9ab3; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        ML Action Control
                    </div>
                    <div class="affordance-item">
                        <span class="label">Current Action:</span>
                        <span class="value" style="background: linear-gradient(135deg, #f59e0b, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            Action ${layout.mlAction}
                        </span>
                    </div>
            `;

            if (layout.variations) {
                const varEntries = Object.entries(layout.variations)
                    .filter(([k]) => ['kpiCount', 'productCount', 'articleCount', 'gridCols', 'layout'].includes(k));

                varEntries.forEach(([key, value]) => {
                    html += `
                        <div class="affordance-item">
                            <span class="label">${key}:</span>
                            <span class="value">${value}</span>
                        </div>
                    `;
                });
            }

            html += `</div>`;
        }

        const hasCompleteLayout = layout &&
            layout.structure?.type &&
            layout.grid?.cols !== undefined &&
            layout.grid?.gap !== undefined;

        if (hasCompleteLayout) {
            html += `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06);">
                    <div style="font-size: 12px; color: #8e9ab3; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        Latest Layout Details
                    </div>
                    <div class="affordance-item">
                        <span class="label">Layout Type:</span>
                        <span class="value">${layout.structure.type}</span>
                    </div>
                    <div class="affordance-item">
                        <span class="label">Total Slots:</span>
                        <span class="value">${layout.slots?.length || 0}</span>
                    </div>
                    <div class="affordance-item">
                        <span class="label">Grid Configuration:</span>
                        <span class="value">${layout.grid.cols} cols, ${layout.grid.gap}px gap</span>
                    </div>
                </div>
            `;
        }

        panel.innerHTML = html;
    }

    updateComponentPanel(metrics) {
        const panel = this.shadowRoot.querySelector('.component-details');
        if (!panel) return;

        const layout = metrics.current.lastAtlasLayout;
        let composition = layout?.composition;

        if (!composition && this.state.simulator?.state?.lastAtlasLayout?.composition) {
            composition = this.state.simulator.state.lastAtlasLayout.composition;
        }

        if (!composition || composition.length === 0) {
            panel.innerHTML = `
                <div class="affordance-item">
                    <span class="label">Total Components:</span>
                    <span class="value">0</span>
                </div>
                <div style="margin-top: 16px; padding: 12px; background: rgba(122, 162, 255, 0.1); border-radius: 8px; font-size: 13px; color: #8e9ab3;">
                    💡 Start the simulator to see component matching statistics
                </div>
            `;
            return;
        }

        const componentCounts = {};
        const componentScores = {};

        composition.forEach(comp => {
            const name = comp.component || 'unknown';
            componentCounts[name] = (componentCounts[name] || 0) + 1;

            if (comp.metadata?.score) {
                if (!componentScores[name]) {
                    componentScores[name] = [];
                }
                componentScores[name].push(comp.metadata.score);
            }
        });

        let html = '<div class="component-list">';

        html += `
            <div class="affordance-item">
                <span class="label">Total Components:</span>
                <span class="value highlight">${composition.length}</span>
            </div>
        `;

        for (const [component, count] of Object.entries(componentCounts)) {
            const avgScore = componentScores[component]
                ? (componentScores[component].reduce((a, b) => a + b, 0) / componentScores[component].length).toFixed(1)
                : 'N/A';

            html += `
                <div class="affordance-item">
                    <span class="label">${component}:</span>
                    <span class="value">${count}x (avg score: ${avgScore})</span>
                </div>
            `;
        }

        html += '</div>';
        panel.innerHTML = html;
    }

    // ⭐ NEW: Action Performance Panel
    updateActionPanel(metrics) {
        const panel = this.shadowRoot.querySelector('.action-details');
        if (!panel) return;

        if (!metrics.actions || metrics.actions.size === 0) {
            panel.innerHTML = `
                <div class="affordance-item">
                    <span class="label">Actions Tried:</span>
                    <span class="value">0</span>
                </div>
                <div style="margin-top: 16px; padding: 12px; background: rgba(245, 158, 11, 0.1); border-radius: 8px; font-size: 13px; color: #f59e0b;">
                    🎯 Start the simulator to see ML action performance
                </div>
            `;
            return;
        }

        // Sort by reward
        const sortedActions = Array.from(metrics.actions.entries())
            .sort((a, b) => b[1].avgReward - a[1].avgReward);

        let html = '<div class="action-list">';

        html += `
            <div class="affordance-item">
                <span class="label">Actions Explored:</span>
                <span class="value highlight">${metrics.actions.size} / 10</span>
            </div>
        `;

        sortedActions.forEach(([action, stats], index) => {
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

            html += `
                <div class="affordance-item" style="${rank <= 3 ? 'background: rgba(245, 158, 11, 0.05);' : ''}">
                    <span class="label">${rankEmoji} Action ${action}:</span>
                    <span class="value">
                        Reward: ${(stats.avgReward * 100).toFixed(0)}% 
                        <span style="opacity: 0.7; font-size: 11px;">(${stats.uses} uses)</span>
                    </span>
                </div>
            `;
        });

        html += '</div>';
        panel.innerHTML = html;
    }

    calculateOverallAdvantage(metrics) {
        const improvements = [
            this.calculateImprovement(metrics.atlas.ctr, metrics.static.ctr),
            this.calculateImprovement(metrics.atlas.engagement, metrics.static.engagement),
            this.calculateImprovement(metrics.atlas.conversionRate, metrics.static.conversionRate),
            this.calculateImprovement(metrics.atlas.timeToAction, metrics.static.timeToAction, true),
            this.calculateImprovement(metrics.atlas.bounceRate, metrics.static.bounceRate, true)
        ];

        return improvements.reduce((a, b) => a + b, 0) / improvements.length;
    }

    calculateImprovement(atlas, static_, inverse = false) {
        if (static_ === 0) return 0;
        const imp = ((atlas - static_) / static_) * 100;
        return inverse ? -imp : imp;
    }

    destroyCharts() {
        Object.values(this.state.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.state.charts = {};
    }

    switchView(view) {
        this.state.selectedView = view;

        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        this.shadowRoot.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.view === view);
        });
    }

    exportSnapshot() {
        if (!this.state.simulator) return;

        const metrics = this.collectMetrics();
        const snapshot = {
            timestamp: new Date().toISOString(),
            metrics: metrics,
            winRate: this.state.winRate,
            registry: window.__ATLAS_REGISTRY__?.()?.getStats() || null,
            actionPerformance: metrics.actions ?
                Array.from(metrics.actions.entries()).map(([action, stats]) => ({
                    action,
                    avgReward: stats.avgReward,
                    uses: stats.uses
                })) : []
        };

        const json = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `atlas-dashboard-snapshot-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    setupEventListeners() {
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchView(tab.dataset.view);
            });
        });

        const exportBtn = this.shadowRoot.querySelector('#export-snapshot');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSnapshot());
        }

        const liveToggle = this.shadowRoot.querySelector('#live-toggle');
        if (liveToggle) {
            liveToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startLiveUpdates();
                } else {
                    this.stopLiveUpdates();
                }
            });
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                
                .dashboard {
                    background: #0b0d12;
                    color: #dfe6ff;
                    padding: 24px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                
                h1 {
                    font-size: 28px;
                    margin: 0;
                    background: linear-gradient(135deg, #7aa2ff, #10b981);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .subtitle {
                    color: #8e9ab3;
                    font-size: 14px;
                    margin-top: 4px;
                }
                
                .version-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    background: linear-gradient(135deg, #10b981, #3b82f6);
                    color: white;
                    margin-left: 8px;
                }
                
                .header-controls {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                
                .live-indicator {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 8px;
                    font-size: 13px;
                    color: #10b981;
                }
                
                .pulse {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #10b981;
                    animation: pulse 2s ease-in-out infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                
                button {
                    padding: 10px 20px;
                    border-radius: 10px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #7aa2ff, #8b5cf6);
                    color: white;
                }
                
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(122, 162, 255, 0.4);
                }
                
                .tabs {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 24px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                
                .tab {
                    padding: 12px 24px;
                    background: transparent;
                    color: #8e9ab3;
                    border: none;
                    border-bottom: 2px solid transparent;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                
                .tab:hover {
                    color: #dfe6ff;
                    background: rgba(255,255,255,0.02);
                }
                
                .tab.active {
                    color: #7aa2ff;
                    border-bottom-color: #7aa2ff;
                }
                
                .view-panel {
                    display: none;
                }
                
                .view-panel.active {
                    display: block;
                }
                
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }
                
                .metric-card {
                    background: #151823;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                    text-align: center;
                }
                
                .metric-label {
                    font-size: 12px;
                    color: #8e9ab3;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }
                
                .metric-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #7aa2ff;
                }
                
                .metric-value.highlight {
                    background: linear-gradient(135deg, #7aa2ff, #10b981);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .win-excellent { color: #10b981 !important; }
                .win-good { color: #3b82f6 !important; }
                .win-fair { color: #f59e0b !important; }
                .win-poor { color: #ef4444 !important; }
                
                .charts-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 20px;
                    margin-bottom: 24px;
                }
                
                .chart-card {
                    background: #151823;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .chart-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #dfe6ff;
                    margin-bottom: 16px;
                }
                
                .chart-wrapper {
                    height: 250px;
                }
                
                .affordance-panel {
                    background: #151823;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .affordance-details, .component-list, .action-list {
                    display: grid;
                    gap: 12px;
                }
                
                .affordance-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px;
                    background: rgba(255,255,255,0.02);
                    border-radius: 8px;
                }
                
                .affordance-item .label {
                    color: #8e9ab3;
                    font-size: 13px;
                }
                
                .affordance-item .value {
                    color: #dfe6ff;
                    font-weight: 600;
                }
                
                .affordance-item .value.highlight {
                    color: #10b981;
                }
                
                input[type="checkbox"] {
                    width: 40px;
                    height: 20px;
                    cursor: pointer;
                }
            </style>
            
            <div class="dashboard">
                <div class="dashboard-header">
                    <div>
                        <h1>📊 ATLAS Analytics Dashboard <span class="version-badge">v4.1</span></h1>
                        <div class="subtitle">Real-time monitoring with ML action tracking</div>
                    </div>
                    <div class="header-controls">
                        <label class="live-indicator">
                            <div class="pulse"></div>
                            <span>Live Updates</span>
                            <input type="checkbox" id="live-toggle" checked>
                        </label>
                        <button class="btn-primary" id="export-snapshot">
                            📥 Export Snapshot
                        </button>
                    </div>
                </div>
                
                <div class="tabs">
                    <button class="tab active" data-view="overview">Overview</button>
                    <button class="tab" data-view="affordance">Affordance Analysis</button>
                    <button class="tab" data-view="components">Component Matching</button>
                    <button class="tab" data-view="actions">ML Actions</button>
                </div>
                
                <!-- Overview Panel -->
                <div class="view-panel active" data-view="overview">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-label">Total Sessions</div>
                            <div class="metric-value" data-metric="sessions">0</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">🏆 Win Rate</div>
                            <div class="metric-value win-fair" data-metric="winrate">0%</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Avg Affordance</div>
                            <div class="metric-value highlight" data-metric="affordance">0%</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Perfect Matches</div>
                            <div class="metric-value" data-metric="matches">0</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Actions Tried</div>
                            <div class="metric-value" style="color: #f59e0b;" data-metric="actions-tried">0</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Overall Advantage</div>
                            <div class="metric-value highlight" data-metric="advantage">0%</div>
                        </div>
                    </div>
                    
                    <div class="charts-container">
                        <div class="chart-card" style="grid-column: 1 / -1;">
                            <div class="chart-title">📊 All Metrics Comparison (ATLAS vs Static)</div>
                            <div class="chart-wrapper">
                                <canvas id="comparison-chart"></canvas>
                            </div>
                        </div>
                        <div class="chart-card">
                            <div class="chart-title">Affordance Score Timeline</div>
                            <div class="chart-wrapper">
                                <canvas id="affordance-timeline"></canvas>
                            </div>
                        </div>
                        <div class="chart-card">
                            <div class="chart-title">🎯 ML Action Performance</div>
                            <div class="chart-wrapper">
                                <canvas id="action-performance"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Affordance Panel -->
                <div class="view-panel" data-view="affordance">
                    <div class="affordance-panel">
                        <div class="chart-title">Current Layout Affordance Details</div>
                        <div class="affordance-details">
                            <div class="affordance-item">
                                <span class="label">Waiting for data...</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Components Panel -->
                <div class="view-panel" data-view="components">
                    <div class="affordance-panel">
                        <div class="chart-title">Component Matching Statistics</div>
                        <div class="component-details">
                            <div class="affordance-item">
                                <span class="label">Waiting for data...</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Actions Panel (NEW) -->
                <div class="view-panel" data-view="actions">
                    <div class="affordance-panel">
                        <div class="chart-title">🎯 ML Action Performance Rankings</div>
                        <div class="action-details">
                            <div class="affordance-item">
                                <span class="label">Waiting for data...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }
}

customElements.define('atlas-analytics-dashboard', AtlasAnalyticsDashboard);