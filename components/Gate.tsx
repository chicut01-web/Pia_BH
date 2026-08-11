"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CODICE_ACCESSO } from "@/lib/config";
import InsegnaT from "./InsegnaT";

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
    <div className="touch-pan-y relative flex min-h-dvh w-full flex-col items-center justify-start sm:justify-center gap-8 px-6 py-8 overflow-y-auto">
      {/* Texture della saracinesca stilizzata in metallo scuro lucido */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(180deg, rgba(0,0,0,0.8) 0px, rgba(15,10,25,0.95) 8px)",
          backgroundSize: "100% 12px",
        }}
      />

      {/* Luce soffusa centrale dietro il logo */}
      <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,180,0,0.18)_0%,transparent_70%)] blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-3"
      >
        <InsegnaT />
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--color-oro)]/80 drop-shadow">
          Tabaccheria Piuccia
        </span>
      </motion.div>

      <motion.form
        onSubmit={invia}
        initial={{ opacity: 0, y: 20 }}
        animate={
          errore
            ? { opacity: 1, y: 0, x: [0, -10, 10, -7, 7, 0] }
            : { opacity: 1, y: 0 }
        }
        transition={{ duration: errore ? 0.45 : 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        onAnimationComplete={() => setErrore(false)}
        className="glass-panel relative z-10 w-full max-w-[21rem] overflow-hidden rounded-2xl p-6 text-center shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-oro)] to-transparent" />

        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">
          Riservato a Piuccia
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-titolo)] text-[23px] leading-tight text-gold-glow">
          Come ti chiamo io?
        </h1>

        <div className="relative mt-5">
          <input
            value={valore}
            onChange={(e) => setValore(e.target.value)}
            aria-label="Come ti chiamo io?"
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Scrivi qui..."
            className={`w-full rounded-xl border px-4 py-3.5 text-center font-[family-name:var(--font-titolo)] text-[20px] text-white placeholder-white/20 outline-none transition-all duration-300 ${
              errore
                ? "border-red-500/80 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : "border-[var(--color-oro)]/40 bg-black/40 focus:border-[var(--color-oro)] focus:bg-black/60 focus:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
            }`}
          />
        </div>

        {errore && (
          <p className="mt-2 text-xs font-medium text-red-400 animate-pulse">
            Risposta errata, riprova! 🤫
          </p>
        )}

        <button className="foglia-oro mt-5 w-full rounded-xl py-3.5 text-sm font-extrabold uppercase tracking-[0.2em] text-[#2a0808] shadow-lg transition-transform active:scale-[0.98]">
          Entra nel Locale ✨
        </button>
      </motion.form>
    </div>
  );
}

