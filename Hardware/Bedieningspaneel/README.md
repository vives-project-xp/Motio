# Bedieningspaneel

Gesloten wig met een schuin scherm (officieel Raspberry Pi Touch Display 7", v1.1 uit 2015, 800 × 480) dat op de bestaande case wordt gemonteerd. Alles is 4 mm MDF, hellingshoek 45°. Alle verbindingen zijn vingerverbindingen (tanden in sleuven).

## Onderdelen

| Onderdeel | Aantal | Maat | Verbinding |
|---|---|---|---|
| Zijkant | 2 (identiek) | rechthoekige driehoek, benen 107,0 mm, schuine zijde 151,3 mm | 4 tanden (8 mm hoog) op de schuine zijde, 4 tanden onderaan, 3 sleuven voor de achterwand, 1 T-haak voor de case |
| Bovenplaat | 1 | 221,5 × 151,3 mm, glasvak 193,5 × 111,3 mm | sleuven voor de tanden van de zijkanten |
| Steunplaat | 1 | 221,5 × 151,3 mm, module-opening 168,2 × 102,6 mm | sleuven voor de tanden van de zijkanten, ligt onder de bovenplaat |
| Vulring | 1 | 3,3 mm dik, 193,4 × 111,2 mm met module-opening | 4 nokken van 20 × 3 mm die in nissen van het glasvak vallen |
| Bodem | 1 | 221,5 × 107,0 mm | sleuven voor de zijkanten en de achterwand |
| Achterwand | 1 | 205,5 mm breed (plus tanden) | tanden in de zijkanten en de bodem |

## Scherm gelijk met de plaat

- De bovenplaat heeft een glasvak van 193,5 × 111,3 mm (glas 192,96 × 110,76 mm plus 0,25 mm speling per kant). Het glas (0,7 mm dik) ligt in dat vak op een vulring van 3,3 mm, die op de steunplaat ligt. Zo komt de bovenkant van het glas precies gelijk met de bovenkant van de bovenplaat (8 mm boven de helling). De ring blijft op zijn plaats door de nokken in de nissen (voor- en achterrand van het glasvak), en zit ingeklemd tussen de steunplaat en het glas. 3,3 mm is geen standaarddikte: neem 3 mm materiaal (glas ligt dan 0,3 mm lager) of snij 3,3 mm.
- De steunplaat heeft een opening voor de LCD-module (166,2 × 100,6 mm plus 1 mm speling per kant). Het glas rust op de rand van die opening en wordt vastgelijmd of vastgetapet. De speling is ruim, omdat de tekening de rand van de module niet eenduidig geeft: de module is horizontaal gecentreerd aangenomen (13,38 mm rand) en zit verticaal 6,63 mm onder de bovenrand en 3,53 mm boven de onderrand van het glas (kabelkant). Meet dit na op het echte scherm.
- De FPC-kabel komt uit de onderkant van de module (de kant die naar voren wijst). Hij plooit achter de module weg; de ruime speling aan die kant geeft hem plaats. Controleer dit bij de eerste montage.
- Het zichtbare beeld (154,88 × 86,72 mm) ligt in het glas, 19,04 mm van de zijranden en 11,01 mm van de bovenrand, en wordt door de zwarte rand van het glas zelf begrensd.
- Tussen de zijkanten is 205,5 mm vrij: het glasvak plus 6 mm brede rand aan elke kant. Voor en achter is de rand 20 mm breed, zodat de Pi op de montagegaten van de module vrij blijft van de achterwand. De platen steken 4 mm voorbij de zijkanten.
- Volgorde: steunplaat en bovenplaat over de tanden van de zijkanten, vulring in het glasvak (nokken in de nissen), dan het glas erop met dubbelzijdig tape op de ring en de steunplaat, en de module achterin vastzetten.
- Tanden zijn 15 mm lang. Sleuven hebben 0,1 mm speling (`VINGER_SPELING`).
- De vulring wordt vastgelijmd op de steunplaat; de nokken zorgen alleen dat hij goed uitgelijnd ligt.
- De achterwand staat 6 mm van de verticale kant, zodat ze net onder de bovenplaat valt.

## Scherm en Pi in het model

`scherm.py` zet het glas, de LCD-module, de printplaat en de Pi als blokken in de 3D-weergave en in het Fusion-model (niet in de snijbestanden). De maten van glas en module komen uit de officiële tekening. De Pi (85 × 56 mm, 8 mm afstandhouders) hangt aan de vier M2.5-gaten van de module (58 × 49 mm). De Pi is een blok van 18,6 mm dik als omhullende (printplaat plus USB-poorten en koeler). Twee aannames: de stuurprint van het scherm staat niet in de tekening en is als even groot als de Pi gemodelleerd, en welke kant de Pi op wijst is niet vastgelegd (hij ligt op de gaten met zijn lange zijde langs de breedte van het scherm).

## Bekabeling

- Alle bekabeling gaat door de sleuf in de case, aan de rechterkant gezien van voren (dit is de lage x van de platen). De Pi zit met afstandhouders (58 × 49 mm) op de printplaat van het scherm en ligt dus als geheel in de wig.
- De achterwand heeft daarvoor een kabelgat van 40 × 12 mm, 15 mm van de rechterkant (van voren gezien), op de hoogte van de sleuf in de case. Pas `KABELGAT_*` in `paneel_maten.py` aan als het groter of verplaatst moet worden.
- Het scherm en de Pi samen steken ongeveer 26 tot 30 mm onder de steunplaat uit. Dat past in de wig met ongeveer 3 mm tot de achterwand en 18 mm tot de bodem. De marge tot de achterwand is klein; de test controleert dat de Pi er niet doorheen steekt.

## Montage op de case

De wig hangt met één T-haak per zijkant in de voorwand van de case (de bovenste helft, tussen het tussenschot en het deksel, 84 mm boven de vloer).

- De haak heeft een hals van 4 mm breed en 4,2 mm lang (wanddikte plus speling) en een kop van 30 mm breed. De kop is smaller dan bij het grote scherm omdat de zijkant lager is.
- De zijkant gaat plat (horizontaal) door de horizontale sleuf van 4,3 mm hoog en wordt dan een kwartslag gedraaid. De kop staat dan verticaal achter de wand en kan er niet meer door.
- De hals draait in een rond deel van de sleuf (sleutelgat, Ø 6,4 mm), want een vierkante hals van 4 × 4 mm past anders niet.
- De sleuf aan de kabelkant (rechts gezien van voren) loopt door richting het midden. De kabels gaan naast de hals door de sleuf, via het kabelgat in de achterwand van de wig op dezelfde hoogte.
- Eerst de zijkanten in de case draaien, daarna de wig dichtzetten met bodem en achterwand.

De sleuven staan in de Fusion-case en de laser-generator ([wedge_mount.py](../../Research/concept/v2/fusion/CycloidDrawerV2/cycloid/box_design/wedge_mount.py)). Bij een gecentreerde wig op een case van 358 mm:

| Zijkant | Sleuf (x vanaf de linkerrand, van voren gezien) | Hals op x | z |
|---|---|---|---|
| Links | 58,3 tot 90,3 mm | 74,3 mm | 84 mm |
| Rechts (kabelkant) | 222,7 tot 299,7 mm | 283,7 mm | 84 mm |

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

Mechanische tekening RP-008246-DS-1-7-inch-display (officieel Raspberry Pi Touch Display, v1.1): glas 192,96 × 110,76 mm, 0,7 mm dik; module 166,2 × 100,6 mm, samen 5,96 mm dik; zichtbaar beeld 154,88 × 86,72 mm; vier M2.5-gaten (58 × 49 mm) voor de Pi.
