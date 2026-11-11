/* AECP · DHCP und ip helper-address. Nutzt die Topologien von routing.js (RT).
   Browser: window.DH · Node: globalThis.DH */
(function (G) {
'use strict';
var RT = G.RT;
var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function ip2n(ip) { return ip.split('.').reduce(function (a, b) { return a * 256 + (+b); }, 0); }
function n2ip(n) { return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.'); }
function maskTxt(p) { return n2ip(4294967296 - Math.pow(2, 32 - p)); }
function gw(lan) { return n2ip(ip2n(lan.net) + 1); }

/* Interfaces eines Routers: Kabel zu Nachbarn + LAN */
function ifaces(T, i) {
  var o = [];
  T.links.forEach(function (l, k) {
    if (l.a === i) o.push({r: i, ifn: l.ifA, ip: l.ipA, kind: 'link', link: k, to: l.b});
    if (l.b === i) o.push({r: i, ifn: l.ifB, ip: l.ipB, kind: 'link', link: k, to: l.a});
  });
  var r = T.routers[i];
  if (r.lans.length) o.push({r: i, ifn: r.lanIf, ip: gw(r.lans[0]), kind: 'lan'});
  return o;
}
function key(x) { return x.r + ':' + x.ifn; }

/* Rand für Server/Clients über und unter den Switches */
function pad(T, m) {
  T.routers.forEach(function (r) { r.y += m; if (r.sw) r.sw.y += m; });
  T.H += 2 * m;
}
/* Aufgabe: Server in einem LAN (L/M) oder ein Router als DHCP-Server (S, manchmal M) */
function makeTask(seed, lvl) {
  lvl = String(lvl).toUpperCase();
  if (!LVCODE[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 600; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003 + 424242) >>> 0);
    var T = RT.makeTask(Math.floor(r() * 90000) + 1, lvl);
    if (!T || !T.routers.every(function (x) { return x.lans.length === 1; })) continue;
    var n = T.routers.length, srv = Math.floor(r() * n), mode = lvl === 'S' ? (r() < 0.5 ? 'router' : 'host') : lvl === 'M' && r() < 0.25 ? 'router' : 'host';
    pad(T, 56);
    var D = {T: T, mode: mode, srv: srv, code: lvl + '-' + seed, level: lvl};
    if (mode === 'host') {
      var lan = T.routers[srv].lans[0], hostPart = pick(r, [10, 50, 100, 200, 250]);
      if (lan.p > 24) continue;
      D.srvIp = n2ip(ip2n(lan.net) + hostPart);
      D.targets = [D.srvIp];
    } else {
      D.srvIp = null;
      D.targets = ifaces(T, srv).map(function (x) { return x.ip; });
    }
    /* Helper gehört an jedes LAN-Interface mit Clients, außer am LAN des Servers bzw. am DHCP-Router selbst */
    D.need = {};
    T.routers.forEach(function (rt, i) { if (i !== srv) D.need[i + ':' + rt.lanIf] = 1; });
    /* Pool-Frage für ein Client-LAN */
    var clients = T.routers.map(function (x, i) { return i; }).filter(function (i) { return i !== srv || mode === 'router'; });
    D.poolR = pick(r, clients);
    var pl = T.routers[D.poolR].lans[0];
    D.pool = {net: pl.net, p: pl.p, mask: maskTxt(pl.p), gw: gw(pl)};
    return D;
  }
  return null;
}

/* Overlay: Server/Clients, Gateway-IPs der LANs, anklickbare Interface-Punkte */
function overlay(D, opts) {
  opts = opts || {};
  var T = D.T, h = '', sel = opts.sel || {}, res = opts.res;
  T.routers.forEach(function (rt, i) {
    if (!rt.sw) return;
    /* unter bzw. über der Netz-Beschriftung weiterstapeln (wie in routing.js) */
    var up = rt.sw.y < rt.y, n = rt.lans.length, base = up ? rt.sw.y - 18 - 16 * (n - 1) : rt.sw.y + 30, dir = up ? -1 : 1;
    var isSrv = D.mode === 'host' && i === D.srv, y1 = up ? base - 16 : base + 16;
    h += txt(rt.sw.x, y1, isSrv ? 'DHCP-Server ' + D.srvIp : 'Gateway ' + gw(rt.lans[0]), {fs: 11.5, c: isSrv ? '#2e7d32' : '#546e7a', w: isSrv ? 700 : 400, mono: !isSrv ? 0 : 0});
    var iy = up ? y1 - 30 : y1 + 26;
    h += '<g transform="translate(' + rt.sw.x + ' ' + iy + ')">' + (isSrv ? SERVER : CLIENTS) + '</g>';
  });
  if (opts.clickable) T.routers.forEach(function (rt, i) {
    ifaces(T, i).forEach(function (f) {
      var to = f.kind === 'lan' ? rt.sw : T.routers[f.to], dx = to.x - rt.x, dy = to.y - rt.y, L = Math.hypot(dx, dy), d = f.kind === 'lan' ? L * 0.72 : 44;
      var x = rt.x + dx / L * d, y = rt.y + dy / L * d, k = key(f), on = !!sel[k];
      var col = res ? (on && D.need[k] ? '#2e7d32' : on ? '#c62828' : D.need[k] ? '#2e7d32' : '#90a4ae') : on ? '#1c2b33' : '#78909c';
      h += '<g class="ifck" data-if="' + k + '" tabindex="0" role="checkbox" aria-checked="' + on + '" aria-label="' + rt.name + ' ' + f.ifn + '">' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="14" fill="transparent"/>' +
        '<rect x="' + (x - 9).toFixed(1) + '" y="' + (y - 9).toFixed(1) + '" width="18" height="18" rx="3" fill="' + (on ? col : '#fff') + '" stroke="' + col + '" stroke-width="2"' + (res && !on && D.need[k] ? ' stroke-dasharray="4 3"' : '') + '/>' +
        (on ? '<path d="M' + (x - 5).toFixed(1) + ' ' + y.toFixed(1) + 'l3.5 3.5 6.5-7.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>' : '') + '</g>';
    });
  });
  return h;
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function txt(x, y, s, o) {
  return '<text x="' + Math.round(x) + '" y="' + Math.round(y) + '" text-anchor="middle" font-size="' + (o.fs || 12) + '" font-family="' + (o.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'Open Sans,Arial,sans-serif') + '"' + (o.w ? ' font-weight="' + o.w + '"' : '') + ' fill="' + (o.c || '#1c2b33') + '" stroke="#fff" stroke-width="3.5" paint-order="stroke">' + esc(s) + '</text>';
}
var SERVER = '<rect x="-12" y="-20" width="24" height="38" rx="2" fill="#2e7d32"/><path d="M-8 -13h16M-8 -6h16M-8 1h16" stroke="#c8e6c9" stroke-width="2"/><circle cx="5" cy="11" r="2" fill="#c8e6c9"/>';
var CLIENTS = '<g transform="translate(-9 -4)"><rect x="-10" y="-10" width="20" height="14" rx="1.5" fill="#2f7392"/><rect x="-8" y="-8" width="16" height="10" fill="#d8ecf5"/><rect x="-6" y="5" width="12" height="3" fill="#2f7392"/></g>' +
  '<g transform="translate(9 4)"><rect x="-10" y="-10" width="20" height="14" rx="1.5" fill="#2f7392"/><rect x="-8" y="-8" width="16" height="10" fill="#d8ecf5"/><rect x="-6" y="5" width="12" height="3" fill="#2f7392"/></g>';

function draw(D, opts) {
  var hl = {}; if (D.mode === 'router') { hl.routers = {}; hl.routers[D.srv] = 1; }
  var svg = RT.draw(D.T, {hl: hl});
  /* Platz für Server/Clients neben den Switches schaffen */
  return svg.replace('</svg>', overlay(D, opts) + '</svg>');
}

/* ---------- Prüfen ---------- */
function gradeIf(D, sel) {
  var ok = 0, wrong = [], missing = [];
  Object.keys(sel).forEach(function (k) { if (sel[k]) { if (D.need[k]) ok++; else wrong.push(k); } });
  Object.keys(D.need).forEach(function (k) { if (!sel[k]) missing.push(k); });
  return {ok: ok, wrong: wrong, missing: missing, solved: !wrong.length && !missing.length};
}
function explainIf(D, k) {
  var p = k.split(':'), r = +p[0], ifn = p[1], T = D.T, rt = T.routers[r], f = ifaces(T, r).filter(function (x) { return x.ifn === ifn; })[0];
  if (D.need[k]) return rt.name + ' ' + ifn + ': Hier kommen die Broadcasts der Clients an – hier gehört ip helper-address hin.';
  if (f.kind === 'link') return rt.name + ' ' + ifn + ' führt zu einem anderen Router. Dort kommen keine DHCP-Broadcasts von Clients an.';
  if (D.mode === 'host') return rt.name + ' ' + ifn + ': In diesem LAN steht der DHCP-Server selbst – die Clients erreichen ihn direkt per Broadcast.';
  return rt.name + ' ist selbst der DHCP-Server – Broadcasts in seinem eigenen LAN beantwortet er direkt.';
}
function checkTarget(D, v) {
  v = String(v || '').trim();
  if (!v) return {ok: false, empty: true};
  if (D.targets.indexOf(v) >= 0) return {ok: true, msg: D.mode === 'router' ? 'Richtig – eine IP des DHCP-Routers (am üblichsten die des Interfaces, das zu den Clients zeigt).' : ''};
  var T = D.T, msg = 'stimmt nicht';
  var gws = T.routers.map(function (x) { return gw(x.lans[0]); });
  var all = []; T.links.forEach(function (l) { all.push(l.ipA, l.ipB); });
  if (/255$/.test(v)) msg = 'Das ist eine Broadcast-Adresse. Der Helper macht aus dem Broadcast gerade einen Unicast an den Server.';
  else if (D.mode === 'host' && v === gw(T.routers[D.srv].lans[0])) msg = 'Das ist das Gateway im Server-LAN, nicht der Server selbst. Ziel ist die IP des DHCP-Servers.';
  else if (gws.indexOf(v) >= 0) msg = 'Das ist ein Gateway eines Client-LANs. Hinter ip helper-address steht die IP des DHCP-Servers.';
  else if (all.indexOf(v) >= 0) msg = 'Das ist eine Router-IP auf dem Weg. Der Helper braucht das Ziel ganz am Ende: den DHCP-Server.';
  return {ok: false, msg: msg};
}

/* Konfiguration als Text */
function helperCfg(D) {
  var T = D.T, out = [];
  Object.keys(D.need).forEach(function (k) {
    var p = k.split(':'), rt = T.routers[+p[0]];
    out.push({r: rt.name, lines: ['interface ' + p[1], ' ip helper-address ' + D.targets[D.mode === 'router' ? helperTargetIdx(D, +p[0]) : 0]]});
  });
  return out.sort(function (a, b) { return a.r < b.r ? -1 : 1; });
}
/* für die Musterlösung bei Router-Server: die Interface-IP, die zum Client-Router zeigt (erster Hop) */
function helperTargetIdx(D, from) {
  var T = D.T, list = ifaces(T, D.srv), best = 0;
  var path = RT.routes(T, from).filter(function (x) { return x.net === T.routers[D.srv].lans[0].net; })[0];
  if (path && path.path.length >= 2) {
    var prev = path.path[path.path.length - 2];
    list.forEach(function (f, i) { if (f.kind === 'link' && f.to === prev) best = i; });
  }
  return best;
}
function serverCfg(D) {
  var T = D.T, lines = [];
  T.routers.forEach(function (rt, i) {
    if (D.mode === 'host' && i === D.srv) return;
    var l = rt.lans[0];
    lines.push('ip dhcp excluded-address ' + gw(l));
    lines.push('ip dhcp pool LAN-' + rt.name, ' network ' + l.net + ' ' + maskTxt(l.p), ' default-router ' + gw(l), ' dns-server 8.8.8.8');
  });
  return lines;
}

G.DH = {LVNAME: LVNAME, makeTask: makeTask, draw: draw, ifaces: ifaces, gradeIf: gradeIf, explainIf: explainIf, checkTarget: checkTarget, helperCfg: helperCfg, serverCfg: serverCfg, gw: gw, maskTxt: maskTxt, ip2n: ip2n, n2ip: n2ip};
})(typeof window !== 'undefined' ? window : globalThis);
