// Gemeinsamer Unterbau der automatischen Prüfstände.
//
// Jede Prüfseite lädt zuerst die Karte, dann diese Datei, dann ihre eigenen
// Prüfungen. Ergebnisse landen in window.__ERG und als Kurzfassung in
// window.__Z – so lässt sich eine Seite von außen abfragen, ohne sie
// anzusehen. Zum Anschauen gibt es unten trotzdem eine Liste.
//
// Ohne Home Assistant gibt es kein <ha-form>. Für die Editor-Prüfungen steht
// hier ein Ersatz, der sich Schema und Daten merkt und sich von außen zu
// einer Eingabe überreden lässt – genau wie ein echtes Feld.

window.ERG = [];
window.ok = (name, ist, soll) => ERG.push({ name, ist, soll, gut: ist === soll });
window.nah = (name, ist, soll, toleranz) => ERG.push({
  name, ist: Math.round(ist * 1000) / 1000, soll,
  gut: Math.abs(ist - soll) < (toleranz ?? 0.005),
});
window.warte = (ms) => new Promise((r) => setTimeout(r, ms ?? 30));

/** Ein Zustandsobjekt, wie Home Assistant es liefert. */
window.zustand = (id, wert, einheit, seitSekunden) => {
  const t = new Date(Date.parse("2026-01-01T10:00:00Z") + (seitSekunden || 0) * 1000).toISOString();
  return {
    entity_id: id,
    state: wert == null ? "unavailable" : String(wert),
    attributes: einheit ? { unit_of_measurement: einheit } : {},
    last_changed: t, last_updated: t,
  };
};

/** Baut eine Karte in einem Kasten der gewünschten Größe und zeichnet sie. */
window.karte = (cfg, states, breite, hoehe) => {
  const box = document.createElement("div");
  box.style.cssText = `width:${breite || 400}px;height:${hoehe || 700}px`;
  document.body.appendChild(box);
  const k = document.createElement("power-flow-card-plus-mobile");
  k.setConfig({ type: "x", min_height: hoehe || 700, ...cfg });
  box.appendChild(k);
  k.hass = { states: states || {}, themes: {}, language: "de" };
  // Der Größen-Beobachter löst hier nicht aus; einmal von Hand zeichnen.
  k._render();
  return { k, box, svg: k.shadowRoot.querySelector("svg") };
};

/** Punkte entlang eines Pfades, für Abstands- und Richtungsmessungen. */
window.punkte = (p, schritte) => {
  const L = p.getTotalLength();
  const aus = [];
  for (let i = 0; i <= (schritte || 60); i++) {
    const q = p.getPointAtLength((L * i) / (schritte || 60));
    aus.push([q.x, q.y]);
  }
  return aus;
};

if (!customElements.get("ha-form")) {
  class HaFormStub extends HTMLElement {
    set schema(v) { this._schema = v; this._zeichne(); }
    get schema() { return this._schema; }
    set data(v) { this._data = v; this._zeichne(); }
    get data() { return this._data; }
    _zeichne() {
      if (!this._schema) return;
      const namen = [];
      const sammle = (s) => s.forEach((e) => (e.schema ? sammle(e.schema) : namen.push(e.name)));
      sammle(this._schema);
      this.innerHTML = namen.map((n) => `<span data-n="${n}"></span>`).join("");
    }
    /** Simuliert eine Eingabe: ein Feld ändert sich, alles andere bleibt. */
    tippe(feld, wert) {
      const neu = { ...this._data, [feld]: wert };
      this.dispatchEvent(new CustomEvent("value-changed", {
        detail: { value: neu }, bubbles: true, composed: true,
      }));
    }
  }
  customElements.define("ha-form", HaFormStub);
}

/** Baut den Editor und spielt Home Assistant: nimmt Änderungen an und reicht sie zurück. */
window.editor = (cfg) => {
  const ed = document.createElement("power-flow-card-plus-mobile-editor");
  document.body.appendChild(ed);
  ed.hass = { states: {}, themes: {}, language: "de" };
  const stand = { letzte: null };
  ed.addEventListener("config-changed", (ev) => {
    stand.letzte = ev.detail.config;
    ed.setConfig(Object.freeze(JSON.parse(JSON.stringify(stand.letzte))));
  });
  ed.setConfig(Object.freeze(JSON.parse(JSON.stringify(cfg))));
  return { ed, stand };
};
window.felder = (form) => [...form.querySelectorAll("[data-n]")].map((s) => s.dataset.n);

/** Am Ende einer Prüfseite aufrufen. */
window.fertig = () => {
  const schlecht = ERG.filter((e) => !e.gut);
  window.__ERG = ERG;
  window.__Z = schlecht.length === 0
    ? `ALLE ${ERG.length} GRUEN`
    : schlecht.map((e) => `${e.name}: ${e.ist} statt ${e.soll}`).join(" | ");
  const liste = document.createElement("pre");
  liste.style.cssText = "color:#ddd;font:12px/1.5 monospace;padding:12px;white-space:pre-wrap";
  liste.textContent = `${window.__Z}\n\n` + ERG.map((e) =>
    `${e.gut ? "✓" : "✗"} ${e.name}${e.gut ? "" : `  →  ${e.ist} statt ${e.soll}`}`).join("\n");
  document.body.appendChild(liste);
};
window.addEventListener("error", (e) => {
  window.__Z = "ABBRUCH: " + e.message;
});
