# Prüfstände

Automatische Prüfungen der Karte, ohne Home Assistant. Jede Seite lädt die
Karte aus dem Repository, dann `pruef.js`, dann ihre eigenen Prüfungen. Das
Ergebnis steht auf der Seite und in `window.__Z` – als Kurzfassung
„ALLE n GRUEN" oder als Liste der Fehlschläge.

## Starten

```powershell
powershell -File test\serve.ps1
```

Dann im Browser:

| Seite | Prüft |
|---|---|
| `test/linien.html` | Länge, Punktraster, Abstände, Gabel, radiale Anfahrt der Verbindungen |
| `test/quellen.html` | ein bis fünf Quellen, alte Schreibweise, Vorzeichen, Antippen |
| `test/autos.html` | Zuordnung Auto ↔ Wallbox: fest, Stecker, Leistung, Eindeutigkeit |
| `test/kacheln.html` | Autarkie, Eigenverbrauch, Bilanz, helle Darstellung, Fließpunkte, Hilfetexte |
| `test/editor.html` | der visuelle Editor mit einem `ha-form`-Ersatz |
| `test/limit.html` | Einspeiselimit: Watt, Prozent, Spitzenleistung, am Limit |

`lokaler-test.html` und `editor-test.html` sind Sichtprüfstände zum Anschauen,
keine automatischen.

## Warum im Repository

Die ersten Fassungen dieser Prüfungen lagen in einem Arbeitsverzeichnis
außerhalb des Repositories und sind mit ihm verschwunden – 263 Prüfungen auf
einen Schlag. Seitdem gehören sie hierher und werden mit dem Code versioniert.

## Eine Prüfung schreiben

```js
const { k, svg, box } = karte({ house: "sensor.haus", ... }, { "sensor.haus": zustand("sensor.haus", 4000, "W") });
ok("Beschreibung", k._readValues().house, 4000);
box.remove();
fertig();
```

`ok(name, ist, soll)` vergleicht strikt, `nah(name, ist, soll, toleranz)` mit
Spielraum. Für den Editor gibt es `editor(cfg)`; der `ha-form`-Ersatz kennt
`tippe(feld, wert)`, um eine Eingabe nachzustellen.
