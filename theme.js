/* Light/dark theme: runs in <head> so there is no flash. Dark is the default. */
(function () {
  var KEY = 'hai-theme', root = document.documentElement;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(t) { try { localStorage.setItem(KEY, t); } catch (e) {} }
  function isLight() { return root.getAttribute('data-theme') === 'light'; }
  function labels() {
    var l = isLight();
    [].forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (b) {
      b.setAttribute('aria-label', l ? 'Zum dunklen Modus wechseln' : 'Zum hellen Modus wechseln');
      b.setAttribute('aria-pressed', String(l));
    });
  }
  root.setAttribute('data-theme', stored() === 'light' ? 'light' : 'dark');
  /* Mobile menu: one handler for every page (button #menuBtn toggles #mobileMenu). */
  function wireMenu() {
    var b = document.getElementById('menuBtn'), m = document.getElementById('mobileMenu');
    if (!b || !m) return;
    function close() { m.classList.add('hidden'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'Menü öffnen'); }
    b.addEventListener('click', function () {
      var open = m.classList.toggle('hidden') === false;
      b.setAttribute('aria-expanded', String(open));
      b.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });
    [].forEach.call(m.querySelectorAll('a'), function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  document.addEventListener('DOMContentLoaded', function () {
    wireMenu();
    labels();
    [].forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (b) {
      b.addEventListener('click', function () {
        var t = isLight() ? 'dark' : 'light';
        root.setAttribute('data-theme', t); save(t); labels();
        document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
      });
    });
  });
})();
