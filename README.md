# Mišine gun

Více myší. Méně násilí.

Webová hra v jednom souboru (`index.html`, canvas + vanilla JS, bez závislostí). Kočka v helmě obsluhuje kulomet, který místo nábojů střílí myši. Přilétající bugy (hlavy brouků se štítky jako „NPE“, „off by 1“ nebo „jen na produkci“) se po zásahu rozveselí a odletí domů. Když se dostanou až ke kulometu, ubývá mír.

## Spuštění

Stačí otevřít `index.html` v prohlížeči, nebo:

```sh
python3 -m http.server 8080
# http://localhost:8080
```

## Ovládání

- Myš / dotyk: míření a palba (držet tlačítko nebo prst); na mobilu nejlépe na šířku
- Mezerník: palba
- M: vypnout / zapnout zvuk

## Pravidla

- Běžný bug: 1 myš, při průniku -10 % míru
- Kritický bug P0 (od 2. vlny, červený s přilbou): 3 myši, při průniku -20 % míru
- Rychlá regrese (od 3. vlny, s křídly): 1 myš, ale rychlá, při průniku -7 % míru
- Každý rozveselený bug vrací trochu míru a zvyšuje kombo (násobitel skóre); kombo se resetuje při průniku
- Munice (myši) se průběžně doplňuje, nejlepší skóre se ukládá do localStorage
