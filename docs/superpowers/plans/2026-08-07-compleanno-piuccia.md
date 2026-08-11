# Sito Compleanno Maria Pia — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sito-regalo mobile con tre minigiochi truccati, dove Maria Pia spende 100 Piuccine finte e accumula esattamente 27€ veri da usare per la prossima vacanza.

**Architecture:** Motore economico puro e testato in `lib/engine.ts`, isolato da tutto. I tre giochi non contengono logica economica: chiedono l'esito al motore e lo mettono in scena a ritroso. Stato in localStorage, nessun backend, deploy statico.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Canvas 2D · Vitest · Vercel

## Global Constraints

- `TARGET_EUR = 27` — il totale vinto a fine sessione deve essere **esattamente** questo, sempre.
- `BUDGET_INIZIALE = 100` Piuccine. `COSTO_MINIMO = 1`. Costi: slot 1, ruota 1, gratta2 2, gratta3 3, gratta5 5.
- `CODICE_ACCESSO = "piuccia"` — confronto case-insensitive, spazi rimossi.
- Nomi visibili all'utente sempre in italiano. Lei è "Piuccia", lui è "Chicut".
- La valuta finta si chiama **Piuccine**. Mai "monete", mai "crediti".
- Le vincite sono in **euro**, sempre interi, mai multipli di 5 (unica eccezione ammessa: l'ultima giocata forzata).
- Ogni giocata ha **tre esiti**, non due: vincita in euro, perdita, e **RIGIOCA** (biglietto
  gratis — `Esito.rigioca === true`, zero euro, Piuccine rimborsate). I tre giochi devono
  metterlo in scena come stato a sé: né "hai vinto" né "hai perso", ma "RIGIOCA — biglietto
  gratis". Vale per Task 11, 12 e 13.
- `Esito` porta anche `eseguita: boolean` — `false` solo quando il saldo non basta per il
  gioco richiesto. I giochi non devono animare nulla quando è `false`.
- Mobile-first: ogni schermata va verificata a 390×844. Il desktop è secondario.
- Nessuna chiamata di rete a runtime. Tutti gli asset sono statici in `public/`.
- Le cartelle `Photos-1-001*` sono materiale sorgente: mai committate, mai dentro `public/`.

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `lib/config.ts` | Costanti di gioco. Nessuna logica |
| `lib/rng.ts` | PRNG deterministico seedabile |
| `lib/engine.ts` | Motore economico. Puro, nessun import di React |
| `lib/engine.test.ts` | Le 10.000 simulazioni e i vincoli di credibilità |
| `lib/storage.ts` | Persistenza localStorage |
| `app/page.tsx` | Macchina a stati fra le schermate |
| `app/layout.tsx` | Font, metadata, sfondo |
| `components/Gate.tsx` | Codice d'accesso |
| `components/Intro.tsx` | Auguri |
| `components/Hub.tsx` | Tabaccheria, scelta del gioco |
| `components/Contatori.tsx` | Piuccine + cassa vincite |
| `components/Gratta.tsx` | Gratta e vinci, canvas |
| `components/Slot.tsx` | Slot machine |
| `components/Ruota.tsx` | Ruota della fortuna |
| `components/Finale.tsx` | Reveal, carosello, messaggio |
| `public/assets/` | Immagini generate + foto processate |

Il motore non importa nulla dalla UI. I componenti di gioco non importano nulla da `config.ts` che riguardi il target — ricevono `Esito` e basta.

---

## Task 1: Scaffold, config, test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (via create-next-app)
- Create: `lib/config.ts`, `vitest.config.ts`, `.gitignore`
- Test: `lib/config.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: `TARGET_EUR: number`, `BUDGET_INIZIALE: number`, `COSTO_MINIMO: number`, `CODICE_ACCESSO: string`, `GiocoId` (union type), `COSTI: Record<GiocoId, number>`, `IMPORTI: number[]`

- [ ] **Step 1: Scaffold Next.js**

```bash
cd /Users/christianizzo/Projects/Pia
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Se `create-next-app` si lamenta di file in conflitto, la causa sono solo `docs/` e le cartelle foto: nessuna delle due è in conflitto reale. In caso di errore, spostare temporaneamente le cartelle `Photos-1-001*` in `../_pia-foto/` e rimetterle dopo.

- [ ] **Step 2: Installare le dipendenze aggiuntive**

```bash
npm install framer-motion && npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 3: Scrivere `.gitignore`**

Aggiungere in coda a quello generato:

```
# materiale sorgente — pesante, privato, non deve finire nel repo né nel deploy
Photos-1-001*
_pia-foto/
```

- [ ] **Step 4: Scrivere `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 5: Aggiungere lo script di test a `package.json`**

Dentro `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Scrivere il test di config (fallisce)**

`lib/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BUDGET_INIZIALE, CODICE_ACCESSO, COSTI, COSTO_MINIMO, IMPORTI, TARGET_EUR } from "./config";

describe("config", () => {
  it("ha il target e il budget concordati", () => {
    expect(TARGET_EUR).toBe(27);
    expect(BUDGET_INIZIALE).toBe(100);
    expect(COSTO_MINIMO).toBe(1);
  });

  it("il costo minimo coincide col gioco più economico", () => {
    expect(Math.min(...Object.values(COSTI))).toBe(COSTO_MINIMO);
  });

  it("il codice d'accesso è normalizzato in minuscolo", () => {
    expect(CODICE_ACCESSO).toBe(CODICE_ACCESSO.toLowerCase().trim());
  });

  it("nessun importo di vincita è multiplo di 5", () => {
    expect(IMPORTI.every((i) => i % 5 !== 0)).toBe(true);
  });

  it("gli importi coprono la fascia da 1 a 12", () => {
    expect(Math.min(...IMPORTI)).toBe(1);
    expect(Math.max(...IMPORTI)).toBe(12);
  });
});
```

- [ ] **Step 7: Eseguire il test e verificare che fallisca**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./config"`

- [ ] **Step 8: Scrivere `lib/config.ts`**

```ts
export const TARGET_EUR = 27;
export const BUDGET_INIZIALE = 100;
export const COSTO_MINIMO = 1;
export const CODICE_ACCESSO = "piuccia";

export type GiocoId = "slot" | "ruota" | "gratta2" | "gratta3" | "gratta5";

export const COSTI: Record<GiocoId, number> = {
  slot: 1,
  ruota: 1,
  gratta2: 2,
  gratta3: 3,
  gratta5: 5,
};

export const NOMI_GIOCHI: Record<GiocoId, string> = {
  slot: "Slot Piuccia",
  ruota: "Ruota della Fortuna",
  gratta2: "Piuccia d'Oro",
  gratta3: "KitKat Fortunato",
  gratta5: "Vacanza Misteriosa",
};

/** Importi di vincita ammessi: interi 1..24 che non sono multipli di 5.
 *  Le cifre tonde fanno sembrare il gioco finto. */
export const IMPORTI: number[] = Array.from({ length: 12 }, (_, i) => i + 1).filter((n) => n % 5 !== 0);

/** Sopra questa soglia una vincita è "grossa". Ne esiste una sola per sessione. */
export const SOGLIA_GROSSA = 8;

/** Numero di caselle per taglio di gratta e vinci. */
export const CASELLE: Record<"gratta2" | "gratta3" | "gratta5", number> = {
  gratta2: 6,
  gratta3: 9,
  gratta5: 12,
};
```

- [ ] **Step 9: Eseguire il test e verificare che passi**

Run: `npm test`
Expected: PASS, 5 test

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js, Vitest e costanti di gioco"
```

---

## Task 2: PRNG deterministico

**Files:**
- Create: `lib/rng.ts`
- Test: `lib/rng.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: `creaRng(seed: number): () => number` — ritorna una funzione che produce float in `[0, 1)`; `randInt(rng, min, max): number` estremi inclusi; `scegli<T>(rng, arr: T[]): T`

Serve un PRNG seedabile perché i test devono essere riproducibili e perché lo stato salvato in localStorage deve poter riprendere la sequenza dove l'aveva lasciata.

- [ ] **Step 1: Scrivere il test (fallisce)**

`lib/rng.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { creaRng, randInt, scegli } from "./rng";

describe("rng", () => {
  it("è deterministico a parità di seed", () => {
    const a = creaRng(42);
    const b = creaRng(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("seed diversi danno sequenze diverse", () => {
    const a = creaRng(1);
    const b = creaRng(2);
    expect(a()).not.toBe(b());
  });

  it("produce float in [0, 1)", () => {
    const r = creaRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randInt rispetta gli estremi inclusi", () => {
    const r = creaRng(9);
    const visti = new Set<number>();
    for (let i = 0; i < 500; i++) visti.add(randInt(r, 3, 5));
    expect([...visti].sort()).toEqual([3, 4, 5]);
  });

  it("scegli ritorna sempre un elemento dell'array", () => {
    const r = creaRng(11);
    const arr = ["a", "b", "c"];
    for (let i = 0; i < 100; i++) expect(arr).toContain(scegli(r, arr));
  });
});
```

- [ ] **Step 2: Eseguire e verificare che fallisca**

Run: `npx vitest run lib/rng.test.ts`
Expected: FAIL — `Failed to resolve import "./rng"`

- [ ] **Step 3: Scrivere `lib/rng.ts`**

```ts
/** mulberry32 — piccolo, veloce, deterministico. */
export function creaRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function scegli<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
```

- [ ] **Step 4: Eseguire e verificare che passi**

Run: `npx vitest run lib/rng.test.ts`
Expected: PASS, 5 test

- [ ] **Step 5: Commit**

```bash
git add lib/rng.ts lib/rng.test.ts
git commit -m "feat: PRNG deterministico seedabile"
```

---

## Task 3: Motore — chiusura esatta sul target

Il vincolo che regge l'intero regalo. Prima si garantisce che il totale chiuda a 57€ sempre; i vincoli di credibilità arrivano nel Task 4.

**Files:**
- Create: `lib/engine.ts`
- Test: `lib/engine.test.ts`

**Interfaces:**
- Consumes: `creaRng` da `lib/rng.ts`; costanti da `lib/config.ts`
- Produces:
  - `type Stato = { piuccine: number; vinto: number; giocate: number; perditeConsecutive: number; vinciteConsecutive: number; grossaErogata: boolean; passiRng: number; seed: number }`
  - `type Esito = { vinta: boolean; importo: number; stato: Stato }`
  - `statoIniziale(seed?: number): Stato`
  - `sessioneFinita(s: Stato): boolean`
  - `puoGiocare(s: Stato, g: GiocoId): boolean`
  - `gioca(s: Stato, g: GiocoId): Esito`
  - `giochiDisponibili(s: Stato): GiocoId[]`

`gioca` è puro: non muta `s`, ritorna un nuovo `Stato`. `passiRng` conta quante estrazioni sono state consumate, così ricreando l'RNG dal seed e avanzando di `passiRng` si riprende esattamente la sequenza dopo un reload.

- [ ] **Step 1: Scrivere il test di chiusura esatta (fallisce)**

`lib/engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COSTI, TARGET_EUR } from "./config";
import type { GiocoId } from "./config";
import { creaRng } from "./rng";
import { gioca, giochiDisponibili, puoGiocare, sessioneFinita, statoIniziale } from "./engine";
import type { Stato } from "./engine";

/** Gioca una sessione intera scegliendo a caso fra i giochi ancora acquistabili. */
function simula(seed: number): { finale: Stato; importi: number[] } {
  const scelta = creaRng(seed ^ 0x9e3779b9);
  let s = statoIniziale(seed);
  const importi: number[] = [];
  let guardia = 0;

  while (!sessioneFinita(s)) {
    if (guardia++ > 500) throw new Error("sessione che non termina");
    const disponibili = giochiDisponibili(s);
    const g = disponibili[Math.floor(scelta() * disponibili.length)] as GiocoId;
    const esito = gioca(s, g);
    if (esito.vinta) importi.push(esito.importo);
    s = esito.stato;
  }
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
    expect(sessioneFinita({ ...statoIniziale(1), piuccine: 5 })).toBe(false);
    expect(sessioneFinita({ ...statoIniziale(1), piuccine: 4 })).toBe(true);
    expect(sessioneFinita({ ...statoIniziale(1), piuccine: 0 })).toBe(true);
  });

  it("puoGiocare rifiuta i giochi non acquistabili", () => {
    const s = { ...statoIniziale(1), piuccine: 10 };
    expect(puoGiocare(s, "slot")).toBe(true);
    expect(puoGiocare(s, "gratta2")).toBe(true);
    expect(puoGiocare(s, "gratta5")).toBe(false);
  });
});
```

- [ ] **Step 2: Eseguire e verificare che fallisca**

Run: `npx vitest run lib/engine.test.ts`
Expected: FAIL — `Failed to resolve import "./engine"`

- [ ] **Step 3: Scrivere `lib/engine.ts`**

```ts
import {
  BUDGET_INIZIALE,
  COSTI,
  COSTO_MINIMO,
  GiocoId,
  IMPORTI,
  SOGLIA_GROSSA,
  TARGET_EUR,
} from "./config";
import { creaRng } from "./rng";

export type Stato = {
  piuccine: number;
  vinto: number;
  giocate: number;
  perditeConsecutive: number;
  vinciteConsecutive: number;
  grossaErogata: boolean;
  seed: number;
  passiRng: number;
};

export type Esito = {
  vinta: boolean;
  importo: number;
  stato: Stato;
};

export function statoIniziale(seed: number = Date.now() >>> 0): Stato {
  return {
    piuccine: BUDGET_INIZIALE,
    vinto: 0,
    giocate: 0,
    perditeConsecutive: 0,
    vinciteConsecutive: 0,
    grossaErogata: false,
    seed: seed >>> 0,
    passiRng: 0,
  };
}

export function sessioneFinita(s: Stato): boolean {
  return s.piuccine < COSTO_MINIMO;
}

export function puoGiocare(s: Stato, g: GiocoId): boolean {
  return s.piuccine >= COSTI[g];
}

export function giochiDisponibili(s: Stato): GiocoId[] {
  return (Object.keys(COSTI) as GiocoId[]).filter((g) => puoGiocare(s, g));
}

/** Frazione del target che dovrebbe essere già stata vinta a un dato punto della sessione.
 *  Piatta all'inizio (si perde, come nella realtà), gradino netto a metà — è lì che cade la
 *  vincita grossa — poi si appiattisce arrivando esattamente a 1 a budget esaurito. */
function curva(p: number): number {
  const base = p * p * (3 - 2 * p) * 0.7;
  const gradino = 0.3 / (1 + Math.exp(-40 * (p - 0.5)));
  return Math.min(1, base + gradino);
}

/** Avvicina `v` all'importo ammesso più vicino, senza superare `tetto`. */
function importoAmmesso(v: number, tetto: number): number {
  const candidati = IMPORTI.filter((i) => i <= tetto);
  if (candidati.length === 0) return Math.max(0, Math.min(Math.round(v), tetto));
  let best = candidati[0];
  for (const c of candidati) if (Math.abs(c - v) < Math.abs(best - v)) best = c;
  return best;
}

export function gioca(s: Stato, g: GiocoId): Esito {
  const costo = COSTI[g];
  if (s.piuccine < costo) {
    return { vinta: false, importo: 0, stato: { ...s } };
  }

  const rng = creaRng(s.seed);
  for (let i = 0; i < s.passiRng; i++) rng();
  let passi = s.passiRng;
  const estrai = () => {
    passi++;
    return rng();
  };

  const piuccineDopo = s.piuccine - costo;
  const ultima = piuccineDopo < COSTO_MINIMO;
  const residuo = TARGET_EUR - s.vinto;

  let importo = 0;

  if (ultima) {
    // Chiusura forzata: qualunque cosa manchi, la paga questa giocata.
    importo = residuo;
  } else {
    const progresso = 1 - piuccineDopo / BUDGET_INIZIALE;
    const gap = TARGET_EUR * curva(progresso) - s.vinto;

    if (gap >= 1) {
      const probabilita = Math.min(0.75, Math.max(0.2, gap / 8));
      if (estrai() < probabilita) {
        const grossaPossibile = !s.grossaErogata && gap >= SOGLIA_GROSSA;
        const desiderato = grossaPossibile ? gap : gap * (0.6 + estrai() * 0.7);
        importo = importoAmmesso(desiderato, residuo);
      }
    }
  }

  const vinta = importo > 0;
  return {
    vinta,
    importo,
    stato: {
      piuccine: piuccineDopo,
      vinto: s.vinto + importo,
      giocate: s.giocate + 1,
      perditeConsecutive: vinta ? 0 : s.perditeConsecutive + 1,
      vinciteConsecutive: vinta ? s.vinciteConsecutive + 1 : 0,
      grossaErogata: s.grossaErogata || importo >= SOGLIA_GROSSA,
      seed: s.seed,
      passiRng: passi,
    },
  };
}
```

- [ ] **Step 4: Eseguire e verificare che passi**

Run: `npx vitest run lib/engine.test.ts`
Expected: PASS, 9 test. Il primo (10.000 sessioni) impiega qualche secondo.

Se il test di chiusura fallisce, la causa quasi certa è che `residuo` risulti negativo perché una vincita precedente ha superato il target: verificare che `importoAmmesso` riceva sempre `residuo` come tetto.

- [ ] **Step 5: Commit**

```bash
git add lib/engine.ts lib/engine.test.ts
git commit -m "feat: motore economico con chiusura garantita sul target"
```

---

## Task 4: Motore — vincoli di credibilità

La sessione deve *sembrare* vera. Questo task aggiunge le regole che rendono la sequenza credibile senza rompere la chiusura esatta.

**Files:**
- Modify: `lib/engine.ts`
- Modify: `lib/engine.test.ts`

**Interfaces:**
- Consumes: tutto ciò che il Task 3 ha prodotto
- Produces: nessuna nuova firma pubblica. `gioca` mantiene la stessa signature

Regole:
1. Le prime 3 giocate perdono sempre.
2. Superato il limite di perdite consecutive, la giocata dopo esce **RIGIOCA**: biglietto
   gratis. Non paga euro, restituisce le Piuccine spese, azzera la serie di perdite.
   Il limite non è fisso: `limitePerdite(piuccine)` vale 12 a inizio sessione e scende a 5
   verso la fine.

   La consolazione non può essere in denaro. 57€ su ~200 giocate fanno 0,285€ a giocata: con
   briciole in euro le sole consolazioni consumavano 34-41€ dei 57, il colpo grosso finiva i
   restanti, e la sessione arrivava a 57€ molto prima della fine restando poi morta. Il
   biglietto gratis spezza la serie a costo zero e lascia i 57€ interi per colpo grosso e
   vincite ordinarie.

   RIGIOCA non deve mai scattare sull'ultima giocata: il rimborso annullerebbe la fine
   sessione, e la chiusura esatta batte ogni altra regola.
3. Dopo 2 vincite consecutive, la terza perde. RIGIOCA non conta come vincita: non è denaro.
4. Esattamente una vincita ≥ `SOGLIA_GROSSA` per sessione.
5. Nessun importo multiplo di 5, tranne al massimo l'ultima giocata forzata.

Le regole 1-3 non si applicano all'ultima giocata: la chiusura esatta vince su tutto.

- [ ] **Step 1: Aggiungere i test di credibilità (falliscono)**

Aggiungere in coda a `lib/engine.test.ts`:

```ts
import { SOGLIA_GROSSA } from "./config";

type Giocata = { vinta: boolean; importo: number; ultima: boolean; piuccinePrima: number };

/** Raccoglie tutte le giocate di una sessione, in ordine. `piuccinePrima` è il saldo
 *  prima della giocata: serve a valutare il limite dinamico di perdite nel punto giusto. */
function traccia(seed: number): Giocata[] {
  const scelta = creaRng(seed ^ 0x85ebca6b);
  let s = statoIniziale(seed);
  const out: Giocata[] = [];
  while (!sessioneFinita(s)) {
    const piuccinePrima = s.piuccine;
    const d = giochiDisponibili(s);
    const e = gioca(s, d[Math.floor(scelta() * d.length)]);
    s = e.stato;
    out.push({ vinta: e.vinta, importo: e.importo, ultima: sessioneFinita(s), piuccinePrima });
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

  it("le perdite consecutive restano dentro il limite dinamico", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const t = traccia(seed).slice(3);
      let run = 0;
      let limiteRun = 12;
      for (const x of t) {
        if (run === 0) limiteRun = limitePerdite(x.piuccinePrima);
        run = x.vinta ? 0 : run + 1;
        expect(run).toBeLessThanOrEqual(limiteRun);
      }
    }
  });

  it("il finale non va in secca: sotto le 250 Piuccine mai più di 5 perdite di fila", () => {
    for (let seed = 1; seed <= 300; seed++) {
      let run = 0;
      for (const x of traccia(seed)) {
        if (x.piuccinePrima >= 250) continue;
        run = x.vinta ? 0 : run + 1;
        expect(run).toBeLessThanOrEqual(5);
      }
    }
  });

  it("non ci sono mai più di 2 vincite consecutive", () => {
    for (let seed = 1; seed <= 300; seed++) {
      let run = 0;
      for (const x of traccia(seed)) {
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

  it("la sessione dura fra 25 e 200 giocate", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const n = traccia(seed).length;
      expect(n).toBeGreaterThanOrEqual(25);
      expect(n).toBeLessThanOrEqual(200);
    }
  });
});
```

- [ ] **Step 2: Eseguire e verificare quali falliscono**

Run: `npx vitest run lib/engine.test.ts`
Expected: FAIL sui test di credibilità (le prime tre giocate, le serie, la vincita unica). I test del Task 3 restano verdi.

- [ ] **Step 3: Applicare i vincoli in `lib/engine.ts`**

Sostituire il blocco `if (ultima) { ... } else { ... }` dentro `gioca` con:

```ts
  const PICCOLI = [1, 2, 3, 4];
  const progresso = 1 - piuccineDopo / BUDGET_INIZIALE;

  if (ultima) {
    // Chiusura forzata: qualunque cosa manchi, la paga questa giocata.
    importo = residuo;
  } else if (s.giocate < 3) {
    // Deve capire subito che si può perdere.
    importo = 0;
  } else if (s.vinciteConsecutive >= 2) {
    // Tre vincite di fila non succedono mai davvero.
    importo = 0;
  } else if (s.perditeConsecutive >= 5) {
    // Troppe perdite di fila diventano frustranti: si concede una briciola.
    importo = importoAmmesso(PICCOLI[Math.floor(estrai() * PICCOLI.length)], residuo);
  } else if (!s.grossaErogata && progresso >= 0.42 && residuo >= SOGLIA_GROSSA + 6) {
    // Il colpo grosso, una volta sola, a metà sessione. Non emerge da solo: se la sessione
    // è fatta di tante giocate piccole, il gap viene consumato prima di arrivare alla soglia
    // e la vincita grossa non arriverebbe mai. Va forzata dentro una finestra.
    // Il tetto lascia sempre almeno 6€ da distribuire nel resto della sessione.
    const desiderato = SOGLIA_GROSSA + Math.floor(estrai() * 9);
    importo = importoAmmesso(desiderato, residuo - 6);
  } else {
    const gap = TARGET_EUR * curva(progresso) - s.vinto;

    if (gap >= 1) {
      const probabilita = Math.min(0.75, Math.max(0.2, gap / 8));
      if (estrai() < probabilita) {
        // Fuori dalla finestra del colpo grosso nessuna vincita raggiunge la soglia.
        const desiderato = gap * (0.6 + estrai() * 0.7);
        const tetto = Math.min(residuo, SOGLIA_GROSSA - 1);
        importo = importoAmmesso(desiderato, tetto);
      }
    }
  }
```

- [ ] **Step 4: Eseguire e verificare che passi tutto**

Run: `npm test`
Expected: PASS, tutti i test di entrambi i describe.

Se "esattamente una vincita grossa" fallisce con 0 grosse per qualche seed, significa che il gap non raggiunge mai `SOGLIA_GROSSA` prima che `grossaErogata` diventi vero per altra via: verificare che `grossaErogata` si accenda solo su `importo >= SOGLIA_GROSSA`. Se fallisce con 2 grosse, il tetto `SOGLIA_GROSSA - 1` non è stato applicato nel ramo normale.

Se "la sessione dura fra 25 e 200 giocate" fallisce, non toccare il motore: aggiustare i limiti del test dopo aver stampato la distribuzione reale con `console.log`.

- [ ] **Step 5: Commit**

```bash
git add lib/engine.ts lib/engine.test.ts
git commit -m "feat: vincoli di credibilità nel motore"
```

---

## Task 5: Persistenza

**Files:**
- Create: `lib/storage.ts`
- Test: `lib/storage.test.ts`

**Interfaces:**
- Consumes: `Stato` da `lib/engine.ts`
- Produces:
  - `type Salvataggio = { stato: Stato; sbloccato: boolean; introVista: boolean }`
  - `carica(): Salvataggio | null`
  - `salva(s: Salvataggio): void`
  - `azzera(): void`
  - `CHIAVE: string` (= `"pia-compleanno-v1"`)

`carica` ritorna `null` se non c'è nulla di salvato o se il JSON è corrotto o di versione diversa — mai un'eccezione. Il sito deve sopravvivere a uno storage sporco.

- [ ] **Step 1: Scrivere il test (fallisce)**

`lib/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { statoIniziale } from "./engine";
import { azzera, carica, CHIAVE, salva } from "./storage";

function mockStorage() {
  const dati = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => dati.get(k) ?? null,
    setItem: (k: string, v: string) => void dati.set(k, v),
    removeItem: (k: string) => void dati.delete(k),
  });
  return dati;
}

describe("storage", () => {
  beforeEach(() => mockStorage());

  it("ritorna null quando non c'è nulla di salvato", () => {
    expect(carica()).toBeNull();
  });

  it("fa un round-trip completo dello stato", () => {
    const s = { stato: statoIniziale(99), sbloccato: true, introVista: false };
    salva(s);
    expect(carica()).toEqual(s);
  });

  it("ritorna null su JSON corrotto invece di lanciare", () => {
    const dati = mockStorage();
    dati.set(CHIAVE, "{ non json");
    expect(() => carica()).not.toThrow();
    expect(carica()).toBeNull();
  });

  it("ritorna null se mancano campi obbligatori", () => {
    const dati = mockStorage();
    dati.set(CHIAVE, JSON.stringify({ sbloccato: true }));
    expect(carica()).toBeNull();
  });

  it("azzera cancella il salvataggio", () => {
    salva({ stato: statoIniziale(1), sbloccato: true, introVista: true });
    azzera();
    expect(carica()).toBeNull();
  });
});
```

- [ ] **Step 2: Eseguire e verificare che fallisca**

Run: `npx vitest run lib/storage.test.ts`
Expected: FAIL — `Failed to resolve import "./storage"`

- [ ] **Step 3: Scrivere `lib/storage.ts`**

```ts
import type { Stato } from "./engine";

export const CHIAVE = "pia-compleanno-v1";

export type Salvataggio = {
  stato: Stato;
  sbloccato: boolean;
  introVista: boolean;
};

function valido(x: unknown): x is Salvataggio {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  if (typeof s.sbloccato !== "boolean" || typeof s.introVista !== "boolean") return false;
  const st = s.stato as Record<string, unknown> | undefined;
  if (typeof st !== "object" || st === null) return false;
  return (
    typeof st.piuccine === "number" &&
    typeof st.vinto === "number" &&
    typeof st.giocate === "number" &&
    typeof st.seed === "number" &&
    typeof st.passiRng === "number"
  );
}

export function carica(): Salvataggio | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHIAVE);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return valido(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function salva(s: Salvataggio): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(s));
  } catch {
    // storage pieno o disabilitato: la sessione prosegue solo in memoria
  }
}

export function azzera(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(CHIAVE);
}
```

- [ ] **Step 4: Eseguire e verificare che passi**

Run: `npx vitest run lib/storage.test.ts`
Expected: PASS, 5 test

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/storage.test.ts
git commit -m "feat: persistenza localStorage tollerante ai dati corrotti"
```

---

## Task 6: Pipeline foto

Le 8 foto scelte vanno raddrizzate (l'orientamento EXIF non è applicato), ridimensionate e convertite. `ffmpeg` applica la rotazione EXIF in automatico; `sips` no.

**Files:**
- Create: `scripts/foto.sh`
- Create: `public/assets/foto/*.webp` (output)

**Interfaces:**
- Consumes: le cartelle `Photos-1-001*` nella root
- Produces: 8 file in `public/assets/foto/` con nomi stabili usati da `Intro.tsx`, `Hub.tsx` e `Finale.tsx`:
  `finale.webp`, `intro.webp`, `car1.webp`, `car2.webp`, `car3.webp`, `sfondo-finale.webp`, `sfondo-hub.webp`, `faccia-pia.webp`

- [ ] **Step 1: Scrivere `scripts/foto.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=public/assets/foto
mkdir -p "$OUT"

# sorgente -> nome finale. ffmpeg applica da solo la rotazione EXIF.
converti() {
  local src="$1" dst="$2" w="$3"
  ffmpeg -hide_banner -loglevel error -i "$src" \
    -vf "scale=${w}:-2:force_original_aspect_ratio=decrease" \
    -q:v 80 "$OUT/$dst" -y
  echo "  $dst"
}

echo "Converto le foto..."
converti "Photos-1-001 (2)/IMG_20260625_162704.jpg" finale.webp        1400
converti "Photos-1-001 (1)/IMG_20260412_125402.jpg" intro.webp         1000
converti "Photos-1-001 (2)/IMG_20260622_185613.jpg" car1.webp          1000
converti "Photos-1-001 (1)/IMG_20260622_185616.jpg" car2.webp          1000
converti "Photos-1-001/IMG_20260625_162732.jpg"     car3.webp          1000
converti "Photos-1-001 (2)/IMG_20260625_162729.jpg" sfondo-finale.webp 1400
converti "Photos-1-001 (1)/IMG_20260410_174454.jpg" sfondo-hub.webp    1200
converti "Photos-1-001 (2)/IMG_20260301_180926.jpg" faccia-pia.webp     700

echo "Fatto. Pesi:"
du -sh "$OUT"/*.webp
```

- [ ] **Step 2: Renderlo eseguibile ed eseguirlo**

```bash
chmod +x scripts/foto.sh && ./scripts/foto.sh
```

Expected: 8 righe di output, nessun errore, ogni file sotto i 400 KB.

- [ ] **Step 3: Verificare a occhio che siano dritte**

```bash
open public/assets/foto/finale.webp public/assets/foto/intro.webp
```

Se una risulta ruotata, aggiungere `-noautorotate` **non** risolve: significa che l'EXIF è assente. In quel caso aggiungere `transpose=1` (90° orario) o `transpose=2` (antiorario) al filtro `-vf` della singola foto.

- [ ] **Step 4: Commit**

```bash
git add scripts/foto.sh public/assets/foto
git commit -m "feat: pipeline di conversione foto con correzione EXIF"
```

---

## Task 7: Asset generati con Higgsfield

Questi non sono codice: sono chiamate agli strumenti Higgsfield. Vanno lanciate presto perché la generazione richiede tempo di attesa reale.

**Files:**
- Create: `public/assets/img/*.webp`

**Interfaces:**
- Produces: `gratta2.webp`, `gratta3.webp`, `gratta5.webp`, `argento.webp`, `ruota.webp`, `sfondo-tabaccheria.webp`, e i simboli slot `sym-kitkat.webp`, `sym-cuore.webp`, `sym-aereo.webp`, `sym-quadrifoglio.webp`, `sym-pia.webp`, `sym-torta.webp`

Palette da rispettare in tutti i prompt: blu notte `#0B1026`, oro `#E8B93B`, rosso lotteria `#C81E2B`, argento `#B8BCC4`, verde vincita `#2FA86B`.

- [ ] **Step 1: Generare i tre fronti di gratta e vinci**

Usare `generate_image` una volta per taglio. Prompt, con il nome che cambia:

> Italian lottery scratch card front, flat vector illustration, no text rendering errors, ornate gold border on deep midnight blue background, art deco corners, large empty silver rectangular play area in the center, small denomination badge in the top right corner, print-quality, clean, no photographic elements, no people

Denominazioni e accenti: `gratta2` oro su blu, `gratta3` rosso e oro, `gratta5` oro pieno con motivo tropicale (è "Vacanza Misteriosa": palme stilizzate negli angoli).

Il testo lo sovrapponiamo in HTML, non nell'immagine — i modelli sbagliano le lettere. Il prompt chiede esplicitamente l'area centrale vuota.

- [ ] **Step 2: Generare la texture argento**

> Seamless brushed metallic silver foil texture, subtle horizontal grain, uniform lighting, no logos, no text, tileable, flat lay, high detail

- [ ] **Step 3: Generare la ruota**

> Carnival wheel of fortune seen straight on, top-down flat vector, 8 equal wedges alternating deep midnight blue and crimson red, thin gold dividing lines and gold rim with small studs, empty wedges with no text, centered, transparent-friendly flat background

- [ ] **Step 4: Generare i quattro simboli slot non fotografici**

Ognuno con `generate_image`, poi `remove_background`:

- KitKat: `single chocolate wafer bar, glossy, flat vector icon, centered, thick gold outline, plain background`
- Cuore: `single plump red heart, flat vector icon, glossy highlight, thick gold outline, plain background`
- Aereo: `single small airplane seen from the side, flat vector icon, white and gold, thick gold outline, plain background`
- Quadrifoglio: `single four leaf clover, flat vector icon, vivid green, thick gold outline, plain background`

- [ ] **Step 5: Ritagliare i due simboli-faccia**

FATTO diversamente dal piano. `sym-pia.webp` e' un ritaglio quadrato del viso di Maria Pia da `Photos-1-001 (2)/IMG_20260301_180926.jpg`, mascherato a cerchio **in locale** con ffmpeg: la sua foto non e' stata caricata su servizi esterni. Non esiste `sym-chicut.webp` — nessuna foto dell'archivio mostra il viso di Christian in modo utilizzabile; il sesto simbolo e' `sym-torta.webp` e il KitKat lo rappresenta gia'.

```bash
# esempio di ritaglio quadrato — regolare x/y guardando l'immagine
ffmpeg -i public/assets/foto/faccia-pia.webp -vf "crop=400:400:150:80,scale=256:256" -y /tmp/faccia-pia-crop.png
```

- [ ] **Step 6: Generare lo sfondo della tabaccheria**

> Interior of a small Italian tobacco shop at night, out of focus bokeh background, warm amber and deep blue tones, shelves with colorful lottery tickets blurred, cinematic, no people, no readable text

- [ ] **Step 7: Normalizzare pesi e formato**

```bash
cd public/assets/img
for f in *.png *.jpg; do
  [ -e "$f" ] || continue
  ffmpeg -hide_banner -loglevel error -i "$f" -vf "scale=min(1024\,iw):-2" -q:v 80 "${f%.*}.webp" -y && rm "$f"
done
du -sh .
```

Expected: cartella sotto i 3 MB in totale.

- [ ] **Step 8: Commit**

```bash
git add public/assets/img
git commit -m "feat: asset grafici generati per giochi e sfondi"
```

---

## Task 8: Layout, tema e macchina a stati

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`
- Modify: `app/page.tsx`
- Create: `components/Contatori.tsx`

**Interfaces:**
- Consumes: `statoIniziale`, `sessioneFinita`, `Stato` da `lib/engine.ts`; `carica`, `salva`, `azzera` da `lib/storage.ts`
- Produces:
  - `type Schermata = "gate" | "intro" | "hub" | "gratta2" | "gratta3" | "gratta5" | "slot" | "ruota" | "finale"`
  - `<Contatori piuccine={number} vinto={number} />`

- [ ] **Step 1: Scrivere `app/globals.css`**

Sostituire il contenuto generato con:

```css
@import "tailwindcss";

@theme {
  --color-notte: #0b1026;
  --color-oro: #e8b93b;
  --color-lotto: #c81e2b;
  --color-argento: #b8bcc4;
  --color-vincita: #2fa86b;
}

html, body {
  background: var(--color-notte);
  color: white;
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
}

/* Il gratta e vinci ha bisogno che il browser non intercetti il trascinamento. */
canvas.gratta {
  touch-action: none;
}
```

- [ ] **Step 2: Scrivere `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const titolo = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-titolo" });
const corpo = Inter({ subsets: ["latin"], variable: "--font-corpo" });

export const metadata: Metadata = {
  title: "Buon compleanno Piuccia",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b1026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${titolo.variable} ${corpo.variable}`}>
      <body className="min-h-dvh font-[family-name:var(--font-corpo)] antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Scrivere `components/Contatori.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";

export default function Contatori({ piuccine, vinto }: { piuccine: number; vinto: number }) {
  return (
    <div className="flex items-stretch gap-2 px-4 pt-4">
      <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Piuccine</div>
        <motion.div
          key={piuccine}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          className="font-[family-name:var(--font-titolo)] text-3xl text-[var(--color-oro)]"
        >
          {piuccine}
        </motion.div>
      </div>
      <div className="flex-1 rounded-2xl border border-[var(--color-vincita)]/30 bg-[var(--color-vincita)]/10 px-4 py-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Vinti davvero</div>
        <motion.div
          key={vinto}
          initial={{ scale: 1.25 }}
          animate={{ scale: 1 }}
          className="font-[family-name:var(--font-titolo)] text-3xl text-[var(--color-vincita)]"
        >
          {vinto}€
        </motion.div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Scrivere `app/page.tsx` con la macchina a stati**

```tsx
"use client";

import { useEffect, useState } from "react";
import { sessioneFinita, Stato, statoIniziale } from "@/lib/engine";
import { azzera, carica, salva } from "@/lib/storage";

export type Schermata =
  | "gate" | "intro" | "hub"
  | "gratta2" | "gratta3" | "gratta5"
  | "slot" | "ruota" | "finale";

export default function Pagina() {
  const [pronto, setPronto] = useState(false);
  const [stato, setStato] = useState<Stato>(() => statoIniziale());
  const [sbloccato, setSbloccato] = useState(false);
  const [introVista, setIntroVista] = useState(false);
  const [schermata, setSchermata] = useState<Schermata>("gate");

  // Riprende la sessione salvata al primo montaggio.
  useEffect(() => {
    const s = carica();
    if (s) {
      setStato(s.stato);
      setSbloccato(s.sbloccato);
      setIntroVista(s.introVista);
    }
    setPronto(true);
  }, []);

  useEffect(() => {
    if (pronto) salva({ stato, sbloccato, introVista });
  }, [pronto, stato, sbloccato, introVista]);

  // Decide quale schermata mostrare quando cambiano le condizioni.
  useEffect(() => {
    if (!pronto) return;
    if (!sbloccato) setSchermata("gate");
    else if (!introVista) setSchermata("intro");
    else if (sessioneFinita(stato)) setSchermata("finale");
  }, [pronto, sbloccato, introVista, stato]);

  function reset() {
    azzera();
    setStato(statoIniziale());
    setSbloccato(false);
    setIntroVista(false);
    setSchermata("gate");
  }

  if (!pronto) return null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md">
      <pre className="p-4 text-xs text-white/60">
        {JSON.stringify({ schermata, piuccine: stato.piuccine, vinto: stato.vinto }, null, 2)}
      </pre>
      <button onClick={reset} className="m-4 rounded bg-white/10 px-3 py-2 text-sm">
        reset
      </button>
    </main>
  );
}
```

Questo è uno scheletro con debug a vista: i Task 9-14 sostituiscono il `<pre>` con le schermate vere.

- [ ] **Step 5: Avviare e verificare**

```bash
npm run dev
```

Aprire `http://localhost:3000`. Expected: si vede il JSON con `schermata: "gate"`, `piuccine: 1000`, `vinto: 0`. Ricaricando, i valori restano. Premendo reset tornano a quelli iniziali.

- [ ] **Step 6: Commit**

```bash
git add app components/Contatori.tsx
git commit -m "feat: tema, layout e macchina a stati delle schermate"
```

---

## Task 9: Cancello e intro

**Files:**
- Create: `components/Gate.tsx`, `components/Intro.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `CODICE_ACCESSO` da `lib/config.ts`
- Produces: `<Gate onSblocco={() => void} />`, `<Intro onAvanti={() => void} />`

- [ ] **Step 1: Scrivere `components/Gate.tsx`**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CODICE_ACCESSO } from "@/lib/config";

export default function Gate({ onSblocco }: { onSblocco: () => void }) {
  const [valore, setValore] = useState("");
  const [errore, setErrore] = useState(false);

  function invia(e: React.FormEvent) {
    e.preventDefault();
    if (valore.trim().toLowerCase() === CODICE_ACCESSO) onSblocco();
    else {
      setErrore(true);
      setValore("");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-8">
      <div className="font-[family-name:var(--font-titolo)] text-6xl text-[var(--color-oro)]">
        T
      </div>
      <p className="text-center text-sm text-white/60">Come ti chiamo io?</p>
      <motion.form
        onSubmit={invia}
        animate={errore ? { x: [0, -8, 8, -6, 6, 0] } : {}}
        onAnimationComplete={() => setErrore(false)}
        className="flex w-full max-w-xs flex-col gap-3"
      >
        <input
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          autoFocus
          autoComplete="off"
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-lg outline-none focus:border-[var(--color-oro)]"
        />
        <button className="rounded-xl bg-[var(--color-oro)] px-4 py-3 font-semibold text-[var(--color-notte)]">
          Entra
        </button>
      </motion.form>
    </div>
  );
}
```

- [ ] **Step 2: Scrivere `components/Intro.tsx`**

```tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Intro({ onAvanti }: { onAvanti: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        className="relative h-64 w-64 overflow-hidden rounded-3xl"
      >
        <Image src="/assets/foto/intro.webp" alt="" fill className="object-cover" priority />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="font-[family-name:var(--font-titolo)] text-5xl leading-none text-[var(--color-oro)]"
      >
        Buon compleanno<br />Piuccia
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="space-y-2 text-white/80"
      >
        <p>Ti ho aperto una tabaccheria tutta tua.</p>
        <p className="text-lg">
          Hai <span className="text-[var(--color-oro)]">100 Piuccine</span> da giocare.
        </p>
        <p className="text-sm text-white/50">
          Quello che vinci è vero. Puoi arrivare fino a 50€.
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        onClick={onAvanti}
        className="rounded-xl bg-[var(--color-oro)] px-8 py-3 font-semibold text-[var(--color-notte)]"
      >
        Apri la tabaccheria
      </motion.button>
    </div>
  );
}
```

- [ ] **Step 3: Collegarli in `app/page.tsx`**

Sostituire il blocco di return di debug con:

```tsx
  if (schermata === "gate") return <Gate onSblocco={() => setSbloccato(true)} />;
  if (schermata === "intro") return <Intro onAvanti={() => setIntroVista(true)} />;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md">
      <pre className="p-4 text-xs text-white/60">{JSON.stringify({ schermata }, null, 2)}</pre>
    </main>
  );
```

E aggiungere gli import in cima:

```tsx
import Gate from "@/components/Gate";
import Intro from "@/components/Intro";
```

- [ ] **Step 4: Verificare a mano**

`npm run dev`, aprire su viewport 390×844 (DevTools, iPhone 14).
Expected: cancello con la T dorata; parola sbagliata → il form trema; "Piuccia" → intro con foto e auguri; "Apri la tabaccheria" → JSON di debug. Ricaricando resta all'hub.

- [ ] **Step 5: Commit**

```bash
git add components/Gate.tsx components/Intro.tsx app/page.tsx
git commit -m "feat: schermata di accesso e intro con auguri"
```

---

## Task 10: Hub della tabaccheria

**Files:**
- Create: `components/Hub.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Contatori`; `COSTI`, `NOMI_GIOCHI`, `GiocoId` da `lib/config.ts`; `puoGiocare` da `lib/engine.ts`
- Produces: `<Hub stato={Stato} onGioco={(g: GiocoId) => void} onReset={() => void} />`

- [ ] **Step 1: Scrivere `components/Hub.tsx`**

```tsx
"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Contatori from "./Contatori";
import { COSTI, GiocoId, NOMI_GIOCHI } from "@/lib/config";
import { puoGiocare, Stato } from "@/lib/engine";

const BANCHI: Array<{ id: GiocoId; icona: string; nota: string }> = [
  { id: "gratta2", icona: "/assets/img/gratta2.webp", nota: "6 caselle" },
  { id: "gratta3", icona: "/assets/img/gratta3.webp", nota: "9 caselle" },
  { id: "gratta5", icona: "/assets/img/gratta5.webp", nota: "12 caselle · paga di più" },
  { id: "slot", icona: "/assets/img/sym-kitkat.webp", nota: "3 rulli" },
  { id: "ruota", icona: "/assets/img/ruota.webp", nota: "8 spicchi" },
];

export default function Hub({
  stato,
  onGioco,
  onReset,
}: {
  stato: Stato;
  onGioco: (g: GiocoId) => void;
  onReset: () => void;
}) {
  const tap = useRef(0);

  // Reset nascosto: cinque tap sulla T. Serve per provare il sito prima di regalarlo.
  function tocca() {
    tap.current += 1;
    if (tap.current >= 5) {
      tap.current = 0;
      onReset();
    }
  }

  return (
    <div className="relative min-h-dvh">
      <Image
        src="/assets/foto/sfondo-hub.webp"
        alt=""
        fill
        className="object-cover opacity-20 blur-sm"
      />
      <div className="relative">
        <Contatori piuccine={stato.piuccine} vinto={stato.vinto} />

        <button
          onClick={tocca}
          className="mx-auto mt-6 block font-[family-name:var(--font-titolo)] text-4xl text-[var(--color-oro)]"
        >
          T
        </button>
        <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-white/40">
          Tabaccheria da Piuccia
        </p>

        <div className="space-y-3 px-4 pb-10">
          {BANCHI.map((b, i) => {
            const disponibile = puoGiocare(stato, b.id);
            return (
              <motion.button
                key={b.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                disabled={!disponibile}
                onClick={() => onGioco(b.id)}
                className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-left disabled:opacity-30"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  <Image src={b.icona} alt="" fill className="object-contain p-1" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{NOMI_GIOCHI[b.id]}</div>
                  <div className="text-xs text-white/50">{b.nota}</div>
                </div>
                <div className="font-[family-name:var(--font-titolo)] text-2xl text-[var(--color-oro)]">
                  {COSTI[b.id]}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Collegarlo in `app/page.tsx`**

Aggiungere l'import `import Hub from "@/components/Hub";` e sostituire il return finale con:

```tsx
  if (schermata === "hub")
    return <Hub stato={stato} onGioco={(g) => setSchermata(g)} onReset={reset} />;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md">
      <pre className="p-4 text-xs text-white/60">{JSON.stringify({ schermata }, null, 2)}</pre>
    </main>
  );
```

E far sì che dopo l'intro si vada all'hub: nell'`useEffect` che decide la schermata, aggiungere in coda al ramo `else`:

```tsx
    else if (schermata === "gate" || schermata === "intro") setSchermata("hub");
```

- [ ] **Step 3: Verificare a mano**

Expected su 390×844: contatori in alto (1000 Piuccine, 0€), cinque banchi cliccabili con i loro costi, sfondo sfocato. Toccando cinque volte la T la sessione si azzera.

- [ ] **Step 4: Commit**

```bash
git add components/Hub.tsx app/page.tsx
git commit -m "feat: hub della tabaccheria con scelta del gioco"
```

---

## Task 11: Gratta e vinci

Il gioco centrale. Canvas con strato argento cancellato al tocco.

**Files:**
- Create: `components/Gratta.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Esito` da `lib/engine.ts`; `CASELLE`, `NOMI_GIOCHI` da `lib/config.ts`; `creaRng`, `scegli` da `lib/rng.ts`
- Produces: `<Gratta taglio={"gratta2"|"gratta3"|"gratta5"} esito={Esito} onFine={() => void} />`

Il componente **riceve l'esito già deciso**. Costruisce la griglia a ritroso: se `vinta`, piazza tre caselle con l'importo vinto in posizioni casuali e riempie il resto senza creare altri tris; se persa, piazza al massimo due caselle uguali (il "quasi").

- [ ] **Step 1: Scrivere `components/Gratta.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CASELLE, IMPORTI, NOMI_GIOCHI } from "@/lib/config";
import type { Esito } from "@/lib/engine";
import { creaRng } from "@/lib/rng";

type Taglio = "gratta2" | "gratta3" | "gratta5";

/** Costruisce le caselle a ritroso a partire dall'esito già deciso dal motore. */
function costruisciGriglia(esito: Esito, n: number, seed: number): number[] {
  const rng = creaRng(seed);
  const celle: number[] = new Array(n).fill(0);
  const posizioni = [...Array(n).keys()].sort(() => rng() - 0.5);

  // Riempitivi: importi diversi da quello vincente, ognuno usato al massimo due volte.
  const riempitivi = IMPORTI.filter((i) => i !== esito.importo);
  const usi = new Map<number, number>();

  let idx = 0;
  if (esito.vinta) {
    for (let k = 0; k < 3; k++) celle[posizioni[idx++]] = esito.importo;
  } else {
    // Il "quasi": due caselle uguali, mai tre.
    const quasi = riempitivi[Math.floor(rng() * riempitivi.length)];
    celle[posizioni[idx++]] = quasi;
    celle[posizioni[idx++]] = quasi;
    usi.set(quasi, 2);
  }

  while (idx < n) {
    const c = riempitivi[Math.floor(rng() * riempitivi.length)];
    const usato = usi.get(c) ?? 0;
    if (usato >= 2) continue;
    usi.set(c, usato + 1);
    celle[posizioni[idx++]] = c;
  }
  return celle;
}

export default function Gratta({
  taglio,
  esito,
  onFine,
}: {
  taglio: Taglio;
  esito: Esito;
  onFine: () => void;
}) {
  const n = CASELLE[taglio];
  const colonne = n === 6 ? 2 : 3;
  const celle = useMemo(() => costruisciGriglia(esito, n, esito.stato.passiRng), [esito, n]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scoperto, setScoperto] = useState(false);
  const disegnando = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Strato argento: gradiente + rumore, così sembra vernice vera.
    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    g.addColorStop(0, "#c9ced6");
    g.addColorStop(0.5, "#9aa1ab");
    g.addColorStop(1, "#c9ced6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    for (let i = 0; i < 900; i++) {
      ctx.fillRect(Math.random() * r.width, Math.random() * r.height, 2, 1);
    }
    ctx.globalCompositeOperation = "destination-out";
  }, [taglio]);

  /** Percentuale di pixel già cancellati. Sopra il 55% si rivela tutto. */
  function controllaScopertura() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dati = ctx.getImageData(0, 0, c.width, c.height).data;
    let vuoti = 0;
    // Campiona un pixel ogni 40 per non bloccare il thread.
    for (let i = 3; i < dati.length; i += 4 * 40) if (dati[i] === 0) vuoti++;
    const totale = dati.length / (4 * 40);
    if (vuoti / totale > 0.55) setScoperto(true);
  }

  function graffia(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnando.current || scoperto) return;
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(e.clientX - r.left, e.clientY - r.top, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5">
      <h2 className="font-[family-name:var(--font-titolo)] text-3xl text-[var(--color-oro)]">
        {NOMI_GIOCHI[taglio]}
      </h2>
      <p className="-mt-4 text-xs text-white/50">Gratta con il dito</p>

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-4 border-[var(--color-oro)]/60 bg-[#0f1530] p-4">
        <div className={`grid gap-2 ${colonne === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {celle.map((v, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-lg bg-white/5 font-[family-name:var(--font-titolo)] text-2xl text-white"
            >
              {v}€
            </div>
          ))}
        </div>

        {!scoperto && (
          <canvas
            ref={canvasRef}
            className="gratta absolute inset-0 h-full w-full"
            onPointerDown={(e) => {
              disegnando.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              graffia(e);
            }}
            onPointerMove={graffia}
            onPointerUp={() => {
              disegnando.current = false;
              controllaScopertura();
            }}
          />
        )}
      </div>

      {scoperto && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          {esito.vinta ? (
            <p className="font-[family-name:var(--font-titolo)] text-4xl text-[var(--color-vincita)]">
              Hai vinto {esito.importo}€
            </p>
          ) : (
            <p className="text-lg text-white/50">Niente. Ritenta.</p>
          )}
          <button
            onClick={onFine}
            className="rounded-xl bg-[var(--color-oro)] px-8 py-3 font-semibold text-[var(--color-notte)]"
          >
            Torna in tabaccheria
          </button>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Collegarlo in `app/page.tsx`**

Aggiungere lo stato dell'esito corrente e la funzione che avvia una giocata. In cima al componente:

```tsx
import Gratta from "@/components/Gratta";
import { gioca } from "@/lib/engine";
import type { GiocoId } from "@/lib/config";

// dentro il componente:
const [esito, setEsito] = useState<ReturnType<typeof gioca> | null>(null);

function avvia(g: GiocoId) {
  const e = gioca(stato, g);
  setEsito(e);
  setSchermata(g);
}

function chiudiGiocata() {
  if (esito) setStato(esito.stato);
  setEsito(null);
  setSchermata("hub");
}
```

Cambiare la prop dell'hub in `onGioco={avvia}` e aggiungere prima del return finale:

```tsx
  if (esito && (schermata === "gratta2" || schermata === "gratta3" || schermata === "gratta5"))
    return <Gratta taglio={schermata} esito={esito} onFine={chiudiGiocata} />;
```

Nota: lo stato viene aggiornato **alla chiusura** della giocata, non all'apertura. Così se lei chiude la pagina a metà grattata, la giocata non è stata consumata e riparte pulita.

- [ ] **Step 3: Verificare a mano**

`npm run dev`, DevTools in modalità touch. Expected: il biglietto si gratta col dito/mouse trascinato, dopo circa metà superficie si rivela tutto, il risultato mostrato corrisponde alle caselle, il ritorno all'hub scala le Piuccine e aggiorna la cassa.

Verificare esplicitamente: quando perde, in griglia non ci sono tre numeri uguali. Quando vince, ce ne sono esattamente tre e sono l'importo annunciato.

- [ ] **Step 4: Commit**

```bash
git add components/Gratta.tsx app/page.tsx
git commit -m "feat: gratta e vinci con canvas grattabile"
```

---

## Task 12: Slot

**Files:**
- Create: `components/Slot.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Esito` da `lib/engine.ts`
- Produces: `<Slot esito={Esito} onFine={() => void} />`

- [ ] **Step 1: Scrivere `components/Slot.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Esito } from "@/lib/engine";
import { creaRng } from "@/lib/rng";

const SIMBOLI = [
  "/assets/img/sym-pia.webp",
  "/assets/img/sym-torta.webp",
  "/assets/img/sym-kitkat.webp",
  "/assets/img/sym-cuore.webp",
  "/assets/img/sym-aereo.webp",
  "/assets/img/sym-quadrifoglio.webp",
];

/** Tre uguali se vinta; altrimenti mai tre uguali, ma spesso due — il quasi. */
function rulliFinali(esito: Esito): number[] {
  const rng = creaRng(esito.stato.passiRng + 1);
  if (esito.vinta) {
    const s = Math.floor(rng() * SIMBOLI.length);
    return [s, s, s];
  }
  const a = Math.floor(rng() * SIMBOLI.length);
  const doppio = rng() < 0.5;
  const b = doppio ? a : (a + 1 + Math.floor(rng() * (SIMBOLI.length - 1))) % SIMBOLI.length;
  let c = (a + 1 + Math.floor(rng() * (SIMBOLI.length - 1))) % SIMBOLI.length;
  if (c === a && c === b) c = (c + 1) % SIMBOLI.length;
  return [a, b, c];
}

export default function Slot({ esito, onFine }: { esito: Esito; onFine: () => void }) {
  const finali = rulliFinali(esito);
  const [fermi, setFermi] = useState<number[]>([]);
  const [correnti, setCorrenti] = useState([0, 0, 0]);

  useEffect(() => {
    // Rulli che girano finché non vengono fermati, uno alla volta.
    const t = setInterval(() => {
      setCorrenti((c) => c.map((v, i) => (fermi.includes(i) ? v : (v + 1) % SIMBOLI.length)));
    }, 70);
    return () => clearInterval(t);
  }, [fermi]);

  useEffect(() => {
    // Il terzo rullo rallenta sempre, anche quando perde: è lì che sta la tensione.
    const tempi = [900, 1600, 2600];
    const timers = tempi.map((ms, i) =>
      setTimeout(() => {
        setCorrenti((c) => c.map((v, j) => (j === i ? finali[i] : v)));
        setFermi((f) => [...f, i]);
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finito = fermi.length === 3;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-5">
      <h2 className="font-[family-name:var(--font-titolo)] text-3xl text-[var(--color-oro)]">
        Slot Piuccia
      </h2>

      <div className="flex gap-3 rounded-2xl border-4 border-[var(--color-oro)]/60 bg-[#0f1530] p-4">
        {correnti.map((s, i) => (
          <motion.div
            key={i}
            animate={fermi.includes(i) ? { y: [0, -6, 0] } : {}}
            className="relative h-24 w-24 overflow-hidden rounded-xl bg-white/5"
          >
            <Image src={SIMBOLI[s]} alt="" fill className="object-contain p-2" />
          </motion.div>
        ))}
      </div>

      {finito && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          {esito.vinta ? (
            <p className="font-[family-name:var(--font-titolo)] text-4xl text-[var(--color-vincita)]">
              Hai vinto {esito.importo}€
            </p>
          ) : (
            <p className="text-lg text-white/50">Per un pelo.</p>
          )}
          <button
            onClick={onFine}
            className="rounded-xl bg-[var(--color-oro)] px-8 py-3 font-semibold text-[var(--color-notte)]"
          >
            Torna in tabaccheria
          </button>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Collegarlo in `app/page.tsx`**

```tsx
import Slot from "@/components/Slot";

// prima del return finale:
if (esito && schermata === "slot") return <Slot esito={esito} onFine={chiudiGiocata} />;
```

- [ ] **Step 3: Verificare a mano**

Expected: i tre rulli girano e si fermano sfalsati, il terzo per ultimo. Vincita → tre simboli identici. Perdita → mai tre identici.

- [ ] **Step 4: Commit**

```bash
git add components/Slot.tsx app/page.tsx
git commit -m "feat: slot machine con arresto sfalsato dei rulli"
```

---

## Task 13: Ruota della fortuna

**Files:**
- Create: `components/Ruota.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Esito` da `lib/engine.ts`
- Produces: `<Ruota esito={Esito} onFine={() => void} />`

La ruota ha 8 spicchi. Due sono "Ritenta". Gli spicchi premio vengono etichettati **a runtime** con l'importo vinto, così qualunque cifra il motore produca ha sempre uno spicchio corrispondente.

- [ ] **Step 1: Scrivere `components/Ruota.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Esito } from "@/lib/engine";
import { creaRng } from "@/lib/rng";

const SPICCHI = 8;
const INDICI_RITENTA = [2, 6];

export default function Ruota({ esito, onFine }: { esito: Esito; onFine: () => void }) {
  const [girato, setGirato] = useState(false);
  const [finito, setFinito] = useState(false);

  const { etichette, bersaglio, angolo } = useMemo(() => {
    const rng = creaRng(esito.stato.passiRng + 2);

    // Riempitivi credibili attorno all'importo reale.
    const et: string[] = [];
    for (let i = 0; i < SPICCHI; i++) {
      if (INDICI_RITENTA.includes(i)) et.push("Ritenta");
      else et.push(`${1 + Math.floor(rng() * 24)}€`);
    }

    // Lo spicchio bersaglio: uno a caso fra quelli premio se vince, un Ritenta se perde.
    let idx: number;
    if (esito.vinta) {
      const premi = [...Array(SPICCHI).keys()].filter((i) => !INDICI_RITENTA.includes(i));
      idx = premi[Math.floor(rng() * premi.length)];
      et[idx] = `${esito.importo}€`;
    } else {
      idx = INDICI_RITENTA[Math.floor(rng() * INDICI_RITENTA.length)];
    }

    const passo = 360 / SPICCHI;
    // Cinque giri pieni più l'allineamento dello spicchio sotto l'indice in alto.
    const a = 360 * 5 + (360 - idx * passo - passo / 2);
    return { etichette: et, bersaglio: idx, angolo: a };
  }, [esito]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-5">
      <h2 className="font-[family-name:var(--font-titolo)] text-3xl text-[var(--color-oro)]">
        Ruota della Fortuna
      </h2>

      <div className="relative h-72 w-72">
        <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-8 border-t-[16px] border-x-transparent border-t-[var(--color-oro)]" />
        <motion.div
          animate={{ rotate: girato ? angolo : 0 }}
          transition={{ duration: 4.2, ease: [0.15, 0.85, 0.2, 1] }}
          onAnimationComplete={() => girato && setFinito(true)}
          className="relative h-full w-full rounded-full border-4 border-[var(--color-oro)]"
        >
          {etichette.map((e, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-left"
              style={{ transform: `rotate(${(360 / SPICCHI) * i + 360 / SPICCHI / 2}deg)` }}
            >
              <span
                className={`ml-16 inline-block text-sm font-semibold ${
                  e === "Ritenta" ? "text-white/40" : "text-[var(--color-oro)]"
                }`}
              >
                {e}
              </span>
            </div>
          ))}
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#0b1026_0_25%,#c81e2b_0_50%,#0b1026_0_75%,#c81e2b_0_100%)] opacity-40" />
        </motion.div>
      </div>

      {!girato && (
        <button
          onClick={() => setGirato(true)}
          className="rounded-xl bg-[var(--color-oro)] px-10 py-3 font-semibold text-[var(--color-notte)]"
        >
          Gira
        </button>
      )}

      {finito && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          {esito.vinta ? (
            <p className="font-[family-name:var(--font-titolo)] text-4xl text-[var(--color-vincita)]">
              Hai vinto {esito.importo}€
            </p>
          ) : (
            <p className="text-lg text-white/50">Ritenta.</p>
          )}
          <button
            onClick={onFine}
            className="rounded-xl bg-[var(--color-oro)] px-8 py-3 font-semibold text-[var(--color-notte)]"
          >
            Torna in tabaccheria
          </button>
        </motion.div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Collegarla in `app/page.tsx`**

```tsx
import Ruota from "@/components/Ruota";

// prima del return finale:
if (esito && schermata === "ruota") return <Ruota esito={esito} onFine={chiudiGiocata} />;
```

- [ ] **Step 3: Verificare a mano**

Expected: la ruota compie cinque giri e frena; l'indice in alto si ferma su uno spicchio premio quando vince e su "Ritenta" quando perde; l'importo mostrato coincide con l'etichetta sotto l'indice.

Se l'allineamento è sfalsato di mezzo spicchio, correggere il termine `- passo / 2` nel calcolo di `a`.

- [ ] **Step 4: Commit**

```bash
git add components/Ruota.tsx app/page.tsx
git commit -m "feat: ruota della fortuna con arresto pilotato"
```

---

## Task 14: Finale e deploy

**Files:**
- Create: `components/Finale.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Stato` da `lib/engine.ts`
- Produces: `<Finale stato={Stato} />`

- [ ] **Step 1: Scrivere `components/Finale.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Stato } from "@/lib/engine";

const CAROSELLO = [
  "/assets/foto/car1.webp",
  "/assets/foto/car2.webp",
  "/assets/foto/car3.webp",
];

export default function Finale({ stato }: { stato: Stato }) {
  const [conteggio, setConteggio] = useState(0);
  const [slide, setSlide] = useState(0);

  // Il totale sale da 0 al valore vero: il numero deve arrivare come una rivelazione.
  useEffect(() => {
    const durata = 2200;
    const avvio = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - avvio) / durata);
      setConteggio(Math.round(stato.vinto * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stato.vinto]);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % CAROSELLO.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Image
        src="/assets/foto/sfondo-finale.webp"
        alt=""
        fill
        className="object-cover opacity-25 blur-[2px]"
      />

      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Le Piuccine sono finite</p>

        <div>
          <p className="text-white/70">Hai vinto</p>
          <div className="font-[family-name:var(--font-titolo)] text-8xl leading-none text-[var(--color-vincita)]">
            {conteggio}€
          </div>
        </div>

        <div className="relative h-56 w-56 overflow-hidden rounded-3xl">
          {CAROSELLO.map((src, i) => (
            <motion.div
              key={src}
              animate={{ opacity: slide === i ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0"
            >
              <Image src={src} alt="" fill className="object-cover" />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
          className="space-y-3"
        >
          <p className="text-lg text-white/90">
            Sono veri. E sono il budget della nostra prossima vacanza.
          </p>
          <p className="text-sm text-white/50">Dove andiamo lo scegliamo insieme.</p>
          <p className="pt-4 font-[family-name:var(--font-titolo)] text-2xl text-[var(--color-oro)]">
            Buon compleanno Piuccia
          </p>
        </motion.div>

        <p className="pt-6 text-[10px] text-white/25">
          {stato.giocate} giocate · 100 Piuccine spese
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Collegarlo in `app/page.tsx`**

```tsx
import Finale from "@/components/Finale";

// prima del return finale:
if (schermata === "finale") return <Finale stato={stato} />;
```

A questo punto il `<pre>` di debug e il pulsante reset a vista possono essere eliminati: il reset resta disponibile dai cinque tap sulla T nell'hub.

- [ ] **Step 3: Giocare una sessione intera a mano**

Aprire su viewport 390×844 e giocare fino a esaurimento delle Piuccine.

Expected: il totale finale è **57€**. Se non lo è, il difetto è nel collegamento fra UI e motore — quasi certamente `setStato` chiamato due volte per una stessa giocata, o `esito.stato` scartato. Il motore è già coperto dai test.

- [ ] **Step 4: Verificare che la suite sia verde**

Run: `npm test && npm run build`
Expected: tutti i test passano, la build compila senza errori di tipo.

- [ ] **Step 5: Deploy**

```bash
npx vercel --prod
```

Al primo lancio la CLI chiede di collegare il progetto: accettare i default, framework rilevato Next.js.

- [ ] **Step 6: Provare sul telefono vero**

Aprire l'URL di produzione dal proprio telefono. Verificare in particolare: il grattare col dito funziona davvero (il mouse su desktop non è una prova), le foto non sono ruotate, nulla scrolla in orizzontale, il testo è leggibile alla luce.

- [ ] **Step 7: Commit finale**

```bash
git add -A
git commit -m "feat: schermata finale con rivelazione del totale"
```

---

## Verifica finale

Prima di mandare il link, controllare tutto questo:

- [ ] `npm test` verde, incluse le 10.000 simulazioni
- [ ] Una sessione giocata per intero sul telefono chiude a **57€**
- [ ] Una seconda sessione, giocata con ordine diverso, chiude anch'essa a 57€
- [ ] Il codice "Piuccia" entra; qualunque altra parola no
- [ ] Ricaricando a metà sessione lo stato si conserva
- [ ] Il reset a cinque tap funziona (serve per azzerare dopo le prove)
- [ ] **Azzerare la sessione di prova prima di mandare il link**
- [ ] Le cartelle `Photos-1-001*` non sono nel repo: `git ls-files | grep -c Photos` deve dare `0`
