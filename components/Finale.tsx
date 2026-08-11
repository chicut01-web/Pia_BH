"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { Stato } from "@/lib/engine";

const CAROSELLO = ["/assets/foto/car2.webp", "/assets/foto/car3.webp", "/assets/foto/intro.webp"];
const DURATA_CONTEGGIO = 2400;

export default function Finale({ stato }: { stato: Stato }) {
  const [conteggio, setConteggio] = useState(0);
  const [slide, setSlide] = useState(0);

  // Coriandoli al montaggio della pagina finale
  useEffect(() => {
    const end = Date.now() + 3000;
    const colors = ["#FFD700", "#00E676", "#FF2A55", "#00B0FF"];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  useEffect(() => {
    const avvio = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - avvio) / DURATA_CONTEGGIO);
      setConteggio(Math.round(stato.vinto * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stato.vinto]);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % CAROSELLO.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden flex flex-col items-center justify-center px-6 py-10 text-center">
      {/* Sfondo sfumato romantico */}
      <Image
        src="/assets/foto/sfondo-finale.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-25 blur-sm"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#14081d]/90 via-[#220c2a]/80 to-[#0c0412]/95" />

      {/* Luce ambientale centrale */}
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.18)_0%,transparent_70%)] blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-center gap-6 max-w-sm w-full">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-extrabold uppercase tracking-[0.35em] text-[var(--color-oro)]/80"
        >
          Sessione Completata! 🎉
        </motion.p>

        {/* Card Rivelazione del Totale */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="glass-panel w-full rounded-2xl p-6 shadow-2xl border-2 border-[var(--color-oro)]/60"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            Hai vinto in totale:
          </p>
          <div className="font-[family-name:var(--font-titolo)] text-7xl leading-tight text-emerald-glow my-1">
            {conteggio}€
          </div>
          <p className="text-xs text-white/50">
            {stato.giocate} giocate completate
          </p>
        </motion.div>

        {/* Carosello Polaroid Foto Ricordo */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative h-56 w-56 overflow-hidden rounded-2xl border-2 border-[var(--color-oro)] shadow-2xl group"
        >
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-[var(--color-oro)] to-rose-500 opacity-50 blur-sm" />
          {CAROSELLO.map((src, i) => (
            <motion.div
              key={src}
              animate={{ opacity: slide === i ? 1 : 0 }}
              transition={{ duration: 0.9 }}
              className="absolute inset-0"
            >
              <Image src={src} alt="I nostri momenti" fill sizes="224px" className="object-cover" />
            </motion.div>
          ))}
        </motion.div>

        {/* Messaggio Dedica */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: DURATA_CONTEGGIO / 1000 + 0.3 }}
          className="space-y-3"
        >
          <p className="text-base font-semibold leading-relaxed text-white/90">
            I 27€ sono veri! E sono il budget per la nostra prossima vacanza insieme! ✈️🏖️
          </p>
          <p className="text-xs text-white/60">
            Dove andare lo decidiamo insieme noi due.
          </p>
          <p className="pt-3 font-[family-name:var(--font-titolo)] text-3xl text-gold-glow">
            Ti amo Piuccia ❤️
          </p>
        </motion.div>
      </div>
    </div>
  );
}

