"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { NOMI_GIOCHI } from "@/lib/config";
import type { Esito } from "@/lib/engine";
import { facceFinali, SIMBOLI_SLOT } from "@/lib/scena";
import type { Faccia } from "@/lib/scena";
import Esitino from "./Esitino";
import { useAudio } from "@/hooks/useAudio";

const TEMPI_ARRESTO = [1000, 1800, 2800];

export default function Slot({
  esito,
  onFine,
  onAncora,
}: {
  esito: Esito;
  onFine: () => void;
  onAncora: () => void;
}) {
  const finali = useMemo(() => {
    const seedDinamico =
      (esito.stato.seed * 1664525 +
        esito.stato.giocate * 1013904223 +
        esito.stato.passiRng * 22695477 +
        101) >>>
      0;
    return facceFinali(esito, seedDinamico);
  }, [esito]);
  const { playTick, playReelStop, playLeverPull } = useAudio();

  const [iniziato, setIniziato] = useState(false);
  const [tirandoLeva, setTirandoLeva] = useState(false);
  const [fermi, setFermi] = useState<number[]>([]);
  const [correnti, setCorrenti] = useState<Faccia[]>([0, 2, 4]);

  const tornaSubito = useRef(false);
  useEffect(() => {
    if (esito.eseguita || tornaSubito.current) return;
    tornaSubito.current = true;
    onFine();
  }, [esito.eseguita, onFine]);

  // Gestione rotazione ruote durante lo spin
  useEffect(() => {
    if (!esito.eseguita || !iniziato) return;
    const t = setInterval(() => {
      if (fermi.length < 3) {
        playTick();
      }
      setCorrenti((c) =>
        c.map((v, i) =>
          fermi.includes(i) ? v : ((typeof v === "number" ? v : 0) + 1) % SIMBOLI_SLOT.length,
        ),
      );
    }, 75);
    return () => clearInterval(t);
  }, [fermi, esito.eseguita, iniziato, playTick]);

  // Gestione arresti graduali
  useEffect(() => {
    if (!esito.eseguita || !iniziato) return;
    const timers = TEMPI_ARRESTO.map((ms, i) =>
      setTimeout(() => {
        playReelStop();
        setCorrenti((c) => c.map((v, j) => (j === i ? finali[i] : v)));
        setFermi((f) => (f.includes(i) ? f : [...f, i]));
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [finali, esito.eseguita, iniziato, playReelStop]);

  function azionaLeva() {
    if (iniziato) return;
    playLeverPull();
    setTirandoLeva(true);
    setTimeout(() => {
      setTirandoLeva(false);
    }, 400);
    setIniziato(true);
  }

  if (!esito.eseguita) return null;

  const finito = fermi.length === 3;

  return (
    <div className="touch-pan-y flex min-h-dvh w-full flex-col items-center justify-start sm:justify-center gap-6 px-4 py-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-oro)]/80">
          Casino Bar VIP
        </span>
        <h2 className="font-[family-name:var(--font-titolo)] text-[30px] leading-none text-gold-glow">
          {NOMI_GIOCHI.slot}
        </h2>
      </motion.div>

      {/* Contenitore con Slot Machine Cabinet + Manovella Vintage Laterale */}
      <div className="relative flex items-center justify-center w-full max-w-sm">
        {/* Cabinet della Slot Machine */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="foglia-oro relative z-10 w-full rounded-3xl p-1.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]"
        >
          <div className="rounded-[20px] bg-gradient-to-b from-[#2b0c1b] via-[#17050f] to-[#0d0208] p-4 sm:p-5 border border-amber-500/30">
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

            {/* Rulli Slot */}
            <div className="flex justify-center gap-2 sm:gap-3 bg-black/70 p-2.5 sm:p-3 rounded-xl border border-amber-500/30 shadow-inner">
              {correnti.map((faccia, i) => (
                <motion.div
                  key={i}
                  animate={fermi.includes(i) ? { y: [0, -8, 0] } : {}}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex h-[84px] w-[84px] sm:h-[92px] sm:w-[92px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-amber-50 via-white to-amber-100 border-2 border-[var(--color-oro)]/80 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)]"
                >
                  {faccia === "RIGIOCA" ? (
                    <span className="px-1 text-center font-[family-name:var(--font-titolo)] text-[13px] sm:text-[14px] leading-tight text-[var(--color-cremisi)]">
                      RIGIOCA
                    </span>
                  ) : (
                    <Image
                      src={SIMBOLI_SLOT[faccia]}
                      alt=""
                      fill
                      sizes="92px"
                      className="object-contain p-2 sm:p-2.5 drop-shadow"
                    />
                  )}
                </motion.div>
              ))}
            </div>

            <p className="mt-4 text-center text-[9.5px] font-bold uppercase tracking-[0.22em] text-amber-200/70">
              Tre immagini uguali · Vinci Euro! 💰
            </p>
          </div>
        </motion.div>

        {/* --- MANOVELLA / LEVA MECCANICA VINTAGE (Lato Destro) --- */}
        <div
          onClick={azionaLeva}
          className={`absolute -right-7 sm:-right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer select-none transition-opacity ${
            iniziato && !tirandoLeva ? "opacity-60 pointer-events-none" : "hover:scale-105"
          }`}
        >
          {/* Badge Indicatore "TIRA!" */}
          {!iniziato && (
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[8.5px] font-black uppercase text-black shadow-lg border border-yellow-200 z-30"
            >
              TIRA QUI! 👇
            </motion.div>
          )}

          {/* Innesto / Boccola metallica dorata sulla scocca */}
          <div className="h-10 w-4 rounded-r-md bg-gradient-to-r from-amber-700 via-amber-500 to-amber-900 border border-amber-300/80 shadow-md" />

          {/* Asta e Pomello della Leva (Pivot in basso all'innesto) */}
          <motion.div
            animate={{
              rotate: tirandoLeva ? 65 : 0,
              y: tirandoLeva ? 28 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 18,
            }}
            className="origin-bottom flex flex-col items-center -mt-10"
          >
            {/* Pomello sferico rosso lucido 3D della manovella */}
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-red-400 via-red-600 to-red-950 border-2 border-amber-300 shadow-[0_0_18px_rgba(239,68,68,0.95),inset_0_2px_6px_rgba(255,255,255,0.6)] flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-white/40 blur-[1px] -mt-2 -ml-2" />
            </div>

            {/* Asta metallica cromata della leva */}
            <div className="h-20 w-3 rounded-b-sm bg-gradient-to-r from-slate-300 via-white to-slate-400 border border-slate-500/60 shadow-inner" />
          </motion.div>
        </div>
      </div>

      {/* Pulsante alternativo per abbassare la manovella */}
      {!iniziato && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={azionaLeva}
          className="flex items-center gap-2 rounded-full border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 px-6 py-3 text-[12px] font-black uppercase tracking-[0.2em] text-black shadow-[0_10px_25px_rgba(255,215,0,0.5)] transition-all hover:brightness-110 active:scale-95"
        >
          <span>🎰</span> Tira la Manovella!
        </motion.button>
      )}

      {iniziato && !finito && (
        <p className="animate-pulse text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
          ✨ I rulli stanno girando... ✨
        </p>
      )}

      {finito && <Esitino esito={esito} gioco="slot" onFine={onFine} onAncora={onAncora} />}
    </div>
  );
}
