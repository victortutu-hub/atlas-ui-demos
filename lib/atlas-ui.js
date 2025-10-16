// src/atlas-ui.js (v3.0 - FIXED render() checks)
// Sistem complet de generare procedurală - NU mai avem 8 archetypes hardcodate!

import { getLayoutGenerator } from './atlas-layout-generator.js';
import { ComponentComposer } from './atlas-component-composer.js';
import { getAffordanceRegistry } from './atlas-affordance-registry.js';

const TFJS_CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js';

/** Ensure TFJS is loaded */

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

// Intent vectorizer (same as before)
/**
 * Transformă un intent (domain/goal/density/persona/device/accent) într-un vector one-hot stabil.
 * - Ordonare fixă a featurilor: domain → goal → density → persona → device → accent
 * - Sinonime/variante sunt normalizate (ex. "e-commerce" → "ecommerce", "pc" → "desktop")
 * - Valorile necunoscute sunt mapate la vectori de zero pentru acel feature (și loghează un warn în dev)
 * - Expune metadate utile: vectorizeIntent.FEATURE_ORDER / .CATEGORIES / .FEATURE_SIZE
 */
function vectorizeIntent(rawIntent) {
    const ORDER = ["domain", "goal", "density", "persona", "device", "accent"];

    // Clasele/categoriile acceptate, în ordinea folosită la one-hot
    const CATS = {
        domain: ["dashboard", "blog", "ecommerce"],
        goal: ["browse", "compare", "checkout", "kpi-focus", "read"],
        density: ["compact", "medium", "cozy"],
        persona: ["new", "returning", "power"],
        device: ["mobile", "tablet", "desktop"],
        accent: ["cool", "warm", "neutral"],
    };

    // Sinonime & „aliasuri" frecvente (taste greșite, stil alternativ)
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
        // dacă e deja valoare suportată, păstreaz-o
        if (CATS[k].includes(sv)) return sv;
        // încearcă aliasuri/sinonime
        const mapped = CANON[k] && CANON[k][sv];
        if (mapped && CATS[k].includes(mapped)) return mapped;
        // necunoscut → întoarce șir gol (va duce la vector zero pentru acel feature)
        if (typeof window !== "undefined" && window && window._ATLAS_DEV_WARN_ !== false) {
            // mic warn doar în dev – setează window._ATLAS_DEV_WARN_ = false ca să-l dezactivezi
            // eslint-disable-next-line no-console
            console.warn(`[ATLAS] vectorizeIntent: valoare necunoscută pentru "${k}": "${v}"`);
        }
        return "";
    };

    const oneHot = (k, v) => {
        const cats = CATS[k];
        const idx = cats.indexOf(v);
        // necunoscut → vector de zero
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

    // opțional: întoarcem un Array clasic, nu Float32Array, pentru a evita surprize la consumatori
    const vec = pieces;

    // sanity în dev: dimensiunea trebuie să fie constantă
    const EXPECTED = ORDER.reduce((s, k) => s + CATS[k].length, 0);
    if (vec.length !== EXPECTED && typeof window !== "undefined" && window && window._ATLAS_DEV_WARN_ !== false) {
        // eslint-disable-next-line no-console
        console.warn(`[ATLAS] vectorizeIntent: dimensiune vector neașteptată: ${vec.length} (așteptat ${EXPECTED})`);
    }

    return vec;
}


// Metadate utile (pentru teste/simulatoare/debug)
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


// ---- Policy model ----
async function createPolicyModel(tf, inputSize, outputSize) {
    const m = tf.sequential();
    m.add(tf.layers.dense({ units: 32, inputShape: [inputSize], activation: 'relu', name: 'dense_a' }));
    m.add(tf.layers.dense({ units: 16, activation: 'relu', name: 'dense_b' }));
    m.add(tf.layers.dense({ units: outputSize, activation: 'linear', name: 'dense_out' }));
    m.compile({ optimizer: tf.train.adam(0.002), loss: 'meanSquaredError' });
    return m;
}

// ---- Bandit simplu (Thompson Sampling) ----
class ThompsonBandit {
    constructor(eps = 0.35) {
        this.alpha = 1;
        this.beta = 1;
        this.eps = eps;
    }

    sample() {
        if (Math.random() < this.eps) return Math.random(); // explore
        // exploit: beta distribution
        const mean = this.alpha / (this.alpha + this.beta);
        return mean + (Math.random() - 0.5) * 0.1;
    }

    update(reward01) {
        if (reward01 > 0.5) this.alpha += 1;
        else this.beta += 1;
    }
}

// ---- Policy singleton ----
const POLICY_KEY = 'atlas-policy-v3';

async function getPolicySingleton(tf, inputSize) {
    if (!window.__ATLAS_POLICY_V3__) {
        window.__ATLAS_POLICY_V3__ = {
            model: null,
            bandit: new ThompsonBandit(),
            ready: null
        };
    }
    const S = window.__ATLAS_POLICY_V3__;

    if (S.ready) { await S.ready; return S; }

    S.ready = (async () => {
        try {
            S.model = await tf.loadLayersModel(`localstorage://${POLICY_KEY}`);
            S.model.compile({ optimizer: tf.train.adam(0.002), loss: 'meanSquaredError' });
        } catch {
            if (S.model) { try { S.model.dispose(); } catch { } }
            // Output size = 1 (score pentru layout-ul generat)
            S.model = await createPolicyModel(tf, inputSize, 1);
        }
    })();

    await S.ready;
    return S;
}

// ---- Componenta AtlasUI ----
export class AtlasUI extends HTMLElement {
    static get observedAttributes() {
        return ['intent', 'accent', 'eps', 'autorefresh'];
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
      
      /* CSS dinamic generat pe baza layout-ului */
      .layout-container{ display:grid; gap:12px; }
      
      /* Layouts specifice cu suport pentru sloturi variabile */
      .layout-kpi-dominant{ 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
        gap: 12px; 
      }
      .layout-kpi-dominant .slot[data-slot="header"] { 
        grid-column: 1 / -1; 
      }
      
      .layout-balanced-grid{ grid-template-columns: 260px 1fr; }
      
      .layout-content-centric{ 
        grid-template-rows: auto 1fr auto; 
        max-width: 800px; 
        margin: 0 auto; 
      }
      
      .layout-feed-style{ 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px; 
      }
      .layout-feed-style .slot[data-slot="navbar"] { 
        grid-column: 1 / -1; 
      }
      .layout-feed-style .slot[data-slot="filters"] { 
        grid-column: 1 / -1; 
      }
      
      .layout-product-grid{ 
        display: grid;
        grid-template-columns: 240px 1fr; 
        gap: 16px; 
      }
      .layout-product-grid .slot[data-slot="header"] { 
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
      
      .flash{ animation: flash 600ms ease-out 1; }
      @keyframes flash { 0%{opacity:0.4} 100%{opacity:1} }
      
      :host{ --bg: #0e0f14; --card: #151823; --text:#dfe6ff; --accent:#7aa2ff; }
      :host([accent="warm"]){ --accent:#ff8a66; }
      :host([accent="neutral"]){ --accent:#8e9ab3; }
    `;

        this.shadowRoot.append(style, this.root);

        this._tf = null;
        this._policy = null;
        this._inputSize = null;
        this._lastLayout = null;
        this._layoutGenerator = null;
        this._composer = null;
        this._registry = null;
    }

    // În atlas-ui.js:

    async connectedCallback() {
        // ⭐ ADD: Error handling for TensorFlow.js
        try {
            this._tf = await ensureTF();
        } catch (error) {
            console.error('[AtlasUI] Failed to load TensorFlow.js:', error);
            this.root.innerHTML = `
            <div style="padding: 20px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; border-radius: 12px;">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">⚠️ Failed to load ML components</div>
                <div style="font-size: 13px; opacity: 0.9;">
                    TensorFlow.js could not be loaded. Please check your internet connection and refresh the page.
                </div>
                <div style="margin-top: 12px; font-size: 12px; opacity: 0.7;">
                    Error: ${error.message}
                </div>
            </div>
        `;
            return;
        }

        try {
            // Initialize registry and composer
            this._registry = getAffordanceRegistry();
            this._composer = new ComponentComposer(this._registry);
            this._layoutGenerator = getLayoutGenerator();

            const x0 = vectorizeIntent(this._readIntent());
            this._inputSize = x0.length;
            this._policy = await getPolicySingleton(this._tf, this._inputSize);

            this.render();
        } catch (error) {
            console.error('[AtlasUI] Initialization error:', error);
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

    attributeChangedCallback() {
        if (this._policy?.model) this.render();
    }

    _readIntent() {
        try {
            return JSON.parse(this.getAttribute('intent') || '{}');
        } catch {
            return {};
        }
    }

    getIntent() { return this._readIntent(); }
    setIntent(obj) { this.setAttribute('intent', JSON.stringify(obj || {})); }

    render() {
        // ✅ FIX: Verificare pentru registry și componente necesare
        if (!this._layoutGenerator || !this._composer || !this._registry) {
            console.warn('[AtlasUI] Not fully initialized yet - skipping render');

            // Afișează un loading state
            this.root.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #8e9ab3;">
                    <div style="font-size: 14px; margin-bottom: 8px;">⏳ Initializing ATLAS...</div>
                    <div style="font-size: 12px; opacity: 0.7;">Loading registry and generators</div>
                </div>
            `;
            return;
        }

        const intent = this._readIntent();

        // Setează accent
        if (intent.accent && !this.hasAttribute('accent')) {
            this.setAttribute('accent', intent.accent);
        }

        // Normalizează intent
        const normalizedIntent = {
            domain: intent.domain || 'dashboard',
            goal: intent.goal || 'kpi-focus',
            density: intent.density || 'medium',
            persona: intent.persona || 'new',
            device: intent.device || 'desktop',
            accent: intent.accent || 'cool'
        };

        // GENERARE PROCEDURALĂ (nu selectare din listă!)
        const layout = this._layoutGenerator.generate(normalizedIntent);

        // Compune componente pentru layout
        const composition = this._composer.compose(layout, normalizedIntent);

        // Evaluează layout-ul cu policy network
        const score = this._evaluateLayout(normalizedIntent);

        // Materializează în DOM
        this._materialize(layout, composition, score);

        this._lastLayout = layout;
    }

    /**
     * Evaluează un layout cu policy network
     */
    _evaluateLayout(intent) {
        const x = vectorizeIntent(intent);
        const xs = this._tf.tensor2d([x], [1, x.length]);
        const prediction = this._policy.model.predict(xs);
        const score = prediction.dataSync()[0];
        xs.dispose();
        prediction.dispose();

        // Combine cu bandit pentru explorare
        const banditSample = this._policy.bandit.sample();
        const finalScore = score * 0.7 + banditSample * 0.3;

        return finalScore;
    }

    /**
     * Materializează layout-ul generat în DOM
     */
    _materialize(layout, composition, score) {
        this.root.innerHTML = '';

        // Meta info badge
        const badge = document.createElement('div');
        badge.className = 'meta-badge' + (this._lastLayout && this._lastLayout.id !== layout.id ? ' flash' : '');
        badge.innerHTML = `
      <span>Layout: ${layout.structure.type}</span>
      <span>Score: ${score.toFixed(3)}</span>
      <span>Slots: ${layout.slots.length}</span>
    `;
        this.root.appendChild(badge);

        // Container
        const container = document.createElement('div');
        container.className = `layout-container layout-${layout.structure.type}`;

        // Materializează fiecare componentă
        for (const comp of composition) {
            const holder = document.createElement('div');
            holder.className = 'slot';
            holder.setAttribute('data-slot', comp.slot);
            holder.setAttribute('data-priority', comp.priority);

            // Creează componenta
            const el = document.createElement(comp.component);

            // Aplică props
            for (const [key, value] of Object.entries(comp.props)) {
                el.setAttribute(key, String(value));
            }

            holder.appendChild(el);
            container.appendChild(holder);
        }

        this.root.appendChild(container);

        // Wire feedback
        this._wireFeedback(container, layout, score);
    }



    _wireFeedback(container, layout, initialScore) {
        const ui = document.createElement('div');
        ui.className = 'feedback-controls';
        ui.style.cssText = 'position:sticky;bottom:8px;display:flex;gap:8px;justify-content:flex-end;margin-top:8px;';
        ui.innerHTML = `
    <button type="button" data-feedback="pos" aria-label="Îmi place layout-ul">👍</button>
    <button type="button" data-feedback="neg" aria-label="Nu-mi place layout-ul">👎</button>
    <span class="thanks" hidden style="align-self:center;opacity:.8;padding:0 6px;">Mulțumesc!</span>
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

            // bandit + micro-train + persist
            const reward = positive ? 1 : 0;
            this._policy.bandit.update(reward);
            await this._microTrain(initialScore, reward);
            try { await this._policy.model.save(`localstorage://${POLICY_KEY}`); } catch { }

            const refresh = this.getAttribute('autorefresh');
            if (refresh !== 'false') {
                this.render(); // UI se reface, deci nu mai contează deblocarea locală
            } else {
                setTimeout(() => setLocked(false), 1200); // mic „cooldown" dacă nu re-randăm
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


    async _microTrain(predictedScore, reward01) {
        const tf = this._tf;
        const intent = this._readIntent();
        const xVec = vectorizeIntent(intent);

        // Sanitize reward & clamp target to [0,1]
        const r = Math.max(0, Math.min(1, Number.isFinite(reward01) ? reward01 : 0));
        // Target: ajustează scorul prezis către reward (stabilizat)
        let target = predictedScore + (r - 0.5) * 0.3;
        target = Math.max(0, Math.min(1, target));

        const xs = tf.tensor2d([xVec], [1, xVec.length]);
        const ys = tf.tensor2d([[target]], [1, 1]);

        await this._policy.model.fit(xs, ys, {
            epochs: 1,
            batchSize: 1,
            shuffle: false
        });

        xs.dispose();
        ys.dispose();
    }

    // Public API
    async feedback(positive = true) {
        if (!this._lastLayout) this.render();
        const reward = positive ? 1 : 0;
        this._policy.bandit.update(reward);
        const score = this._evaluateLayout(this._readIntent());
        await this._microTrain(score, reward);
        try {
            await this._policy.model.save(`localstorage://${POLICY_KEY}`);
        } catch { }
        const refresh = this.getAttribute('autorefresh');
        if (refresh !== 'false') this.render();
    }

    applySettings({ eps, autorefresh, intent } = {}) {
        if (typeof eps === 'number') {
            this._policy.bandit.eps = Math.max(0, Math.min(1, eps));
        }
        if (typeof autorefresh !== 'undefined') {
            this.setAttribute('autorefresh', String(autorefresh));
        }
        if (intent) {
            this.setAttribute('intent', JSON.stringify(intent));
        }
    }
}

customElements.define('atlas-ui', AtlasUI);