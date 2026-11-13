/* EURONICS eNPS Google Sheets Web App read-only connector. */
(function () {
  'use strict';
  const API = 'https://script.google.com/macros/s/AKfycbxvH_URd9YvwydrZe3mauz3a5cg7XcmCCwuhF3Du1HYIjii7winAqDvwWnAdvkXNr84mA/exec';
  let pending = false;
  let lastSuccess = 0;
  function score(p, d, n) { return n ? Math.round((p - d) / n * 10000) / 100 : null; }
  function refresh() {
    window.dispatchEvent(new Event('euronics:enps-updated'));
    if (typeof window.refreshExecOverview === 'function') window.refreshExecOverview();
  }
  function apply(payload) {
    if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
      window.EURONICS_ENPS_ERROR = (payload && payload.error) || 'eNPS API returned no accessible data';
      refresh(); return;
    }
    const records = payload.data.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '')));
    const periods = new Map();
    for (const r of records) {
      const date = String(r.date);
      const key = date.slice(0, 7);
      if (!periods.has(key)) periods.set(key, { date: key + '-01', promoters: 0, detractors: 0, total: 0 });
      const v = periods.get(key);
      const p = Number(r.promoters), d = Number(r.detractors), a = Number(r.passives);
      if (![p,d,a].every(n => Number.isSafeInteger(n) && n >= 0)) continue;
      v.promoters += p; v.detractors += d; v.total += p + d + a;
    }
    window.EURONICS_ENPS_HISTORY = [...periods.values()].sort((a,b) => a.date.localeCompare(b.date)).map(r => ({ date:r.date, segment:'all', value:score(r.promoters,r.detractors,r.total) })).filter(r => r.value !== null);
    window.EURONICS_ENPS_LIVE = payload;
    window.EURONICS_ENPS_ERROR = '';
    lastSuccess = Date.now();
    refresh();
  }
  window.refreshENPSLive = function () {
    if (pending) return;
    pending = true;
    const callback = '__euronicsEnpsCallback_' + Date.now();
    const script = document.createElement('script');
    let done = false;
    const timer = setTimeout(() => finish('eNPS API timed out. Check Workspace sign-in and deployment access.'), 15000);
    function finish(error, data) {
      if (done) return;
      done = true; pending = false; clearTimeout(timer);
      delete window[callback]; script.remove();
      if (error) { window.EURONICS_ENPS_ERROR = error; refresh(); }
      else apply(data);
    }
    window[callback] = data => finish(null, data);
    script.onerror = () => finish('eNPS API unavailable. Confirm Web App permissions and signed-in Workspace access.');
    script.src = API + '?api=enps&callback=' + encodeURIComponent(callback) + '&_=' + Date.now();
    document.head.appendChild(script);
  };
  window.refreshENPSLive();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastSuccess > 5 * 60 * 1000) window.refreshENPSLive();
  });
})();
