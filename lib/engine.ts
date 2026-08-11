import {
  BUDGET_INIZIALE,
  COSTI,
  COSTO_MINIMO,
  IMPORTI,
  SOGLIA_GROSSA,
  TARGET_EUR,
} from "./config";
import type { GiocoId } from "./config";
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
  /** true quando la giocata è un "RIGIOCA — biglietto gratis": costo rimborsato, nessun
   *  addebito sul target, la serie di perdite si azzera. Non è una vincita (`vinta` resta
   *  false) e non è una perdita vera: è il proprio stato, l'UI la mostra separatamente. */
  rigioca: boolean;
  stato: Stato;
  /** false solo quando la giocata non è stata eseguita (piuccine insufficienti):
   *  nessun addebito, nessuna vincita/perdita reale, stato invariato. */
  eseguita: boolean;
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
 *  vincita grossa — poi si appiattisce, ma resta sotto 1: la chiusura esatta a budget esaurito
 *  non viene da questa curva, la garantisce solo il ramo di chiusura forzata (`ultima`) in
 *  `gioca`, che paga qualunque residuo manchi. Non affidarsi a questa funzione per il vincolo dei 27€. */
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

/** Il costo del gioco più caro ancora acquistabile con `piuccine`. Usato per stimare per difetto
 *  quante giocate potrebbero ancora arrivare: chi compra solo il taglio più caro consuma le
 *  Piuccine più in fretta di chiunque altro, quindi è la stima più pessimistica (= il numero più
 *  basso) possibile, valida qualunque cosa il giocatore stia davvero comprando. */
function costoMaxAcquistabile(piuccine: number): number {
  return Math.max(...Object.values(COSTI).filter((c) => c <= piuccine));
}

/** Quante perdite di fila sono ammesse a questo punto della sessione.
 *  Soglia ridotta a 3..5 per garantire vincite/rigioca più frequenti e
 *  mantenere il gioco dinamico e gratificante. */
export function limitePerdite(piuccine: number): number {
  const giocateResidue = Math.floor(piuccine / COSTO_MINIMO);
  return Math.min(5, Math.max(3, Math.ceil(giocateResidue / 16)));
}

export function gioca(s: Stato, g: GiocoId): Esito {
  const costo = COSTI[g];
  if (s.piuccine < costo) {
    return { vinta: false, importo: 0, rigioca: false, stato: { ...s }, eseguita: false };
  }

  const rng = creaRng(s.seed);
  for (let i = 0; i < s.passiRng; i++) rng();
  let passi = s.passiRng;
  const estrai = () => {
    passi++;
    return rng();
  };

  const piuccineDopo = s.piuccine - costo;
  const ultima = sessioneFinita({ ...s, piuccine: piuccineDopo });
  const residuo = TARGET_EUR - s.vinto;

  let importo = 0;
  let rigioca = false;

  const progresso = 1 - piuccineDopo / BUDGET_INIZIALE;

  if (ultima) {
    // Chiusura forzata: qualunque cosa manchi, la paga questa giocata. Per costruzione non è
    // mai raggiunta dal ramo rigioca qui sotto (è un else if successivo): il biglietto gratis
    // non può mai "disfare" la fine della sessione.
    importo = residuo;
  } else if (s.giocate < 3) {
    // Deve capire subito che si può perdere.
    importo = 0;
  } else if (s.vinciteConsecutive >= 2) {
    // Tre vincite di fila non succedono mai davvero.
    importo = 0;
  } else if (s.perditeConsecutive >= limitePerdite(s.piuccine)) {
    // Troppe perdite di fila diventano frustranti: si concede un RIGIOCA, non una briciola in
    // euro. Nei gratta e vinci veri è il "biglietto omaggio" dopo una serie di secche — rompe la
    // serie senza toccare il montepremi. Costo rimborsato (piuccine invariate), nessun addebito
    // sul target (vinto invariato), la serie si azzera. Non tocca il budget dei 27€, quindi non
    // serve più nessuna riserva per "gli obblighi futuri" negli altri rami: quella era la fonte
    // del problema (vedi report), ed è sparita insieme al meccanismo che la richiedeva.
    rigioca = true;
  } else if (!s.grossaErogata && progresso >= 0.2 && residuo >= SOGLIA_GROSSA + 2) {
    // Il colpo grosso, una volta sola, a metà sessione. Non emerge da solo: se la sessione
    // è fatta di tante giocate piccole, il gap viene consumato prima di arrivare alla soglia
    // e la vincita grossa non arriverebbe mai. Va forzata dentro una finestra che si apre presto
    // (progresso >= 0.2): a quel punto il residuo è quasi sempre ancora quasi intero, quindi il
    // gate scatta sulla primissima giocata utile, deterministicamente (nessun tiro di dado qui).
    // Il tetto lascia da parte solo 1€: è il margine minimo che garantisce che il residuo non
    // tocchi mai esattamente 0 su una giocata non finale (vedi il vincolo "vinto < 27 fino
    // all'ultima" più sotto).
    //
    // Si parte esattamente da SOGLIA_GROSSA (8), non da SOGLIA_GROSSA + 1 come nel rescale
    // precedente: lì serviva il +1 perché SOGLIA_GROSSA (15) era essa stessa un multiplo di 5,
    // quindi mai un importo ammesso — partire da 15 avrebbe fatto arrotondare per difetto a 14
    // (equidistante da 14 e 16, importoAmmesso tiene il più basso), sotto soglia, senza mai
    // marcare grossaErogata. Qui SOGLIA_GROSSA=8 non è multiplo di 5 ed è essa stessa un importo
    // ammesso: `importoAmmesso(8, tetto)` la trova a distanza zero, nessuna ambiguità di
    // arrotondamento è possibile. Il gate residuo >= SOGLIA_GROSSA + 2 garantisce comunque che il
    // tetto (residuo - 1) sia sempre >= 9 = SOGLIA_GROSSA + 1, l'importo ammesso più piccolo sopra
    // soglia, quindi un importo >= soglia è sempre raggiungibile indipendentemente da questo.
    //
    // Lo spread (* 4, invece di * 8) è stato ridotto per tenere la quota del colpo grosso sul
    // premio totale comparabile alla vecchia proporzione. Alla vecchia scala il colpo grosso
    // pescava in [16,23] su un target di 57€: 28.1%-40.4%. Tenendo lo spread * 8 qui (range
    // [8,15], o [9,16] partendo da +1) il tetto naturale di IMPORTI (12, dato che a questa scala
    // IMPORTI arriva solo a 12) avrebbe forzato la maggioranza (50%+) dei tiri a "arrotondare
    // verso l'alto fino a 12" — un colpo grosso quasi sempre della STESSA cifra (12/27 = 44.4%,
    // ripetuta ~62% delle sessioni), più alto e meno vario della vecchia proporzione. Con
    // `Math.floor(estrai() * 4)`, il range grezzo è [8,11]: gli importi 8 e 11 sono ammessi
    // direttamente, 9 è ammesso, 10 (multiplo di 5) arrotonda a 9 (equidistante da 9 e 11, vince
    // il più basso — non un problema qui perché 9 resta comunque >= SOGLIA_GROSSA). L'importo
    // erogato risulta quindi in {8, 9, 11}: 29.6%-40.7% del target, la stessa fascia della vecchia
    // proporzione (28.1%-40.4%), con più varietà del singolo valore che lo spread * 8 avrebbe
    // prodotto quasi sempre.
    const desiderato = SOGLIA_GROSSA + Math.floor(estrai() * 4);
    const tetto = residuo - 1;
    importo = importoAmmesso(desiderato, tetto);
  } else {
    // Ramo ordinario: insegue il gap fra "quanto dovrebbe già valere vinto a questo punto della
    // curva" e quanto vale davvero, con probabilità e importo proporzionali al gap. Senza più
    // una briciola con cui condividere il budget, questo ramo (più il colpo grosso) è l'unica
    // cosa che spende i 27€: ha tutto lo spazio che prima gli veniva sottratto dalla riserva.
    const gap = TARGET_EUR * curva(progresso) - s.vinto;

    if (gap >= 1) {
      // Valvola di sicurezza: quando le giocate che potrebbero ancora arrivare (nel caso
      // peggiore — vedi costoMaxAcquistabile) non bastano più a smaltire il gap residuo pagando
      // il massimo consentito (SOGLIA_GROSSA - 1) a ogni giocata, la probabilità sale a
      // certezza. Non è "vicino alla fine in assoluto": è "vicino alla fine RISPETTO A QUANTO
      // MANCA", quindi non dipende dal taglio comprato. Una stima basata su COSTO_MINIMO (chi
      // gioca sempre il taglio più caro — gratta5, costo 5 — spende 5 unità da COSTO_MINIMO(1) a
      // giocata, non 1: quella stima sovrastimava le giocate residue e la valvola non si apriva
      // mai in tempo) e un confronto contro limitePerdite (un conteggio fisso di giocate,
      // indipendente da quanto gap resta davvero: per chi gioca sempre il taglio economico si
      // apriva anche con un gap minuscolo, spendendo il budget troppo presto) avevano ciascuno un
      // lato cieco — vedi il report. costoMaxAcquistabile(piuccineDopo) dà la stima più
      // pessimistica possibile delle giocate residue (valida per qualunque strategia, non solo
      // per chi compra sempre il più caro); vinciteNecessarie è denominato nel gap, non nel
      // prezzo del biglietto, quindi la soglia si adatta a quanto resta davvero da chiudere
      // invece che a un conteggio fisso di giocate. Nessuna delle due righe seguenti dipende da
      // un valore assoluto di scala: entrambe sono già espresse relativamente a SOGLIA_GROSSA e
      // COSTI, quindi si auto-riscalano col resto della configurazione.
      const giocateResiduePess = Math.max(1, Math.floor(piuccineDopo / costoMaxAcquistabile(piuccineDopo)));
      const vinciteNecessarie = Math.ceil(gap / (SOGLIA_GROSSA - 1));
      const inCoda = giocateResiduePess <= vinciteNecessarie;
      // gap/4 (era gap/8): gap è denominato in euro, quindi scala con TARGET_EUR. Il divisore va
      // riscalato nella stessa proporzione di TARGET_EUR (57 -> 27, fattore ~0.474) per mantenere
      // gli stessi due punti di transizione come FRAZIONE del target: il pavimento 0.2 scattava a
      // gap=1.6 (2.8% di 57€), ora a gap=0.8 (3.0% di 27€); il tetto 0.75 scattava a gap=6 (10.5%
      // di 57€), ora a gap=3 (11.1% di 27€) — 8 * (27/57) = 3.79, arrotondato a 4 per lo stesso
      // ordine di grandezza (3.79 vs 4 sposta i due punti di transizione di meno di un decimo di
      // punto percentuale, verificato sopra).
      const probabilita = inCoda ? 1 : Math.min(0.85, Math.max(0.35, gap / 3));
      if (estrai() < probabilita) {
        // Fuori dalla finestra del colpo grosso nessuna vincita raggiunge la soglia: il tetto
        // resta sotto SOGLIA_GROSSA. In condizioni normali si erogano vincite contenute (1-4€);
        // in coda si adegua la quota per non lasciare un residuo alto all'ultima giocata.
        const quota = inCoda ? 0.5 + estrai() * 0.4 : 0.2 + estrai() * 0.3;
        const desiderato = gap * quota;
        const riservaGrossa = s.grossaErogata ? 0 : SOGLIA_GROSSA;
        const tetto = Math.min(SOGLIA_GROSSA - 1, residuo - riservaGrossa - 1);
        importo = importoAmmesso(desiderato, tetto);
      }
    }
  }

  const vinta = importo > 0;
  return {
    vinta,
    importo,
    rigioca,
    eseguita: true,
    stato: rigioca
      ? {
          // Biglietto gratis: costo rimborsato, target invariato, serie di perdite azzerata.
          piuccine: s.piuccine,
          vinto: s.vinto,
          giocate: s.giocate + 1,
          perditeConsecutive: 0,
          vinciteConsecutive: s.vinciteConsecutive,
          grossaErogata: s.grossaErogata,
          seed: s.seed,
          passiRng: passi,
        }
      : {
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
