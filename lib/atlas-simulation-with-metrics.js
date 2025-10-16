// src/atlas-simulation-with-metrics.js
// Simulator integrat cu Metrics Collection

class AtlasSimulationWithMetrics extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            isRunning: false,
            speed: 5,
            iterations: 0,
            atlasMetrics: this.initMetrics(),
            staticMetrics: this.initMetrics(),
            currentPersona: null,
            events: [],
            metricsCollector: null
        };

        this.intervalRef = null;
        this.render();
    }

    initMetrics() {
        return {
            ctr: 0,
            engagement: 0,
            conversionRate: 0,
            timeToAction: 0,
            bounceRate: 0,
            sessions: 0,
            avgAffordance: 0,
            componentMatches: 0
        };
    }

    async connectedCallback() {
        await this.waitForAtlas();
        this.findMetricsCollector();
        this.setupEventListeners();
    }

    async waitForAtlas() {
        let attempts = 0;
        while (!window.__ATLAS_REGISTRY__ && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.__ATLAS_REGISTRY__) {
            this.registry = window.__ATLAS_REGISTRY__();
            console.log('[Simulation] Connected to ATLAS Registry');
        }
    }

    findMetricsCollector() {
        // Caută metrics collector în pagină
        this.state.metricsCollector = document.querySelector('atlas-metrics-collector');
        if (this.state.metricsCollector) {
            console.log('[Simulation] Connected to Metrics Collector');
        }
    }

    disconnectedCallback() {
        this.stop();
    }

    get personas() {
        return {
            powerUser: {
                name: 'Power User',
                icon: '⚡',
                affordanceWeight: 0.8,
                clickProbability: 0.75,
                engagementDepth: 0.85,
                conversionIntent: 0.7,
                bounceThreshold: 0.15
            },
            casual: {
                name: 'Casual Browser',
                icon: '🌊',
                affordanceWeight: 0.5,
                clickProbability: 0.45,
                engagementDepth: 0.5,
                conversionIntent: 0.35,
                bounceThreshold: 0.4
            },
            mobileFocused: {
                name: 'Mobile User',
                icon: '📱',
                affordanceWeight: 0.7,
                clickProbability: 0.6,
                engagementDepth: 0.6,
                conversionIntent: 0.5,
                bounceThreshold: 0.3
            },
            taskOriented: {
                name: 'Task-Oriented',
                icon: '🎯',
                affordanceWeight: 0.9,
                clickProbability: 0.85,
                engagementDepth: 0.7,
                conversionIntent: 0.8,
                bounceThreshold: 0.1
            },
            explorer: {
                name: 'Explorer',
                icon: '🔍',
                affordanceWeight: 0.6,
                clickProbability: 0.55,
                engagementDepth: 0.75,
                conversionIntent: 0.4,
                bounceThreshold: 0.25
            },
            skeptical: {
                name: 'Skeptical',
                icon: '🤔',
                affordanceWeight: 0.4,
                clickProbability: 0.3,
                engagementDepth: 0.35,
                conversionIntent: 0.2,
                bounceThreshold: 0.55
            }
        };
    }

    async generateAtlasLayout(intent) {
        if (!this.registry) {
            return {
                affordanceScore: 0.35,
                componentMatches: 0,
                slots: 4
            };
        }

        try {
            const getLayoutGenerator = window.getLayoutGenerator;
            const ComponentComposer = window.ComponentComposer;

            if (!getLayoutGenerator || !ComponentComposer) {
                throw new Error('ATLAS modules not available');
            }

            const generator = getLayoutGenerator();
            const layout = generator.generate(intent);

            const composer = new ComponentComposer(this.registry);
            const composition = composer.compose(layout, intent);

            let totalAffordance = 0;
            let totalMatches = 0;

            for (const comp of composition) {
                const entry = this.registry.registry.get(comp.component);
                if (entry && entry.affordance) {
                    const aff = entry.affordance;

                    const priorityScore = (aff.priority || 5) / 10;
                    const contextMatch = aff.contexts?.includes(intent.domain) ? 0.3 : 0;
                    const goalMatch = aff.goals?.includes(intent.goal) ? 0.25 : 0;
                    const capabilityBonus = (comp.metadata?.score || 0) / 100 * 0.2;

                    totalAffordance += priorityScore + contextMatch + goalMatch + capabilityBonus;
                    totalMatches += (contextMatch > 0 || goalMatch > 0) ? 1 : 0;
                }
            }

            const avgAffordance = composition.length > 0 ? totalAffordance / composition.length : 0;

            return {
                affordanceScore: Math.min(avgAffordance, 1.0),
                componentMatches: totalMatches,
                slots: composition.length,
                layout: layout,
                composition: composition
            };

        } catch (e) {
            console.warn('[Simulation] Error generating layout:', e);
            return {
                affordanceScore: 0.35,
                componentMatches: 0,
                slots: 4
            };
        }
    }

    generateStaticLayout(intent) {
        return {
            affordanceScore: 0,
            componentMatches: 0,
            slots: 4,
            type: 'static-grid'
        };
    }

    async simulateUserSession(persona, layoutData) {
        const random = Math.random();

        const effectiveAffordance = Math.min(
            persona.affordanceWeight + layoutData.affordanceScore,
            1.0
        );

        const matchingBonus = (layoutData.componentMatches / layoutData.slots) * 0.15;

        const clickProbability = Math.min(
            persona.clickProbability +
            effectiveAffordance * 0.15 +
            matchingBonus,
            0.95
        );

        const bounces = random < (persona.bounceThreshold - layoutData.affordanceScore * 0.3);

        if (bounces) {
            return {
                clicked: false,
                engaged: false,
                converted: false,
                timeToAction: 0,
                bounced: true,
                engagementScore: 0,
                affordanceScore: effectiveAffordance,
                componentMatches: layoutData.componentMatches
            };
        }

        const clicked = random < clickProbability;

        const engagementScore = Math.min(
            persona.engagementDepth + layoutData.affordanceScore * 0.4,
            1.0
        );
        const engaged = random < engagementScore;

        const conversionProbability = engaged ?
            Math.min(persona.conversionIntent + layoutData.affordanceScore * 0.25 + matchingBonus, 0.9) : 0;
        const converted = engaged && (random < conversionProbability);

        const baseTime = 5000 + (Math.random() * 10000);
        const timeReduction = effectiveAffordance * 3000 + matchingBonus * 2000;
        const timeToAction = clicked ? Math.max(baseTime - timeReduction, 1000) : 0;

        return {
            clicked,
            engaged,
            converted,
            timeToAction,
            bounced: false,
            engagementScore,
            affordanceScore: effectiveAffordance,
            componentMatches: layoutData.componentMatches
        };
    }

    async runIteration() {
        const personaKeys = Object.keys(this.personas);
        const randomKey = personaKeys[Math.floor(Math.random() * personaKeys.length)];
        const persona = this.personas[randomKey];

        this.state.currentPersona = { key: randomKey, ...persona };

        const intent = this.generateRandomIntent();

        const atlasLayout = await this.generateAtlasLayout(intent);
        const staticLayout = this.generateStaticLayout(intent);

        const atlasResult = await this.simulateUserSession(persona, atlasLayout);
        const staticResult = await this.simulateUserSession(persona, staticLayout);

        // ⭐ RECORD TO METRICS COLLECTOR
        if (this.state.metricsCollector && this.state.metricsCollector.state.isCollecting) {
            await this.state.metricsCollector.recordSession({
                layoutType: 'atlas',
                persona: randomKey,
                intent: intent,
                clicked: atlasResult.clicked,
                engaged: atlasResult.engaged,
                converted: atlasResult.converted,
                bounced: atlasResult.bounced,
                timeToAction: atlasResult.timeToAction,
                engagementScore: atlasResult.engagementScore,
                affordanceScore: atlasResult.affordanceScore,
                componentMatches: atlasResult.componentMatches
            });

            await this.state.metricsCollector.recordSession({
                layoutType: 'static',
                persona: randomKey,
                intent: intent,
                clicked: staticResult.clicked,
                engaged: staticResult.engaged,
                converted: staticResult.converted,
                bounced: staticResult.bounced,
                timeToAction: staticResult.timeToAction,
                engagementScore: staticResult.engagementScore,
                affordanceScore: staticResult.affordanceScore,
                componentMatches: staticResult.componentMatches
            });
        }

        this.updateMetrics('atlas', atlasResult);
        this.updateMetrics('static', staticResult);

        const event = {
            id: Date.now(),
            persona: randomKey,
            intent: intent,
            atlasAction: this.getAction(atlasResult),
            staticAction: this.getAction(staticResult),
            atlasAffordance: atlasResult.affordanceScore.toFixed(2),
            atlasMatches: atlasResult.componentMatches || 0
        };

        this.state.events = [event, ...this.state.events].slice(0, 10);
        this.state.iterations++;

        this.render();
    }

    generateRandomIntent() {
        const domains = ['dashboard', 'blog', 'ecommerce'];
        const goals = ['browse', 'compare', 'checkout', 'kpi-focus', 'read'];
        const densities = ['compact', 'medium', 'cozy'];
        const devices = ['mobile', 'tablet', 'desktop'];

        return {
            domain: domains[Math.floor(Math.random() * domains.length)],
            goal: goals[Math.floor(Math.random() * goals.length)],
            density: densities[Math.floor(Math.random() * densities.length)],
            device: devices[Math.floor(Math.random() * devices.length)],
            persona: 'new',
            accent: 'cool'
        };
    }

    getAction(result) {
        if (result.converted) return 'converted';
        if (result.clicked) return 'clicked';
        if (result.bounced) return 'bounced';
        return 'viewed';
    }

    updateMetrics(type, result) {
        const metrics = this.state[type + 'Metrics'];
        const newSessions = metrics.sessions + 1;

        metrics.sessions = newSessions;
        metrics.ctr = ((metrics.ctr * metrics.sessions) + (result.clicked ? 1 : 0)) / newSessions;
        metrics.engagement = ((metrics.engagement * metrics.sessions) + result.engagementScore) / newSessions;
        metrics.conversionRate = ((metrics.conversionRate * metrics.sessions) + (result.converted ? 1 : 0)) / newSessions;

        if (result.timeToAction > 0) {
            metrics.timeToAction = ((metrics.timeToAction * Math.max(metrics.sessions - 1, 1)) + result.timeToAction) / Math.max(metrics.sessions, 1);
        }

        metrics.bounceRate = ((metrics.bounceRate * metrics.sessions) + (result.bounced ? 1 : 0)) / newSessions;

        if (result.affordanceScore) {
            metrics.avgAffordance = ((metrics.avgAffordance * metrics.sessions) + result.affordanceScore) / newSessions;
        }

        if (result.componentMatches !== undefined) {
            metrics.componentMatches = ((metrics.componentMatches * metrics.sessions) + result.componentMatches) / newSessions;
        }
    }

    start() {
        if (this.state.isRunning) return;
        this.state.isRunning = true;

        // Check if metrics collector is ready
        if (this.state.metricsCollector && !this.state.metricsCollector.state.isCollecting) {
            console.warn('[Simulation] Metrics Collector not started! Start it first for data collection.');
        }

        this.intervalRef = setInterval(async () => {
            await this.runIteration();
        }, Math.max(100, 1000 / this.state.speed));

        this.render();
    }

    stop() {
        this.state.isRunning = false;
        if (this.intervalRef) {
            clearInterval(this.intervalRef);
            this.intervalRef = null;
        }
        this.render();
    }

    reset() {
        this.stop();
        this.state.iterations = 0;
        this.state.atlasMetrics = this.initMetrics();
        this.state.staticMetrics = this.initMetrics();
        this.state.events = [];
        this.state.currentPersona = null;
        this.render();
    }

    setSpeed(speed) {
        this.state.speed = speed;
        if (this.state.isRunning) {
            this.stop();
            this.start();
        }
    }

    setupEventListeners() {
        // Handled via onclick in template
    }

    calculateImprovement(atlas, static_, inverse = false) {
        if (static_ === 0) return 0;
        const imp = ((atlas - static_) / static_) * 100;
        return inverse ? -imp : imp;
    }

    getOverallAdvantage() {
        return (
            this.calculateImprovement(this.state.atlasMetrics.ctr, this.state.staticMetrics.ctr) +
            this.calculateImprovement(this.state.atlasMetrics.engagement, this.state.staticMetrics.engagement) +
            this.calculateImprovement(this.state.atlasMetrics.conversionRate, this.state.staticMetrics.conversionRate) +
            this.calculateImprovement(this.state.atlasMetrics.timeToAction, this.state.staticMetrics.timeToAction, true) +
            this.calculateImprovement(this.state.atlasMetrics.bounceRate, this.state.staticMetrics.bounceRate, true)
        ) / 5;
    }

    render() {
        const hasRegistry = !!this.registry;
        const hasMetricsCollector = !!this.state.metricsCollector;
        const isCollecting = hasMetricsCollector && this.state.metricsCollector.state.isCollecting;

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; font-family: system-ui, sans-serif; }
                .container { background: linear-gradient(to br, #0b0d12, #151823); min-height: 100vh; padding: 24px; color: #dfe6ff; }
                .header { max-width: 1400px; margin: 0 auto 24px; }
                h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px 0; background: linear-gradient(135deg, #7aa2ff, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .subtitle { color: #8e9ab3; font-size: 14px; }
                .status-badges { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
                .status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
                .badge-success { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; }
                .badge-warning { background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); color: #fbbf24; }
                .badge-error { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; }
                .panel { background: #151823; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); padding: 24px; max-width: 1400px; margin: 0 auto 24px; }
                .controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
                button { padding: 10px 20px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
                .btn-primary { background: #10b981; color: white; }
                .btn-danger { background: #ef4444; color: white; }
                .btn-secondary { background: #1f2937; color: #dfe6ff; border: 1px solid rgba(255,255,255,0.1); }
                button:hover { transform: translateY(-2px); }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; }
                .stat { text-align: center; }
                .stat-label { font-size: 12px; color: #8e9ab3; margin-bottom: 4px; }
                .stat-value { font-size: 24px; font-weight: 700; color: #dfe6ff; }
                .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; max-width: 1400px; margin: 0 auto 24px; }
                .metric-card { background: #151823; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); padding: 20px; }
                .metric-title { font-size: 13px; color: #8e9ab3; margin-bottom: 16px; }
                .metric-values { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .metric-value { text-align: center; }
                .metric-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
                .metric-number { font-size: 24px; font-weight: 700; }
                .atlas { color: #7aa2ff; }
                .static { color: #6b7280; }
                .improvement { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 14px; font-weight: 600; }
                .positive { color: #10b981; }
                .negative { color: #ef4444; }
            </style>
            
            <div class="container">
                <div class="header">
                    <h1>🔗 ATLAS Simulation with Metrics</h1>
                    <p class="subtitle">Integrated testing cu automatic data collection</p>
                    
                    <div class="status-badges">
                        <div class="status-badge ${hasRegistry ? 'badge-success' : 'badge-error'}">
                            ${hasRegistry ? '✓' : '✗'} ATLAS Registry
                        </div>
                        <div class="status-badge ${hasMetricsCollector ? 'badge-success' : 'badge-warning'}">
                            ${hasMetricsCollector ? '✓' : '⚠'} Metrics Collector ${hasMetricsCollector ? (isCollecting ? '(Active)' : '(Idle)') : '(Not Found)'}
                        </div>
                    </div>
                </div>
                
                <div class="panel">
                    <div class="controls">
                        <button class="btn-${this.state.isRunning ? 'danger' : 'primary'}" 
                                onclick="this.getRootNode().host.${this.state.isRunning ? 'stop' : 'start'}()">
                            ${this.state.isRunning ? '⏸ Pause' : '▶ Start'} Simulation
                        </button>
                        <button class="btn-secondary" onclick="this.getRootNode().host.reset()">
                            🔄 Reset
                        </button>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <label style="font-size: 13px; color: #8e9ab3;">Speed:</label>
                            <input type="range" min="1" max="20" value="${this.state.speed}"
                                   oninput="this.getRootNode().host.setSpeed(this.value); this.nextElementSibling.textContent = this.value + 'x'">
                            <span style="font-size: 13px; color: #8e9ab3;">${this.state.speed}x</span>
                        </div>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat">
                            <div class="stat-label">Sessions</div>
                            <div class="stat-value">${this.state.iterations}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Current Persona</div>
                            <div class="stat-value">${this.state.currentPersona ? this.state.currentPersona.icon : '—'}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">ATLAS Affordance</div>
                            <div class="stat-value" style="color: #7aa2ff;">
                                ${this.state.atlasMetrics.avgAffordance.toFixed(2)}
                            </div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Avg Matches</div>
                            <div class="stat-value" style="color: #10b981;">
                                ${this.state.atlasMetrics.componentMatches.toFixed(1)}
                            </div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Status</div>
                            <div class="stat-value" style="font-size: 18px;">
                                ${this.state.isRunning ? '🟢' : '⚫'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="metrics-grid">
                    ${this.renderMetric('Click-Through Rate', 'ctr', v => `${(v * 100).toFixed(1)}%`)}
                    ${this.renderMetric('Engagement Score', 'engagement', v => v.toFixed(3))}
                    ${this.renderMetric('Conversion Rate', 'conversionRate', v => `${(v * 100).toFixed(1)}%`)}
                    ${this.renderMetric('Time to Action', 'timeToAction', v => `${(v / 1000).toFixed(1)}s`, true)}
                    ${this.renderMetric('Bounce Rate', 'bounceRate', v => `${(v * 100).toFixed(1)}%`, true)}
                    <div class="metric-card" style="background: linear-gradient(135deg, #6366f1, #10b981);">
                        <div class="metric-title" style="color: rgba(255,255,255,0.9);">Overall Advantage</div>
                        <div style="color: white; font-size: 36px; font-weight: 700; text-align: center;">
                            ${this.state.iterations > 100 ? `+${this.getOverallAdvantage().toFixed(1)}%` : 'Loading...'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMetric(title, key, format, inverse = false) {
        const atlas = this.state.atlasMetrics[key];
        const static_ = this.state.staticMetrics[key];
        const improvement = this.calculateImprovement(atlas, static_, inverse);

        return `
            <div class="metric-card">
                <div class="metric-title">${title}</div>
                <div class="metric-values">
                    <div class="metric-value">
                        <div class="metric-label">ATLAS</div>
                        <div class="metric-number atlas">${format(atlas)}</div>
                    </div>
                    <div class="metric-value">
                        <div class="metric-label">Static</div>
                        <div class="metric-number static">${format(static_)}</div>
                    </div>
                </div>
                ${this.state.iterations > 50 ? `
                    <div class="improvement ${improvement > 0 ? 'positive' : 'negative'}">
                        ${improvement > 0 ? '↑' : '↓'} ${Math.abs(improvement).toFixed(1)}% ${improvement > 0 ? 'better' : 'worse'}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('atlas-simulation-with-metrics', AtlasSimulationWithMetrics);