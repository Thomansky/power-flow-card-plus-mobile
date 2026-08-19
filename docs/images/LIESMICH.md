# Bilder fürs README

Hier gehören die Screenshots hin, die im README eingebunden werden.

**Das ist keine Kür.** Die automatische Prüfung für den HACS-Standardkatalog
enthält einen Check `images`, der ausdrücklich für Plugins und Themes gilt und
verlangt, dass im README mindestens ein Bild eingebunden ist. Ohne Bild
scheitert der Aufnahme-Antrag.

## Was gebraucht wird

| Datei | Inhalt |
|---|---|
| `karte-handy.png` | Die Karte auf einem Handybildschirm, tagsüber, mit laufender Erzeugung und mindestens einer ladenden Wallbox. Das ist das Bild, das über dem README steht. |
| `editor-menue.png` | Das Hauptmenü des visuellen Editors – zeigt auf einen Blick, dass die Karte ohne YAML einzurichten ist. |
| `karte-nacht.png` | Optional. Nachts, Speicher entladen sich, keine Wallbox aktiv – zeigt, dass dann unten nichts steht. |

## Worauf zu achten ist

* Eng zuschneiden: nur die Karte, nicht der halbe Bildschirm drumherum.
* PNG, je 20–30 KB. Keine animierten GIFs – die bläht sich niemand freiwillig
  in die Repository-History, und dort bleiben sie für immer.
* Vor dem Hochladen ansehen, was mitfotografiert wurde. Auf einem Dashboard
  stehen schnell Namen, Adressen oder Anwesenheitszustände im Bild.

## Einbinden

Im README relativ verlinken, nicht über eine fremde URL:

```markdown
![Die Karte auf dem Handy](docs/images/karte-handy.png)
```
