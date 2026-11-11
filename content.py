"""Inhalte der AECP-Plattform.

Neues Thema online stellen: fertige Seite als tools/<name>.html ablegen
und beim Thema "tool": "<name>" eintragen. Themen ohne "tool" erscheinen als „in Vorbereitung“.
"""

SITE = {
    'name': 'AECP',
    'domain': 'nwt.joergzambo.com',
    'claim': 'Analyze · Explain · Configure · Practice',
    'description': 'AECP – Netzwerktechnik lernen mit Animationen, Erklärungen und Übungen: Switching, Routing, IP-Services und Netzwerksicherheit.',
    'intro': '<strong>Analyze</strong> – Topologien durchschauen. <strong>Explain</strong> – verstehen, warum das Netz so entscheidet. '
             '<strong>Configure</strong> – selbst Hand anlegen. <strong>Practice</strong> – üben, bis es sitzt. '
             'Vom OSI-Modell bis zu Angriffen im LAN, mit Animationen, Lösungen zum Aufklappen und Zufallsgenerator.',
    'news': ['<strong>Neu:</strong> <a href="ip-services/dhcp/">DHCP und ip helper-address</a> – DORA-Ablauf als Animation und Übungen zum DHCP-Relay. '
             'Außerdem <a href="grundlagen/ethernet-switching/">Ethernet und Switching</a> – MAC-Learning zum Ausprobieren, mit ARP und Windows-Eingabeaufforderung. '
             'Außerdem <a href="grundlagen/subnetting/">Subnetting und VLSM</a> und <a href="grundlagen/supernetting/">Supernetting</a> – mit VLSM-Erklärung für eigene Beispiele. '
             'Außerdem <a href="routing/statisches-routing/">Statisches Routing</a> – ip route-Befehle zusammenstecken, eintippen und prüfen lassen. '
             'Außerdem <a href="routing/rip/">RIP</a> – welche Netze in die network-Befehle gehören, mit Übungen und Zufallsgenerator. '
             'Außerdem <a href="grundlagen/collision-broadcast-domains/">Collision und Broadcast Domains</a> – Domains im Netzplan einkreisen, mit Zufallsgenerator. '
             'Außerdem <a href="grundlagen/osi-modell/">Das OSI-Modell zum Ziehen</a> – Schichten, PDUs, Geräte und Protokolle zuordnen, mit Lückentext-Generator. '
             'Außerdem <a href="routing/inter-vlan-routing/">Inter-VLAN-Routing</a> – Paketweg Schritt für Schritt und Fehlersuche in echten Configs. '
             'Außerdem <a href="switching/vlan/">VLANs und Trunking</a> – Broadcasts verfolgen, 802.1Q-Tags verstehen, '
             'Native-VLAN-Mismatch entdecken. Dazu <a href="switching/spanning-tree/">Spanning Tree und RSTP</a> mit 50 Übungen.'],
}

AREAS = [
    {'slug': 'grundlagen', 'title': 'Grundlagen', 'text': 'Schichtenmodelle, Adressierung und wie Daten im LAN unterwegs sind.',
     'topics': [
         {'slug': 'osi-modell', 'title': 'Das OSI- und TCP/IP-Modell', 'tool': 'osi-modell',
          'text': 'Schichten, PDUs, Geräte und Protokolle per Drag-and-Drop zuordnen – plus Lückentext-Generator, Eselsbrücken und Kapselung.'},
         {'slug': 'subnetting', 'title': 'Subnetting und VLSM', 'tool': 'subnetting',
          'text': 'Subnetzmaske, Netz- und Broadcastadresse, gleich große Subnetze und VLSM – mit eigenem Beispiel Schritt für Schritt erklärt.'},
         {'slug': 'supernetting', 'title': 'Supernetting', 'tool': 'supernetting',
          'text': 'Netze zu einer Route zusammenfassen – binär erklärt, mit Übungen und Zufallsgenerator.'},
         {'slug': 'collision-broadcast-domains', 'title': 'Collision und Broadcast Domains', 'tool': 'collision-broadcast-domains',
          'text': 'Hub, Switch oder Router – wer trennt was? Domains im Netzplan einkreisen, mit 18 Übungen und Zufallsgenerator.'},
         {'slug': 'ethernet-switching', 'title': 'Ethernet und Switching', 'tool': 'ethernet-switching',
          'text': 'Ethernet-Frame, MAC-Adressen und MAC-Learning: Frames senden, ARP mitspielen, Switch-Tabellen beobachten – mit Übungen.'},
     ]},
    {'slug': 'switching', 'title': 'Switching', 'text': 'Redundanz ohne Schleifen und logische Trennung im LAN.',
     'topics': [
         {'slug': 'spanning-tree', 'title': 'Spanning Tree und RSTP', 'tool': 'spanning-tree',
          'text': 'Root Bridge, Root Port, Designated Port – mit Animation, 50 Übungen und Zufallsgenerator.'},
         {'slug': 'vlan', 'title': 'VLANs und Trunking', 'tool': 'vlan',
          'text': 'Access- und Trunk-Ports, 802.1Q-Tags und native VLAN – zum Ausprobieren, mit 30 Übungen und Zufallsgenerator.'},
     ]},
    {'slug': 'routing', 'title': 'Routing', 'text': 'Wie Pakete zwischen Netzen ihren Weg finden.',
     'topics': [
         {'slug': 'inter-vlan-routing', 'title': 'Inter-VLAN-Routing', 'tool': 'inter-vlan-routing',
          'text': 'Router-on-a-Stick und Layer-3-Switch – Schritt für Schritt, mit Fehlersuche-Übungen und Zufallsgenerator.'},
         {'slug': 'statisches-routing', 'title': 'Statisches Routing', 'tool': 'statisches-routing',
          'text': 'ip route: Welches Zielnetz, welche Maske, welcher Next Hop? Mit Erklärung am Plan, Zusammenstecken, Baukasten und Zufallsgenerator.'},
         {'slug': 'rip', 'title': 'RIP', 'tool': 'rip',
          'text': 'Welche Netze kommen in die network-Befehle? Schritt für Schritt erklärt, mit Übungen, Tipps und Zufallsgenerator.'},
     ]},
    {'slug': 'ip-services', 'title': 'IP-Services', 'text': 'Dienste, die ein Netz erst benutzbar machen.',
     'topics': [
         {'slug': 'nat', 'title': 'NAT und PAT', 'text': 'Private Adressen ins Internet übersetzen.'},
         {'slug': 'dhcp', 'title': 'DHCP und ip helper-address', 'tool': 'dhcp',
          'text': 'DORA als Animation, DHCP-Relay mit giaddr – und wo der Helper hin muss. Mit Übungen und Zufallsgenerator.'},
     ]},
    {'slug': 'netzwerksicherheit', 'title': 'Netzwerksicherheit', 'text': 'Angriffe im LAN verstehen und abwehren.',
     'topics': [
         {'slug': 'arp-spoofing', 'title': 'ARP-Spoofing', 'text': 'Man-in-the-Middle im LAN und Dynamic ARP Inspection.'},
         {'slug': 'dhcp-starvation', 'title': 'DHCP-Starvation', 'text': 'Den Adresspool leeren – und mit DHCP Snooping schützen.'},
         {'slug': 'stp-angriff', 'title': 'Angriff auf die Root Bridge', 'text': 'Gefälschte BPDUs und BPDU Guard / Root Guard.'},
         {'slug': 'rip-authentifizierung', 'title': 'RIP-Authentifizierung', 'text': 'Gefälschte Routing-Updates verhindern.'},
     ]},
]
