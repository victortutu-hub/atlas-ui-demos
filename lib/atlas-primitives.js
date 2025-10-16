// src/atlas-primitives.js (v3.0 - FIXED attributeChangedCallback)
function baseStyle() { return `:host{display:block;color:var(--text);font:500 14px/1.5 ui-sans-serif,system-ui,"Segoe UI"} .card{background:var(--card);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:14px;box-shadow:0 1px 12px rgba(0,0,0,0.25)} .title{font-weight:600;letter-spacing:0.2px;margin-bottom:6px} .muted{opacity:.75} .accent{color:var(--accent)}`; }

export class AtlasHeader extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['display-headline', 'branding', 'navigation-hint'],
            contexts: ['dashboard', 'blog', 'ecommerce'],
            goals: ['browse', 'read', 'kpi-focus'],
            priority: 6
        };
    }

    static styleTokens() {
        return ['--card', '--text', '--accent'];
    }

    constructor() { super(); const r = this.attachShadow({ mode: 'open' }); const s = document.createElement('style'); s.textContent = baseStyle(); const w = document.createElement('div'); w.className = 'card'; w.innerHTML = `<div class="title accent">ATLAS-UI</div><div class="muted">Header adaptiv</div>`; r.append(s, w); }
}

customElements.define('atlas-header', AtlasHeader);

export class AtlasNavbar extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['navigation', 'menu', 'branding'],
            contexts: ['blog', 'ecommerce'],
            goals: ['browse', 'read'],
            priority: 7
        };
    }

    static styleTokens() {
        return ['--card', '--text', '--accent'];
    }

    constructor() { super(); const r = this.attachShadow({ mode: 'open' }); const s = document.createElement('style'); s.textContent = baseStyle() + `.nav{background:var(--card);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:10px 14px;display:flex;gap:12px;align-items:center}.brand{font-weight:800;letter-spacing:.4px;color:var(--accent);margin-right:auto}.item{opacity:.9;cursor:pointer;padding:6px 10px;border-radius:10px}.item:hover{background:rgba(255,255,255,0.06)}.pill{border:1px solid rgba(255,255,255,0.06);padding:6px 10px;border-radius:999px}`; const w = document.createElement('div'); w.className = 'nav'; w.innerHTML = `<div class="brand">ATLAS</div><div class="item">Acasă</div><div class="item">Produse</div><div class="item">Blog</div><div class="item pill">Cont</div>`; r.append(s, w); }
}

customElements.define('atlas-navbar', AtlasNavbar);

export class AtlasCard extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['display-content', 'container', 'generic'],
            contexts: ['dashboard', 'blog', 'ecommerce'],
            goals: ['browse', 'read', 'kpi-focus'],
            priority: 5
        };
    }

    static styleTokens() {
        return ['--card', '--text'];
    }

    constructor() { super(); const r = this.attachShadow({ mode: 'open' }); const s = document.createElement('style'); s.textContent = baseStyle(); const w = document.createElement('div'); w.className = 'card'; const title = this.getAttribute('title') || 'Card'; w.innerHTML = `<div class="title">${title}</div><slot>Conținut…</slot>`; r.append(s, w); }
}

customElements.define('atlas-card', AtlasCard);

export class AtlasKPI extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['display-metric', 'real-time-update', 'kpi', 'numeric-display'],
            contexts: ['dashboard'],
            goals: ['kpi-focus'],
            priority: 10
        };
    }

    static styleTokens() {
        return ['--card', '--accent'];
    }

    static get observedAttributes() { return ['value', 'label']; }
    constructor() { super(); const r = this.attachShadow({ mode: 'open' }); const s = document.createElement('style'); s.textContent = baseStyle() + `.kpi{display:flex;align-items:baseline;gap:8px}.val{font-size:28px;font-weight:700}.lbl{opacity:.7}`; this._val = this.getAttribute('value') || '42'; this._lbl = this.getAttribute('label') || 'KPI'; const w = document.createElement('div'); w.className = 'card'; w.innerHTML = `<div class="kpi"><div class="val accent">${this._val}</div><div class="lbl">${this._lbl}</div></div>`; r.append(s, w); this._root = w; } attributeChangedCallback() { if (!this._root) return; const val = this.getAttribute('value') || '42'; const lbl = this.getAttribute('label') || 'KPI'; this._root.querySelector('.val').textContent = val; this._root.querySelector('.lbl').textContent = lbl; }
}

customElements.define('atlas-kpi', AtlasKPI);

export class AtlasGrid extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['grid-layout', 'multi-item', 'container'],
            contexts: ['dashboard', 'blog'],
            goals: ['browse', 'read'],
            priority: 7
        };
    }

    static styleTokens() {
        return ['--card'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['cols', 'data-item-count']; }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        // ✅ FIX: Nu mai apelăm attachShadow() dacă există deja
        if (!this.shadowRoot) {
            console.warn('[AtlasGrid] shadowRoot not initialized in attributeChangedCallback');
            return;
        }

        // Clear și re-render doar dacă suntem conectați
        if (this.isConnected) {
            this.shadowRoot.innerHTML = '';
            this._renderContent();
        }
    }

    connectedCallback() {
        this._renderContent();
    }

    _renderContent() {
        if (!this.shadowRoot) return;

        const cols = Number(this.getAttribute('cols') || 3);
        const itemCount = Number(this.getAttribute('data-item-count') || 6);

        const s = document.createElement('style');
        s.textContent = baseStyle() + `.grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:12px}`;

        const w = document.createElement('div');
        w.className = 'grid';

        for (let i = 0; i < itemCount; i++) {
            const c = document.createElement('atlas-card');
            c.setAttribute('title', `Item ${i + 1}`);
            w.appendChild(c);
        }

        this.shadowRoot.append(s, w);
    }
}

customElements.define('atlas-grid', AtlasGrid);

export class AtlasHero extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['display-headline', 'hero-image', 'call-to-action', 'prominent-display'],
            contexts: ['blog', 'ecommerce'],
            goals: ['read', 'browse'],
            priority: 9
        };
    }

    static styleTokens() {
        return ['--card', '--accent'];
    }

    constructor() { super(); const r = this.attachShadow({ mode: 'open' }); const s = document.createElement('style'); s.textContent = baseStyle() + `.hero{border-radius:18px;background:linear-gradient(135deg,var(--card),rgba(122,162,255,0.12));padding:28px}.big{font-size:24px;font-weight:800;letter-spacing:.2px}`; const w = document.createElement('div'); w.className = 'hero'; w.innerHTML = `<div class="big">Hero adaptiv</div><div class="muted">Secțiune de prezentare</div>`; r.append(s, w); }
}

customElements.define('atlas-hero', AtlasHero);

export class AtlasFilterPanel extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['filter-data', 'multi-select', 'sidebar', 'form-controls'],
            contexts: ['ecommerce'],
            goals: ['browse', 'compare'],
            priority: 8
        };
    }

    static styleTokens() {
        return ['--card', '--accent'];
    }

    constructor() { super(); const r = this.attachShadow({ mode: 'open' }); const s = document.createElement('style'); s.textContent = baseStyle() + `.panel{background:var(--card);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px}.group{display:flex;flex-direction:column;gap:6px}label{display:flex;align-items:center;gap:8px;cursor:pointer}input[type="checkbox"]{accent-color:var(--accent)}.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.08)}.title{margin-bottom:8px}`; const w = document.createElement('div'); w.className = 'panel'; w.innerHTML = `<div class="title accent">Filtre</div><div class="group"><label><input type="checkbox"> Disponibile</label><label><input type="checkbox"> Reduceri</label><label><input type="checkbox"> Livrare rapidă</label></div><div class="group"><div class="muted">Preț</div><div class="chips"><div class="chip">Sub 100</div><div class="chip">100–300</div><div class="chip">300–700</div><div class="chip">700+</div></div></div>`; r.append(s, w); }
}

customElements.define('atlas-filter-panel', AtlasFilterPanel);

export class AtlasProductTile extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['display-product', 'add-to-cart', 'favorite', 'product-info'],
            contexts: ['ecommerce'],
            goals: ['browse', 'compare', 'checkout'],
            priority: 9
        };
    }

    static styleTokens() {
        return ['--card', '--text', '--accent'];
    }

    constructor() { super(); const r = this.attachShadow({ mode: 'open' }); const s = document.createElement('style'); s.textContent = baseStyle() + `.tile{background:var(--card);border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden}img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}.b{padding:12px;display:grid;gap:8px}.name{font-weight:600}.row{display:flex;align-items:center;justify-content:space-between;gap:8px}.price{font-weight:800;color:var(--accent)}.badge{font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid rgba(255,255,255,0.10);opacity:.9}button{cursor:pointer;border:1px solid rgba(255,255,255,0.10);background:transparent;color:var(--text);padding:8px 10px;border-radius:10px}button:hover{background:rgba(255,255,255,0.06)}`; const w = document.createElement('div'); w.className = 'tile'; const name = this.getAttribute('name') || 'Produs'; const price = this.getAttribute('price') || '199'; const badge = this.getAttribute('badge') || 'Nou'; const img = this.getAttribute('img') || 'https://picsum.photos/seed/atlas/400/300'; w.innerHTML = `<img src="${img}" alt="${name}"><div class="b"><div class="name">${name}</div><div class="row"><div class="price">${price} RON</div><div class="badge">${badge}</div></div><div class="row"><button>Favorite</button><button>Adaugă în coș</button></div></div>`; r.append(s, w); }
}

customElements.define('atlas-product-tile', AtlasProductTile);

export class AtlasProductGrid extends HTMLElement {
    static affordance() {
        return {
            capabilities: ['display-product', 'grid-layout', 'product-collection'],
            contexts: ['ecommerce'],
            goals: ['browse', 'compare'],
            priority: 10
        };
    }

    static styleTokens() {
        return ['--card'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['cols', 'data-item-count']; }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        // ✅ FIX: Nu mai apelăm attachShadow() dacă există deja
        if (!this.shadowRoot) {
            console.warn('[AtlasProductGrid] shadowRoot not initialized in attributeChangedCallback');
            return;
        }

        // Clear și re-render doar dacă suntem conectați
        if (this.isConnected) {
            this.shadowRoot.innerHTML = '';
            this._renderContent();
        }
    }

    connectedCallback() {
        this._renderContent();
    }

    _renderContent() {
        if (!this.shadowRoot) return;

        const cols = Number(this.getAttribute('cols') || 3);
        const itemCount = Number(this.getAttribute('data-item-count') || 6);

        const s = document.createElement('style');
        s.textContent = baseStyle() + `.grid{display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:12px}`;

        const w = document.createElement('div');
        w.className = 'grid';

        const sample = [
            { name: 'Căști Atlas A1', price: '199', badge: '-15%', img: 'https://picsum.photos/seed/a1/400/300' },
            { name: 'Rucsac Explorer', price: '249', badge: 'Nou', img: 'https://picsum.photos/seed/a2/400/300' },
            { name: 'Ceas inteligent Z', price: '499', badge: 'Top', img: 'https://picsum.photos/seed/a3/400/300' },
            { name: 'Lampă ambient', price: '129', badge: 'Eco', img: 'https://picsum.photos/seed/a4/400/300' },
            { name: 'Cameră sport', price: '799', badge: '-10%', img: 'https://picsum.photos/seed/a5/400/300' },
            { name: 'Tastatură mecanică', price: '379', badge: 'Nou', img: 'https://picsum.photos/seed/a6/400/300' },
            { name: 'Mouse gaming', price: '159', badge: 'Popular', img: 'https://picsum.photos/seed/a7/400/300' },
            { name: 'Monitor 4K', price: '899', badge: 'Premium', img: 'https://picsum.photos/seed/a8/400/300' }
        ];

        const productsToShow = sample.slice(0, Math.min(itemCount, sample.length));

        productsToShow.forEach(p => {
            const t = document.createElement('atlas-product-tile');
            t.setAttribute('name', p.name);
            t.setAttribute('price', p.price);
            t.setAttribute('badge', p.badge);
            t.setAttribute('img', p.img);
            w.appendChild(t);
        });

        this.shadowRoot.append(s, w);
    }
}

customElements.define('atlas-product-grid', AtlasProductGrid);