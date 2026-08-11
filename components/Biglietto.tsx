"use client";

import type { ReactNode } from "react";

export default function Biglietto({
  nome,
  costo,
  children,
}: {
  nome: string;
  costo: number;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full max-w-[22rem] overflow-hidden rounded-2xl border-2 border-[var(--color-oro)] bg-gradient-to-b from-[var(--color-carta)] via-[var(--color-carta-scura)] to-[var(--color-carta-ombra)] p-1 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]">
      <div className="relative overflow-hidden rounded-xl bg-[var(--color-carta)] p-3">
        {/* Testata oro/cremisi del biglietto */}
        <div className="relative flex items-stretch overflow-hidden rounded-lg bg-gradient-to-r from-[var(--color-cremisi-scuro)] to-[var(--color-cremisi)] text-[var(--color-carta)] shadow-md">
          <div className="flex-1 px-3.5 py-2.5">
            <div className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--color-oro)]">
              Gratta e Vinci VIP
            </div>
            <h2 className="font-[family-name:var(--font-titolo)] text-[20px] leading-tight text-white drop-shadow">
              {nome}
            </h2>
          </div>
          <div className="foglia-oro flex w-[64px] shrink-0 flex-col items-center justify-center text-[#2b0808]">
            <span className="font-[family-name:var(--font-titolo)] text-[26px] leading-none">
              {costo}
            </span>
            <span className="text-[8px] font-extrabold uppercase tracking-[0.14em]">Piuccine</span>
          </div>
        </div>

        {/* Area di gioco (griglia e argento) */}
        <div className="relative my-3">{children}</div>

        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-inchiostro)]/50 pt-1 border-t border-[var(--color-carta-ombra)]">
          <span>Trova i numeri uguali</span>
          <span>Serie PIA · 2026</span>
        </div>
      </div>
    </div>
  );
}

