/** L'insegna delle tabaccheria italiana: la T neon su targa blu re-immaginata. */
export default function InsegnaT() {
  return (
    <div className="relative group cursor-pointer">
      {/* Glow halo esterno */}
      <div className="absolute -inset-2 rounded-[14px] bg-[radial-gradient(circle,rgba(37,99,235,0.6)_0%,transparent_75%)] opacity-80 blur-md group-hover:opacity-100 transition-opacity" />
      
      {/* Placca principale dell'insegna */}
      <div className="neon-t relative flex h-[68px] w-[68px] items-center justify-center rounded-[10px] bg-gradient-to-br from-[#1d4ed8] via-[#1e40af] to-[#0f172a] p-1 shadow-2xl ring-2 ring-[var(--color-oro)]/80 transition-transform active:scale-95 group-hover:scale-105">
        <div className="flex h-full w-full items-center justify-center rounded-[7px] border border-white/20 bg-gradient-to-b from-blue-600/40 to-transparent">
          <span className="font-[family-name:var(--font-titolo)] text-[34px] leading-none text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] tracking-tight">
            T
          </span>
        </div>
      </div>
    </div>
  );
}

