# MOTIO SIMV7

Officiële opvolger van SIMV6: PLA voor de mechanische maatdelen, 6 mm lasergesneden MDF voor de kast en standaard koopdelen uit de toegestane winkels. SIMV6 is behouden.

Open [index.html](index.html) in een recente browser. Er is geen installatie of internet nodig. De simulator bevat de bestaande 13 patronen, eigen woorden, 2D/3D-weergave, onderdelenlijst met kooplinks en een aangepaste montagehandleiding van 40 stappen. Bedien met **Power → Home → Play**. Home is een virtuele referentie; de webpagina stuurt zelf geen fysieke motoren aan.

## Bouwen

1. Lees [bestellen en hergebruik](SOURCING.md): drie motoren, drie metalen Ø5-naafjes, vier kogellagers en standaard bouten/moeren/ringen blijven koopdelen.
2. Print eerst de twee passingproeven en daarna de **15 PLA-onderdelen uit 14 STL-bestanden**. Aantallen en instellingen staan in [exports/PRINTING.md](exports/PRINTING.md).
3. Lasersnij **9 MDF-onderdelen**: bovenplaat, bodem, vier wanden, twee ribben en plateau. Gebruik de losse SVG/DXF-bestanden of [het snijplan](exports/MOTIO-V7-laser-layout.svg), schaal 1:1 in mm. Het plan gebruikt 1220 × 762 mm van een plaat 1220 × 2440 mm. Geen kerfcompensatie ingebouwd.
4. Volg de tab **Montagehandleiding** en [de kritieke montagematen](DESIGN.md). Verlijm de kast haaks met houtlijm; houd de bodem afneembaar met tape. Verzink de vier plateauboutgaten pas na het snijden, met de echte schroeven als maat.
5. Stel de pen handmatig op de papierhoogte. Controleer vrijloop met de hand, dan langzaam en zonder penbelasting. Voer de fysieke proeven hieronder uit vóór de eerste volledige tekening.

De hoofdconstructie is 358 × 404 × 112 mm. Krukken: 65 mm; armen: 180 en 160 mm. Papier: Ø210 mm; bruikbare tekencirkel: Ø190 mm. De motoren zitten direct onder het MDF. Houten ribben dragen de bovenplaat; metalen verstevigingsplaatjes, gedraaide scharnierposten, speciale ronde moeren, M20-draad en TPU zijn vervallen.

Alleen de metalen naafjes houden de motoras vast. PLA-krukken worden daar met vier gewone M3-bouten op geschroefd. De M8-scharnierbouten klemmen de binnenringen van echte kogellagers: de armen draaien op de lagers. De holle PLA-penas gaat van onder door de twee penlagers en wordt bovenaan door de penhouder geklemd.

## Wat gecontroleerd is

- Kinematica, bereik, singulariteiten, botsingsenveloppen, montageboringen, draadlengtes en alle 40 montagestappen hebben automatische controles.
- De vaste radiale tekenroute heeft een continue berekende ondergrens van **3,846 mm vrijloop** bij een vereiste 3 mm. Een onafhankelijke controle om de 0,1 mm vindt minimaal **3,978 mm**. Het draaien van motor C maakt de volledige tekencirkel bereikbaar.
- Alle 14 onderdeel-STL's en twee passingproeven zijn gesloten, consistent georiënteerde meshes met één verbonden materiaallichaam. [print-validation.json](exports/print-validation.json) controleert ook de opnieuw ingelezen STL-bestanden.
- Volledige patroonruns op 100 Hz, met pauzeren en hervatten, staan in [pattern-validation.json](exports/pattern-validation.json). De geometrie en belastingsschattingen staan in [design-validation.json](exports/design-validation.json).

Dit is een gecontroleerd ontwerp en een werkende simulator, **geen reeds gebouwde en fysiek beproefde machine**. Controleer op de eerste bouw de lagerpassingen, naafslip, PLA-kruip, vlakheid van het MDF, werkelijke penkracht en motortemperatuur. Meet na 30 minuten bedrijf ook de PLA vlak bij de metalen naaf; **40 °C is hier een gekozen proefgrens**, geen materiaalgarantie. Bij overschrijding eerst stroom/inschakelduur verlagen en opnieuw testen. Houdkoppel alleen bewijst geen loopkoppel. De stijfheidsberekening schat alleen de armen; de volledige constructie moet nog worden gemeten.

## Bestaande elektronica en scherm

De drie SY42STH38-1684A-motoren, Raspberry Pi 5, gShield V5 en het Waveshare 10.1inch DSI LCD (C) kunnen worden hergebruikt; toegestane bestelbronnen staan in [SOURCING.md](SOURCING.md). Standaard SIMV7 rekent met **1/8 microstepping = 1600 pulsen/omwenteling**, passend bij de gShield V5.

De bestaande [Pi-interface](../../Pi-Interface/motio.py) bevat nog de SIMV5-bediening en 1/16-instelling en is **geen SIMV7-driver**. Deze versie verandert die eerdere interface niet. De fysieke referentie en juiste pulsinstelling moeten bij de hardware-integratie worden afgestemd; software-Home detecteert geen werkelijke aspositie.

Het bestaande [4 mm schermpaneel](../../../Hardware/Bedieningspaneel/README.md) kan als los paneel naast de machine staan. De SIMV7-kast heeft gewone dichte wanden; de eerdere ophanghaken en case-sleuven zijn niet overgenomen. Zo is er geen verkeerd passende 4 mm haak in een 6 mm wand. Het scherm is niet nodig voor de werking van de mechanica of de simulator.

## Controles opnieuw uitvoeren

Vanuit deze map:

```powershell
node tests/logic.test.js
node tests/construction.test.js
node tests/assembly-connections.test.js
node tests/integration.test.js
node tests/patterns.test.js
node tests/export.js
```

STL's opnieuw maken vereist Python met de pakketten uit `tests/requirements-print.txt`:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r tests/requirements-print.txt
.venv/Scripts/python tests/print-parts.py
```

De meegeleverde exports horen bij de standaardconfiguratie. Aanpassingen in de simulator veranderen bestaande bestanden op schijf niet. Gebruik deze bouwconfiguratie voor de geleverde onderdelen.
