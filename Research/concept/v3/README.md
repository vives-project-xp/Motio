# Box V3 – stappenmotoren

Box V3 vervangt de tandwielaandrijving van [V2](https://github.com/vives-project-xp/Motio/tree/archive/Research/concept/v2) door de aandrijving van Ward's simulator [SIMV7](../../../Software/WARD-SIM/SIMV7/README.md): drie stappenmotoren (SY42STH38-1684A) met de flens tegen de onderkant van het deksel. Motor A en B draaien elk een kruk van 65 mm met een arm (180 en 160 mm), motor C draait het plateau met het papier. De kast blijft de V2-kast van 4 mm MDF (twee compartimenten), maar kleiner: 343 × 304 mm in plaats van 358 × 408 mm en het [bedieningspaneel](../../../Hardware/Bedieningspaneel/README.md) hangt er nog steeds aan.

## Indeling

- `lasersnij/generator/` – Python-generator voor de lasersnijbestanden van de kast en het plateau.
- `fusion/CycloidDrawerV3/` – Fusion 360-script dat het volledige model opbouwt.

De armen, krukken, bussen, penas en lagers zijn de PLA-onderdelen van SIMV7 en worden niet opnieuw gemaakt. Maten en montagevolgorde staan in [SIMV7/DESIGN.md](../../../Software/WARD-SIM/SIMV7/DESIGN.md), de STL-bestanden in `Software/WARD-SIM/SIMV7/exports`.

## Lasersnijbestanden genereren

```bash
cd lasersnij/generator
python main.py ..
```

Schrijft naar de map die je opgeeft:

- `1_doos_met_motorgaten.svg` – alle kastpanelen met vingerverbindingen, de haaksleuven voor het paneel en de motorgaten in het deksel.
- `2_plateau.svg` – plateau Ø210 van 4 mm. Verzink de vier boutgaten na het snijden met de echte schroeven.
- `montage_bovenaanzicht.svg` – bovenaanzicht van het deksel met motoren, krukcirkels en plateau. Alleen ter controle, niet snijden.

Alle maten staan in [config.py](lasersnij/generator/config.py). De generator stopt met een melding als een motor of het plateau niet binnen het deksel past.

## Fusion-model maken

1. Fusion 360 → Utilities → Add-Ins → Scripts and Add-Ins → **+** → *Script from my computer*.
2. Kies de map `fusion/CycloidDrawerV3` en klik *Run*.

Het script bouwt het model in de thuisstand van SIMV7 en biedt daarna een animatie aan (zie hieronder). De maten staan in [cycloid/config.py](fusion/CycloidDrawerV3/cycloid/config.py). Houd die gelijk met `lasersnij/generator/config.py` en `wedge_mount.py` in beide mappen; `python -m unittest` in `lasersnij/generator` controleert de kastmaten en motorposities.

## Animatie voor video

Na het bouwen vraagt het script of het de animatie moet afspelen. Het script draait de twee krukken en het plateau; de armen en de pen volgen via echte Fusion-joints (as-built revolute joints in de kruk- en armgaten, plus rigid groups voor pennen, pen en papier). De pen tekent een roos op het papier. Start eerst je schermopname; het script zet de camera in een isometrisch beeld.

Aantal beelden, platterrondes en de vorm van de roos staan onder *Animation* in [cycloid/config.py](fusion/CycloidDrawerV3/cycloid/config.py). De hoeken worden berekend uit het pad van de pen (inverse kinematica, zonder Fusion); `python -m unittest discover -s tests -t .` in `fusion/CycloidDrawerV3` controleert dat de armen hun lengte houden, de krukken niet van stand wisselen en de pen op het papier blijft.

## Verschil met SIMV7

Alleen het hout is dunner (4 in plaats van 6 mm). De hoogtes van het mechanisme tellen vanaf de motorflens en blijven gelijk, behalve:

- De naaf van motor C zit 2 mm hoger (z = 17 tot 22), zodat het 4 mm dikke plateau op dezelfde hoogte als bij SIMV7 ligt (papier op z = 26). Anders zou de langste motoras 1 mm boven het papier uitsteken.
- Motorbouten en verzonken plateaubouten worden M3×8 in plaats van M3×10.
- De mechanica heeft dezelfde maten als SIMV7 (plateau Ø210, dezelfde afstanden tussen de motoren) maar de kast is zo klein mogelijk gemaakt om MDF te besparen. Het deksel is het omhullende vlak van het plateau en de rondgedraaide krukken (straal 65 + 12 mm) plus de 3 mm vrijloop uit Ward's ontwerp aan elke kant.
- Het hele mechanisme is daarvoor 56,3° gedraaid ten opzichte van SIMV7 (`MACHINE_ROTATION_DEGREES`). Dat mag, want de mechanica verandert niet als je alles samen draait; de thuisstanden van de krukken draaien mee. Het deksel wordt daardoor 343,4 × 304,3 mm. De panelen samen zijn 0,50 m² in plaats van 0,66 m² (ongeveer 24% minder).

## Controles en beperkingen

- Het Fusion-script, ook de animatie, is nog niet in Fusion zelf uitgevoerd. De berekende thuisstand (pen op het plateaumidden) komt wel overeen met SIMV7.
- Het model heeft draaipennen en scharnieren (joints) voor de animatie; de pennen zijn eenvoudige cilinders, geen M8-bout. Bouten, moeren, lagers, penhouder en penklem zijn niet gemodelleerd: zie de onderdelenlijst van SIMV7.
- Het deksel van 4 mm draagt de motoren zonder ribben (SIMV7 heeft er twee onder zijn bovenplaat van 6 mm). Controleer de doorbuiging na het bouwen.
- De pen en de papierhoogte zijn niet opnieuw tegen de vrijloopcontroles van SIMV7 gecontroleerd.
- Er is geen kerfcompensatie van de lasersnijder verwerkt.
- De paneeltests (`python -m unittest` in `Hardware/Bedieningspaneel`) controleren dat het paneel, de haaksleuven en het kabelgat op de V3-kast aansluiten.
