# Mišine gun

Více myší. Méně násilí.

Webová hra v jednom souboru (`index.html`, canvas + vanilla JS, bez závislostí). Kočka v helmě obsluhuje kulomet, který místo nábojů střílí myši. Přilétající mrzouti se po zásahu rozveselí a odletí domů. Když se dostanou až ke kulometu, ubývá mír.

## Spuštění

Stačí otevřít `index.html` v prohlížeči, nebo:

```sh
python3 -m http.server 8080
# http://localhost:8080
```

## Ovládání

- Myš / dotyk: míření a palba (držet tlačítko)
- Mezerník: palba
- M: vypnout / zapnout zvuk

## Pravidla

- Malý mrzout: 1 myš, při průniku -10 % míru
- Velký mrzout (od 2. vlny): 3 myši, při průniku -20 % míru
- Rychlý mrzout (od 3. vlny): 1 myš, ale rychlý, při průniku -7 % míru
- Každý rozveselený mrzout vrací trochu míru a zvyšuje kombo (násobitel skóre); kombo se resetuje při průniku
- Munice (myši) se průběžně doplňuje, nejlepší skóre se ukládá do localStorage
