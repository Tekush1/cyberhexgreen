/* Runs before the app. Kept as a file (not inline) so the Content-Security-Policy can forbid inline scripts. */
(function () {
  // If a site file from an older version fails to load (a new version was deployed
  // while this tab was open), reload once to get the new one.
  var K = 'cyberhx-chunk-reload-at';
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t === window) return;
    var u = t.src || t.href || '';
    if ((t.tagName === 'SCRIPT' || t.tagName === 'LINK') && u.indexOf('/assets/') > -1) {
      try {
        var l = +sessionStorage.getItem(K) || 0;
        if (Date.now() - l < 30000) return;
        sessionStorage.setItem(K, String(Date.now()));
      } catch (x) { /* storage blocked */ }
      location.reload();
    }
  }, true);

  // Load web fonts without blocking the first paint (replaces onload="this.media='all'").
  function fonts() {
    var links = document.querySelectorAll('link[data-async-css]');
    for (var i = 0; i < links.length; i++) links[i].media = 'all';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fonts);
  else fonts();
})();
