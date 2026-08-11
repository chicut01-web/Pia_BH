"use client";

import { useEffect, useState } from "react";
import type { GiocoId } from "@/lib/config";
import { gioca, puoGiocare, sessioneFinita, Stato, statoIniziale } from "@/lib/engine";
import type { Esito } from "@/lib/engine";
import { azzera, carica, salva } from "@/lib/storage";
import Gate from "@/components/Gate";
import Intro from "@/components/Intro";
import Hub from "@/components/Hub";
import Gratta from "@/components/Gratta";
import Slot from "@/components/Slot";
import Ruota from "@/components/Ruota";
import Finale from "@/components/Finale";

export type Schermata =
  | "gate" | "intro" | "hub"
  | "gratta2" | "gratta3" | "gratta5"
  | "slot" | "ruota" | "finale";

export default function Pagina() {
  const [pronto, setPronto] = useState(false);
  const [stato, setStato] = useState<Stato>(() => {
    const s = carica();
    return s ? s.stato : statoIniziale();
  });
  const [sbloccato, setSbloccato] = useState<boolean>(() => {
    const s = carica();
    return s ? s.sbloccato : false;
  });
  const [introVista, setIntroVista] = useState<boolean>(() => {
    const s = carica();
    return s ? s.introVista : false;
  });
  const [schermata, setSchermata] = useState<Schermata>("gate");
  const [esito, setEsito] = useState<Esito | null>(null);

  // Marca il client come pronto per evitare eventuali discrepanze da SSR.
  useEffect(() => {
    queueMicrotask(() => {
      setPronto(true);
    });
  }, []);

  useEffect(() => {
    if (pronto) salva({ stato, sbloccato, introVista });
  }, [pronto, stato, sbloccato, introVista]);

  // Calcola la schermata attiva in base alle condizioni Correnti.
  let schermataAttiva: Schermata = schermata;
  if (!sbloccato) schermataAttiva = "gate";
  else if (!introVista) schermataAttiva = "intro";
  else if (sessioneFinita(stato)) schermataAttiva = "finale";
  else if (schermata === "gate" || schermata === "intro") schermataAttiva = "hub";

  function reset() {
    azzera();
    setStato(statoIniziale());
    setSbloccato(false);
    setIntroVista(false);
    setSchermata("gate");
  }

  // Decide subito l'esito (il motore non aspetta l'animazione) ma NON tocca ancora `stato`:
  // quello resta com'era finché la giocata non si chiude. Così, se lei chiude la pagina a metà
  // grattata, la giocata non risulta consumata e riparte pulita al prossimo avvio.
  function avvia(g: GiocoId) {
    const e = gioca(stato, g);
    setEsito(e);
    setSchermata(g);
  }

  // Solo qui lo stato del motore viene commesso davvero.
  function chiudiGiocata() {
    if (esito) setStato(esito.stato);
    setEsito(null);
    setSchermata("hub");
  }

  /** Ricompra lo stesso gioco senza passare dalla tabaccheria.
   *
   *  Commette la giocata appena finita e ne apre subito un'altra a partire dallo stato nuovo —
   *  mai da quello vecchio, o le Piuccine non verrebbero scalate. Se dopo questa giocata la
   *  sessione è finita, o non le bastano più le Piuccine per lo stesso gioco, si torna
   *  all'hub: sarà lui a mandarla al finale o a mostrarle cosa può ancora permettersi. */
  function rigiocaStesso(g: GiocoId) {
    if (!esito) return;
    const dopo = esito.stato;

    if (sessioneFinita(dopo) || !puoGiocare(dopo, g)) {
      setStato(dopo);
      setEsito(null);
      setSchermata("hub");
      return;
    }

    setStato(dopo);
    setEsito(gioca(dopo, g));
    setSchermata(g);
  }

  if (!pronto) return null;

  if (schermataAttiva === "gate") return <Gate onSblocco={() => setSbloccato(true)} />;
  if (schermataAttiva === "intro") return <Intro onAvanti={() => setIntroVista(true)} />;
  if (schermataAttiva === "hub") return <Hub stato={stato} onGioco={avvia} onReset={reset} />;

  if (esito && (schermataAttiva === "gratta2" || schermataAttiva === "gratta3" || schermataAttiva === "gratta5"))
    return (
      <Gratta
        key={esito.stato.giocate}
        taglio={schermataAttiva}
        esito={esito}
        onFine={chiudiGiocata}
        onAncora={() => rigiocaStesso(schermataAttiva as GiocoId)}
      />
    );

  if (esito && schermataAttiva === "slot")
    return <Slot key={esito.stato.giocate} esito={esito} onFine={chiudiGiocata} onAncora={() => rigiocaStesso("slot")} />;
  if (esito && schermataAttiva === "ruota")
    return <Ruota key={esito.stato.giocate} esito={esito} onFine={chiudiGiocata} onAncora={() => rigiocaStesso("ruota")} />;

  if (schermataAttiva === "finale") return <Finale stato={stato} />;

  // Rete di sicurezza: qualunque combinazione imprevista di stato e schermata la riporta in
  // tabaccheria invece di mostrarle una pagina rotta. Non dovrebbe mai servire — ogni schermata
  // ha il suo ramo qui sopra — ma se servisse, deve fallire in modo invisibile.
  return <Hub stato={stato} onGioco={avvia} onReset={reset} />;
}
