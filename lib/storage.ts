import type { Stato } from "./engine";

export const CHIAVE = "pia-compleanno-v1";

export type Salvataggio = {
  stato: Stato;
  sbloccato: boolean;
  introVista: boolean;
};

function valido(x: unknown): x is Salvataggio {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  if (typeof s.sbloccato !== "boolean" || typeof s.introVista !== "boolean") return false;
  const st = s.stato as Record<string, unknown> | undefined;
  if (typeof st !== "object" || st === null) return false;
  return (
    typeof st.piuccine === "number" &&
    typeof st.vinto === "number" &&
    typeof st.giocate === "number" &&
    typeof st.seed === "number" &&
    typeof st.passiRng === "number"
  );
}

export function carica(): Salvataggio | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHIAVE);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return valido(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function salva(s: Salvataggio): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(s));
  } catch {
    // storage pieno o disabilitato: la sessione prosegue solo in memoria
  }
}

export function azzera(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    // storage pieno o disabilitato: la sessione prosegue solo in memoria
  }
}
