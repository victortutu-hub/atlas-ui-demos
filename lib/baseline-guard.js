
// baseline-guard.js — drop-in local baseline tests (v2: robust item counting)
(function () {
  function ready(fn){ 
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function ensurePanel(){
    let panel = document.getElementById('baseline-guard-panel');
    if (panel) { panel.innerHTML=''; return panel; }
    panel = document.createElement('div');
    panel.id = 'baseline-guard-panel';
    Object.assign(panel.style, {
      position:'fixed', right:'12px', bottom:'12px', zIndex: 99999,
      background:'#0b1220', color:'#d6e2ff', border:'1px solid #2a3550',
      borderRadius:'12px', padding:'12px 12px', width:'380px',
      fontFamily:'ui-sans-serif, system-ui, Segoe UI, Roboto',
      boxShadow:'0 8px 30px rgba(0,0,0,.35)'
    });
    document.body.appendChild(panel);
    return panel;
  }

  function line(container, msg, ok){
    const row = document.createElement('div');
    row.textContent = (ok?'✅ ':'❌ ') + msg;
    row.style.margin = '4px 0';
    row.style.color = ok ? '#9FE88D' : '#FF8A8A';
    row.style.fontSize = '13px';
    container.appendChild(row);
    return ok;
  }

  function hr(container,label){
    const d = document.createElement('div');
    d.style.margin='8px 0 6px';
    d.style.borderTop='1px dashed #334';
    const l = document.createElement('div');
    l.textContent = label;
    l.style.fontSize='11px';
    l.style.letterSpacing='.06em';
    l.style.opacity='.75';
    l.style.margin='6px 0 2px';
    container.appendChild(d); container.appendChild(l);
  }

  function within(x, lo, hi){ return (lo==null || x>=lo) && (hi==null || x<=hi); }

  function countBySlots(L, rx){
    return (L.slots||[]).filter(s=>{
      const id = [s.component,s.type,s.kind,s.role].filter(Boolean).join(':').toLowerCase();
      return rx.test(id);
    }).length;
  }

  function countByRegions(L, rxName){
    return (L.structure?.regions||[]).filter(r=>{
      const id = [r.name, r.role, r.type].filter(Boolean).join(':').toLowerCase();
      return rxName.test(id);
    }).length;
  }

  function readItems(L, kind){
    const m = L.metadata || {};
    const v = m.variations || {};
    const fromVar = v?.[`${kind}Count`];
    if (Number.isFinite(fromVar)) return fromVar;
    const fromMeta = m?.[`${kind}Count`];
    if (Number.isFinite(fromMeta)) return fromMeta;

    switch(kind){
      case 'kpi': {
        const rxName = /(^|:)\s*kpi(\-\d+)?\s*(\:|$)|metric|stat/;
        const n = countByRegions(L, rxName) || countBySlots(L, /kpi|metric|stat/);
        return n;
      }
      case 'article': {
        const n = countBySlots(L, /article|post|entry|story|content-card|content/);
        return n;
      }
      case 'product': {
        const n = countBySlots(L, /product|sku|item|tile|price|thumb|card/);
        return n;
      }
      default: return 0;
    }
  }

  function determinism(gen, intent, action){
    const pick = L => JSON.stringify({
      structure: L.structure?.type,
      cols: L.grid?.cols,
      slots: L.slots?.length,
      meta: {
        kpi: readItems(L,'kpi'),
        article: readItems(L,'article'),
        product: readItems(L,'product')
      }
    });
    const L1 = gen.generate(intent, action);
    const L2 = gen.generate(intent, action);
    return pick(L1) === pick(L2);
  }

  async function ensureGenerator(){
    if (typeof window.getLayoutGenerator === 'function') return window.getLayoutGenerator;
    const candidates = ['./src/atlas-layout-generator.js','./atlas-layout-generator.js'];
    for (const p of candidates){
      try {
        const mod = await import(p);
        if (mod?.getLayoutGenerator) {
          window.getLayoutGenerator = mod.getLayoutGenerator;
          return mod.getLayoutGenerator;
        }
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  async function run(){
    const panel = ensurePanel();
    const header = document.createElement('div');
    header.style.display='flex';
    header.style.alignItems='center';
    header.style.justifyContent='space-between';
    header.style.marginBottom='8px';
    header.innerHTML = '<strong>🧪 Baseline Guard</strong><button id="bg-close" style="all:unset;cursor:pointer;font-size:18px;line-height:1">×</button>';
    panel.appendChild(header);
    header.querySelector('#bg-close').onclick = () => panel.remove();

    const out = document.createElement('div');
    panel.appendChild(out);

    const getGen = await ensureGenerator();
    if (!getGen){
      line(out, 'Nu găsesc getLayoutGenerator(). Încearcă să expui funcția pe window sau deschide o pagină ATLAS.', false);
      return;
    }
    const gen = getGen();

    const intents = {
      dashboard: {domain:'dashboard', goal:'kpi-focus', density:'medium', device:'desktop'},
      blog:      {domain:'blog', goal:'content-focus', density:'medium', device:'desktop'},
      ecommerce: {domain:'ecommerce', goal:'browse', density:'medium', device:'desktop'}
    };

    const cases = [
      ['dashboard', 0, [2,2, 3,6, 1,4],  'kpi'],
      ['dashboard', 8, [3,5, 8,12, 6,10], 'kpi'],
      ['blog',      0, [1,3, null,null, 1,3], 'article'],
      ['blog',      6, [2,4, null,null, 6,8], 'article'],
      ['ecommerce', 0, [3,4, null,null, 3,4], 'product'],
      ['ecommerce', 8, [3,5, null,null,10,12], 'product'],
    ];

    hr(out,'Mapping & bounds');
    let allOK = true;

    for (const [dom, act, b, kind] of cases){
      const intent = intents[dom];
      const L = gen.generate(intent, act);
      const cols  = L.grid?.cols ?? 0;
      const slots = L.slots?.length ?? 0;
      const items = readItems(L, kind);

      const okCols  = within(cols,  b[0], b[1]);
      const okSlots = within(slots, b[2], b[3]);
      const okItems = within(items, b[4], b[5]);

      allOK &= line(out, `${dom} a${act} — cols=${cols} in [${b[0]}..${b[1]}]`, okCols);
      if (b[2]!=null) allOK &= line(out, `${dom} a${act} — slots=${slots} in [${b[2]}..${b[3]}]`, okSlots);
      allOK &= line(out, `${dom} a${act} — ${kind}=${items} in [${b[4]}..${b[5]}]`, okItems);
    }

    hr(out,'Determinism');
    allOK &= line(out, `dashboard a6 — layout determinist`, determinism(gen, intents.dashboard, 6));

    hr(out,'Status');
    line(out, allOK ? 'Baseline Guard: PASS' : 'Baseline Guard: FAIL', allOK);
    try { localStorage.setItem('baseline-guard:last', JSON.stringify({ at: Date.now(), pass: !!allOK })); } catch(e){}
  }

  ready(function(){
    const btn = document.createElement('button');
    btn.textContent = '🧪 Baseline Guard';
    Object.assign(btn.style, {
      position:'fixed', right:'12px', bottom:'12px', zIndex: 99998,
      background:'#1b2640', color:'#d6e2ff', border:'1px solid #2a3550',
      borderRadius:'999px', padding:'10px 14px', cursor:'pointer',
      fontFamily:'ui-sans-serif, system-ui, Segoe UI, Roboto'
    });
    btn.onclick = () => run();
    document.body.appendChild(btn);
  });
})();
