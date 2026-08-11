"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CASELLE, NOMI_GIOCHI } from "@/lib/config";
import type { Esito } from "@/lib/engine";
import { AREE } from "@/lib/biglietti";
import { costruisciGriglia } from "@/lib/griglia";
import type { Casella } from "@/lib/griglia";
import Esitino from "./Esitino";

type Taglio = "gratta2" | "gratta3" | "gratta5";

const RAGGIO_GRATTATA = 22;
const SOGLIA_SCOPERTURA = 0.5;

export default function Gratta({
  taglio,
  esito,
  onFine,
  onAncora,
}: {
  taglio: Taglio;
  esito: Esito;
  onFine: () => void;
  onAncora: () => void;
}) {
  const n = CASELLE[taglio];
  const colonne = 3;
  const area = AREE[taglio];

  const celle = useMemo(() => costruisciGriglia(esito, n, esito.stato.passiRng), [esito, n]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scoperto, setScoperto] = useState(false);
  const [iniziato, setIniziato] = useState(false);
  const disegnando = useRef(false);
  const ultimoPunto = useRef<{ x: number; y: number } | null>(null);

  const tornaSubito = useRef(false);
  useEffect(() => {
    if (esito.eseguita || tornaSubito.current) return;
    tornaSubito.current = true;
    onFine();
  }, [esito.eseguita, onFine]);

  useEffect(() => {
    if (!esito.eseguita) return;
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    if (r.width === 0) return;
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    g.addColorStop(0, "#d8dc42");
    g.addColorStop(0.2, "#a6abb3");
    g.addColorStop(0.5, "#e8ecf1");
    g.addColorStop(0.8, "#9ea3ab");
    g.addColorStop(1, "#c0c5cc");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const y = Math.random() * r.height;
      ctx.beginPath();
      ctx.moveTo(Math.random() * r.width * 0.4, y);
      ctx.lineTo(r.width * (0.5 + Math.random() * 0.5), y + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "destination-out";
  }, [taglio, esito.eseguita]);

  function controllaScopertura() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dati = ctx.getImageData(0, 0, c.width, c.height).data;
    let vuoti = 0;
    let campionati = 0;
    for (let i = 3; i < dati.length; i += 4 * 40) {
      campionati++;
      if (dati[i] === 0) vuoti++;
    }
    if (campionati > 0 && vuoti / campionati > SOGLIA_SCOPERTURA) setScoperto(true);
  }

  function coordinate(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function grattaA(x: number, y: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.strokeStyle = "rgba(0,0,0,1)";

    if (ultimoPunto.current) {
      ctx.lineWidth = RAGGIO_GRATTATA * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(ultimoPunto.current.x, ultimoPunto.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, RAGGIO_GRATTATA, 0, Math.PI * 2);
    ctx.fill();
    ultimoPunto.current = { x, y };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (scoperto) return;
    disegnando.current = true;
    setIniziato(true);
    ultimoPunto.current = null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const { x, y } = coordinate(e);
    grattaA(x, y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnando.current || scoperto) return;
    const { x, y } = coordinate(e);
    grattaA(x, y);
  }

  function onPointerUp() {
    disegnando.current = false;
    ultimoPunto.current = null;
    controllaScopertura();
  }

  if (!esito.eseguita) return null;

  const stile = {
    left: `${area.x * 100}%`,
    top: `${area.y * 100}%`,
    width: `${area.w * 100}%`,
    height: `${area.h * 100}%`,
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[20rem] overflow-hidden rounded-xl border-2 border-[var(--color-oro)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]"
      >
        <Image
          src={`/assets/img/${taglio}.webp`}
          alt={NOMI_GIOCHI[taglio]}
          width={900}
          height={1200}
          sizes="320px"
          className="h-auto w-full rounded-lg"
          priority
        />

        <div className="absolute" style={stile}>
          <div className={`grid h-full w-full ${colonne === 3 ? "grid-cols-3" : "grid-cols-2"} place-items-center gap-x-1`}>
            {celle.map((v, i) => (
              <Cella key={i} valore={v} />
            ))}
          </div>

          {!scoperto && (
            <canvas
              ref={canvasRef}
              className="gratta absolute inset-0 h-full w-full cursor-pointer"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          )}
        </div>
      </motion.div>

      {!scoperto && !iniziato && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-oro)] drop-shadow"
        >
          ✨ Gratta con il dito sullo schermo ✨
        </motion.p>
      )}

      {scoperto && <Esitino esito={esito} gioco={taglio} onFine={onFine} onAncora={onAncora} />}
    </div>
  );
}

function Cella({ valore }: { valore: Casella }) {
  return (
    <span className="font-[family-name:var(--font-titolo)] leading-none text-black">
      {valore === "RIGIOCA" ? (
        <span className="text-[9px] font-bold tracking-wide text-red-600">RIGIOCA</span>
      ) : (
        <span className="text-[clamp(15px,5.8vw,22px)] text-[oklch(0.22_0.02_40)]">
          {valore}
          <span className="text-[0.65em] font-normal">€</span>
        </span>
      )}
    </span>
  );
}

