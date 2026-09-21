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

- Myš: míření kurzorem, palba držením tlačítka
- Dotyk: drž prst kdekoli a táhni nahoru nebo dolů. Hlaveň se naklání podle pohybu prstu od místa, kam dopadl (celý rozsah je 40 % výšky displeje). Tečkovaná čára ukazuje dráhu myší. Na mobilu nejlépe na šířku.
- Přebití: klávesa R, nebo ťuknutí na bednu s municí pod kulometem. Podržení na bedně normálně střílí.
- Mezerník: palba
- P nebo Esc: pauza (hra se pozastaví i při přepnutí záložky)
- M: vypnout / zapnout zvuk
- H: vypnout / zapnout hudbu. Hlasitost hudby a efektů se nastavuje zvlášť posuvníky na úvodní obrazovce, v pauze a po konci hry.

## Pravidla

- Hlaveň se při souvislé palbě přehřívá. Přehřátá hlaveň chvíli nestřílí, střílej v dávkách.
- Pás má 40 myší a sám se nedoplňuje. Nabije se (1,8 s), když úplně dojde, nebo když ho přebiješ ručně. Ruční přebití zahodí zbytek pásu.
- Šetřená hlaveň chladne rychleji než přehřátá, takže dávky se vyplácí víc než střelba do přehřátí.
- Každých pár sekund se do pásu nabije zlatá myš, která proletí všemi bugy a dává trojnásobné poškození.
- Vlny mají pevný počet bugů. Po vyčištění vlny si vybereš jedno ze tří vylepšení (delší pás, chladič, rychlé nabíjení, zlatý chov, kadence, dvojitá hlaveň, mírová jednání, code freeze, CI pipeline), pak je krátká přestávka.
- Každá pátá vlna je boss. Střídají se PROD DOWN, LEGACY MONOLITH (sype ze sebe staré bugy jako jQuery a IE6) a MEMORY LEAK (roste a léčí se, když do něj nestřílíš). S každým kolem mají víc životů.
- Každý rozveselený bug vrací trochu míru a zvyšuje kombo (násobitel skóre); kombo se resetuje při průniku.
- Pět nejlepších výsledků se jménem se ukládá do localStorage (jen v tomto prohlížeči).

### Bugy

| Typ | Od vlny | Myší | Mír při průniku | Zvláštnost |
| --- | --- | --- | --- | --- |
| běžný bug | 1 | 1 | -10 % | |
| kritický P0 (červený, přilba) | 2 | 3 | -20 % | |
| regrese (křídla) | 3 | 1 | -7 % | rychlá |
| duplicate (tyrkysový) | 4 | 1 | -8 % | po zásahu se rozdělí na dva malé |
| cache (olivový, šipka) | 4 | 1 | -8 % | po rozveselení se za 2,5 s vrátí jako „stale cache“ |
| heisenbug (modrý) | 5 | 1 | -9 % | mizí a objevuje se jinde, neviditelný nejde zasáhnout |
| boss | každá 5. | 45 až 70, +25 za kolo | -40 % | tři druhy, viz výše |

## Struktura

- `index.html`, `style.css` – kostra a styly
- `src/main.js` – bootstrap, vstup, obrazovky (start, pauza, konec), PWA
- `src/state.js` – sdílený stav, konstanty, typy bugů
- `src/entities.js` – herní logika: vlny, spawn, střelba, kolize, částice
- `src/render.js` – kreslení scény, kočky, kulometu, myší a bugů
- `src/hud.js` – HUD a cedule s názvem
- `src/scores.js` – lokální tabulka top 5
- `tools/balance.mjs` – simulace vyvážení
- `src/audio.js` – syntetizované zvuky, ambient a hudba (WebAudio, bez souborů). Hudba má dvě skladby na šestnáctinové mřížce. Pochod graduje v pěti stupních podle vlny (přibývají nástroje, tempo, transpozice, od 7. vlny moll). Boss má vlastní skladbu v a moll s ostinátním basem a finále pod 35 % jeho životů. Při míru pod 30 % se přidá tlukot srdce.
- `manifest.webmanifest`, `sw.js`, `icons/`, `screenshots/`, `fonts/` – PWA, ikony, screenshoty pro instalaci, lokální font

## Vyvážení

`node tools/balance.mjs 30` odehraje hry třemi boty (začátečník, průměrný, zkušený) přímo nad herní logikou a vypíše, do které vlny se dostali. Parametry obtížnosti jsou v `BALANCE` v `src/state.js` a jdou zkoušet bez úprav kódu:

```sh
B='{"spawnPerWave":0.5,"armorEvery":7}' node tools/balance.mjs 24
```

Aktuální nastavení dává medián zhruba: začátečník vlna 9, průměrný 13, zkušený 14 až 17. Boti jsou hrubý model (šum v míření, váhání, výběr cíle), skutečné hraní může vyjít jinak.

Respektuje `prefers-reduced-motion` (vypne otřesy obrazovky, zpomalení času při zásahu a vibrace). Na telefonech s podporou vibruje při průniku, přehřátí a u bossů.
