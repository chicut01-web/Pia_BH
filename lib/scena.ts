/** Messa in scena di slot e ruota.
 *
 *  Nessuna di queste funzioni decide alcunché: ricevono un `Esito` già deciso dal motore e
 *  costruiscono a ritroso ciò che deve apparire sullo schermo. Vivono qui e non dentro i
 *  componenti perché sono pura logica, e perché così i test le coprono davvero (la suite gira
 *  solo su `lib/`).
 */
import { IMPORTI } from "./config";
import type { Esito } from "./engine";
import { creaRng } from "./rng";

// ---------------------------------------------------------------- slot

/** I simboli dei rulli: quasi tutti sono loro due. Il primo è lei da sola — tre facce di
 *  Piuccia sono il jackpot. Il KitKat resta perché è il soprannome di lui. */
export const SIMBOLI_SLOT = [
  "/assets/img/sym-pia.webp",
  "/assets/img/sym-noi1.webp",
  "/assets/img/sym-noi2.webp",
  "/assets/img/sym-noi3.webp",
  "/assets/img/sym-noi4.webp",
  "/assets/img/sym-kitkat.webp",
];

/** Un rullo mostra un simbolo (indice) oppure il biglietto gratis, che non è un simbolo. */
export type Faccia = number | "RIGIOCA";

/** Le tre facce finali dei rulli.
 *  Vincita in denaro e biglietto gratis sono entrambi un tris; la perdita non lo è mai — al
 *  massimo due uguali, che è il quasi-vinto da cui nasce la tensione. */
export function facceFinali(esito: Esito, seed: number): Faccia[] {
  const h = Math.imul(seed ^ 0x85ebca6b, 0xc2b2ae35) >>> 0;
  const rng = creaRng(h);

  if (esito.rigioca) return ["RIGIOCA", "RIGIOCA", "RIGIOCA"];

  if (esito.vinta) {
    const s = Math.floor(rng() * SIMBOLI_SLOT.length);
    return [s, s, s];
  }

  // Perdita: il secondo rullo ripete il primo circa una volta su due — è il quasi-vinto.
  const a = Math.floor(rng() * SIMBOLI_SLOT.length);
  const b =
    rng() < 0.5 ? a : (a + 1 + Math.floor(rng() * (SIMBOLI_SLOT.length - 1))) % SIMBOLI_SLOT.length;

  // Il tris può nascere solo se i primi due coincidono: in quel caso, e solo in quello, il
  // terzo rullo deve evitare quel simbolo. Se a e b sono già diversi, qualsiasi terzo va bene.
  const vietato = a === b ? a : -1;
  const candidati = [...Array(SIMBOLI_SLOT.length).keys()].filter((s) => s !== vietato);
  const c = candidati[Math.floor(rng() * candidati.length)];
  return [a, b, c];
}

// --------------------------------------------------------------- ruota

export const SPICCHI = 8;
export const PASSO = 360 / SPICCHI;

/** Spicchi fissi: due "Ritenta" e un "RIGIOCA". Gli altri cinque portano importi. */
export const INDICI_RITENTA = [2, 6];
export const INDICE_RIGIOCA = 4;
const INDICI_PREMIO = [0, 1, 3, 5, 7];

/** Giri completi prima di iniziare a frenare. */
const GIRI = 5;

export type Etichetta = number | "Ritenta" | "RIGIOCA";

/** Angolo del centro dello spicchio `i`, in gradi orari a partire da mezzogiorno.
 *
 *  Una sola definizione, usata sia per disporre le etichette sia per calcolare dove fermarsi.
 *  Se fossero due formule separate potrebbero divergere di mezzo spicchio, e la freccia
 *  indicherebbe un premio diverso da quello annunciato. */
export function centroSpicchio(i: number): number {
  return i * PASSO + PASSO / 2;
}

/** Etichette della ruota e angolo di arresto, costruiti a ritroso dall'esito. */
export function costruisciRuota(
  esito: Esito,
  seed: number,
): { etichette: Etichetta[]; bersaglio: number; angolo: number } {
  const h = Math.imul(seed ^ 0x85ebca6b, 0xc2b2ae35) >>> 0;
  const rng = creaRng(h);

  const etichette: Etichetta[] = [];
  for (let i = 0; i < SPICCHI; i++) {
    if (INDICI_RITENTA.includes(i)) etichette.push("Ritenta");
    else if (i === INDICE_RIGIOCA) etichette.push("RIGIOCA");
    else etichette.push(IMPORTI[Math.floor(rng() * IMPORTI.length)]);
  }

  let bersaglio: number;
  if (esito.rigioca) {
    bersaglio = INDICE_RIGIOCA;
  } else if (esito.vinta) {
    bersaglio = INDICI_PREMIO[Math.floor(rng() * INDICI_PREMIO.length)];
    // Lo spicchio su cui si ferma deve mostrare esattamente la cifra annunciata.
    etichette[bersaglio] = esito.importo;
  } else {
    bersaglio = INDICI_RITENTA[Math.floor(rng() * INDICI_RITENTA.length)];
  }

  // Ruotando di θ in senso orario, il centro dello spicchio finisce a centro + θ. La freccia
  // sta a mezzogiorno (0°), quindi serve centro + θ ≡ 0 (mod 360), cioè θ = 360·giri − centro.
  const angolo = 360 * GIRI - centroSpicchio(bersaglio);

  return { etichette, bersaglio, angolo };
}
