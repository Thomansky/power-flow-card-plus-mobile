# Power Flow Card Plus Mobile

> **Vibe-coded.** Diese Karte ist vollständig im Dialog mit einem KI-Assistenten
> entstanden — Entwurf, Code, Tests und diese Zeilen.

> **Eigenständiges Projekt.** Trotz des ähnlichen Namens hat diese Karte nichts
> mit [power-flow-card-plus](https://github.com/flixlix/power-flow-card-plus) zu
> tun: kein gemeinsamer Code, kein gemeinsamer Autor, und von dort gibt es auch
> keinen Support dafür. Die Menüführung des Editors ist dem Vorbild bewusst
> nachempfunden — das ist die ganze Verbindung. Fehler bitte **hier** melden.

Eine Lovelace-Karte für Home Assistant, die den Energiefluss als Graph zeichnet –
gebaut für Handybildschirme.

Anders als die meisten Energiefluss-Karten kann sie **zwei Batteriespeicher**
getrennt darstellen und blendet **Wallboxen und Autos nur ein, wenn wirklich
geladen wird**. Bis zu vier Wallboxen lassen sich einrichten; angezeigt werden
immer die zwei, die gerade am meisten ziehen — mit dem jeweiligen Auto darunter.

Eine Datei, kein Build-Schritt, keine Abhängigkeiten.

[![Als benutzerdefiniertes Repository in HACS öffnen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Thomansky&repository=power-flow-card-plus-mobile&category=Dashboard)

---

## Wie es aussieht

<img src="https://raw.githubusercontent.com/Thomansky/power-flow-card-plus-mobile/main/docs/images/karte-handy.jpg" alt="Die Karte auf einem Handybildschirm" width="420">

Ein hoher, schmaler Graph, der die Bildschirmhöhe ausnutzt statt sie zu
verschenken. Die Linien sind so dick wie der Fluss stark ist und laufen in
Flussrichtung. Netz, Verteilknoten und Zuhause stehen auf einer Höhe; Ringe
zeigen Ladestände.

**Die beiden Kugeln in der Mitte** zeigen zwei Summen:

* die **obere** die Erzeugung – alles, was Deine Quellen gerade liefern
* die **untere** den Durchsatz – alles, was am Verteilknoten hineinfließt:
  Erzeugung, Netzbezug und Speicherentladung zusammen

Bei reiner Eigenversorgung stehen dort dieselben Zahlen. Beziehst Du Strom oder
entlädt ein Speicher, ist die untere größer.

Was darunter abfließt – Haus, Wallboxen, Speicherladung, Einspeisung – sollte
dieselbe Summe ergeben. Tut es das nicht, fehlt in der Messung etwas: typisch
sind Wandlungsverluste, Eigenverbrauch der Wechselrichter oder Sensoren, die
nicht im selben Moment aktualisieren. Ein paar Prozent sind normal.

---

## Einbauen

### Über HACS

Am schnellsten über diesen Knopf – er öffnet HACS in Deinem Home Assistant
und trägt das Repository gleich ein:

[![Als benutzerdefiniertes Repository in HACS öffnen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Thomansky&repository=power-flow-card-plus-mobile&category=Dashboard)

Von Hand geht es genauso:

1. HACS → ⋮ → *Benutzerdefinierte Repositories*
2. Diese Repository-Adresse eintragen, Kategorie **Dashboard**
3. Installieren, danach das Frontend hart neu laden

HACS legt die Datei unter `<config>/www/community/power-flow-card-plus-mobile/` ab
und trägt die Ressource selbst ein. Läuft Dein Lovelace im YAML-Modus,
passiert das nicht automatisch – dann selbst eintragen:

```yaml
lovelace:
  resources:
    - url: /hacsfiles/power-flow-card-plus-mobile/power-flow-card-plus-mobile.js
      type: module
```

### Von Hand

1. `power-flow-card-plus-mobile.js` nach `config/www/` kopieren
2. Einstellungen → Dashboards → ⋮ → *Ressourcen* → Ressource hinzufügen:
   - URL `/local/power-flow-card-plus-mobile.js?v=1`
   - Typ **JavaScript-Modul**
3. Seite hart neu laden

Gibt es den Ordner `www` noch nicht, leg ihn an und starte Home Assistant
einmal neu – die Adresse `/local/` wird nur beim Start registriert. Beim
Weiterentwickeln das `?v=1` hochzählen, sonst hält der Browser an der alten
Fassung fest.

---

## Einrichten

Am einfachsten über den **visuellen Editor**: Karte hinzufügen, *Power Flow Card
Plus Mobile* wählen. Du bekommst ein Menü, aus dem Du in Unterseiten abtauchst:

| | zeigt |
|---|---|
| **Erzeugung** | bis zu 4 Quellen, je mit Name, Symbol, Farbe und Sensoren |
| **Netz** | Umschalter *ein Sensor* / *zwei getrennte*, Symbol, beide Farben |
| **Zuhause** | Hausverbrauch, Symbol, Farbe |
| **Speicher** | bis zu 2, je mit Umschalter für die Sensor-Bauart, dazu die Speicherfarbe |
| **Wallboxen** | bis zu 4, je mit ihrem Auto, dazu Wallbox- und Autofarbe |
| **Darstellung** | Überschrift, Schwelle, Höhe, Schalter |

Rechts in jeder Menüzeile steht, was dort schon eingerichtet ist. Listeneinträge
lassen sich ein- und ausklappen.

Wer lieber YAML schreibt, kann das weiterhin – Editor und Textfassung
beschreiben dieselbe Konfiguration.

> Die Entitätsauswahl filtert **nur nach Domäne**, nicht nach `device_class`.
> Das ist Absicht: Viele Integrationen und praktisch alle selbstgebauten
> Template- und Summensensoren setzen gar keine `device_class`, und ein
> strenger Filter würde ausgerechnet die verstecken.

### Minimal

```yaml
type: custom:power-flow-card-plus-mobile
pv: sensor.pv_leistung
grid: sensor.netz_leistung
house: sensor.hausverbrauch
```

### Vollständig

```yaml
type: custom:power-flow-card-plus-mobile
title: Energiefluss

pv: sensor.solarproduktion
external: sensor.zusaetzliche_einspeisung   # weglassen, wenn nicht vorhanden
grid: sensor.netzleistung                   # positiv = Bezug
house: sensor.hausverbrauch

batteries:
  - name: Speicher Keller
    icon: mdi:home-battery
    charge: sensor.speicher1_laden          # oder: power: sensor.speicher1
    discharge: sensor.speicher1_entladen
    soc: sensor.speicher1_ladestand
  - name: Speicher Garage
    power: sensor.speicher2_leistung        # ein Sensor mit Vorzeichen
    soc: sensor.speicher2_ladestand

wallboxes:
  - name: Garage
    icon: mdi:ev-station
    power:                                  # mehrere werden addiert
      - sensor.wallbox_garage_netz
      - sensor.wallbox_garage_sonne
    car: sensor.auto1_ladestand             # das Auto an dieser Wallbox
    car_name: Kombi
    car_icon: mdi:car-electric
  - name: Carport
    power: sensor.wallbox_carport_leistung

icons:
  pv: mdi:solar-power-variant
  grid: mdi:transmission-tower
  house: mdi:home

# Optional: gemessene Werte statt gerechneter, beides in Prozent.
autarky: sensor.autarkie
self_consumption: sensor.eigenverbrauch

colors:
  pv: "#FFA800"
  grid_import: red        # Theme-Farbe von Home Assistant
  battery: auto           # auto = folgt dem Ladestand
```

### Alle Einstellungen

| Feld | Vorgabe | Bedeutung |
|---|---|---|
| `sources` | `[]` | Bis zu vier Erzeugungsquellen. Je `power` (auch Liste), `name`, `icon`, `color`. |
| `pv`, `external` | – | Ältere Schreibweise, wird auf die ersten beiden Quellen abgebildet. |
| `grid` | – | Netzleistung, positiv = Bezug. Auch als Paar `consumption`/`production`. |
| `house` | – | Hausverbrauch gesamt |
| `autarky` | – | Optional: eigener Sensor in % statt der Rechnung |
| `self_consumption` | – | Optional: eigener Sensor in % statt der Rechnung |
| `batteries` | `[]` | Höchstens zwei. Je `power` **oder** `charge`+`discharge`, dazu `soc`, `name`, `icon`, `included_in_house`. |
| `wallboxes` | `[]` | Höchstens vier. Je `power` (auch Liste), `name`, `icon`, `included_in_house`, `plug`, `car`, `car_name`, `car_icon`. |
| `cars` | `[]` | Höchstens vier. Je `soc`, `name`, `icon`, `plug`, `power`. |
| `car_match` | `off` | Auto selbst zuordnen: `off`, `plug` oder `power`. Siehe unten. |
| `car_match_window` | `300` | Nur bei `plug`: wie weit die Steckerzeitpunkte auseinanderliegen dürfen (s) |
| `car_match_tolerance` | `0.25` | Nur bei `power`: wie stark die Leistungen abweichen dürfen (Anteil) |
| `icons` | – | Symbole für `pv`, `external`, `grid`, `house` |
| `colors` | – | Farben je Knoten, siehe unten |
| `invert_grid` | `false` | Umschalten, wenn Deine Integration Bezug negativ meldet |
| `invert_battery` | `false` | Umschalten, wenn Laden negativ gemeldet wird |
| `threshold` | `20` | Darunter gilt eine Wallbox als „lädt nicht" (W) |
| `animate` | `true` | Laufende Punkte auf den Linien |
| `show_tiles` | `true` | Kacheln für Autarkie, Eigenverbrauch, Speicher |
| `transparent` | `false` | Kartenhintergrund durchscheinen lassen. Text und Kacheln folgen dann dem Thema. |
| `house_mix` | `true` | Ring ums Haus nach Herkunft des Stroms einfärben |
| `car_mix` | `true` | Zweiter Ring im Auto nach Herkunft, solange geladen wird |
| `autarky_mix` | `true` | Autarkie-Balken nach Herkunft färben statt einfarbig |
| `min_height` | `460` | Wunschhöhe des Graphen in Pixeln |
| `title` | `Energiefluss` | Überschrift |

Die ältere Schreibweise mit einer eigenen `cars:`-Liste wird weiterhin gelesen
und der Reihe nach den Wallboxen zugeordnet.

---

## Erzeugung

Bis zu vier Quellen lassen sich einrichten – Dachflächen, ein zweiter
Wechselrichter, Wind, ein Blockheizkraftwerk. Sie stehen nebeneinander in der
obersten Reihe und laufen alle im Sammelknoten zusammen.

```yaml
sources:
  - name: Dach Süd
    icon: mdi:solar-power
    power: sensor.wechselrichter_sued
  - name: Dach Nord
    power:                       # mehrere Sensoren werden addiert
      - sensor.wechselrichter_nord_a
      - sensor.wechselrichter_nord_b
  - name: Wind
    icon: mdi:wind-turbine
    color: teal
```

Je mehr Quellen, desto enger und kleiner die Reihe: bei einer steht sie
mittig, bei zweien wie eh und je links und rechts, bei drei und vier rücken
sie zusammen. Wer nichts angibt, bekommt Namen und Symbole der Reihe nach
vorgegeben.

Die alte Schreibweise bleibt gültig:

```yaml
pv: sensor.solar
external: sensor.zusatz
```

Sie wird auf die ersten beiden Quellen abgebildet, samt `icons.pv`,
`icons.external`, `colors.pv` und `colors.external`. An bestehenden Karten
ist nichts zu ändern.

---

## Der Ring ums Haus

Der Ring um den Hausknoten ist nicht einfarbig, sondern in Bögen geteilt — einer
je Quelle, in deren eigener Farbe. Ziehst Du gerade 10 kW aus der Sonne und
10 kW aus dem Speicher, ist der Kreis halb gelb und halb in der Speicherfarbe.
Bis zu vier Bögen sind möglich: Sonne, zweite Quelle, Speicher, Netzbezug.

Wie die Anteile zustande kommen, ist wichtig zu wissen: Die Karte nimmt an, dass
das Haus aus **derselben Mischung schöpft wie die Anlage insgesamt**. Sie teilt
also die momentane Zufuhr — Erzeugung, Speicherentladung, Netzbezug — nach ihren
Anteilen auf. Das ist eine Aufteilung, keine Messung. Welches Elektron aus
welcher Quelle in welcher Lampe landet, weiß kein Zähler.

Was nicht mitzählt: Ein **ladender** Speicher ist keine Quelle, sondern
Verbraucher — er taucht im Ring nicht auf. Bleibt nichts übrig (nachts, alles
aus), bleibt der Ring einfarbig, statt einen leeren Kreis zu zeigen, der wie ein
Messwert aussähe.

Abschalten lässt sich das mit `house_mix: false` oder im Editor unter
*Darstellung → Hauskreis nach Herkunft färben*.

---

## Welches Auto hängt an welcher Wallbox?

Normalerweise steht das fest in der Konfiguration: `car:` an der Wallbox zeigt
auf den Ladestand des Autos, das dort hängt. Bei zwei Wallboxen und zwei Autos,
die mal so und mal so eingesteckt werden, ist das falsch, sobald jemand tauscht.

Deshalb kann die Karte die Zuordnung selbst suchen. Dazu die Autos einmal als
eigene Liste anlegen und `car_match` setzen. **Von Hand eingetragen schlägt
immer selbst gefunden** – wo ein `car:` steht, wird nicht gesucht, und das dort
genannte Auto ist für die Suche gesperrt.

### Über den Ladestecker

Wer zusammen eingesteckt wurde, gehört zusammen. Die Karte vergleicht, wann
sich der Steckerzustand an der Wallbox und der am Auto zuletzt geändert hat.

```yaml
car_match: plug
wallboxes:
  - power: sensor.wallbox_1_leistung
    name: Garage
    plug: binary_sensor.wallbox_1_kabel
  - power: sensor.wallbox_2_leistung
    name: Hof
    plug: binary_sensor.wallbox_2_kabel
cars:
  - soc: sensor.auto_a_ladestand
    name: Kombi
    plug: binary_sensor.auto_a_eingesteckt
  - soc: sensor.auto_b_ladestand
    name: Kleiner
    plug: binary_sensor.auto_b_eingesteckt
```

Der Steckersensor darf alles sein, was `on`/`off`, `true`/`false`,
`connected`/`disconnected`, `plugged`/`unplugged` oder ähnlich meldet. Was in
keines der beiden Lager fällt, gilt als *keine Aussage* – nicht als „nein".

Sensoren melden nicht im selben Augenblick; ein Auto, das seinen Zustand aus der
Cloud holt, hinkt schon mal Minuten hinterher. Der Spielraum liegt deshalb bei
fünf Minuten und lässt sich über `car_match_window` weiten.

### Über die Ladeleistung

Verglichen wird, was die Wallbox abgibt und was das Auto aufnimmt.

```yaml
car_match: power
wallboxes:
  - power: sensor.wallbox_1_leistung
    name: Garage
cars:
  - soc: sensor.auto_a_ladestand
    name: Kombi
    power: sensor.auto_a_ladeleistung
```

Beide Seiten müssen dieselbe Größe messen – zwei Leistungen oder zwei Ströme,
nicht eins von jedem. W, kW und MW rechnet die Karte um, Ampere gegen Watt geht
nicht auf. Die Wallbox misst am Kabel, das Auto hinter dem Laderegler; ein Rest
Unterschied bleibt immer, deshalb sind 25 % Abweichung erlaubt
(`car_match_tolerance`).

### Was dabei gilt

* **Entschieden wird einmal.** Steht die Zuordnung, bleibt sie – sonst springt
  sie mitten im Laden um, sobald ein zweites Auto zufällig ähnlich viel zieht.
  Gelöst wird erst, wenn das Kabel gezogen ist; ohne Steckersensor, wenn nichts
  mehr fließt.
* **Lieber kein Auto als das falsche.** Passt nichts innerhalb des Spielraums,
  bleibt der Autokreis leer.
* **Gesucht wird die beste Gesamtaufteilung**, nicht das beste Einzelpaar. Sonst
  nimmt die sicherste Paarung ein Auto weg, das anderswo das einzig mögliche war.
* Ohne `car_match` ändert sich nichts: die Autoliste wird dann wie bisher der
  Reihe nach den Wallboxen zugeteilt.

---

## Geräte hinter dem Hauszähler

Häufiger Fall: Die Wallbox hängt am selben Zähler wie das Haus. Sobald das Auto
lädt, steigt der Hausverbrauch mit — die Wallboxleistung steckt im Hauswert
schon drin. Ohne Gegenmaßnahme zeigt die Karte sie zweimal: einmal im Haus und
einmal im eigenen Zweig.

Dafür gibt es pro Speicher und pro Wallbox einen Schalter, im Editor
**„Hängt hinter dem Hauszähler"**, in YAML:

```yaml
wallboxes:
  - name: Garage
    power: sensor.wallbox_garage
    included_in_house: true     # steckt im Hauszähler drin

batteries:
  - name: Hausspeicher
    charge: sensor.speicher_laden
    discharge: sensor.speicher_entladen
    soc: sensor.speicher_soc
    included_in_house: true
```

Was dann passiert, an einem Beispiel: Der Hauszähler meldet 9,86 kW, die Wallbox
zieht 7,4 kW, der Speicher lädt mit 1,9 kW. Ohne Schalter stünden am Haus
9,86 kW und daneben nochmal 7,4 kW an der Wallbox. Mit Schalter steht am Haus,
was der Haushalt ohne Auto und ohne Speicher wirklich braucht: 0,56 kW. Die
Summe am Verteilknoten bleibt 9,86 kW, und die Rechnung geht auf.

Drei Dinge dazu:

* Der **Verteilknoten und die Autarkie** rechnen weiter mit dem, was der Zähler
  anzeigt. Das ist richtig so: hinter ihm steckt ja tatsächlich alles.
* Beim **Speicher zählt das Vorzeichen**. Laden erhöht den Zählerstand und wird
  abgezogen; Entladen senkt ihn und wird wieder draufgerechnet. Am Haus steht
  dann mehr, als der Zähler zeigt — denn der Speicher hat einen Teil geliefert.
* Abgezogen werden **alle markierten Wallboxen**, auch die gerade nicht
  gezeichneten. Der Zähler misst sie schließlich mit.

Hängt bei Dir alles am eigenen Zähler, lass den Schalter aus. Dann verhält sich
die Karte exakt wie vorher.

---

## Vorzeichen, oder: zwei getrennte Sensoren

Das ist die häufigste Fehlerquelle. Es gibt zwei Bauarten von Integrationen,
und die Karte versteht beide.

**Ein Sensor mit Vorzeichen:**

* **Netz:** positiv = Du beziehst, negativ = Du speist ein
* **Batterie:** positiv = lädt, negativ = entlädt

Ist es andersherum, dreh es um mit `invert_grid: true` bzw. `invert_battery: true`.

**Zwei getrennte Sensoren, die nie negativ werden.** Viele Integrationen –
E3/DC zum Beispiel – liefern gar keinen Sensor mit Vorzeichen:

```yaml
grid:
  consumption: sensor.bezug_aus_dem_netz     # positiv beim Beziehen
  production: sensor.einspeisung_ins_netz    # positiv beim Einspeisen

batteries:
  - charge: sensor.speicher_laden
    discharge: sensor.speicher_entladen
    soc: sensor.speicher_ladestand
```

Statt `consumption`/`production` gehen auch `import`/`export` oder
`from_grid`/`to_grid`. Bei dieser Schreibweise steckt die Richtung schon im
Sensor, deshalb werden `invert_grid` und `invert_battery` bewusst **nicht**
angewandt.

### Für E3/DC-Anlagen

Die verbreitete Integration ist [`torbennehmer/hacs-e3dc`](https://github.com/torbennehmer/hacs-e3dc)
(HA-Domain `e3dc_rscp`, spricht RSCP über TCP 5033, fragt alle 10 Sekunden ab).

Wichtig: **Alle Leistungssensoren dieser Integration sind niemals negativ.**
Sie legt getrennte Entitäten an – etwa `..._consumption_from_grid` und
`..._export_to_grid`, `..._battery_charge` und `..._battery_discharge`. Für
diese Anlage ist die geteilte Schreibweise oben also der Normalfall. Wende auf
diese Sensoren nie eine Vorzeichenkorrektur an.

Daneben gibt es zwei zusammengefasste Sensoren mit Vorzeichen –
`..._battery_net_change` (positiv = lädt) und `..._transfer_to_from_grid`
(positiv = Bezug). Die sind **standardmäßig abgeschaltet** und lassen sich in
Home Assistant unter der Integration aktivieren.

---

## Farben

```yaml
# Optional: gemessene Werte statt gerechneter, beides in Prozent.
autarky: sensor.autarkie
self_consumption: sensor.eigenverbrauch

colors:
  pv: "#FFA800"        # Hexwert
  external: orange     # Theme-Farbe von Home Assistant
  grid_import: "#FF6B6B"
  grid_export: "#D5DAE2"
  house: green
  battery: auto        # auto = folgt dem Ladestand (rot leer, grün voll)
  wallboxes: "#27E0A5" # eine Farbe für alle …
  cars:                # … oder eine je Eintrag
    - "#8E86FF"
    - "#D07BFF"
```

Erlaubt sind Hexwerte, CSS-Namen, die Theme-Farben von Home Assistant
(`primary`, `accent`, `blue`, `amber`, …) und `[r, g, b]`. Theme-Farben werden
beim Zeichnen zu einem festen Wert aufgelöst – in SVG-Präsentationsattributen
wird `var()` sonst nicht zuverlässig ersetzt, WebKit tut es, Chromium nicht.

---

## Einheiten

Kilowatt und Megawatt werden anhand des Attributs `unit_of_measurement`
automatisch in Watt umgerechnet. Hat ein Sensor kein Einheiten-Attribut, wird
Watt angenommen.

---

## Wenn etwas nicht angezeigt wird

Die Karte blendet oben einen Hinweis ein und trennt dabei zwei Fälle:

* **Unbekannt** – die entity_id gibt es in Home Assistant nicht. Meist ein Tippfehler.
* **Gerade nicht erreichbar** – die Entität existiert, meldet aber `unavailable`
  oder `unknown`. Meist ein Integrationsproblem.

Fehlende Werte werden als `–` gezeichnet, nicht als `0`. Eine Null soll immer
eine gemessene Null sein und nie ein fehlender Wert. Aus demselben Grund bleibt
die Autarkie leer, solange kein Hausverbrauch vorliegt.

Dass keine Wallbox zu sehen ist, ist **kein Fehler**: Es lädt gerade nichts.

---

## Grenzen

* Höchstens zwei Batteriespeicher, vier Wallboxen, davon zwei gleichzeitig sichtbar.
* Die Karte ist für hohe, schmale Flächen gebaut. Auf sehr breiten Bildschirmen
  bleibt links und rechts Rand – das ist Absicht, sonst zerfällt die Anordnung.
* Sie zeigt nur an. Steuern lässt sich damit nichts.

---

## Entwickeln

Zwei Prüfstände liegen bei, beide brauchen nur einen kleinen Webserver:

```bash
cd power-flow-card-plus-mobile && python3 -m http.server 8777
```

* `test/lokaler-test.html` – die Karte in neun Szenarien und drei Bildschirmgrößen,
  mit nachgebautem `hass`-Objekt
* `test/editor-test.html` – die Editor-Logik: Navigation, Listen, Umschalter,
  verlustfreie Hin- und Rückwandlung der Konfiguration

---

## Dank

Die Menüführung des visuellen Editors – Hauptmenü, Unterseiten, einklappbare
Listeneinträge – ist [power-flow-card-plus](https://github.com/flixlix/power-flow-card-plus)
von [@flixlix](https://github.com/flixlix) nachempfunden. Dort ist das sauber
gelöst, und es gab keinen Grund, es anders zu machen. Übernommen wurde nichts
als die Idee.

---

## Lizenz

MIT – siehe [LICENSE](LICENSE).

Kein Produkt von E3/DC. Der Name wird nur genannt, um zu beschreiben, womit die
Karte zusammenarbeitet.
