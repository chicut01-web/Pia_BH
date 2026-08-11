import { describe, expect, it } from "vitest";
import { COSTI, SOGLIA_GROSSA, TARGET_EUR } from "./config";
import type { GiocoId } from "./config";
import { creaRng } from "./rng";
import {
  gioca,
  giochiDisponibili,
  limitePerdite,
  puoGiocare,
  sessioneFinita,
  statoIniziale,
} from "./engine";
import type { Stato } from "./engine";

/** Gioca una sessione intera scegliendo a caso fra i giochi ancora acquistabili.
 *  Guardia a 2000 (non più 500): il rigioca non consuma Piuccine, quindi aggiunge giocate
 *  "gratis" oltre a quelle che il budget da solo imporrebbe. Resta comunque un limite finito —
 *  vedi "la sessione termina sempre anche con i rigioca gratuiti" più sotto per il perché. */
function simula(seed: number): { finale: Stato; importi: number[] } {
  const scelta = creaRng(seed ^ 0x9e3779b9);
  let s = statoIniziale(seed);
  const importi: number[] = [];
  let guardia = 0;

  while (!sessioneFinita(s)) {
    if (guardia++ > 2000) throw new Error("sessione che non termina");
    const disponibili = giochiDisponibili(s);
    const g = disponibili[Math.floor(scelta() * disponibili.length)] as GiocoId;
    const esito = gioca(s, g);
    if (esito.vinta) importi.push(esito.importo);
    s = esito.stato;
  }
  // Guardia contro un falso verde: se la sessione finisse subito, il ciclo sopra
  // non gira mai e `falliti` resterebbe vuoto per il motivo sbagliato.
  expect(s.giocate).toBeGreaterThan(0);
  return { finale: s, importi };
}

describe("motore — chiusura esatta", () => {
  it("chiude sempre a TARGET_EUR su 10.000 sessioni casuali", () => {
    const falliti: Array<{ seed: number; vinto: number }> = [];
    for (let seed = 1; seed <= 10_000; seed++) {
      const { finale } = simula(seed);
      if (finale.vinto !== TARGET_EUR) falliti.push({ seed, vinto: finale.vinto });
    }
    expect(falliti).toEqual([]);
  });

  it("non supera mai il target durante la sessione", () => {
    for (let seed = 1; seed <= 500; seed++) {
      let s = statoIniziale(seed);
      const scelta = creaRng(seed);
      while (!sessioneFinita(s)) {
        const d = giochiDisponibili(s);
        s = gioca(s, d[Math.floor(scelta() * d.length)]).stato;
        expect(s.vinto).toBeLessThanOrEqual(TARGET_EUR);
      }
    }
  });

  it("le Piuccine non vanno mai sotto zero", () => {
    for (let seed = 1; seed <= 500; seed++) {
      let s = statoIniziale(seed);
      const scelta = creaRng(seed);
      while (!sessioneFinita(s)) {
        const d = giochiDisponibili(s);
        s = gioca(s, d[Math.floor(scelta() * d.length)]).stato;
        expect(s.piuccine).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("chiude a target anche giocando solo il taglio più caro", () => {
    let s = statoIniziale(123);
    while (!sessioneFinita(s)) {
      const g: GiocoId = s.piuccine >= COSTI.gratta5 ? "gratta5" : "slot";
      s = gioca(s, g).stato;
    }
    expect(s.vinto).toBe(TARGET_EUR);
  });

  it("chiude a target anche giocando solo il taglio più economico", () => {
    let s = statoIniziale(456);
    while (!sessioneFinita(s)) s = gioca(s, "slot").stato;
    expect(s.vinto).toBe(TARGET_EUR);
  });

  it("è deterministico: stesso seed e stessa sequenza, stesso esito", () => {
    const a = simula(777);
    const b = simula(777);
    expect(a.importi).toEqual(b.importi);
    expect(a.finale.vinto).toBe(b.finale.vinto);
  });

  it("gioca non muta lo stato passato", () => {
    const s = statoIniziale(1);
    const copia = { ...s };
    gioca(s, "slot");
    expect(s).toEqual(copia);
  });

  it("sessioneFinita è vera solo sotto il costo minimo", () => {
    // COSTO_MINIMO è 1: non esiste più un intero "sotto il costo minimo ma sopra zero" da
    // testare come caso intermedio distinto (a differenza di quando COSTO_MINIMO era 5) — i due
    // soli casi rilevanti sono "a costo minimo" (non finita) e "sotto, cioè zero" (finita).
    expect(sessioneFinita({ ...statoIniziale(1), piuccine: 1 })).toBe(false);
    expect(sessioneFinita({ ...statoIniziale(1), piuccine: 0 })).toBe(true);
  });

  it("puoGiocare rifiuta i giochi non acquistabili", () => {
    const s = { ...statoIniziale(1), piuccine: 4 };
    expect(puoGiocare(s, "slot")).toBe(true);
    expect(puoGiocare(s, "gratta2")).toBe(true);
    expect(puoGiocare(s, "gratta5")).toBe(false);
  });

  it("gioca su un gioco non acquistabile non lo esegue: eseguita false, nessun addebito", () => {
    const s: Stato = { ...statoIniziale(1), piuccine: 3 };
    const esito = gioca(s, "gratta5");
    expect(esito.eseguita).toBe(false);
    expect(esito.vinta).toBe(false);
    expect(esito.rigioca).toBe(false);
    expect(esito.importo).toBe(0);
    expect(esito.stato.giocate).toBe(s.giocate);
    expect(esito.stato.piuccine).toBe(s.piuccine);
    expect(esito.stato).toEqual(s);
  });
});

describe("motore — rigioca (biglietto gratis dopo troppe perdite di fila)", () => {
  it("scatta quando la serie di perdite raggiunge limitePerdite: costo rimborsato, target invariato, serie azzerata", () => {
    const base: Stato = {
      ...statoIniziale(42),
      piuccine: 50,
      vinto: 9,
      giocate: 10,
      perditeConsecutive: limitePerdite(50),
      vinciteConsecutive: 0,
      grossaErogata: true,
    };
    const esito = gioca(base, "slot");
    expect(esito.eseguita).toBe(true);
    expect(esito.rigioca).toBe(true);
    expect(esito.vinta).toBe(false);
    expect(esito.importo).toBe(0);
    // Rimborsato: le Piuccine restano quelle di PRIMA della giocata, non scalate del costo.
    expect(esito.stato.piuccine).toBe(base.piuccine);
    // Nessun addebito sul target.
    expect(esito.stato.vinto).toBe(base.vinto);
    // La serie di perdite si azzera: è lo scopo del rigioca.
    expect(esito.stato.perditeConsecutive).toBe(0);
    // Un biglietto gratis non è una vincita in denaro: non deve far scattare "max 2 vincite
    // consecutive". Qui parte da 0 e deve restare 0 (non incrementato).
    expect(esito.stato.vinciteConsecutive).toBe(base.vinciteConsecutive);
    // La giocata è comunque avvenuta.
    expect(esito.stato.giocate).toBe(base.giocate + 1);
  });

  it("non scatta mai sull'ultima giocata: la chiusura esatta vince sempre sul biglietto gratis", () => {
    // Costruito apposta perché la PROSSIMA giocata (costo 1) farebbe scendere le Piuccine sotto
    // il costo minimo — cioè è la giocata finale — e allo stesso tempo la serie di perdite ha
    // già raggiunto la soglia del rigioca. Deve vincere la chiusura, non il rigioca.
    const base: Stato = {
      ...statoIniziale(7),
      piuccine: 1,
      vinto: 20,
      giocate: 50,
      perditeConsecutive: limitePerdite(1),
      vinciteConsecutive: 0,
      grossaErogata: true,
    };
    const esito = gioca(base, "slot");
    expect(esito.rigioca).toBe(false);
    expect(esito.importo).toBe(TARGET_EUR - base.vinto);
    expect(esito.stato.piuccine).toBe(0);
    expect(esito.stato.vinto).toBe(TARGET_EUR);
  });
});

/** Raccoglie tutte le giocate di una sessione, in ordine. Guardia a 2000 per lo stesso motivo
 *  di `simula()`: il rigioca non consuma Piuccine. */
function traccia(seed: number): Array<{
  vinta: boolean;
  rigioca: boolean;
  importo: number;
  ultima: boolean;
  piuccinePrima: number;
  vintoDopo: number;
}> {
  const scelta = creaRng(seed ^ 0x85ebca6b);
  let s = statoIniziale(seed);
  const out: Array<{
    vinta: boolean;
    rigioca: boolean;
    importo: number;
    ultima: boolean;
    piuccinePrima: number;
    vintoDopo: number;
  }> = [];
  let guardia = 0;
  while (!sessioneFinita(s)) {
    if (guardia++ > 2000) throw new Error("sessione che non termina");
    const d = giochiDisponibili(s);
    const piuccinePrima = s.piuccine;
    const e = gioca(s, d[Math.floor(scelta() * d.length)]);
    s = e.stato;
    out.push({
      vinta: e.vinta,
      rigioca: e.rigioca,
      importo: e.importo,
      ultima: sessioneFinita(s),
      piuccinePrima,
      vintoDopo: s.vinto,
    });
  }
  return out;
}

describe("motore — credibilità", () => {
  it("le prime tre giocate perdono sempre", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const t = traccia(seed);
      expect(t.slice(0, 3).every((x) => !x.vinta)).toBe(true);
    }
  });

  it("una serie di perdite consecutive non supera limitePerdite calcolato all'inizio della serie", () => {
    // Il limite fisso a 5 è stato sostituito da uno dinamico (vedi limitePerdite in engine.ts,
    // commit f7761ef): le sessioni lunghe tollerano secche più lunghe, quelle vicine alla fine
    // si stringono. Il vincolo va quindi valutato contro limitePerdite(piuccine di inizio serie),
    // non contro una costante fissa. Un rigioca rompe la serie esattamente come una vincita:
    // è il suo scopo (biglietto gratis al posto della briciola in euro).
    for (let seed = 1; seed <= 300; seed++) {
      let run = 0;
      let inizioSerie = 0;
      for (const x of traccia(seed).slice(3)) {
        if (x.vinta || x.rigioca) {
          run = 0;
          continue;
        }
        if (run === 0) inizioSerie = x.piuccinePrima;
        run++;
        expect(run).toBeLessThanOrEqual(limitePerdite(inizioSerie));
      }
    }
  });

  it("sotto 25 Piuccine una serie di perdite non supera mai 5", () => {
    // 25 = 25% di BUDGET_INIZIALE, stessa proporzione della vecchia soglia (250/1000 = 25%).
    for (let seed = 1; seed <= 300; seed++) {
      let run = 0;
      let inizioSerie = 0;
      for (const x of traccia(seed).slice(3)) {
        if (x.vinta || x.rigioca) {
          run = 0;
          continue;
        }
        if (run === 0) inizioSerie = x.piuccinePrima;
        run++;
        if (inizioSerie < 25) expect(run).toBeLessThanOrEqual(5);
      }
    }
  });

  it("vinto resta sempre sotto TARGET_EUR fino all'ultima giocata", () => {
    // Il vincolo che ha fatto fallire i due tentativi precedenti: prima la briciola in euro
    // esauriva il residuo troppo presto, poi la riserva che doveva correggerla lo faceva anche
    // peggio. Rimosso il meccanismo in euro (ora è un rigioca gratuito), il residuo è governato
    // solo dal colpo grosso e dal ramo ordinario, entrambi con un margine minimo di 1€ che
    // garantisce per induzione che non tocchino mai esattamente 0 prima dell'ultima giocata.
    for (let seed = 1; seed <= 300; seed++) {
      for (const x of traccia(seed)) {
        if (!x.ultima) expect(x.vintoDopo).toBeLessThan(TARGET_EUR);
      }
    }
  });

  it("la sessione termina sempre anche con i rigioca gratuiti", () => {
    // Il rigioca non consuma Piuccine, quindi non fa avanzare da solo la sessione verso la
    // fine — ma scatta solo dopo una serie di PERDITE VERE (che consumano Piuccine), e ogni
    // volta che scatta azzera la serie: per tornare a scattare serve un'altra serie intera di
    // perdite vere. Il numero di rigioca in tutta la sessione è quindi limitato da (giocate che
    // consumano Piuccine) / limitePerdite-minimo(5), che a sua volta è limitato da
    // BUDGET_INIZIALE / COSTO_MINIMO = 100. Nel caso peggiore assoluto (ogni giocata reale è una
    // perdita) sono al più 100 giocate reali + 20 rigioca = 120 giocate totali: ben sotto le
    // 2000 di guardia. Lo testiamo direttamente contando le giocate, non solo affidandoci al
    // throw della guardia.
    for (let seed = 1; seed <= 300; seed++) {
      const t = traccia(seed);
      expect(t.length).toBeLessThan(2000);
      expect(t.length).toBeLessThanOrEqual(120);
    }
  });

  it("non ci sono mai più di 2 vincite consecutive, salvo l'ultima giocata", () => {
    // La regola 3 non si applica all'ultima giocata (la chiusura esatta vince su tutto): se le
    // due giocate precedenti erano già vincite, la chiusura forzata può creare una terza vincita
    // di fila. È lo stesso compromesso già accettato per gli importi tondi qui sotto.
    for (let seed = 1; seed <= 300; seed++) {
      let run = 0;
      for (const x of traccia(seed)) {
        if (x.ultima) break;
        run = x.vinta ? run + 1 : 0;
        expect(run).toBeLessThanOrEqual(2);
      }
    }
  });

  it("esiste esattamente una vincita grossa per sessione", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const grosse = traccia(seed).filter((x) => x.importo >= SOGLIA_GROSSA);
      expect(grosse.length).toBe(1);
    }
  });

  it("la chiusura forzata finale resta una cifra piccola", () => {
    // Se l'ultima giocata dovesse pagare una cifra enorme significherebbe che la curva non
    // sta seguendo il target, e il finale sembrerebbe truccato — perché lo sarebbe.
    for (let seed = 1; seed <= 300; seed++) {
      const t = traccia(seed);
      expect(t[t.length - 1].importo).toBeLessThan(SOGLIA_GROSSA);
    }
  });

  it("nessun importo tondo, salvo al più l'ultima giocata", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const tondi = traccia(seed).filter((x) => x.vinta && x.importo % 5 === 0 && !x.ultima);
      expect(tondi).toEqual([]);
    }
  });

  it("le giocate che consumano Piuccine restano fra 20 e 100", () => {
    // Il conteggio "20-100 giocate" riguarda le giocate che spendono davvero Piuccine
    // (100/5 e 100/1: è quello che il budget vincola). Il totale delle chiamate a `gioca`,
    // incluse le rigioca gratuite, può essere più alto — coperto dal test sopra sulla
    // terminazione, non da questo.
    for (let seed = 1; seed <= 300; seed++) {
      const n = traccia(seed).filter((x) => !x.rigioca).length;
      expect(n).toBeGreaterThanOrEqual(20);
      expect(n).toBeLessThanOrEqual(100);
    }
  });
});
