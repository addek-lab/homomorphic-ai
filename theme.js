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
  document.addEventListener('DOMContentLoaded', function () {
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
