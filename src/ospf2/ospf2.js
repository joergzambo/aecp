/* NWT · OSPF 2: Router-ID, DR/BDR-Wahl, Nachbarzustände, Kosten mit Referenzbandbreite. Aufgaben-Generator, Zeichnen.
   Browser: window.O2 · Node: globalThis.O2 */
(function (G) {
'use strict';
var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function ipn(ip) { return ip.split('.').reduce(function (a, b) { return a * 256 + (+b); }, 0); }
function maxIp(list) { return list.reduce(function (m, x) { return m === null || ipn(x) > ipn(m) ? x : m; }, null); }

/* Interface-Typen und Bandbreite in Mbit/s */
var IFT = {Fa: {full: 'FastEthernet', bw: 100}, Gi: {full: 'GigabitEthernet', bw: 1000}, Te: {full: 'TenGigabitEthernet', bw: 10000}};
function cost(ref, bw) { return Math.max(1, Math.floor(ref / bw)); }

/* Router-ID: 1. router-id-Befehl, 2. höchste Loopback-IP, 3. höchste IP eines aktiven Interfaces */
function rid(R) {
  if (R.cmd) return {id: R.cmd, how: 'cmd'};
  if (R.loops.length) return {id: maxIp(R.loops), how: 'loop'};
  return {id: maxIp([R.segIp].concat(R.other ? [R.other] : [])), how: 'if'};
}
/* Wahl auf dem Segment. Router mit late=true kommen erst nach der Wahl dazu (keine Übernahme). */
function better(a, b) { return a.prio !== b.prio ? a.prio > b.prio : ipn(a.rid) > ipn(b.rid); }
function elect(rs) {
  var list = rs.map(function (R, i) { return {i: i, prio: R.prio, rid: rid(R).id, late: !!R.late}; });
  var el = list.filter(function (x) { return !x.late && x.prio > 0; }).sort(function (a, b) { return better(a, b) ? -1 : 1; });
  var dr = el.length ? el[0].i : -1, bdr = el.length > 1 ? el[1].i : -1;
  /* Kommt ein später Router dazu und es fehlt noch ein BDR, wird er BDR (falls wählbar) */
  if (bdr < 0) { var lt = list.filter(function (x) { return x.late && x.prio > 0; }).sort(function (a, b) { return better(a, b) ? -1 : 1; }); if (lt.length) { if (dr < 0) { dr = lt[0].i; bdr = lt.length > 1 ? lt[1].i : -1; } else bdr = lt[0].i; } }
  return {dr: dr, bdr: bdr, role: rs.map(function (_, i) { return i === dr ? 'DR' : i === bdr ? 'BDR' : 'DROTHER'; })};
}
/* Zustand in "show ip ospf neighbor" von Router x für Nachbar y */
function nbState(E, x, y) {
  var full = E.role[x] !== 'DROTHER' || E.role[y] !== 'DROTHER';
  return (full ? 'FULL/' : '2WAY/') + E.role[y];
}

/* ---------- Generator ---------- */
function build(r, lvl) {
  var n = lvl === 'L' ? 3 : lvl === 'M' ? 4 : ri(r, 5, 6);
  var segPfx = pick(r, ['192.168.' + ri(r, 1, 250) + '.', '10.' + ri(r, 1, 200) + '.' + ri(r, 0, 255) + '.', '172.16.' + ri(r, 0, 31) + '.']);
  var hosts = shuffle(r, Array.from({length: 250}, function (_, i) { return i + 1; })).slice(0, n);
  var ref = lvl === 'L' ? pick(r, [100, 100, 1000]) : pick(r, [100, 1000, 10000, 10000]);
  var used = {};
  function uniq(gen) { for (var k = 0; k < 50; k++) { var v = gen(); if (!used[v]) { used[v] = 1; return v; } } return null; }
  var rs = [];
  for (var i = 0; i < n; i++) {
    var R = {name: 'R' + (i + 1), segIp: segPfx + hosts[i], prio: 1, loops: [], cmd: null, late: false, ospfCost: null};
    used[R.segIp] = 1;
    R.type = lvl === 'L' ? 'Gi' : pick(r, ['Fa', 'Gi', 'Gi', 'Te']);
    R.other = uniq(function () { return '10.' + ri(r, 1, 250) + '.' + ri(r, 0, 255) + '.1'; });
    var mode = lvl === 'L' ? pick(r, ['cmd', 'loop']) : pick(r, ['cmd', 'loop', 'loop', 'if']);
    if (mode === 'cmd') { R.cmd = uniq(function () { var k = ri(r, 1, 9); return k + '.' + k + '.' + k + '.' + k; }); if (r() < 0.4) R.loops.push(uniq(function () { return '172.31.' + ri(r, 0, 255) + '.' + ri(r, 1, 254); })); }
    if (mode === 'loop') { var nl = lvl === 'S' ? ri(r, 1, 2) : 1; for (var k = 0; k < nl; k++) R.loops.push(uniq(function () { return pick(r, [ri(r, 1, 9) + '.' + ri(r, 1, 9) + '.' + ri(r, 1, 9) + '.' + ri(r, 1, 9), '172.31.' + ri(r, 0, 255) + '.' + ri(r, 1, 254)]); })); }
    if (R.loops.indexOf(null) >= 0 || !R.other || (mode === 'cmd' && !R.cmd)) return null;
    if (lvl !== 'L' || r() < 0.5) R.prio = pick(r, lvl === 'L' ? [1, 1, 10, 100] : [0, 1, 1, 1, 5, 10, 50, 100, 255]);
    if (lvl === 'S' && r() < 0.25) R.ospfCost = ri(r, 2, 50);
    rs.push(R);
  }
  /* Router-IDs müssen eindeutig sein */
  var ids = rs.map(function (R) { return rid(R).id; });
  if (ids.some(function (x, k) { return ids.indexOf(x) !== k; })) return null;
  /* Schwer: oft startet ein Router später – und wäre eigentlich der beste */
  if (lvl === 'S' && r() < 0.6) {
    var best = rs.slice().filter(function (R) { return R.prio > 0; }).sort(function (a, b) { return better({prio: a.prio, rid: rid(a).id}, {prio: b.prio, rid: rid(b).id}) ? -1 : 1; })[0];
    if (best) best.late = true;
  }
  return {rs: rs, ref: ref, seg: segPfx + '0'};
}
function makeTask(seed, lvl) {
  if (!LVCODE[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 300; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003 + 2207) >>> 0);
    var T = build(r, lvl); if (!T) continue;
    var E = elect(T.rs);
    if (E.dr < 0 || E.bdr < 0) continue;
    if (T.rs.filter(function (R) { return R.prio > 0; }).length < 2) continue;
    /* Router, für den "show ip ospf neighbor" gefragt wird: ab Mittel bevorzugt ein DROTHER */
    var others = T.rs.map(function (_, i) { return i; }).filter(function (i) { return E.role[i] === 'DROTHER'; });
    T.x = lvl !== 'L' && others.length && r() < 0.75 ? pick(r, others) : ri(r, 0, T.rs.length - 1);
    T.E = E;
    T.ans = {rid: T.rs.map(function (R) { return rid(R).id; }), dr: E.dr, bdr: E.bdr,
      nb: T.rs.map(function (_, y) { return y === T.x ? null : nbState(E, T.x, y); }),
      cost: T.rs[T.x].ospfCost || cost(T.ref, IFT[T.rs[T.x].type].bw)};
    T.level = lvl; T.code = lvl + '-' + seed;
    return T;
  }
  return null;
}

/* ---------- Texte ---------- */
function ifName(R) { return IFT[R.type].full + (R.type === 'Te' ? '0/0/0' : '0/0'); }
function shortIf(R) { return R.type + (R.type === 'Te' ? '0/0/0' : '0/0'); }
function config(T, R) {
  var o = 'hostname ' + R.name + '\n!\n';
  R.loops.forEach(function (ip, k) { o += 'interface Loopback' + k + '\n ip address ' + ip + ' 255.255.255.255\n!\n'; });
  o += 'interface ' + ifName(R) + '\n description zum Switch\n ip address ' + R.segIp + ' 255.255.255.0\n' + (R.prio !== 1 ? ' ip ospf priority ' + R.prio + '\n' : '') + (R.ospfCost ? ' ip ospf cost ' + R.ospfCost + '\n' : '') + '!\n';
  o += 'interface GigabitEthernet0/1\n ip address ' + R.other + ' 255.255.255.0\n!\n';
  o += 'router ospf 1\n' + (R.cmd ? ' router-id ' + R.cmd + '\n' : '') + (T.ref !== 100 ? ' auto-cost reference-bandwidth ' + T.ref + '\n' : '') +
    ' network ' + T.seg + ' 0.0.0.255 area 0\n network ' + R.other.replace(/\.1$/, '.0') + ' 0.0.0.255 area 0\n' + (R.loops.length ? R.loops.map(function (ip) { return ' network ' + ip + ' 0.0.0.0 area 0\n'; }).join('') : '');
  return o.replace(/\n$/, '');
}
function ridWhy(R) {
  var x = rid(R);
  if (x.how === 'cmd') return 'router-id ' + x.id + ' ist konfiguriert – das hat Vorrang vor allem anderen' + (R.loops.length ? ' (auch vor der Loopback)' : '') + '.';
  if (x.how === 'loop') return 'kein router-id-Befehl → höchste Loopback-IP' + (R.loops.length > 1 ? ' (' + R.loops.join(' / ') + ')' : '') + ': ' + x.id + '.';
  return 'kein router-id-Befehl, keine Loopback → höchste IP eines aktiven Interfaces (' + R.segIp + ' / ' + R.other + '): ' + x.id + '.';
}

/* ---------- Zeichnen: Router um einen Switch ---------- */
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function tx(x, y, t, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 13) + '" font-weight="' + (o.fw || 400) + '" fill="' + (o.c || '#1c2b33') + '" font-family="' + (o.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'Open Sans,Arial,sans-serif') + '">' + esc(t) + '</text>'; }
var ICON_R = '<ellipse cx="0" cy="8" rx="26" ry="9" fill="#1f5872"/><rect x="-26" y="-8" width="52" height="16" fill="#2f7392"/><ellipse cx="0" cy="-8" rx="26" ry="9" fill="#5a9dbb" stroke="#1f5872"/><path d="M-13 -8h8M5 -8h8M-1 -14v5M-1 -6v5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
var ICON_S = '<path d="M-30 -5l10 -10h48l-10 10z" fill="#6aaecb" stroke="#1f5872"/><path d="M-30 -5h48v16h-48z" fill="#2f7392"/><path d="M18 -5l10 -10v16l-10 10z" fill="#1f5872"/><path d="M-22 1h10M-6 1h10M-18 6h10M-2 6h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>';
/* opt: {roles: E (zeigt DR/BDR), rids:true, x: hervorgehobener Router} */
function draw(T, opt) {
  opt = opt || {};
  var n = T.rs.length, W = Math.max(760, n * 150 + 40), y0 = opt.rids ? 146 : opt.roles || opt.prio ? 128 : 104, sy = y0 + 110, H = sy + 52, sx = W / 2, o = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Router an einem gemeinsamen Switch">'];
  var xs = T.rs.map(function (_, i) { return W / 2 + (i - (n - 1) / 2) * Math.min(150, (W - 120) / Math.max(1, n - 1)); });
  T.rs.forEach(function (R, i) { o.push('<line x1="' + xs[i] + '" y1="' + y0 + '" x2="' + sx + '" y2="' + (sy - 12) + '" stroke="#1c2b33" stroke-width="2.5"' + (R.late && opt.showLate ? ' stroke-dasharray="7 5"' : '') + '/>'); });
  o.push('<g transform="translate(' + sx + ' ' + sy + ')">' + ICON_S + '</g>' + tx(sx, sy + 34, T.seg + '/24 · Area 0', {fs: 13, fw: 700}));
  T.rs.forEach(function (R, i) {
    var x = xs[i], hl = opt.x === i;
    if (hl) o.push('<rect x="' + (x - 72) + '" y="4" width="144" height="' + (y0 - 8) + '" rx="8" fill="#fff8e1" stroke="#f9a825" stroke-width="2"/>');
    o.push('<g transform="translate(' + x + ' 52)">' + ICON_R + '</g>' + tx(x, 28, R.name, {fs: 16, fw: 700}));
    o.push(tx(x, 92, shortIf(R) + ' .' + R.segIp.split('.')[3], {fs: 12, mono: 1, c: '#455a64'}));
    if (opt.roles) { var role = opt.roles.role[i], col = role === 'DR' ? '#2e7d32' : role === 'BDR' ? '#1565c0' : '#78909c'; o.push('<rect x="' + (x - 34) + '" y="100" width="68" height="20" rx="10" fill="' + col + '"/>' + tx(x, 114.5, role, {fs: 12, fw: 700, c: '#fff'})); }
    else if (opt.prio) o.push(tx(x, 116, 'Priorität ' + R.prio, {fs: 12, c: '#546e7a'}));
    if (opt.rids) o.push(tx(x, opt.roles ? 132 : 132, 'RID ' + rid(R).id, {fs: 11.5, mono: 1, c: '#1c2b33'}));
  });
  o.push('</svg>');
  return o.join('');
}

G.O2 = {LVNAME: LVNAME, IFT: IFT, cost: cost, rid: rid, elect: elect, nbState: nbState, makeTask: makeTask, config: config, ridWhy: ridWhy, draw: draw, ifName: ifName, shortIf: shortIf, ipn: ipn, ICON_R: ICON_R, ICON_S: ICON_S};
})(typeof window !== 'undefined' ? window : globalThis);
