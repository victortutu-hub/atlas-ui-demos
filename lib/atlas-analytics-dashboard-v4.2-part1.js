// src/atlas-analytics-dashboard-v4.2.js
// 📊 ATLAS Analytics Dashboard v4.2 - WITH REAL USER TRACKING!
// Tracks BOTH simulated sessions AND real user feedback

class AtlasAnalyticsDashboardV42 extends HTMLElement {
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
            
            // ⭐ NEW: Separate metrics for real users
            realUserMetrics: this.initMetrics(),
            simulatedMetrics: this.initMetrics(),
            
            winRate: 0,
            actionPerformance: new Map(),
            
            // ⭐ NEW: Real user specific
            realUserSessions: 0,
            realUserActionStats: new Map()
        };

        this.render();
    }

    initMetrics() {
        return {
            sessions: 0,
            ctr: 0,
            engagement: 0,
            conversionRate: 0,
            timeToAction: 0,
            bounceRate: 0,
            avgAffordance: 0,
            componentMatches: 0,
            feedbacks: 0,
            positiveFeedbacks: 0,
            negativeFeedbacks: 0,
            satisfactionRate: 0
        };
    }

    async connectedCallback() {
        await this.waitForDependencies();
        this.setupEventListeners();
        this.initCharts();
        
        // ⭐ NEW: Listen to real user events
        this.setupRealUserTracking();
        
        this.startLiveUpdates();
    }

    disconnectedCallback() {
        this.stopLiveUpdates();
        this.destroyCharts();
        
        // ⭐ Cleanup event listeners
        if (this.feedbackUnsubscribe) {
            this.feedbackUnsubscribe();
        }
        if (this.layoutViewUnsubscribe) {
            this.layoutViewUnsubscribe();
        }
    }

    // ⭐ NEW: Setup real user event tracking
    setupRealUserTracking() {
        if (!window.ATLAS_EVENTS) {
            console.warn('[Dashboard v4.2] Event Bus not available');
            return;
        }

        console.log('[Dashboard v4.2] 🎯 Setting up real user tracking...');

        // Listen to user feedback events
        this.feedbackUnsubscribe = window.ATLAS_EVENTS.on('user-feedback', (data) => {
            this.handleRealUserFeedback(data);
        });

        // Listen to layout view events
        this.layoutViewUnsubscribe = window.ATLAS_EVENTS.on('layout-view', (data) => {
            this.handleLayoutView(data);
        });

        console.log('[Dashboard v4.2] ✅ Real user tracking active!');
    }

    // ⭐ NEW: Handle real user feedback
    handleRealUserFeedback(data) {
        console.log('[Dashboard v4.2] 👤 Real user feedback:', {
            action: data.action,
            reward: data.reward,
            component: data.componentId
        });

        const metrics = this.state.realUserMetrics;

        // Update feedback counts
        metrics.feedbacks++;
        if (data.reward === 1) {
            metrics.positiveFeedbacks++;
        } else {
            metrics.negativeFeedbacks++;
        }

        // Calculate satisfaction rate
        metrics.satisfactionRate = metrics.feedbacks > 0 
            ? metrics.positiveFeedbacks / metrics.feedbacks 
            : 0;

        // Update action stats
        if (data.action !== undefined && data.action !== null) {
            if (!this.state.realUserActionStats.has(data.action)) {
                this.state.realUserActionStats.set(data.action, {
                    uses: 0,
                    likes: 0,
                    dislikes: 0,
                    avgReward: 0,
                    rewards: []
                });
            }

            const actionStat = this.state.realUserActionStats.get(data.action);
            actionStat.uses++;
            
            if (data.reward === 1) {
                actionStat.likes++;
            } else {
                actionStat.dislikes++;
            }

            actionStat.rewards.push(data.reward);
            actionStat.avgReward = actionStat.rewards.reduce((a, b) => a + b, 0) / actionStat.rewards.length;
        }

        // Trigger re-render
        this.updateCharts(this.collectAllMetrics());
        this.updateMetricCards(this.collectAllMetrics());
    }

    // ⭐ NEW: Handle layout views
    handleLayoutView(data) {
        console.log('[Dashboard v4.2] 📄 Layout viewed:', {
            action: data.action,
            layoutType: data.layoutType,
            component: data.componentId
        });

        // Increment view count
        this.state.realUserSessions++;
        
        // Could track more metrics here if needed
        // e.g., most viewed layouts, popular actions, etc.
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

        console.log('[Dashboard v4.2] Dependencies loaded:', {
            simulator: !!this.state.simulator,
            metricsCollector: !!this.state.metricsCollector,
            layoutInspector: !!this.state.layoutInspector,
            chartJS: !!window.Chart,
            eventBus: !!window.ATLAS_EVENTS,
            sessionTracker: !!window.ATLAS_SESSION_TRACKER
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
        const metrics = this.collectAllMetrics();
        this.updateCharts(metrics);
        this.updateMetricCards(metrics);
        this.updateRealUserPanel(metrics);
        this.updateSimulatedPanel(metrics);
        this.updateActionPanel(metrics);
    }

    // ⭐ NEW: Collect metrics from ALL sources
    collectAllMetrics() {
        // Simulated metrics (from simulator)
        let simulatedMetrics = this.initMetrics();
        if (this.state.simulator) {
            simulatedMetrics = {
                sessions: this.state.simulator.state.iterations || 0,
                ctr: this.state.simulator.state.atlasMetrics.ctr || 0,
                engagement: this.state.simulator.state.atlasMetrics.engagement || 0,
                conversionRate: this.state.simulator.state.atlasMetrics.conversionRate || 0,
                timeToAction: this.state.simulator.state.atlasMetrics.timeToAction || 0,
                bounceRate: this.state.simulator.state.atlasMetrics.bounceRate || 0,
                avgAffordance: this.state.simulator.state.atlasMetrics.avgAffordance || 0,
                componentMatches: this.state.simulator.state.atlasMetrics.componentMatches || 0,
                actionStats: this.state.simulator.state.actionStats || new Map()
            };
        }

        // Real user metrics
        let realUserMetrics = { ...this.state.realUserMetrics };
        
        // Add session tracker data if available
        if (window.ATLAS_SESSION_TRACKER) {
            const sessionStats = window.ATLAS_SESSION_TRACKER.getStats();
            realUserMetrics.sessions = sessionStats.totalSessions;
            realUserMetrics.feedbacks = sessionStats.totalFeedbacks;
            realUserMetrics.positiveFeedbacks = sessionStats.positiveFeedbacks;
            realUserMetrics.negativeFeedbacks = sessionStats.negativeFeedbacks;
            realUserMetrics.satisfactionRate = sessionStats.satisfactionRate;
        }

        return {
            realUser: realUserMetrics,
            simulated: simulatedMetrics,
            realUserActionStats: this.state.realUserActionStats,
            current: {
                isRunning: this.state.simulator?.state?.isRunning || false,
                iterations: simulatedMetrics.sessions,
                realUserViews: this.state.realUserSessions
            }
        };
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

        // ⭐ NEW: Real vs Simulated Comparison Chart
        const comparisonCanvas = this.shadowRoot.querySelector('#comparison-chart');
        if (comparisonCanvas) {
            this.state.charts.comparison = new Chart(comparisonCanvas, {
                type: 'bar',
                data: {
                    labels: ['Satisfaction', 'Engagement', 'Affordance'],
                    datasets: [
                        {
                            label: '👤 Real Users',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(139, 92, 246, 0.8)',
                            borderColor: '#8b5cf6',
                            borderWidth: 2
                        },
                        {
                            label: '🤖 Simulated',
                            data: [0, 0, 0],
                            backgroundColor: 'rgba(122, 162, 255, 0.6)',
                            borderColor: '#7aa2ff',
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
                            text: 'Real Users vs Simulated Comparison',
                            color: '#dfe6ff',
                            font: { size: 16, weight: 'bold' }
                        }
                    }
                }
            });
        }

        // ⭐ NEW: Real User Action Performance
        const realActionCanvas = this.shadowRoot.querySelector('#real-action-performance');
        if (realActionCanvas) {
            this.state.charts.realActionPerformance = new Chart(realActionCanvas, {
                type: 'bar',
                data: {
                    labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
                    datasets: [
                        {
                            label: '👍 Likes',
                            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            backgroundColor: 'rgba(16, 185, 129, 0.8)',
                            borderColor: '#10b981',
                            borderWidth: 2
                        },
                        {
                            label: '👎 Dislikes',
                            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            backgroundColor: 'rgba(239, 68, 68, 0.8)',
                            borderColor: '#ef4444',
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
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        ...chartConfig.plugins,
                        title: {
                            display: true,
                            text: '👤 Real User Feedback per Action',
                            color: '#dfe6ff',
                            font: { size: 16, weight: 'bold' }
                        }
                    }
                }
            });
        }

        // Satisfaction Timeline
        const satisfactionCanvas = this.shadowRoot.querySelector('#satisfaction-timeline');
        if (satisfactionCanvas) {
            this.state.charts.satisfaction = new Chart(satisfactionCanvas, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: '👤 Real User Satisfaction',
                            data: [],
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            tension: 0.4,
                            fill: true,
                            borderWidth: 3,
                            pointRadius: 4,
                            pointHoverRadius: 6
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
                            text: 'Real User Satisfaction Over Time',
                            color: '#dfe6ff',
                            font: { size: 14, weight: 'bold' }
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
                metrics.realUser.satisfactionRate,
                metrics.realUser.engagement,
                metrics.realUser.avgAffordance
            ];
            this.state.charts.comparison.data.datasets[1].data = [
                metrics.simulated.conversionRate || 0,
                metrics.simulated.engagement || 0,
                metrics.simulated.avgAffordance || 0
            ];
            this.state.charts.comparison.update('none');
        }

        // Update Real Action Performance Chart
        if (this.state.charts.realActionPerformance) {
            const likes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            const dislikes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

            metrics.realUserActionStats.forEach((stats, action) => {
                if (action >= 0 && action <= 9) {
                    likes[action] = stats.likes || 0;
                    dislikes[action] = stats.dislikes || 0;
                }
            });

            this.state.charts.realActionPerformance.data.datasets[0].data = likes;
            this.state.charts.realActionPerformance.data.datasets[1].data = dislikes;
            this.state.charts.realActionPerformance.update('none');
        }

        // Update Satisfaction Timeline
        if (this.state.charts.satisfaction && metrics.realUser.feedbacks > 0) {
            const chart = this.state.charts.satisfaction;
            const currentFeedbacks = metrics.realUser.feedbacks;
            const lastLabel = chart.data.labels[chart.data.labels.length - 1];

            if (lastLabel !== currentFeedbacks) {
                chart.data.labels.push(currentFeedbacks);
                chart.data.datasets[0].data.push(metrics.realUser.satisfactionRate);

                if (chart.data.labels.length > 50) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }

                chart.update('none');
            }
        }
    }

    updateMetricCards(metrics) {
        // Real User metrics
        this.updateMetric('real-sessions', metrics.realUser.sessions);
        this.updateMetric('real-feedbacks', metrics.realUser.feedbacks);
        this.updateMetric('real-satisfaction', (metrics.realUser.satisfactionRate * 100).toFixed(0) + '%');
        this.updateMetric('real-actions-tried', metrics.realUserActionStats.size);

        // Simulated metrics
        this.updateMetric('sim-sessions', metrics.simulated.sessions);
        this.updateMetric('sim-affordance', (metrics.simulated.avgAffordance * 100).toFixed(0) + '%');
        this.updateMetric('sim-matches', metrics.simulated.componentMatches.toFixed(1));
        
        // Calculate advantage
        const advantage = this.calculateAdvantage(metrics);
        this.updateMetric('advantage', advantage.toFixed(1) + '%');
    }

    updateMetric(id, value) {
        const el = this.shadowRoot.querySelector(`[data-metric="${id}"]`);
        if (el) el.textContent = value;
    }

    // ⭐ NEW: Real User Panel
    updateRealUserPanel(metrics) {
        const panel = this.shadowRoot.querySelector('.real-user-details');
        if (!panel) return;

        const realUser = metrics.realUser;

        let html = `
            <div class="metric-row">
                <span class="label">Total Feedback:</span>
                <span class="value highlight">${realUser.feedbacks}</span>
            </div>
            <div class="metric-row">
                <span class="label">👍 Likes:</span>
                <span class="value" style="color: #10b981;">${realUser.positiveFeedbacks}</span>
            </div>
            <div class="metric-row">
                <span class="label">👎 Dislikes:</span>
                <span class="value" style="color: #ef4444;">${realUser.negativeFeedbacks}</span>
            </div>
            <div class="metric-row">
                <span class="label">Satisfaction Rate:</span>
                <span class="value highlight">${(realUser.satisfactionRate * 100).toFixed(0)}%</span>
            </div>
            <div class="metric-row">
                <span class="label">Sessions:</span>
                <span class="value">${realUser.sessions}</span>
            </div>
            <div class="metric-row">
                <span class="label">Actions Explored:</span>
                <span class="value">${metrics.realUserActionStats.size} / 10</span>
            </div>
        `;

        // Top actions by likes
        if (metrics.realUserActionStats.size > 0) {
            const sortedActions = Array.from(metrics.realUserActionStats.entries())
                .sort((a, b) => b[1].likes - a[1].likes)
                .slice(0, 3);

            html += `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06);">
                    <div style="font-size: 12px; color: #8e9ab3; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🏆 Top Actions (by 👍)
                    </div>
            `;

            sortedActions.forEach(([action, stats], index) => {
                const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                html += `
                    <div class="metric-row">
                        <span class="label">${emoji} Action ${action}:</span>
                        <span class="value">
                            ${stats.likes} 👍 / ${stats.dislikes} 👎
                            <span style="opacity: 0.7; font-size: 11px;">(${stats.uses} uses)</span>
                        </span>
                    </div>
                `;
            });

            html += `</div>`;
        }

        panel.innerHTML = html;
    }

    // ⭐ NEW: Simulated Panel  
    updateSimulatedPanel(metrics) {
        const panel = this.shadowRoot.querySelector('.simulated-details');
        if (!panel) return;

        const sim = metrics.simulated;

        let html = `
            <div class="metric-row">
                <span class="label">Total Sessions:</span>
                <span class="value highlight">${sim.sessions}</span>
            </div>
            <div class="metric-row">
                <span class="label">Win Rate:</span>
                <span class="value">${(sim.conversionRate * 100).toFixed(0)}%</span>
            </div>
            <div class="metric-row">
                <span class="label">Avg Affordance:</span>
                <span class="value">${(sim.avgAffordance * 100).toFixed(0)}%</span>
            </div>
            <div class="metric-row">
                <span class="label">Component Matches:</span>
                <span class="value">${sim.componentMatches.toFixed(1)}</span>
            </div>
            <div class="metric-row">
                <span class="label">Status:</span>
                <span class="value">${metrics.current.isRunning ? '🟢 Running' : '⚫ Stopped'}</span>
            </div>
        `;

        panel.innerHTML = html;
    }

    updateActionPanel(metrics) {
        // Implementation similar to v4.1 but with real user data
        // Combined view showing both simulated and real data
    }

    calculateAdvantage(metrics) {
        const realSat = metrics.realUser.satisfactionRate;
        const simConv = metrics.simulated.conversionRate || 0;
        
        if (simConv === 0) return 0;
        
        return ((realSat - simConv) / simConv) * 100;
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
        const metrics = this.collectAllMetrics();
        
        const snapshot = {
            timestamp: new Date().toISOString(),
            version: '4.2',
            realUserMetrics: metrics.realUser,
            simulatedMetrics: metrics.simulated,
            realUserActionStats: Array.from(metrics.realUserActionStats.entries()).map(([action, stats]) => ({
                action,
                ...stats
            })),
            sessionTrackerData: window.ATLAS_SESSION_TRACKER?.getStats() || null,
            eventHistory: window.ATLAS_EVENTS?.getHistory('user-feedback', 50) || []
        };

        const json = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `atlas-dashboard-v42-snapshot-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);

        console.log('[Dashboard v4.2] 📥 Snapshot exported');
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
        // Rendering logic continues in next part due to size...
        // Creating minimal structure here, full render in separate method
        this.shadowRoot.innerHTML = `
            <style>
                ${this.getStyles()}
            </style>
            <div class="dashboard">
                ${this.getDashboardHTML()}
            </div>
        `;

        this.setupEventListeners();
    }

    getStyles() {
        return `
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
            
            /* Continuation of styles in next file... */
        `;
    }

    getDashboardHTML() {
        // HTML structure continues in next part...
        return `<!-- Dashboard HTML -->`;
    }
}

customElements.define('atlas-analytics-dashboard-v42', AtlasAnalyticsDashboardV42);

// Part 1 complete - styles and full HTML in next file
