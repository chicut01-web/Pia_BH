#!/usr/bin/env node
/** Ritaglia i biglietti generati e misura dov'è il pannello argentato.
 *
 *  Serve perché la griglia dei numeri e il canvas da grattare devono stare esattamente sopra
 *  l'argento stampato sul biglietto. Indovinare a occhio quei bordi è il modo sicuro di far
 *  sembrare finto tutto il resto: basta un paio di pixel di scarto e la carta non torna.
 *
 *  Il risultato finisce in lib/biglietti.ts come frazioni del lato, così è indipendente dalla
 *  risoluzione a cui l'immagine viene poi servita.
 *
 *  Uso: node scripts/biglietti.mjs <sorgente.png> <nome-uscita>
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const [src, nome] = process.argv.slice(2);
if (!src || !nome) {
  console.error("uso: node scripts/biglietti.mjs <sorgente.png> <nome-uscita>");
  process.exit(1);
}

const LARG = 400;
const SOGLIA_FONDO = Number(process.env.SOGLIA_FONDO ?? 95); // quanto un pixel deve discostarsi dal fondo per essere carta // risoluzione di analisi: basta e avanza per trovare dei bordi netti

/** Legge l'immagine come RGB grezzo a larghezza nota. */
function leggi(file, larg) {
  const out = execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-i", file, "-vf", `scale=${larg}:-1`,
     "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    { maxBuffer: 1 << 28 },
  );
  const alt = out.length / (larg * 3);
  if (!Number.isInteger(alt)) throw new Error("dimensioni inattese");
  return { dati: out, larg, alt };
}

const px = (img, x, y) => {
  const i = (y * img.larg + x) * 3;
  return [img.dati[i], img.dati[i + 1], img.dati[i + 2]];
};

const img = leggi(src, LARG);

// 1. Bordi della carta: il fondo è il colore dei quattro angoli, tutto ciò che se ne discosta
//    abbastanza è biglietto.
const angoli = [
  px(img, 2, 2),
  px(img, img.larg - 3, 2),
  px(img, 2, img.alt - 3),
  px(img, img.larg - 3, img.alt - 3),
];
const fondo = [0, 1, 2].map((c) => angoli.reduce((s, a) => s + a[c], 0) / angoli.length);
const lontanoDalFondo = (p) =>
  Math.abs(p[0] - fondo[0]) + Math.abs(p[1] - fondo[1]) + Math.abs(p[2] - fondo[2]) > SOGLIA_FONDO;

/** Rettangolo della macchia connessa più grande fra i pixel per cui `dentro` è vero, scartando
 *  le macchie di forma irregolare.
 *
 *  Serve due volte: per isolare la carta dal piano su cui è fotografata, e per trovare il
 *  pannello argentato dentro la carta. In entrambi i casi il bersaglio è un rettangolo pieno,
 *  e in entrambi i casi il semplice bounding box di tutti i pixel candidati sbaglia — basta un
 *  riflesso o una venatura del legno lontano dal soggetto per allargarlo a tutta l'immagine. */
function macchiaPiena(larg, alt, dentro, pienezzaMin) {
  const mappa = new Uint8Array(larg * alt);
  for (let y = 0; y < alt; y++)
    for (let x = 0; x < larg; x++) if (dentro(x, y)) mappa[y * larg + x] = 1;

  const visti = new Uint8Array(larg * alt);
  const coda = new Int32Array(larg * alt);
  let best = null, bestN = 0;

  for (let s = 0; s < larg * alt; s++) {
    if (!mappa[s] || visti[s]) continue;
    let testa = 0, fine = 0;
    coda[fine++] = s;
    visti[s] = 1;
    let ax0 = larg, ay0 = alt, ax1 = 0, ay1 = 0, n = 0;

    while (testa < fine) {
      const p = coda[testa++];
      const x = p % larg, y = (p / larg) | 0;
      n++;
      if (x < ax0) ax0 = x;
      if (x > ax1) ax1 = x;
      if (y < ay0) ay0 = y;
      if (y > ay1) ay1 = y;
      if (x > 0 && mappa[p - 1] && !visti[p - 1]) { visti[p - 1] = 1; coda[fine++] = p - 1; }
      if (x < larg - 1 && mappa[p + 1] && !visti[p + 1]) { visti[p + 1] = 1; coda[fine++] = p + 1; }
      if (y > 0 && mappa[p - larg] && !visti[p - larg]) { visti[p - larg] = 1; coda[fine++] = p - larg; }
      if (y < alt - 1 && mappa[p + larg] && !visti[p + larg]) { visti[p + larg] = 1; coda[fine++] = p + larg; }
    }

    if (n / ((ax1 - ax0 + 1) * (ay1 - ay0 + 1)) < pienezzaMin) continue;
    if (n > bestN) {
      bestN = n;
      best = { x0: ax0, y0: ay0, x1: ax1, y1: ay1, n };
    }
  }
  return best;
}

const carta = macchiaPiena(
  img.larg,
  img.alt,
  (x, y) => lontanoDalFondo(px(img, x, y)),
  0.45,
);
if (!carta || carta.n < (img.larg * img.alt) / 12) {
  console.error("carta non trovata nella foto: rigenerare il biglietto");
  process.exit(2);
}
const { x0: cx0, y0: cy0, x1: cx1, y1: cy1 } = carta;

// 2. Pannello argentato: dentro la carta, pixel chiari e quasi senza tinta. Si cerca riga per
//    riga e colonna per colonna la fascia continua più larga, invece del semplice bounding box
//    di tutti i pixel grigi: cosi' un riflesso chiaro sul bordo non allarga l'area.
const argenteo = (p) => {
  const max = Math.max(...p), min = Math.min(...p);
  return max > 120 && max - min < 26;
};

const cw = cx1 - cx0, ch = cy1 - cy0;

// Componente connessa più grande fra i pixel argentei, e il suo rettangolo.
//
// I profili per riga e per colonna non funzionano qui: il pannello copre circa metà
// dell'altezza, quindi una colonna che lo attraversa ha ~50% di pixel argentei e qualunque
// soglia finisce per cadere proprio lì, dove il rumore decide il risultato. La componente
// connessa non ha soglie da tarare — o i pixel si toccano, o no.
const pannello = macchiaPiena(
  cw + 1,
  ch + 1,
  (x, y) => argenteo(px(img, cx0 + x, cy0 + y)),
  0.85,
);
if (!pannello || pannello.n < ((cw + 1) * (ch + 1)) / 8) {
  console.error("pannello argentato non trovato: rigenerare il biglietto");
  process.exit(2);
}
const { x0: rx0, y0: ry0, x1: rx1, y1: ry1 } = pannello;

// Frazioni rispetto alla carta ritagliata, con un filo di margine verso l'interno per non
// lasciare scoperto il bordo stampato dell'argento.
const M = 0.004;
const area = {
  x: (rx0 / cw) + M,
  y: (ry0 / ch) + M,
  w: (rx1 - rx0) / cw - M * 2,
  h: (ry1 - ry0) / ch - M * 2,
};

// 3. Ritaglia la carta e la salva.
const scala = 1 / LARG;
const orig = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0",
  "-show_entries", "stream=width,height", "-of", "csv=p=0", src]).toString().trim().split(",");
const OW = Number(orig[0]);
const k = OW * scala;

mkdirSync("public/assets/img", { recursive: true });
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", src,
  "-vf", `crop=${Math.round(cw * k)}:${Math.round(ch * k)}:${Math.round(cx0 * k)}:${Math.round(cy0 * k)}`,
  "-frames:v", "1", `/tmp/_bgl_${nome}.png`, "-y"]);
execFileSync("cwebp", ["-quiet", "-q", "88", `/tmp/_bgl_${nome}.png`, "-o", `public/assets/img/${nome}.webp`]);

// 4. Provino di controllo: l'area rilevata disegnata sopra il biglietto ritagliato. I numeri da
//    soli non dicono se il rettangolo è quello giusto — questo sì, a colpo d'occhio.
const PW = Math.round(cw * k), PH = Math.round(ch * k);
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", `/tmp/_bgl_${nome}.png`,
  "-vf", `drawbox=x=${Math.round(area.x * PW)}:y=${Math.round(area.y * PH)}:` +
         `w=${Math.round(area.w * PW)}:h=${Math.round(area.h * PH)}:color=magenta@0.9:t=5`,
  "-frames:v", "1", `/tmp/_prova_${nome}.png`, "-y"]);

console.log(JSON.stringify({ nome, area }, null, 2));
writeFileSync(`/tmp/_area_${nome}.json`, JSON.stringify(area));
