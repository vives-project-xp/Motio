# Lasersnijbestanden en generator

## Wat is dit?
De bestanden die naar de lasersnijder gaan, en de Python-**generator** die ze maakt.

## Waarom een generator?
De maten van de kast veranderden meermaals. Met een generator pas je één getal aan in [config.py](generator/config.py) en maak je alle bestanden opnieuw. De vingerverbindingen worden zo automatisch berekend en passen altijd.

## Inhoud
| Bestand of map | Wat is het? |
|---|---|
| `1_doos_met_motorgaten.svg/.dxf` | Alle panelen van de kast met vingerverbindingen, sleuven voor het paneel en motorgaten |
| `2_plateau.svg/.dxf` | Het ronde plateau (Ø210 mm) dat het papier draagt |
| `montage_bovenaanzicht.svg` | Alleen ter controle: deksel met motoren en krukcirkels. **Niet snijden.** |
| [generator/](generator/) | De code die bovenstaande bestanden maakt |

Genereren: `cd generator` en dan `python main.py ..` (zie [BoxV3](../README.md#lasersnijbestanden-genereren)).

## Opbouw van de generator
```mermaid
flowchart TD
    main["main.py<br/>startpunt"] --> config["config.py<br/>alle maten"]
    main --> layout["layout/<br/>plaatst de 3 motoren, controleert of alles past"]
    main --> parts["parts/<br/>kastpanelen en plateau op een plaat leggen"]
    parts --> boxdesign["BoxV3/box_design/<br/>gedeeld met Fusion-script"]
    parts --> geometry["geometry/<br/>basisvormen als SVG-pad"]
    main --> export["export/<br/>schrijft SVG en DXF"]
```

| Map | Verantwoordelijkheid |
|---|---|
| `../box_design/` | Berekent de panelen van de kast en hun vingerverbindingen. Gedeeld met het Fusion-script, zie [box_design](../box_design/README.md). |
| `layout/` | Plaatst de motoren op het deksel. Stopt met een melding als iets niet past. |
| `parts/` | Zet de panelen en het plateau plat op een snijplaat |
| `geometry/` | Basisvormen (lijnen, cirkels) als SVG-pad |
| `export/` | Schrijft het resultaat naar SVG en DXF. In de DXF staat enkel snijwerk. |
| `test_sync.py` | Test dat de generator en het Fusion-script dezelfde kast beschrijven |

## Let op
- De kastopbouw (`box_design/`) staat maar **één keer**, in `BoxV3/box_design`. Het Fusion-script en deze generator gebruiken dezelfde code. Enkel `config.py` bestaat in beide, omdat Fusion andere eenheden en assen gebruikt; `test_sync.py` controleert dat de maten gelijk blijven.
- Er is geen kerfcompensatie van de lasersnijder ingebouwd.
