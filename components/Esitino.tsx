"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { COSTI, GiocoId } from "@/lib/config";
import type { Esito } from "@/lib/engine";

const MOLLA = { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const };

export default function Esitino({
  esito,
  gioco,
  onFine,
  onAncora,
}: {
  esito: Esito;
  gioco: GiocoId;
  onFine: () => void;
  onAncora: () => void;
}) {
  const puoAncora = esito.stato.piuccine >= COSTI[gioco];

  // Lancia i coriandoli se ha vinto o sbloccato un biglietto gratis
  useEffect(() => {
    if (esito.vinta || esito.rigioca) {
      confetti({
        particleCount: esito.vinta ? 80 : 50,
        spread: 70,
        origin: { y: 0.65 },
        colors: esito.vinta ? ["#FFD700", "#00E676", "#FF2A55"] : ["#00B0FF", "#FFD700"],
      });
    }
  }, [esito.vinta, esito.rigioca]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MOLLA}
      className="glass-panel relative w-full max-w-[21rem] rounded-2xl p-6 text-center shadow-2xl overflow-hidden border-2 border-[var(--color-oro)]/50"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-oro)] to-transparent" />

      {esito.rigioca ? (
        <div className="flex flex-col items-center gap-1 my-2">
          <span className="text-3xl animate-bounce">🎟️</span>
          <motion.p
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={MOLLA}
            className="font-[family-name:var(--font-titolo)] text-[28px] leading-tight text-gold-glow"
          >
            Biglietto Gratis!
          </motion.p>
          <p className="text-xs text-white/70">Le tue Piuccine sono state rimborsate! 🎉</p>
        </div>
      ) : esito.vinta ? (
        <div className="flex flex-col items-center gap-1 my-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-oro)]">
            Hai Vinto Vero! 💰
          </p>
          <motion.p
            initial={{ scale: 0.65, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ ...MOLLA, duration: 0.7 }}
            className="font-[family-name:var(--font-titolo)] text-[56px] leading-none text-emerald-glow my-1"
          >
            {esito.importo}
            <span className="text-[32px] font-normal">€</span>
          </motion.p>
        </div>
      ) : (
        <div className="my-2">
          <span className="text-3xl">🙃</span>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="font-[family-name:var(--font-titolo)] text-[24px] leading-none text-white/40 mt-2"
          >
            Nessuna vincita
          </motion.p>
          <p className="text-xs text-white/40 mt-1">Ritenta con un altro biglietto!</p>
        </div>
      )}

      <div className="mt-5 flex w-full flex-col gap-2.5">
        {puoAncora && (
          <button
            onClick={onAncora}
            className="foglia-oro w-full rounded-xl py-3.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#2b0808] shadow-lg transition-transform active:scale-[0.98]"
          >
            Gioca Ancora ({COSTI[gioco]} {COSTI[gioco] === 1 ? "Piuccina" : "Piuccine"})
          </button>
        )}
        <button
          onClick={onFine}
          className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white/10 active:scale-[0.98]"
        >
          Torna in Tabaccheria
        </button>
      </div>
    </motion.div>
  );
}

