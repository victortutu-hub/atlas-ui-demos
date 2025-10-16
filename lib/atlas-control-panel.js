// src/atlas-control-panel-FIXED.js (v3.1 - COMPATIBLE with v4.1)
// Control panel cu collapse, drag & resize - ACUM FUNCTIONEAZA CU atlas-ui-v4!

class AtlasControlPanel extends HTMLElement {
  constructor() {
    super();
    const r = this.attachShadow({ mode: 'open' });

    // State
    this.state = {
      isCollapsed: false,
      isDragging: false,
      position: this.loadPosition() || { right: 16, bottom: 16 },
      size: { width: 360, height: 'auto' }
    };

    const s = document.createElement('style');
    s.textContent = `
            :host { 
                position: fixed; 
                z-index: 9999;
                pointer-events: none;
            }
            
            .cp { 
                width: ${this.state.size.width}px;
                background: rgba(15, 19, 27, 0.98);
                backdrop-filter: blur(20px);
                color: #dfe6ff; 
                border: 1px solid rgba(255,255,255,0.08); 
                border-radius: 16px; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.6); 
                overflow: hidden;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
                pointer-events: auto;
            }
            
            .cp.collapsed {
                width: auto;
                height: auto;
            }
            
            .hd { 
                display: flex; 
                align-items: center; 
                justify-content: space-between; 
                padding: 12px 14px; 
                border-bottom: 1px solid rgba(255,255,255,0.06);
                background: rgba(0,0,0,0.2);
                cursor: move;
                user-select: none;
            }
            
            .hd:active {
                cursor: grabbing;
            }
            
            .title-row {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .title { 
                font-weight: 800; 
                letter-spacing: 0.3px; 
                font-size: 13px;
            }
            
            .badge {
                font-size: 9px;
                padding: 2px 6px;
                background: rgba(122, 162, 255, 0.2);
                border-radius: 4px;
                color: #7aa2ff;
                font-weight: 600;
            }
            
            .fixed-badge {
                background: linear-gradient(135deg, #10b981, #3b82f6);
                color: white !important;
            }
            
            .header-controls {
                display: flex;
                gap: 6px;
            }
            
            .icon-btn {
                width: 24px;
                height: 24px;
                border: none;
                background: rgba(255,255,255,0.05);
                color: #8e9ab3;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                font-size: 12px;
            }
            
            .icon-btn:hover {
                background: rgba(255,255,255,0.1);
                color: #dfe6ff;
            }
            
            .bd { 
                display: grid; 
                gap: 12px; 
                padding: 12px; 
                max-height: calc(90vh - 120px);
                overflow-y: auto;
            }
            
            .bd::-webkit-scrollbar {
                width: 6px;
            }
            
            .bd::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.02);
            }
            
            .bd::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
            }
            
            .collapsed .bd {
                display: none;
            }
            
            .section { 
                background: rgba(255,255,255,0.03); 
                padding: 10px; 
                border-radius: 10px; 
            }
            
            .section-title { 
                font-size: 10px; 
                text-transform: uppercase; 
                opacity: 0.6; 
                margin-bottom: 8px;
                letter-spacing: 0.5px;
                font-weight: 600;
            }
            
            label { 
                font-size: 11px; 
                opacity: 0.9; 
                margin-bottom: 4px; 
                display: block; 
                font-weight: 500;
            }
            
            select, input[type="text"], textarea { 
                width: 100%; 
                background: #0b0e15; 
                color: #dfe6ff; 
                border: 1px solid rgba(255,255,255,0.10); 
                border-radius: 8px; 
                padding: 8px;
                box-sizing: border-box;
                font-size: 12px;
            }
            
            textarea { 
                min-height: 120px; 
                font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; 
                resize: vertical;
            }
            
            .row { 
                display: grid; 
                grid-template-columns: 1fr auto; 
                gap: 8px; 
                align-items: center; 
            }
            
            .btns { 
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
            }
            
            button { 
                cursor: pointer; 
                background: #101826; 
                color: #dfe6ff; 
                border: 1px solid rgba(255,255,255,0.10); 
                border-radius: 8px; 
                padding: 8px 10px;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.2s;
            }
            
            button:hover { 
                background: #172033; 
                border-color: rgba(255,255,255,0.15);
            }
            
            button.primary { 
                background: #7aa2ff; 
                color: #000; 
                border-color: #7aa2ff; 
            }
            
            button.primary:hover { 
                background: #8fb3ff; 
            }
            
            .sub { 
                font-size: 10px; 
                opacity: 0.7; 
            }
            
            .range { 
                display: grid; 
                grid-template-columns: auto 1fr auto; 
                gap: 8px; 
                align-items: center; 
            }
            
            input[type="range"] { 
                width: 100%; 
            }
            
            .stats { 
                font-size: 10px; 
                opacity: 0.7; 
                background: rgba(0,0,0,0.2); 
                padding: 8px; 
                border-radius: 6px;
                font-family: monospace;
                line-height: 1.5;
            }
            
            .stats div { 
                margin: 2px 0; 
            }
            
            .drag-handle {
                cursor: move;
                padding: 4px;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            
            .drag-handle:hover {
                opacity: 1;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .cp {
                animation: slideIn 0.3s ease-out;
            }
        `;

    const w = document.createElement('div');
    w.className = 'cp';
    w.innerHTML = `
            <div class="hd">
                <div class="title-row">
                    <div class="drag-handle">⋮⋮</div>
                    <div class="title">ATLAS Control</div>
                    <div class="badge">v3.1</div>
                    <div class="badge fixed-badge">FIXED</div>
                </div>
                <div class="header-controls">
                    <button class="icon-btn" id="collapse-btn" title="Minimize">−</button>
                </div>
            </div>
            <div class="bd">
                <div class="section">
                    <div class="section-title">Target</div>
                    <select id="target"></select>
                </div>

                <div class="section">
                    <div class="section-title">Learning</div>
                    <div class="range">
                        <label>Exploration</label>
                        <input id="eps" type="range" min="0" max="1" step="0.05" value="0.35"/>
                        <div id="epsv" class="sub">0.35</div>
                    </div>
                    <div class="row" style="margin-top: 8px;">
                        <label>Auto-refresh</label>
                        <select id="autorefresh">
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    </div>
                </div>

                
                <div class="section">
                    <div class="section-title">Runtime</div>
                    <div class="row">
                        <label>Mode</label>
                        <select id="atlas-mode">
                            <option value="demo">demo</option>
                            <option value="prod">prod</option>
                        </select>
                    </div>
                    <div class="row">
                        <label>Simulator</label>
                        <select id="flag-simulator">
                            <option value="true">on</option>
                            <option value="false">off</option>
                        </select>
                    </div>
                    <div class="row">
                        <label>Collector</label>
                        <select id="flag-collector">
                            <option value="true">on</option>
                            <option value="false">off</option>
                        </select>
                    </div>
                    <div class="row">
                        <label>Shadow Mode</label>
                        <select id="flag-shadow">
                            <option value="true">on</option>
                            <option value="false">off</option>
                        </select>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">Intent JSON</div>
                    <textarea id="intent" placeholder='{"domain":"dashboard","goal":"kpi-focus",...}'></textarea>
                </div>

                <div class="section">
                    <div class="section-title">Actions</div>
                    <div class="btns">
                        <button id="apply" class="primary">Apply</button>
                        <button id="pos">👍 Like</button>
                        <button id="neg">👎 Dislike</button>
                        <button id="rnd">🎲 Random</button>
                        <button id="reset">🗑️ Reset</button>
                        <button id="stats">📊 Stats</button>
                    </div>
                </div>

                <div id="statsPanel" class="stats" style="display:none;"></div>
            </div>
        `;
    r.append(s, w);

    this._panel = w;
    this._style = s;
  }

  connectedCallback() {
    this._root = this.shadowRoot;
    this.$ = sel => this._root.querySelector(sel);

    this.updatePosition();
    // Init runtime globals if missing
    if (!window.ATLAS_MODE) {
      window.ATLAS_MODE = localStorage.getItem('atlas:mode') || 'demo';
    }
    if (!window.ATLAS_FLAGS) {
      window.ATLAS_FLAGS = {
        simulator: true,
        collector: false,
        shadow: true
      };
    } else {
      // ensure all keys
      window.ATLAS_FLAGS.simulator ??= true;
      window.ATLAS_FLAGS.collector ??= false;
      window.ATLAS_FLAGS.shadow ??= true;
    }

    this._populate();
    this._bind();
    this._loadFromTarget();
    this._setupDrag();
  }

  updatePosition() {
    const { right, bottom } = this.state.position;
    this.style.right = right + 'px';
    this.style.bottom = bottom + 'px';
  }

  savePosition() {
    localStorage.setItem('atlas-control-position', JSON.stringify(this.state.position));
  }

  loadPosition() {
    try {
      const saved = localStorage.getItem('atlas-control-position');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  _setupDrag() {
    const header = this.$('.hd');
    let startX, startY, startRight, startBottom;

    const onMouseDown = (e) => {
      if (e.target.closest('.icon-btn')) return;

      this.state.isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startRight = this.state.position.right;
      startBottom = this.state.position.bottom;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!this.state.isDragging) return;

      const deltaX = startX - e.clientX;
      const deltaY = e.clientY - startY;

      this.state.position.right = Math.max(0, Math.min(window.innerWidth - 100, startRight + deltaX));
      this.state.position.bottom = Math.max(0, Math.min(window.innerHeight - 50, startBottom + deltaY));

      this.updatePosition();
    };

    const onMouseUp = () => {
      this.state.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.savePosition();
    };

    header.addEventListener('mousedown', onMouseDown);
  }

  // ⭐ FIXED: Caută AMBELE tipuri de componente (v3 și v4)
  _populate() {
    const targetsV3 = Array.from(document.querySelectorAll('atlas-ui'));
    const targetsV4 = Array.from(document.querySelectorAll('atlas-ui-v4'));
    const targets = [...targetsV3, ...targetsV4];

    const tSel = this.$('#target');
    tSel.innerHTML = targets.map((el, i) => {
      if (!el.id) el.id = 'atlas-' + (i + 1);
      const version = el.tagName.toLowerCase() === 'atlas-ui-v4' ? ' (v4.1)' : ' (v3)';
      return `<option value="${el.id}">#${el.id}${version}</option>`;
    }).join('');

    if (targets.length === 0) {
      tSel.innerHTML = '<option value="">No ATLAS components found</option>';
      console.warn('[Control Panel] No atlas-ui or atlas-ui-v4 components found!');
    } else {
      console.log(`[Control Panel] Found ${targets.length} components (${targetsV3.length} v3, ${targetsV4.length} v4)`);
    }

    // Init runtime selects
    const modeSel = this.$('#atlas-mode');
    if (modeSel) modeSel.value = String(window.ATLAS_MODE);
    const fs = window.ATLAS_FLAGS || {};
    const s1 = this.$('#flag-simulator'); if (s1) s1.value = String(!!fs.simulator);
    const s2 = this.$('#flag-collector'); if (s2) s2.value = String(!!fs.collector);
    const s3 = this.$('#flag-shadow'); if (s3) s3.value = String(!!fs.shadow);
  }

  _getTarget() {
    const id = this.$('#target').value;
    return document.getElementById(id);
  }

  _bind() {
    // Collapse toggle
    this.$('#collapse-btn').addEventListener('click', () => this._toggleCollapse());

    this.$('#target').addEventListener('change', () => this._loadFromTarget());
    this.$('#eps').addEventListener('input', e => {
      this.$('#epsv').textContent = Number(e.target.value).toFixed(2);
    });

    // Runtime toggles
    const modeSel = this.$('#atlas-mode');
    if (modeSel) modeSel.addEventListener('change', (e) => {
      window.ATLAS_MODE = e.target.value;
      localStorage.setItem('atlas:mode', window.ATLAS_MODE);
      console.log('[ATLAS] Mode =', window.ATLAS_MODE);
    });

    const setFlag = (key, val) => {
      window.ATLAS_FLAGS[key] = (String(val) === 'true');
      console.log('[ATLAS] Flag', key, '=', window.ATLAS_FLAGS[key]);
    };

    const s1 = this.$('#flag-simulator');
    if (s1) s1.addEventListener('change', e => setFlag('simulator', e.target.value));

    const s2 = this.$('#flag-collector');
    if (s2) s2.addEventListener('change', e => setFlag('collector', e.target.value));

    const s3 = this.$('#flag-shadow');
    if (s3) s3.addEventListener('change', e => setFlag('shadow', e.target.value));

    this.$('#apply').addEventListener('click', () => this._apply());
    this.$('#pos').addEventListener('click', () => this._giveFeedback(true));
    this.$('#neg').addEventListener('click', () => this._giveFeedback(false));
    this.$('#rnd').addEventListener('click', () => this._randomizeIntent());
    this.$('#stats').addEventListener('click', () => this._toggleStats());
    this.$('#reset').addEventListener('click', () => {
      if (!confirm('Reset ML model? This cannot be undone.')) return;
      try {
        // Clear ML v4 state
        localStorage.removeItem('atlas-ml-v4-state');
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('atlas-ml') || key.includes('atlas-policy')) {
            localStorage.removeItem(key);
          }
        });
      } catch { }
      location.reload();
    });
  }

  _toggleCollapse() {
    this.state.isCollapsed = !this.state.isCollapsed;
    const btn = this.$('#collapse-btn');

    if (this.state.isCollapsed) {
      this._panel.classList.add('collapsed');
      btn.textContent = '+';
      btn.title = 'Expand';
    } else {
      this._panel.classList.remove('collapsed');
      btn.textContent = '−';
      btn.title = 'Minimize';
    }
  }

  // ⭐ FIXED: Funcționează cu AMBELE versiuni
  _loadFromTarget() {
    const el = this._getTarget();
    if (!el) return;

    // Verifică dacă e v4 sau v3
    const isV4 = el.tagName.toLowerCase() === 'atlas-ui-v4';

    let eps = 0.35;
    if (isV4) {
      // v4 folosește ML Engine
      const stats = el.getMLStats?.();
      if (stats?.dqnStats?.epsilon !== undefined) {
        eps = stats.dqnStats.epsilon;
      }
    } else {
      // v3 folosește bandit policy
      eps = Number(el._policy?.bandit?.eps || 0.35);
    }

    this.$('#eps').value = String(eps);
    this.$('#epsv').textContent = eps.toFixed(2);

    this.$('#autorefresh').value = (el.getAttribute('autorefresh') === 'false') ? 'false' : 'true';

    const intent = el.getAttribute('intent') || '{}';
    this.$('#intent').value = intent;
  }

  // ⭐ FIXED: Funcționează cu AMBELE versiuni
  _apply() {
    const el = this._getTarget();
    if (!el) {
      alert('No target component selected');
      return;
    }

    let intent = {};
    try {
      intent = JSON.parse(this.$('#intent').value || '{}');
    } catch {
      alert('Invalid JSON for intent.');
      return;
    }

    const eps = Number(this.$('#eps').value);
    const autorefresh = this.$('#autorefresh').value === 'true';

    // Aplică settings diferit pentru v3 vs v4
    if (typeof el.applySettings === 'function') {
      el.applySettings({ eps, autorefresh, intent });
    } else {
      // Fallback: setează manual
      el.setAttribute('autorefresh', String(autorefresh));
      el.setAttribute('intent', JSON.stringify(intent));
    }

    console.log('[Control Panel] Applied settings to', el.id);
  }

  // ⭐ FIXED: Feedback funcționează cu AMBELE versiuni
  _giveFeedback(positive) {
    const el = this._getTarget();
    if (!el) {
      alert('No target component selected');
      return;
    }

    if (typeof el.feedback === 'function') {
      el.feedback(positive);
      console.log(`[Control Panel] Sent ${positive ? '👍' : '👎'} feedback to ${el.id}`);
    } else {
      console.warn('[Control Panel] Component does not support feedback()');
      alert('This component does not support feedback. Try selecting a different component.');
    }
  }

  _randomizeIntent() {
    const el = this._getTarget();
    if (!el) return;

    // Obține intent curent
    let intent = {};
    try {
      intent = JSON.parse(el.getAttribute('intent') || '{}');
    } catch {
      intent = {};
    }

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    intent.domain = pick(['dashboard', 'blog', 'ecommerce']);
    intent.goal = pick(['browse', 'compare', 'checkout', 'kpi-focus', 'read']);
    intent.density = pick(['compact', 'medium', 'cozy']);
    intent.persona = pick(['new', 'returning', 'power']);
    intent.device = pick(['mobile', 'tablet', 'desktop']);
    intent.accent = pick(['cool', 'warm', 'neutral']);

    this.$('#intent').value = JSON.stringify(intent, null, 2);
  }

  _toggleStats() {
    const panel = this.$('#statsPanel');
    const el = this._getTarget();

    if (panel.style.display === 'none') {
      const stats = this._gatherStats(el);
      panel.innerHTML = stats;
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
  }

  _gatherStats(el) {
    if (!el) return '<div>No target selected</div>';

    const isV4 = el.tagName.toLowerCase() === 'atlas-ui-v4';

    const registry = window.__ATLAS_REGISTRY__?.();
    const registryStats = registry?.getStats() || {};

    let html = '<div><strong>Component Version</strong></div>';
    html += `<div>${isV4 ? 'ATLAS UI v4.1 (ML Actions)' : 'ATLAS UI v3.0 (Thompson)'}</div>`;

    html += '<div style="margin-top:8px;"><strong>Registry</strong></div>';
    html += `<div>Components: ${registryStats.totalComponents || 0}</div>`;
    html += `<div>Capabilities: ${registryStats.capabilities || 0}</div>`;
    html += `<div>Contexts: ${registryStats.contexts || 0}</div>`;

    if (isV4) {
      const stats = el.getMLStats?.();
      if (stats) {
        html += '<div style="margin-top:8px;"><strong>ML Engine v4</strong></div>';
        html += `<div>ε: ${stats.dqnStats?.epsilon?.toFixed(3) || 'N/A'}</div>`;
        html += `<div>Buffer: ${stats.dqnStats?.bufferSize || 0}</div>`;
        html += `<div>Training Steps: ${stats.dqnStats?.trainingSteps || 0}</div>`;
        html += `<div>Avg Reward: ${stats.avgReward?.toFixed(3) || 0}</div>`;
      }
    } else {
      const bandit = el._policy?.bandit;
      if (bandit) {
        html += '<div style="margin-top:8px;"><strong>Bandit</strong></div>';
        html += `<div>α: ${bandit.alpha.toFixed(2)}</div>`;
        html += `<div>β: ${bandit.beta.toFixed(2)}</div>`;
        html += `<div>ε: ${bandit.eps.toFixed(2)}</div>`;
      }
    }

    const layout = el._lastLayout;
    if (layout) {
      html += '<div style="margin-top:8px;"><strong>Current Layout</strong></div>';
      html += `<div>Type: ${layout.structure?.type || 'N/A'}</div>`;
      html += `<div>Slots: ${layout.slots?.length || 0}</div>`;
      html += `<div>Grid: ${layout.grid?.cols || 0} cols</div>`;

      if (isV4 && layout.metadata?.mlAction !== undefined) {
        html += `<div>ML Action: ${layout.metadata.mlAction}</div>`;
      }
    }

    return html;
  }
}

customElements.define('atlas-control', AtlasControlPanel);
