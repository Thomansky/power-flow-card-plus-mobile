/*!
 * Power Flow Card Plus Mobile
 * Eine Lovelace-Karte, die den Energiefluss als Graph zeichnet – gebaut für
 * Handybildschirme, mit mehreren Batteriespeichern und mehreren Wallboxen.
 *
 * Kein Build-Schritt: eine Datei, reines JavaScript, funktioniert so wie sie ist.
 *
 * https://github.com/thomansky/power-flow-card-plus-mobile
 */

const PPM_VERSION = "1.7.0";

console.info(
  `%c POWER-FLOW-CARD-PLUS-MOBILE %c v${PPM_VERSION} `,
  "color:#0B0E13;background:#27E0A5;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px",
  "color:#27E0A5;background:#0B0E13;font-weight:700;border-radius:0 3px 3px 0;padding:2px 6px"
);

// ---------------------------------------------------------------- Farben

const C = {
  pv: "#FFC300",
  ext: "#FF5A2D",
  grid: "#35D0FF",
  gridIn: "#0A84FF",
  house: "#3ED96B",
  bus: "#0A84FF",
  wb: ["#27E0A5", "#14B8C4", "#4F8BFF", "#8AD94F", "#E0C127", "#E04FA8"],
  car: ["#8E86FF", "#D07BFF", "#7BD0FF", "#FF9FD0"],
  residual: "#6A7180",
  batterie: "#FF3B30",
  // Erzeugungsquellen. Die ersten beiden sind bewusst die alten Farben von
  // pv und external, damit bestehende Karten unverändert aussehen.
  quellen: ["#FFC300", "#FF5A2D", "#8AD94F", "#35D0FF", "#B27BFF"],
};

/**
 * Vorgabefarben als Namen aus Home Assistants Thema. Sie werden ueber
 * --<name>-color aufgeloest; passt das Thema die Farbe an, zieht die Karte
 * mit. Fehlt die Variable, greift der Hexwert aus C.
 */
const VORGABE = {
  pv: "yellow", ext: "accent", gridIn: "blue", grid: "cyan", battery: "red",
};

/** Voreinstellungen je Erzeugungsquelle, wenn nichts angegeben ist. */
const QUELL_NAME = [
  "Sonne", "Zweite Quelle", "Dritte Quelle", "Vierte Quelle", "Fünfte Quelle",
];
const QUELL_ICON = [
  "mdi:solar-power", "mdi:solar-power-variant", "mdi:wind-turbine",
  "mdi:engine", "mdi:water-pump",
];

/** Ladestandsabhängige Farbe: rot bei leer, grün bei voll. */
function socColor(soc) {
  if (soc == null) return "#35D0FF";
  if (soc < 15) return "#FF3B30";
  if (soc < 35) return "#FF9F0A";
  if (soc < 60) return "#FFD60A";
  return "#3ED96B";
}

/** Die benannten Theme-Farben von Home Assistant. */
const THEME_COLORS = new Set([
  "primary", "accent", "red", "pink", "purple", "deep-purple", "indigo", "blue",
  "light-blue", "cyan", "teal", "green", "light-green", "lime", "yellow", "amber",
  "orange", "deep-orange", "brown", "light-grey", "grey", "dark-grey", "blue-grey",
  "black", "white",
]);

function cssVar(name, host, fallback) {
  if (!host) return fallback;
  const v = getComputedStyle(host).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Nimmt eine Farbe entgegen, wie sie aus YAML oder aus einem Farbwähler von
 * Home Assistant kommt: "#RRGGBB", ein CSS-Name, eine Theme-Farbe wie "blue",
 * ein `var(--…)`, oder [r, g, b].
 *
 * Theme-Namen werden hier zu einem konkreten Wert aufgelöst. Das ist wichtig:
 * In SVG-Präsentationsattributen (stroke, fill) wird `var()` nicht zuverlässig
 * ersetzt – WebKit tut es, Chromium nicht. Aufgelöst funktioniert es überall.
 *
 * Was nicht erkennbar ist, fällt still auf die Vorgabe zurück – eine kaputte
 * Farbe soll die Karte nicht unbrauchbar machen.
 */
function toColor(v, fallback, host) {
  if (v == null || v === "") return fallback;
  if (Array.isArray(v)) {
    const [r, g, b] = v;
    if ([r, g, b].every((x) => Number.isFinite(x))) {
      return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }
    return fallback;
  }
  const s = String(v).trim();
  if (!s || s === "auto") return fallback;
  if (THEME_COLORS.has(s)) return cssVar(`--${s}-color`, host, fallback);
  if (s.startsWith("var(")) {
    return cssVar(s.slice(4, -1).split(",")[0].trim(), host, fallback);
  }
  return s;
}

/**
 * Baut die Farbtafel aus den Vorgaben plus dem, was der Nutzer überschreibt.
 * Braucht das Element, um Theme-Farben auflösen zu können – deshalb wird das
 * erst beim Zeichnen gerufen, nicht schon beim Einrichten.
 */
function buildPalette(cfg, host) {
  const c = cfg || {};
  const liste = (v, vorgabe) => {
    // Eine einzelne Farbe färbt alle ein – so bietet es der visuelle Editor an.
    if (typeof v === "string" && v.trim()) {
      const f = toColor(v, vorgabe[0], host);
      return vorgabe.map(() => f);
    }
    if (!Array.isArray(v) || !v.length) return vorgabe;
    return vorgabe.map((std, i) => (i < v.length ? toColor(v[i], std, host) : std));
  };
  return {
    pv: toColor(c.pv ?? VORGABE.pv, C.pv, host),
    ext: toColor(c.external ?? c.ext ?? VORGABE.ext, C.ext, host),
    gridIn: toColor(c.grid_import ?? c.gridIn ?? VORGABE.gridIn, C.gridIn, host),
    grid: toColor(c.grid_export ?? c.grid ?? VORGABE.grid, C.grid, host),
    house: toColor(c.house, C.house, host),
    bus: toColor(c.bus, C.bus, host),
    wb: liste(c.wallboxes ?? c.wallbox, C.wb),
    car: liste(c.cars ?? c.car, C.car),
    // "auto" = Farbe nach Ladestand. Sonst eine feste Farbe für beide Speicher.
    battery: c.battery === "auto" ? null
      : toColor(c.battery ?? VORGABE.battery, C.batterie, host),
    // Wie beim Netz: eine Farbe fürs Laden, eine fürs Entladen. Wer nur eine
    // davon setzt, bekommt für die andere Richtung den Ladestandsverlauf.
    batCharge: c.battery_charge ? toColor(c.battery_charge, null, host) : null,
    batDischarge: c.battery_discharge ? toColor(c.battery_discharge, null, host) : null,
  };
}

// ------------------------------------------------------------ Formatierung

function fmtPower(w) {
  if (w == null) return "–";
  const a = Math.abs(w);
  if (a < 995) return Math.round(w) === 0 ? "0 W" : Math.round(w) + " W";
  const kw = w / 1000;
  const d = Math.abs(kw) >= 100 ? 0 : Math.abs(kw) >= 10 ? 1 : 2;
  return kw.toFixed(d) + " kW";
}

const fmtPct = (f) => (f == null ? "–" : Math.round(f * 100) + " %");
const fmtSoc = (v) => (v == null ? "–" : Math.round(v) + " %");

// -------------------------------------------------------------- Geometrie
//
// Die Zeichenfläche hat kein festes Seitenverhältnis, sondern folgt dem
// vorhandenen Platz innerhalb eines Korridors. Dadurch bleibt auf jedem
// Handy die volle Höhe genutzt. Die Kreise sind immer echte Kreise – ihr
// Radius hängt nur an der Breite, gestreckt werden allein die Abstände.
//
// Die Obergrenze 0,78 ist nachgerechnet: darüber streift die Linie von der
// externen Quelle den Zuhause-Kreis.

const MIN_ASPECT = 0.56;
const MAX_ASPECT = 0.78;

function canvasRect(w, h) {
  const natural = w / Math.max(1, h);
  const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, natural));
  let width = w;
  let height = w / aspect;
  if (height > h) {
    height = h;
    width = h * aspect;
  }
  return { x: (w - width) / 2, y: (h - height) / 2, w: width, h: height };
}

/**
 * Knotenpositionen in normalisierten Koordinaten (0…1 der Zeichenfläche).
 * Wird je nach Anzahl Batterien und Autos angepasst, damit die Karte auch
 * mit einem Speicher oder ohne Autos aufgeräumt aussieht.
 */
/** Mitte der Ladespalten – liegt genau unter dem Zuhause-Kreis. */
const LADE_MITTE = 0.78;
const LADE_ABSTAND = 0.105;
/** Wallboxen sind bewusst kleiner als Zuhause und Netz. */
const WB_RADIUS = 0.09;

/**
 * @param nBat    Anzahl Batteriespeicher (0…2)
 * @param spalten Anzahl sichtbarer Ladespalten (0…2) – je Spalte eine Wallbox
 *                und darunter das Auto, das daran hängt
 * @param autos   Array [bool, bool]: hat die Spalte ein anzuzeigendes Auto?
 */
/**
 * Die Erzeugungsreihe oben. Eine und zwei Quellen stehen genau dort, wo sie
 * immer standen – daran darf sich für bestehende Karten nichts ändern. Drei
 * und vier rücken zusammen und werden kleiner, sonst berühren sie sich.
 */
const QUELL_REIHE = [
  [],
  [{ x: 0.5, r: 0.13 }],
  [{ x: 0.175, r: 0.13 }, { x: 0.825, r: 0.13 }],
  [{ x: 0.13, r: 0.108 }, { x: 0.5, r: 0.108 }, { x: 0.87, r: 0.108 }],
  [{ x: 0.115, r: 0.088 }, { x: 0.372, r: 0.088 },
   { x: 0.628, r: 0.088 }, { x: 0.885, r: 0.088 }],
  [{ x: 0.095, r: 0.070 }, { x: 0.2975, r: 0.070 }, { x: 0.5, r: 0.070 },
   { x: 0.7025, r: 0.070 }, { x: 0.905, r: 0.070 }],
];

/**
 * Mindestluft zwischen zwei senkrecht verbundenen Knoten, als Anteil der
 * Breite. Weniger ist keine Verbindung mehr, sondern eine Berührung.
 */
const LUFT = 0.045;

function buildNodes(nBat, spalten, autos, nQuellen, aspect) {
  const reihe = QUELL_REIHE[Math.min(5, nQuellen)] || [];
  const ziele = QUELL_ZIEL[Math.min(5, nQuellen)] || [];

  // Die Kreise hängen an der Breite, die Abstände an der Höhe. Auf einer
  // breiten Fläche wachsen also die Kreise, während der Weg zwischen ihnen
  // gleich bleibt – oben sitzt die Erzeugungsreihe dann auf dem Sammelknoten
  // auf. Betroffen ist nur, wer senkrecht von oben ankommt: bei einer Quelle
  // alle, bei dreien die mittlere. Für die rutschen die beiden Knotenreihen
  // so weit herunter, dass Luft bleibt. Auf hohen Flächen ändert das nichts,
  // dort ist der feste Wert ohnehin der größere.
  const rQ = (reihe[0] || { r: 0.13 }).r;
  const senkrecht = ziele.some(
    (z, i) => z.ta === 270 && Math.abs(reihe[i].x - 0.5) < 0.01
  );
  const yGen = senkrecht
    ? Math.max(0.268, 0.107 + (rQ + 0.074 + LUFT) * aspect)
    : 0.268;
  const yDist = Math.max(0.445, yGen + (0.074 + 0.074 + LUFT) * aspect);

  // Netz, Verteil-Knoten und Zuhause stehen auf einer Höhe – so wird daraus
  // eine durchgehende waagerechte Linie statt eines Versatzes.
  const N = {
    busGen: { x: 0.5, y: yGen, r: 0.074 },
    grid: { x: 0.145, y: yDist, r: 0.126 },
    busDist: { x: 0.5, y: yDist, r: 0.074 },
    house: { x: LADE_MITTE, y: yDist, r: 0.126 },
  };

  reihe.forEach((q, i) => {
    N["src" + (i + 1)] = { x: q.x, y: 0.107, r: q.r };
  });

  if (nBat === 1) {
    N.battery1 = { x: 0.14, y: 0.775, r: 0.122 };
  } else if (nBat >= 2) {
    N.battery1 = { x: 0.14, y: 0.665, r: 0.122 };
    N.battery2 = { x: 0.14, y: 0.885, r: 0.122 };
  }

  // Eine Spalte steht mittig, zwei stehen spiegelbildlich daneben.
  const x = (i) =>
    spalten === 1 ? LADE_MITTE : LADE_MITTE + (i === 0 ? -LADE_ABSTAND : LADE_ABSTAND);

  // Unten dasselbe Spiel wie oben: das Auto hängt senkrecht unter seiner
  // Wallbox, und auf einer breiten Fläche sitzen die beiden aufeinander.
  // Das Auto kann nur bis an den unteren Rand, also rückt die Wallbox nach
  // oben – dorthin, wo zum Verteilknoten ohnehin viel Luft ist.
  const yCar = Math.min(0.905, 1 - (0.092 + 0.02) * aspect);
  const yWb = Math.min(0.740, yCar - (0.092 + WB_RADIUS + LUFT) * aspect);

  const yLade = autos.some(Boolean) ? yWb : 0.740;
  for (let i = 0; i < spalten; i++) {
    N["wb" + (i + 1)] = { x: x(i), y: yLade, r: WB_RADIUS };
    if (autos[i]) N["car" + (i + 1)] = { x: x(i), y: yCar, r: 0.092 };
  }

  // Zwei Ladespalten hängen an einem gemeinsamen Strang, der sich erst kurz
  // über ihnen gabelt. Zwei getrennte Linien liefen von hier bis dort fast
  // deckungsgleich nebeneinander – das sah nach Fehler aus, nicht nach zwei
  // Wegen. Der Punkt liegt mittig zwischen Verteilknoten und Wallboxreihe:
  // unter dem Zuhause-Kreis hindurch, über den Wallboxen. Er wird nie
  // gezeichnet, deshalb Radius null.
  if (spalten === 2) {
    N.wbGabel = { x: LADE_MITTE, y: (yDist + yLade) / 2, r: 0 };
  }
  return N;
}

/**
 * Wo eine Erzeugungslinie am Sammelknoten ankommt. Bei einer Quelle senkrecht
 * von oben, bei zweien seitlich – das ist die gewachsene Form. Ab drei Quellen
 * fächern sie über den oberen Bogen auf.
 */
const QUELL_ZIEL = [
  [],
  [{ ta: 270, tx: "v" }],
  [{ ta: 180, tx: "h" }, { ta: 0, tx: "h" }],
  [{ ta: 200, tx: "v" }, { ta: 270, tx: "v" }, { ta: 340, tx: "v" }],
  [{ ta: 205, tx: "v" }, { ta: 245, tx: "v" },
   { ta: 295, tx: "v" }, { ta: 335, tx: "v" }],
  // Bei fünf laufen die beiden äußeren seitlich in den Knoten, wie bei zwei.
  // Fächerten alle fünf über den oberen Bogen auf, lägen die waagerechten
  // Stücke der äußeren und der inneren nur wenige Pixel übereinander – im
  // Bild sähe das aus wie eine ausgefranste Linie, nicht wie zwei Wege.
  [{ ta: 180, tx: "h" }, { ta: 215, tx: "v" }, { ta: 270, tx: "v" },
   { ta: 325, tx: "v" }, { ta: 0, tx: "h" }],
];

function buildLinks(N, nQuellen) {
  const zwei = !!N.wb2;
  const ziele = QUELL_ZIEL[Math.min(5, nQuellen)] || [];
  const all = [
    ...ziele.map((z, i) => ({
      id: "src" + (i + 1), from: "src" + (i + 1), to: "busGen",
      fa: 90, fx: "v", ta: z.ta, tx: z.tx,
    })),
    { id: "bus", from: "busGen", to: "busDist", fa: 90, fx: "v", ta: 270, tx: "v" },
    { id: "grid", from: "grid", to: "busDist", fa: 0, fx: "h", ta: 180, tx: "h" },
    { id: "house", from: "busDist", to: "house", fa: 0, fx: "h", ta: 180, tx: "h" },
    { id: "bat1", from: "battery1", to: "busDist", fa: 0, fx: "h", ta: 150, tx: "v" },
    { id: "bat2", from: "battery2", to: "busDist", fa: 0, fx: "h", ta: 120, tx: "v" },
    // Bei zwei Spalten führt ein Strang vom Verteilknoten herunter und gabelt
    // sich erst über den Wallboxen. Bei einer geht es senkrecht durch.
    { id: "wbStamm", from: "busDist", to: "wbGabel", fa: 60, fx: "v", ta: 180, tx: "h" },
    zwei
      ? { id: "wb1", from: "wbGabel", to: "wb1", fa: 180, fx: "h", ta: 270, tx: "v" }
      : { id: "wb1", from: "busDist", to: "wb1", fa: 90, fx: "v", ta: 270, tx: "v" },
    { id: "wb2", from: "wbGabel", to: "wb2", fa: 0, fx: "h", ta: 270, tx: "v" },
    // Auto hängt senkrecht unter seiner Wallbox.
    { id: "car1", from: "wb1", to: "car1", fa: 90, fx: "v", ta: 270, tx: "v" },
    { id: "car2", from: "wb2", to: "car2", fa: 90, fx: "v", ta: 270, tx: "v" },
  ];
  // Nur Verbindungen behalten, deren beide Knoten es auch gibt.
  return all.filter((l) => N[l.from] && N[l.to]);
}

const NS = "http://www.w3.org/2000/svg";

function el(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

// ------------------------------------------------------------------ Icons

function icon(kind, cx, cy, size, color) {
  const g = el("g", {
    fill: "none",
    stroke: color,
    "stroke-width": (size * 0.09).toFixed(2),
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    transform: `translate(${cx},${cy})`,
  });
  const u = size / 2;

  if (kind === "sun") {
    g.appendChild(el("circle", { cx: 0, cy: 0, r: u * 0.44, fill: color, stroke: "none" }));
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.appendChild(
        el("line", {
          x1: (Math.cos(a) * u * 0.66).toFixed(2),
          y1: (Math.sin(a) * u * 0.66).toFixed(2),
          x2: (Math.cos(a) * u * 0.96).toFixed(2),
          y2: (Math.sin(a) * u * 0.96).toFixed(2),
        })
      );
    }
  } else if (kind === "panel") {
    g.appendChild(el("rect", { x: -u * 0.92, y: -u * 0.72, width: u * 1.84, height: u * 1.44, rx: u * 0.14 }));
    g.appendChild(el("line", { x1: -u * 0.92, y1: 0, x2: u * 0.92, y2: 0 }));
    g.appendChild(el("line", { x1: -u * 0.31, y1: -u * 0.72, x2: -u * 0.31, y2: u * 0.72 }));
    g.appendChild(el("line", { x1: u * 0.31, y1: -u * 0.72, x2: u * 0.31, y2: u * 0.72 }));
  } else if (kind === "plug") {
    g.appendChild(el("path", { d: `M ${-u * 0.5} ${-u * 0.9} v ${u * 0.55} M ${u * 0.5} ${-u * 0.9} v ${u * 0.55}` }));
    g.appendChild(el("rect", { x: -u * 0.8, y: -u * 0.35, width: u * 1.6, height: u * 0.72, rx: u * 0.16 }));
    g.appendChild(el("path", { d: `M 0 ${u * 0.37} v ${u * 0.5}` }));
  } else if (kind === "house") {
    g.appendChild(el("path", { d: `M ${-u * 0.9} ${-u * 0.05} L 0 ${-u * 0.88} L ${u * 0.9} ${-u * 0.05}` }));
    g.appendChild(el("path", { d: `M ${-u * 0.62} ${-u * 0.05} v ${u * 0.9} h ${u * 1.24} v ${-u * 0.9}` }));
  } else if (kind === "battery") {
    g.appendChild(el("rect", { x: -u * 0.9, y: -u * 0.5, width: u * 1.62, height: u * 1.0, rx: u * 0.16 }));
    g.appendChild(el("path", { d: `M ${u * 0.78} ${-u * 0.2} v ${u * 0.4}` }));
    g.appendChild(
      el("path", {
        d: `M ${-u * 0.5} 0 h ${u * 0.4} M ${u * 0.12} ${-u * 0.2} v ${u * 0.4} M ${-u * 0.08} 0 h ${u * 0.4}`,
      })
    );
  } else if (kind === "charger") {
    g.appendChild(el("rect", { x: -u * 0.85, y: -u * 0.85, width: u * 1.2, height: u * 1.7, rx: u * 0.18 }));
    g.appendChild(
      el("path", {
        d: `M ${-u * 0.42} ${-u * 0.28} l ${u * 0.34} 0 l ${-u * 0.24} ${u * 0.52} l ${u * 0.34} 0`,
      })
    );
    g.appendChild(el("path", { d: `M ${u * 0.35} ${u * 0.3} h ${u * 0.42} v ${-u * 0.75}` }));
  } else if (kind === "car") {
    g.appendChild(
      el("path", {
        d: `M ${-u * 0.92} ${u * 0.18} l ${u * 0.28} ${-u * 0.62} h ${u * 1.28} l ${u * 0.28} ${u * 0.62}`,
      })
    );
    g.appendChild(
      el("path", { d: `M ${-u * 0.92} ${u * 0.18} h ${u * 1.84} v ${u * 0.34} h ${-u * 1.84} z` })
    );
    g.appendChild(el("circle", { cx: -u * 0.5, cy: u * 0.62, r: u * 0.16 }));
    g.appendChild(el("circle", { cx: u * 0.5, cy: u * 0.62, r: u * 0.16 }));
  }
  return g;
}

/**
 * Ein frei gewähltes Symbol (mdi:…) über Home Assistants eigenes <ha-icon>.
 * Läuft in einem foreignObject mitten im SVG. Gibt es das Element nicht –
 * etwa außerhalb von Home Assistant – liefert die Funktion null und der
 * Aufrufer zeichnet das eingebaute Vektorsymbol.
 */
function mdiIcon(name, cx, cy, size, color) {
  if (!name || !customElements.get("ha-icon")) return null;
  const fo = el("foreignObject", {
    x: (cx - size / 2).toFixed(2), y: (cy - size / 2).toFixed(2),
    width: size.toFixed(2), height: size.toFixed(2), overflow: "visible",
  });
  const box = document.createElement("div");
  box.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  box.style.cssText =
    `width:${size}px;height:${size}px;display:flex;align-items:center;` +
    `justify-content:center;color:${color}`;
  const ic = document.createElement("ha-icon");
  ic.setAttribute("icon", name);
  ic.style.cssText = `--mdc-icon-size:${size}px;width:${size}px;height:${size}px`;
  box.appendChild(ic);
  fo.appendChild(box);
  return fo;
}

// ------------------------------------------------------------ Die Karte

class PowerflowPlusMobileCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._resizeObserver = null;
    this._pending = null;
  }

  // ---------------------------------------------------------- Konfiguration

  /** Der visuelle Editor. Das Tag ist am Ende dieser Datei angemeldet. */
  static getConfigElement() {
    return document.createElement("power-flow-card-plus-mobile-editor");
  }

  /**
   * Vorschlag beim Hinzufügen der Karte. Ohne `type` – das setzt Home
   * Assistant selbst davor.
   */
  static getStubConfig(hass, entities, entitiesFallback) {
    const alle = [].concat(entities || [], entitiesFallback || []);
    const suche = (re) => alle.find((id) => re.test(id)) || undefined;
    return {
      pv: suche(/(^|_)(pv|solar)/i),
      grid: suche(/(grid|netz)/i),
      house: suche(/(house|haus|verbrauch)/i),
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Keine Konfiguration angegeben.");

    // Eine leere Konfiguration ist ausdrücklich erlaubt. Home Assistant legt
    // die Karte über getStubConfig() an und zeichnet ihre Vorschau im
    // Kartenwähler – findet die Namenssuche dort nichts, kommt genau so eine
    // leere Konfiguration herein. Wer hier wirft, macht die Karte
    // unhinzufügbar. Stattdessen erscheint im Graph ein Hinweis, und der
    // visuelle Editor führt durch die Einrichtung.

    const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
    const norm = (entry, keys) => {
      if (typeof entry === "string") {
        const o = {};
        o[keys[0]] = entry;
        return o;
      }
      return entry || {};
    };

    /**
     * Nimmt entweder einen Sensor mit Vorzeichen oder zwei getrennte Sensoren.
     *
     * Viele Integrationen – E3/DC etwa – liefern gar keinen Sensor mit
     * Vorzeichen, sondern zwei, die nie negativ werden: einen für Bezug und
     * einen für Einspeisung, einen fürs Laden und einen fürs Entladen.
     * Beide Schreibweisen sind erlaubt:
     *
     *     grid: sensor.netzleistung
     *     grid: { consumption: sensor.bezug, production: sensor.einspeisung }
     */
    const bipolar = (v, posKeys, negKeys) => {
      if (!v) return null;
      if (typeof v === "string") return { single: v };
      const pick = (keys) => keys.map((k) => v[k]).find(Boolean) || null;
      const pos = pick(posKeys);
      const neg = pick(negKeys);
      if (!pos && !neg) return v.entity ? { single: v.entity } : null;
      return { pos, neg };
    };

    // Erzeugung: bis zu vier Quellen. Die alte Schreibweise mit `pv` und
    // `external` bleibt gültig und wird auf die ersten beiden Einträge
    // abgebildet – bestehende Karten müssen nichts ändern.
    const altQuellen = [config.pv, config.external ?? config.ext]
      .map((p, i) => (p ? { power: p, _alt: i } : null))
      .filter(Boolean);
    const quellen = (list(config.sources).length ? list(config.sources) : altQuellen)
      .map((s, i) => {
        const o = norm(s, ["power"]);
        return {
          power: o.power ?? null,
          name: o.name ?? QUELL_NAME[i] ?? `Quelle ${i + 1}`,
          icon: o.icon ?? null,
          color: o.color ?? null,
          // Merkt sich, ob der Eintrag aus pv/external stammt – nur dann
          // gelten die alten icons.pv/colors.pv weiter.
          alt: o._alt,
        };
      });
    if (quellen.length > 5) {
      throw new Error("Es lassen sich höchstens fünf Erzeugungsquellen einrichten.");
    }

    this._config = {
      title: config.title ?? null,
      sources: quellen,
      // positiv = Bezug, negativ = Einspeisung
      grid: bipolar(config.grid, ["consumption", "import", "from_grid"],
                                 ["production", "export", "to_grid"]),
      house: config.house ?? null,
      // Optional: gemessene Werte statt gerechneter.
      autarky: config.autarky ?? null,
      self_consumption: config.self_consumption ?? config.selfconsumption ?? null,
      batteries: list(config.batteries).map((b, i) => {
        const o = norm(b, ["power"]);
        return {
          // positiv = lädt, negativ = entlädt
          power: bipolar(o.power ? o.power : o, ["charge"], ["discharge"]),
          soc: o.soc ?? null,
          name: o.name ?? `Batterie ${i + 1}`,
          icon: o.icon ?? null,
          // Hängt hinter dem Hauszähler und steckt in dessen Messwert schon drin.
          in_house: !!o.included_in_house,
        };
      }),
      wallboxes: list(config.wallboxes).map((w, i) => {
        const o = norm(w, ["power"]);
        // Mehrere Sensoren sind erlaubt und werden addiert – E3/DC etwa meldet
        // je Wallbox getrennt, wieviel aus dem Netz und wieviel aus der Sonne kam.
        const p = o.power ?? null;
        return {
          power: Array.isArray(p) ? p.filter(Boolean) : p,
          name: o.name ?? `WB ${i + 1}`,
          icon: o.icon ?? null,
          // Hängt hinter dem Hauszähler und steckt in dessen Messwert schon drin.
          in_house: !!o.included_in_house,
          // Zustand des Ladesteckers. Nur für die selbsttätige Zuordnung.
          wallbox:
    "Fest zuordnen, ohne Suche. „Selbst zuordnen“ überlässt es der " +
    "Einstellung unter der Liste. Was an der Wallbox selbst unter „Auto an " +
    "dieser Wallbox“ steht, schlägt beides – deshalb räumt die Karte das dort " +
    "weg, sobald hier eine Wallbox gewählt wird.",
  plug: o.plug ?? null,
          // Das Auto, das an dieser Wallbox hängt. Steht hier eins, gilt es –
          // von Hand eingetragen schlägt selbst gefunden.
          car: o.car ?? null,
          car_name: o.car_name ?? null,
          car_icon: o.car_icon ?? null,
        };
      }),
      // Die Autos des Haushalts. Ohne selbsttätige Zuordnung werden sie der
      // Reihe nach den Wallboxen zugeteilt – so war es immer schon.
      cars: list(config.cars).map((c, i) => {
        const o = norm(c, ["soc"]);
        return {
          soc: o.soc ?? null,
          name: o.name ?? `Auto ${i + 1}`,
          icon: o.icon ?? null,
          // Beides nur für die selbsttätige Zuordnung.
          plug: o.plug ?? null,
          power: o.power ?? null,
          // Feste Zuordnung von der Autoseite aus: die wievielte Wallbox,
          // von 1 an gezählt. Schlägt die selbsttätige Suche.
          wallbox: Number.isFinite(o.wallbox) && o.wallbox >= 1
            ? Math.floor(o.wallbox)
            : null,
        };
      }),
      // Wie die Karte herausfindet, welches Auto an welcher Wallbox hängt:
      // gar nicht ("off"), über die beiden Steckerzustände ("plug") oder
      // über den Abgleich der Ladeleistung ("power").
      plug:
    "Am besten ein binary_sensor, der nur beim Ein- und Ausstecken umspringt. " +
    "Ein Statussensor mit vielen Werten (laden, fertig, pausiert) ändert sich " +
    "auch mittendrin – dann stimmt der Zeitpunkt nicht mehr, mit dem verglichen wird.",
  car_match: ["plug", "power"].includes(config.car_match) ? config.car_match : "off",
      // Wie weit die beiden Steckerzeitpunkte auseinanderliegen dürfen.
      car_match_window: Number.isFinite(config.car_match_window) ? config.car_match_window : 300,
      // Wie stark die beiden Leistungen abweichen dürfen, als Anteil.
      car_match_tolerance:
        Number.isFinite(config.car_match_tolerance) ? config.car_match_tolerance : 0.25,
      // Bleibt am Ende genau eine Wallbox offen und genau ein Auto frei,
      // gehören die beiden zusammen – ohne weitere Prüfung.
      car_match_unique: config.car_match_unique !== false,
      icons: config.icons ?? null,
      // Vorzeichen: je nach Integration unterschiedlich. Voreinstellung ist
      // "Netzbezug positiv" und "Batterie laden positiv".
      invert_grid: !!config.invert_grid,
      invert_battery: !!config.invert_battery,
      // Alles unterhalb gilt als Rauschen und wird als 0 gezeichnet.
      threshold: Number.isFinite(config.threshold) ? config.threshold : 20,
      animate: config.animate !== false,
      show_tiles: config.show_tiles !== false,
      transparent: !!config.transparent,
      // Ring um das Haus nach Herkunft des Stroms einfärben statt einfarbig.
      house_mix: config.house_mix !== false,
      // Dasselbe am Auto: ein zweiter Ring innen, solange es laedt.
      car_mix: config.car_mix !== false,
      // Autarkie-Balken nach Herkunft statt einfarbig.
      autarky_mix: config.autarky_mix !== false,
      min_height: Number.isFinite(config.min_height) ? config.min_height : 460,
      colors: config.colors ?? null,
    };

    // Die Farbtafel wird erst beim Zeichnen gebaut – Theme-Farben lassen sich
    // nur auflösen, wenn das Element schon im Dokument hängt.
    this._pal = null;
    // Zweiter Parameter ist die Leistung: positiv lädt, negativ entlädt.
    // Ist für die Richtung eine eigene Farbe gesetzt, gewinnt sie; sonst gilt
    // die eine feste Farbe, sonst der Ladestandsverlauf.
    this._batColor = (soc, power) => {
      const p = this._pal;
      if (p && power != null) {
        if (power > 0 && p.batCharge) return p.batCharge;
        if (power < 0 && p.batDischarge) return p.batDischarge;
      }
      return (p && p.battery) || socColor(soc);
    };

    if (this._config.batteries.length > 2) {
      throw new Error("Es werden höchstens zwei Batteriespeicher dargestellt.");
    }
    if (this._config.cars.length > 4) {
      throw new Error("Es lassen sich höchstens vier Autos einrichten.");
    }
    if (this._config.wallboxes.length > 4) {
      throw new Error("Es lassen sich höchstens vier Wallboxen einrichten.");
    }

    // Autos der Reihe nach den Wallboxen zuordnen, sofern dort keins
    // eingetragen ist. Sucht die Karte sich die Zuordnung selbst, unterbleibt
    // das – sonst stünde die feste Reihenfolge der Suche im Weg.
    if (this._config.car_match === "off") this._config.wallboxes.forEach((w, i) => {
      const alt = this._config.cars[i];
      if (!w.car && alt && alt.soc) {
        w.car = alt.soc;
        w.car_name = w.car_name || alt.name;
        w.car_icon = w.car_icon || alt.icon;
      }
    });

    // Einmal alle beobachteten Entitäten sammeln. Ohne das würde die Karte
    // bei jeder beliebigen Zustandsänderung im ganzen System neu zeichnen –
    // `hass` wird von Home Assistant jedes Mal neu gesetzt.
    const c = this._config;
    const ausBip = (b) => (b ? [b.single, b.pos, b.neg] : []);
    this._watched = [c.house, c.autarky, c.self_consumption]
      .concat(c.sources.flatMap((q) => (Array.isArray(q.power) ? q.power : [q.power])))
      .concat(ausBip(c.grid))
      .concat(c.batteries.flatMap((b) => ausBip(b.power).concat([b.soc])))
      .concat(c.wallboxes.flatMap((w) =>
        (Array.isArray(w.power) ? w.power : [w.power]).concat([w.car, w.plug])))
      .concat(c.cars.flatMap((x) => [x.soc, x.plug, x.power]))
      .filter(Boolean);

    // Gefundene Paare gelten nur für die Konfiguration, unter der sie
    // entstanden sind.
    this._paare = {};

    this._buildShell();
    this._scheduleRender();
  }

  getCardSize() {
    return this._config?.show_tiles ? 12 : 10;
  }

  /** Abschnitts-Ansicht. `getLayoutOptions` ist abgekündigt und entfällt. */
  getGridOptions() {
    return { rows: 12, columns: 12, min_rows: 8, min_columns: 6, max_columns: 12 };
  }

  set hass(hass) {
    const alt = this._hass;
    this._hass = hass;
    // hass.states-Objekte sind unveränderlich, ein Referenzvergleich genügt.
    if (!alt || !this._watched || this._watched.some((id) => alt.states[id] !== hass.states[id])) {
      this._scheduleRender();
    }
  }

  connectedCallback() {
    if (!this._resizeObserver && typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => this._scheduleRender());
      const slot = this.shadowRoot.querySelector(".graph-slot");
      if (slot) this._resizeObserver.observe(slot);
    }
    this._scheduleRender();
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._pending) {
      cancelAnimationFrame(this._pending);
      this._pending = null;
    }
  }

  // ------------------------------------------------------------ Zustände

  /**
   * Welches Auto hängt an welcher Wallbox?
   *
   * Von Hand eingetragene Zuordnungen gelten immer, die rührt das hier nicht
   * an. Für den Rest gibt es zwei Wege: die beiden Steckerzustände – wer
   * zusammen eingesteckt wurde, gehört zusammen – oder der Abgleich der
   * Ladeleistung.
   *
   * Entschieden wird einmal, danach steht es. Sonst springt die Zuordnung
   * mitten im Laden um, sobald ein zweites Auto zufällig ähnlich viel zieht.
   * Gelöst wird erst, wenn das Kabel gezogen ist; ohne Steckersensor, wenn
   * nichts mehr fließt.
   *
   * @returns {Object} Wallbox-Nummer → Auto-Nummer
   */
  /**
   * Feste Zuordnungen von der Autoseite: Wallbox-Nummer → Auto-Nummer.
   * Zeigen zwei Autos auf dieselbe Wallbox, gewinnt das erste – zwei Autos
   * an einem Kabel gibt es nicht.
   */
  _festeAutos(c) {
    const fest = {};
    c.cars.forEach((a, ai) => {
      if (a.wallbox == null) return;
      const wi = a.wallbox - 1;
      if (!c.wallboxes[wi] || c.wallboxes[wi].car) return;
      if (fest[wi] === undefined) fest[wi] = ai;
    });
    return fest;
  }

  _ordneAutosZu(c) {
    if (!this._paare) this._paare = {};
    if (c.car_match === "off" || !c.cars.length) {
      this._paare = {};
      return this._paare;
    }

    const T = c.threshold;

    // Steckt das Kabel? Die Integrationen sind sich über die Schreibweise
    // nicht einig, deshalb beide Lager sammeln. Was in keines fällt, ist
    // keine Aussage – und wird als solche behandelt, nicht als "nein".
    const steckt = (id) => {
      const st = id && this._hass && this._hass.states[id];
      if (!st) return null;
      const w = String(st.state).trim().toLowerCase();
      if (["on", "true", "connected", "plugged", "plugged_in", "locked",
           "charging", "cable_connected", "ready_to_charge", "awaiting_start",
           "complete", "completed", "paused", "stopped", "home"].includes(w)) return true;
      if (["off", "false", "disconnected", "unplugged", "not_connected",
           "none", "free", "no_cable", "not_home", "away"].includes(w)) return false;
      // Absichtlich nicht dabei: "ready". Die einen meinen damit
      // "eingesteckt und bereit", die anderen "steht bereit, nichts steckt".
      // Bei einem falschen Ja stünde das falsche Auto da.
      return null;
    };

    // Wann hat sich dieser Zustand zuletzt geändert? Das ist der Zeitpunkt
    // des Einsteckens. Verglichen werden nur zwei solche Zeitpunkte
    // miteinander, nie einer mit der Uhr – so bleibt es prüfbar.
    const seit = (id) => {
      const st = id && this._hass && this._hass.states[id];
      const t = st && (st.last_changed || st.last_updated);
      const ms = t ? Date.parse(t) : NaN;
      return Number.isFinite(ms) ? ms : null;
    };

    const laedt = (w) => (this._sum(w.power) ?? 0) > T;

    // Bestehende Paare lösen, die nicht mehr gelten.
    for (const schluessel of Object.keys(this._paare)) {
      const w = c.wallboxes[Number(schluessel)];
      if (!w || w.car) { delete this._paare[schluessel]; continue; }
      const st = steckt(w.plug);
      if (st === false || (st == null && !laedt(w))) delete this._paare[schluessel];
    }

    // Schon vergebene Autos sind für die Suche gesperrt – auch die, die von
    // Hand an einer Wallbox stehen. Ohne das stünde dasselbe Auto an zwei
    // Kreisen gleichzeitig.
    const belegt = new Set(Object.values(this._paare));
    const vonHand = new Set(c.wallboxes.map((w) => w.car).filter(Boolean));
    const fest = this._festeAutos(c);
    // Wer eine vorhandene Wallbox nennt, ist gesprochen – auch wenn er sie
    // nicht bekommt, weil dort schon jemand steht. "Hängt an dieser Wallbox"
    // heißt nicht "notfalls auch an einer anderen".
    const mitWahl = new Set(
      c.cars.map((a, i) => (a.wallbox != null && c.wallboxes[a.wallbox - 1] ? i : -1))
        .filter((i) => i >= 0)
    );
    const freieAutos = c.cars
      .map((x, i) => ({ ...x, i }))
      .filter((x) => !belegt.has(x.i) && !mitWahl.has(x.i) && !vonHand.has(x.soc));
    const offene = c.wallboxes
      .map((w, i) => ({ ...w, i }))
      .filter((w) => !w.car && fest[w.i] === undefined && this._paare[w.i] === undefined)
      .filter((w) => steckt(w.plug) === true || laedt(w));
    if (!offene.length || !freieAutos.length) return this._paare;

    // Beide Wege liefern eine Note: je kleiner, desto sicherer. Wer die
    // Schwelle reißt, kommt gar nicht erst in die Auswahl – lieber kein
    // Auto zeigen als das falsche.
    const nachStecker = (w, a) => {
      if (steckt(w.plug) !== true || steckt(a.plug) !== true) return null;
      const tw = seit(w.plug), ta = seit(a.plug);
      if (tw == null || ta == null) return null;
      const abstand = Math.abs(tw - ta) / 1000;
      return abstand <= c.car_match_window ? abstand : null;
    };
    const nachLeistung = (w, a) => {
      const pw = this._sum(w.power);
      const pa = this._num(a.power);
      if (pw == null || pa == null || pw <= T) return null;
      const abweichung = Math.abs(pw - pa) / Math.max(Math.abs(pw), 1);
      return abweichung <= c.car_match_tolerance ? abweichung : null;
    };
    const note = c.car_match === "plug" ? nachStecker : nachLeistung;

    // Alle zulässigen Paarungen mit ihrer Note.
    const moeglich = offene.map((w) =>
      freieAutos
        .map((a) => ({ auto: a.i, note: note(w, a) }))
        .filter((x) => x.note != null)
    );

    // Gesucht ist die beste Gesamtaufteilung, nicht das beste Einzelpaar.
    // Gierig zu nehmen wäre einfacher, ließe aber Autos stehen: das sicherste
    // Paar kann ein Auto wegnehmen, das anderswo das einzig mögliche war.
    // Zuerst zählt, wie viele Autos überhaupt zugeordnet werden, dann die
    // Summe der Noten. Bei höchstens vier auf jeder Seite ist das billig.
    let bestZahl = -1, bestSumme = Infinity, bestWahl = null;
    const suche = (k, benutzt, wahl, zahl, summe) => {
      if (k === offene.length) {
        if (zahl > bestZahl || (zahl === bestZahl && summe < bestSumme - 1e-9)) {
          bestZahl = zahl; bestSumme = summe; bestWahl = wahl.slice();
        }
        return;
      }
      for (const x of moeglich[k]) {
        if (benutzt.has(x.auto)) continue;
        benutzt.add(x.auto);
        wahl.push({ wb: offene[k].i, auto: x.auto });
        suche(k + 1, benutzt, wahl, zahl + 1, summe + x.note);
        wahl.pop();
        benutzt.delete(x.auto);
      }
      // Diese Wallbox kann auch leer bleiben.
      suche(k + 1, benutzt, wahl, zahl, summe);
    };
    suche(0, new Set(belegt), [], 0, 0);

    for (const p of bestWahl || []) this._paare[p.wb] = p.auto;

    // Bleibt genau eine Wallbox offen und genau ein Auto frei, gehören die
    // beiden zusammen – wer sonst? Dann ist keine Note nötig. Das erspart das
    // Warten darauf, dass ein träger Sensor endlich in den Spielraum fällt;
    // gerade die Ladeleistung eines Autos kommt oft aus der Cloud und hinkt
    // Minuten hinterher.
    //
    // Hier gilt "lieber kein Auto als das falsche" bewusst nicht mehr: es
    // gibt schlicht keine zweite Möglichkeit. Nur wenn das Auto ausdrücklich
    // meldet, dass es nicht steckt, bleibt es draußen – dann steht es
    // woanders. Abschaltbar über car_match_unique.
    if (c.car_match_unique) {
      const vergeben = new Set(Object.values(this._paare));
      const nochOffen = offene.filter((w) => this._paare[w.i] === undefined);
      const nochFrei = freieAutos.filter((a) => !vergeben.has(a.i));
      if (nochOffen.length === 1 && nochFrei.length === 1 &&
          steckt(nochFrei[0].plug) !== false) {
        this._paare[nochOffen[0].i] = nochFrei[0].i;
      }
    }

    return this._paare;
  }

  /** Liest eine Entität als Zahl in Watt. Rechnet kW und MW um. */
  _num(entityId) {
    if (!entityId || !this._hass) return null;
    const st = this._hass.states[entityId];
    if (!st) return null;
    const raw = st.state;
    if (raw === "unavailable" || raw === "unknown" || raw === "" || raw == null) return null;
    const v = Number(raw);
    if (!Number.isFinite(v)) return null;
    const unit = String(st.attributes?.unit_of_measurement || "").trim().toLowerCase();
    if (unit === "kw") return v * 1000;
    if (unit === "mw") return v * 1e6;
    return v;
  }

  /** Liest eine Entität als Prozentwert 0…100. */
  _pctVal(entityId) {
    if (!entityId || !this._hass) return null;
    const st = this._hass.states[entityId];
    if (!st) return null;
    const raw = st.state;
    if (raw === "unavailable" || raw === "unknown" || raw === "" || raw == null) return null;
    const v = Number(raw);
    if (!Number.isFinite(v)) return null;
    return Math.min(100, Math.max(0, v));
  }

  /**
   * Summiert einen oder mehrere Sensoren. Liefert null, wenn keiner einen
   * Wert hat – damit „kein Sensor da“ nicht wie „gemessene 0“ aussieht.
   */
  _sum(ref) {
    if (!ref) return null;
    if (!Array.isArray(ref)) return this._num(ref);
    let summe = null;
    for (const id of ref) {
      const v = this._num(id);
      if (v != null) summe = (summe == null ? 0 : summe) + v;
    }
    return summe;
  }

  /**
   * Liest einen Wert, der in beide Richtungen gehen kann – entweder aus einem
   * Sensor mit Vorzeichen oder aus zwei getrennten, die nie negativ werden.
   */
  _bipolar(ref, invert) {
    if (!ref) return null;
    if (ref.single) {
      const v = this._num(ref.single);
      if (v == null) return null;
      return invert ? -v : v;
    }
    const p = this._num(ref.pos);
    const n = this._num(ref.neg);
    // Bei getrennten Sensoren steckt die Richtung schon im Sensornamen –
    // ein Umdrehen wäre hier falsch und wird bewusst nicht angewandt.
    if (p == null && n == null) return null;
    return (p == null ? 0 : p) - (n == null ? 0 : n);
  }

  /** Sammelt alle Messwerte und leitet die abgeleiteten Größen ab. */
  _readValues() {
    const c = this._config;
    const z = (v) => (v == null ? 0 : v);

    // Erzeugungsquellen: mehrere Sensoren je Quelle werden addiert.
    const sources = c.sources.map((q, i) => ({
      index: i,
      power: this._sum(q.power),
      name: q.name,
      icon: q.icon,
    }));
    const grid = this._bipolar(c.grid, c.invert_grid);
    const house = this._num(c.house);

    const batteries = c.batteries.map((b) => ({
      power: this._bipolar(b.power, c.invert_battery),
      soc: this._pctVal(b.soc),
      name: b.name,
    }));
    const paare = this._ordneAutosZu(c);
    const feste = this._festeAutos(c);
    const wallboxes = c.wallboxes.map((w, i) => {
      // Reihenfolge: was an der Wallbox steht, dann was das Auto sagt,
      // dann was die Karte selbst gefunden hat.
      const nummer = feste[i] !== undefined ? feste[i] : paare[i];
      const auto = w.car ? null : c.cars[nummer];
      const soc = w.car || (auto ? auto.soc : null);
      return {
        index: i,
        power: this._sum(w.power),
        name: w.name,
        icon: w.icon,
        carSoc: this._pctVal(soc),
        carName: (w.car ? w.car_name : auto && auto.name) || "Auto",
        carIcon: (w.car ? w.car_icon : auto && auto.icon) || null,
        // Worauf ein Tipp auf den Autokreis zeigt.
        carRef: soc,
        hatAuto: !!soc,
      };
    });
    const cars = c.cars.map((x) => ({ soc: this._pctVal(x.soc), name: x.name }));

    const production = sources.reduce((a, q) => a + Math.max(0, z(q.power)), 0);
    const batteryPower = batteries.reduce((a, b) => a + z(b.power), 0);
    const socList = batteries.map((b) => b.soc).filter((v) => v != null);
    const batterySoc = socList.length ? socList.reduce((a, b) => a + b, 0) / socList.length : null;
    const wallboxTotal = wallboxes.reduce((a, w) => a + Math.max(0, z(w.power)), 0);

    const gridImport = Math.max(0, z(grid));
    const gridExport = Math.max(0, -z(grid));

    // Wallboxen und Speicher hängen oft hinter dem Hauszähler. Dann steckt
    // ihre Leistung in dessen Messwert schon drin, und die Karte würde sie
    // zweimal zeigen: einmal im Haus und einmal im eigenen Zweig. Wer den
    // Schalter setzt, bekommt sie aus dem Hauswert herausgerechnet.
    //
    // Abgezogen werden ALLE markierten Wallboxen, auch die gerade nicht
    // gezeichneten – der Zähler misst sie schließlich mit.
    //
    // Beim Speicher ist das Vorzeichen wichtig: Laden erhöht den Zählerstand
    // und wird abgezogen, Entladen senkt ihn und wird wieder draufgerechnet.
    const abzug =
      batteries.reduce((a, b, i) => a + (c.batteries[i].in_house ? z(b.power) : 0), 0) +
      wallboxes.reduce((a, w, i) => a + (c.wallboxes[i].in_house ? Math.max(0, z(w.power)) : 0), 0);

    // Ohne gesetzten Schalter bleibt alles wie zuvor – auch ein negativer
    // Hauswert, den manche Zähler liefern.
    const houseNet =
      house == null ? null : abzug ? Math.max(0, house - abzug) : house;

    // Die Autarkie rechnet mit dem, was der Zähler anzeigt – das ist der
    // Verbrauch hinter ihm. Nicht mit dem Durchsatz: sonst zählten
    // Einspeisung und Speicherladung als „Verbrauch" mit.
    const consumption = house != null ? house : null;

    // Was am Verteilknoten zusammenläuft: alles, was hineinfließt. Die
    // Abflüsse – Haus, Wallboxen, Speicherladung, Einspeisung – müssten
    // dieselbe Summe ergeben. Tun sie es nicht, fehlt in der Messung etwas;
    // das ist eine Aussage über die Anlage, nicht über die Karte.
    //
    // Je Speicher gerechnet, nicht netto: Entlädt einer, während der andere
    // lädt, sind das zwei getrennte Flüsse – die Karte zeichnet sie ja auch
    // getrennt. Netto verrechnet verschwände der kleinere spurlos.
    const speicherZufuhr = batteries.reduce((a, b) => a + Math.max(0, -z(b.power)), 0);
    const durchsatz = production + gridImport + speicherZufuhr;

    // Autarkie und Eigenverbrauch: Wer einen eigenen Sensor hinterlegt hat,
    // bekommt dessen Wert. Viele Anlagen – E3/DC etwa – rechnen das selbst
    // aus, und gemessen schlägt geschätzt. Ohne Sensor rechnet die Karte.
    //
    // Ohne Hausverbrauchs-Sensor gibt es keine sinnvolle Autarkie – dann
    // lieber nichts anzeigen als 100 %, was wie ein Messwert aussähe.
    const autarkySensor = this._pctVal(c.autarky);
    // Ist ein Sensor hinterlegt, aber gerade nicht lesbar, rechnet die Karte
    // weiter – aber sie sagt es. Sonst steht dort eine Schätzung, die wie ein
    // Messwert aussieht, und niemand kommt darauf, dass der Sensor fehlt.
    const autarkyErsatz = !!c.autarky && autarkySensor == null;
    // Kommt die Zahl aus einem eigenen Sensor, weiß die Karte nicht, über
    // welchen Zeitraum er rechnet.
    const autarkyGemessen = autarkySensor != null;
    const autarky =
      autarkySensor != null
        ? autarkySensor / 100
        : consumption != null && consumption > 1
          ? Math.min(1, Math.max(0, (consumption - gridImport) / consumption))
          : null;

    const gen = production + Math.max(0, -batteryPower);
    const eigenSensor = this._pctVal(c.self_consumption);
    const selfErsatz = !!c.self_consumption && eigenSensor == null;
    const selfConsumption =
      eigenSensor != null
        ? eigenSensor / 100
        : gen > 1
          ? Math.min(1, Math.max(0, (gen - gridExport) / gen))
          : null;

    // Woher der Strom im Haus kommt. Angenommen wird, dass das Haus aus
    // derselben Mischung schöpft wie die Anlage insgesamt – wer eine Kilowatt-
    // stunde genau einer Quelle zuordnen will, bräuchte Messungen, die es in
    // dieser Form gar nicht gibt. Die Anteile sind deshalb eine Aufteilung
    // nach Einspeisung, keine Messung.
    const zufuhr = [
      ...sources.map((q, i) => ({ key: "src" + i, value: Math.max(0, z(q.power)) })),
      { key: "battery", value: speicherZufuhr },
      { key: "grid", value: gridImport },
    ].filter((x) => x.value > 0);
    const zufuhrSumme = zufuhr.reduce((a, x) => a + x.value, 0);
    const houseMix = zufuhrSumme > 0
      ? zufuhr.map((x) => ({ ...x, anteil: x.value / zufuhrSumme }))
      : [];

    return {
      grid, sources,
      // house ist der bereinigte Wert – ihn zeichnet die Karte. Der rohe
      // Messwert bleibt als houseRaw erhalten.
      house: houseNet,
      houseRaw: house,
      abzug,
      batteries, wallboxes, cars,
      production,
      batteryPower,
      batteryCharge: Math.max(0, batteryPower),
      batteryDischarge: Math.max(0, -batteryPower),
      batterySoc,
      wallboxTotal,
      gridImport, gridExport,
      consumption,
      autarky, selfConsumption, autarkyErsatz, selfErsatz, autarkyGemessen,
      durchsatz,
      houseMix,
    };
  }

  // ------------------------------------------------------------- Gerüst

  _buildShell() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          /* Bringt die Karte ihren eigenen dunklen Grund mit, ist Weiß
             richtig. Ist sie durchsichtig, sitzt sie auf dem Dashboard – dann
             muss alles außerhalb des Graphen dem Thema folgen, sonst steht
             weißer Text auf hellem Grund. Die Kugeln selbst sind innen immer
             dunkel, ihr weißer Text bleibt also lesbar. */
          --ppm-surface: ${c.transparent ? "transparent" : "#0B0E13"};
          --ppm-text: ${c.transparent
            ? "var(--primary-text-color, #FFFFFF)" : "#FFFFFF"};
          --ppm-muted: ${c.transparent
            ? "var(--secondary-text-color, rgba(255,255,255,.62))"
            : "rgba(255,255,255,.62)"};
          --ppm-tile: ${c.transparent
            ? "var(--secondary-background-color, rgba(255,255,255,.055))"
            : "rgba(255,255,255,.055)"};
          --ppm-line: ${c.transparent
            ? "var(--divider-color, rgba(255,255,255,.075))"
            : "rgba(255,255,255,.075)"};
          --ppm-track: ${c.transparent
            ? "var(--divider-color, rgba(255,255,255,.12))"
            : "rgba(255,255,255,.12)"};
          --ppm-warn-text: ${c.transparent
            ? "var(--primary-text-color, #FFC97A)" : "#FFC97A"};
          display: block;
          /* Gibt die Höhe des Containers durch. In der Abschnitts-Ansicht
             bestimmt sie getLayoutOptions, in der Kachel-Ansicht min_height. */
          height: 100%;
        }
        ha-card {
          background: var(--ppm-surface);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 0;
        }
        .head {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px 4px;
          color: var(--ppm-muted);
          font-size: 13px; font-weight: 500;
          flex: 0 0 auto;
        }
        .head .total {
          margin-left: auto;
          color: var(--ppm-text);
          font-weight: 700; font-size: 15px;
          font-variant-numeric: tabular-nums;
        }
        .graph-slot {
          /* Wunschhöhe, darf aber schrumpfen: min-height:0 hebt die
             Voreinstellung von Flexbox auf, sonst wird alles darunter
             aus der Karte gedrängt und von overflow:hidden abgeschnitten. */
          flex: 1 1 auto;
          height: ${c.min_height}px;
          min-height: 0;
          position: relative;
        }
        .graph-slot svg { width: 100%; height: 100%; display: block; }
        .tiles { display: flex; gap: 8px; padding: 2px 12px 14px; flex: 0 0 auto; }
        .tile {
          flex: 1; background: var(--ppm-tile);
          border: 1px solid var(--ppm-line);
          border-radius: 13px; padding: 8px 9px 9px;
        }
        .t-label { font-size: 10.5px; color: var(--ppm-muted); letter-spacing: .02em; }
        .t-value {
          font-size: 17px; font-weight: 700; color: var(--ppm-text);
          margin: 1px 0 6px; font-variant-numeric: tabular-nums;
        }
        .t-track { height: 4px; border-radius: 2px; background: var(--ppm-track);
          overflow: hidden; display: flex; }
        .t-fill { height: 100%; border-radius: 2px; transition: width .5s ease; flex: 0 0 auto; }
        .warn {
          flex: 0 0 auto;
          margin: 4px 12px 8px; padding: 9px 11px;
          border-radius: 10px; font-size: 12px; line-height: 1.45;
          background: rgba(255,159,10,.13);
          border: 1px solid rgba(255,159,10,.3);
          color: var(--ppm-warn-text);
        }
        .warn b { color: var(--ppm-warn-text); }
        .node-hit { cursor: pointer; }
        @keyframes ppm-flow { to { stroke-dashoffset: var(--ppm-travel); } }
        .flow-dash { animation: ppm-flow linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .flow-dash { animation: none; }
        }
      </style>
      <ha-card>
        <div class="head">
          <span>${c.title ?? "Energiefluss"}</span>
          <span class="total" id="total">–</span>
        </div>
        <div class="warn" id="warn" style="display:none"></div>
        <div class="graph-slot"><svg id="graph" preserveAspectRatio="xMidYMid meet"></svg></div>
        ${c.show_tiles ? '<div class="tiles" id="tiles"></div>' : ""}
      </ha-card>
    `;

    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => this._scheduleRender());
      this._resizeObserver.observe(this.shadowRoot.querySelector(".graph-slot"));
    }
  }

  _scheduleRender() {
    if (!this._config || !this._hass || !this.shadowRoot.querySelector("#graph")) return;
    if (this._pending) return;
    this._pending = requestAnimationFrame(() => {
      this._pending = null;
      try {
        this._render();
      } catch (err) {
        console.error("[power-flow-card-plus-mobile] Zeichnen fehlgeschlagen:", err);
      }
    });
  }

  /**
   * Löst die Standardaktion aus. `hass-action` statt `hass-more-info`, damit
   * später auch `tap_action` aus der Konfiguration greifen kann.
   * Beide Flags sind nötig, sonst verlässt das Ereignis das Shadow DOM nicht.
   */
  _action(entityId) {
    if (!entityId) return;
    const ev = new Event("hass-action", { bubbles: true, composed: true });
    ev.detail = {
      config: { entity: entityId, tap_action: { action: "more-info" } },
      action: "tap",
    };
    this.dispatchEvent(ev);
  }

  /** Meldet fehlende oder kaputte Entitäten sichtbar statt still. */
  _checkEntities() {
    const c = this._config;
    const box0 = this.shadowRoot.querySelector("#warn");

    // Frisch hinzugefügt und noch nichts ausgewählt: sagen, was zu tun ist,
    // statt einen leeren Graph ohne Erklärung stehen zu lassen.
    if (!c.sources.length && !c.grid && !c.house &&
        !c.batteries.length && !c.wallboxes.length) {
      box0.innerHTML =
        "<b>Noch nichts eingerichtet.</b><br>Auf <i>Bearbeiten</i> tippen und " +
        "mindestens eine Quelle auswählen – Sonne, Netz oder Zuhause.";
      box0.style.display = "block";
      return;
    }

    const ids = this._watched || [];
    const fehlt = ids.filter((id) => !this._hass.states[id]);
    const kaputt = ids.filter((id) => {
      const st = this._hass.states[id];
      return st && (st.state === "unavailable" || st.state === "unknown");
    });

    const box = this.shadowRoot.querySelector("#warn");
    if (!fehlt.length && !kaputt.length) {
      box.style.display = "none";
      return;
    }
    const teile = [];
    if (fehlt.length) teile.push(`<b>Unbekannt:</b> ${fehlt.join(", ")}`);
    if (kaputt.length) teile.push(`<b>Gerade nicht erreichbar:</b> ${kaputt.join(", ")}`);
    box.innerHTML = teile.join("<br>");
    box.style.display = "block";
  }

  // ------------------------------------------------------------ Zeichnen

  _render() {
    const c = this._config;
    this._pal = buildPalette(c.colors, this);
    const PAL = this._pal;
    const IC = c.icons || {};
    const v = this._readValues();

    // Steht die Karte auf hellem Grund? Das entscheidet der Text des Themas:
    // ist er dunkel, ist der Hintergrund hell. Zuverlaessiger als den
    // Hintergrund selbst zu raten, den kann jedes Thema anders setzen.
    const istHell = (() => {
      if (!c.transparent) return false;   // eigener dunkler Grund
      const s = cssVar("--primary-text-color", this, "#FFFFFF");
      const m = s.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
      const hex = s.match(/^#([0-9a-f]{6})$/i);
      let r, gr, bl;
      if (m) { r = +m[1]; gr = +m[2]; bl = +m[3]; }
      else if (hex) {
        r = parseInt(hex[1].slice(0, 2), 16);
        gr = parseInt(hex[1].slice(2, 4), 16);
        bl = parseInt(hex[1].slice(4, 6), 16);
      } else return false;
      return (r * 299 + gr * 587 + bl * 114) / 1000 < 128;
    })();

    // Innenleben der Kugeln. Auf hellem Grund waeren schwarze Scheiben mit
    // weisser Schrift ein Fremdkoerper - beides dreht sich um.
    const KUGEL = istHell ? "#F2F3F5" : (c.transparent ? "#0B0E13" : "#101318");
    const SCHRIFT = istHell ? "#212121" : "#fff";
    const SYMBOL = istHell ? "rgba(0,0,0,.78)" : "rgba(255,255,255,.92)";
    const RINNE = istHell ? "rgba(0,0,0,.10)" : "rgba(255,255,255,.10)";

    // Farbe und Symbol je Erzeugungsquelle. Reihenfolge der Zuständigkeit:
    // was am Eintrag steht, dann die Liste unter colors/icons, dann – nur für
    // Einträge, die aus der alten pv/external-Schreibweise stammen – die
    // alten Einzelangaben, sonst die Voreinstellung.
    const quellListe = (o, a, b) => (o && (o[a] || o[b])) || [];
    const quellFarbe = (i) => {
      const q = c.sources[i] || {};
      if (q.color) return toColor(q.color, C.quellen[i % C.quellen.length], this);
      const liste = quellListe(c.colors, "sources", "quellen");
      if (liste[i]) return toColor(liste[i], C.quellen[i % C.quellen.length], this);
      // Die ersten beiden Quellen tragen dieselbe Vorgabe wie früher pv und
      // external – gleich, ob sie aus der alten oder der neuen Schreibweise
      // stammen.
      if (i === 0) return PAL.pv;
      if (i === 1) return PAL.ext;
      return toColor(C.quellen[i % C.quellen.length], C.quellen[i % C.quellen.length], this);
    };
    const quellIcon = (i) => {
      const q = c.sources[i] || {};
      if (q.icon) return q.icon;
      const liste = quellListe(IC, "sources", "quellen");
      if (liste[i]) return liste[i];
      if (q.alt === 0) return IC.pv;
      if (q.alt === 1) return IC.external;
      return QUELL_ICON[i % QUELL_ICON.length];
    };
    const svg = this.shadowRoot.querySelector("#graph");
    const slot = svg.parentElement;

    const w = slot.clientWidth || 360;
    const h = slot.clientHeight || c.min_height;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Nur ladende Wallboxen erscheinen, höchstens zwei – die mit der höchsten
    // Leistung. Lädt nichts, bleibt der untere Bereich leer. Ein Auto wird nur
    // gezeigt, wenn die Wallbox darüber auch wirklich lädt.
    const aktiv = v.wallboxes
      .filter((w) => w.power != null && w.power > c.threshold)
      .sort((a, b) => b.power - a.power)
      .slice(0, 2);
    const R = canvasRect(w, h);
    const N = buildNodes(
      c.batteries.length,
      aktiv.length,
      aktiv.map((w) => w.carSoc != null),
      c.sources.length,
      R.w / R.h
    );
    const L = buildLinks(N, c.sources.length);
    const scale = R.w / 374;

    const P = (n) => ({ x: R.x + N[n].x * R.w, y: R.y + N[n].y * R.h });
    const RAD = (n) => N[n].r * R.w;
    const anchor = (n, deg) => {
      const rad = (deg * Math.PI) / 180;
      const p = P(n);
      const r = RAD(n);
      return { x: p.x + Math.cos(rad) * r, y: p.y + Math.sin(rad) * r };
    };

    const waypoints = (link) => {
      const s = anchor(link.from, link.fa);
      const e = anchor(link.to, link.ta);
      if (link.fx === "v" && link.tx === "v") {
        if (Math.abs(s.x - e.x) < 1) return [s, e];
        const my = (s.y + e.y) / 2;
        return [s, { x: s.x, y: my }, { x: e.x, y: my }, e];
      }
      if (link.fx === "h" && link.tx === "h") {
        if (Math.abs(s.y - e.y) < 1) return [s, e];
        const mx = (s.x + e.x) / 2;
        return [s, { x: mx, y: s.y }, { x: mx, y: e.y }, e];
      }
      if (link.fx === "v") return [s, { x: s.x, y: e.y }, e];
      return [s, { x: e.x, y: s.y }, e];
    };

    const roundedPath = (pts, radius) => {
      if (pts.length < 2) return "";
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
        const d1 = dist(p0, p1), d2 = dist(p1, p2);
        if (d1 < 0.5 || d2 < 0.5) { d += ` L ${p1.x} ${p1.y}`; continue; }
        const r = Math.min(radius, d1 / 2, d2 / 2);
        const a = lerp(p1, p0, r / d1), b = lerp(p1, p2, r / d2);
        d += ` L ${a.x} ${a.y} Q ${p1.x} ${p1.y} ${b.x} ${b.y}`;
      }
      const last = pts[pts.length - 1];
      return `${d} L ${last.x} ${last.y}`;
    };

    /**
     * Länge desselben Weges. Die Ecken sind immer rechte Winkel, denn die
     * Stützpunkte laufen nur waagerecht und senkrecht. Ein quadratischer
     * Bogen über einen rechten Winkel misst 1,6231 · r – zwischen der Ecke
     * (2 r) und dem Viertelkreis (1,5708 r), nachgerechnet über das Integral
     * der Ableitung.
     */
    const pfadLaenge = (pts, radius) => {
      if (pts.length < 2) return 0;
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      let len = 0;
      let von = pts[0];
      for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
        const d1 = dist(p0, p1), d2 = dist(p1, p2);
        if (d1 < 0.5 || d2 < 0.5) { len += dist(von, p1); von = p1; continue; }
        const r = Math.min(radius, d1 / 2, d2 / 2);
        len += dist(von, lerp(p1, p0, r / d1)) + 1.6231 * r;
        von = lerp(p1, p2, r / d2);
      }
      return len + dist(von, pts[pts.length - 1]);
    };

    // ---------------------------------------------------- Flusszustände
    const T = c.threshold;
    const states = {};
    const put = (id, p, color, reversed) => {
      states[id] = { power: p > T ? p : 0, color, reversed: !!reversed };
    };
    const z = (x) => (x == null ? 0 : x);

    v.sources.forEach((q, i) => {
      put("src" + (i + 1), Math.max(0, z(q.power)), quellFarbe(i));
    });
    put("bus", v.production, PAL.bus);
    put("house", Math.max(0, z(v.house)), PAL.house);
    put("grid", Math.abs(z(v.grid)), z(v.grid) > 0 ? PAL.gridIn : PAL.grid, z(v.grid) < 0);
    v.batteries.forEach((b, i) => {
      put(`bat${i + 1}`, Math.abs(z(b.power)), this._batColor(b.soc, b.power), z(b.power) > 0);
    });
    aktiv.forEach((w, i) => {
      put(`wb${i + 1}`, Math.max(0, z(w.power)), PAL.wb[w.index % PAL.wb.length]);
      if (w.carSoc != null) {
        put(`car${i + 1}`, Math.max(0, z(w.power)), PAL.car[i % PAL.car.length]);
      }
    });
    // Der gemeinsame Strang trägt beide Ladeleistungen und bekommt die Farbe
    // der stärkeren – stehen alle Wallboxen auf einer Farbe, was die Vorgabe
    // ist, macht das ohnehin keinen Unterschied.
    if (aktiv.length === 2) {
      put("wbStamm",
        aktiv.reduce((a, w) => a + Math.max(0, z(w.power)), 0),
        PAL.wb[aktiv[0].index % PAL.wb.length]);
    }

    // ---------------------------------------------------------- Linien
    L.forEach((link) => {
      const st = states[link.id];
      if (!st) return;
      const pts = waypoints(link);
      const dPath = roundedPath(pts, R.w * 0.045);
      const laenge = pfadLaenge(pts, R.w * 0.045);
      const active = st.power > 0;
      // Die Dicke sagt, wie viel fließt. Auf einem kurzen Weg darf sie das
      // aber nicht dicker sagen als ein Viertel der Weglänge – sonst bleibt
      // von der Verbindung nur ein Klecks zwischen zwei Kreisen übrig. Ein
      // Viertel ist die Grenze, ab der zwei Punkte mit Lücke daraufpassen;
      // schärfer gekappt würde eine starke Quelle dünner gezeichnet als eine
      // schwache mit längerem Weg, und die Dicke löge.
      const lw = active
        ? Math.max(1.6, Math.min(
            Math.min(9, 1.6 + Math.sqrt(st.power / 1000) * 2.2) * scale,
            laenge / 4
          ))
        : 1.6;

      svg.appendChild(
        el("path", {
          d: dPath, fill: "none",
          stroke: active ? st.color : "rgba(255,255,255,.12)",
          "stroke-opacity": active ? 0.35 : 1,
          "stroke-width": active ? lw : 1.6,
          "stroke-linecap": "round",
        })
      );
      if (!active || !c.animate) return;

      // Punkte gleichmäßig verteilen: eine ganze Zahl von Perioden auf den
      // Weg, mindestens zwei. Sonst steht auf kurzen Wegen ein einzelner
      // fetter Punkt – oder zeitweise gar keiner, wenn die Periode länger
      // ist als der Weg. Die runde Kappe verlängert jeden Punkt um lw, also
      // muss die Lücke das überstehen: sie bleibt mindestens 0,6 · lw breit.
      const period = laenge / Math.max(2, Math.round(laenge / (lw * 3.3)));
      const dash = [
        Math.max(0.05, Math.min(lw * 0.7, period - lw * 1.6)),
        0,
      ];
      dash[1] = period - dash[0];
      const speed = Math.min(90, 26 + Math.sqrt(st.power / 1000) * 16) * scale;
      const p = el("path", {
        d: dPath, fill: "none", stroke: st.color,
        "stroke-width": lw, "stroke-linecap": "round",
        "stroke-dasharray": `${dash[0].toFixed(2)} ${dash[1].toFixed(2)}`,
      });
      p.setAttribute("class", "flow-dash");
      p.style.setProperty("--ppm-travel", (st.reversed ? period : -period).toFixed(2));
      p.style.animationDuration = `${(period / speed).toFixed(3)}s`;
      p.style.filter = `drop-shadow(0 0 4px ${st.color})`;
      svg.appendChild(p);
    });

    // ---------------------------------------------------------- Knoten
    const ringArc = (cx, cy, r, from, to, color, width) => {
      const a0 = from * 2 * Math.PI - Math.PI / 2;
      const a1 = to * 2 * Math.PI - Math.PI / 2;
      if (to - from >= 0.999) {
        return el("circle", { cx, cy, r, fill: "none", stroke: color, "stroke-width": width });
      }
      const large = to - from > 0.5 ? 1 : 0;
      return el("path", {
        d: `M ${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} A ${r} ${r} 0 ${large} 1 ${
          cx + Math.cos(a1) * r
        } ${cy + Math.sin(a1) * r}`,
        fill: "none", stroke: color, "stroke-width": width, "stroke-linecap": "round",
      });
    };

    const textNode = (g, x, y, str, size, weight, fill, opacity) => {
      const t = el("text", {
        x, y, "text-anchor": "middle", "font-size": size, "font-weight": weight, fill,
      });
      // Über style, nicht als Attribut: in SVG-Präsentationsattributen wird
      // var() nicht zuverlässig ersetzt.
      t.style.fontFamily = "var(--paper-font-body1_-_font-family, system-ui, sans-serif)";
      if (opacity != null) t.setAttribute("opacity", opacity);
      t.textContent = str;
      g.appendChild(t);
      return t;
    };

    // Bei getrennten Sensoren gibt es keine eine Entität – fürs Antippen
    // nimmt die Karte die erste, die konfiguriert ist.
    const erste = (ref) => (ref ? ref.single || ref.pos || ref.neg : null);

    const drawNode = (key, o) => {
      if (!N[key]) return;
      const cc = P(key), r = RAD(key), d = r * 2;
      const g = el("g", {});
      if (o.entity) g.setAttribute("class", "node-hit");

      g.appendChild(el("circle", { cx: cc.x, cy: cc.y, r, fill: KUGEL }));

      if (o.ringSegments) {
        g.appendChild(el("circle", {
          cx: cc.x, cy: cc.y, r: r - d * 0.026, fill: "none",
          stroke: RINNE, "stroke-width": d * 0.052,
        }));
        const total = o.ringSegments.reduce((a, b) => a + b.value, 0);
        if (total <= 0) {
          g.appendChild(el("circle", {
            cx: cc.x, cy: cc.y, r: r - d * 0.026, fill: "none",
            stroke: "rgba(39,224,165,.35)", "stroke-width": d * 0.052,
          }));
        } else {
          const gap = o.ringSegments.length > 1 ? 0.012 : 0;
          const usable = 1 - gap * o.ringSegments.length;
          let cursor = gap / 2;
          o.ringSegments.forEach((seg) => {
            const span = (seg.value / total) * usable;
            const arc = ringArc(cc.x, cc.y, r - d * 0.026, cursor, cursor + span, seg.color, d * 0.052);
            arc.setAttribute("filter", `drop-shadow(0 0 4px ${seg.color})`);
            g.appendChild(arc);
            cursor += span + gap;
          });
        }
      } else if (o.soc != null) {
        const lw = d * (o.thinRing ? 0.075 : 0.055);
        g.appendChild(el("circle", {
          cx: cc.x, cy: cc.y, r: r - lw / 2, fill: "none",
          stroke: RINNE, "stroke-width": lw,
        }));
        if (o.ticks) {
          for (let i = 0; i < 40; i++) {
            const a = (i / 40) * 2 * Math.PI - Math.PI / 2;
            const ro = r - lw * 0.15, ri = ro - lw * 0.9;
            g.appendChild(el("line", {
              x1: (cc.x + Math.cos(a) * ri).toFixed(2), y1: (cc.y + Math.sin(a) * ri).toFixed(2),
              x2: (cc.x + Math.cos(a) * ro).toFixed(2), y2: (cc.y + Math.sin(a) * ro).toFixed(2),
              stroke: "rgba(255,255,255,.18)", "stroke-width": 1,
            }));
          }
        }
        const f = Math.min(1, Math.max(0, o.soc / 100));
        if (f > 0.002) {
          const arc = ringArc(cc.x, cc.y, r - lw / 2, 0, f, o.tint, lw);
          arc.setAttribute("filter", `drop-shadow(0 0 5px ${o.tint})`);
          g.appendChild(arc);
        }

        // Ein zweiter, dünnerer Ring weiter innen: woher der Strom kommt, der
        // gerade lädt. Der Ladestand bleibt außen – er ist die wichtigere
        // Zahl und soll nicht dafür weichen.
        const inn = o.innerSegments;
        if (inn && inn.length > 1) {
          const gesamt = inn.reduce((a, s) => a + s.value, 0);
          if (gesamt > 0) {
            const iw = Math.max(1.5, lw * 0.42);
            const ir = r - lw - iw * 1.35;
            const luecke = 0.014;
            const nutz = 1 - luecke * inn.length;
            let cur = luecke / 2;
            inn.forEach((s) => {
              const span = (s.value / gesamt) * nutz;
              g.appendChild(ringArc(cc.x, cc.y, ir, cur, cur + span, s.color, iw));
              cur += span + luecke;
            });
          }
        }
      } else {
        const lw = Math.max(1.5, d * (o.bus ? 0.035 : 0.022));
        const ring = el("circle", {
          cx: cc.x, cy: cc.y, r: r - lw / 2, fill: "none",
          stroke: o.tint, "stroke-width": lw, opacity: o.active ? 1 : 0.4,
        });
        ring.setAttribute("filter", `drop-shadow(0 0 ${d * 0.05}px ${o.tint})`);
        g.appendChild(ring);
      }

      if (o.bus) {
        textNode(g, cc.x, cc.y + d * 0.09, o.value, d * 0.24, 600, SCHRIFT);
      } else {
        // Symbol und Text als ein Block, der als Ganzes mittig im Kreis sitzt.
        // Der Abstand hängt an der tatsächlichen Symbolgröße, nicht an einem
        // festen Wert – sonst klebt der Titel bei großen Symbolen daran.
        const symGroesse = d * (o.compact ? 0.19 : 0.22);
        const eigenes = mdiIcon(o.mdi, 0, 0, symGroesse, SYMBOL);
        const luft = d * 0.075;          // zwischen Symbol und Titel
        const hTitel = d * 0.108;
        const hWert = d * 0.145;
        const hDetail = d * 0.1;
        const zeilenLuft = d * 0.045;    // zwischen den Textzeilen

        const blockH = symGroesse + luft + hTitel + zeilenLuft + hWert +
          (o.detail ? zeilenLuft + hDetail : 0);
        const oben = cc.y - blockH / 2;

        // Symbolmitte, dann jede Textzeile auf ihrer Grundlinie.
        const symY = oben + symGroesse / 2;
        if (eigenes) {
          eigenes.setAttribute("x", (cc.x - symGroesse / 2).toFixed(2));
          eigenes.setAttribute("y", (symY - symGroesse / 2).toFixed(2));
          g.appendChild(eigenes);
        } else {
          g.appendChild(icon(o.icon, cc.x, symY, symGroesse * 0.86, SYMBOL));
        }

        let y = oben + symGroesse + luft + hTitel;
        textNode(g, cc.x, y, o.title, hTitel, 500, SCHRIFT, 0.72);
        y += zeilenLuft + hWert;
        textNode(g, cc.x, y, o.value, hWert, 600, SCHRIFT);
        if (o.detail) {
          y += zeilenLuft + hDetail;
          textNode(g, cc.x, y, o.detail, hDetail, 500, o.tint);
        }
        if (o.legend) {
          const step = d * 0.185;
          let lx = cc.x - (step * (o.legend.length - 1)) / 2;
          o.legend.forEach((item) => {
            g.appendChild(el("circle", {
              cx: lx - d * 0.048, cy: y + d * 0.11, r: d * 0.021,
              fill: item.color, opacity: item.on ? 1 : 0.35,
            }));
            const t = textNode(g, lx + d * 0.03, y + d * 0.145, item.label, d * 0.068, 500, SCHRIFT,
              item.on ? 0.9 : 0.4);
            t.setAttribute("text-anchor", "start");
            lx += step;
          });
        }
      }

      if (o.entity) {
        // Unsichtbare Trefferfläche, damit der ganze Kreis antippbar ist.
        const hit = el("circle", { cx: cc.x, cy: cc.y, r, fill: "transparent" });
        hit.addEventListener("click", () => this._action(o.entity));
        g.appendChild(hit);
      }
      svg.appendChild(g);
    };

    v.sources.forEach((q, i) => {
      drawNode("src" + (i + 1), {
        icon: i ? "panel" : "sun",
        mdi: quellIcon(i),
        title: q.name,
        value: fmtPower(q.power == null ? null : Math.max(0, q.power)),
        tint: quellFarbe(i),
        active: z(q.power) > T,
        entity: erste(c.sources[i].power),
      });
    });
    drawNode("busGen", { bus: true, value: fmtPower(v.production), tint: PAL.bus, active: true });
    drawNode("busDist", { bus: true, value: fmtPower(v.durchsatz), tint: PAL.bus, active: true });
    drawNode("grid", {
      icon: "plug", mdi: IC.grid || "mdi:transmission-tower", title: "Netz", value: fmtPower(v.grid == null ? null : Math.abs(v.grid)),
      detail: z(v.grid) > T ? "Bezug" : v.gridExport > T ? "Einspeisung" : null,
      tint: z(v.grid) > 0 ? PAL.gridIn : PAL.grid, active: Math.abs(z(v.grid)) > T,
      entity: erste(c.grid),
    });
    // Der Ring um das Haus zeigt, woher der Strom kommt: je Quelle ein Bogen
    // in ihrer eigenen Farbe. Ohne brauchbare Werte bleibt es beim einfarbigen
    // Ring, damit nicht ein leerer Kreis wie ein Messwert aussieht.
    const mixFarbe = {
      grid: PAL.gridIn,
      battery: this._batColor(v.batterySoc, -1),
    };
    v.sources.forEach((q, i) => { mixFarbe["src" + i] = quellFarbe(i); });
    // Die Mischung selbst hängt nicht daran, wo sie gezeigt wird – Haus und
    // Auto greifen auf dieselbe Aufteilung zu, jedes mit eigenem Schalter.
    const mischung = v.houseMix.length > 1
      ? v.houseMix.map((x) => ({ value: x.value, color: mixFarbe[x.key] }))
      : null;
    const hausRing = c.house_mix && z(v.house) > T ? mischung : null;

    drawNode("house", {
      icon: "house", mdi: IC.house || "mdi:home-assistant", title: "Zuhause", value: fmtPower(v.house),
      tint: PAL.house, active: z(v.house) > T, entity: c.house,
      ringSegments: hausRing,
    });

    v.batteries.forEach((b, i) => {
      drawNode(`battery${i + 1}`, {
        icon: "battery", mdi: c.batteries[i].icon, title: b.name, value: fmtPower(b.power), detail: fmtSoc(b.soc),
        soc: b.soc, ticks: true, tint: this._batColor(b.soc, b.power),
        active: Math.abs(z(b.power)) > T,
        entity: c.batteries[i].soc || erste(c.batteries[i].power),
      });
    });

    aktiv.forEach((w, i) => {
      const roh = c.wallboxes[w.index];
      drawNode(`wb${i + 1}`, {
        icon: "charger", mdi: w.icon, title: w.name, value: fmtPower(w.power),
        compact: true, tint: PAL.wb[w.index % PAL.wb.length], active: true,
        entity: Array.isArray(roh.power) ? roh.power[0] : roh.power,
      });
      if (w.carSoc != null) {
        drawNode(`car${i + 1}`, {
          icon: "car", mdi: w.carIcon, title: w.carName, value: fmtSoc(w.carSoc),
          soc: w.carSoc, thinRing: true, tint: PAL.car[i % PAL.car.length],
          active: true, entity: w.carRef,
          // Nur solange wirklich geladen wird – ein Herkunftsring an einem
          // stehenden Auto wäre eine Aussage über nichts.
          innerSegments: c.car_mix && z(w.power) > T ? mischung : null,
        });
      }
    });

    // ------------------------------------------------------- Kopf & Kacheln
    this.shadowRoot.querySelector("#total").textContent = fmtPower(v.production);

    if (c.show_tiles) {
      // Der Autarkie-Balken zeigt, woher der Strom kam, der nicht aus dem Netz
      // stammt: je Quelle ein Stück in ihrer Farbe. Autarkie ist ja gerade der
      // Anteil ohne Netzbezug – der gefüllte Teil lässt sich also genau nach
      // den übrigen Quellen aufteilen.
      //
      // Kommt die Autarkie aus einem eigenen Sensor, passen Messwert und
      // Mischung nicht exakt zusammen. Dann werden die Anteile auf die
      // gemessene Länge gestreckt: die Zahl bleibt die gemessene, die Farben
      // zeigen weiterhin das Verhältnis.
      // Die Farben zeigen die Mischung von **jetzt**. Das passt nur zu einer
      // Zahl, die auch von jetzt ist – also zur eigenen Rechnung der Karte.
      // Kommt sie aus einem eigenen Sensor, ist sie meist ein Tageswert:
      // abends stünde dann ein Tageswert vollständig in der Farbe des
      // Speichers, der gerade liefert, obwohl der Tag über die Sonne lief.
      // Länge und Farben hätten zwei verschiedene Zeiträume. Dann lieber
      // einfarbig – lieber keine Aussage als eine falsche.
      const ohneNetz = c.autarky_mix && !v.autarkyGemessen && mischung
        ? mischung.filter((s) => s.color !== mixFarbe.grid)
        : null;
      const autarkieStuecke = ohneNetz && ohneNetz.length
        ? (() => {
            const summe = ohneNetz.reduce((a, s) => a + s.value, 0);
            if (!summe) return null;
            const voll = Math.min(1, Math.max(0, v.autarky ?? 0));
            return ohneNetz.map((s) => ({ f: (s.value / summe) * voll, color: s.color }));
          })()
        : null;

      // Ein vorangestelltes ≈ heißt: der hinterlegte Sensor war nicht lesbar,
      // das hier ist die eigene Rechnung. Ohne das Zeichen sähe eine
      // Schätzung genauso aus wie ein Messwert.
      const ersatzHinweis =
        "Der hinterlegte Sensor ist gerade nicht lesbar – die Karte rechnet selbst.";
      const pct = (f, ersatz) => (f == null ? "–" : (ersatz ? "≈" : "") + fmtPct(f));
      const tiles = [
        { label: "Autarkie", value: pct(v.autarky, v.autarkyErsatz), f: v.autarky ?? 0,
          color: PAL.house, stuecke: autarkieStuecke, ersatz: v.autarkyErsatz },
        { label: "Eigenverbrauch", value: pct(v.selfConsumption, v.selfErsatz),
          f: v.selfConsumption ?? 0, color: PAL.pv, ersatz: v.selfErsatz },
        { label: "Speicher", value: fmtSoc(v.batterySoc), f: (v.batterySoc ?? 0) / 100, color: this._batColor(v.batterySoc) },
      ];
      const balken = (t) =>
        t.stuecke
          ? t.stuecke
              .map((s) =>
                `<div class="t-fill" style="width:${(Math.min(1, Math.max(0, s.f)) * 100).toFixed(1)}%;` +
                `background:${s.color};box-shadow:0 0 5px ${s.color}"></div>`)
              .join("")
          : `<div class="t-fill" style="width:${(Math.min(1, Math.max(0, t.f)) * 100).toFixed(1)}%;` +
            `background:${t.color};box-shadow:0 0 5px ${t.color}"></div>`;
      this.shadowRoot.querySelector("#tiles").innerHTML = tiles
        .map((t) =>
          `<div class="tile"${t.ersatz ? ` title="${ersatzHinweis}"` : ""}>` +
          `<div class="t-label">${t.label}</div>` +
          `<div class="t-value">${t.value}</div>` +
          `<div class="t-track">${balken(t)}</div></div>`
        )
        .join("");
    }

    this._checkEntities();
  }
}

// ====================================================== Visueller Editor
//
// Zweites Element in derselben Datei, ebenfalls ohne Build-Schritt. Es benutzt
// nur <ha-form> von Home Assistant und beschreibt die Felder über Selektoren.
//
// Wichtig: Die Konfiguration, die Home Assistant hereingibt, ist eingefroren.
// Sie wird nie verändert, es wird immer ein frisches Objekt zurückgemeldet –
// und zwar vollständig, inklusive `type`. Home Assistant führt nichts zusammen.

/**
 * Entitätsauswahl. Bewusst nur nach Domäne gefiltert, NICHT nach device_class:
 * viele Integrationen setzen sie gar nicht (etwa selbstgebaute Summen-Sensoren),
 * und ein strenger Filter würde genau die verstecken.
 */
const SEL_ENTITY = { entity: { filter: [{ domain: ["sensor", "input_number", "number"] }] } };
// Der Steckerzustand ist keine Zahl. Mit dem Zahlenfilter oben taucht ein
// binary_sensor in der Auswahl gar nicht erst auf.
const SEL_ZUSTAND = {
  entity: { filter: [{ domain: [
    "binary_sensor", "sensor", "input_boolean", "switch",
    "select", "input_select", "lock", "device_tracker",
  ] }] },
};
const SEL_COLOR = { ui_color: {} };
const SEL_TEXT = { text: {} };
const SEL_ICON = { icon: {} };

/**
 * Räumt die feste Eintragung an der Wallbox weg, die dieses Auto gerade
 * gewählt hat. Ohne das bliebe die Wahl wirkungslos: was an der Wallbox
 * steht, schlägt alles andere.
 */
function ohneAltesAuto(cfg, auto) {
  if (!auto || !auto.wallbox) return cfg;
  const wbs = [...(cfg.wallboxes || [])];
  const i = auto.wallbox - 1;
  if (!wbs[i] || !wbs[i].car) return cfg;
  const w = { ...wbs[i] };
  delete w.car; delete w.car_name; delete w.car_icon;
  wbs[i] = w;
  return { ...cfg, wallboxes: wbs };
}

/**
 * Nach dem Entfernen einer Wallbox zeigen die Autos dahinter sonst auf die
 * falsche – und das Auto der entfernten auf gar keine.
 */
function nachWallboxLoeschen(cars, weg) {
  if (!Array.isArray(cars) || !cars.length) return cars;
  return cars.map((a) => {
    if (!a || !a.wallbox) return a;
    if (a.wallbox - 1 === weg) { const k = { ...a }; delete k.wallbox; return k; }
    if (a.wallbox - 1 > weg) return { ...a, wallbox: a.wallbox - 1 };
    return a;
  });
}

const LABELS = {
  title: "Überschrift",
  pv: "Solarerzeugung",
  external: "Zweite Quelle (optional)",
  house: "Hausverbrauch",
  autarky: "Autarkie – eigener Sensor (optional)",
  self_consumption: "Eigenverbrauch – eigener Sensor (optional)",
  grid_mode: "Netz – Bauart der Sensoren",
  grid: "Netz (positiv = Bezug)",
  grid_consumption: "Netz – Bezug",
  grid_production: "Netz – Einspeisung",
  power_mode: "Bauart der Sensoren",
  power: "Leistung (positiv = lädt)",
  charge: "Laden",
  discharge: "Entladen",
  soc: "Ladestand",
  included_in_house: "Hängt hinter dem Hauszähler",
  name: "Name",
  icon: "Symbol",
  car: "Auto – Ladestand (optional)",
  plug: "Ladestecker – Zustand (optional)",
  charge_power: "Ladeleistung (optional)",
  wallbox: "Hängt an dieser Wallbox",
  car_match: "Auto selbst zuordnen",
  car_match_window: "Steckerzeitpunkte dürfen auseinanderliegen (s)",
  car_match_tolerance: "Leistungen dürfen abweichen (%)",
  car_match_unique: "Bleibt nur eins übrig, sofort zuordnen",
  car_name: "Auto – Name",
  car_icon: "Auto – Symbol",
  color: "Farbe",
  power_sources: "Leistung",
  icon_grid: "Symbol Netz",
  icon_house: "Symbol Zuhause",
  color_grid_import: "Farbe Netzbezug",
  color_grid_export: "Farbe Einspeisung",
  color_house: "Farbe Zuhause",
  color_battery: "Farbe Speicher (beide Richtungen)",
  color_battery_charge: "Farbe Laden",
  color_battery_discharge: "Farbe Entladen",
  color_wallboxes: "Farbe Wallboxen",
  color_cars: "Farbe Autos",
  threshold: "Schwelle für „ruhig“ (W)",
  min_height: "Höhe des Graphen (px)",
  animate: "Fluss animieren",
  house_mix: "Hauskreis nach Herkunft färben",
  car_mix: "Autokreis nach Herkunft färben",
  autarky_mix: "Autarkie-Balken nach Herkunft färben",
  show_tiles: "Kacheln unten zeigen",
  transparent: "Durchsichtiger Hintergrund",
};

const computeLabel = (s) => LABELS[s.name] || s.name;

/** Kleingedrucktes unter einzelnen Feldern – nur wo es wirklich hilft. */
const HELFER = {
  included_in_house:
    "Anschalten, wenn dieses Gerät hinter dem Hauszähler hängt. Die Karte " +
    "rechnet seine Leistung dann aus dem Hausverbrauch heraus, statt sie " +
    "doppelt zu zeigen.",
  car_match:
    "Aus: es gilt, was an der Wallbox eingetragen ist. Über den Stecker: " +
    "wer zusammen eingesteckt wurde, gehört zusammen – dafür braucht es " +
    "je einen Steckersensor an Wallbox und Auto. Über die Ladeleistung: " +
    "verglichen wird, was die Wallbox abgibt und das Auto aufnimmt. " +
    "Entschieden wird einmal; gelöst erst, wenn das Kabel gezogen ist.",
  car_match_window:
    "Sensoren melden nicht im selben Augenblick – ein Auto, das seinen " +
    "Zustand aus der Cloud holt, hinkt schon mal Minuten hinterher.",
  car_match_tolerance:
    "Die Wallbox misst am Kabel, das Auto hinter dem Laderegler. Ein Rest " +
    "Unterschied bleibt immer. Passt nichts, wird lieber kein Auto " +
    "gezeigt als das falsche.",
  car_match_unique:
    "Ist am Ende nur noch eine Wallbox offen und ein Auto frei, gehören die " +
    "beiden zusammen – ohne auf Stecker oder Leistung zu warten. Ausschalten, " +
    "wenn öfter ein Auto nicht zu Hause ist: dann könnte es dem falschen " +
    "Kabel zugeschlagen werden.",
};
const computeHelper = (s) => HELFER[s.name];

/** Lädt die ha-form-Bausteine nach – Home Assistant lädt sie erst bei Bedarf. */
async function loadHaComponents() {
  if (customElements.get("ha-form")) return;
  try {
    const helpers = window.loadCardHelpers ? await window.loadCardHelpers() : null;
    if (helpers && !customElements.get("ha-form")) {
      const k = await helpers.createCardElement({ type: "button" });
      k.constructor.getConfigElement && (await k.constructor.getConfigElement());
    }
  } catch (e) {
    /* egal – unten wird trotzdem gewartet */
  }
  await customElements.whenDefined("ha-form");
}

/** Entfernt leere Angaben, damit die gespeicherte Konfiguration aufgeräumt bleibt. */
function clean(o) {
  if (Array.isArray(o)) return o;
  const aus = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && !v.length) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const inner = clean(v);
      if (Object.keys(inner).length) aus[k] = inner;
      continue;
    }
    aus[k] = v;
  }
  return aus;
}

/**
 * Die Erzeugungsquellen so, wie der Editor sie zeigen muss.
 *
 * Steht in der Konfiguration noch die alte Schreibweise mit `pv` und
 * `external`, werden sie hier zu vollwertigen Listeneinträgen – samt ihrem
 * Symbol und ihrer Farbe. Ohne das legt der Editor beim Hinzufügen eine
 * frische `sources`-Liste an, und weil die gegenüber `pv` gewinnt, wäre die
 * erste Quelle plötzlich verschwunden.
 */
function quellenAus(cfg) {
  const c = cfg || {};
  if (Array.isArray(c.sources) && c.sources.length) return c.sources;
  const ic = c.icons || {};
  const col = c.colors || {};
  const aus = [];
  if (c.pv) aus.push(clean({ power: c.pv, icon: ic.pv, color: col.pv }));
  const zweite = c.external ?? c.ext;
  if (zweite) aus.push(clean({ power: zweite, icon: ic.external, color: col.external }));
  return aus;
}

/**
 * Schreibt eine Quellenliste zurück und räumt dabei die alte Schreibweise ab –
 * sonst stünden beide nebeneinander und niemand wüsste, welche gilt.
 */
function mitQuellen(cfg, liste) {
  const neu = { ...cfg, sources: liste.length ? liste : undefined };
  delete neu.pv;
  delete neu.external;
  delete neu.ext;
  if (neu.icons) {
    const ic = { ...neu.icons };
    delete ic.pv;
    delete ic.external;
    neu.icons = ic;
  }
  if (neu.colors) {
    const col = { ...neu.colors };
    delete col.pv;
    delete col.external;
    neu.colors = col;
  }
  return neu;
}

const istPaar = (v) => v && typeof v === "object" && !Array.isArray(v);
const alsListe = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// ------------------------------------------- Konfiguration <-> Formular

function toForm(cfg) {
  const c = cfg || {};
  const f = {
    title: c.title,
    house: c.house,
    autarky: c.autarky,
    self_consumption: c.self_consumption,
    grid_mode: istPaar(c.grid) ? "split" : "single",
    threshold: c.threshold ?? 20,
    min_height: c.min_height ?? 460,
    animate: c.animate !== false,
    house_mix: c.house_mix !== false,
    car_mix: c.car_mix !== false,
    autarky_mix: c.autarky_mix !== false,
    show_tiles: c.show_tiles !== false,
    transparent: !!c.transparent,
  };
  if (istPaar(c.grid)) {
    f.grid_consumption = c.grid.consumption || c.grid.import || c.grid.from_grid;
    f.grid_production = c.grid.production || c.grid.export || c.grid.to_grid;
  } else {
    f.grid = c.grid;
  }
  const ic = c.icons || {};
  f.icon_grid = ic.grid;
  f.icon_house = ic.house;

  const col = c.colors || {};
  f.color_grid_import = col.grid_import;
  f.color_grid_export = col.grid_export;
  f.color_house = col.house;
  f.color_battery = col.battery;
  f.color_battery_charge = col.battery_charge;
  f.color_battery_discharge = col.battery_discharge;
  f.color_wallboxes = typeof col.wallboxes === "string" ? col.wallboxes : undefined;
  f.color_cars = typeof col.cars === "string" ? col.cars : undefined;

  f.car_match = ["plug", "power"].includes(c.car_match) ? c.car_match : "off";
  f.car_match_window = Number.isFinite(c.car_match_window) ? c.car_match_window : 300;
  // Im Formular Prozent, in der Konfiguration ein Anteil.
  f.car_match_tolerance = Math.round(
    (Number.isFinite(c.car_match_tolerance) ? c.car_match_tolerance : 0.25) * 100
  );
  f.car_match_unique = c.car_match_unique !== false;
  return f;
}

function fromForm(d, cfg) {
  const neu = { ...cfg };

  // "off" ist die Vorgabe und muss nicht in der Konfiguration stehen; die
  // beiden Spielräume nur, solange die Zuordnung überhaupt läuft.
  neu.car_match = ["plug", "power"].includes(d.car_match) ? d.car_match : undefined;
  neu.car_match_window =
    neu.car_match === "plug" && Number.isFinite(d.car_match_window) && d.car_match_window !== 300
      ? d.car_match_window
      : undefined;
  neu.car_match_tolerance =
    neu.car_match === "power" && Number.isFinite(d.car_match_tolerance) && d.car_match_tolerance !== 25
      ? d.car_match_tolerance / 100
      : undefined;
  // true ist die Vorgabe und muss nicht in der Konfiguration stehen.
  neu.car_match_unique =
    neu.car_match && d.car_match_unique === false ? false : undefined;

  neu.title = d.title || undefined;
  neu.pv = d.pv || undefined;
  neu.external = d.external || undefined;
  neu.house = d.house || undefined;
  neu.autarky = d.autarky || undefined;
  neu.self_consumption = d.self_consumption || undefined;

  if (d.grid_mode === "split") {
    const paar = clean({ consumption: d.grid_consumption, production: d.grid_production });
    neu.grid = Object.keys(paar).length ? paar : undefined;
  } else {
    neu.grid = d.grid || undefined;
  }

  const symbole = clean({
    grid: d.icon_grid,
    house: d.icon_house,
  });
  neu.icons = Object.keys(symbole).length ? symbole : undefined;

  const farben = clean({
    grid_import: d.color_grid_import,
    grid_export: d.color_grid_export,
    house: d.color_house,
    battery: d.color_battery,
    battery_charge: d.color_battery_charge,
    battery_discharge: d.color_battery_discharge,
    // Eine Farbe pro Knotentyp; die Karte färbt damit alle Wallboxen bzw. Autos.
    wallboxes: d.color_wallboxes,
    cars: d.color_cars,
  });
  neu.colors = Object.keys(farben).length ? farben : undefined;

  neu.threshold = Number.isFinite(d.threshold) && d.threshold !== 20 ? d.threshold : undefined;
  neu.min_height = Number.isFinite(d.min_height) && d.min_height !== 460 ? d.min_height : undefined;
  neu.animate = d.animate === false ? false : undefined;
  neu.house_mix = d.house_mix === false ? false : undefined;
  neu.car_mix = d.car_mix === false ? false : undefined;
  neu.autarky_mix = d.autarky_mix === false ? false : undefined;
  neu.show_tiles = d.show_tiles === false ? false : undefined;
  neu.transparent = d.transparent ? true : undefined;
  return neu;
}

// ------------------------------------------------------- Seiten des Editors
//
// Aufbau wie bei den verbreiteten Karten: ein Hauptmenü, aus dem man in
// Unterseiten abtaucht und mit dem Pfeil zurückkommt. Das hält jede Seite
// kurz, statt alles untereinander zu stapeln.

const SEITEN = [
  { id: "sources",   label: "Erzeugung",     icon: "mdi:solar-power", liste: true },
  { id: "grid",      label: "Netz",          icon: "mdi:transmission-tower" },
  { id: "house",     label: "Zuhause",       icon: "mdi:home" },
  { id: "batteries", label: "Speicher",      icon: "mdi:battery-high", liste: true },
  { id: "wallboxes", label: "Wallboxen",     icon: "mdi:ev-station",   liste: true },
  { id: "cars",      label: "Autos",         icon: "mdi:car-electric", liste: true },
  { id: "anzeige",   label: "Darstellung",   icon: "mdi:tune" },
];

/**
 * Jede Seite bekommt dasselbe Datenobjekt aus toForm(), aber nur ihren
 * Ausschnitt als Schema. ha-form gibt beim Ändern das ganze Objekt zurück,
 * die nicht gezeigten Felder überleben also unangetastet.
 */
const SEITEN_SCHEMA = {

  grid: (d) => [
    {
      name: "grid_mode",
      selector: {
        select: {
          mode: "list",
          options: [
            { value: "single", label: "Ein Sensor mit Vorzeichen" },
            { value: "split", label: "Zwei getrennte Sensoren (z. B. E3/DC)" },
          ],
        },
      },
    },
    ...(d.grid_mode === "split"
      ? [{ type: "grid", name: "", schema: [
            { name: "grid_consumption", selector: SEL_ENTITY },
            { name: "grid_production", selector: SEL_ENTITY },
          ] }]
      : [{ name: "grid", selector: SEL_ENTITY }]),
    { type: "grid", name: "", schema: [
      { name: "icon_grid", selector: SEL_ICON },
      { name: "color_grid_import", selector: SEL_COLOR },
      { name: "color_grid_export", selector: SEL_COLOR },
    ] },
  ],

  house: () => [
    { name: "house", selector: SEL_ENTITY },
    { type: "grid", name: "", schema: [
      { name: "icon_house", selector: SEL_ICON },
      { name: "color_house", selector: SEL_COLOR },
    ] },
  ],

  anzeige: () => [
    { name: "title", selector: SEL_TEXT },
    { type: "grid", name: "", schema: [
      { name: "threshold", selector: { number: { min: 0, max: 500, step: 5, mode: "box", unit_of_measurement: "W" } } },
      { name: "min_height", selector: { number: { min: 240, max: 1000, step: 20, mode: "box", unit_of_measurement: "px" } } },
    ] },
    { name: "animate", selector: { boolean: {} } },
    { name: "house_mix", selector: { boolean: {} } },
    { name: "car_mix", selector: { boolean: {} } },
    { name: "autarky_mix", selector: { boolean: {} } },
    { name: "show_tiles", selector: { boolean: {} } },
    { name: "autarky", selector: SEL_ENTITY },
    { name: "self_consumption", selector: SEL_ENTITY },
    { name: "transparent", selector: { boolean: {} } },
  ],
};

/**
 * Was auf einer Listenseite unter der Liste steht. Die Farben gehören dorthin,
 * wo man die Geräte einrichtet – nicht in eine Sammelseite, auf der man sie
 * erst suchen muss.
 */
const LISTEN_TITEL = { cars: "Zuordnung" };

const LISTEN_SCHEMA = {
  batteries: () => [
    { name: "color_battery", selector: SEL_COLOR },
    { type: "grid", name: "", schema: [
      { name: "color_battery_charge", selector: SEL_COLOR },
      { name: "color_battery_discharge", selector: SEL_COLOR },
    ] },
  ],
  wallboxes: () => [
    { type: "grid", name: "", schema: [
      { name: "color_wallboxes", selector: SEL_COLOR },
      { name: "color_cars", selector: SEL_COLOR },
    ] },
  ],
  cars: (d) => [
    {
      name: "car_match",
      selector: { select: { mode: "dropdown", options: [
        { value: "off", label: "Aus – feste Zuordnung an der Wallbox" },
        { value: "plug", label: "Über den Ladestecker" },
        { value: "power", label: "Über die Ladeleistung" },
      ] } },
    },
    ...(d.car_match === "plug"
      ? [{ name: "car_match_window",
           selector: { number: { min: 10, max: 3600, step: 10, mode: "box",
                                 unit_of_measurement: "s" } } }]
      : []),
    ...(d.car_match === "power"
      ? [{ name: "car_match_tolerance",
           selector: { number: { min: 1, max: 90, step: 1, mode: "box",
                                 unit_of_measurement: "%" } } }]
      : []),
    ...(d.car_match !== "off"
      ? [{ name: "car_match_unique", selector: { boolean: {} } }]
      : []),
  ],
};

const KIND = {
  sources: {
    label: "Quelle", max: 5,
    toForm: (x) => ({
      name: x.name, icon: x.icon, color: x.color,
      power_sources: alsListe(x.power),
    }),
    fromForm: (d) =>
      clean({
        name: d.name,
        icon: d.icon,
        color: d.color,
        // Mehrere Sensoren werden addiert; einer bleibt ein einfacher Wert.
        power: !d.power_sources || !d.power_sources.length
          ? undefined
          : d.power_sources.length === 1 ? d.power_sources[0] : d.power_sources,
      }),
    schema: () => [
      { type: "grid", name: "", schema: [
        { name: "name", selector: SEL_TEXT },
        { name: "icon", selector: SEL_ICON },
      ] },
      { name: "power_sources", selector: { entity: { ...SEL_ENTITY.entity, multiple: true } } },
      { name: "color", selector: SEL_COLOR },
    ],
  },

  batteries: {
    label: "Batterie", max: 2,
    toForm: (x) => {
      const gemeinsam = {
        name: x.name, icon: x.icon, soc: x.soc,
        included_in_house: !!x.included_in_house,
      };
      // Getrennte Sensoren duerfen verschachtelt unter power stehen ODER
      // direkt am Eintrag (so schreibt man es in YAML meist). Beides erkennen,
      // sonst zeigt der Umschalter faelschlich "ein Sensor" und die erste
      // Aenderung wirft die beiden Sensoren weg.
      const paar = istPaar(x.power) ? x.power
        : (x.charge || x.discharge) ? { charge: x.charge, discharge: x.discharge }
        : null;
      if (paar) {
        return { ...gemeinsam, power_mode: "split", charge: paar.charge, discharge: paar.discharge };
      }
      return { ...gemeinsam, power_mode: "single", power: typeof x.power === "string" ? x.power : undefined };
    },
    // Zurueck in der Schreibweise, die man auch von Hand schreibt:
    // charge und discharge direkt am Eintrag, nicht verschachtelt.
    fromForm: (d) =>
      clean({
        name: d.name,
        icon: d.icon,
        soc: d.soc,
        // false ist die Vorgabe und muss nicht in der Konfiguration stehen.
        included_in_house: d.included_in_house ? true : undefined,
        ...(d.power_mode === "split"
          ? { charge: d.charge, discharge: d.discharge }
          : { power: d.power }),
      }),
    schema: (d) => [
      { type: "grid", name: "", schema: [
        { name: "name", selector: SEL_TEXT },
        { name: "icon", selector: SEL_ICON },
      ] },
      { name: "soc", selector: SEL_ENTITY },
      {
        name: "power_mode",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "single", label: "Ein Sensor mit Vorzeichen" },
              { value: "split", label: "Laden und Entladen getrennt" },
            ],
          },
        },
      },
      ...(d.power_mode === "split"
        ? [{ type: "grid", name: "", schema: [
              { name: "charge", selector: SEL_ENTITY },
              { name: "discharge", selector: SEL_ENTITY },
            ] }]
        : [{ name: "power", selector: SEL_ENTITY }]),
      { name: "included_in_house", selector: { boolean: {} } },
    ],
  },
  wallboxes: {
    label: "Wallbox", max: 4,
    toForm: (x) => ({
      name: x.name, icon: x.icon, power: alsListe(x.power),
      included_in_house: !!x.included_in_house, plug: x.plug,
      car: x.car, car_name: x.car_name, car_icon: x.car_icon,
    }),
    fromForm: (d) =>
      clean({
        name: d.name,
        icon: d.icon,
        // Mehrere Sensoren werden addiert; einer bleibt ein einfacher Wert.
        power: !d.power || !d.power.length ? undefined : d.power.length === 1 ? d.power[0] : d.power,
        // false ist die Vorgabe und muss nicht in der Konfiguration stehen.
        included_in_house: d.included_in_house ? true : undefined,
        plug: d.plug,
        car: d.car,
        car_name: d.car_name,
        car_icon: d.car_icon,
      }),
    schema: () => [
      { type: "grid", name: "", schema: [
        { name: "name", selector: SEL_TEXT },
        { name: "icon", selector: SEL_ICON },
      ] },
      { name: "power", selector: { entity: { ...SEL_ENTITY.entity, multiple: true } } },
      { name: "included_in_house", selector: { boolean: {} } },
      { name: "plug", selector: SEL_ZUSTAND },
      { type: "expandable", name: "", title: "Auto an dieser Wallbox", icon: "mdi:car-electric",
        schema: [
          { name: "car", selector: SEL_ENTITY },
          { type: "grid", name: "", schema: [
            { name: "car_name", selector: SEL_TEXT },
            { name: "car_icon", selector: SEL_ICON },
          ] },
        ] },
    ],
  },
  cars: {
    label: "Auto", max: 4,
    toForm: (x) => ({
      name: x.name, icon: x.icon, soc: x.soc, plug: x.plug, charge_power: x.power,
      // Im Formular eine Zeichenkette, in der Konfiguration eine Zahl.
      wallbox: x.wallbox ? String(x.wallbox) : "",
    }),
    fromForm: (d) =>
      clean({
        name: d.name,
        icon: d.icon,
        soc: d.soc,
        plug: d.plug,
        power: d.charge_power,
        wallbox: d.wallbox ? Number(d.wallbox) : undefined,
      }),
    schema: (d, cfg) => [
      { type: "grid", name: "", schema: [
        { name: "name", selector: SEL_TEXT },
        { name: "icon", selector: SEL_ICON },
      ] },
      { name: "soc", selector: SEL_ENTITY },
      // Die Wallbox wird hier gewählt, nicht das Auto dort. Ohne angelegte
      // Wallboxen gäbe es nichts zu wählen – dann bleibt das Feld weg.
      ...((cfg && cfg.wallboxes && cfg.wallboxes.length)
        ? [{ name: "wallbox", selector: { select: { mode: "dropdown", options: [
            { value: "", label: "Selbst zuordnen" },
            ...cfg.wallboxes.map((w, i) => ({
              value: String(i + 1),
              label: w.name || "Wallbox " + (i + 1),
            })),
          ] } } }]
        : []),
      { name: "plug", selector: SEL_ZUSTAND },
      { name: "charge_power", selector: SEL_ENTITY },
    ],
  },
};


const STIL = `
  <style>
    .ppm-ed { display: flex; flex-direction: column; gap: 8px; }

    .ppm-ed .menue-zeile {
      display: flex; align-items: center; gap: 12px; width: 100%;
      background: none; border: 0; border-bottom: 1px solid var(--divider-color, #444);
      padding: 14px 4px; cursor: pointer; text-align: left;
      color: var(--primary-text-color, #ddd); font: inherit; font-size: 15px;
    }
    .ppm-ed .menue-zeile:last-child { border-bottom: 0; }
    .ppm-ed .menue-zeile:hover { background: var(--secondary-background-color, #2a2a2a); }
    .ppm-ed .menue-zeile ha-icon { color: var(--secondary-text-color, #888); flex: 0 0 auto; }
    .ppm-ed .menue-name { flex: 1 1 auto; }
    .ppm-ed .menue-wert {
      color: var(--secondary-text-color, #888); font-size: 13px;
      max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ppm-ed .pfeil { opacity: .6; }

    .ppm-ed .seiten-kopf {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 6px; padding-bottom: 8px;
      border-bottom: 1px solid var(--divider-color, #444);
    }
    .ppm-ed .seiten-kopf b { font-size: 16px; font-weight: 500; }
    .ppm-ed .zurueck {
      background: none; border: 0; cursor: pointer; padding: 4px;
      color: var(--primary-text-color, #ddd); display: flex;
    }

    .ppm-ed .liste { display: flex; flex-direction: column; gap: 8px; }
    .ppm-ed .zeile {
      border: 1px solid var(--divider-color, #444);
      border-radius: 10px; padding: 0 12px;
    }
    .ppm-ed .zeile-kopf {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 0; cursor: pointer; list-style: none; font-size: 14px;
    }
    .ppm-ed .zeile-kopf::-webkit-details-marker { display: none; }
    .ppm-ed .zeile-kopf::before {
      content: "\\25B8"; width: 12px; color: var(--secondary-text-color, #888);
      transition: transform .15s ease;
    }
    .ppm-ed .zeile[open] > .zeile-kopf::before { transform: rotate(90deg); }
    .ppm-ed .zeile-kopf span:first-of-type { flex: 1 1 auto; }
    .ppm-ed .zeile-wert { color: var(--secondary-text-color, #888); font-size: 12.5px; }
    .ppm-ed .zeile-inhalt { padding: 2px 0 14px; }

    .ppm-ed button.add, .ppm-ed button.del {
      background: none; border: 1px solid var(--divider-color, #444);
      border-radius: 8px; color: var(--primary-text-color, #ddd);
      padding: 8px 14px; cursor: pointer; font: inherit; font-size: 13.5px;
      align-self: flex-start;
    }
    .ppm-ed button.del { margin-top: 12px; }
    .ppm-ed button.add:hover:not([disabled]), .ppm-ed button.del:hover {
      background: var(--secondary-background-color, #2a2a2a);
    }
    .ppm-ed button.add[disabled] { opacity: .4; cursor: default; }
    .ppm-ed .hint { font-size: 12.5px; color: var(--secondary-text-color, #888); margin: 4px 0 0; }
    .ppm-ed .abschnitt {
      font-size: 13px; color: var(--secondary-text-color, #888);
      margin: 18px 0 2px; padding-top: 14px;
      border-top: 1px solid var(--divider-color, #444);
    }
  </style>`;

class PowerflowPlusMobileEditor extends HTMLElement {
  // Diese Properties setzt Home Assistant nur, wenn es sie am Element findet.
  set lovelace(v) { this._lovelace = v; }
  get lovelace() { return this._lovelace; }
  set context(v) { this._context = v; }
  get context() { return this._context; }

  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
  }
  get hass() { return this._hass; }

  connectedCallback() {
    loadHaComponents().then(() => {
      this._bereit = true;
      if (this._config) this._render();
    });
  }

  disconnectedCallback() {
    clearTimeout(this._entsperren);
    this._schreibt = false;
  }

  setConfig(config) {
    this._config = config; // eingefroren – wird nie verändert
    if (!this._gebaut) {
      this.innerHTML = STIL + '<div class="ppm-ed"></div>';
      this._wurzel = this.querySelector(".ppm-ed");
      this._seite = null; // null = Hauptmenü
      this._modusBat = [];
      this._offen = new Set(); // welche Listeneinträge aufgeklappt sind
      this._gebaut = true;
    }

    // Reicht Home Assistant uns genau das zurück, was wir gerade selbst
    // gemeldet haben, steht bereits alles richtig auf dem Schirm. Würden wir
    // trotzdem neu zeichnen, verlöre das Textfeld bei jedem Tastendruck den
    // Fokus und der Eintrag klappte zu – man käme über einen Buchstaben nicht
    // hinaus.
    const eigenes = this._eigeneAenderung;
    this._eigeneAenderung = null;
    if (eigenes && eigenes === JSON.stringify(config)) return;

    if (this._bereit) this._render();
  }

  /**
   * Meldet die vollständige Konfiguration zurück. Nie aus setConfig oder aus
   * dem Zeichnen heraus rufen – nur aus Eingabe-Handlern.
   *
   * `neuZeichnen` setzt, wer die Struktur ändert: ein Eintrag kommt dazu oder
   * fällt weg. Dann muss die Liste wirklich neu entstehen.
   */
  _fire(neu, neuZeichnen) {
    const sauber = clean({ ...neu, type: this._config.type });
    if (JSON.stringify(sauber) === JSON.stringify(this._config)) return;
    this._eigeneAenderung = neuZeichnen ? null : JSON.stringify(sauber);
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: sauber },
      bubbles: true,
      composed: true,
    }));
  }

  _oeffne(id) {
    // Die Nummern der aufgeklappten Einträge gelten nur je Liste.
    if (id !== this._seite) this._offen = new Set();
    this._seite = id;
    this._render();
  }

  // -------------------------------------------------------------- Zeichnen

  _render() {
    if (!this._wurzel || !customElements.get("ha-form")) return;
    clearTimeout(this._entsperren);
    this._schreibt = true;
    try {
      const seite = SEITEN.find((s) => s.id === this._seite);
      if (!seite) this._zeigeMenue();
      else if (seite.liste) this._zeigeListe(seite);
      else this._zeigeSeite(seite);
    } finally {
      // setTimeout statt requestAnimationFrame: rAF ruht, solange die Seite
      // nicht zeichnet – die Sperre bliebe hängen und der Editor würde
      // jede Eingabe stillschweigend verwerfen.
      this._entsperren = setTimeout(() => { this._schreibt = false; }, 0);
    }
  }

  /** Kurzfassung rechts in der Menüzeile: was ist hier schon eingerichtet? */
  _zusammenfassung(id) {
    const c = this._config;
    const kurz = (e) => (e ? String(e).replace(/^sensor\./, "") : "–");
    switch (id) {
      case "sources": {
        const n = quellenAus(c).length;
        return n ? n + " von 5" : "keine";
      }
      case "house": return kurz(c.house);
      case "grid": return istPaar(c.grid) ? "zwei Sensoren" : kurz(c.grid);
      case "batteries": {
        const n = (c.batteries || []).length;
        return n ? n + " von 2" : "keine";
      }
      case "wallboxes": {
        const n = (c.wallboxes || []).length;
        const autos = (c.wallboxes || []).filter((w) => w.car).length;
        return n ? n + " von 4" + (autos ? ", " + autos + " mit Auto" : "") : "keine";
      }
      case "cars": {
        const n = (c.cars || []).length;
        if (!n) return "keine";
        const wie = c.car_match === "plug" ? "über den Stecker"
          : c.car_match === "power" ? "über die Leistung"
          : "fest zugeordnet";
        return n + " von 4, " + wie;
      }
      default: return "";
    }
  }

  _zeigeMenue() {
    this._wurzel.innerHTML = SEITEN.map((s) =>
      '<button class="menue-zeile" type="button" data-seite="' + s.id + '">' +
      '<ha-icon icon="' + s.icon + '"></ha-icon>' +
      '<span class="menue-name">' + s.label + "</span>" +
      '<span class="menue-wert">' + this._zusammenfassung(s.id) + "</span>" +
      '<ha-icon class="pfeil" icon="mdi:chevron-right"></ha-icon>' +
      "</button>").join("");
    this._wurzel.querySelectorAll(".menue-zeile").forEach((b) =>
      b.addEventListener("click", () => this._oeffne(b.dataset.seite)));
  }

  /** Kopfzeile mit Zurück-Pfeil, gemeinsam für alle Unterseiten. */
  _kopf(seite) {
    const kopf = document.createElement("div");
    kopf.className = "seiten-kopf";
    kopf.innerHTML =
      '<button class="zurueck" type="button" aria-label="Zurück">' +
      '<ha-icon icon="mdi:arrow-left"></ha-icon></button><b>' + seite.label + "</b>";
    kopf.querySelector(".zurueck").addEventListener("click", () => this._oeffne(null));
    return kopf;
  }

  _zeigeSeite(seite) {
    this._wurzel.innerHTML = "";
    this._wurzel.appendChild(this._kopf(seite));

    const daten = toForm(this._config);
    if (this._modusNetz) daten.grid_mode = this._modusNetz;
    this._netzModusAngezeigt = daten.grid_mode;

    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.computeLabel = computeLabel;
    form.computeHelper = computeHelper;
    form.schema = SEITEN_SCHEMA[seite.id](daten);
    form.data = daten;
    form.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      if (this._schreibt) return;
      const neu = ev.detail.value;
      // Die Bauart ist reine Anzeigesache – sie steckt nur in der Form der
      // Konfiguration, und solange die Felder leer sind, gibt es die noch
      // nicht. Deshalb neu zeichnen statt melden: sonst bliebe die
      // Umschaltung wirkungslos und die gewählte Entität ginge verloren.
      if (seite.id === "grid" && neu.grid_mode && neu.grid_mode !== this._netzModusAngezeigt) {
        this._modusNetz = neu.grid_mode;
        this._render();
        return;
      }
      // Siehe _zeile: ohne das würfe die nächste Eingabe die vorige wieder
      // heraus, weil ha-form auf seinem eigenen `data` aufbaut.
      form.data = neu;
      this._fire(fromForm(neu, this._config));
    });
    this._wurzel.appendChild(form);
  }

  // ---------------------------------------------------------------- Listen

  _zeigeListe(seite) {
    const art = seite.id;
    const k = KIND[art];
    const items = art === "sources"
      ? quellenAus(this._config)
      : this._config[art] || [];

    this._wurzel.innerHTML = "";
    this._wurzel.appendChild(this._kopf(seite));

    const behaelter = document.createElement("div");
    behaelter.className = "liste";
    this._wurzel.appendChild(behaelter);
    items.forEach((item, i) => behaelter.appendChild(this._zeile(art, item, i)));

    const hinweis = document.createElement("p");
    hinweis.className = "hint";
    hinweis.textContent = items.length >= k.max
      ? "Mehr als " + k.max + " stellt die Karte nicht dar."
      : art === "wallboxes"
        ? "Angezeigt werden immer nur die zwei, die gerade laden."
        : "";
    this._wurzel.appendChild(hinweis);

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "add";
    plus.textContent = "+ " + k.label + " hinzufügen";
    plus.disabled = items.length >= k.max;
    plus.addEventListener("click", () => {
      this._neuOffen = items.length; // der frische Eintrag wird aufgeklappt
      const erweitert = [...items, {}];
      this._fire(art === "sources"
        ? mitQuellen(this._config, erweitert)
        : { ...this._config, [art]: erweitert }, true);
    });
    this._wurzel.appendChild(plus);

    // Farben gelten für alle Einträge der Liste und stehen deshalb einmal
    // darunter – nicht in einer Sammelseite, auf der man sie erst sucht.
    const extra = LISTEN_SCHEMA[art];
    if (extra) {
      const trenner = document.createElement("p");
      trenner.className = "abschnitt";
      trenner.textContent = LISTEN_TITEL[art] || "Farben";
      this._wurzel.appendChild(trenner);

      const daten = toForm(this._config);
      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.computeLabel = computeLabel;
      form.computeHelper = computeHelper;
      form.schema = extra(daten);
      form.data = daten;
      form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        if (this._schreibt) return;
        const neu = ev.detail.value;
        // Siehe _zeile. Hier hängt auch das Schema an den Daten – erst mit
        // dem Nachziehen taucht der passende Spielraum sofort auf.
        form.schema = extra(neu);
        form.data = neu;
        this._fire(fromForm(neu, this._config));
      });
      this._wurzel.appendChild(form);
    }
  }

  _zeile(art, item, i) {
    const k = KIND[art];
    const daten = k.toForm(item, i);
    if (art === "batteries" && this._modusBat[i]) daten.power_mode = this._modusBat[i];

    // Aufgeklappt bleibt, was aufgeklappt war – sonst fiele beim Hinzufügen
    // eines Eintrags jeder andere wieder zu.
    const offen = this._neuOffen === i || this._offen.has(i);
    if (this._neuOffen === i) {
      this._neuOffen = null;
      this._offen.add(i);
    }

    const huelle = document.createElement("details");
    huelle.className = "zeile";
    if (offen) huelle.open = true;
    huelle.addEventListener("toggle", () => {
      if (huelle.open) this._offen.add(i);
      else this._offen.delete(i);
    });

    const kopf = document.createElement("summary");
    kopf.className = "zeile-kopf";
    const kopfName = document.createElement("span");
    const kopfWert = document.createElement("span");
    kopfWert.className = "zeile-wert";
    const beschrifte = (eintrag) => {
      kopfName.textContent = eintrag.name || k.label + " " + (i + 1);
      kopfWert.textContent = this._zeileWert(art, eintrag);
    };
    beschrifte(item);
    kopf.appendChild(kopfName);
    kopf.appendChild(kopfWert);
    huelle.appendChild(kopf);

    const inhalt = document.createElement("div");
    inhalt.className = "zeile-inhalt";

    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.computeLabel = computeLabel;
    form.computeHelper = computeHelper;
    form.schema = k.schema(daten, this._config);
    form.data = daten;
    form.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      if (this._schreibt) return;
      const neu = ev.detail.value;
      // Wie beim Netz: Moduswechsel nur neu zeichnen, nicht melden.
      if (art === "batteries" && neu.power_mode && neu.power_mode !== daten.power_mode) {
        this._modusBat[i] = neu.power_mode;
        this._render();
        return;
      }
      const liste = [...(this._config[art] || [])];
      liste[i] = k.fromForm(neu);
      // Beim Tippen wird bewusst nicht neu gezeichnet, sonst verlöre das Feld
      // den Eingabefokus. Die Kopfzeile bliebe dann aber auf dem alten Namen
      // stehen – also wird sie hier von Hand nachgezogen.
      beschrifte(liste[i]);
      // ha-form baut jede Eingabe auf seinem eigenen `data` auf. Weil beim
      // Tippen absichtlich nicht neu gezeichnet wird, bliebe das auf dem
      // Stand von vorhin stehen – die nächste Eingabe würde die vorige
      // wieder herauswerfen. Deshalb hier von Hand nachziehen.
      form.data = neu;
      const stand = art === "sources"
        ? mitQuellen(this._config, liste)
        : { ...this._config, [art]: liste };
      this._fire(art === "cars" ? ohneAltesAuto(stand, liste[i]) : stand);
    });
    inhalt.appendChild(form);

    const weg = document.createElement("button");
    weg.type = "button";
    weg.className = "del";
    weg.textContent = "Entfernen";
    weg.addEventListener("click", (ev) => {
      ev.stopPropagation(); // sonst klappt das Panel gleich mit zu
      const liste = [...(this._config[art] || [])];
      liste.splice(i, 1);
      // Die gemerkten Bauarten müssen mitrutschen, sonst gehören sie danach
      // zur falschen Zeile.
      if (art === "batteries") this._modusBat.splice(i, 1);
      // Die aufgeklappten Einträge rutschen mit nach, sonst gehören sie
      // danach zur falschen Zeile.
      const gerueckt = new Set();
      this._offen.forEach((n) => {
        if (n < i) gerueckt.add(n);
        else if (n > i) gerueckt.add(n - 1);
      });
      this._offen = gerueckt;
      let stand = art === "sources"
        ? mitQuellen(this._config, liste)
        : { ...this._config, [art]: liste.length ? liste : undefined };
      if (art === "wallboxes") {
        const autos = nachWallboxLoeschen(this._config.cars, i);
        stand = { ...stand, cars: autos && autos.length ? autos : undefined };
      }
      this._fire(stand, true);
    });
    inhalt.appendChild(weg);

    huelle.appendChild(inhalt);
    return huelle;
  }

  _zeileWert(art, item) {
    // Ein Auto hat keine Leistungsliste, sondern drei einzelne Sensoren –
    // "1 Sensor" sagte hier nichts.
    if (art === "cars") {
      const teile = [];
      if (item.soc) teile.push("Ladestand");
      if (item.plug) teile.push("Stecker");
      if (item.power) teile.push("Leistung");
      if (item.wallbox) {
        const w = (this._config.wallboxes || [])[item.wallbox - 1];
        teile.unshift("an " + ((w && w.name) || "Wallbox " + item.wallbox));
      }
      return teile.length ? teile.join(" · ") : "–";
    }
    if (art === "batteries") {
      return istPaar(item.power) ? "getrennt" : item.power ? "ein Sensor" : "–";
    }
    const n = alsListe(item.power).length;
    return (n ? n + " Sensor" + (n > 1 ? "en" : "") : "–") + (item.car ? " · Auto" : "");
  }
}

customElements.define("power-flow-card-plus-mobile", PowerflowPlusMobileCard);
customElements.define("power-flow-card-plus-mobile-editor", PowerflowPlusMobileEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "power-flow-card-plus-mobile",
  name: "Power Flow Card Plus Mobile",
  description: "Energiefluss als Graph – für Handybildschirme, mit mehreren Speichern und Wallboxen.",
  // Die Karte kommt mit unbekannten Entitäten zurecht (alles wird zu „–“),
  // deshalb ist eine Vorschau im Kartenwähler gefahrlos.
  preview: true,
  documentationURL: "https://github.com/thomansky/power-flow-card-plus-mobile",
});
