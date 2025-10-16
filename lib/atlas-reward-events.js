
/**
 * atlas-reward-events.js
 * Minimal runtime helpers for collecting basic UI events (click/scroll/dwell)
 * and computing a simple per-domain reward.
 *
 * Safe to include in demo or prod. Does nothing unless you call wireBasicEvents().
 */
(function () {
  const g = (window.ATLAS_EVENTS = window.ATLAS_EVENTS || {});
  let wired = false;
  let dwellStart = 0;
  let maxScroll = 0;

  function now() { return Date.now(); }

  function record(type, payload) {
    const evt = Object.assign({ type, ts: now() }, payload || {});
    const c = window.ATLAS_COLLECTOR || window.ATLAS_COLLECTOR_API || window.Collector || {};
    if (typeof c.recordEvent === 'function') {
      try { c.recordEvent(evt); } catch (e) { console.warn('[ATLAS_EVENTS] recordEvent error', e); }
    } else if (window.ATLAS_METRICS_COLLECTOR?.recordEvent) {
      try { window.ATLAS_METRICS_COLLECTOR.recordEvent(evt); } catch (e) { console.warn('[ATLAS_EVENTS] recordEvent error', e); }
    } else {
      // fallback: keep a local ring buffer in memory
      const buf = (g._buffer = g._buffer || []);
      buf.push(evt); if (buf.length > 1000) buf.shift();
      console.debug('[ATLAS_EVENTS] buffered', evt);
    }
  }

  function onClick(e) {
    const el = e.target.closest('[data-atlas-component]');
    if (!el) return;
    const id = el.getAttribute('data-atlas-component') || el.id || el.tagName.toLowerCase();
    record('click', { componentId: id });
  }

  function onScroll() {
    const h = document.documentElement;
    const d = (h.scrollTop) / Math.max(1, (h.scrollHeight - h.clientHeight));
    if (d > maxScroll) maxScroll = d;
  }

  function onUnload() {
    const dwell = (performance.now() - dwellStart) / 1000;
    record('session-end', { dwell, maxScroll });
  }

  g.wireBasicEvents = function wireBasicEvents() {
    if (wired) return;
    wired = true;
    dwellStart = performance.now();
    maxScroll = 0;
    document.addEventListener('click', onClick);
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeunload', onUnload);
    console.log('[ATLAS_EVENTS] basic events wired');
  };

  function norm01(x, lo, hi){ return Math.max(0, Math.min(1, (x - lo) / (hi - lo))); }

  g.computeReward = function computeReward(domain, m) {
    // m = { ctr, conversion, dwellSec, scrollDepth } — normalized upstream or raw
    switch (domain) {
      case 'dashboard':
        return 0.5*(m.ctr||0) + 0.3*(m.conversion||0) + 0.2*norm01(m.dwellSec||0, 5, 60);
      case 'blog':
        return 0.6*norm01(m.scrollDepth||0, 0.2, 0.9) + 0.2*(m.ctr||0) + 0.2*norm01(m.dwellSec||0, 10, 120);
      case 'ecommerce':
        return 0.6*(m.conversion||0) + 0.2*(m.ctr||0) + 0.2*norm01(m.dwellSec||0, 5, 60);
      default:
        return (m.ctr||0);
    }
  };

  // Utility: expose a quick manual trigger for tests
  g._debugTriggerSessionEnd = function(){
    onUnload();
  };
})();
