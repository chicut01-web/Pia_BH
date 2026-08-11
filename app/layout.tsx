import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Archivo } from "next/font/google";
import "./globals.css";

const titolo = Alfa_Slab_One({ weight: "400", subsets: ["latin"], variable: "--font-titolo" });
const corpo = Archivo({ subsets: ["latin"], variable: "--font-corpo" });

export const metadata: Metadata = {
  title: "Buon compleanno Piuccia 🎂 | La Tabaccheria dei Sogni",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#140c1d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${titolo.variable} ${corpo.variable}`}>
      <body className="min-h-dvh font-[family-name:var(--font-corpo)] antialiased bg-[#0e0818] text-[var(--color-carta)] selection:bg-[var(--color-oro)] selection:text-black">
        {/* Sfondo luxury a tre strati: bagliori oro e cremisi con sfumature vellutate */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(140,20,60,0.35)_0%,rgba(20,12,30,0.95)_60%,rgba(10,5,18,1)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_40%,rgba(255,180,0,0.08)_0%,transparent_50%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 opacity-30 mix-blend-soft-light bg-[radial-gradient(ellipse_at_80%_90%,rgba(0,180,216,0.15)_0%,transparent_60%)]"
        />
        {children}
      </body>
    </html>
  );
}

