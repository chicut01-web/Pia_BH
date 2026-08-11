import { describe, expect, it } from "vitest";
import { IMPORTI } from "./config";
import type { Esito } from "./engine";
import { gioca, giochiDisponibili, sessioneFinita, statoIniziale } from "./engine";
import { creaRng } from "./rng";
import {
  centroSpicchio,
  costruisciRuota,
  facceFinali,
  INDICE_RIGIOCA,
  INDICI_RITENTA,
  PASSO,
  SIMBOLI_SLOT,
  SPICCHI,
} from "./scena";

/** Esiti finti, per coprire i tre casi senza dipendere da quali seed li producono. */
function esitoFinto(kind: "vinta" | "persa" | "rigioca", importo = 7): Esito {
  const stato = statoIniziale(1);
  return {
    vinta: kind === "vinta",
    importo: kind === "vinta" ? importo : 0,
    rigioca: kind === "rigioca",
    eseguita: true,
    stato,
  };
}

/** Tutti gli esiti che il motore produce davvero, raccolti da sessioni vere: così gli
 *  invarianti non sono provati solo su esiti costruiti a mano. */
function esitiReali(quanti: number): Esito[] {
  const out: Esito[] = [];
  for (let seed = 1; out.length < quanti && seed <= 2000; seed++) {
    let s = statoIniziale(seed);
    const scelta = creaRng(seed ^ 0x1234);
    while (!sessioneFinita(s) && out.length < quanti) {
      const d = giochiDisponibili(s);
      const e = gioca(s, d[Math.floor(scelta() * d.length)]);
      out.push(e);
      s = e.stato;
    }
  }
  return out;
}

describe("slot — messa in scena", () => {
  it("una vincita in denaro mostra sempre tre simboli uguali", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const f = facceFinali(esitoFinto("vinta"), seed);
      expect(f[0]).toBe(f[1]);
      expect(f[1]).toBe(f[2]);
      expect(typeof f[0]).toBe("number");
    }
  });

  it("il biglietto gratis mostra tre RIGIOCA, mai un simbolo", () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(facceFinali(esitoFinto("rigioca"), seed)).toEqual(["RIGIOCA", "RIGIOCA", "RIGIOCA"]);
    }
  });

  it("una perdita non mostra MAI tre simboli uguali", () => {
    for (let seed = 1; seed <= 5000; seed++) {
      const [a, b, c] = facceFinali(esitoFinto("persa"), seed);
      expect(a === b && b === c).toBe(false);
    }
  });

  it("una perdita produce comunque spesso un quasi-vinto (due uguali)", () => {
    let quasi = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const [a, b, c] = facceFinali(esitoFinto("persa"), seed);
      if (a === b || b === c || a === c) quasi++;
    }
    // Il secondo rullo ripete il primo circa una volta su due: senza tensione il gioco è piatto.
    expect(quasi).toBeGreaterThan(300);
  });

  it("gli indici dei simboli sono sempre dentro l'elenco", () => {
    for (let seed = 1; seed <= 500; seed++) {
      for (const kind of ["vinta", "persa"] as const) {
        for (const f of facceFinali(esitoFinto(kind), seed)) {
          expect(typeof f).toBe("number");
          expect(f as number).toBeGreaterThanOrEqual(0);
          expect(f as number).toBeLessThan(SIMBOLI_SLOT.length);
        }
      }
    }
  });

  it("regge tutti gli esiti che il motore produce davvero", () => {
    for (const e of esitiReali(1500)) {
      const [a, b, c] = facceFinali(e, e.stato.passiRng + 1);
      if (e.rigioca) expect([a, b, c]).toEqual(["RIGIOCA", "RIGIOCA", "RIGIOCA"]);
      else if (e.vinta) expect(a === b && b === c).toBe(true);
      else expect(a === b && b === c).toBe(false);
    }
  });
});

describe("ruota — messa in scena", () => {
  it("su vincita si ferma su uno spicchio che mostra proprio quella cifra", () => {
    for (let seed = 1; seed <= 500; seed++) {
      for (const importo of IMPORTI) {
        const { etichette, bersaglio } = costruisciRuota(esitoFinto("vinta", importo), seed);
        expect(etichette[bersaglio]).toBe(importo);
      }
    }
  });

  it("su perdita si ferma su un Ritenta", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const { etichette, bersaglio } = costruisciRuota(esitoFinto("persa"), seed);
      expect(etichette[bersaglio]).toBe("Ritenta");
      expect(INDICI_RITENTA).toContain(bersaglio);
    }
  });

  it("sul biglietto gratis si ferma sullo spicchio RIGIOCA", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const { etichette, bersaglio } = costruisciRuota(esitoFinto("rigioca"), seed);
      expect(bersaglio).toBe(INDICE_RIGIOCA);
      expect(etichette[bersaglio]).toBe("RIGIOCA");
    }
  });

  it("la ruota ha sempre 8 spicchi, due Ritenta e un RIGIOCA", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { etichette } = costruisciRuota(esitoFinto("persa"), seed);
      expect(etichette).toHaveLength(SPICCHI);
      expect(etichette.filter((e) => e === "Ritenta")).toHaveLength(2);
      expect(etichette.filter((e) => e === "RIGIOCA")).toHaveLength(1);
    }
  });

  it("l'angolo di arresto porta davvero il bersaglio sotto la freccia", () => {
    // Dopo la rotazione il centro dello spicchio deve trovarsi a mezzogiorno: è l'invariante
    // che impedisce alla freccia di indicare un premio diverso da quello annunciato.
    for (let seed = 1; seed <= 300; seed++) {
      for (const kind of ["vinta", "persa", "rigioca"] as const) {
        const { bersaglio, angolo } = costruisciRuota(esitoFinto(kind), seed);
        const posizioneFinale = (centroSpicchio(bersaglio) + angolo) % 360;
        expect(posizioneFinale).toBeCloseTo(0, 6);
      }
    }
  });

  it("l'arresto cade sempre dentro il proprio spicchio, non a cavallo del bordo", () => {
    for (let i = 0; i < SPICCHI; i++) {
      const centro = centroSpicchio(i);
      expect(centro).toBeGreaterThan(i * PASSO);
      expect(centro).toBeLessThan((i + 1) * PASSO);
    }
  });

  it("regge tutti gli esiti che il motore produce davvero", () => {
    for (const e of esitiReali(1500)) {
      const { etichette, bersaglio } = costruisciRuota(e, e.stato.passiRng + 2);
      if (e.rigioca) expect(etichette[bersaglio]).toBe("RIGIOCA");
      else if (e.vinta) expect(etichette[bersaglio]).toBe(e.importo);
      else expect(etichette[bersaglio]).toBe("Ritenta");
    }
  });
});
