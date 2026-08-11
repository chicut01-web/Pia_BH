import { describe, expect, it } from "vitest";
import { COSTI, SOGLIA_GROSSA, TARGET_EUR } from "./config";
import type { GiocoId } from "./config";
import { creaRng } from "./rng";
import { gioca, giochiDisponibili, limitePerdite, sessioneFinita, statoIniziale } from "./engine";
import type { Stato } from "./engine";

/** Ogni test esistente in engine.test.ts guida le sessioni con UNA sola strategia: scelta
 *  uniforme casuale fra i giochi acquistabili. Quel singolo punto cieco ha nascosto il difetto
 *  originale (budget esaurito a metà sessione nelle sessioni lunghe fatte di giocate economiche).
 *  Qui la stessa batteria di vincoli di credibilità gira su tre strategie fisse: sempre il più
 *  economico (~100 giocate), sempre il più caro (~20 giocate) e la scelta casuale già esistente. */

type Giocata = {
  vinta: boolean;
  rigioca: boolean;
  importo: number;
  ultima: boolean;
  piuccinePrima: number;
  vintoDopo: number;
};

type Strategia = (disponibili: GiocoId[], scelta: () => number) => GiocoId;

const semprePiuEconomico: Strategia = (disponibili) =>
  disponibili.reduce((best, cur) => (COSTI[cur] < COSTI[best] ? cur : best));

const semprePiuCaro: Strategia = (disponibili) =>
  disponibili.reduce((best, cur) => (COSTI[cur] > COSTI[best] ? cur : best));

const uniformeCasuale: Strategia = (disponibili, scelta) =>
  disponibili[Math.floor(scelta() * disponibili.length)];

/** Gioca una sessione intera con una strategia fissa di scelta del gioco, registrando ogni
 *  giocata insieme allo stato rilevante per i controlli di credibilità. Guardia a 2000 (non più
 *  500): il rigioca non consuma Piuccine, quindi una sessione può contare più "giocate" (nel
 *  senso di chiamate a `gioca`) di quante il solo budget in Piuccine imporrebbe — resta comunque
 *  limitata, vedi il test dedicato sulla terminazione più sotto. */
function traccia(seed: number, strategia: Strategia): Giocata[] {
  const scelta = creaRng(seed ^ 0x85ebca6b);
  let s: Stato = statoIniziale(seed);
  const out: Giocata[] = [];
  let guardia = 0;
  while (!sessioneFinita(s)) {
    if (guardia++ > 2000) throw new Error("sessione che non termina");
    const disponibili = giochiDisponibili(s);
    const g = strategia(disponibili, scelta);
    const piuccinePrima = s.piuccine;
    const e = gioca(s, g);
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
  // Guardia contro un falso verde: una sessione che finisse subito farebbe passare
  // ogni controllo per il motivo sbagliato.
  expect(out.length).toBeGreaterThan(0);
  return out;
}

/** Quante giocate consumano davvero Piuccine (escludendo i rigioca, che sono gratuiti). È questo
 *  il numero che il budget di 100 Piuccine e i costi dei giochi vincolano fra 20 e 100 — non il
 *  totale delle chiamate a `gioca`, che include anche i biglietti gratis. */
function giocateReali(t: Giocata[]): number {
  return t.filter((x) => !x.rigioca).length;
}

/** Registra l'intera batteria di vincoli di credibilità del brief per una strategia fissa. */
function batteriaCredibilita(nome: string, strategia: Strategia, seeds: number[]) {
  describe(`motore — credibilità (${nome})`, () => {
    it("chiude sempre esattamente a TARGET_EUR", () => {
      for (const seed of seeds) {
        const t = traccia(seed, strategia);
        expect(t[t.length - 1].vintoDopo).toBe(TARGET_EUR);
      }
    });

    it("le prime tre giocate perdono sempre", () => {
      for (const seed of seeds) {
        const t = traccia(seed, strategia);
        expect(t.slice(0, 3).every((x) => !x.vinta)).toBe(true);
      }
    });

    it("non ci sono mai più di 2 vincite consecutive, salvo l'ultima giocata", () => {
      for (const seed of seeds) {
        let run = 0;
        for (const x of traccia(seed, strategia)) {
          if (x.ultima) break;
          run = x.vinta ? run + 1 : 0;
          expect(run).toBeLessThanOrEqual(2);
        }
      }
    });

    it("esiste esattamente una vincita grossa per sessione", () => {
      for (const seed of seeds) {
        const grosse = traccia(seed, strategia).filter((x) => x.importo >= SOGLIA_GROSSA);
        expect(grosse.length).toBe(1);
      }
    });

    it("la chiusura forzata finale resta una cifra piccola", () => {
      for (const seed of seeds) {
        const t = traccia(seed, strategia);
        expect(t[t.length - 1].importo).toBeLessThan(SOGLIA_GROSSA);
      }
    });

    it("nessun importo tondo, salvo al più l'ultima giocata", () => {
      for (const seed of seeds) {
        const tondi = traccia(seed, strategia).filter((x) => x.vinta && x.importo % 5 === 0 && !x.ultima);
        expect(tondi).toEqual([]);
      }
    });

    it("vinto resta sempre sotto TARGET_EUR fino all'ultima giocata", () => {
      // Il vincolo che ha fatto fallire i due tentativi precedenti (briciola in euro non
      // budgetata, poi riserva auto-affamante — vedi task-4-report.md). Rimosso il meccanismo in
      // euro (ora è un rigioca gratuito che non tocca il residuo), restano solo il colpo grosso
      // e il ramo ordinario a spendere i 27€, entrambi con un margine minimo di 1€ che per
      // induzione impedisce loro di azzerare il residuo prima dell'ultima giocata.
      for (const seed of seeds) {
        for (const x of traccia(seed, strategia)) {
          if (!x.ultima) expect(x.vintoDopo).toBeLessThan(TARGET_EUR);
        }
      }
    });

    it("una serie di perdite consecutive non supera limitePerdite calcolato all'inizio della serie", () => {
      // Un rigioca rompe la serie esattamente come una vincita: è il suo scopo.
      for (const seed of seeds) {
        let run = 0;
        let inizioSerie = 0;
        for (const x of traccia(seed, strategia)) {
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
      for (const seed of seeds) {
        let run = 0;
        let inizioSerie = 0;
        for (const x of traccia(seed, strategia)) {
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

    it("la sessione termina sempre anche con i rigioca gratuiti", () => {
      // Il rigioca non consuma Piuccine: scatta solo dopo una serie intera di perdite VERE (che
      // consumano Piuccine), e ogni volta che scatta azzera la serie, quindi non può incatenarsi
      // all'infinito. Nel caso peggiore assoluto (ogni giocata reale è una perdita) ci sono al
      // più 100 giocate reali (BUDGET_INIZIALE/COSTO_MINIMO) e una ogni limitePerdite-minimo(5)
      // di esse può innescare un rigioca: al più 20 rigioca, 120 giocate totali.
      for (const seed of seeds) {
        const t = traccia(seed, strategia);
        expect(t.length).toBeLessThanOrEqual(120);
      }
    });

    it("le giocate che consumano Piuccine restano fra 20 e 100", () => {
      // Il conteggio "20-100 giocate" riguarda le giocate che spendono davvero
      // Piuccine (100/5 e 100/1): è quello che il budget vincola. Il totale delle chiamate a
      // `gioca`, incluse le rigioca gratuite, può essere più alto — coperto dal test sopra sulla
      // terminazione, non da questo.
      for (const seed of seeds) {
        const n = giocateReali(traccia(seed, strategia));
        expect(n).toBeGreaterThanOrEqual(20);
        expect(n).toBeLessThanOrEqual(100);
      }
    });
  });
}

const SEEDS_300 = Array.from({ length: 300 }, (_, i) => i + 1);
// Seed che con l'implementazione precedente (drenaggio del budget prima del tempo) producevano
// due vincite grosse nella stessa sessione, sotto la strategia "sempre il più caro".
const SEED_PRICIEST_EXTRA = [
  853, 1055, 1368, 1831, 1890, 2707,
  // Trovati da un reviewer con uno sweep a 300.000 seed (esbuild, fuori da vitest), sulla
  // versione dell'economia PRIMA del rescale (BUDGET_INIZIALE=1000, COSTO_MINIMO=5, taglio più
  // caro "gratta40"=40): la valvola di sicurezza del ramo ordinario stimava le giocate residue in
  // unità da COSTO_MINIMO, quindi per chi comprava sempre il taglio più caro (8 unità da
  // COSTO_MINIMO a giocata, non 1) non si apriva mai in tempo. La seconda vincita ≥ SOGLIA_GROSSA
  // arrivava dalla chiusura forzata finale. Fix: la valvola ora stima le giocate residue nel caso
  // peggiore (costo del taglio più caro ancora acquistabile) e la confronta con quante vincite al
  // massimo consentito servirebbero a chiudere il gap, non con un conteggio fisso — vedi
  // lib/engine.ts e task-4-report.md. I seed restano come copertura di regressione utile dopo il
  // rescale; con il nuovo taglio più caro (gratta5=5, 5 unità da COSTO_MINIMO=1) il rapporto
  // costo-massimo/costo-minimo è cambiato (8x → 5x), ma continuano a esercitare i margini di
  // sicurezza dello stesso motore di distribuzione delle vincite.
  65994, 82741, 193365, 294944,
];

batteriaCredibilita("sempre il più economico (slot)", semprePiuEconomico, SEEDS_300);
batteriaCredibilita("sempre il più caro (gratta5 finché possibile)", semprePiuCaro, [
  ...SEEDS_300,
  ...SEED_PRICIEST_EXTRA,
]);
batteriaCredibilita("scelta uniforme casuale", uniformeCasuale, SEEDS_300);

/** Sweep ampio e "magro": una sola passata di `traccia` per seed (non l'intera batteria di 9
 *  asserzioni × N, che sarebbe lento senza aggiungere potere di rilevazione), verifica gli
 *  invarianti che il difetto trovato dal reviewer violava tutti insieme: chiusura esatta, mai
 *  sopra il target, mai raggiunge il target prima dell'ultima giocata, esattamente una vincita
 *  grossa, chiusura finale piccola. Un difetto raro (il caso reale era 4 su 300.000, specifico
 *  alla strategia "sempre il più caro") richiede molti più di 300 seed per avere una probabilità
 *  concreta di essere ricatturato da un test futuro — è il punto debole che ha lasciato passare
 *  il difetto originale.
 *  Le dimensioni sono proporzionate al costo per sessione: "sempre il più caro" dura ~20-24
 *  giocate (è dove il difetto è stato trovato, quindi va allo sweep più ampio), "sempre il più
 *  economico" ne dura ~100-120 (sweep più stretto per restare in tempi ragionevoli). */
function sweepAmpio(nome: string, strategia: Strategia, n: number, timeoutMs: number) {
  it(
    `sweep ampio (${nome}) su ${n.toLocaleString("it-IT")} seed non trova violazioni`,
    () => {
      for (let seed = 1; seed <= n; seed++) {
        const t = traccia(seed, strategia);
        const ultimaGiocata = t[t.length - 1];
        expect(ultimaGiocata.vintoDopo).toBe(TARGET_EUR);
        expect(ultimaGiocata.importo).toBeLessThan(SOGLIA_GROSSA);
        let grosse = 0;
        for (const x of t) {
          expect(x.vintoDopo).toBeLessThanOrEqual(TARGET_EUR);
          if (!x.ultima) expect(x.vintoDopo).toBeLessThan(TARGET_EUR);
          if (x.importo >= SOGLIA_GROSSA) grosse++;
        }
        expect(grosse).toBe(1);
      }
    },
    // Timeout esplicito per test (non tocca vitest.config.ts): il default di 5s basta per la
    // batteria completa ma non per uno sweep a decine di migliaia di seed. Margine ampio sopra
    // il tempo osservato.
    timeoutMs,
  );
}

describe("motore — sweep ampio (regressione sulla valvola di sicurezza)", () => {
  sweepAmpio("sempre il più caro", semprePiuCaro, 100_000, 60_000);
  sweepAmpio("scelta uniforme casuale", uniformeCasuale, 5_000, 30_000);
  sweepAmpio("sempre il più economico", semprePiuEconomico, 5_000, 30_000);
});

describe("motore — lunghezza sessione per strategia fissa", () => {
  it("sempre il più economico consuma esattamente 100 giocate reali (100/1)", () => {
    expect(giocateReali(traccia(1, semprePiuEconomico))).toBe(100);
  });

  it("sempre il più caro consuma esattamente 20 giocate reali (100/5)", () => {
    expect(giocateReali(traccia(1, semprePiuCaro))).toBe(20);
  });
});

describe("motore — helper di budgeting (limitePerdite)", () => {
  it("limitePerdite resta sempre fra 5 e 12", () => {
    for (let piuccine = 0; piuccine <= 100; piuccine += 1) {
      const l = limitePerdite(piuccine);
      expect(l).toBeGreaterThanOrEqual(5);
      expect(l).toBeLessThanOrEqual(12);
    }
  });

  it("limitePerdite non supera mai 5 sotto le 25 Piuccine", () => {
    // 25 = 25% di BUDGET_INIZIALE, stessa proporzione della vecchia soglia (250/1000 = 25%).
    for (let piuccine = 0; piuccine < 25; piuccine += 1) {
      expect(limitePerdite(piuccine)).toBe(5);
    }
  });
});
