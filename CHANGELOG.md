# Änderungen

Das Format folgt lose [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht]

## [1.8.0] – 2026-08-31

### Neu

* **Fließpunkte nach Herkunft färben** (`flow_mix`, im Editor unter
  *Darstellung*). Normalerweise wechselt ein Punkt am Sammelknoten die Farbe:
  oberhalb trägt er die seiner Quelle, unterhalb die des Weges. Eingeschaltet
  behält er **seine Herkunftsfarbe bis ans Ende** – ein Weg, auf dem Sonne und
  Speicher zusammenkommen, trägt Punkte in beiden Farben, nach Anteilen
  verteilt.

  Gezeichnet wird das als mehrere Bahnen mit demselben Punktmuster, nur
  verschoben – je Farbe eine. Die Punkte sitzen dadurch weiterhin gleichmäßig
  auf dem Weg und laufen im Gleichschritt; nur ihre Farbe wechselt von Punkt
  zu Punkt. Wer am weitesten hinter seinem Anteil liegt, bekommt den nächsten
  Punkt, damit die Farben abwechseln statt in Blöcken zu stehen.

  Betroffen ist alles, was aus einem Sammelknoten **heraus**fließt. Was selbst
  eine Herkunft **ist** – eine Quellleitung, ein entladender Speicher, ein
  Netzbezug – behält seine eine Farbe. Vorgabe ist aus.

### Behoben

* **Der Hilfetext unter dem Steckerfeld erschien nie.** Er war seit
  1.7.0-beta.2 versehentlich in den Konfigurationsblock geraten statt in die
  Hilfetabelle – syntaktisch gültig, deshalb fiel es nicht auf. Die Karte trug
  dadurch ein Feld `plug` mit dem Hilfetext als Wert mit sich herum. Beides ist
  jetzt an seinem Platz, und eine Prüfung hält fest, dass in der Konfiguration
  keine langen Texte stehen.

## [1.7.3] – 2026-08-31

### Geändert

* **Die Linien laufen jetzt radial in die Kreise**, zeigen also auf deren
  Mitte. Vorher trafen sie an schrägen Stellen quer auf den Rand – bei fünf
  Quellen etwa die beiden inneren, die senkrecht bei 215° und 325° ankamen.
  Dort lag die runde Kappe quer zum Ring und schmierte seitlich darüber: es
  sah aus wie ein aufgeklebter Fleck statt wie ein Anschluss.

  Kurz vor dem Kreis schwenkt die Linie deshalb auf die Radiale ein. Wo die
  Anfahrt ohnehin radial war – senkrecht von oben, waagerecht von der Seite –,
  ändert sich nichts. Betroffen sind die inneren Quellen bei vier und fünf
  Einträgen, die Speicher und der Strang zu den Ladespalten.

### Behoben

* **Die Länge einer Verbindung wird jetzt am Pfad gemessen statt nachgerechnet.**
  Die eigene Rechnung setzte rechte Winkel voraus; mit der Radialanfahrt sind
  die Ecken nicht mehr alle rechtwinklig, und das Punktraster passte nicht mehr
  ganzzahlig auf den Weg. Gemessen stimmt es immer, und eine Annahme weniger
  kann brechen.

## [1.7.2] – 2026-08-31

### Geändert

* **Der Abzweig zur linken Ladespalte läuft jetzt aus der Linie heraus statt
  im rechten Winkel abzuknicken.** Der Punkt, an dem sich die beiden Äste
  trennen, sitzt ein Stück **vor** der Spalte – dadurch bekommt der Ast einen
  Vorlauf, aus dem ein Bogen wird. Beide Äste laufen ein kurzes Stück
  gemeinsam und trennen sich dann, wie bei einer Weiche.

  Der Vorlauf ist genau doppelt so lang wie der Eckenradius: kürzer, und der
  Bogen würde auf die halbe Segmentlänge gekappt und bliebe eckig.

## [1.7.1] – 2026-08-31

### Entfernt

* **Die Einfärbung des Autarkie-Balkens nach Herkunft** (`autarky_mix`, seit
  1.6.0) ist wieder heraus. Sie zeigte die Mischung von **jetzt**, während die
  Zahl daneben meist aus einem Sensor kommt, der über den **Tag** rechnet –
  zwei Zeiträume in einem Balken. In 1.7.0-beta.7 hatte ich das noch
  auszubalancieren versucht, indem die Färbung nur bei eigener Rechnung greift.
  Das ist eine Regel, die man sich merken muss, für einen Nutzen, der klein
  ist. Der Balken ist jetzt schlicht einfarbig und zeigt den Wert der
  hinterlegten Entität. Die Einstellung in bestehenden Konfigurationen wird
  stillschweigend ignoriert.

### Neu

* **Die Karte findet selbst heraus, welches Auto an welcher Wallbox hängt.**
  Bisher stand das fest in der Konfiguration – bei zwei Wallboxen und zwei
  Autos, die mal so und mal so eingesteckt werden, war es falsch, sobald
  jemand tauschte. Neu ist `car_match` mit zwei Wegen:

  * `plug` – wer zusammen eingesteckt wurde, gehört zusammen. Verglichen wird,
    wann sich der Steckerzustand an Wallbox und Auto zuletzt geändert hat.
    Spielraum über `car_match_window`, Vorgabe fünf Minuten, weil ein Auto
    seinen Zustand schon mal verspätet aus der Cloud holt.
  * `power` – verglichen wird, was die Wallbox abgibt und das Auto aufnimmt.
    Spielraum über `car_match_tolerance`, Vorgabe 25 %, denn die Wallbox misst
    am Kabel und das Auto hinter dem Laderegler.

  Vorgabe ist `off`: ohne die Einstellung ändert sich nichts.

  Entschieden wird **einmal**, danach steht es. Sonst springt die Zuordnung
  mitten im Laden um, sobald ein zweites Auto zufällig ähnlich viel zieht.
  Gelöst wird erst, wenn das Kabel gezogen ist; ohne Steckersensor, wenn nichts
  mehr fließt. Passt nichts in den Spielraum, bleibt der Autokreis leer – lieber
  kein Auto als das falsche. Gesucht wird die beste Gesamtaufteilung, nicht das
  beste Einzelpaar: sonst nimmt die sicherste Paarung ein Auto weg, das anderswo
  das einzig mögliche war.

* **Die feste Zuordnung steht jetzt beim Auto**, nicht mehr nur an der Wallbox:
  je Auto eine Auswahl mit den angelegten Wallboxen (`wallbox:`, die Nummer in
  der Liste). Das ist die Richtung, in der man denkt – erst die Wallboxen
  einrichten, dann je Auto sagen, wo es hängt.

  Die Reihenfolge: was an der Wallbox unter `car:` steht, schlägt alles; dann
  die Wahl des Autos; dann die Suche. Weil das Erste alles schlägt, räumt der
  Editor eine alte Eintragung an der Wallbox weg, sobald ein Auto sich diese
  Wallbox aussucht – sonst bliebe die Wahl wirkungslos und niemand sähe, warum.
  Wird eine Wallbox entfernt, ziehen die Verweise der Autos mit.

* **Autos sind jetzt eine eigene Seite im Editor**, mit Ladestand, Name, Symbol,
  Wallbox, Steckerzustand und Ladeleistung; bis zu vier. Darunter steht, wie
  zugeordnet wird.
* **Wallboxen haben ein Feld für den Steckerzustand** (`plug`).

* **Antippen zeigt jetzt auch bei den Erzeugungsquellen den Wert.** Der Griff
  dafür las die Sensorangabe als Paar aus Bezug und Einspeisung, wie es Netz
  und Speicher haben. Bei einer Quelle steht dort aber eine Zeichenkette oder
  eine Liste – heraus kam nichts, und damit gab es gar keine Trefferfläche.
  Jetzt versteht er alle drei Schreibweisen; bei mehreren Sensoren je Quelle
  öffnet sich der erste.

* **Vorzeichen je Quelle umdrehbar.** Manche Wechselrichter melden ihre
  Erzeugung negativ. `invert: true` je Eintrag dreht den Wert um, im Editor
  „Vorzeichen umdrehen" – statt am Sensor herumzubauen.

* **Negative Werte bei Quellen bleiben stehen.** Zieht eine Quelle im
  Bereitschaftsbetrieb ein paar Watt, statt zu liefern, zeigt die Karte das
  jetzt: der Wert am Kreis bleibt negativ, und die Linie läuft zur Quelle hin
  statt von ihr weg. Vorher wurde bei null abgeschnitten – dort stand `0 W`
  und nichts erklärte es. In die Erzeugung zählt eine ziehende Quelle
  weiterhin nicht mit, und im Ring ums Haus taucht sie nicht auf.

* **Eine fünfte Erzeugungsquelle.** Die oberste Reihe fasst jetzt fünf Kreise.
  Die beiden äußeren laufen dabei seitlich in den Sammelknoten statt von oben:
  fächerten alle fünf über den oberen Bogen auf, lägen die waagerechten Stücke
  der äußeren und der inneren nur rund sieben Pixel übereinander – im Bild sähe
  das aus wie eine ausgefranste Linie, nicht wie zwei Wege. Gemessen wird das
  jetzt, in drei Formaten.

  Dazu eine fünfte Vorgabefarbe und ein fünftes Vorgabesymbol; vorher wiederholte
  sich ab der fünften die Farbe der ersten.

* **Bleibt nur eins übrig, wird sofort zugeordnet.** Ist am Ende genau eine
  Wallbox offen und genau ein Auto frei, gehören die beiden zusammen – dafür
  braucht es keine Prüfung mehr. Das erspart das Warten darauf, dass ein träger
  Sensor in den Spielraum fällt; gerade die Ladeleistung eines Autos kommt oft
  aus der Cloud. Meldet das Auto ausdrücklich, dass es nicht steckt, bleibt es
  draußen. Abschaltbar über `car_match_unique`.

### Geändert

* **Der Abzweig zur linken Ladespalte läuft nicht mehr zurück.** Der
  gemeinsame Strang gabelte sich mittig zwischen beiden Spalten, der linke Ast
  musste also wieder nach links zurück. Jetzt läuft der Strang einmal nach
  rechts durch, setzt unterwegs den Abzweig zur linken Spalte und endet an der
  rechten – eine Linie mit einem Abzweig statt einer Gabel mit Rückweg.

* **Zwei Ladespalten hängen jetzt an einem gemeinsamen Strang**, der sich erst
  kurz über den Wallboxen gabelt. Vorher liefen zwei getrennte Linien vom
  Verteilknoten bis dorthin fast deckungsgleich nebeneinander – das sah nach
  Fehler aus, nicht nach zwei Wegen. Der Strang trägt beide Ladeleistungen.

### Behoben

* **Ein hinterlegter, aber unlesbarer Sensor sah aus wie ein Messwert.** Ist
  `autarky` oder `self_consumption` gesetzt, der Sensor aber gerade nicht
  lesbar, rechnet die Karte weiter selbst – das war so gewollt, aber sie sagte
  es nicht. Man sah eine Zahl, hielt sie für den eigenen Sensor und wunderte
  sich über die Abweichung. Jetzt steht in dem Fall ein **≈** davor, und das
  Kästchen trägt einen Hinweis. Ohne hinterlegten Sensor ändert sich nichts:
  dort ist die Rechnung der Normalfall und braucht keine Kennzeichnung.
* **Ein Auto, das seine Wallbox nannte, konnte an einer anderen landen.** War
  der gewählte Platz schon belegt, warf die Suche es einfach woanders hin.
  „Hängt an dieser Wallbox" heißt aber nicht „notfalls auch an einer anderen".
* **Zwei Eingaben nacheinander im selben Formular – die erste ging verloren.**
  Das steckte mindestens seit 1.5.1 in jeder Fassung – nachgeprüft an 1.5.1
  und 1.6.1; ältere liegen nicht mehr vor. Damit beim Tippen der Eingabefokus
  nicht verlorengeht, zeichnet der Editor absichtlich nicht neu; dadurch blieb
  aber `ha-form` auf dem Datenstand von vorhin stehen, und weil es jede Eingabe
  auf diesem Stand aufbaut, warf die zweite die erste wieder heraus. Wer Name
  **und** Sensor eines Speichers hintereinander setzte, hatte danach nur den
  Sensor. Der Stand wird jetzt nachgezogen, ohne neu zu zeichnen.
* **Die Kopfzeile eines Listeneintrags blieb auf „Auto 2" stehen**, während im
  Namensfeld schon „Skoda" stand – dieselbe Ursache. Sie zieht jetzt beim
  Tippen mit. Nebenbei steht der Name dort nicht mehr als Markup, sondern als
  Text.
* **Der Steckerzustand ließ sich nicht auswählen.** Das Feld hing am
  Zahlenfilter, mit dem ein `binary_sensor` in der Auswahl gar nicht erst
  auftaucht. Es hat jetzt einen eigenen Filter für Zustandsentitäten.

### Weiterhin gültig

* `car:` an der Wallbox schlägt die selbsttätige Suche. Das dort genannte Auto
  ist für die Suche gesperrt und steht nicht plötzlich an zwei Kreisen.
* Ohne `car_match` wird die Autoliste wie bisher der Reihe nach den Wallboxen
  zugeteilt. Bestehende Karten müssen nichts ändern.

## [1.6.1] – 2026-08-22

### Behoben

* **Kurze Verbindungen waren keine Verbindungen, sondern Kleckse.** Der
  Punktabstand hing allein an der Linienstärke, nicht an der Weglänge. Auf
  den drei kurzen Wegen – mittlere Quelle zum Sammelknoten, Sammelknoten zum
  Verteilknoten, Verteilknoten zum Haus – war eine Punktperiode länger als
  der ganze Weg: zu sehen war ein einzelner fetter Fleck, bei der mittleren
  Quelle zeitweise gar nichts. Die Punkte sitzen jetzt in ganzen Perioden auf
  dem Weg, mindestens zwei, mit einer Lücke, die die runde Kappe übersteht.

  Dazu wird die Linienstärke auf ein Viertel der Weglänge gedeckelt. Genau
  ein Viertel, nicht weniger: schärfer gekappt würde eine starke Quelle dünner
  gezeichnet als eine schwache mit längerem Weg, und die Dicke löge.

* **Auf breiten Flächen saßen die Kreise aufeinander.** Die Kreise hängen an
  der Breite, die Abstände an der Höhe – wird die Fläche breit und flach,
  wachsen also die Kreise, während der Weg zwischen ihnen gleich bleibt. Bei
  einer einzigen Quelle blieben zwischen ihr und dem Sammelknoten **1,2
  Pixel**; zwischen Wallbox und Auto rund zehn. Die betroffenen Knotenreihen
  rutschen jetzt so weit, dass immer Luft bleibt: der Sammelknoten nach unten,
  die Wallbox nach oben, wo zum Verteilknoten ohnehin Platz ist.

  Auf hohen, schmalen Flächen – wofür die Karte gebaut ist – ändert sich
  nichts: dort waren die festen Werte schon die größeren.

## [1.6.0] – 2026-08-20

### Neu

* **Der Autarkie-Balken zeigt die Herkunft.** Statt einer Farbe je Quelle ein
  Stück in ihrer Farbe. Autarkie ist der Anteil ohne Netzbezug – der gefüllte
  Teil des Balkens lässt sich also genau nach den übrigen Quellen aufteilen,
  Netz kommt darin folgerichtig nicht vor. Abschaltbar über
  `autarky_mix: false`.

  Kommt die Autarkie aus einem eigenen Sensor, werden die Anteile auf die
  gemessene Länge gestreckt: die Zahl bleibt die gemessene, die Farben zeigen
  weiterhin das Verhältnis.

### Behoben

* **Auf hellem Dashboard blieben die Kugeln schwarz.** In 1.5.1 hatte ich nur
  die Kartenhülle ans Thema gehängt, den Graphen selbst nicht – schwarze
  Scheiben mit weißer Schrift auf weißem Grund. Jetzt drehen sich Füllung,
  Schrift, Symbole und Ringrinne mit: auf hellem Grund helle Kugeln mit
  dunkler Schrift.

  Erkannt wird das an der Textfarbe des Themas: ist sie dunkel, ist der
  Hintergrund hell. Das ist zuverlässiger, als den Hintergrund zu raten, den
  jedes Thema anders setzen kann. Bringt die Karte ihren eigenen dunklen Grund
  mit (`transparent: false`), bleibt alles dunkel – unabhängig vom Thema.

## [1.5.1] – 2026-08-19

### Behoben

* **Mit `transparent: true` war auf hellem Dashboard nichts zu lesen.**
  Überschrift, Gesamtwert und die drei Kacheln waren fest auf Weiß gesetzt,
  die Kachelflächen auf ein weißes Transparent – auf hellem Grund also
  unsichtbar. Alles außerhalb des Graphen folgt jetzt dem Thema
  (`--primary-text-color`, `--secondary-text-color`, `--divider-color`).

  Bringt die Karte ihren eigenen dunklen Grund mit (`transparent: false`,
  die Vorgabe), bleibt es unverändert bei Weiß. Die Kugeln sind innen immer
  dunkel, ihr weißer Text ist in beiden Fällen richtig.

## [1.5.0] – 2026-08-19

### Neu

* **Autarkie und Eigenverbrauch als eigene Sensoren.** Wer `autarky` oder
  `self_consumption` auf einen Prozentsensor zeigen lässt, bekommt dessen
  Wert in der Kachel statt der Schätzung der Karte. Viele Anlagen – E3/DC
  etwa – rechnen das selbst aus, und gemessen schlägt geschätzt. Im Editor
  stehen die beiden Felder unter *Darstellung* bei den Kacheln.

  Beides einzeln setzbar; was leer bleibt, rechnet die Karte weiter selbst.
  Ist ein hinterlegter Sensor gerade nicht erreichbar, fällt die Kachel auf
  die Rechnung zurück, statt leer zu bleiben. Werte außerhalb 0–100 % werden
  gekappt.

## [1.4.0] – 2026-08-19

### Geändert

* **Die mittlere Kugel zeigt jetzt den Durchsatz** statt des Hauszählers:
  Erzeugung + Netzbezug + Speicherentladung, also alles, was am Verteilknoten
  hineinfließt. Vorher stand dort der Hauszähler – eine ganz andere Größe als
  die Erzeugung darüber, was den Vergleich der beiden Kugeln sinnlos machte.
  Jetzt unterscheiden sie sich nur noch um das, was tatsächlich aus Netz und
  Speicher dazukommt.

  Bleibt eine Lücke zwischen der mittleren Kugel und der Summe der Abflüsse
  darunter, ist das eine Aussage über die Anlage, nicht über die Karte:
  Wandlungsverluste, Eigenverbrauch der Wechselrichter oder Sensoren, die
  nicht im selben Moment aktualisieren.

* **Die Autarkie rechnet unverändert mit dem Hauszähler**, nicht mit dem
  Durchsatz – sonst zählten Einspeisung und Speicherladung als Verbrauch mit.

* **Speicher werden einzeln verrechnet, nicht netto.** Entlädt einer, während
  der andere lädt, sind das zwei getrennte Flüsse; netto verrechnet wäre der
  kleinere spurlos verschwunden. Betrifft Durchsatz und Herkunftsring.

## [1.3.1] – 2026-08-19

### Behoben

* **Beim Hinzufügen einer Quelle verschwand die erste.** Stand in der
  Konfiguration noch die alte Schreibweise mit `pv` und `external`, legte der
  Editor beim Hinzufügen eine frische `sources`-Liste an – und weil die
  gegenüber `pv` gewinnt, war die erste Quelle plötzlich weg. Der Editor
  übernimmt `pv` und `external` jetzt als vollwertige Listeneinträge, samt
  ihrem Symbol und ihrer Farbe, und räumt die alte Schreibweise beim ersten
  Speichern ab. Die Kurzfassung im Hauptmenü zählt sie ebenfalls mit.

## [1.3.0] – 2026-08-19

### Neu

* **Bis zu vier Erzeugungsquellen** statt fest „Sonne" und „zweite Quelle".
  Neue Liste `sources:`, im Editor unter *Erzeugung*, je Eintrag mit Name,
  Symbol, Farbe und beliebig vielen Sensoren, die addiert werden. Die Reihe
  oben rückt zusammen und wird kleiner, je mehr Quellen es sind.
* **Zwei Speicherfarben**, wie beim Netz: `battery_charge` fürs Laden,
  `battery_discharge` fürs Entladen. Ohne Angabe gilt weiter die eine Farbe.
* **Herkunftsring am Auto.** Während geladen wird, zeigt ein zweiter, dünnerer
  Ring innen dieselbe Aufteilung wie am Haus – der Ladestand bleibt außen.
  Abschaltbar über `car_mix: false`.

### Geändert

* **Neue Vorgabefarben und -symbole**, übernommen aus einer laufenden Anlage:
  Sonne gelb, zweite Quelle Akzentfarbe, Netzbezug blau, Einspeisung cyan,
  Speicher rot; Symbole `mdi:solar-power`, `mdi:solar-power-variant`,
  `mdi:transmission-tower`, `mdi:home-assistant`. Es sind Themenfarben, die
  über `--<name>-color` aufgelöst werden – wer sein Thema umfärbt, färbt die
  Karte mit. Der Ladestandsverlauf am Speicher ist damit nicht mehr die
  Vorgabe; `battery: auto` holt ihn zurück.

### Weiterhin gültig

* `pv:` und `external:` werden gelesen und auf die ersten beiden Quellen
  abgebildet, samt `icons.pv`, `icons.external`, `colors.pv`, `colors.external`.
  Bestehende Karten müssen nichts ändern.

## [1.2.0] – 2026-08-19

### Neu

* **Der Ring ums Haus zeigt die Herkunft.** Statt einer Farbe je ein Bogen für
  Sonne, zweite Quelle, Speicher und Netzbezug, jeweils in deren eigener Farbe.
  Die Anteile ergeben sich aus der momentanen Zufuhr – eine Aufteilung, keine
  Messung. Ein ladender Speicher zählt nicht als Quelle. Abschaltbar über
  `house_mix: false`.

## [1.1.0] – 2026-08-19

### Neu

* **Geräte hinter dem Hauszähler.** Pro Speicher und pro Wallbox lässt sich
  angeben, dass ihre Leistung im Hausverbrauch schon enthalten ist
  (`included_in_house`, im Editor „Hängt hinter dem Hauszähler"). Die Karte
  rechnet sie dann aus dem Hauswert heraus, statt sie zweimal zu zeigen.
  Verteilknoten und Autarkie rechnen weiter mit dem Zählerwert.

### Geändert

* **Umbenannt** von „Powerflow Plus Mobile" zu **Power Flow Card Plus Mobile**.
  Betrifft Dateiname, Kartentyp (`custom:power-flow-card-plus-mobile`) und
  Repository. Wer die Vorgängerfassung installiert hatte, muss Ressource und
  `type:` im Dashboard einmal anpassen.
* **Farben stehen jetzt dort, wo die Geräte eingerichtet werden.** Speicher- und
  Wallboxfarben sind von der Sammelseite „Darstellung → Weitere Farben" auf die
  jeweilige Listenseite gewandert; die Sammelseite entfällt.
* **Beschriftungen der Farbfelder vereinheitlicht** — sie heißen jetzt „Farbe
  Sonne", „Farbe zweite Quelle" und so weiter, passend zu „Symbol Sonne".

## [1.0.0] – 2026-08-18

Erste Veröffentlichung.

### Enthalten

* Energiefluss als hoher, schmaler Graph, gebaut für Handybildschirme. Das
  Seitenverhältnis passt sich dem vorhandenen Platz innerhalb eines Korridors
  an, statt einen festen Rahmen zu erzwingen.
* **Zwei Batteriespeicher** getrennt darstellbar, jeder mit eigenem Ladestand
  und eigenem Symbol.
* **Bis zu vier Wallboxen** einrichtbar. Gezeichnet werden immer nur die zwei
  mit der höchsten Ladeleistung; lädt keine, bleibt der untere Bereich leer.
* **Autos** erscheinen nur, solange die zugehörige Wallbox lädt.
* **Getrennte Sensoren** für Netz und Speicher, wie sie E3/DC und andere
  liefern: `consumption`/`production` beziehungsweise `charge`/`discharge`,
  beide nie negativ. Ein einzelner Sensor mit Vorzeichen geht genauso.
* Mehrere Leistungssensoren pro Wallbox werden addiert – nützlich, wenn eine
  Box Netz- und Sonnenanteil getrennt meldet.
* **Visueller Editor** mit Hauptmenü und Unterseiten, einklappbaren Einträgen
  für Speicher und Wallboxen, freier Symbol- und Farbwahl.
* Fehlende Werte werden als `–` gezeichnet, nie als `0`.
* Eine Datei, kein Build-Schritt, keine Abhängigkeiten.

### Bekannte Grenzen

* Höchstens zwei Speicher und höchstens zwei gleichzeitig sichtbare Wallboxen.
* Auf sehr breiten Bildschirmen bleibt seitlich Rand – die Anordnung ist für
  hohe, schmale Flächen ausgelegt.
* Reine Anzeige, es lässt sich nichts steuern.

[Unveröffentlicht]: https://github.com/thomansky/power-flow-card-plus-mobile/compare/v1.8.0...HEAD
[1.8.0]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.8.0
[1.7.3]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.7.3
[1.7.2]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.7.2
[1.7.1]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.7.1
[1.6.1]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.6.1
[1.6.0]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.6.0
[1.5.1]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.5.1
[1.5.0]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.5.0
[1.4.0]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.4.0
[1.3.1]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.3.1
[1.3.0]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.3.0
[1.2.1]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.2.1
[1.2.0]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.2.0
[1.1.0]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.1.0
[1.0.0]: https://github.com/thomansky/power-flow-card-plus-mobile/releases/tag/v1.0.0
