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
    'news': ['<strong>Neu:</strong> <a href="grundlagen/osi-modell/">Das OSI-Modell zum Ziehen</a> – Schichten, PDUs, Geräte und Protokolle zuordnen, mit Lückentext-Generator. '
             'Außerdem <a href="routing/inter-vlan-routing/">Inter-VLAN-Routing</a> – Paketweg Schritt für Schritt und Fehlersuche in echten Configs. '
             'Außerdem <a href="switching/vlan/">VLANs und Trunking</a> – Broadcasts verfolgen, 802.1Q-Tags verstehen, '
             'Native-VLAN-Mismatch entdecken. Dazu <a href="switching/spanning-tree/">Spanning Tree und RSTP</a> mit 50 Übungen.'],
}

AREAS = [
    {'slug': 'grundlagen', 'title': 'Grundlagen', 'text': 'Schichtenmodelle, Adressierung und wie Daten im LAN unterwegs sind.',
     'topics': [
         {'slug': 'osi-modell', 'title': 'Das OSI- und TCP/IP-Modell', 'tool': 'osi-modell',
          'text': 'Schichten, PDUs, Geräte und Protokolle per Drag-and-Drop zuordnen – plus Lückentext-Generator, Eselsbrücken und Kapselung.'},
         {'slug': 'ip-adressierung', 'title': 'IP-Adressierung und Subnetting', 'text': 'Netzanteil, Hostanteil, Subnetzmasken und CIDR rechnen.'},
         {'slug': 'ethernet-switching', 'title': 'Ethernet und Switching', 'text': 'MAC-Adressen, Frames und wie ein Switch lernt.'},
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
         {'slug': 'rip', 'title': 'RIP', 'text': 'Distanzvektor-Routing, Hop Count und Timer.'},
     ]},
    {'slug': 'ip-services', 'title': 'IP-Services', 'text': 'Dienste, die ein Netz erst benutzbar machen.',
     'topics': [
         {'slug': 'nat', 'title': 'NAT und PAT', 'text': 'Private Adressen ins Internet übersetzen.'},
         {'slug': 'dhcp', 'title': 'DHCP', 'text': 'Adressen automatisch vergeben: DORA, Pools und Relay.'},
     ]},
    {'slug': 'netzwerksicherheit', 'title': 'Netzwerksicherheit', 'text': 'Angriffe im LAN verstehen und abwehren.',
     'topics': [
         {'slug': 'arp-spoofing', 'title': 'ARP-Spoofing', 'text': 'Man-in-the-Middle im LAN und Dynamic ARP Inspection.'},
         {'slug': 'dhcp-starvation', 'title': 'DHCP-Starvation', 'text': 'Den Adresspool leeren – und mit DHCP Snooping schützen.'},
         {'slug': 'stp-angriff', 'title': 'Angriff auf die Root Bridge', 'text': 'Gefälschte BPDUs und BPDU Guard / Root Guard.'},
         {'slug': 'rip-authentifizierung', 'title': 'RIP-Authentifizierung', 'text': 'Gefälschte Routing-Updates verhindern.'},
     ]},
]
