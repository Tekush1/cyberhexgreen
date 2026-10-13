/* Safety net for the start-up loader; the app hides it once it paints. */
(function () {
  var loader = document.getElementById('loader');
  if (!loader) return;
  function hide() { setTimeout(function () { loader.style.display = 'none'; }, 400); }
  function done() { document.body.classList.add('loaded'); hide(); }
  new MutationObserver(function (m, o) {
    if (document.body.classList.contains('loaded')) { o.disconnect(); hide(); }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  setTimeout(done, 4000);
})();
