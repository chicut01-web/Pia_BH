# Compleanno Maria Pia — sito con minigiochi

**Data:** 2026-08-07
**Scadenza:** 3 giorni
**Stato:** in implementazione

## Obiettivo

Sito-regalo per il compleanno di Maria Pia ("Piuccia"). Simula una tabaccheria: lei riceve
100 **Piuccine** (valuta finta) da spendere in gratta e vinci, slot e ruota della fortuna.
Ogni vincita è in **euro veri** e si accumula in una cassa separata: quel totale è il regalo
effettivo, da usare per la loro prossima vacanza.

Il sito promette "puoi vincere fino a 50€". Il totale reale è predeterminato e più basso —
la delusione controllata è voluta, è ciò che rende l'esperienza credibile.

## Vincoli

- **Mobile-first.** Il gratta e vinci si gratta col dito. Il desktop è secondario.
- **Il totale vinto deve essere esatto e deterministico**, qualunque cosa lei giochi e in
  qualunque ordine. Il caso è teatro.
- **Deve sembrare vero.** Serie di perdite, vincite non tonde, alternanza credibile.
- **Nessun backend.** Stato locale, deploy statico.
- 3 giorni di lavoro, asset curati.

## Modello economico

Due portafogli separati e visivamente distinti:

| Portafoglio | Parte da | Direzione | Natura |
|---|---|---|---|
| **Piuccine** | 100 | scende | Valuta finta. Carburante. Non è sua |
| **Cassa vincite** | 0€ | sale | Euro veri. Il regalo |

Costi di gioco:

| Gioco | Costo |
|---|---|
| Slot | 1 Piuccina |
| Ruota | 1 Piuccina |
| Gratta e vinci piccolo | 2 |
| Gratta e vinci medio | 3 |
| Gratta e vinci grande | 5 |

Il cambio Piuccine→euro non è mai dichiarato, così non può calcolare quanto manca.

**Fine sessione:** quando il saldo scende sotto 1 Piuccina (la giocata minima). Non esiste un
bottone "smetti" — la sessione muore da sola, come nella realtà. Sessione stimata: ~40 giocate,
10-15 minuti, interrompibile e riprendibile.

## Motore truccato

Il cuore del progetto. Vive in `lib/engine.ts`, è una funzione pura, non conosce la UI.

Ogni giocata il motore decide l'esito **prima** dell'animazione. L'animazione poi recita
quell'esito: le caselle del gratta e vinci, i rulli della slot e lo spicchio della ruota
vengono costruiti a ritroso a partire dal risultato già deciso.

### Algoritmo

Stato: `piuccine`, `vinto`, `perditeConsecutive`, `vinciteConsecutive`, `bonusGrossoErogato`.

Ad ogni giocata di costo `C`:

1. Scala `C` dalle Piuccine.
2. Calcola `progresso = 1 - piuccine / BUDGET_INIZIALE` → da 0 a 1.
3. Calcola il bersaglio corrente sulla curva:
   `vintoAtteso = TARGET * curva(progresso)`
   La curva parte piatta (le prime giocate perdono, come nella realtà), sale nel mezzo con un
   gradino netto — è lì che cade la vincita grossa — e si appiattisce verso il target sul
   finale.
4. `gap = vintoAtteso - vinto`.
5. `gap <= 0` → perdita. `gap > 0` → vincita di importo derivato dal gap più rumore casuale.
6. Applica i vincoli di credibilità (sotto).
7. Se dopo questa giocata il saldo scenderà sotto 1 Piuccina, questa è **l'ultima**: la
   vincita viene forzata a `TARGET - vinto`, comunque vada. Il conto chiude esatto.

### Vincoli di credibilità

- Le perdite consecutive ammesse dipendono dal punto della sessione: fino a **12** quando
  resta molto budget, fino a **5** verso la fine. Superato il limite, la giocata successiva
  esce **RIGIOCA**: biglietto gratis.

  RIGIOCA non paga euro — restituisce le Piuccine della giocata. Spezza la serie di perdite
  senza toccare i 27€, ed è quello che fanno i gratta e vinci veri.

  Serve perché l'aritmetica non lascia scelta. Il premio diviso per il numero di giocate fa
  circa 0,27€ a giocata: qualsiasi regola del tipo "ogni tanto deve vincere dei soldi" collide
  con quel tetto. Con le consolazioni in denaro le sole briciole si mangiavano due terzi del
  premio, il colpo grosso finiva di esaurirlo, e la sessione arrivava al totale molto prima
  della fine restando poi morta. Il biglietto gratis scioglie il vincolo invece di aggirarlo:
  il premio resta interamente per il colpo grosso e le vincite ordinarie.

- Massimo **2 vincite consecutive** → la terza forza una perdita. RIGIOCA non conta come
  vincita ai fini di questa regola: non è denaro.
- Le prime 3 giocate perdono sempre. Deve capire subito che si può perdere.
- Importi mai tondi. Interi da 1 a 12, esclusi i multipli di 5.
- **Una sola vincita grossa** (da 8€ in su), piazzata con jitter casuale attorno a metà sessione.
  È il picco emotivo. Non si ripete.
- Il gratta e vinci da 5 Piuccine vince più spesso e paga di più — come nella realtà.
- `vinto` non supera mai `TARGET`.

### Test — il vincolo non negoziabile

10.000 simulazioni con sequenze di giocate casuali (giochi e ordini diversi). In tutte:
`vinto === TARGET` a fine sessione. Nessuna eccezione.

Test secondari: distribuzione delle perdite realistica, nessuna vincita tonda, esattamente
una vincita ≥8€, prime 3 giocate sempre perdenti.

## I tre giochi

Ognuno riceve dal motore un `Esito` — `{ vinta, importo, rigioca, eseguita }` — e costruisce
la propria rappresentazione a ritroso. Gli esiti da mettere in scena sono **tre**: vincita in
euro, perdita, e RIGIOCA (biglietto gratis). Quando `eseguita` è `false` il saldo non bastava
e non va animato nulla.

**Gratta e vinci** — 3 tagli (2 / 3 / 5 Piuccine), rispettivamente 6, 9 e 12 caselle.
Canvas HTML5 con strato argento cancellato al tocco; il premio si rivela sotto. Soglia di
scopertura al 60% → rivela tutto in automatico. Vincita = tre simboli uguali. Perdita =
nessun tris, ma con un "quasi" (due uguali) per il brivido.

Nomi dei biglietti: **Piuccia d'Oro** (2), **KitKat Fortunato** (3), **Vacanza Misteriosa** (5).

**Slot** — 1 Piuccina, 3 rulli. Simboli: la faccia di Maria Pia, KitKat (che è Christian),
cuore, aereo, quadrifoglio, torta. Tre Piuccia = jackpot. Rulli con arresto sfalsato e
frenata finale; il terzo rullo rallenta sempre, anche quando perde.

**Ruota** — 1 Piuccina, 8 spicchi: cinque premi, due "Ritenta", uno "Bonus Piuccia".
Rotazione con easing e assestamento finale. Gli spicchi portano i vostri soprannomi.

## Flusso

1. **Cancello** — schermata con codice d'accesso. Una parola vostra. Blocca l'URL a chiunque altro.
2. **Intro** — foto guancia a guancia, auguri, "hai 100 Piuccine — puoi vincere fino a 50€".
3. **Tabaccheria** — hub. In alto i due contatori: Piuccine che scendono, cassa vincite che sale.
   Tre banchi: gratta e vinci (apre la scelta del taglio), slot, ruota. Sfondo controluce sfocato.
4. **Gioco** — si gioca, si torna all'hub.
5. **Finale** — a Piuccine esaurite: totale vinto, carosello di foto, chiusura sulla foto in
   barca con il messaggio della vacanza.

## Asset

Generati con Higgsfield (`generate_image`, `remove_background`), ~15 immagini:

- 3 fronti gratta e vinci, estetica Lotteria italiana con i nomi vostri
- Texture argento da grattare
- 6 simboli slot — uno è il viso di Maria Pia ritagliato in locale, cinque generati
- Ruota della fortuna
- Sfondo tabaccheria
- Cornice della schermata finale

Foto selezionate dall'archivio (254 file), con orientamento EXIF corretto:

| Ruolo | File |
|---|---|
| Finale / hero | `Photos-1-001 (2)/IMG_20260625_162704.jpg` |
| Intro | `Photos-1-001 (1)/IMG_20260412_125402.jpg` |
| Carosello | `Photos-1-001 (2)/IMG_20260622_185613.jpg` |
| Carosello | `Photos-1-001 (1)/IMG_20260622_185616.jpg` |
| Sfondo finale | `Photos-1-001 (2)/IMG_20260625_162729.jpg` |
| Carosello | `Photos-1-001/IMG_20260625_162732.jpg` |
| Sfondo tabaccheria | `Photos-1-001 (1)/IMG_20260410_174454.jpg` |
| Simbolo slot | `Photos-1-001 (2)/IMG_20260301_180926.jpg` |

## Stack

Next.js 16 (App Router) · Tailwind v4 · Framer Motion · Canvas per il gratta e vinci ·
nessun backend · deploy Vercel.

Stato in `localStorage` sotto `pia-compleanno-v1`: `{ piuccine, vinto, storico, sbloccato }`.
Può chiudere e riprendere. Reset nascosto per i test: cinque tap sul logo dell'hub.

## Struttura

```
lib/config.ts      TARGET, budget, costi, codice d'accesso
lib/engine.ts      motore truccato — puro, testato
lib/engine.test.ts le 10.000 simulazioni
components/Gate.tsx Intro.tsx Hub.tsx Gratta.tsx Slot.tsx Ruota.tsx Finale.tsx
app/page.tsx       macchina a stati fra le schermate
public/assets/
```

Il motore non importa nulla dalla UI. I giochi non contengono logica economica: chiedono
l'esito e lo mettono in scena. Confine netto, testabile in isolamento.

## Config

- `TARGET = 27` (euro)
- `BUDGET_INIZIALE = 100` (Piuccine)
- `CODICE_ACCESSO = "Piuccia"` — confronto case-insensitive, spazi ignorati.
  Sul cancello un indizio: "come ti chiamo io?"

### Nota sul cancello

Il codice è controllato lato client: ferma chi apre il link per curiosità, non chi legge il
sorgente della pagina. Le foto restano file statici raggiungibili se si indovina l'URL. Per il
caso d'uso — un link mandato a una persona sola — è sufficiente. Se serve protezione vera,
l'alternativa è la Deployment Protection di Vercel, che mette la password davanti all'intero
deployment prima che qualunque file venga servito.
