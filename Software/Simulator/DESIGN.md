# SIMV7 · montagematen

Alle maten in mm; z=0 is het montagevlak van de motorflenzen tegen de **onderzijde van de bovenplaat**. Positief z is boven de kast. Gebruik [de montageanimatie](index.html) samen met de [montagetekening](exports/MOTIO-V7-mounting.svg) en [doorsnede](exports/MOTIO-V7-section.svg).

## Hout

| Deel | Aantal | Maat |
|---|---:|---|
| Bovenplaat / bodem | 1 + 1 | 358 × 404 × 6 |
| Voor- / achterwand | 2 | 358 × 100 × 6 |
| Zijwand | 2 | 392 × 100 × 6; tussen voor- en achterwand |
| Rib | 2 | 346 breed; web 30 hoog plus twee tanden van 20 × 6 |
| Plateau | 1 | Ø210 × 6 |

Bovenplaat z=0…6, bodem z=-106…-100. Ribben op y=140 en 240, web z=-30…0. Tanden met midden x=100 en 250 vallen in sleuven 20,2 × 6,2. Verlijm de ribben tegen de bovenplaat en zijwanden. Schuur uitstekende tanden vlak. Meet de werkelijke MDF-dikte vóór het snijden; 6,2 mm is montagespeling, geen automatische compensatie voor afwijkende plaat of laserkerf.

Motorcentra: A=(280,180), B=(160,100), C=(150,280), gemeten vanaf de hoek (0,0) van de bovenplaat. Per motor Ø22,5 as/boss-doorvoer en vier Ø3,6 gaten op 31 × 31. Motoren niet tussen PLA en hout opsluiten.

## Aandrijving

De [Pololu 1998](https://www.pololu.com/product/1998) heeft Ø19 × 5, een Ø5 boring, één radiale M3-stelschroef en vier M3 montagegaten op **steekcirkel Ø12,7**. Zie de [maattekening](https://www.pololu.com/file/0J665/1998-5mm-m3-hub-dimensions.pdf). Dat is geen 19 mm steekcirkel. De naaf is volgens de fabrikant ook geschikt voor ronde assen. Zet de stelschroef vast met 1,5 mm inbus en voer een slipproef uit.

| Montage | Positie | Bout / draad in metaal |
|---|---|---|
| Motor aan MDF | 6 mm hout + brede ring 0,8 | M3×10 → 3,2; motorboring max. 4,5 |
| Naaf A | z=13…18 | Volledig op de motoras |
| Kruk A | z=18…24; midden z=21 | 4× M3×10 + ring 0,5 → 3,5 in naaf |
| Naaf B | z=18…23 | Volledig op de kortste as van 23 |
| Kruk B | wortelboss z=23…27, hoofdkruk z=27…33 | 4× M3×14 + ring 0,5 → 3,5 in naaf |
| Naaf C | z=15…20 | Volledig op de motoras |
| Plateau | z=20…26 | 4× verzonken M3×10 → 4 in naaf |

De motoras is nominaal 24 ±1 vanaf de flens. Kruk B heeft boven de wortel een doorlopende asboring. De langste C-as eindigt op z=25, dus 1 mm onder de bovenzijde van het plateau. Verzonken schroeflengte is **inclusief kop**; de andere boutlengtes zijn onder de kop gemeten. De plateaugaten na het snijden met een 90° verzinkboor aanpassen zodat de koppen vlak onder het papier vallen.

## Scharnieren

Armen zijn PLA-kokers 24 × 16 met 3 mm wand en gesloten uiteinden, met afstand tussen de lagercentra van 180 (A) en 160 (B). Draaiende buitenringen zitten in de geprinte lagerogen; druk boutkracht uitsluitend via afstandsbussen op de binnenringen. Een vastgezette arm moet nog soepel draaien.

| Stapel boven de kruk | A | B |
|---|---:|---:|
| Bovenzijde kruk | z=24 | z=33 |
| PLA-afstandbus Ø14/8,4, laatste 2 mm Ø12 | 16,5 hoog | 28,5 hoog |
| 608-lager 8×22×7 | z=40,5…47,5 | z=61,5…68,5 |
| PLA-bus boven lager Ø12/8,4 | 4,5 hoog | 4,5 hoog |
| Ring Ø16/8,4 | 1,6 | 1,6 |
| DIN 985 borgmoer M8 | 8 hoog | 8 hoog |
| Bout van onder + onderste ring 1,6 | M8×50 DIN 933 | M8×60 DIN 933 |

Beide bouten hebben minstens 2,5 mm uitstekende draad na de moer. Gebruik zeskantkoppen DIN 933 zoals in de bestellijst; een hogere inbuskop heeft een andere vrijloop. Draai slechts tot de binnenringstapel spelingsvrij is. De kogellagers verzorgen de beweging; de armen lopen niet rechtstreeks op schroefdraad.

## Pen

De twee 61804/6804-lagers zijn 20×32×7, op dezelfde hoogtes als de 608-lagers. De holle penas heeft Ø19,9/13 en is 50 lang met een geïntegreerde Ø24×5 onderflens.

1. Penas **van onder** door het onderste penlager; onderflens z=35,5…40,5.
2. PLA-bus Ø24/20,2 ×14 op de binnenring; dan bovenste arm en penlager.
3. PLA-bovenbus Ø24/20,2 ×9,5, tot z=78.
4. Penhouder onderzijde op z=78; onderste Ø20,2 boring 8 diep. De penas eindigt op z=85,5, 0,5 vrij van de booringschouder. Klem de gesleufde houder tangentieel met M3×20 en een ingevangen M3-moer; geen axiale voorspanning op de lagers.
5. Metalen M4-moer in het zijvak. PLA-drukblok via de middenboring plaatsen; daarna gesleufde penbus en pen van boven. M4×25 duwt via het drukblok op de bus. Geprinte handknop over de zeskantkop lijmen.

De bus is nominaal voor een Ø10 pen, met Ø10,3 boring. De webshop vermeldt geen schachtdiameter van de geselecteerde fineliner: **nameten en alleen de penbus aanpassen indien nodig**. De houder heeft een doorlopende Ø13 boring. De pen zit handmatig op hoogte en tekent met verbonden lijnen; er is geen automatische penlift.

## Fysieke vrijgave

Eerst zonder stroom met de hand door het hele tekenbereik, daarna langzaam laten lopen. Controleer naafslip met een markeerstreep, vrij draaiende lagers, vlakke papierdrager en lichte pendruk. Controleer opnieuw na 30 minuten bedrijf en na een dag opgespannen staan: PLA mag niet blijvend indrukken of vervormen. Gekozen temperatuurproefgrens bij PLA aan de naaf: 40 °C. Loopkoppel en de complete doorbuiging moeten op de gebouwde machine worden vastgesteld; alleen de armen zijn met een eenvoudige isotrope PLA-berekening geschat.
