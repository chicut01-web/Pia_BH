"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CASELLE } from "@/lib/config";
import type { Esito } from "@/lib/engine";
import { costruisciGriglia } from "@/lib/griglia";
import type { Casella } from "@/lib/griglia";
import Biglietto from "./Biglietto";
import Esitino from "./Esitino";
import { useAudio } from "@/hooks/useAudio";

type Taglio = "gratta2" | "gratta3" | "gratta5";

const RAGGIO_GRATTATA = 22;
const SOGLIA_SCOPERTURA = 0.48;

/** Converte un importo numerico o "RIGIOCA" nella dicitura estesa in italiano come nei veri biglietti */
function testoImporto(valore: Casella): string {
  if (valore === "RIGIOCA") return "TICKET GRATIS";
  switch (valore) {
    case 1:
      return "UNO/00";
    case 2:
      return "DUE/00";
    case 3:
      return "TRE/00";
    case 4:
      return "QUATTRO/00";
    case 6:
      return "SEI/00";
    case 7:
      return "SETTE/00";
    case 8:
      return "OTTO/00";
    case 9:
      return "NOVE/00";
    case 11:
      return "UNDICI/00";
    case 12:
      return "DODICI/00";
    default:
      return `${valore}/00`;
  }
}

interface Particella {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

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

  const celle = useMemo(() => costruisciGriglia(esito, n, esito.stato.passiRng), [esito, n]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scoperto, setScoperto] = useState(false);
  const [iniziato, setIniziato] = useState(false);
  const [particelle, setParticelle] = useState<Particella[]>([]);

  const disegnando = useRef(false);
  const ultimoPunto = useRef<{ x: number; y: number } | null>(null);
  const { playScratch, playWin, playCoin } = useAudio();
  const ultimoSuonoScratch = useRef<number>(0);

  const tornaSubito = useRef(false);
  useEffect(() => {
    if (esito.eseguita || tornaSubito.current) return;
    tornaSubito.current = true;
    onFine();
  }, [esito.eseguita, onFine]);

  // Determina quale valore è quello vincente per evidenziarlo quando scoperto
  const valoreVincente = esito.vinta ? esito.importo : esito.rigioca ? "RIGIOCA" : null;

  // Inizializza il canvas della vernice d'argento argentata/dorata e i medaglioni "GRATTA QUI"
  useEffect(() => {
    if (!esito.eseguita) return;
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;

    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // 1. Sfondo laminato argento/oro spazzolato
    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    g.addColorStop(0, "#e0e5eb");
    g.addColorStop(0.15, "#b5bdc7");
    g.addColorStop(0.35, "#f0f4f8");
    g.addColorStop(0.55, "#a1aab5");
    g.addColorStop(0.75, "#e8ecf2");
    g.addColorStop(1, "#949ea8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);

    // 2. Grana e graffi metallici spazzolati
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * r.height;
      ctx.beginPath();
      ctx.moveTo(Math.random() * r.width * 0.3, y);
      ctx.lineTo(r.width * (0.4 + Math.random() * 0.6), y + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }

    // 3. Stampa i medaglioni dorati "GRATTA QUI" / "🪙" sopra ogni casella
    const righe = Math.ceil(n / colonne);
    const wCell = r.width / colonne;
    const hCell = r.height / righe;

    for (let i = 0; i < n; i++) {
      const col = i % colonne;
      const row = Math.floor(i / colonne);
      const cx = col * wCell + wCell / 2;
      const cy = row * hCell + hCell / 2;
      const radius = Math.min(wCell, hCell) * 0.38;

      // Cerchio esterno metallico
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(220, 180, 50, 0.9)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#8b6508";
      ctx.stroke();

      // Cerchio interno
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 225, 120, 0.95)";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#5e4303";
      ctx.stroke();

      // Scritta "GRATTA"
      ctx.fillStyle = "#3b2a02";
      ctx.font = `bold ${Math.max(9, Math.floor(radius * 0.42))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GRATTA", cx, cy - radius * 0.15);
      ctx.font = `black ${Math.max(8, Math.floor(radius * 0.36))}px sans-serif`;
      ctx.fillText("QUI", cx, cy + radius * 0.28);
    }

    // Imposta la modalità di rimozione vernice per la grattata
    ctx.globalCompositeOperation = "destination-out";
  }, [taglio, esito.eseguita, n, colonne]);

  // Animazione particelle di vernice d'argento grattata
  useEffect(() => {
    if (particelle.length === 0) return;
    const timer = requestAnimationFrame(() => {
      setParticelle((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.3,
            alpha: p.alpha - 0.04,
          }))
          .filter((p) => p.alpha > 0)
      );
    });
    return () => cancelAnimationFrame(timer);
  }, [particelle]);

  function generaParticelle(x: number, y: number) {
    const nuove: Particella[] = [];
    for (let i = 0; i < 4; i++) {
      nuove.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.8) * 3,
        size: Math.random() * 4 + 2,
        alpha: 0.9,
      });
    }
    setParticelle((prev) => [...prev.slice(-20), ...nuove]);
  }

  function controllaScopertura() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dati = ctx.getImageData(0, 0, c.width, c.height).data;
    let vuoti = 0;
    let campionati = 0;
    for (let i = 3; i < dati.length; i += 4 * 35) {
      campionati++;
      if (dati[i] === 0) vuoti++;
    }
    if (campionati > 0 && vuoti / campionati > SOGLIA_SCOPERTURA) {
      scopriTutto();
    }
  }

  function scopriTutto() {
    setScoperto(true);
    setIniziato(true);
    if (esito.vinta) {
      playWin(esito.importo);
    }
  }

  function coordinate(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function grattaA(x: number, y: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const ora = Date.now();
    if (ora - ultimoSuonoScratch.current > 45) {
      playScratch();
      ultimoSuonoScratch.current = ora;
    }

    generaParticelle(x, y);

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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-3 py-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex justify-center w-full"
      >
        <Biglietto taglio={taglio}>
          {/* Contenitore Griglia di Gioco */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl bg-guilloche border-2 border-amber-600/60 p-2 shadow-inner"
          >
            <div className="grid grid-cols-3 gap-2">
              {celle.map((v, i) => {
                const eVincente = scoperto && valoreVincente !== null && v === valoreVincente;
                return (
                  <div
                    key={i}
                    className={`relative flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all duration-300 min-h-[64px] ${
                      eVincente
                        ? "border-amber-400 bg-gradient-to-b from-amber-100 via-amber-200 to-yellow-300 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(255,215,0,0.8)] scale-[1.03] z-10"
                        : "border-amber-900/20 bg-amber-50/60 shadow-sm"
                    }`}
                  >
                    {/* Valore in cifre grandi */}
                    <span className="font-[family-name:var(--font-titolo)] text-[22px] leading-none text-slate-900 drop-shadow-sm">
                      {v === "RIGIOCA" ? (
                        <span className="text-[11px] font-black tracking-wider text-rose-700">
                          RIGIOCA
                        </span>
                      ) : (
                        <>
                          {v}
                          <span className="text-[13px] font-bold ml-0.5">€</span>
                        </>
                      )}
                    </span>

                    {/* Dicitura in italiano stampata in micro-testo sotto */}
                    <span className="mt-1 text-[7.5px] font-black uppercase tracking-wider text-slate-600">
                      {testoImporto(v)}
                    </span>

                    {/* Badge vincente */}
                    {eVincente && (
                      <span className="absolute -top-2 rounded-full bg-amber-500 px-1.5 py-0.2 text-[6.5px] font-black text-black shadow">
                        ★ VINCI ★
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Canvas della vernice argentata da grattare */}
            {!scoperto && (
              <canvas
                ref={canvasRef}
                className="gratta absolute inset-0 h-full w-full cursor-pointer touch-none z-20"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            )}

            {/* Visualizzatore particelle di polvere argentata */}
            {particelle.map((p) => (
              <div
                key={p.id}
                className="pointer-events-none absolute rounded-full bg-slate-300 z-30 shadow-sm"
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  opacity: p.alpha,
                }}
              />
            ))}
          </div>
        </Biglietto>
      </motion.div>

      {/* Tasto "Gratta Tutto" rapido e indicazioni */}
      {!scoperto && (
        <div className="flex flex-col items-center gap-2 z-20">
          {!iniziato && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-oro)] drop-shadow"
            >
              ✨ Strofina il dito sul biglietto per grattare ✨
            </motion.p>
          )}

          <button
            onClick={() => {
              playCoin();
              scopriTutto();
            }}
            className="flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-black/60 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300 shadow-lg backdrop-blur-md transition-all hover:border-amber-400 hover:bg-black/80 active:scale-95"
          >
            <span>🪄</span> Scopri Tutto Subito
          </button>
        </div>
      )}

      {/* Modale Esito Finale del Gioco */}
      {scoperto && <Esitino esito={esito} gioco={taglio} onFine={onFine} onAncora={onAncora} />}
    </div>
  );
}
