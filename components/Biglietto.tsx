"use client";

import type { ReactNode } from "react";

type Taglio = "gratta2" | "gratta3" | "gratta5";

const CONFIG_TEMI: Record<
  Taglio,
  {
    titolo: string;
    subtitolo: string;
    costo: number;
    maxPremio: string;
    sfondoHeader: string;
    bordoHeader: string;
    bgCarta: string;
    accentoOro: string;
    badgeColore: string;
    immagineSfondo: string;
  }
> = {
  gratta2: {
    titolo: "PIUCCIA D'ORO",
    subtitolo: "Edizione Gran Lusso",
    costo: 2,
    maxPremio: "Vinci fino a 50 Piuccine!",
    sfondoHeader: "from-[#2b0808] via-[#4d0c13] to-[#1a0405]",
    bordoHeader: "border-amber-400/80",
    bgCarta: "from-[#3a0d14] via-[#24080d] to-[#140306]",
    accentoOro: "from-amber-200 via-amber-400 to-amber-600",
    badgeColore: "bg-amber-400 text-black",
    immagineSfondo: "/assets/img/gratta2_real.jpg",
  },
  gratta3: {
    titolo: "KITKAT FORTUNATO",
    subtitolo: "Premio Goloso & Oro",
    costo: 3,
    maxPremio: "Vinci fino a 80 Piuccine!",
    sfondoHeader: "from-[#3b0816] via-[#610a22] to-[#24040d]",
    bordoHeader: "border-yellow-300/80",
    bgCarta: "from-[#420a1a] via-[#2d0611] to-[#170308]",
    accentoOro: "from-yellow-200 via-yellow-400 to-amber-500",
    badgeColore: "bg-yellow-400 text-red-950",
    immagineSfondo: "/assets/img/gratta3_real.jpg",
  },
  gratta5: {
    titolo: "VACANZA MISTERIOSA",
    subtitolo: "Smeraldo & Diamanti",
    costo: 5,
    maxPremio: "Vinci fino a 100 Piuccine!",
    sfondoHeader: "from-[#042828] via-[#084242] to-[#021818]",
    bordoHeader: "border-emerald-300/80",
    bgCarta: "from-[#063333] via-[#042222] to-[#011212]",
    accentoOro: "from-emerald-200 via-teal-300 to-amber-400",
    badgeColore: "bg-emerald-400 text-teal-950",
    immagineSfondo: "/assets/img/gratta5_real.jpg",
  },
};

export default function Biglietto({
  taglio,
  children,
}: {
  taglio: Taglio;
  children: ReactNode;
}) {
  const t = CONFIG_TEMI[taglio];

  return (
    <div className="touch-pan-y relative w-full max-w-[21.5rem] overflow-hidden rounded-[20px] bordo-laminato bg-[#120918] p-1.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)]">
      {/* Sfondo laminato o fotorealistico del biglietto */}
      <div className={`relative overflow-hidden rounded-[16px] bg-gradient-to-b ${t.bgCarta} p-3.5 border border-amber-500/30`}>
        {/* Pattern filigrana di sicurezza sul biglietto */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

        {/* 1. TESTATA UFFICIALE LOTTERIE ADM / MONOPOLI */}
        <div className="relative z-10 flex items-center justify-between border-b border-amber-500/30 pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-black shadow-sm">
              ★
            </div>
            <div className="flex flex-col">
              <span className="text-[7.5px] font-black uppercase tracking-[0.22em] text-amber-200/90">
                MONOPOLI DI STATO
              </span>
              <span className="text-[6.5px] font-bold uppercase tracking-[0.18em] text-white/50">
                REGOLAMENTO UFFICIALE ADM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 border border-amber-400/40">
            <span className="text-[9px]">🎟️</span>
            <span className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-amber-300">
              GRATTA E VINCI
            </span>
          </div>
        </div>

        {/* 2. TITOLO E PREZZO LAMINATO ORO */}
        <div className={`relative z-10 flex items-stretch overflow-hidden rounded-xl bg-gradient-to-r ${t.sfondoHeader} border ${t.bordoHeader} p-2.5 shadow-lg mb-3`}>
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.25em] text-amber-300">
              <span>✨</span> {t.subtitolo}
            </div>
            <h2 className="font-[family-name:var(--font-titolo)] text-[22px] leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {t.titolo}
            </h2>
            <p className="mt-0.5 text-[9px] font-bold tracking-wide text-amber-200/90">
              {t.maxPremio}
            </p>
          </div>

          {/* Medaglione Prezzo del biglietto */}
          <div className="foglia-oro flex w-[62px] shrink-0 flex-col items-center justify-center rounded-lg border border-black/30 text-[#2b0808] shadow-md">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] opacity-80">
              COSTO
            </span>
            <span className="font-[family-name:var(--font-titolo)] text-[24px] leading-none">
              {t.costo}
            </span>
            <span className="text-[7.5px] font-black uppercase tracking-[0.14em]">
              Piuccine
            </span>
          </div>
        </div>

        {/* 3. ISTRUZIONI DI GIOCO */}
        <div className="relative z-10 mb-2 flex items-center justify-between rounded-lg bg-black/40 px-3 py-1.5 border border-amber-500/20 text-[8.5px] font-extrabold uppercase tracking-[0.15em] text-amber-200/90">
          <span>TROVA 3 IMPORTI UGUALI PER VINCERE!</span>
          <span className="text-amber-400">🪙</span>
        </div>

        {/* 4. AREA DI GIOCO SCRATCH (GRIGLIA + CANVAS) */}
        <div className="relative z-10 my-2">{children}</div>

        {/* 5. PIÈ DI PAGINA REALE CON CODICE A BARRE E VALIDAZIONE */}
        <div className="relative z-10 mt-3 pt-2 border-t border-amber-500/20">
          <div className="flex items-end justify-between gap-2">
            {/* Codice a barre realistico */}
            <div className="flex flex-col items-start">
              <div className="flex h-5 items-center gap-[1.5px] rounded bg-white px-1.5 py-0.5">
                {[3,1,2,4,1,3,2,1,4,2,1,3,1,2,3,1,4,2,1,2,3,1].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 bg-black"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <span className="mt-0.5 text-[6.5px] font-mono tracking-wider text-white/50">
                SERIE 2026 · 0482910-VIP
              </span>
            </div>

            {/* Riquadro di validazione ricevitore */}
            <div className="flex flex-col items-end text-right">
              <div className="rounded border border-dashed border-amber-400/40 bg-black/50 px-2 py-0.5 text-[6.5px] font-bold uppercase tracking-wider text-amber-300/80">
                VALIDAZIONE RICEVITORE
              </div>
              <span className="mt-0.5 text-[6px] text-white/40">
                NON GRATTARE QUI
              </span>
            </div>
          </div>

          <p className="mt-1.5 text-center text-[6px] font-medium uppercase tracking-widest text-white/30">
            Il gioco è riservato ai maggiorenni. Regolamento ufficiale e tassi di vincita su ADM.gov.it
          </p>
        </div>
      </div>
    </div>
  );
}
