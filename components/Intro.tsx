"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { BUDGET_INIZIALE } from "@/lib/config";

const APPARE = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

export default function Intro({ onAvanti }: { onAvanti: () => void }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-7 px-6 py-10 text-center overflow-hidden">
      {/* Glow ambientale caldo */}
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,180,0,0.15)_0%,transparent_70%)] blur-3xl" />

      {/* Foto nella cornice barocca con aura dorata */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={APPARE}
        className="relative h-[16.5rem] w-[13.5rem] shrink-0 group"
      >
        <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-[var(--color-oro)] via-amber-400 to-rose-500 opacity-60 blur-md group-hover:opacity-80 transition-opacity" />
        
        <div className="relative h-full w-full overflow-hidden rounded-xl border-2 border-[var(--color-oro)] shadow-2xl">
          <div className="absolute inset-[11%] overflow-hidden rounded-md">
            <Image
              src="/assets/foto/car1.webp"
              alt="Noi due al sole"
              fill
              sizes="220px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
          </div>
          <Image
            src="/assets/img/cornice.webp"
            alt=""
            fill
            sizes="220px"
            className="pointer-events-none object-contain drop-shadow-md"
            priority
          />
        </div>
      </motion.div>

      {/* Titolo Principale */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...APPARE, delay: 0.2 }}
        className="space-y-1"
      >
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-oro)]/80">
          Buon Compleanno
        </p>
        <h1 className="font-[family-name:var(--font-titolo)] text-[clamp(2.6rem,12vw,3.6rem)] leading-none text-gold-glow">
          Piuccia 🎉
        </h1>
      </motion.div>

      {/* Card del regalo */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...APPARE, delay: 0.45 }}
        className="glass-panel w-full max-w-[21rem] rounded-2xl p-5 space-y-3 shadow-xl"
      >
        <p className="text-[15px] font-medium leading-relaxed text-white/90">
          Ti ho aperto una tabaccheria tutta tua! 🏪
        </p>
        
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-oro)]/40 bg-black/40 px-4 py-1.5 shadow-inner">
          <span className="text-lg">🪙</span>
          <span className="font-[family-name:var(--font-titolo)] text-[18px] text-[var(--color-oro)]">
            {BUDGET_INIZIALE} Piuccine
          </span>
        </div>

        <p className="text-[13px] leading-relaxed text-white/60">
          Quello che vinci è vero. Puoi arrivare fino a <strong className="text-[var(--color-verde)]">50€</strong>!
        </p>
      </motion.div>

      {/* Tasto Azione */}
      <motion.button
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...APPARE, delay: 0.7 }}
        onClick={onAvanti}
        className="foglia-oro w-full max-w-[21rem] rounded-xl py-4 text-sm font-extrabold uppercase tracking-[0.2em] text-[#2b0808] shadow-2xl transition-transform active:scale-[0.98]"
      >
        Alza la Saracinesca ✨
      </motion.button>
    </div>
  );
}

