// src/atlas-layout-inspector.js (FIXED - ML Actions Support)
// Debug panel pentru a vedea EXACT ce layout-uri generează ATLAS

class AtlasLayoutInspector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            currentIntent: null,
            atlasLayout: null,
            staticLayout: null,
            generationLog: [],
            selectedAction: null // ⭐ NEW: Track selected action
        };

        this.render();
    }

    async connectedCallback() {
        await this.waitForAtlas();
        this.setupControls();
    }

    async waitForAtlas() {
        let attempts = 0;
        while (!window.__ATLAS_REGISTRY__ && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.__ATLAS_REGISTRY__) {
            this.registry = window.__ATLAS_REGISTRY__();
            console.log('[Inspector] Connected to ATLAS Registry:', this.registry.getStats());
        }
    }

    setupControls() {
        const generateBtn = this.shadowRoot.querySelector('#generate-btn');
        const intentSelect = this.shadowRoot.querySelector('#intent-preset');
        const customIntent = this.shadowRoot.querySelector('#custom-intent');
        const actionSelect = this.shadowRoot.querySelector('#action-select'); // ⭐ NEW

        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const preset = intentSelect?.value;
                let intent;

                if (preset === 'custom') {
                    try {
                        intent = JSON.parse(customIntent.value);
                    } catch (e) {
                        alert('Invalid JSON in custom intent');
                        return;
                    }
                } else {
                    intent = this.getPresetIntent(preset);
                }

                // ⭐ NEW: Get selected action
                const actionValue = actionSelect?.value;
                const mlAction = actionValue === 'auto' ? null : parseInt(actionValue);

                await this.generateAndInspect(intent, mlAction);
            });
        }

        if (intentSelect) {
            intentSelect.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    customIntent.style.display = 'block';
                } else {
                    customIntent.style.display = 'none';
                }
            });
        }
    }

    getPresetIntent(preset) {
        const presets = {
            'dashboard-kpi': {
                domain: 'dashboard',
                goal: 'kpi-focus',
                density: 'medium',
                device: 'desktop',
                persona: 'power',
                accent: 'cool'
            },
            'ecommerce-browse': {
                domain: 'ecommerce',
                goal: 'browse',
                density: 'medium',
                device: 'desktop',
                persona: 'returning',
                accent: 'warm'
            },
            'blog-read': {
                domain: 'blog',
                goal: 'read',
                density: 'cozy',
                device: 'tablet',
                persona: 'new',
                accent: 'neutral'
            },
            'ecommerce-mobile': {
                domain: 'ecommerce',
                goal: 'browse',
                density: 'compact',
                device: 'mobile',
                persona: 'new',
                accent: 'cool'
            },
            'dashboard-compact': {
                domain: 'dashboard',
                goal: 'kpi-focus',
                density: 'compact',
                device: 'desktop',
                persona: 'power',
                accent: 'cool'
            }
        };

        return presets[preset] || presets['dashboard-kpi'];
    }

    async generateAndInspect(intent, mlAction = null) {
        const log = {
            timestamp: new Date().toISOString(),
            intent: intent,
            mlAction: mlAction,
            steps: []
        };

        try {
            // STEP 1: Check modules
            log.steps.push({
                step: 1,
                name: 'Check Available Modules',
                status: 'started'
            });

            const getLayoutGenerator = window.getLayoutGenerator;
            const ComponentComposer = window.ComponentComposer;

            if (!getLayoutGenerator) {
                throw new Error('getLayoutGenerator not found in window. Make sure atlas-layout-generator.js is imported.');
            }

            if (!ComponentComposer) {
                throw new Error('ComponentComposer not found in window. Make sure atlas-component-composer.js is imported.');
            }

            log.steps.push({
                step: 1,
                name: 'Check Available Modules',
                status: 'success',
                details: 'Using modules from window global scope'
            });

            // ⭐ STEP 2: Select ML Action
            log.steps.push({
                step: 2,
                name: 'Select ML Action',
                status: 'started'
            });

            let finalAction = mlAction;

            if (finalAction === null) {
                // Auto mode: try to get from ML Engine, fallback to random
                const mlEngine = await this._getMLEngine();

                if (mlEngine && window.__ATLAS_DEV__?.vectorizeIntent) {
                    const state = window.__ATLAS_DEV__.vectorizeIntent(intent);
                    const context = intent.domain || 'dashboard';
                    finalAction = mlEngine.selectAction(state, context);

                    log.steps.push({
                        step: 2,
                        name: 'Select ML Action',
                        status: 'success',
                        details: {
                            mode: 'ML Engine',
                            action: finalAction,
                            context: context
                        }
                    });
                } else {
                    // Random fallback
                    finalAction = Math.floor(Math.random() * 10);

                    log.steps.push({
                        step: 2,
                        name: 'Select ML Action',
                        status: 'success',
                        details: {
                            mode: 'Random (ML Engine not available)',
                            action: finalAction
                        }
                    });
                }
            } else {
                log.steps.push({
                    step: 2,
                    name: 'Select ML Action',
                    status: 'success',
                    details: {
                        mode: 'Manual',
                        action: finalAction
                    }
                });
            }

            this.state.selectedAction = finalAction;

            // STEP 3: Generate REAL layout WITH ACTION
            log.steps.push({
                step: 3,
                name: 'Generate Layout (LayoutGenerator)',
                status: 'started'
            });

            const generator = getLayoutGenerator();
            const atlasLayout = generator.generate(intent, finalAction); // ⭐ PASS ACTION!

            log.steps.push({
                step: 3,
                name: 'Generate Layout',
                status: 'success',
                details: {
                    layoutId: atlasLayout.id,
                    structureType: atlasLayout.structure.type,
                    slotCount: atlasLayout.slots.length,
                    gridConfig: atlasLayout.grid,
                    mlAction: finalAction, // ⭐ Track action used
                    variations: atlasLayout.metadata?.variations, // ⭐ Show variations
                    regions: atlasLayout.structure.regions.map(r => r.name)
                }
            });

            // STEP 4: Compose components
            log.steps.push({
                step: 4,
                name: 'Compose Components (ComponentComposer)',
                status: 'started'
            });

            const composer = new ComponentComposer(this.registry);
            const composition = composer.compose(atlasLayout, intent);

            log.steps.push({
                step: 4,
                name: 'Compose Components',
                status: 'success',
                details: {
                    componentCount: composition.length,
                    components: composition.map(c => ({
                        slot: c.slot,
                        component: c.component,
                        priority: c.priority,
                        score: c.metadata?.score,
                        reasoning: c.metadata?.reasoning
                    }))
                }
            });

            // STEP 5: Calculate affordance
            log.steps.push({
                step: 5,
                name: 'Calculate Affordance Score',
                status: 'started'
            });

            let totalAffordance = 0;
            let totalMatches = 0;
            const componentDetails = [];

            for (const comp of composition) {
                const entry = this.registry.registry.get(comp.component);
                if (entry && entry.affordance) {
                    const aff = entry.affordance;

                    const priorityScore = (aff.priority || 5) / 10;
                    const contextMatch = aff.contexts?.includes(intent.domain) ? 0.3 : 0;
                    const goalMatch = aff.goals?.includes(intent.goal) ? 0.25 : 0;
                    const capabilityBonus = (comp.metadata?.score || 0) / 100 * 0.2;

                    const componentScore = priorityScore + contextMatch + goalMatch + capabilityBonus;
                    totalAffordance += componentScore;

                    if (contextMatch > 0 || goalMatch > 0) {
                        totalMatches++;
                    }

                    componentDetails.push({
                        component: comp.component,
                        slot: comp.slot,
                        affordance: aff,
                        scores: {
                            priority: priorityScore,
                            contextMatch: contextMatch,
                            goalMatch: goalMatch,
                            capabilityBonus: capabilityBonus,
                            total: componentScore
                        },
                        isMatch: contextMatch > 0 || goalMatch > 0
                    });
                }
            }

            const avgAffordance = composition.length > 0 ? totalAffordance / composition.length : 0;

            log.steps.push({
                step: 5,
                name: 'Calculate Affordance',
                status: 'success',
                details: {
                    avgAffordance: avgAffordance.toFixed(3),
                    totalMatches: totalMatches,
                    componentCount: componentDetails.length
                }
            });

            // Save state
            this.state.currentIntent = intent;
            this.state.atlasLayout = {
                ...atlasLayout,
                composition: composition,
                affordance: avgAffordance,
                matches: totalMatches,
                componentDetails: componentDetails
            };

            // Create static layout for comparison
            this.state.staticLayout = {
                type: 'static-grid',
                slots: 4,
                affordance: 0,
                matches: 0
            };

            this.state.generationLog.unshift(log);
            this.state.generationLog = this.state.generationLog.slice(0, 5);

            console.log('[Inspector] Layout generated successfully:', this.state.atlasLayout);
            this.render();

        } catch (error) {
            console.error('[Inspector] Generation error:', error);
            log.steps.push({
                step: 'error',
                name: 'Generation Failed',
                status: 'error',
                error: error.message,
                stack: error.stack
            });

            this.state.generationLog.unshift(log);
            this.render();
        }
    }

    // ⭐ NEW: Helper to get ML Engine
    async _getMLEngine() {
        if (window.__ATLAS_ML_V4__?.getMLEngine) {
            try {
                return await window.__ATLAS_ML_V4__.getMLEngine();
            } catch (e) {
                console.warn('[Inspector] Could not get ML Engine:', e.message);
            }
        }
        return null;
    }

    render() {
        const hasRegistry = !!this.registry;
        const { atlasLayout, staticLayout, currentIntent } = this.state;

        this.shadowRoot.innerHTML = `
            <style>
                :host { 
                    display: block; 
                    font-family: system-ui, -apple-system, sans-serif;
                }
                
                .container {
                    background: #0b0d12;
                    color: #dfe6ff;
                    padding: 24px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .header {
                    margin-bottom: 24px;
                }
                
                h1 {
                    font-size: 24px;
                    margin: 0 0 8px 0;
                    background: linear-gradient(135deg, #7aa2ff, #ff8a66);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .subtitle {
                    color: #8e9ab3;
                    font-size: 14px;
                }
                
                .status-badge {
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    margin-top: 12px;
                    background: ${hasRegistry ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
                    border: 1px solid ${hasRegistry ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
                    color: ${hasRegistry ? '#10b981' : '#ef4444'};
                }
                
                .controls {
                    background: #151823;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .control-group {
                    margin-bottom: 16px;
                }
                
                .control-group:last-child {
                    margin-bottom: 0;
                }
                
                label {
                    display: block;
                    font-size: 13px;
                    color: #8e9ab3;
                    margin-bottom: 8px;
                    font-weight: 600;
                }
                
                select, textarea {
                    width: 100%;
                    padding: 10px;
                    background: #0b0d12;
                    color: #dfe6ff;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    font-size: 14px;
                    box-sizing: border-box;
                }
                
                textarea {
                    font-family: 'Courier New', monospace;
                    min-height: 100px;
                    display: none;
                }
                
                button {
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #7aa2ff, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(122, 162, 255, 0.4);
                }
                
                .action-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    background: linear-gradient(135deg, #f59e0b, #ef4444);
                    color: white;
                    margin-left: 8px;
                }
                
                .results {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-bottom: 24px;
                }
                
                .result-panel {
                    background: #151823;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .result-panel h2 {
                    font-size: 18px;
                    margin: 0 0 16px 0;
                    color: #dfe6ff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .json-block {
                    background: #0b0d12;
                    padding: 16px;
                    border-radius: 8px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.6;
                    overflow-x: auto;
                    max-height: 400px;
                    overflow-y: auto;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .key { color: #7aa2ff; }
                .string { color: #a5d6a7; }
                .number { color: #ffab91; }
                .boolean { color: #ce93d8; }
                .null { color: #ef5350; }
                
                .metric-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px;
                    background: rgba(255,255,255,0.02);
                    border-radius: 8px;
                    margin-bottom: 8px;
                }
                
                .metric-label {
                    color: #8e9ab3;
                    font-size: 13px;
                }
                
                .metric-value {
                    font-weight: 700;
                    font-size: 16px;
                }
                
                .component-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .component-item {
                    background: rgba(255,255,255,0.02);
                    padding: 12px;
                    border-radius: 8px;
                    border-left: 3px solid #7aa2ff;
                }
                
                .component-item.match {
                    border-left-color: #10b981;
                    background: rgba(16, 185, 129, 0.05);
                }
                
                .component-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .component-name {
                    font-weight: 600;
                    color: #dfe6ff;
                    font-family: 'Courier New', monospace;
                }
                
                .component-score {
                    font-size: 18px;
                    font-weight: 700;
                    color: #7aa2ff;
                }
                
                .component-details {
                    font-size: 12px;
                    color: #8e9ab3;
                    line-height: 1.6;
                }
                
                .score-breakdown {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                }
                
                .score-item {
                    font-size: 11px;
                }
                
                .score-item span {
                    font-weight: 600;
                    color: #7aa2ff;
                }
                
                .match-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    background: #10b981;
                    color: white;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                
                .variations-panel {
                    margin-top: 16px;
                    padding: 12px;
                    background: rgba(245, 158, 11, 0.05);
                    border-left: 3px solid #f59e0b;
                    border-radius: 6px;
                }
                
                .variations-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: #f59e0b;
                    margin-bottom: 8px;
                }
                
                .variation-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0;
                    font-size: 13px;
                }
                
                .log-section {
                    background: #151823;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .log-entry {
                    background: rgba(255,255,255,0.02);
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 12px;
                }
                
                .log-step {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px;
                    background: rgba(255,255,255,0.02);
                    border-radius: 6px;
                    margin-bottom: 8px;
                }
                
                .step-number {
                    width: 24px;
                    height: 24px;
                    background: #7aa2ff;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 12px;
                    flex-shrink: 0;
                }
                
                .step-name {
                    flex: 1;
                    font-size: 13px;
                    color: #dfe6ff;
                }
                
                .step-status {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                }
                
                .step-status.success {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                }
                
                .step-status.error {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px;
                    color: #6b7280;
                }
                
                @media (max-width: 1024px) {
                    .results {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            
            <div class="container">
                <div class="header">
                    <h1>🔍 ATLAS Layout Inspector</h1>
                    <p class="subtitle">Debug panel - Vezi EXACT ce layout-uri generează sistemul tău</p>
                    <div class="status-badge">
                        ${hasRegistry ? '✔ Connected to ATLAS Registry' : '⚠ Registry Not Available'}
                    </div>
                    ${hasRegistry ? `
                        <div class="status-badge" style="background: rgba(122, 162, 255, 0.1); border-color: rgba(122, 162, 255, 0.3); color: #7aa2ff;">
                            📊 ${this.registry.getStats().totalComponents} components • ${this.registry.getStats().capabilities} capabilities
                        </div>
                    ` : ''}
                </div>
                
                <div class="controls">
                    <div class="control-group">
                        <label>Select Intent Preset:</label>
                        <select id="intent-preset">
                            <option value="dashboard-kpi">Dashboard - KPI Focus</option>
                            <option value="ecommerce-browse">E-commerce - Browse Products</option>
                            <option value="blog-read">Blog - Reading Experience</option>
                            <option value="ecommerce-mobile">E-commerce - Mobile</option>
                            <option value="dashboard-compact">Dashboard - Compact</option>
                            <option value="custom">Custom JSON...</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label>ML Action (0-9):</label>
                        <select id="action-select">
                            <option value="auto">🎯 Auto (Use ML Engine)</option>
                            <option value="0">Action 0 - Minimal</option>
                            <option value="1">Action 1</option>
                            <option value="2">Action 2</option>
                            <option value="3">Action 3</option>
                            <option value="4">Action 4</option>
                            <option value="5">Action 5</option>
                            <option value="6">Action 6</option>
                            <option value="7">Action 7</option>
                            <option value="8">Action 8</option>
                            <option value="9">Action 9 - Heavy</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <textarea id="custom-intent" placeholder='{"domain":"dashboard","goal":"kpi-focus","density":"medium","device":"desktop","persona":"power","accent":"cool"}'></textarea>
                    </div>
                    
                    <button id="generate-btn">🚀 Generate & Inspect Layout</button>
                </div>
                
                ${atlasLayout ? `
                    <div class="results">
                        <div class="result-panel">
                            <h2>⚡ ATLAS Layout (Generated)
                                ${this.state.selectedAction !== null ? `<span class="action-badge">Action ${this.state.selectedAction}</span>` : ''}
                            </h2>
                            
                            <div class="metric-row">
                                <span class="metric-label">Structure Type:</span>
                                <span class="metric-value" style="color: #7aa2ff;">${atlasLayout.structure.type}</span>
                            </div>
                            
                            <div class="metric-row">
                                <span class="metric-label">Total Slots:</span>
                                <span class="metric-value" style="color: #7aa2ff;">${atlasLayout.slots.length}</span>
                            </div>
                            
                            <div class="metric-row">
                                <span class="metric-label">Affordance Score:</span>
                                <span class="metric-value" style="color: #10b981;">${(atlasLayout.affordance * 100).toFixed(0)}%</span>
                            </div>
                            
                            <div class="metric-row">
                                <span class="metric-label">Perfect Matches:</span>
                                <span class="metric-value" style="color: #10b981;">${atlasLayout.matches}/${atlasLayout.composition.length}</span>
                            </div>
                            
                            ${atlasLayout.layout?.metadata?.variations ? `
                                <div class="variations-panel">
                                    <div class="variations-title">🎯 ML Action Variations</div>
                                    ${Object.entries(atlasLayout.layout.metadata.variations)
                        .filter(([k]) => ['kpiCount', 'productCount', 'articleCount', 'gridCols', 'layout'].includes(k))
                        .map(([key, value]) => `
                                            <div class="variation-item">
                                                <span style="color: #8e9ab3;">${key}:</span>
                                                <span style="color: #f59e0b; font-weight: 600;">${value}</span>
                                            </div>
                                        `).join('')}
                                </div>
                            ` : ''}
                            
                            <h3 style="margin: 20px 0 12px 0; font-size: 14px; color: #8e9ab3;">Components Selected:</h3>
                            
                            <div class="component-list">
                                ${atlasLayout.componentDetails.map(c => `
                                    <div class="component-item ${c.isMatch ? 'match' : ''}">
                                        <div class="component-header">
                                            <div>
                                                <div class="component-name">${c.component}</div>
                                                <div class="component-details">
                                                    Slot: <strong>${c.slot}</strong>
                                                    ${c.isMatch ? '<span class="match-badge">Perfect Match</span>' : ''}
                                                </div>
                                            </div>
                                            <div class="component-score">${(c.scores.total * 100).toFixed(0)}%</div>
                                        </div>
                                        
                                        <div class="score-breakdown">
                                            <div class="score-item">Priority: <span>${(c.scores.priority * 100).toFixed(0)}%</span></div>
                                            <div class="score-item">Context: <span>${(c.scores.contextMatch * 100).toFixed(0)}%</span></div>
                                            <div class="score-item">Goal: <span>${(c.scores.goalMatch * 100).toFixed(0)}%</span></div>
                                            <div class="score-item">Capability: <span>${(c.scores.capabilityBonus * 100).toFixed(0)}%</span></div>
                                        </div>
                                        
                                        <div class="component-details" style="margin-top: 8px;">
                                            Contexts: ${c.affordance.contexts?.join(', ') || 'none'}<br>
                                            Goals: ${c.affordance.goals?.join(', ') || 'none'}<br>
                                            Capabilities: ${c.affordance.capabilities?.slice(0, 3).join(', ') || 'none'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="result-panel">
                            <h2>📦 Static Layout (Reference)</h2>
                            
                            <div class="metric-row">
                                <span class="metric-label">Type:</span>
                                <span class="metric-value" style="color: #6b7280;">Static Grid</span>
                            </div>
                            
                            <div class="metric-row">
                                <span class="metric-label">Total Slots:</span>
                                <span class="metric-value" style="color: #6b7280;">${staticLayout.slots}</span>
                            </div>
                            
                            <div class="metric-row">
                                <span class="metric-label">Affordance Score:</span>
                                <span class="metric-value" style="color: #6b7280;">0%</span>
                            </div>
                            
                            <div class="metric-row">
                                <span class="metric-label">Perfect Matches:</span>
                                <span class="metric-value" style="color: #6b7280;">0</span>
                            </div>
                            
                            <div class="empty-state" style="margin-top: 40px;">
                                <p>Static grid folosește componente generice<br>fără context sau goal matching</p>
                            </div>
                            
                            <h3 style="margin: 20px 0 12px 0; font-size: 14px; color: #8e9ab3;">Intent Used:</h3>
                            <div class="json-block">${this.syntaxHighlight(JSON.stringify(currentIntent, null, 2))}</div>
                        </div>
                    </div>
                    
                    ${this.state.generationLog.length > 0 ? `
                        <div class="log-section">
                            <h2 style="font-size: 18px; margin: 0 0 16px 0;">🔍 Generation Log</h2>
                            ${this.state.generationLog.map(log => `
                                <div class="log-entry">
                                    <div style="font-size: 12px; color: #8e9ab3; margin-bottom: 12px;">
                                        ${new Date(log.timestamp).toLocaleString()}
                                        ${log.mlAction !== null && log.mlAction !== undefined ? `<span class="action-badge">Action ${log.mlAction}</span>` : ''}
                                    </div>
                                    ${log.steps.map(step => `
                                        <div class="log-step">
                                            ${step.step !== 'error' ? `<div class="step-number">${step.step}</div>` : ''}
                                            <div class="step-name">${step.name}</div>
                                            <div class="step-status ${step.status}">${step.status}</div>
                                        </div>
                                        ${step.error ? `<div style="color: #ef4444; font-size: 11px; padding: 8px; background: rgba(239,68,68,0.1); border-radius: 6px; margin-top: 8px;">${step.error}</div>` : ''}
                                        ${step.details && typeof step.details === 'object' && step.status === 'success' ? `
                                            <div style="font-size: 11px; color: #8e9ab3; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; margin-top: 4px; margin-bottom: 8px;">
                                                ${JSON.stringify(step.details, null, 2).split('\n').slice(0, 5).join('\n')}...
                                            </div>
                                        ` : ''}
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                ` : `
                    <div class="empty-state">
                        <p style="font-size: 48px; margin: 0 0 16px 0;">🔬</p>
                        <p style="font-size: 16px; margin: 0 0 8px 0;">No analysis yet</p>
                        <p>Select an intent and action, then click "Generate & Inspect Layout"</p>
                    </div>
                `}
            </div>
        `;

        this.setupControls();
    }

    syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }
}

customElements.define('atlas-layout-inspector', AtlasLayoutInspector);