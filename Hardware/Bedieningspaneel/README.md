# Bedieningspaneel

Gesloten wig met een schuin scherm (10.1" Waveshare DSI LCD (C)) dat op de bestaande case wordt gemonteerd. Alles is 4 mm MDF, hellingshoek 45°. Alle verbindingen zijn vingerverbindingen (tanden in sleuven).

## Onderdelen

| Onderdeel | Aantal | Maat | Verbinding |
|---|---|---|---|
| Zijkant | 2 (identiek) | rechthoekige driehoek, benen 118,4 mm, schuine zijde 167,5 mm | 5 tanden (8 mm hoog) op de schuine zijde, 4 tanden onderaan, 3 sleuven voor de achterwand, 1 T-haak voor de case |
| Bovenplaat | 1 | 267,5 × 167,5 mm, glasvak 239,5 × 147,5 mm | sleuven voor de tanden van de zijkanten |
| Steunplaat | 1 | 267,5 × 167,5 mm, module-opening 229,0 × 143,4 mm | sleuven voor de tanden van de zijkanten, ligt onder de bovenplaat |
| Vulring | 1 | 2,9 mm dik, 239,4 × 147,4 mm met module-opening | 4 nokken van 20 × 3 mm die in nissen van het glasvak vallen |
| Bodem | 1 | 267,5 × 118,4 mm | sleuven voor de zijkanten en de achterwand |
| Achterwand | 1 | 251,5 mm breed (plus tanden) | tanden in de zijkanten en de bodem |

## Scherm gelijk met de plaat

- De bovenplaat heeft een glasvak van 239,5 × 147,5 mm (glas 239 × 147 mm plus 0,25 mm speling per kant). Het glas (1,1 mm dik) ligt in dat vak op een vulring van 2,9 mm, die op de steunplaat ligt. Zo komt de bovenkant van het glas precies gelijk met de bovenkant van de bovenplaat (8 mm boven de helling). De ring blijft op zijn plaats door de nokken in de nissen (voor- en achterrand van het glasvak), en zit ingeklemd tussen de steunplaat en het glas. 2,9 mm is geen standaarddikte: neem 3 mm materiaal (glas ligt dan 0,1 mm hoger) of snij 2,9 mm.
- De steunplaat heeft een opening voor de LCD-module (228,6 × 143 mm plus 0,2 mm speling per kant). Het glas rust op de rand van die opening en wordt vastgelijmd of vastgetapet.
- De module zit niet gecentreerd achter het glas (zie de Waveshare-tekening): de rand tot het glas is aan de kabelkant 2,42 mm en aan de andere kant 7,98 mm. De opening in de steunplaat volgt dat. De smalle rand ligt bij de lage x (bij kijken van voren aan de rechterkant). Staat dit de verkeerde kant op voor jullie, draai dan `MODULE_RAND_KABELKANT` om in `steunplaat.py`.
- Het zichtbare beeld (217,18 × 135,96 mm) ligt gecentreerd in het glas en wordt door de glasplaat zelf begrensd.
- Tussen de zijkanten is 251,5 mm vrij: het glasvak plus 6 mm brede rand aan elke kant. Voor en achter is de rand 10 mm breed. De platen steken 4 mm voorbij de zijkanten.
- Volgorde: steunplaat en bovenplaat over de tanden van de zijkanten, vulring in het glasvak (nokken in de nissen), dan het glas erop met dubbelzijdig tape op de ring en de steunplaat, en de module achterin vastzetten.
- Tanden zijn 15 mm lang. Sleuven hebben 0,1 mm speling (`VINGER_SPELING`).
- De vulring wordt vastgelijmd op de steunplaat; de nokken zorgen alleen dat hij goed uitgelijnd ligt.
- De achterwand staat 6 mm van de verticale kant, zodat ze net onder de bovenplaat valt.

## Scherm en Pi in het model

`scherm.py` zet het glas, de LCD-module, de printplaat en de Pi als blokken in de 3D-weergave en in het Fusion-model (niet in de snijbestanden). De maten komen uit de Waveshare-tekening: de module zit niet gecentreerd achter het glas, de printplaat (110 × 76 mm) en de Pi (85 × 56 mm, 8 mm afstandhouders) hangen op de schroefgaten. De Pi is een blok van 18,6 mm dik als omhullende (printplaat plus USB-poorten en koeler). Welke kant de Pi op wijst is een aanname: vanaf het eerste schroefgat naar de andere kant van het glas.

## Bekabeling

- Alle bekabeling gaat door de sleuf in de case, aan de rechterkant gezien van voren (dit is de lage x van de platen). De Pi zit met afstandhouders (58 × 49 mm) op de printplaat van het scherm en ligt dus als geheel in de wig.
- De achterwand heeft daarvoor een kabelgat van 40 × 12 mm, 15 mm van de rechterkant (van voren gezien), op de hoogte van de sleuf in de case. Pas `KABELGAT_*` in `paneel_maten.py` aan als het groter of verplaatst moet worden.
- Het scherm en de Pi samen steken ongeveer 26 tot 30 mm onder de steunplaat uit. Dat past in de wig met minstens 8 mm tot de achterwand en 18 mm tot de bodem.

## Montage op de case

De wig hangt met één T-haak per zijkant in de voorwand van de case (de bovenste helft, tussen het tussenschot en het deksel, 94 mm boven de vloer).

- De haak heeft een hals van 4 mm breed en 4,2 mm lang (wanddikte plus speling) en een kop van 40 mm breed.
- De zijkant gaat plat (horizontaal) door de horizontale sleuf van 4,3 mm hoog en wordt dan een kwartslag gedraaid. De kop staat dan verticaal achter de wand en kan er niet meer door.
- De hals draait in een rond deel van de sleuf (sleutelgat, Ø 6,4 mm), want een vierkante hals van 4 × 4 mm past anders niet.
- De sleuf aan de kabelkant (rechts gezien van voren) loopt door richting het midden. De kabels gaan naast de hals door de sleuf, via het kabelgat in de achterwand van de wig op dezelfde hoogte.
- Eerst de zijkanten in de case draaien, daarna de wig dichtzetten met bodem en achterwand.

De sleuven staan in de Fusion-case en de laser-generator ([wedge_mount.py](../../Research/concept/v2/fusion/CycloidDrawerV2/cycloid/box_design/wedge_mount.py)). Bij een gecentreerde wig op een case van 358 mm:

| Zijkant | Sleuf (x vanaf de linkerrand, van voren gezien) | Hals op x | z |
|---|---|---|---|
| Links | 30,3 tot 72,3 mm | 51,3 mm | 94 mm |
| Rechts (kabelkant) | 245,8 tot 327,8 mm | 306,8 mm | 94 mm |

Houd `paneel_maten.py` en `wedge_mount.py` gelijk. `python -m unittest` controleert dat ze op elkaar aansluiten.

## Bestanden genereren

```bash
python genereer.py
```

Schrijft naar `uitvoer/`:
- `bedieningspaneel.svg` en `.dxf`: alle onderdelen voor de lasersnijder (mm).
- `voorbeeld_3d.svg`: isometrisch 3D-voorbeeld van de opgebouwde wig, te openen in een browser.

Alle maten staan in [paneel_maten.py](paneel_maten.py). Er is nog geen snijbreedte (kerf) van de lasersnijder verwerkt.

## Indeling van de code

- `paneel_maten.py`: alle maten.
- `zijkant.py`, `bovenplaat.py`, `steunplaat.py`, `vulring.py`, `bodem.py`, `achterwand.py`: omtrek en gaten per onderdeel.
- `vingers.py`: tandverdeling en sleuven, gedeeld door alle onderdelen.
- `montage.py`: plaatst de onderdelen in 3D, `voorbeeld.py` tekent daarvan de preview.
- `export.py`: SVG- en DXF-schrijver, `genereer.py`: indeling van de platen.

## Bron schermmaten

Waveshare 2D-tekening van de 10.1inch DSI LCD (C): glas 239 × 147 mm, zichtbaar beeld 217,18 × 135,96 mm, 7,4 mm dik, connectoren steken 8 mm uit aan de achterkant.
