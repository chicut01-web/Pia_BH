"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { NOMI_GIOCHI } from "@/lib/config";
import type { Esito } from "@/lib/engine";
import { centroSpicchio, costruisciRuota, PASSO, SPICCHI } from "@/lib/scena";
import Esitino from "./Esitino";

export default function Ruota({ esito, onFine, onAncora }: { esito: Esito; onFine: () => void; onAncora: () => void }) {
  const { etichette, angolo } = useMemo(
    () => costruisciRuota(esito, esito.stato.passiRng + 2),
    [esito],
  );

  const [girato, setGirato] = useState(false);
  const [finito, setFinito] = useState(false);

  const tornaSubito = useRef(false);
  useEffect(() => {
    if (esito.eseguita || tornaSubito.current) return;
    tornaSubito.current = true;
    onFine();
  }, [esito.eseguita, onFine]);

  if (!esito.eseguita) return null;

  const fette = Array.from({ length: SPICCHI }, (_, i) => {
    const colore = i % 2 === 0 ? "oklch(0.22 0.08 30)" : "oklch(0.46 0.22 25)";
    return `${colore} ${i * PASSO}deg ${(i + 1) * PASSO}deg`;
  }).join(", ");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 px-5 py-8">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-oro)]/80">
          Fortuna VIP
        </span>
        <h2 className="font-[family-name:var(--font-titolo)] text-[30px] leading-none text-gold-glow">
          {NOMI_GIOCHI.ruota}
        </h2>
      </motion.div>

      <div className="relative h-76 w-76 flex items-center justify-center">
        {/* Pointer Arrow con Glow */}
        <div className="absolute left-1/2 top-[-6px] z-20 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[22px] border-x-transparent border-t-[var(--color-oro)] filter drop-shadow-[0_4px_8px_rgba(255,215,0,0.8)]" />

        {/* Bordo metallico esterno con perni dorati */}
        <div className="foglia-oro relative h-full w-full rounded-full p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
          <motion.div
            animate={{ rotate: girato ? angolo : 0 }}
            transition={{ duration: 4.5, ease: [0.15, 0.85, 0.2, 1] }}
            onAnimationComplete={() => {
              if (girato) setFinito(true);
            }}
            className="relative h-full w-full rounded-full border-2 border-amber-300/40 shadow-inner"
            style={{ background: `conic-gradient(from 0deg, ${fette})` }}
          >
            {etichette.map((e, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 h-0 w-0"
                style={{
                  transform: `rotate(${centroSpicchio(i)}deg) translateY(-106px) rotate(${
                    centroSpicchio(i) > 180 ? 90 : -90
                  }deg)`,
                }}
              >
                <span
                  className={`absolute left-1/2 top-1/2 w-16 -translate-x-1/2 -translate-y-1/2 text-center font-[family-name:var(--font-titolo)] leading-tight drop-shadow ${
                    e === "Ritenta"
                      ? "text-[11px] text-white/40"
                      : e === "RIGIOCA"
                        ? "text-[10px] font-bold tracking-wide text-white"
                        : "text-[20px] text-[var(--color-oro)]"
                  }`}
                >
                  {typeof e === "number" ? `${e}€` : e}
                </span>
              </div>
            ))}

            {/* Mozzo centrale in rubino/oro */}
            <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-oro)] bg-gradient-to-tr from-rose-900 to-amber-500 shadow-lg" />
          </motion.div>
        </div>
      </div>

      {!girato && (
        <button
          onClick={() => setGirato(true)}
          className="foglia-oro w-full max-w-[20rem] rounded-xl py-4 text-sm font-extrabold uppercase tracking-[0.2em] text-[#2b0808] shadow-2xl transition-transform active:scale-[0.98]"
        >
          Gira la Ruota 🎯
        </button>
      )}

      {finito && <Esitino esito={esito} gioco="ruota" onFine={onFine} onAncora={onAncora} />}
    </div>
  );
}

