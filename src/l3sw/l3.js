/* NWT · Layer-3-Switching: Modell (SVI-Status, Routing-Tabelle, Ping), Fehler-Generator, Texte, Zeichnen.
   Browser: window.L3 · Node: globalThis.L3 */
(function (G) {
'use strict';
var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};
var VCOL = ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a'];
var VNAMES = ['Verwaltung', 'Technik', 'Lehrer', 'Schueler', 'Gaeste', 'Drucker', 'Labor', 'Server'];
var INET = '8.8.8.8';
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

/* ---------- IP ---------- */
function n(ip) { return ip.split('.').reduce(function (a, b) { return a * 256 + (+b); }, 0); }
function s(x) { return [x >>> 24 & 255, x >>> 16 & 255, x >>> 8 & 255, x & 255].join('.'); }
function maskN(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
function mask(p) { return s(maskN(p)); }
function inNet(ip, net, p) { return ((n(ip) & maskN(p)) >>> 0) === ((n(net) & maskN(p)) >>> 0); }
function host(net, h) { return s(n(net) + h); }

/* ---------- Modell ---------- */
function vlan(T, id) { return T.vlans.filter(function (v) { return v.id === id; })[0]; }
function pc(T, name) { return T.pcs.filter(function (p) { return p.name === name; })[0]; }
function portActive(T, p) { return !p.shut && vlan(T, p.vlan).db; }
/* 'up' = up/up, 'down' = up/down, 'admin' = administratively down/down */
function sviState(T, v) {
  if (v.shut) return 'admin';
  if (!v.db) return 'down';
  if (trunkCarries(T, v.id)) return 'up';
  return T.pcs.some(function (p) { return p.vlan === v.id && portActive(T, p); }) ? 'up' : 'down';
}
function isTrunk(T) { return T.up.mode === 'trunk'; }
/* Ein Trunk, der ein VLAN führt, zählt als aktiver Port dieses VLANs */
function trunkCarries(T, id) { return isTrunk(T) && (!T.up.allowed || T.up.allowed.indexOf(id) >= 0); }
/* Transit-SVI bei Trunk-Uplink: 'up' | 'down' | 'admin' | null (kein Trunk) */
function transitState(T) {
  if (!isTrunk(T)) return null;
  var u = T.up;
  if (u.tvshut) return 'admin';
  if (!u.tvdb) return 'down';
  if (u.allowed && u.allowed.indexOf(u.tv) < 0) return 'down';
  return 'up';
}
function upOk(T) { return isTrunk(T) ? transitState(T) === 'up' : T.up.routed; }
function upIf(T) { return isTrunk(T) ? 'Vlan' + T.up.tv : T.up.port; }
/* Routing-Tabelle des Switches: null = ip routing aus; sonst Liste */
function routes(T) {
  if (!T.routing) return null;
  var r = [];
  if (upOk(T)) r.push({k: 'C', key: 'up', net: T.up.net, p: 30, via: upIf(T), own: T.up.ip});
  T.vlans.forEach(function (v) { if (sviState(T, v) === 'up') r.push({k: 'C', key: 'v' + v.id, net: v.net, p: 24, via: 'Vlan' + v.id, own: v.svi}); });
  if (T.def && r.some(function (x) { return inNet(T.def, x.net, x.p); })) r.unshift({k: 'S*', key: 'def', net: '0.0.0.0', p: 0, nh: T.def});
  return r;
}
function routeKeys(T) { var r = routes(T); return r === null ? ['none'] : r.map(function (x) { return x.key; }).sort(); }
function r1Back(T, ip) { return T.r1.routes.some(function (x) { return inNet(ip, x.net, x.p); }); }

/* Ping a → b (b = PC-Name oder 'INET'); liefert {ok, why} */
function reach(T, a, b) {
  var A = pc(T, a), va = vlan(T, A.vlan);
  if (!portActive(T, A)) return {ok: false, why: A.shut ? a + ' hängt an ' + A.port + ', und der Port ist abgeschaltet (shutdown).' : 'VLAN ' + A.vlan + ' ist auf ' + T.sw + ' nicht angelegt – der Access-Port ' + A.port + ' von ' + a + ' ist dadurch inaktiv.'};
  if (b !== 'INET') {
    var B = pc(T, b);
    if (B.vlan === A.vlan) {
      if (!portActive(T, B)) return {ok: false, why: B.shut ? b + ' hängt an ' + B.port + ', und der Port ist abgeschaltet.' : 'Der Port von ' + b + ' ist inaktiv.'};
      return {ok: true, why: 'Beide sind im selben VLAN und Netz – der Switch leitet den Frame auf Layer 2 anhand der MAC-Tabelle weiter. Routing, Gateway und SVI spielen keine Rolle.'};
    }
  }
  if (A.gw !== va.svi) return {ok: false, why: a + ' hat das Gateway ' + A.gw + ', die SVI Vlan' + va.id + ' hat aber ' + va.svi + '. Das Paket kommt nie beim Switch-Router an.'};
  var st = sviState(T, va);
  if (st !== 'up') return {ok: false, why: 'Das Gateway von ' + a + ' ist die SVI Vlan' + va.id + ' – und die ist ' + (st === 'admin' ? 'administratively down (shutdown).' : 'down.')};
  if (!T.routing) return {ok: false, why: 'Auf ' + T.sw + ' fehlt ip routing. Der Switch nimmt das Paket an der SVI an, routet es aber nicht weiter.'};
  if (b === 'INET') {
    if (isTrunk(T) && !upOk(T)) { var tu = T.up; return {ok: false, why: 'Die Transit-SVI Vlan' + tu.tv + ' ist down: ' + (!tu.tvdb ? 'VLAN ' + tu.tv + ' ist nicht angelegt.' : 'der Trunk ' + tu.port + ' lässt VLAN ' + tu.tv + ' nicht durch (switchport trunk allowed vlan).') + ' Damit fehlt das Netz ' + tu.net + '/30, und die Default-Route hat keinen erreichbaren Next Hop.'}; }
    if (!upOk(T)) return {ok: false, why: 'Auf ' + T.up.port + ' fehlt no switchport. Der Port ist ein Layer-2-Port ohne IP-Adresse, deshalb gibt es kein Netz ' + T.up.net + '/30 und die Default-Route hat keinen erreichbaren Next Hop.'};
    if (!T.def) return {ok: false, why: T.sw + ' kennt nur seine direkt verbundenen Netze. Für ' + INET + ' fehlt eine Default-Route (ip route 0.0.0.0 0.0.0.0 ' + T.up.rip + ').'};
    if (!inNet(T.def, T.up.net, 30)) return {ok: false, why: 'Die Default-Route zeigt auf ' + T.def + ' – diese Adresse liegt in keinem direkt verbundenen Netz. Die Route wird nicht in die Routing-Tabelle übernommen.'};
    if (isTrunk(T) && T.r1.dot1q !== T.up.tv) return {ok: false, why: T.sw + ' schickt Richtung ' + T.def + ' Frames mit Tag VLAN ' + T.up.tv + '. Das Subinterface Gi0/0.' + T.up.tv + ' auf R1 erwartet aber Tag ' + T.r1.dot1q + ' (encapsulation dot1Q). Schon die ARP-Anfrage kommt nicht an. Die Default-Route steht trotzdem in der Tabelle – das Netz ist ja verbunden.'};
    if (!r1Back(T, A.ip)) return {ok: false, why: 'Hinweg klappt: ' + T.sw + ' → R1 → Internet. Aber R1 hat keine Route zurück ins Netz ' + va.net + '/24 und schickt die Antwort Richtung Internet statt zu ' + T.sw + '.'};
    return {ok: true, why: a + ' → Gateway ' + va.svi + ' (SVI Vlan' + va.id + ') → Default-Route über ' + T.up.port + ' zu R1 (' + T.def + ') → Internet. R1 kennt den Rückweg ins Netz ' + va.net + '/24.'};
  }
  var B2 = pc(T, b), vb = vlan(T, B2.vlan);
  var stb = sviState(T, vb);
  if (stb !== 'up') return {ok: false, why: 'Das Zielnetz ' + vb.net + '/24 gehört zu Vlan' + vb.id + ', und diese SVI ist ' + (stb === 'admin' ? 'administratively down' : 'down') + ' – das Netz steht nicht in der Routing-Tabelle.'};
  if (!portActive(T, B2)) return {ok: false, why: 'Der Switch routet ins VLAN ' + vb.id + ', aber der Port ' + B2.port + ' von ' + b + ' ist abgeschaltet.'};
  if (B2.gw !== vb.svi) return {ok: false, why: 'Der Hinweg klappt, aber ' + b + ' schickt die Antwort an sein falsches Gateway ' + B2.gw + ' (richtig: ' + vb.svi + ').'};
  return {ok: true, why: a + ' → Gateway ' + va.svi + ' (Vlan' + va.id + ') → ' + T.sw + ' routet intern → Vlan' + vb.id + ' → ' + b + '. Rückweg genauso über ' + vb.svi + '.'};
}

function answers(T) {
  return {svi: T.vlans.map(function (v) { return sviState(T, v); }), tr: transitState(T), rt: routeKeys(T), ping: T.pings.map(function (q) { return reach(T, q[0], q[1]).ok; })};
}

/* ---------- Fehler ---------- */
/* [Typ, Stufen, wählen(T,r) → Parameter|null, anwenden(T,p), Lösungstext(T,p), Fokus(T,p) → PC-Namen] */
function pcsIn(T, id) { return T.pcs.filter(function (p) { return p.vlan === id; }).map(function (p) { return p.name; }); }
var FAULTS = [
  ['norouting', 'LMS', function () { return {}; }, function (T) { T.routing = false; },
    function (T) { return T.sw + '(config)# ip routing – ohne diesen Befehl routet ein Layer-3-Switch nicht.'; }, function () { return []; }],
  ['svishut', 'LMS', function (T, r) { return {v: pick(r, T.vlans).id}; }, function (T, p) { vlan(T, p.v).shut = true; },
    function (T, p) { return T.sw + ': interface Vlan' + p.v + ' → no shutdown.'; }, function (T, p) { return pcsIn(T, p.v); }],
  ['nodefault', 'LMS', function () { return {}; }, function (T) { T.def = null; },
    function (T) { return T.sw + '(config)# ip route 0.0.0.0 0.0.0.0 ' + T.up.rip; }, function () { return []; }],
  ['novlan', 'MS', function (T, r) { return {v: pick(r, T.vlans).id}; }, function (T, p) { vlan(T, p.v).db = false; },
    function (T, p) { return T.sw + '(config)# vlan ' + p.v + ' – das VLAN muss in der VLAN-Datenbank existieren, sonst sind seine Access-Ports inaktiv und die SVI bleibt down.'; }, function (T, p) { return pcsIn(T, p.v); }],
  ['portshut', 'MS', function (T, r) { return {pc: pick(r, T.pcs).name}; }, function (T, p) { pc(T, p.pc).shut = true; },
    function (T, p) { return T.sw + ': interface ' + pc(T, p.pc).port + ' → no shutdown.'; }, function (T, p) { return [p.pc]; }],
  ['pcgw', 'MS', function (T, r) { return {pc: pick(r, T.pcs).name}; }, function (T, p) { var P = pc(T, p.pc), v = vlan(T, P.vlan); P.gw = host(v.net, T.svih === 1 ? 254 : 1); },
    function (T, p) { var P = pc(T, p.pc); return p.pc + ': Standardgateway auf ' + vlan(T, P.vlan).svi + ' ändern (eingetragen ist ' + P.gw + ').'; }, function (T, p) { return [p.pc]; }],
  ['sviip', 'S', function (T, r) { return {v: pick(r, T.vlans).id}; }, function (T, p) { var v = vlan(T, p.v); v.svi = host(v.net, T.svih === 1 ? 254 : 1); },
    function (T, p) { var v = vlan(T, p.v); return T.sw + ': interface Vlan' + p.v + ' → ip address ' + host(v.net, T.svih) + ' 255.255.255.0 – so steht es als Gateway auf den PCs (eingetragen ist ' + v.svi + ').'; }, function (T, p) { return pcsIn(T, p.v); }],
  ['noswitch', 'S', function (T) { return isTrunk(T) ? null : {}; }, function (T) { T.up.routed = false; },
    function (T) { return T.sw + ': interface ' + T.up.port + ' → no switchport, dann ip address ' + T.up.ip + ' 255.255.255.252.'; }, function () { return []; }],
  ['tvallowed', 'MS', function (T) { return isTrunk(T) ? {} : null; }, function (T) { T.up.allowed = T.vlans.map(function (v) { return v.id; }); },
    function (T) { return T.sw + ': interface ' + T.up.port + ' → switchport trunk allowed vlan add ' + T.up.tv + ' – das Transit-VLAN muss über den Trunk.'; }, function () { return []; }],
  ['tvnovlan', 'MS', function (T) { return isTrunk(T) ? {} : null; }, function (T) { T.up.tvdb = false; },
    function (T) { return T.sw + '(config)# vlan ' + T.up.tv + ' – ohne das Transit-VLAN bleibt die SVI Vlan' + T.up.tv + ' down.'; }, function () { return []; }],
  ['dot1q', 'S', function (T, r) { return isTrunk(T) ? {q: pick(r, [1, T.up.tv + 1, T.up.tv - 1, T.vlans[0].id])} : null; }, function (T, p) { T.r1.dot1q = p.q; },
    function (T) { return 'R1: interface Gi0/0.' + T.up.tv + ' → encapsulation dot1Q ' + T.up.tv + ' (eingetragen ist ' + T.r1.dot1q + ').'; }, function () { return []; }],
  ['noreturn', 'S', function (T, r) { return T.r1.summary ? null : {v: pick(r, T.vlans).id}; }, function (T, p) { var v = vlan(T, p.v); T.r1.routes = T.r1.routes.filter(function (x) { return x.net !== v.net; }); },
    function (T, p) { var v = vlan(T, p.v); return 'R1(config)# ip route ' + v.net + ' 255.255.255.0 ' + T.up.ip + ' – sonst kennt R1 den Rückweg nicht.'; }, function (T, p) { return pcsIn(T, p.v); }],
  ['wrongnh', 'S', function (T, r) { return {nh: host(T.up.net, pick(r, [5, 6, 9, -2]))}; }, function (T, p) { T.def = p.nh; },
    function (T, p) { return T.sw + ': ip route 0.0.0.0 0.0.0.0 ' + T.up.rip + ' – der Next Hop ' + p.nh + ' liegt nicht im Uplink-Netz ' + T.up.net + '/30.'; }, function () { return []; }]
];
function fdef(t) { return FAULTS.filter(function (f) { return f[0] === t; })[0]; }
function applyAll(base, fs, skip) { var T = clone(base); fs.forEach(function (f, i) { if (i !== skip) fdef(f.type)[3](T, f.p); }); return T; }

/* ---------- Aufgabe ---------- */
function build(r, lvl) {
  var nv = lvl === 'L' ? 2 : lvl === 'M' ? 3 : ri(r, 3, 4);
  var pat = pick(r, ['a', 'a', 'b', 'c']), site = ri(r, 1, 9);
  var ids = shuffle(r, [10, 20, 30, 40, 50, 60, 70, 80]).slice(0, nv).sort(function (a, b) { return a - b; });
  var svih = pick(r, [1, 1, 254]);
  var names = shuffle(r, VNAMES);
  var vlans = ids.map(function (id, k) {
    var net = pat === 'a' ? '192.168.' + id + '.0' : pat === 'b' ? '10.' + site + '.' + id + '.0' : '172.16.' + id + '.0';
    return {id: id, name: names[k], net: net, svi: host(net, svih), shut: false, db: true, col: k};
  });
  var cnt = vlans.map(function () { return ri(r, 1, 2); });
  if (cnt.indexOf(2) < 0) cnt[ri(r, 0, nv - 1)] = 2;
  var pcs = [], port = ri(r, 1, 3), k = 1;
  vlans.forEach(function (v, i) { for (var j = 0; j < cnt[i]; j++) { pcs.push({name: 'PC' + k, ip: host(v.net, 10 + j * ri(r, 1, 5) + ri(r, 0, 3) * 10), gw: v.svi, vlan: v.id, port: 'Gi1/0/' + port, shut: false}); k++; port += ri(r, 1, 2); } });
  var ub = pick(r, ['10.0.0.', '10.255.255.', '172.31.0.']), uo = 4 * ri(r, 0, 10), unet = ub + uo;
  var swip = pick(r, [[2, 1], [1, 2]]);
  var up = {port: 'Gi1/0/24', routed: true, net: unet, ip: host(unet, swip[0]), rip: host(unet, swip[1]), mode: 'routed'};
  if (lvl !== 'L' && r() < 0.45) { up.mode = 'trunk'; up.routed = false; up.tv = pick(r, [99, 100, 900, 999]); up.tvdb = true; up.tvshut = false; up.allowed = r() < 0.4 ? null : [up.tv]; }
  var summary = lvl === 'S' && r() < 0.35;
  var sumNet = pat === 'a' ? '192.168.0.0' : pat === 'b' ? '10.' + site + '.0.0' : '172.16.0.0';
  var r1 = {dot1q: up.tv || null, summary: summary, routes: summary ? [{net: sumNet, p: 16}] : vlans.map(function (v) { return {net: v.net, p: 24}; })};
  return {sw: pick(r, ['DSW1', 'MLS1', 'CORE1']), routing: true, svih: svih, vlans: vlans, pcs: pcs, up: up, def: up.rip, r1: r1};
}
function choosePings(T, r, focus) {
  var fp = focus.filter(function (x) { return pc(T, x); });
  var two = T.vlans.filter(function (v) { return pcsIn(T, v.id).length === 2; });
  var fv = two.filter(function (v) { return pcsIn(T, v.id).some(function (x) { return fp.indexOf(x) >= 0; }); });
  var sv = (fv.length && r() < 0.6) ? pick(r, fv) : pick(r, two), same = shuffle(r, pcsIn(T, sv.id));
  var a = fp.length && r() < 0.7 ? pick(r, fp) : pick(r, T.pcs).name;
  var others = T.pcs.filter(function (p) { return p.vlan !== pc(T, a).vlan; }).map(function (p) { return p.name; });
  var b = pick(r, others), cross = r() < 0.5 ? [a, b] : [b, a];
  var c = fp.length && r() < 0.7 ? pick(r, fp) : pick(r, T.pcs).name;
  return shuffle(r, [same, cross]).concat([[c, 'INET']]);
}
function makeTask(seed, lvl) {
  if (!LVCODE[lvl] || !(seed >= 1)) return null;
  for (var att = 0; att < 400; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003 + 31337) >>> 0);
    var base = build(r, lvl);
    var nf = lvl === 'L' ? (r() < 0.25 ? 0 : 1) : lvl === 'M' ? 1 : 2;
    var pool = shuffle(r, FAULTS.filter(function (f) { return f[1].indexOf(lvl) >= 0; })), fs = [], focus = [];
    for (var i = 0; i < pool.length && fs.length < nf; i++) {
      var p = pool[i][2](base, r); if (!p) continue;
      fs.push({type: pool[i][0], p: p});
    }
    if (fs.length < nf) continue;
    var ty = fs.map(function (f) { return f.type; });
    if (ty.indexOf('pcgw') >= 0 && ty.indexOf('sviip') >= 0) continue;
    var T = applyAll(base, fs, -1);
    fs.forEach(function (f) { focus = focus.concat(fdef(f.type)[5](T, f.p)); });
    T.pings = choosePings(T, r, focus);
    /* jeder Fehler muss in den Antworten sichtbar sein */
    var A = JSON.stringify(answers(T)), ok = true;
    for (var j = 0; j < fs.length && ok; j++) { var U = applyAll(base, fs, j); U.pings = T.pings; if (JSON.stringify(answers(U)) === A) ok = false; }
    if (!ok) continue;
    T.faults = fs.map(function (f) { return {type: f.type, p: f.p, fix: fdef(f.type)[4](T, f.p)}; });
    T.level = lvl; T.code = lvl + '-' + seed;
    return T;
  }
  return null;
}

/* ---------- Texte ---------- */
function stTxt(st) { return st === 'up' ? 'up / up' : st === 'down' ? 'up / down' : 'administratively down / down'; }
function transitWhy(T) {
  var st = transitState(T), u = T.up;
  if (st === 'admin') return 'interface Vlan' + u.tv + ' ist abgeschaltet.';
  if (!u.tvdb) return 'Das Transit-VLAN ' + u.tv + ' ist nicht angelegt.';
  if (st === 'down') return 'Der Trunk ' + u.port + ' lässt nur VLAN ' + u.allowed.join(',') + ' durch – VLAN ' + u.tv + ' hat damit keinen aktiven Port.';
  return 'VLAN ' + u.tv + ' existiert und läuft über den Trunk ' + u.port + ' – der Trunk ist der aktive Port dieses VLANs.';
}
function sviWhy(T, v) {
  var st = sviState(T, v);
  if (st === 'admin') return 'interface Vlan' + v.id + ' ist mit shutdown abgeschaltet.';
  if (!v.db) return 'Das VLAN ' + v.id + ' ist nicht angelegt (kein „vlan ' + v.id + '“). Ohne VLAN in der Datenbank bleibt die SVI down.';
  if (st === 'down') return 'Kein aktiver Port im VLAN ' + v.id + ' – alle Access-Ports dieses VLANs sind abgeschaltet.';
  if (trunkCarries(T, v.id)) return 'VLAN existiert, kein shutdown – und der Trunk ' + T.up.port + ' führt VLAN ' + v.id + (T.up.allowed ? '' : ' (alle VLANs erlaubt)') + '. Ein Trunk zählt als aktiver Port, auch wenn kein Access-Port im VLAN aktiv ist.';
  var act = T.pcs.filter(function (p) { return p.vlan === v.id && portActive(T, p); }).map(function (p) { return p.port; });
  return 'VLAN existiert, mindestens ein Port ist aktiv (' + act.join(', ') + '), kein shutdown.';
}
function cfgSW(T) {
  var o = 'hostname ' + T.sw + '\n!\n' + (T.routing ? 'ip routing\n!\n' : '!\n');
  T.vlans.forEach(function (v) { if (v.db) o += 'vlan ' + v.id + '\n name ' + v.name + '\n'; });
  if (isTrunk(T) && T.up.tvdb) o += 'vlan ' + T.up.tv + '\n name Transit\n';
  o += '!\n';
  T.pcs.forEach(function (p) { o += 'interface GigabitEthernet' + p.port.slice(2) + '\n switchport mode access\n switchport access vlan ' + p.vlan + '\n' + (p.shut ? ' shutdown\n' : '') + '!\n'; });
  if (isTrunk(T)) o += 'interface GigabitEthernet' + T.up.port.slice(2) + '\n description Trunk zu R1\n switchport mode trunk\n' + (T.up.allowed ? ' switchport trunk allowed vlan ' + T.up.allowed.join(',') + '\n' : '') + '!\n';
  else o += 'interface GigabitEthernet' + T.up.port.slice(2) + '\n description Uplink zu R1\n' + (T.up.routed ? ' no switchport\n ip address ' + T.up.ip + ' 255.255.255.252\n' : '') + '!\n';
  T.vlans.forEach(function (v) { o += 'interface Vlan' + v.id + '\n ip address ' + v.svi + ' 255.255.255.0\n' + (v.shut ? ' shutdown\n' : '') + '!\n'; });
  if (isTrunk(T)) o += 'interface Vlan' + T.up.tv + '\n description Transit zu R1\n ip address ' + T.up.ip + ' 255.255.255.252\n' + (T.up.tvshut ? ' shutdown\n' : '') + '!\n';
  if (T.def) o += 'ip route 0.0.0.0 0.0.0.0 ' + T.def + '\n';
  return o.replace(/\n$/, '');
}
function cfgR1(T) {
  var o = isTrunk(T) ? 'interface GigabitEthernet0/0\n description Trunk zu ' + T.sw + '\n no ip address\n!\ninterface GigabitEthernet0/0.' + T.up.tv + '\n encapsulation dot1Q ' + T.r1.dot1q + '\n ip address ' + T.up.rip + ' 255.255.255.252\n!\n'
    : 'interface GigabitEthernet0/0\n description zu ' + T.sw + '\n ip address ' + T.up.rip + ' 255.255.255.252\n!\n';
  o += 'ip route 0.0.0.0 0.0.0.0 203.0.113.1\n';
  T.r1.routes.forEach(function (x) { o += 'ip route ' + x.net + ' ' + mask(x.p) + ' ' + T.up.ip + '\n'; });
  return o.replace(/\n$/, '');
}
function pad(t, w) { t = String(t); while (t.length < w) t += ' '; return t; }
function ipBrief(T) {
  var o = pad('Interface', 23) + pad('IP-Address', 16) + pad('Status', 22) + 'Protocol\n';
  o += pad('GigabitEthernet' + T.up.port.slice(2), 23) + pad(!isTrunk(T) && T.up.routed ? T.up.ip : 'unassigned', 16) + pad('up', 22) + 'up\n';
  T.vlans.forEach(function (v) { var st = sviState(T, v); o += pad('Vlan' + v.id, 23) + pad(v.svi, 16) + pad(st === 'admin' ? 'administratively down' : 'up', 22) + (st === 'up' ? 'up' : 'down') + '\n'; });
  if (isTrunk(T)) { var ts = transitState(T); o += pad('Vlan' + T.up.tv, 23) + pad(T.up.ip, 16) + pad(ts === 'admin' ? 'administratively down' : 'up', 22) + (ts === 'up' ? 'up' : 'down') + '\n'; }
  return o.replace(/\n$/, '');
}
function showRoute(T) {
  var r = routes(T);
  if (r === null) return T.sw + '# show ip route\nDefault gateway is not set\n\n(ip routing ist aus – der Switch arbeitet nur auf Layer 2)';
  var d = r.filter(function (x) { return x.k === 'S*'; })[0], o = T.sw + '# show ip route\n';
  o += d ? 'Gateway of last resort is ' + d.nh + ' to network 0.0.0.0\n\n' : 'Gateway of last resort is not set\n\n';
  if (d) o += 'S*    0.0.0.0/0 [1/0] via ' + d.nh + '\n';
  r.filter(function (x) { return x.k === 'C'; }).sort(function (a, b) { return n(a.net) - n(b.net); }).forEach(function (x) {
    var ifn = x.via.indexOf('Gi') === 0 ? 'GigabitEthernet' + x.via.slice(2) : x.via;
    o += 'C        ' + x.net + '/' + x.p + ' is directly connected, ' + ifn + '\nL        ' + x.own + '/32 is directly connected, ' + ifn + '\n';
  });
  return o.replace(/\n$/, '');
}
function rtOptions(T) {
  var o = T.vlans.map(function (v) { return ['v' + v.id, 'C  ' + v.net + '/24 – Vlan' + v.id]; });
  o.push(['up', 'C  ' + T.up.net + '/30 – ' + upIf(T)]);
  o.push(['def', 'S* 0.0.0.0/0 via ' + (T.def || T.up.rip)]);
  o.push(['none', 'gar keine Routen – ip routing fehlt']);
  return o;
}
function pingTxt(q) { return q[1] === 'INET' ? q[0] + ' → Internet (' + INET + ')' : q[0] + ' → ' + q[1]; }

/* ---------- Zeichnen ---------- */
function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
function tx(x, y, t, o) { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.a || 'middle') + '" font-size="' + (o.fs || 13) + '" font-weight="' + (o.fw || 400) + '" fill="' + (o.c || '#1c2b33') + '" font-family="' + (o.mono ? 'ui-monospace,Menlo,Consolas,monospace' : 'Open Sans,Arial,sans-serif') + '"' + (o.halo ? ' stroke="#fbfcfd" stroke-width="5" stroke-linejoin="round" paint-order="stroke"' : '') + '>' + esc(t) + '</text>'; }
function layout(T) {
  var np = T.pcs.length, gap = 136, W = Math.max(760, np * gap + 60), pos = {INET: [W / 2 - 230, 52], R1: [W / 2, 72], SW: [W / 2, 250]};
  T.pcs.forEach(function (p, i) { pos[p.name] = [W / 2 + (i - (np - 1) / 2) * gap, 450]; });
  return {W: W, H: 545, pos: pos};
}
/* opt: {path:[...Knoten], svis:[VLAN-IDs], hideState} */
function draw(T, opt) {
  opt = opt || {};
  var L = layout(T), P = L.pos, o = ['<svg viewBox="0 0 ' + L.W + ' ' + L.H + '" role="img" aria-label="Topologie mit Layer-3-Switch ' + T.sw + '">'];
  var path = opt.path || [], hot = function (a, b) { for (var i = 0; i + 1 < path.length; i++) if ((path[i] === a && path[i + 1] === b) || (path[i] === b && path[i + 1] === a)) return true; return false; };
  function line(a, b, col, w, dash) { o.push('<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="7 5"' : '') + ' stroke-linecap="round"/>'); }
  function xmark(x, y) { o.push('<g transform="translate(' + x + ' ' + y + ')"><circle r="11" fill="#c62828"/><path d="M-4.5 -4.5l9 9M4.5 -4.5l-9 9" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></g>'); }
  var HOT = '#f9a825';
  /* Internet */
  if (hot('INET', 'R1')) line(P.INET, P.R1, HOT, 9);
  line(P.INET, P.R1, '#1c2b33', 2.5, true);
  o.push('<g transform="translate(' + P.INET[0] + ' ' + P.INET[1] + ')"><path d="M-48 14a20 20 0 0 1 6-36a26 26 0 0 1 46-8a20 20 0 0 1 36 12a17 17 0 0 1 -4 32z" fill="#eef3f7" stroke="#78909c" stroke-width="1.5"/></g>' + tx(P.INET[0] + 2, P.INET[1] + 4, 'Internet', {fs: 14, fw: 700, c: '#455a64'}));
  /* Uplink */
  var upc = '#1c2b33';
  if (hot('R1', 'SW')) line(P.R1, P.SW, HOT, 9);
  line(P.R1, P.SW, upc, isTrunk(T) ? 5 : 3);
  if (isTrunk(T)) {
    o.push('<line x1="' + P.R1[0] + '" y1="' + (P.R1[1] + 20) + '" x2="' + P.SW[0] + '" y2="' + (P.SW[1] - 34) + '" stroke="#fbfcfd" stroke-width="1.6"/>');
    var subs = ['Gi0/0.' + T.up.tv + ' · ' + T.up.rip].concat(T.vlans.filter(function (v) { return v.nosvi; }).map(function (v) { return 'Gi0/0.' + v.id + ' · ' + v.svi; }));
    subs.forEach(function (t, i) { o.push(tx(P.R1[0] + 14, P.R1[1] + 50 + i * 17, t, {a: 'start', fs: 12.5, mono: 1})); });
    o.push(tx(P.SW[0] + 14, P.SW[1] - 52, T.up.port + ' · Trunk' + (T.up.allowed && !opt.hideState ? ' (' + T.up.allowed.join(',') + ')' : ''), {a: 'start', fs: 12.5, mono: 1, fw: 700}));
    o.push(tx(P.R1[0] - 14, (P.R1[1] + P.SW[1]) / 2 + 4, T.up.net + '/30 in VLAN ' + T.up.tv, {a: 'end', fs: 12.5, c: '#546e7a'}));
  } else {
  o.push(tx(P.R1[0] + 14, P.R1[1] + 66, 'Gi0/0 · ' + T.up.rip, {a: 'start', fs: 12.5, mono: 1}));
  o.push(tx(P.SW[0] + 14, P.SW[1] - 52, T.up.port + ' · ' + (opt.hideState ? T.up.ip : T.up.routed ? T.up.ip : 'Layer-2-Port!'), {a: 'start', fs: 12.5, mono: 1, c: T.up.routed || opt.hideState ? '#1c2b33' : '#c62828', fw: T.up.routed || opt.hideState ? 400 : 700}));
  o.push(tx(P.R1[0] - 14, (P.R1[1] + P.SW[1]) / 2 + 4, T.up.net + '/30', {a: 'end', fs: 12.5, c: '#546e7a'}));
  }
  /* PCs */
  T.pcs.forEach(function (p) {
    var q = P[p.name], v = vlan(T, p.vlan), col = VCOL[v.col], sx = P.SW[0] + (q[0] - P.SW[0]) * 0.42, a = [sx, P.SW[1] + 34];
    if (hot('SW', p.name)) line(a, [q[0], q[1] - 30], HOT, 9);
    var sh = p.shut && !opt.hideState;
    line(a, [q[0], q[1] - 30], col, 2.5, sh);
    if (sh) xmark((a[0] + q[0]) / 2, (a[1] + q[1] - 30) / 2);
    o.push(tx(q[0], q[1] - 40, p.port, {fs: 12, mono: 1, c: '#455a64', halo: 1}));
    o.push('<g transform="translate(' + q[0] + ' ' + q[1] + ')"><rect x="-24" y="-28" width="48" height="33" rx="3" fill="#fff" stroke="' + col + '" stroke-width="2.5"/><rect x="-18" y="-23" width="36" height="23" fill="' + col + '" opacity=".18"/><path d="M-10 9h20M0 5v4" stroke="' + col + '" stroke-width="2.5"/></g>');
    o.push(tx(q[0], q[1] + 30, p.name, {fs: 15, fw: 700}));
    o.push(tx(q[0], q[1] + 47, p.ip + '/24', {fs: 12, mono: 1}));
    o.push(tx(q[0], q[1] + 63, 'GW ' + p.gw, {fs: 12, mono: 1, c: '#546e7a'}));
    o.push('<rect x="' + (q[0] - 31) + '" y="' + (q[1] + 70) + '" width="62" height="18" rx="9" fill="' + col + '"/>' + tx(q[0], q[1] + 83, 'VLAN ' + p.vlan, {fs: 11.5, fw: 700, c: '#fff'}));
  });
  /* R1 */
  o.push('<g transform="translate(' + P.R1[0] + ' ' + P.R1[1] + ')"><ellipse cx="0" cy="9" rx="34" ry="12" fill="#1f5872"/><rect x="-34" y="-9" width="68" height="18" fill="#2f7392"/><ellipse cx="0" cy="-9" rx="34" ry="12" fill="#5a9dbb" stroke="#1f5872"/><path d="M-17 -9h11M6 -9h11M-1 -17v6M-1 -7v6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></g>' + tx(P.R1[0] + 46, P.R1[1] + 5, 'R1', {a: 'start', fs: 16, fw: 700}));
  /* L3-Switch mit SVIs */
  var pills = T.vlans.map(function (v) { return {id: v.id, col: VCOL[v.col], ip: v.svi, st: v.nosvi ? 'nosvi' : sviState(T, v), nosvi: v.nosvi}; });
  if (isTrunk(T)) pills.push({id: T.up.tv, col: '#455a64', ip: T.up.ip, st: transitState(T)});
  var nv = pills.length, bw = Math.max(250, nv * 96 + 40), sw = P.SW;
  o.push('<rect x="' + (sw[0] - bw / 2) + '" y="' + (sw[1] - 34) + '" width="' + bw + '" height="76" rx="8" fill="#e8f0fe" stroke="#1c2b33" stroke-width="1.6"/>');
  o.push(tx(sw[0] - bw / 2 + 12, sw[1] - 14, T.sw, {a: 'start', fs: 16, fw: 700}) + tx(sw[0] + bw / 2 - 12, sw[1] - 14, 'Layer-3-Switch' + (opt.hideState ? '' : T.routing ? ' · ip routing' : ' · ohne ip routing!'), {a: 'end', fs: 11.5, c: T.routing || opt.hideState ? '#546e7a' : '#c62828'}));
  var svis = opt.svis || [];
  pills.forEach(function (v, i) {
    var x = sw[0] + (i - (nv - 1) / 2) * 96, col = v.col, on = svis.indexOf(v.id) >= 0;
    if (v.nosvi) { o.push('<rect x="' + (x - 44) + '" y="' + (sw[1] - 2) + '" width="88" height="34" rx="6" fill="#f3f5f7" stroke="#b0bec5" stroke-dasharray="4 3"/>' + tx(x, sw[1] + 12, 'VLAN ' + v.id, {fs: 12, fw: 700, c: col}) + tx(x, sw[1] + 26, 'keine SVI', {fs: 11, c: '#78909c'})); return; }
    var dim = !opt.hideState && v.st !== 'up';
    o.push('<rect x="' + (x - 44) + '" y="' + (sw[1] - 2) + '" width="88" height="34" rx="6" fill="' + (on ? '#fff59d' : '#fff') + '" stroke="' + col + '" stroke-width="' + (on ? 3 : 2) + '"' + (dim ? ' stroke-dasharray="4 3" opacity=".75"' : '') + '/>');
    o.push(tx(x, sw[1] + 12, 'Vlan' + v.id, {fs: 12, fw: 700, c: col}) + tx(x, sw[1] + 26, '.' + v.ip.split('.')[3], {fs: 11.5, mono: 1}));
  });
  o.push('</svg>');
  return o.join('');
}

G.L3 = {isTrunk: isTrunk, transitState: transitState, transitWhy: transitWhy, LVNAME: LVNAME, VCOL: VCOL, INET: INET, makeTask: makeTask, answers: answers, reach: reach, sviState: sviState, routes: routes, routeKeys: routeKeys,
  stTxt: stTxt, sviWhy: sviWhy, cfgSW: cfgSW, cfgR1: cfgR1, ipBrief: ipBrief, showRoute: showRoute, rtOptions: rtOptions, pingTxt: pingTxt, draw: draw, vlan: vlan, pc: pc, clone: clone, mask: mask};
})(typeof window !== 'undefined' ? window : globalThis);
