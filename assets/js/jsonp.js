/* ================================================================
   Raceup Hub — JSONP helper
   Workaround for Apps Script Web App CORS limitation
   ================================================================
   Apps Script Web App returns JSON without CORS headers, so browsers
   block fetch() from raceup-hub.pages.dev. Solution: load as <script>
   tag with ?callback=... → Apps Script wraps response as callback(...)
   ================================================================ */

window.JSONP = window.JSONP || {};

/**
 * Call a JSONP endpoint
 * @param {string} url - base URL (without callback)
 * @param {object} params - URL parameters
 * @param {number} timeout - ms, default 15000
 * @returns {Promise<any>}
 */
window.JSONP.call = function(url, params, timeout) {
  return new Promise((resolve, reject) => {
    const callbackName = 'JSONP_cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout (' + (timeout || 15000) + 'ms)'));
    }, timeout || 15000);

    function cleanup() {
      delete window[callbackName];
      const s = document.getElementById(callbackName);
      if (s) s.remove();
      clearTimeout(timer);
    }

    window[callbackName] = function(data) {
      cleanup();
      if (data && data.error) reject(new Error(data.error));
      else resolve(data);
    };

    // Build URL
    const u = new URL(url);
    if (params) {
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null) {
          u.searchParams.set(k, params[k]);
        }
      });
    }
    u.searchParams.set('callback', callbackName);

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = u.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };
    document.body.appendChild(script);
  });
};

/* ================================================================
   JSONP SWR — Stale-While-Revalidate caching for JSONP calls
   Returns cached data instantly (if any), refreshes in background.
   ================================================================ */
window.JSONP._SWR_PREFIX = 'jsonp_swr_v1_';

window.JSONP.callSWR = function(url, params, options) {
  options = options || {};
  const maxAge = options.maxAgeMs || 300000; // 5 min default
  const userTag = (window.RACEUP_USER && window.RACEUP_USER.email) || '';
  const key = window.JSONP._SWR_PREFIX + url + '_' + JSON.stringify(params || {}) + '__' + userTag;

  const freshPromise = window.JSONP.call(url, params, options.timeoutMs).then(function(fresh) {
    try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: fresh })); }
    catch (e) {}
    return fresh;
  });

  let cached = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && obj.data !== undefined) cached = obj;
    }
  } catch (e) {}

  return new Promise(function(resolve) {
    let resolved = false;
    if (cached) {
      const age = Date.now() - (cached.ts || 0);
      if (age < maxAge) {
        resolve({ data: cached.data, fromCache: true, age: age });
        resolved = true;
        freshPromise.then(function(fresh) {
          if (options.onRefresh) {
            try { options.onRefresh(fresh); } catch (e) {}
          }
        }).catch(function(err) { console.warn('JSONP SWR bg refresh failed:', err); });
        return;
      }
    }
    freshPromise.then(function(fresh) {
      if (!resolved) resolve({ data: fresh, fromCache: false });
    }).catch(function(err) {
      if (!resolved) {
        if (cached) resolve({ data: cached.data, fromCache: true, stale: true, error: err });
        else resolve({ data: null, fromCache: false, error: err });
      }
    });
  });
};
