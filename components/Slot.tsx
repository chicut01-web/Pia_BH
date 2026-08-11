"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { NOMI_GIOCHI } from "@/lib/config";
import type { Esito } from "@/lib/engine";
import { facceFinali, SIMBOLI_SLOT } from "@/lib/scena";
import type { Faccia } from "@/lib/scena";
import Esitino from "./Esitino";

const TEMPI_ARRESTO = [900, 1700, 2700];

export default function Slot({ esito, onFine, onAncora }: { esito: Esito; onFine: () => void; onAncora: () => void }) {
  const finali = useMemo(() => facceFinali(esito, esito.stato.passiRng + 1), [esito]);

  const [fermi, setFermi] = useState<number[]>([]);
  const [correnti, setCorrenti] = useState<Faccia[]>([0, 2, 4]);

  const tornaSubito = useRef(false);
  useEffect(() => {
    if (esito.eseguita || tornaSubito.current) return;
    tornaSubito.current = true;
    onFine();
  }, [esito.eseguita, onFine]);

  useEffect(() => {
    if (!esito.eseguita) return;
    const t = setInterval(() => {
      setCorrenti((c) =>
        c.map((v, i) =>
          fermi.includes(i) ? v : ((typeof v === "number" ? v : 0) + 1) % SIMBOLI_SLOT.length,
        ),
      );
    }, 80);
    return () => clearInterval(t);
  }, [fermi, esito.eseguita]);

  useEffect(() => {
    if (!esito.eseguita) return;
    const timers = TEMPI_ARRESTO.map((ms, i) =>
      setTimeout(() => {
        setCorrenti((c) => c.map((v, j) => (j === i ? finali[i] : v)));
        setFermi((f) => (f.includes(i) ? f : [...f, i]));
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [finali, esito.eseguita]);

  if (!esito.eseguita) return null;

  const finito = fermi.length === 3;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 px-5 py-8">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-oro)]/80">
          Casino Bar
        </span>
        <h2 className="font-[family-name:var(--font-titolo)] text-[30px] leading-none text-gold-glow">
          {NOMI_GIOCHI.slot}
        </h2>
      </motion.div>

      {/* Cabinet della slot machine in ottone lucido */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="foglia-oro rounded-3xl p-1.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
      >
        <div className="rounded-[20px] bg-gradient-to-b from-[#2b0c1b] via-[#17050f] to-[#0d0208] p-5 border border-amber-500/30">
          {/* Luci di coronamento slot */}
          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map((idx) => (
              <span
                key={idx}
                className="h-2.5 w-2.5 rounded-full bg-[var(--color-oro)] shadow-[0_0_8px_rgba(255,215,0,0.8)] animate-pulse"
                style={{ animationDelay: `${idx * 0.2}s` }}
              />
            ))}
          </div>

          <div className="flex gap-3 bg-black/60 p-3 rounded-xl border border-amber-500/20 shadow-inner">
            {correnti.map((faccia, i) => (
              <motion.div
                key={i}
                animate={fermi.includes(i) ? { y: [0, -8, 0] } : {}}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-amber-50 via-white to-amber-100 border-2 border-[var(--color-oro)]/80 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)]"
              >
                {faccia === "RIGIOCA" ? (
                  <span className="px-1 text-center font-[family-name:var(--font-titolo)] text-[14px] leading-tight text-[var(--color-cremisi)]">
                    RIGIOCA
                  </span>
                ) : (
                  <Image
                    src={SIMBOLI_SLOT[faccia]}
                    alt=""
                    fill
                    sizes="92px"
                    className="object-contain p-2.5 drop-shadow"
                  />
                )}
              </motion.div>
            ))}
          </div>

          <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-white/50">
            Tre immagini uguali · Vinci Euro! 💰
          </p>
        </div>
      </motion.div>

      {finito && <Esitino esito={esito} gioco="slot" onFine={onFine} onAncora={onAncora} />}
    </div>
  );
}

