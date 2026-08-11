"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CASELLE, COSTI, GiocoId, NOMI_GIOCHI } from "@/lib/config";
import { puoGiocare, Stato } from "@/lib/engine";
import InsegnaT from "./InsegnaT";
import { useAudio } from "@/hooks/useAudio";

const FINESTRA_TAP = 1500;
const TAP_PER_RESET = 5;

const TAGLI: Array<"gratta2" | "gratta3" | "gratta5"> = ["gratta2", "gratta3", "gratta5"];

export default function Hub({
  stato,
  onGioco,
  onReset,
}: {
  stato: Stato;
  onGioco: (g: GiocoId) => void;
  onReset: () => void;
}) {
  const tap = useRef(0);
  const ultimoTap = useRef(0);
  const { playCoin, muted, toggleMute } = useAudio();

  function gestisciGioco(g: GiocoId) {
    playCoin();
    onGioco(g);
  }

  function tocca() {
    const ora = Date.now();
    tap.current = ora - ultimoTap.current > FINESTRA_TAP ? 1 : tap.current + 1;
    ultimoTap.current = ora;
    if (tap.current >= TAP_PER_RESET) {
      tap.current = 0;
      onReset();
    }
  }

  return (
    <div className="touch-pan-y relative min-h-dvh w-full pb-12 overflow-y-auto">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-6">
        {/* Header con Insegna Neon, Mute Toggle & Scontrino VIP del Saldo */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={tocca} aria-label="Reset Tabaccheria" className="shrink-0">
              <InsegnaT />
            </button>
            <button
              onClick={toggleMute}
              title={muted ? "Attiva audio" : "Disattiva audio"}
              aria-label="Toggle Audio"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-oro)]/30 bg-black/40 text-sm transition-all hover:border-[var(--color-oro)] active:scale-95"
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>

          {/* Scontrino VIP del Saldo */}
          <div className="glass-panel relative flex-1 rounded-2xl px-4 py-3 shadow-2xl overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-oro)] to-transparent" />
            
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                Piuccine
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🪙</span>
                <motion.span
                  key={stato.piuccine}
                  initial={{ opacity: 0.4, scale: 1.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-[family-name:var(--font-titolo)] text-[22px] leading-none text-[var(--color-oro)]"
                >
                  {stato.piuccine}
                </motion.span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                Buono Vacanza
              </span>
              <motion.span
                key={stato.vinto}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="font-[family-name:var(--font-titolo)] text-[22px] leading-none text-emerald-glow"
              >
                {stato.vinto}€
              </motion.span>
            </div>
          </div>
        </header>

        {/* Sezione Biglietti Gratta e Vinci */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--color-oro)]/80 flex items-center gap-2">
            <span>🎟️</span> I Gratta e Vinci
          </h2>
          <span className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-oro)]/30 to-transparent ml-3" />
        </div>

        <div className="mt-3.5 space-y-3">
          {TAGLI.map((id, i) => (
            <TicketBanco
              key={id}
              id={id}
              indice={i}
              disponibile={puoGiocare(stato, id)}
              onGioco={gestisciGioco}
            />
          ))}
        </div>

        {/* Sezione Macchine da Bar */}
        <div className="mt-9 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--color-oro)]/80 flex items-center gap-2">
            <span>🎰</span> Le Macchine da Bar
          </h2>
          <span className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-oro)]/30 to-transparent ml-3" />
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <Macchina
            id="slot"
            icona="/assets/img/sym-kitkat.webp"
            nota="Tre rulli fortunati"
            disponibile={puoGiocare(stato, "slot")}
            onGioco={gestisciGioco}
          />
          <Macchina
            id="ruota"
            icona="/assets/img/ruota.webp"
            nota="Otto spicchi premio"
            disponibile={puoGiocare(stato, "ruota")}
            onGioco={gestisciGioco}
          />
        </div>
      </div>
    </div>
  );
}

/** Biglietto sullo scaffale con grafica da tagliando della lotteria laminato. */
function TicketBanco({
  id,
  indice,
  disponibile,
  onGioco,
}: {
  id: "gratta2" | "gratta3" | "gratta5";
  indice: number;
  disponibile: boolean;
  onGioco: (g: GiocoId) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: indice * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      disabled={!disponibile}
      onClick={() => onGioco(id)}
      className="group relative flex w-full items-stretch overflow-hidden rounded-xl border border-[var(--color-oro)]/30 bg-gradient-to-r from-[#211530] via-[#2d1b40] to-[#1d122b] p-0 text-left shadow-xl transition-all duration-300 disabled:opacity-30 active:scale-[0.99] hover:border-[var(--color-oro)]/70 hover:shadow-2xl"
    >
      <div className="flex-1 py-3.5 pl-4 pr-3 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--color-oro)]/80">
          <span>✨</span> Gratta e vinci
        </div>
        <div className="font-[family-name:var(--font-titolo)] text-[18px] leading-tight text-white group-hover:text-[var(--color-oro)] transition-colors">
          {NOMI_GIOCHI[id]}
        </div>
        <div className="mt-1 text-[11px] text-white/50">
          {CASELLE[id]} caselle {id === "gratta5" && " · Paga massimo!"}
        </div>
      </div>

      {/* Tagliando prezzo strappabile */}
      <div className="foglia-oro relative flex w-[68px] shrink-0 flex-col items-center justify-center gap-0.5 border-l border-dashed border-black/40 text-[#2b0808] shadow-inner">
        <span className="font-[family-name:var(--font-titolo)] text-[26px] leading-none">
          {COSTI[id]}
        </span>
        <span className="text-[8px] font-extrabold uppercase tracking-[0.14em]">
          Piuccine
        </span>
      </div>
    </motion.button>
  );
}

/** Macchine da bar (Slot e Ruota) stile cabinet vintage casinò. */
function Macchina({
  id,
  icona,
  nota,
  disponibile,
  onGioco,
}: {
  id: "slot" | "ruota";
  icona: string;
  nota: string;
  disponibile: boolean;
  onGioco: (g: GiocoId) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      disabled={!disponibile}
      onClick={() => onGioco(id)}
      className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-[var(--color-oro)]/40 bg-gradient-to-b from-[#2b1020] via-[#1a0815] to-[#10040c] p-4 text-center shadow-xl transition-all duration-300 disabled:opacity-30 active:scale-[0.98] hover:border-[var(--color-oro)] hover:shadow-2xl"
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-oro)] to-transparent opacity-60 group-hover:opacity-100" />
      
      <div className="relative h-16 w-16 transition-transform duration-300 group-hover:scale-110">
        <Image src={icona} alt="" fill sizes="64px" className="object-contain drop-shadow-lg" />
      </div>

      <div>
        <div className="font-[family-name:var(--font-titolo)] text-[15px] leading-tight text-[var(--color-oro)]">
          {NOMI_GIOCHI[id]}
        </div>
        <div className="mt-0.5 text-[10px] text-white/50">{nota}</div>
      </div>

      <div className="w-full rounded-lg border border-[var(--color-oro)]/30 bg-black/40 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/90 group-hover:bg-[var(--color-oro)] group-hover:text-black transition-colors">
        {COSTI[id]} {COSTI[id] === 1 ? "Piuccina" : "Piuccine"}
      </div>
    </motion.button>
  );
}

