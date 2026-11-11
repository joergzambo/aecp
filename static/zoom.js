/* AECP · Zoom für Netzplan-Grafiken.
   Jede größere SVG-Grafik (viewBox ≥ 300 breit) bekommt eine Leiste mit − / Regler / + / ↺.
   Die Grafik wird in einem scrollbaren Rahmen vergrößert. Zeichnet eine Seite die Grafik neu,
   bleibt die Zoomstufe erhalten (sie hängt am Elternelement). */
(function () {
  'use strict';
  var MIN = 50, MAX = 300, STEP = 25;
  var css = '.aecp-zoom{margin:0 0 4px}' +
    '.aecp-zbar{display:flex;align-items:center;gap:6px;justify-content:flex-end;font:600 13px "Bitter",Georgia,serif;color:#546e7a;margin:2px 0 4px}' +
    '.aecp-zbar button{width:30px;height:28px;border:1.5px solid #90a4ae;border-radius:4px;background:#fff;color:#1c2b33;cursor:pointer;font:700 16px/1 Arial,sans-serif;padding:0}' +
    '.aecp-zbar button:hover{background:#f3f5f7}' +
    '.aecp-zbar input{width:120px;accent-color:#61a229}' +
    '.aecp-zbar output{min-width:3.4em;text-align:right;font-variant-numeric:tabular-nums}' +
    '.aecp-zscroll{overflow:auto;max-width:100%}' +
    '.aecp-zscroll>svg{width:calc(var(--z,1)*100%)!important;max-width:none!important;height:auto}' +
    '@media print{.aecp-zbar{display:none}.aecp-zscroll>svg{width:100%!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function vbWidth(svg) { var v = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/); return v.length === 4 ? +v[2] : 0; }
  function candidate(svg) {
    if (!svg.parentNode || svg.closest('.aecp-zscroll,.aecp-zbar,button,.nozoom,header,footer')) return false;
    return vbWidth(svg) >= 300;
  }
  function setZ(wrap, z) {
    z = Math.max(MIN, Math.min(MAX, Math.round(z)));
    var sc = wrap.querySelector('.aecp-zscroll'), out = wrap.querySelector('output'), rg = wrap.querySelector('input');
    var old = parseFloat(sc.style.getPropertyValue('--z')) || 1, cx = sc.scrollLeft + sc.clientWidth / 2, cy = sc.scrollTop + sc.clientHeight / 2;
    sc.style.setProperty('--z', z / 100);
    /* Mitte beibehalten */
    var f = (z / 100) / old; sc.scrollLeft = cx * f - sc.clientWidth / 2; sc.scrollTop = cy * f - sc.clientHeight / 2;
    out.textContent = z + ' %'; rg.value = z;
    if (wrap.parentNode) wrap.parentNode.dataset.aecpZoom = z;
  }
  function wrap(svg) {
    var parent = svg.parentNode, z = +(parent.dataset.aecpZoom || 100);
    var w = document.createElement('div'); w.className = 'aecp-zoom';
    w.innerHTML = '<div class="aecp-zbar" role="group" aria-label="Zoom"><span aria-hidden="true">🔍</span>' +
      '<button type="button" data-z="-" aria-label="Verkleinern">−</button>' +
      '<input type="range" min="' + MIN + '" max="' + MAX + '" step="5" aria-label="Zoomstufe">' +
      '<button type="button" data-z="+" aria-label="Vergrößern">+</button><output></output>' +
      '<button type="button" data-z="0" aria-label="Zoom zurücksetzen" title="100 %">↺</button></div><div class="aecp-zscroll"></div>';
    parent.insertBefore(w, svg);
    w.querySelector('.aecp-zscroll').appendChild(svg);
    setZ(w, z);
  }
  function scan(root) {
    var list = (root.querySelectorAll ? root.querySelectorAll('svg') : []);
    for (var i = 0; i < list.length; i++) if (candidate(list[i])) wrap(list[i]);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.aecp-zbar button'); if (!b) return;
    var w = b.closest('.aecp-zoom'), cur = +w.querySelector('input').value;
    setZ(w, b.dataset.z === '+' ? cur + STEP : b.dataset.z === '-' ? cur - STEP : 100);
  });
  document.addEventListener('input', function (e) {
    var r = e.target.closest && e.target.closest('.aecp-zbar input'); if (r) setZ(r.closest('.aecp-zoom'), +r.value);
  });
  var pending = false;
  new MutationObserver(function () {
    if (pending) return; pending = true;
    (window.requestAnimationFrame || setTimeout)(function () { pending = false; scan(document.body); });
  }).observe(document.documentElement, {childList: true, subtree: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(document.body); });
  else scan(document.body);
})();
