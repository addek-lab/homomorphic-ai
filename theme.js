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
  /* Aufklappmenüs im Header (Desktop): Hover + Klick + Tastatur, Esc schließt. */
  function wireDropdowns() {
    var menus = [].slice.call(document.querySelectorAll('[data-menu]'));
    if (!menus.length) return;
    var hoverOK = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches), timers = new Map();
    function btn(m) { return m.querySelector('button'); }
    function setOpen(m, open) {
      btn(m).setAttribute('aria-expanded', String(open));
      var p = m.querySelector('.navpanel');
      if (open) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
    }
    function closeAll(except) { menus.forEach(function (m) { if (m !== except) setOpen(m, false); }); }
    menus.forEach(function (m) {
      btn(m).addEventListener('click', function () {
        var open = btn(m).getAttribute('aria-expanded') !== 'true';
        closeAll(m);
        setOpen(m, hoverOK ? true : open);
      });
      if (hoverOK) {
        m.addEventListener('mouseenter', function () { clearTimeout(timers.get(m)); closeAll(m); setOpen(m, true); });
        m.addEventListener('mouseleave', function () { timers.set(m, setTimeout(function () { setOpen(m, false); }, 160)); });
      }
      m.addEventListener('focusout', function (e) { if (!e.relatedTarget || !m.contains(e.relatedTarget)) setOpen(m, false); });
      [].forEach.call(m.querySelectorAll('.navpanel a'), function (a) { a.addEventListener('click', function () { setOpen(m, false); }); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      menus.forEach(function (m) { if (btn(m).getAttribute('aria-expanded') === 'true') { setOpen(m, false); btn(m).focus(); } });
    });
    document.addEventListener('click', function (e) { menus.forEach(function (m) { if (!m.contains(e.target)) setOpen(m, false); }); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireMenu();
    wireDropdowns();
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
