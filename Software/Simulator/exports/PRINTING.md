# SIMV7 · PLA en lasersnijden

De STL-bestanden staan in deze map en zijn al naar hun bedoelde printoriëntatie gedraaid, met de onderzijde op z=0. Gebruik millimeters. De [printmanifest](print-manifest.json) bevat de geometrie en aantallen; [print-validation.json](print-validation.json) bevat de meshcontroles.

| Bestand | Aantal | Onderdeel |
|---|---:|---|
| MOTIO-V7-K-A.stl | 1 | Kruk A, vlak |
| MOTIO-V7-K-B.stl | 1 | Kruk B, vlakke hoofdzijde op bed; boss omhoog |
| MOTIO-V7-L-A.stl | 1 | Arm A, vlak |
| MOTIO-V7-L-B.stl | 1 | Arm B, vlak |
| MOTIO-V7-E-A.stl | 1 | Onderste scharnierbus A |
| MOTIO-V7-E-B.stl | 1 | Onderste scharnierbus B |
| MOTIO-V7-E-SPACER.stl | **2** | Bussen boven de 608-binnenringen |
| MOTIO-V7-P.stl | 1 | Holle penas, flens op bed |
| MOTIO-V7-SP-P.stl | 1 | Bus tussen penlagers |
| MOTIO-V7-SP-P-TOP.stl | 1 | Bovenste penlagerbus |
| MOTIO-V7-PEN.stl | 1 | Penhouder met sleuf, klemoren en moervakken |
| MOTIO-V7-BUSH.stl | 1 | Gesleufde penbus |
| MOTIO-V7-PAD.stl | 1 | Drukblok |
| MOTIO-V7-KNOB.stl | 1 | Handknop, kopvak omhoog |

**Totaal: 15 functionele prints uit 14 bestanden.** Er zijn daarnaast twee passingproeven:

- `MOTIO-V7-fit-coupon.stl`: per rij gaten Ø22,0/22,1/22,2 en Ø32,0/32,1/32,2; lees van links naar rechts zoals op het bed. Test de echte buitenringen. De armen hebben nominaal Ø22,1 en Ø32,0 lagerzittingen. Kies een lichte passende zitting zonder het lager met boutkracht in het PLA te trekken. Corrigeer met horizontale gatcompensatie in de slicer; controleer dat andere passingen dan ook blijven kloppen.
- `MOTIO-V7-shaft-coupon.stl`: korte Ø19,9/13 penas. Test een nauw schuivende passing door de echte Ø20 binnenring vóór de lange penas te printen. Na klemmen mag geen voelbare speling overblijven.

Begininstellingen: normaal **PLA**, 0,4 mm nozzle, 0,2 mm lagen, 6 wanden, 6 boven- en onderlagen, 100% vulling voor het aanwezige materiaal. De armen hebben al een holle koker in het model: **vul die luchtkamer niet met interne support**. De 3 mm kokerwand moet dicht zijn voor de gebruikte stijfheidsschatting. Inspecteer de overbrugging van de bovenwand en doorsnede in de slicer. Gebruik zo nodig alleen lokale support aan de buitenzijde bij de penhouder, die na printen volledig kan worden verwijderd. Controleer de vrije doorgang van alle boorgaten en moervakken.

Voor de verticale penas helpt een brim tegen loskomen; laat de lagen goed hechten en gebruik geen speedprofiel dat zichtbare onderextrusie geeft. Print de stalen motornaaf, lagers, bouten of schroefdraad niet na. PLA wordt alleen via de metalen naaf aangedreven en raakt het motorhuis niet; de warmteproef uit [README](../README.md) blijft nodig.

## PEN2 · herziene asklem

Gebruik **[MOTIO-V7-PEN2.stl](MOTIO-V7-PEN2.stl)** in plaats van `MOTIO-V7-PEN.stl` wanneer de oorspronkelijke houder onvoldoende vastklemt op de penas. Print één exemplaar; dit is een vervangend onderdeel en geen extra onderdeel in de montage. Het oorspronkelijke bestand blijft beschikbaar.

- Asboring Ø20,0 in plaats van Ø20,2 mm, voor de bestaande nominale Ø19,9 mm penas. De diametrale speling daalt van 0,3 naar 0,1 mm.
- Klemspleet 2,0 in plaats van 1,0 mm; beide klemoren staan 0,5 mm verder naar buiten. De sleuf loopt 2 mm verder omhoog. De oren en het M3-moervak behouden hun wanddikte.
- Onderste 6,4 mm van de klem heeft Ø25 in plaats van Ø28 mm buitenmaat: een wand van 2,5 mm die makkelijker kan meegeven. De uitsparing stopt onder de M4-drukkamer.
- Totale hoogte 22 mm, asboringsdiepte 8,01 mm, penbus, drukblok, M4-penklem en M3×20-klembout blijven bruikbaar. De houder rust op dezelfde bovenste lagerbus.

Print rechtop zoals aangeleverd, op 100% in mm, met de PLA-instellingen hierboven. Houd sleuf, boutgaten en moervakken vrij van supportresten. Schuif de houder eerst los op de as; draai de M3-bout daarna geleidelijk aan tot de houder niet meer draait of verschuift. Leg geen axiale voorspanning op de lagers. De echte geprinte asdiameter is niet gemeten: de verbeterde klemming moet nog op de machine worden beproefd.

Brongeometrie: `pen2Part()` in [fabrication.js](../js/fabrication.js). Apart opnieuw genereren vanuit `Software/Simulator`, zonder de oorspronkelijke exports te overschrijven:

```powershell
node tests/export.js --pen2-only
python tests/print-parts.py --pen2-only
```

Gebruik de Python-pakketten uit `tests/requirements-print.txt`. De aparte [manifest](print-pen2-manifest.json) en [STL-controle](print-pen2-validation.json) horen bij PEN2; die controle bewijst de gesloten mesh en geometrische doorgangen, niet de fysieke klemkracht.

## Laserbestanden

Alle houtdelen zijn **6 mm MDF**. Per type zijn er een SVG en DXF:

| Bestandsnaam na `MOTIO-V7-` | Aantal |
|---|---:|
| top-plate | 1 |
| bottom | 1 |
| front-back | 2 |
| side | 2 |
| rib | 2 |
| platter | 1 |

`MOTIO-V7-laser-layout.svg` bevat alle negen exemplaren met 12 mm tussenruimte. Het canvas is 1220×2440 mm, gebruikte hoogte 762 mm. Is het laserbed kleiner, gebruik dan de losse onderdelen; de grootste is 358×404 mm. Schaal **100% / 1:1**, nooit automatisch passend op papier. DXF `$INSUNITS=4` betekent mm. De SVG-lijnen zijn snijpaden; titels zijn metadata en worden niet gegraveerd.

De bestanden zijn nominale maten zonder kerfcorrectie. Meet eerst de plaat, maak een korte sleufproef voor een tand van 20×6 en stem kerf in de lasersoftware af. Brandresten verwijderen vóór verlijmen. De vier plateaugaten met de echte 90° M3-schroefkoppen verzinken; laseren maakt geen verzonken gat.

De losse montagetekeningen (`mechanical`, `section`, `mounting`, `pen-detail`) dienen voor uitleg en zijn **geen snijbestanden**.
