# Mišine gun

Více myší. Méně násilí.

Webová hra (canvas + vanilla JS v ES modulech, bez závislostí a bez build kroku). Kočka v helmě obsluhuje kulomet, který místo nábojů střílí myši. Přilétající bugy (hlavy brouků se štítky jako „NPE“, „off by 1“ nebo „jen na produkci“) se po zásahu rozveselí a odletí domů. Když se dostanou až ke kulometu, ubývá mír.

## Spuštění

Kód používá ES moduly, takže je potřeba lokální server (přímé otevření `index.html` přes `file://` prohlížeč zablokuje):

```sh
python3 -m http.server 8080
# http://localhost:8080
```

## PWA

Hra je plnohodnotná PWA (vyžaduje HTTPS nebo `localhost`):

- **Instalace:** na startovní obrazovce se v Chrome a Edge objeví tlačítko „Nainstalovat hru“. Na iPhonu se instaluje přes Sdílet → Přidat na plochu (hra na to upozorní). Po instalaci běží na celou obrazovku na šířku.
- **Offline:** `sw.js` při první návštěvě uloží celou hru včetně fontu a ikon, pak ji servíruje z cache a na pozadí ji obnovuje (stale-while-revalidate). Hláška „Hra je připravená i offline“ potvrdí, že je uloženo.
- **Aktualizace:** při změně `sw.js` (zvyš `VERSION`) se hráči ukáže lišta „Je k dispozici nová verze“ s tlačítkem Obnovit. Stará cache se smaže.
- **Manifest:** `manifest.webmanifest` s ikonami 192 a 512 px (běžné i maskable) a screenshoty pro instalační dialog. Navíc `favicon-32.png` a `apple-touch-icon.png`.
- **Font:** Anton (SIL OFL 1.1, `fonts/OFL.txt`) je hostovaný lokálně, žádné požadavky na cizí servery.
- **Telefon:** obrazovka během hry nezhasne (Screen Wake Lock) a HUD respektuje výřez a zaoblené rohy (`safe-area-inset`).

Při přidání nového souboru ho doplň do seznamu `SHELL` v `sw.js`.

## Ovládání

- Myš / dotyk: míření a palba (držet tlačítko nebo prst); na mobilu nejlépe na šířku
- Mezerník: palba
- P nebo Esc: pauza (hra se pozastaví i při přepnutí záložky)
- M: vypnout / zapnout zvuk

## Pravidla

- Hlaveň se při souvislé palbě přehřívá. Přehřátá hlaveň chvíli nestřílí, střílej v dávkách.
- Každých pár sekund se do pásu nabije zlatá myš, která proletí všemi bugy a dává trojnásobné poškození.
- Vlny mají pevný počet bugů. Po vyčištění vlny je 4 s přestávka, doplní se pás a hlaveň vychladne.
- Každá pátá vlna je boss „PROD DOWN“: obří bug s vlastním ukazatelem zdraví a hláškami.
- Každý rozveselený bug vrací trochu míru a zvyšuje kombo (násobitel skóre); kombo se resetuje při průniku.
- Nejlepší skóre se ukládá do localStorage.

### Bugy

| Typ | Od vlny | Myší | Mír při průniku | Zvláštnost |
| --- | --- | --- | --- | --- |
| běžný bug | 1 | 1 | -10 % | |
| kritický P0 (červený, přilba) | 2 | 3 | -20 % | |
| regrese (křídla) | 3 | 1 | -7 % | rychlá |
| duplicate (tyrkysový) | 4 | 1 | -8 % | po zásahu se rozdělí na dva malé |
| cache (olivový, šipka) | 4 | 1 | -8 % | po rozveselení se za 2,5 s vrátí jako „stale cache“ |
| heisenbug (modrý) | 5 | 1 | -9 % | mizí a objevuje se jinde, neviditelný nejde zasáhnout |
| boss PROD DOWN | každá 5. | 15+ | -40 % | |

## Struktura

- `index.html`, `style.css` – kostra a styly
- `src/main.js` – bootstrap, vstup, obrazovky (start, pauza, konec), PWA
- `src/state.js` – sdílený stav, konstanty, typy bugů
- `src/entities.js` – herní logika: vlny, spawn, střelba, kolize, částice
- `src/render.js` – kreslení scény, kočky, kulometu, myší a bugů
- `src/hud.js` – HUD a cedule s názvem
- `src/audio.js` – syntetizované zvuky a ambient (WebAudio, bez souborů)
- `manifest.webmanifest`, `sw.js`, `icons/`, `screenshots/`, `fonts/` – PWA, ikony, screenshoty pro instalaci, lokální font

Respektuje `prefers-reduced-motion` (vypne otřesy obrazovky a zpomalení času při zásahu).
