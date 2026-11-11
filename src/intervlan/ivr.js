/* AECP · Inter-VLAN-Routing: Ping-Modell (Router-on-a-Stick und Layer-3-Switch), Fehler-Generator, Zeichnen.
   Browser: window.IVR · Node: globalThis.IVR */
(function (G) {
'use strict';

var VC = {10: '#1565c0', 20: '#ef6c00', 30: '#7b1fa2', 40: '#2e7d32', 11: '#455a64', 21: '#455a64', 31: '#455a64', 41: '#455a64'};
function vcol(v) { return VC[v] || '#455a64'; }

/* ---------- IP-Rechnen ---------- */
function ip2n(ip) { return ip.split('.').reduce(function (a, b) { return a * 256 + (+b); }, 0); }
function mask(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
function sameNet(a, b, p) { var m = mask(p); return ((ip2n(a) & m) >>> 0) === ((ip2n(b) & m) >>> 0); }
function maskTxt(p) { var m = mask(p); return [m >>> 24, (m >>> 16) & 255, (m >>> 8) & 255, m & 255].join('.'); }
function netOf(ip, p) { var n = (ip2n(ip) & mask(p)) >>> 0; return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.') + '/' + p; }

function pcBy(T, n) { return T.pcs.filter(function (p) { return p.name === n; })[0]; }
function allows(list, v) { return list === null || list.indexOf(v) >= 0; }

/* Erreicht ein Frame aus VLAN v das L3-Interface? Liefert {ok, ip, prefix, name, why}. */
function l3In(T, v) {
  if (T.mode === 'l3') {
    var s = T.l3.svis.filter(function (x) { return x.vlan === v; })[0];
    if (!s) return {ok: false, why: 'Auf ' + T.sw.name + ' gibt es kein interface Vlan' + v + '.'};
    if (s.shutdown) return {ok: false, why: 'interface Vlan' + v + ' auf ' + T.sw.name + ' ist shutdown.'};
    return {ok: true, ip: s.ip, prefix: s.prefix, name: 'interface Vlan' + v, vlan: v};
  }
  var up = T.sw.up;
  if (up.mode !== 'trunk') return {ok: false, why: T.sw.name + ' ' + up.port + ' (zum Router) ist ein Access-Port in VLAN ' + up.accessVlan + ' statt Trunk – der Router bekommt keine getaggten Frames.'};
  if (!allows(up.allowed, v)) return {ok: false, why: 'VLAN ' + v + ' ist auf dem Trunk ' + T.sw.name + ' ' + up.port + ' nicht erlaubt.'};
  if (T.router.shutdown) return {ok: false, why: T.router.name + ' ' + T.router.phys + ' ist shutdown – damit sind alle Subinterfaces down.'};
  var sub = T.router.subs.filter(function (x) { return x.dot1q === v; })[0];
  if (!sub) return {ok: false, why: T.router.name + ' hat kein Subinterface mit encapsulation dot1Q ' + v + ' – Frames mit Tag ' + v + ' werden verworfen.'};
  return {ok: true, ip: sub.ip, prefix: sub.prefix, name: sub.ifname, vlan: v};
}

/* Alle L3-Interfaces, über die der Router hinaus kann */
function l3All(T) {
  if (T.mode === 'l3') return T.l3.svis.map(function (s) { return {vlan: s.vlan, ip: s.ip, prefix: s.prefix, name: 'interface Vlan' + s.vlan}; });
  return T.router.subs.map(function (s) { return {vlan: s.dot1q, ip: s.ip, prefix: s.prefix, name: s.ifname}; });
}

/* Ein Weg src → dst. Liefert {ok, steps[]} */
function forward(T, src, dst) {
  var S = pcBy(T, src), D = pcBy(T, dst), st = [];
  if (sameNet(S.ip, D.ip, S.prefix)) {
    st.push(['i', src + ': ' + D.ip + ' liegt laut eigener Maske /' + S.prefix + ' im selben Netz → ' + src + ' fragt direkt per ARP, ohne Gateway.']);
    if (S.vlan === D.vlan) { st.push(['ok', 'Beide hängen in VLAN ' + S.vlan + ' – der Switch stellt direkt zu.']); return {ok: true, steps: st}; }
    st.push(['x', dst + ' hängt aber in VLAN ' + D.vlan + ', ' + src + ' in VLAN ' + S.vlan + '. Der ARP-Broadcast bleibt in VLAN ' + S.vlan + ' – keine Antwort.']);
    return {ok: false, steps: st};
  }
  st.push(['i', src + ': ' + D.ip + ' liegt nicht im eigenen Netz ' + netOf(S.ip, S.prefix) + ' → Paket geht an das Gateway ' + S.gw + '.']);
  if (!sameNet(S.gw, S.ip, S.prefix)) { st.push(['x', 'Das Gateway ' + S.gw + ' liegt gar nicht im Netz von ' + src + ' – ' + src + ' kann es nicht erreichen.']); return {ok: false, steps: st}; }
  var g = l3In(T, S.vlan);
  if (!g.ok) { st.push(['x', g.why]); return {ok: false, steps: st}; }
  if (g.ip !== S.gw) { st.push(['x', 'In VLAN ' + S.vlan + ' hat das L3-Interface (' + g.name + ') die Adresse ' + g.ip + ', nicht ' + S.gw + ' – niemand antwortet auf den ARP für das Gateway.']); return {ok: false, steps: st}; }
  if (!sameNet(S.ip, g.ip, g.prefix)) { st.push(['x', g.name + ' (' + g.ip + '/' + g.prefix + ') liegt in einem anderen Netz als ' + src + ' – der Router nimmt das nicht an.']); return {ok: false, steps: st}; }
  st.push(['ok', 'Das Gateway ' + S.gw + ' ist ' + (T.mode === 'l3' ? T.sw.name + ' ' : T.router.name + ' ') + g.name + ' in VLAN ' + S.vlan + ' – erreicht.']);
  if (T.mode === 'l3' && !T.l3.routing) { st.push(['x', 'Auf ' + T.sw.name + ' fehlt der Befehl ip routing – der Switch leitet nicht zwischen den VLANs weiter.']); return {ok: false, steps: st}; }
  var out = null;
  l3All(T).forEach(function (c) { if (!out && sameNet(D.ip, c.ip, c.prefix)) out = c; });
  if (!out) { st.push(['x', 'Der Router hat kein Interface im Netz von ' + D.ip + ' – er kennt keinen Weg dorthin.']); return {ok: false, steps: st}; }
  var r = l3In(T, out.vlan);
  if (!r.ok) { st.push(['x', 'Raus Richtung ' + D.ip + ' ginge es über ' + out.name + ' – aber: ' + r.why]); return {ok: false, steps: st}; }
  st.push(['ok', 'Routing: ' + D.ip + ' liegt im Netz von ' + out.name + ' (' + out.ip + '/' + out.prefix + ') → raus in VLAN ' + out.vlan + '.']);
  if (D.vlan !== out.vlan) { st.push(['x', dst + ' hängt aber in VLAN ' + D.vlan + ' – das Paket kommt in VLAN ' + out.vlan + ' nicht bei ihm an.']); return {ok: false, steps: st}; }
  st.push(['ok', 'Der Switch stellt in VLAN ' + out.vlan + ' an ' + dst + ' zu.']);
  return {ok: true, steps: st};
}

function ping(T, a, b) {
  var f = forward(T, a, b), r = forward(T, b, a);
  return {ok: f.ok && r.ok, there: f, back: r};
}

/* ---------- Generator ---------- */
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'}, LVCODE = {L: 1, M: 2, S: 3};

function base(r, mode, vlans, gwHost) {
  var T = {mode: mode, vlans: vlans, plan: {}, pcs: [], gwHost: gwHost};
  var k = 1, port = 1;
  vlans.forEach(function (v) {
    T.plan[v] = {net: '192.168.' + v + '.0/24', gw: '192.168.' + v + '.' + gwHost};
    var n = 1 + (r() < 0.5 ? 1 : 0);
    for (var i = 0; i < n; i++) T.pcs.push({name: 'PC' + (k++), port: 'Fa0/' + (port++), vlan: v, ip: '192.168.' + v + '.' + (10 + i + (r() < 0.5 ? 0 : 10)), prefix: 24, gw: '192.168.' + v + '.' + gwHost});
  });
  if (mode === 'roas') {
    T.sw = {name: 'SW1', up: {port: 'Gi0/1', mode: 'trunk', allowed: r() < 0.5 ? null : vlans.slice(), accessVlan: 1}};
    T.router = {name: 'R1', phys: 'Gi0/0', shutdown: false, subs: vlans.map(function (v) { return {ifname: 'Gi0/0.' + v, dot1q: v, ip: '192.168.' + v + '.' + gwHost, prefix: 24}; })};
  } else {
    T.sw = {name: 'L3-SW1'};
    T.l3 = {routing: true, svis: vlans.map(function (v) { return {vlan: v, ip: '192.168.' + v + '.' + gwHost, prefix: 24, shutdown: false}; })};
  }
  return T;
}

/* Fehlerarten: [Name, Stufen, nur Router-on-a-Stick/L3, anwenden(T,r,a,b) → {loc, label, fix} oder null] */
var FAULTS = [
  ['gw', 'LMS', '*', function (T, r, a, b) { var p = pcBy(T, pick(r, [a, b])); var wrong = '192.168.' + p.vlan + '.' + (T.gwHost === 1 ? 254 : 1); p.gw = wrong; return {loc: 'pc:' + p.name, fix: p.name + ': Gateway auf ' + T.plan[p.vlan].gw + ' ändern (eingetragen ist ' + wrong + ').'}; }],
  ['access', 'LMS', '*', function (T, r, a, b) { var p = pcBy(T, pick(r, [a, b])); var o = T.vlans.filter(function (v) { return v !== p.vlan; }); var w = pick(r, o); var old = p.vlan; p.vlan = w; return {loc: 'acc:' + p.name, fix: T.sw.name + ': interface ' + p.port + ' → switchport access vlan ' + old + ' (steht auf VLAN ' + w + ').'}; }],
  ['trunkallow', 'LMS', 'roas', function (T, r, a, b) { var v = pcBy(T, pick(r, [a, b])).vlan; T.sw.up.allowed = T.vlans.filter(function (x) { return x !== v; }); return {loc: 'trunk', fix: T.sw.name + ': interface ' + T.sw.up.port + ' → switchport trunk allowed vlan add ' + v + '.'}; }],
  ['pcip', 'MS', '*', function (T, r, a, b) { var p = pcBy(T, pick(r, [a, b])); var o = T.vlans.filter(function (v) { return v !== p.vlan; }); var w = pick(r, o); var old = p.ip; p.ip = '192.168.' + w + '.' + old.split('.')[3]; return {loc: 'pc:' + p.name, fix: p.name + ': IP-Adresse ' + p.ip + ' passt nicht zu VLAN ' + p.vlan + ' – richtig wäre ' + old + '.'}; }],
  ['trunkmode', 'MS', 'roas', function (T, r) { T.sw.up.mode = 'access'; T.sw.up.accessVlan = pick(r, [1].concat(T.vlans)); return {loc: 'trunk', fix: T.sw.name + ': interface ' + T.sw.up.port + ' → switchport mode trunk.'}; }],
  ['dot1q', 'MS', 'roas', function (T, r, a, b) { var v = pcBy(T, pick(r, [a, b])).vlan; var s = T.router.subs.filter(function (x) { return x.dot1q === v; })[0]; s.dot1q = v + 1; return {loc: 'sub:' + v, fix: T.router.name + ': interface ' + s.ifname + ' → encapsulation dot1Q ' + v + ' (steht auf ' + (v + 1) + ').'}; }],
  ['subip', 'MS', 'roas', function (T, r, a, b) { var v = pcBy(T, pick(r, [a, b])).vlan; var s = T.router.subs.filter(function (x) { return x.dot1q === v; })[0]; var o = T.vlans.filter(function (x) { return x !== v; }); var w = pick(r, o); var old = s.ip; s.ip = '192.168.' + v + '.' + (T.gwHost === 1 ? 2 : 253); return {loc: 'sub:' + v, fix: T.router.name + ': interface ' + s.ifname + ' → ip address ' + old + ' 255.255.255.0 (eingetragen ist ' + s.ip + ').'}; }],
  ['phys', 'MS', 'roas', function (T) { T.router.shutdown = true; return {loc: 'phys', fix: T.router.name + ': interface ' + T.router.phys + ' → no shutdown.'}; }],
  ['norouting', 'MS', 'l3', function (T) { T.l3.routing = false; return {loc: 'routing', fix: T.sw.name + ': im Konfigurationsmodus ip routing eingeben.'}; }],
  ['svidown', 'MS', 'l3', function (T, r, a, b) { var v = pcBy(T, pick(r, [a, b])).vlan; T.l3.svis.filter(function (x) { return x.vlan === v; })[0].shutdown = true; return {loc: 'svi:' + v, fix: T.sw.name + ': interface Vlan' + v + ' → no shutdown.'}; }],
  ['sviip', 'MS', 'l3', function (T, r, a, b) { var v = pcBy(T, pick(r, [a, b])).vlan; var s = T.l3.svis.filter(function (x) { return x.vlan === v; })[0]; var old = s.ip; s.ip = '192.168.' + v + '.' + (T.gwHost === 1 ? 2 : 253); return {loc: 'svi:' + v, fix: T.sw.name + ': interface Vlan' + v + ' → ip address ' + old + ' 255.255.255.0 (eingetragen ist ' + s.ip + ').'}; }],
  ['mask', 'S', '*', function (T, r, a, b) { var p = pcBy(T, pick(r, [a, b])); p.prefix = 16; return {loc: 'pc:' + p.name, fix: p.name + ': Subnetzmaske 255.255.255.0 statt 255.255.0.0 – mit /16 hält er die anderen VLAN-Netze für sein eigenes Netz und fragt das Gateway gar nicht.'}; }]
];

function tryMake(r, lvl) {
  var mode = lvl === 'L' ? 'roas' : (r() < 0.35 ? 'l3' : 'roas');
  var vlans = lvl === 'L' ? [10, 20] : (r() < 0.5 ? [10, 20, 30] : [10, 20, 30, 40]);
  var T = base(r, mode, vlans, lvl === 'S' && r() < 0.4 ? 254 : 1);
  // Paar: meist verschiedene VLANs
  var A = pick(r, T.pcs), others = T.pcs.filter(function (p) { return p !== A && (p.vlan !== A.vlan || r() < 0.15); });
  if (!others.length) return null;
  var B = pick(r, others), a = A.name, b = B.name;
  if (!ping(T, a, b).ok) return null;
  var clean = clone(T), fault = null;
  var pFault = lvl === 'L' ? 0.55 : 0.8;
  if (r() < pFault) {
    var cand = FAULTS.filter(function (f) { return f[1].indexOf(lvl) >= 0 && (f[2] === '*' || f[2] === mode); });
    if (A.vlan === B.vlan) cand = cand.filter(function (f) { return f[0] === 'access' || f[0] === 'pcip'; });
    if (!cand.length) return null;
    var f = pick(r, cand);
    fault = f[3](T, r, a, b);
    fault.kind = f[0];
    if (ping(T, a, b).ok) return null;               // Fehler muss den Ping wirklich verhindern
  }
  T.pair = [a, b]; T.fault = fault; T.clean = clean;
  return T;
}

function makeTask(seed, lvl) {
  if (!LVCODE[lvl]) return null;
  for (var att = 0; att < 3000; att++) {
    var T = tryMake(rng((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003) >>> 0), lvl);
    if (T) { T.seed = seed; T.level = lvl; T.code = lvl + '-' + seed; return T; }
  }
  return null;
}

/* Antwortmöglichkeiten für „Wo liegt der Fehler?“ */
function options(T) {
  var a = pcBy(T, T.pair[0]), b = pcBy(T, T.pair[1]), o = [];
  [a, b].forEach(function (p) { o.push(['pc:' + p.name, 'Konfiguration von ' + p.name + ' (IP, Maske, Gateway)']); });
  [a, b].forEach(function (p) { o.push(['acc:' + p.name, 'Access-Port von ' + p.name + ' (' + T.sw.name + ' ' + p.port + ')']); });
  var vs = [];
  [a, b].forEach(function (p) { if (vs.indexOf(p.vlan) < 0) vs.push(p.vlan); });
  [10, 20, 30, 40].forEach(function (v) { if (vs.indexOf(v) < 0 && T.vlans.indexOf(v) >= 0 && vs.length < 2) vs.push(v); });
  vs.sort(function (x, y) { return x - y; });
  if (T.mode === 'roas') {
    o.push(['trunk', 'Port ' + T.sw.name + ' ' + T.sw.up.port + ' zum Router']);
    o.push(['phys', T.router.name + ' ' + T.router.phys + ' (physisches Interface)']);
    vs.forEach(function (v) { o.push(['sub:' + v, T.router.name + ' Subinterface Gi0/0.' + v]); });
  } else {
    o.push(['routing', T.sw.name + ': ip routing']);
    vs.forEach(function (v) { o.push(['svi:' + v, T.sw.name + ': interface Vlan' + v]); });
  }
  o.push(['none', 'Kein Fehler – der Ping klappt']);
  return o;
}

/* ---------- Konfigurationen als Text ---------- */
function cfgRouter(T) {
  var R = T.router, s = R.name + '#show running-config\n!\ninterface GigabitEthernet' + R.phys.slice(2) + '\n no ip address\n' + (R.shutdown ? ' shutdown\n' : ' no shutdown\n') + '!\n';
  R.subs.forEach(function (x) { s += 'interface GigabitEthernet' + x.ifname.slice(2) + '\n encapsulation dot1Q ' + x.dot1q + '\n ip address ' + x.ip + ' ' + maskTxt(x.prefix) + '\n!\n'; });
  return s;
}
function cfgSwitch(T) {
  var s = T.sw.name + '#show running-config\n!\n';
  if (T.mode === 'l3') s += (T.l3.routing ? 'ip routing\n' : '') + '!\n';
  T.pcs.forEach(function (p) { s += 'interface FastEthernet' + p.port.slice(2) + '\n switchport mode access\n switchport access vlan ' + p.vlan + '\n!\n'; });
  if (T.mode === 'roas') {
    var u = T.sw.up;
    s += 'interface GigabitEthernet' + u.port.slice(2) + '\n' + (u.mode === 'trunk' ? ' switchport mode trunk\n' + (u.allowed ? ' switchport trunk allowed vlan ' + u.allowed.join(',') + '\n' : '') : ' switchport mode access\n switchport access vlan ' + u.accessVlan + '\n') + '!\n';
  } else {
    T.l3.svis.forEach(function (x) { s += 'interface Vlan' + x.vlan + '\n ip address ' + x.ip + ' ' + maskTxt(x.prefix) + '\n' + (x.shutdown ? ' shutdown\n' : ' no shutdown\n') + '!\n'; });
  }
  return s;
}

/* ---------- Zeichnen ---------- */
var W = 760;
function t(x, y, s, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 12) + '" font-weight="' + (o.fw || 400) + '" fill="' + (o.c || '#1c2b33') + '">' + s + '</text>'; }
function layout(T) {
  var pos = {}, n = T.pcs.length, roas = T.mode === 'roas';
  pos.R = [W / 2, 52]; pos.SW = [W / 2, roas ? 172 : 120];
  var py = roas ? 300 : 250, sp = Math.min(150, (W - 130) / Math.max(1, n - 1));
  T.pcs.forEach(function (p, i) { pos[p.name] = [n === 1 ? W / 2 : W / 2 + (i - (n - 1) / 2) * sp, py]; });
  pos.H = roas ? 360 : 312;
  return pos;
}
function draw(T, opt) {
  opt = opt || {};
  var pos = layout(T), roas = T.mode === 'roas', o = ['<svg viewBox="0 0 ' + W + ' ' + pos.H + '" role="img" aria-label="Topologie Inter-VLAN-Routing">'];
  var hl = opt.hl || {};
  if (roas) {
    var up = T.sw.up, trunk = up.mode === 'trunk';
    o.push('<line x1="' + W / 2 + '" y1="76" x2="' + W / 2 + '" y2="146" stroke="#1c2b33" stroke-width="' + (trunk ? 5 : 2.5) + '"' + (trunk ? '' : ' stroke-dasharray="6 5"') + '/>');
    o.push(t(W / 2 + 10, 98, T.router.phys, {a: 'start', fs: 11, c: '#546e7a'}), t(W / 2 + 10, 140, up.port, {a: 'start', fs: 11, c: '#546e7a'}));
    o.push(t(W / 2 - 10, 118, trunk ? 'Trunk (802.1Q)' : 'Access-Port!', {a: 'end', fs: 12, fw: 700, c: trunk ? '#1c2b33' : '#c62828'}));
  }
  T.pcs.forEach(function (p) {
    var s = pos.SW, q = pos[p.name], c = vcol(p.vlan), on = hl[p.name];
    o.push('<line x1="' + s[0] + '" y1="' + (s[1] + 24) + '" x2="' + q[0] + '" y2="' + (q[1] - 30) + '" stroke="' + c + '" stroke-width="2.5"/>');
    var mx = s[0] + (q[0] - s[0]) * .6, my = s[1] + 24 + (q[1] - 30 - s[1] - 24) * .6;
    o.push('<rect x="' + (mx - 18) + '" y="' + (my - 8) + '" width="36" height="16" rx="4" fill="#fff"/>' + t(mx, my + 4, p.port, {fs: 10, c: '#546e7a'}));
    o.push('<rect x="' + (q[0] - 58) + '" y="' + (q[1] - 30) + '" width="116" height="62" rx="6" fill="' + (on ? '#fff8e1' : '#fff') + '" stroke="' + (on ? '#1c2b33' : '#90a4ae') + '" stroke-width="' + (on ? 2.5 : 1.5) + '"/>');
    o.push(t(q[0], q[1] - 13, p.name, {fs: 13, fw: 700}), t(q[0], q[1] + 3, p.ip + '/' + p.prefix, {fs: 11}), t(q[0], q[1] + 17, 'GW ' + p.gw, {fs: 10.5, c: '#546e7a'}));
    o.push('<rect x="' + (q[0] - 26) + '" y="' + (q[1] + 22) + '" width="52" height="13" rx="6.5" fill="' + c + '"/>' + t(q[0], q[1] + 32, 'VLAN ' + p.vlan, {fs: 9.5, fw: 700, c: '#fff'}));
  });
  function box(p, w, h, label, sub, fill) { o.push('<rect x="' + (p[0] - w / 2) + '" y="' + (p[1] - h / 2) + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="#1c2b33" stroke-width="1.5"/>' + t(p[0], p[1] + (sub ? -2 : 5), label, {fs: 16, fw: 700}) + (sub ? t(p[0], p[1] + 14, sub, {fs: 10.5, c: '#546e7a'}) : '')); }
  if (roas) box(pos.R, 150, 48, T.router.name, 'Router', '#e8f0fe');
  box(pos.SW, roas ? 150 : 180, 48, T.sw.name, roas ? 'Switch' : 'Layer-3-Switch', roas ? '#f4f6f8' : '#e8f0fe');
  if (opt.extra) o.push(opt.extra(pos));
  o.push('</svg>');
  return o.join('');
}

G.IVR = {forward: forward, ping: ping, makeTask: makeTask, options: options, cfgRouter: cfgRouter, cfgSwitch: cfgSwitch, draw: draw, layout: layout, vcol: vcol, LVNAME: LVNAME, maskTxt: maskTxt, sameNet: sameNet, base: base, rng: rng, pcBy: pcBy};
})(typeof window !== 'undefined' ? window : globalThis);
