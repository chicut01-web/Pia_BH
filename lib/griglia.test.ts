import { describe, expect, it } from "vitest";
import { CASELLE, IMPORTI } from "./config";
import { gioca, giochiDisponibili, sessioneFinita, statoIniziale } from "./engine";
import type { Esito } from "./engine";
import { costruisciGriglia } from "./griglia";
import type { Casella } from "./griglia";

const TAGLI: Array<"gratta2" | "gratta3" | "gratta5"> = ["gratta2", "gratta3", "gratta5"];

function contaOccorrenze(celle: Casella[]): Map<Casella, number> {
  const m = new Map<Casella, number>();
  for (const c of celle) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

/** Gioca molte sessioni reali con il motore vero (senza mai chiamare `gioca` con un gioco non
 *  acquistabile) e raccoglie ogni esito ottenuto. Serve a procurare vincite, rigioca e perdite
 *  "vere" — con la stessa distribuzione con cui compaiono davvero in gioco — invece di
 *  costruire a mano pochi Esito finti ed eyeballarli. */
function raccogliEsiti(nSessioni: number): Esito[] {
  const out: Esito[] = [];
  for (let seed = 1; seed <= nSessioni; seed++) {
    let s = statoIniziale(seed);
    let guardia = 0;
    while (!sessioneFinita(s)) {
      if (guardia++ > 2000) throw new Error("sessione che non termina");
      const disponibili = giochiDisponibili(s);
      const e = gioca(s, disponibili[0]);
      out.push(e);
      s = e.stato;
    }
  }
  return out;
}

// 80 sessioni intere (fino a ~100 giocate reali l'una, più eventuali rigioca) danno un campione
// ampio e riproducibile: stesso seed, stessa sequenza di gioca(), stessi esiti a ogni run.
const ESITI = raccogliEsiti(80);
const VINTI = ESITI.filter((e) => e.vinta);
const RIGIOCA = ESITI.filter((e) => e.rigioca);
const PERSI = ESITI.filter((e) => !e.vinta && !e.rigioca);

describe("griglia — il campione copre tutti e tre gli esiti", () => {
  it("include vincite, rigioca e perdite", () => {
    expect(VINTI.length).toBeGreaterThan(0);
    expect(RIGIOCA.length).toBeGreaterThan(0);
    expect(PERSI.length).toBeGreaterThan(0);
  });
});

describe("griglia — vincita in denaro", () => {
  it("esattamente 3 caselle con l'importo vinto, nessun altro valore in tris, per ogni taglio", () => {
    for (const e of VINTI) {
      for (const taglio of TAGLI) {
        const n = CASELLE[taglio];
        const celle = costruisciGriglia(e, n, e.stato.passiRng);
        expect(celle.length).toBe(n);
        const occ = contaOccorrenze(celle);
        expect(occ.get(e.importo)).toBe(3);
        for (const [v, c] of occ) if (v !== e.importo) expect(c).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("griglia — rigioca (biglietto gratis)", () => {
  it("esattamente 3 caselle RIGIOCA, nessun altro valore in tris, per ogni taglio", () => {
    for (const e of RIGIOCA) {
      for (const taglio of TAGLI) {
        const n = CASELLE[taglio];
        const celle = costruisciGriglia(e, n, e.stato.passiRng);
        expect(celle.length).toBe(n);
        const occ = contaOccorrenze(celle);
        expect(occ.get("RIGIOCA")).toBe(3);
        for (const [v, c] of occ) if (v !== "RIGIOCA") expect(c).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("griglia — perdita", () => {
  it("nessun valore compare 3 volte, per ogni taglio", () => {
    for (const e of PERSI) {
      for (const taglio of TAGLI) {
        const n = CASELLE[taglio];
        const celle = costruisciGriglia(e, n, e.stato.passiRng);
        expect(celle.length).toBe(n);
        const occ = contaOccorrenze(celle);
        for (const c of occ.values()) expect(c).toBeLessThanOrEqual(2);
      }
    }
  });

  it("il \"quasi\" esiste davvero: almeno una coppia in quasi tutte le perdite", () => {
    // Non è un vincolo assoluto (in teoria il riempimento generico potrebbe non produrre mai
    // un doppione), ma la casella "quasi" forzata dentro costruisciGriglia lo garantisce sempre.
    let conCoppia = 0;
    for (const e of PERSI) {
      const celle = costruisciGriglia(e, CASELLE.gratta5, e.stato.passiRng);
      const occ = contaOccorrenze(celle);
      if ([...occ.values()].some((c) => c === 2)) conCoppia++;
    }
    expect(conCoppia).toBe(PERSI.length);
  });
});

describe("griglia — invarianti generali", () => {
  it("ogni casella è un importo ammesso oppure RIGIOCA, mai altro (es. 0, NaN, undefined)", () => {
    for (const e of ESITI) {
      for (const taglio of TAGLI) {
        const celle = costruisciGriglia(e, CASELLE[taglio], e.stato.passiRng);
        for (const v of celle) expect(v === "RIGIOCA" || IMPORTI.includes(v)).toBe(true);
      }
    }
  });

  it("è deterministico: stesso esito, stesso n e stesso seed producono sempre la stessa griglia", () => {
    for (const e of [VINTI[0], RIGIOCA[0], PERSI[0]]) {
      const a = costruisciGriglia(e, CASELLE.gratta5, e.stato.passiRng);
      const b = costruisciGriglia(e, CASELLE.gratta5, e.stato.passiRng);
      expect(a).toEqual(b);
    }
  });

  it("non muta l'oggetto esito passato", () => {
    const e = VINTI[0];
    const copia = JSON.parse(JSON.stringify(e));
    costruisciGriglia(e, CASELLE.gratta5, e.stato.passiRng);
    expect(e).toEqual(copia);
  });
});
