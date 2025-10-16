// src/atlas-ui-v4.js (ML-ACTION INTEGRATED)
// 🚀 ATLAS-UI v4.1 - Action-urile ML controlează efectiv layout-urile
// 🧠 v4.2 - WITH CONFUSION DETECTION INTEGRATED

import { getLayoutGenerator } from './atlas-layout-generator.js';
import { ComponentComposer } from './atlas-component-composer.js';
import { getAffordanceRegistry } from './atlas-affordance-registry.js';
import { getMLEngine } from './atlas-ml-engine-v4.js';
import { confusionDetector } from './atlas-confusion-detector.js';
import { eventBus } from './atlas-event-bus.js';

const TFJS_CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js';

async function ensureTF() {
    if (window.tf) return window.tf;
    if (!window.__TFJS_READY__) {
        window.__TFJS_READY__ = new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts).find(s => s.src.includes('@tensorflow/tfjs'));
            const done = () => resolve();
            const fail = () => reject(new Error('TFJS load failed'));
            if (existing) {
                if (window.tf) return resolve();
                existing.addEventListener('load', done, { once: true });
                existing.addEventListener('error', fail, { once: true });
                const t0 = Date.now();
                const id = setInterval(() => {
                    if (window.tf) { clearInterval(id); resolve(); }
                    else if (Date.now() - t0 > 5000) { clearInterval(id); }
                }, 100);
            } else {
                const s = document.createElement('script');
                s.src = TFJS_CDN;
                s.async = true;
                s.onload = done;
                s.onerror = fail;
                document.head.appendChild(s);
            }
        });
    }
    await window.__TFJS_READY__;
    return window.tf;
}

function vectorizeIntent(rawIntent) {
    const ORDER = ["domain", "goal", "density", "persona", "device", "accent"];

    const CATS = {
        domain: ["dashboard", "blog", "ecommerce"],
        goal: ["browse", "compare", "checkout", "kpi-focus", "read"],
        density: ["compact", "medium", "cozy"],
        persona: ["new", "returning", "power"],
        device: ["mobile", "tablet", "desktop"],
        accent: ["cool", "warm", "neutral"],
    };

    const CANON = {
        domain: {
            "e-commerce": "ecommerce",
            "shop": "ecommerce",
            "store": "ecommerce",
            "dash": "dashboard",
        },
        goal: {
            "kpi": "kpi-focus",
            "kpi_focus": "kpi-focus",
            "buy": "checkout",
            "purchase": "checkout",
            "reading": "read",
            "browsing": "browse",
            "compare-items": "compare",
        },
        density: {
            "comfortable": "cozy",
            "cozy": "cozy",
            "dense": "compact",
            "normal": "medium",
        },
        persona: {
            "power-user": "power",
            "loyal": "returning",
            "first-time": "new",
        },
        device: {
            "pc": "desktop",
            "laptop": "desktop",
            "phone": "mobile",
            "ios": "mobile",
            "android": "mobile",
            "ipad": "tablet",
        },
        accent: {
            "neutral": "neutral",
            "grey": "neutral",
            "gray": "neutral",
            "hot": "warm",
            "cold": "cool",
        },
    };

    const sanitize = (v) =>
        (v === undefined || v === null) ? "" : String(v).trim().toLowerCase();

    const toCanonical = (k, v) => {
        const sv = sanitize(v);
        if (!sv) return "";
        if (CATS[k].includes(sv)) return sv;
        const mapped = CANON[k] && CANON[k][sv];
        if (mapped && CATS[k].includes(mapped)) return mapped;
        return "";
    };

    const oneHot = (k, v) => {
        const cats = CATS[k];
        const idx = cats.indexOf(v);
        if (idx === -1) return new Array(cats.length).fill(0);
        const arr = new Array(cats.length).fill(0);
        arr[idx] = 1;
        return arr;
    };

    const intent = rawIntent || {};
    const pieces = [];

    for (const key of ORDER) {
        const canonical = toCanonical(key, intent[key]);
        pieces.push(...oneHot(key, canonical));
    }

    return pieces;
}

vectorizeIntent.FEATURE_ORDER = Object.freeze(["domain", "goal", "density", "persona", "device", "accent"]);
vectorizeIntent.CATEGORIES = Object.freeze({
    domain: Object.freeze(["dashboard", "blog", "ecommerce"]),
    goal: Object.freeze(["browse", "compare", "checkout", "kpi-focus", "read"]),
    density: Object.freeze(["compact", "medium", "cozy"]),
    persona: Object.freeze(["new", "returning", "power"]),
    device: Object.freeze(["mobile", "tablet", "desktop"]),
    accent: Object.freeze(["cool", "warm", "neutral"]),
});
vectorizeIntent.FEATURE_SIZE = vectorizeIntent.FEATURE_ORDER
    .reduce((s, k) => s + vectorizeIntent.CATEGORIES[k].length, 0);

if (typeof window !== 'undefined') {
    window.__ATLAS_DEV__ = window.__ATLAS_DEV__ || {};
    window.__ATLAS_DEV__.vectorizeIntent = vectorizeIntent;
}

/**
 * ATLAS-UI v4.1 - Main Component with REAL ML Control
 * ⭐ NOW: ML Actions actually control layout generation
 */
export class AtlasUIv4 extends HTMLElement {
    static get observedAttributes() {
        return ['intent', 'accent', 'autorefresh'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.root = document.createElement('div');
        this.root.className = 'atlas-root';

        const style = document.createElement('style');
        style.textContent = `
      :host{ display:block; }
      .atlas-root{ padding:12px; box-sizing:border-box; }
      
      .layout-container{ display:grid; gap:12px; }
      
      .layout-kpi-dominant, .layout-minimal, .layout-balanced,
      .layout-grid-2x2, .layout-compact-row, .layout-dense-3x2,
      .layout-vertical, .layout-stacked, .layout-asymmetric,
      .layout-dashboard-heavy, .layout-classic { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
        gap: 12px; 
      }
      .layout-kpi-dominant .slot[data-slot="header"],
      .layout-minimal .slot[data-slot="header"],
      .layout-balanced .slot[data-slot="header"],
      .layout-grid-2x2 .slot[data-slot="header"],
      .layout-compact-row .slot[data-slot="header"],
      .layout-dense-3x2 .slot[data-slot="header"],
      .layout-vertical .slot[data-slot="header"],
      .layout-stacked .slot[data-slot="header"],
      .layout-asymmetric .slot[data-slot="header"],
      .layout-dashboard-heavy .slot[data-slot="header"],
      .layout-classic .slot[data-slot="header"] { 
        grid-column: 1 / -1; 
      }
      
      .layout-balanced-grid{ grid-template-columns: 260px 1fr; }
      
      .layout-content-centric, .layout-featured, .layout-longform, .layout-editorial { 
        grid-template-rows: auto 1fr auto; 
        max-width: 800px; 
        margin: 0 auto; 
      }
      
      .layout-feed-style, .layout-magazine, .layout-grid, .layout-compact,
      .layout-mixed, .layout-dense, .layout-standard { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px; 
      }
      .layout-feed-style .slot[data-slot="navbar"],
      .layout-magazine .slot[data-slot="navbar"],
      .layout-grid .slot[data-slot="navbar"],
      .layout-compact .slot[data-slot="navbar"],
      .layout-mixed .slot[data-slot="navbar"],
      .layout-dense .slot[data-slot="navbar"],
      .layout-standard .slot[data-slot="navbar"] { 
        grid-column: 1 / -1; 
      }
      .layout-feed-style .slot[data-slot="filters"],
      .layout-magazine .slot[data-slot="filters"],
      .layout-grid .slot[data-slot="filters"],
      .layout-compact .slot[data-slot="filters"],
      .layout-mixed .slot[data-slot="filters"],
      .layout-dense .slot[data-slot="filters"],
      .layout-standard .slot[data-slot="filters"] { 
        grid-column: 1 / -1; 
      }
      
      .layout-product-grid, .layout-showcase, .layout-featured,
      .layout-premium, .layout-gallery, .layout-catalog,
      .layout-browse-heavy, .layout-balanced { 
        display: grid;
        grid-template-columns: 240px 1fr; 
        gap: 16px; 
      }
      .layout-product-grid .slot[data-slot="header"],
      .layout-showcase .slot[data-slot="header"],
      .layout-featured .slot[data-slot="header"],
      .layout-premium .slot[data-slot="header"],
      .layout-gallery .slot[data-slot="header"],
      .layout-catalog .slot[data-slot="header"],
      .layout-browse-heavy .slot[data-slot="header"],
      .layout-balanced .slot[data-slot="header"] { 
        grid-column: 1 / -1; 
      }
      
      .layout-comparison-layout{ 
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px; 
      }
      .layout-comparison-layout .slot[data-slot="header"],
      .layout-comparison-layout .slot[data-slot="actions"] { 
        grid-column: 1 / -1; 
      }
      
      .layout-linear-flow{ 
        display: grid;
        grid-template-columns: 1fr 300px; 
        gap: 16px; 
      }
      .layout-linear-flow .slot[data-slot="progress"] { 
        grid-column: 1 / -1; 
      }
      
      .slot{ border-radius:12px; }
      
      .meta-badge{ 
        font-size:11px; 
        opacity:0.85; 
        margin: 0 0 8px 0; 
        color: var(--accent);
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .meta-badge span { 
        background: rgba(122,162,255,0.1); 
        padding: 4px 8px; 
        border-radius: 6px; 
      }
      
      .ml-badge {
        background: linear-gradient(135deg, #10b981, #3b82f6) !important;
        color: white !important;
        font-weight: 700;
      }
      
      .action-badge {
        background: linear-gradient(135deg, #f59e0b, #ef4444) !important;
        color: white !important;
        font-weight: 700;
        font-size: 12px;
        padding: 6px 10px !important;
      }
      
      .confusion-badge {
        background: linear-gradient(135deg, #8b5cf6, #ec4899) !important;
        color: white !important;
        font-weight: 700;
        font-size: 12px;
        padding: 6px 10px !important;
      }
      
      .flash{ animation: flash 600ms ease-out 1; }
      @keyframes flash { 0%{opacity:0.4} 100%{opacity:1} }
      
      :host{ --bg: #0e0f14; --card: #151823; --text:#dfe6ff; --accent:#7aa2ff; }
      :host([accent="warm"]){ --accent:#ff8a66; }
      :host([accent="neutral"]){ --accent:#8e9ab3; }
    `;

        this.shadowRoot.append(style, this.root);

        this._tf = null;
        this._mlEngine = null;
        this._inputSize = null;
        this._lastLayout = null;
        this._lastState = null;
        this._lastAction = null;
        this._layoutGenerator = null;
        this._composer = null;
        this._registry = null;
        
        // 🧠 NEW: Confusion detection state
        this._confusionEnabled = true;
        this._confusionUnsubscribe = null;
        this._lastConfusionState = null;
    }

    // În atlas-ui-v4.js (linia ~237):

    async connectedCallback() {
        // ⭐ ADD: Error handling for TensorFlow.js
        try {
            this._tf = await ensureTF();
        } catch (error) {
            console.error('[AtlasUI v4.1] Failed to load TensorFlow.js:', error);
            this.root.innerHTML = `
            <div style="padding: 20px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; border-radius: 12px;">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">⚠️ Failed to load ML Engine</div>
                <div style="font-size: 13px; opacity: 0.9;">
                    TensorFlow.js could not be loaded. Please check your internet connection and refresh the page.
                </div>
                <div style="margin-top: 12px; font-size: 12px; opacity: 0.7;">
                    Error: ${error.message}
                </div>
            </div>
        `;
            return; // Don't continue initialization
        }

        try {
            this._registry = getAffordanceRegistry();
            this._composer = new ComponentComposer(this._registry);
            this._layoutGenerator = getLayoutGenerator();

            const x0 = vectorizeIntent(this._readIntent());
            this._inputSize = x0.length;

            this._mlEngine = await getMLEngine(this._tf, this._inputSize, {
                nArms: 10,
                replayBufferSize: 1000,
                batchSize: 32,
                learningRate: 0.001,
                epsilon: 0.3,
                epsilonDecay: 0.995,
                epsilonMin: 0.05,
                trainEvery: 4
            });

            console.log('[AtlasUI v4.1] 🚀 ML Engine initialized with REAL action control');
            console.log('[AtlasUI v4.1] Actions 0-9 now control layout parameters!');

            // 🧠 Initialize Confusion Detection
            if (this._confusionEnabled && confusionDetector) {
                console.log('[AtlasUI v4.1] 🧠 Initializing Confusion Detection...');
                
                // Subscribe to confusion detected events
                this._confusionUnsubscribe = eventBus.on('confusion-detected', (confusionData) => {
                    this._lastConfusionState = confusionData;
                    console.log(`[AtlasUI v4.1] 🧠 Confusion detected: ${confusionData.score.toFixed(3)} (${confusionData.level.level})`);
                    
                    // If high confusion, consider it as negative feedback for ML
                    if (confusionData.level.severity >= 3 && this._lastState && this._lastAction !== null) {
                        const penalty = -0.5 * confusionData.score; // Partial penalty
                        console.log(`[AtlasUI v4.1] ⚠️ High confusion penalty: ${penalty.toFixed(3)}`);
                        
                        // Record as negative experience
                        const nextState = vectorizeIntent(this._readIntent());
                        this._mlEngine.recordExperience(
                            this._lastState,
                            this._lastAction,
                            penalty,
                            nextState,
                            false,
                            this._lastContext
                        );
                    }
                });
                
                // Start detection
                confusionDetector.start();
                console.log('[AtlasUI v4.1] ✅ Confusion Detection started');
            }

            this.render();
        } catch (error) {
            console.error('[AtlasUI v4.1] Initialization error:', error);
            this.root.innerHTML = `
            <div style="padding: 20px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; border-radius: 12px;">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">⚠️ Initialization Failed</div>
                <div style="font-size: 13px; opacity: 0.9;">
                    Could not initialize ATLAS components. Please refresh the page.
                </div>
                <div style="margin-top: 12px; font-size: 12px; opacity: 0.7;">
                    Error: ${error.message}
                </div>
            </div>
        `;
        }
    }

    disconnectedCallback() {
        // 🧠 Cleanup Confusion Detection
        if (this._confusionUnsubscribe) {
            this._confusionUnsubscribe();
            this._confusionUnsubscribe = null;
            console.log('[AtlasUI v4.1] 🧠 Confusion Detection unsubscribed');
        }
        
        if (confusionDetector && confusionDetector.isRunning()) {
            confusionDetector.stop();
            console.log('[AtlasUI v4.1] 🧠 Confusion Detection stopped');
        }
    }

    attributeChangedCallback() {
        if (this._mlEngine) this.render();
    }

    _readIntent() {
        try {
            return JSON.parse(this.getAttribute('intent') || '{}');
        } catch {
            return {};
        }
    }

    _getContext(intent) {
        return intent.domain || 'dashboard';
    }

    getIntent() { return this._readIntent(); }
    setIntent(obj) { this.setAttribute('intent', JSON.stringify(obj || {})); }

    render() {
        if (!this._layoutGenerator || !this._composer || !this._registry) {
            console.warn('[AtlasUI v4.1] Not fully initialized yet');

            this.root.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #8e9ab3;">
                    <div style="font-size: 14px; margin-bottom: 8px;">⏳ Initializing ATLAS v4.1...</div>
                    <div style="font-size: 12px; opacity: 0.7;">Loading ML Engine with ACTION CONTROL</div>
                </div>
            `;
            return;
        }

        if (!this._mlEngine) {
            console.warn('[AtlasUI v4.1] ML Engine not ready');
            return;
        }

        const intent = this._readIntent();

        if (intent.accent && !this.hasAttribute('accent')) {
            this.setAttribute('accent', intent.accent);
        }

        const normalizedIntent = {
            domain: intent.domain || 'dashboard',
            goal: intent.goal || 'kpi-focus',
            density: intent.density || 'medium',
            persona: intent.persona || 'new',
            device: intent.device || 'desktop',
            accent: intent.accent || 'cool'
        };

        const context = this._getContext(normalizedIntent);
        const state = vectorizeIntent(normalizedIntent);

        // ⭐ ML selectează action (0-9)
        const action = this._mlEngine.selectAction(state, context);

        // ⭐⭐⭐ CRITICAL: Pasează action-ul la generator
        const layout = this._layoutGenerator.generate(normalizedIntent, action);

        const composition = this._composer.compose(layout, normalizedIntent);

        this._materialize(layout, composition, action, state, context);

        this._lastLayout = layout;
        this._lastState = state;
        this._lastAction = action;
        this._lastContext = context;

        // Debug logging
        console.log(`[AtlasUI v4.1] 🎯 Action ${action} → Layout type: ${layout.structure.type}, Slots: ${layout.slots.length}`);
        if (layout.metadata?.variations) {
            console.log('[AtlasUI v4.1] 📊 Variations:', layout.metadata.variations);
        }
    }

    _materialize(layout, composition, action, state, context) {
        this.root.innerHTML = '';

        const badge = document.createElement('div');
        badge.className = 'meta-badge' + (this._lastLayout && this._lastLayout.id !== layout.id ? ' flash' : '');

        const stats = this._mlEngine.getStats();
        const variations = layout.metadata?.variations || {};

        // Extract key variation info
        const varInfo = Object.entries(variations)
            .filter(([k, v]) => ['kpiCount', 'productCount', 'articleCount', 'gridCols', 'layout'].includes(k))
            .map(([k, v]) => `${k}:${v}`)
            .join(', ');

        // 🧠 Get confusion state for display
        const confusionInfo = this._lastConfusionState ? 
            `<span class="confusion-badge">🧠 Confusion: ${(this._lastConfusionState.score * 100).toFixed(0)}% (${this._lastConfusionState.level.level})</span>` : 
            '';

        badge.innerHTML = `
      <span>Layout: ${layout.structure.type}</span>
      <span class="ml-badge">ML v4.1 🧠</span>
      <span class="action-badge">Action ${action}</span>
      <span>Context: ${context}</span>
      ${varInfo ? `<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">${varInfo}</span>` : ''}
      ${confusionInfo}
      <span>ε: ${stats.dqnStats.epsilon.toFixed(3)}</span>
      <span>Buffer: ${stats.dqnStats.bufferSize}</span>
    `;
        this.root.appendChild(badge);

        const container = document.createElement('div');
        container.className = `layout-container layout-${layout.structure.type}`;

        for (const comp of composition) {
            const holder = document.createElement('div');
            holder.className = 'slot';
            holder.setAttribute('data-slot', comp.slot);
            holder.setAttribute('data-priority', comp.priority);

            const el = document.createElement(comp.component);

            for (const [key, value] of Object.entries(comp.props)) {
                el.setAttribute(key, String(value));
            }

            holder.appendChild(el);
            container.appendChild(holder);
        }

        this.root.appendChild(container);

        this._wireFeedback(container, layout, state, action, context);
    }

    _wireFeedback(container, layout, state, action, context) {
        const ui = document.createElement('div');
        ui.className = 'feedback-controls';
        ui.style.cssText = 'position:sticky;bottom:8px;display:flex;gap:8px;justify-content:flex-end;margin-top:8px;';
        ui.innerHTML = `
    <button type="button" data-feedback="pos" aria-label="Îmi place layout-ul">👍</button>
    <button type="button" data-feedback="neg" aria-label="Nu-mi place layout-ul">👎</button>
    <span class="thanks" hidden style="align-self:center;opacity:.8;padding:0 6px;">Învățare în curs...</span>
  `;
        container.appendChild(ui);

        const btns = Array.from(ui.querySelectorAll('button'));
        const thanks = ui.querySelector('.thanks');
        let locked = false;

        const setLocked = (v) => {
            locked = v;
            btns.forEach(b => b.disabled = v);
            thanks.hidden = !v;
        };

        const handle = async (positive) => {
            if (locked) return;
            setLocked(true);

            const reward = positive ? 1 : 0;

            console.log(`[AtlasUI v4.1] 📝 Recording: Action ${action} → Reward ${reward} (${positive ? '👍' : '👎'})`);

            const nextIntent = this._readIntent();
            const nextState = vectorizeIntent(nextIntent);

            await this._mlEngine.recordExperience(
                state,
                action,
                reward,
                nextState,
                false,
                context
            );

            try {
                await this._mlEngine.save();
                console.log('[AtlasUI v4.1] ✅ ML state saved');
            } catch (e) {
                console.warn('[AtlasUI v4.1] Could not save ML state:', e);
            }

            const refresh = this.getAttribute('autorefresh');
            if (refresh !== 'false') {
                this.render();
            } else {
                setTimeout(() => setLocked(false), 1200);
            }
        };

        ui.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-feedback]');
            if (!btn || locked) return;
            handle(btn.dataset.feedback === 'pos');
        }, { passive: true });

        ui.addEventListener('keydown', (e) => {
            if (locked) return;
            if (e.key === 'Enter' || e.key === ' ') {
                const btn = e.target.closest('[data-feedback]');
                if (!btn) return;
                e.preventDefault();
                handle(btn.dataset.feedback === 'pos');
            }
        });
    }

    async feedback(positive = true) {
        if (!this._lastLayout || !this._lastState || this._lastAction === null) {
            console.warn('[AtlasUI v4.1] No previous state to record feedback');
            return;
        }

        const reward = positive ? 1 : 0;
        const nextIntent = this._readIntent();
        const nextState = vectorizeIntent(nextIntent);

        console.log(`[AtlasUI v4.1] 📝 API Feedback: Action ${this._lastAction} → Reward ${reward}`);

        await this._mlEngine.recordExperience(
            this._lastState,
            this._lastAction,
            reward,
            nextState,
            false,
            this._lastContext
        );

        try {
            await this._mlEngine.save();
        } catch (e) {
            console.warn('[AtlasUI v4.1] Could not save ML state:', e);
        }

        const refresh = this.getAttribute('autorefresh');
        if (refresh !== 'false') this.render();
    }

    applySettings({ autorefresh, intent } = {}) {
        if (typeof autorefresh !== 'undefined') {
            this.setAttribute('autorefresh', String(autorefresh));
        }
        if (intent) {
            this.setAttribute('intent', JSON.stringify(intent));
        }
    }

    getMLStats() {
        return this._mlEngine ? this._mlEngine.getStats() : null;
    }

    setBanditAlgorithm(algorithm) {
        if (this._mlEngine) {
            this._mlEngine.setBanditAlgorithm(algorithm);
            console.log('[AtlasUI v4.1] Switched to', algorithm);
        }
    }

    resetML() {
        if (this._mlEngine) {
            this._mlEngine.reset();
            console.log('[AtlasUI v4.1] ML Engine reset');
        }
    }

    // 🧠 Confusion Detection Control Methods
    enableConfusionDetection() {
        this._confusionEnabled = true;
        if (confusionDetector && !confusionDetector.isRunning()) {
            confusionDetector.start();
            console.log('[AtlasUI v4.1] ✅ Confusion Detection enabled');
        }
    }

    disableConfusionDetection() {
        this._confusionEnabled = false;
        if (confusionDetector && confusionDetector.isRunning()) {
            confusionDetector.stop();
            console.log('[AtlasUI v4.1] ⏸️ Confusion Detection disabled');
        }
    }

    getConfusionState() {
        return this._lastConfusionState;
    }

    getConfusionStats() {
        return confusionDetector ? confusionDetector.getStats() : null;
    }

    resetConfusionDetection() {
        if (confusionDetector) {
            confusionDetector.reset();
            this._lastConfusionState = null;
            console.log('[AtlasUI v4.1] 🔄 Confusion Detection reset');
        }
    }
}

customElements.define('atlas-ui-v4', AtlasUIv4);

if (typeof window !== 'undefined') {
    window.AtlasUIv4 = AtlasUIv4;
}