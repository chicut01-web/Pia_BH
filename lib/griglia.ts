import { IMPORTI } from "./config";
import type { Esito } from "./engine";
import { creaRng } from "./rng";

/** Valore mostrato in una casella: un importo in euro, oppure "RIGIOCA" per il biglietto gratis. */
export type Casella = number | "RIGIOCA";

/**
 * Costruisce la griglia di un gratta e vinci A RITROSO, a partire dall'esito già deciso dal
 * motore (`lib/engine.ts`). Il gioco non decide nulla: riceve il verdetto e lo mette in scena.
 * Non chiamare mai questa funzione per "capire" se si è vinto — è l'esatto contrario: prende
 * l'esito come dato e ci costruisce intorno una griglia coerente.
 *
 * Regole:
 * - Vincita in denaro (`esito.vinta`): esattamente 3 caselle con `esito.importo`, in posizioni
 *   casuali. Nessun altro valore raggiunge il tris.
 * - Rigioca (`esito.rigioca`, biglietto gratis): esattamente 3 caselle "RIGIOCA", stessa regola.
 * - Perdita: nessun valore compare 3 volte. Una coppia (il "quasi") è voluta — crea tensione —
 *   ma mai un terzo uguale.
 *
 * I riempitivi (i valori diversi da quello vincente) compaiono al massimo 2 volte ciascuno: è
 * quello che garantisce, per costruzione, che "nessun altro valore fa tris" valga sempre, senza
 * doverlo verificare a parte.
 */
export function costruisciGriglia(esito: Esito, n: number, seed: number): Casella[] {
  const rng = creaRng(seed);
  const celle: Casella[] = new Array(n).fill(0);

  // Permutazione delle posizioni (Fisher-Yates): decide DOVE cadono le caselle "importanti"
  // (vincita/rigioca/quasi), non se compaiono.
  const posizioni = [...Array(n).keys()];
  for (let i = posizioni.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [posizioni[i], posizioni[j]] = [posizioni[j], posizioni[i]];
  }

  const usi = new Map<Casella, number>();
  let idx = 0;
  const posiziona = (v: Casella) => {
    celle[posizioni[idx++]] = v;
    usi.set(v, (usi.get(v) ?? 0) + 1);
  };

  const vincente: Casella = esito.rigioca ? "RIGIOCA" : esito.importo;

  if (esito.rigioca) {
    posiziona("RIGIOCA");
    posiziona("RIGIOCA");
    posiziona("RIGIOCA");
  } else if (esito.vinta) {
    posiziona(esito.importo);
    posiziona(esito.importo);
    posiziona(esito.importo);
  } else {
    // Il "quasi": una coppia uguale piazzata di proposito, mai un tris.
    const quasi = IMPORTI[Math.floor(rng() * IMPORTI.length)];
    posiziona(quasi);
    posiziona(quasi);
  }

  // Riempitivi: importi ammessi diversi dal valore vincente, usati al massimo due volte ciascuno.
  const riempitivi: Casella[] = IMPORTI.filter((i) => i !== vincente);
  while (idx < n) {
    const disponibili = riempitivi.filter((v) => (usi.get(v) ?? 0) < 2);
    posiziona(disponibili[Math.floor(rng() * disponibili.length)]);
  }

  return celle;
}
