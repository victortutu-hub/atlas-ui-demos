// src/atlas-simulation-integrated.js (ML-ACTIONS INTEGRATED)
// Simulator care folosește REAL ML actions pentru layout generation

class AtlasIntegratedSimulation extends HTMLElement {
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
            lastAtlasLayout: null,
            lastStaticLayout: null,
            actionStats: new Map() // ⭐ Track performance per action
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
        this.setupEventListeners();
        this.render();
    }

    async waitForAtlas() {
        let attempts = 0;
        while (!window.__ATLAS_REGISTRY__ && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.__ATLAS_REGISTRY__) {
            this.registry = window.__ATLAS_REGISTRY__();
            console.log('[Simulation] Connected to ATLAS Registry:', this.registry.getStats());
        } else {
            console.warn('[Simulation] ATLAS Registry not found - using mock data');
        }

        // Wait for ML Engine
        attempts = 0;
        while (!window.__ATLAS_ML_V4__?.getMLEngine && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.__ATLAS_ML_V4__) {
            console.log('[Simulation] ✅ ML Engine v4 available for action selection');
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

    // ⭐ Generate ATLAS layout using ML Engine for action selection
    // Înlocuiește metoda completă (liniile ~186-280):

    async generateAtlasLayout(intent) {
        if (!this.registry) {
            return {
                affordanceScore: 0.35,
                componentMatches: 0,
                slots: 4,
                mlAction: null
            };
        }

        try {
            const getLayoutGenerator = window.getLayoutGenerator;
            const ComponentComposer = window.ComponentComposer;

            if (!getLayoutGenerator || !ComponentComposer) {
                throw new Error('ATLAS modules not available');
            }

            // ⭐ SIMPLIFIED: Use only singleton getter
            let mlEngine = null;
            let mlAction = null;

            if (window.__ATLAS_ML_V4__?.getMLEngine) {
                try {
                    mlEngine = await window.__ATLAS_ML_V4__.getMLEngine();
                } catch (e) {
                    console.warn('[Simulation] Could not get ML Engine:', e.message);
                }
            }

            if (mlEngine && typeof mlEngine.selectAction === 'function') {
                // Use ML Engine
                const vectorize = window.__ATLAS_DEV__?.vectorizeIntent;
                if (vectorize) {
                    const state = vectorize(intent);
                    const context = intent.domain || 'dashboard';
                    mlAction = mlEngine.selectAction(state, context);
                    console.log(`[Simulation] 🎯 ML selected action ${mlAction} for ${context}`);
                } else {
                    console.warn('[Simulation] vectorizeIntent not available, using random');
                    mlAction = Math.floor(Math.random() * 10);
                }
            } else {
                // ⭐ BETTER FALLBACK: Simple epsilon-greedy
                const epsilon = 0.3;

                if (Math.random() < epsilon || this.state.actionStats.size === 0) {
                    // Explore: random action
                    mlAction = Math.floor(Math.random() * 10);
                    console.log(`[Simulation] 🔍 Exploring: action ${mlAction}`);
                } else {
                    // Exploit: use best performing action so far
                    const sortedActions = Array.from(this.state.actionStats.entries())
                        .sort((a, b) => b[1].avgReward - a[1].avgReward);
                    mlAction = sortedActions[0][0];
                    console.log(`[Simulation] 💎 Exploiting: action ${mlAction} (best so far: ${(sortedActions[0][1].avgReward * 100).toFixed(0)}%)`);
                }
            }

            const generator = getLayoutGenerator();

            // ⭐ PASS ACTION TO GENERATOR
            const layout = generator.generate(intent, mlAction);

            const composer = new ComponentComposer(this.registry);
            const composition = composer.compose(layout, intent);

            // Calculate affordance
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
                composition: composition,
                mlAction: mlAction, // ⭐ Track which action was used
                variations: layout.metadata?.variations || {}
            };

        } catch (e) {
            console.warn('[Simulation] Error generating ATLAS layout:', e);
            return {
                affordanceScore: 0.35,
                componentMatches: 0,
                slots: 4,
                mlAction: null
            };
        }
    }

    generateStaticLayout(intent) {
        return {
            affordanceScore: 0,
            componentMatches: 0,
            slots: 4,
            type: 'static-grid',
            mlAction: null
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

        this.state.lastAtlasLayout = atlasLayout;
        this.state.lastStaticLayout = staticLayout;

        const atlasResult = await this.simulateUserSession(persona, atlasLayout);
        const staticResult = await this.simulateUserSession(persona, staticLayout);

        // ⭐ Track action performance
        if (atlasLayout.mlAction !== null) {
            if (!this.state.actionStats.has(atlasLayout.mlAction)) {
                this.state.actionStats.set(atlasLayout.mlAction, {
                    uses: 0,
                    avgReward: 0,
                    rewards: []
                });
            }

            const actionStat = this.state.actionStats.get(atlasLayout.mlAction);
            const reward = atlasResult.converted ? 1 : atlasResult.clicked ? 0.5 : 0;

            actionStat.uses++;
            actionStat.rewards.push(reward);
            actionStat.avgReward = actionStat.rewards.reduce((a, b) => a + b, 0) / actionStat.rewards.length;
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
            atlasMatches: atlasResult.componentMatches || 0,
            mlAction: atlasLayout.mlAction,
            variations: atlasLayout.variations
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
        this.state.lastAtlasLayout = null;
        this.state.lastStaticLayout = null;
        this.state.actionStats.clear();
        this.render();
    }

    setSpeed(speed) {
        this.state.speed = speed;
        if (this.state.isRunning) {
            this.stop();
            this.start();
        }
    }

    // [Rest of render methods same as before, but add action stats display]

    render() {
        const hasRegistry = !!this.registry;
        const hasMlEngine = !!window.__ATLAS_ML_V4__?.getMLEngine;

        // Get top 3 actions by performance
        const topActions = Array.from(this.state.actionStats.entries())
            .sort((a, b) => b[1].avgReward - a[1].avgReward)
            .slice(0, 3);

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                * { box-sizing: border-box; }
                
                .container {
                    background: linear-gradient(to br, #0b0d12, #151823);
                    min-height: 100vh;
                    padding: 24px;
                    font-family: system-ui, sans-serif;
                    color: #dfe6ff;
                }
                
                .header {
                    max-width: 1400px;
                    margin: 0 auto 24px;
                }
                
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    background: ${hasRegistry && hasMlEngine ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
                    border: 1px solid ${hasRegistry && hasMlEngine ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    color: ${hasRegistry && hasMlEngine ? '#10b981' : '#ef4444'};
                    margin-top: 8px;
                }
                
                h1 {
                    font-size: 32px;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                    background: linear-gradient(135deg, #7aa2ff, #10b981);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .subtitle {
                    color: #8e9ab3;
                    font-size: 14px;
                }
                
                .panel {
                    background: #151823;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.06);
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto 24px;
                }
                
                .controls {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 16px;
                }
                
                button {
                    padding: 10px 20px;
                    border-radius: 10px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                
                .btn-primary {
                    background: #10b981;
                    color: white;
                }
                
                .btn-primary:hover {
                    background: #059669;
                }
                
                .btn-danger {
                    background: #ef4444;
                    color: white;
                }
                
                .btn-secondary {
                    background: #1f2937;
                    color: #dfe6ff;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    padding: 16px;
                    background: rgba(255,255,255,0.02);
                    border-radius: 12px;
                }
                
                .stat {
                    text-align: center;
                }
                
                .stat-label {
                    font-size: 12px;
                    color: #8e9ab3;
                    margin-bottom: 4px;
                }
                
                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #dfe6ff;
                }
                
                .action-stats {
                    margin-top: 16px;
                    padding: 16px;
                    background: rgba(245, 158, 11, 0.05);
                    border-radius: 12px;
                    border-left: 3px solid #f59e0b;
                }
                
                .action-stats-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #f59e0b;
                    margin-bottom: 12px;
                }
                
                .action-stat-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px;
                    background: rgba(255,255,255,0.02);
                    border-radius: 6px;
                    margin-bottom: 8px;
                    font-size: 13px;
                }
                
                /* ... rest of styles same as before ... */
            </style>
            
            <div class="container">
                <div class="header">
                    <h1>🔗 ATLAS Integrated Simulation v4.1</h1>
                    <p class="subtitle">ML Actions controlling real layout generation</p>
                    <div class="status-badge">
                        ${hasRegistry && hasMlEngine ? '✓ Connected to ATLAS + ML v4' : '⚠ Missing components'}
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
                            <div class="stat-label">Actions Tried</div>
                            <div class="stat-value" style="color: #f59e0b;">
                                ${this.state.actionStats.size}
                            </div>
                        </div>
                    </div>
                    
                    ${topActions.length > 0 ? `
                        <div class="action-stats">
                            <div class="action-stats-title">🏆 Top Performing Actions</div>
                            ${topActions.map(([action, stats]) => `
                                <div class="action-stat-item">
                                    <span>Action ${action}</span>
                                    <span>Avg Reward: ${stats.avgReward.toFixed(3)} (${stats.uses} uses)</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <!-- Rest of metrics panels same as before -->
            </div>
        `;
    }

    setupEventListeners() {
        // Handled in template
    }
}

customElements.define('atlas-simulation-integrated', AtlasIntegratedSimulation);