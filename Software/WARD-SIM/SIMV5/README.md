# MOTIO SIMV5

Zelfstandige opvolger van SIMV4-5, met dezelfde interface en directe 1:1-aandrijving. De eerdere versies blijven behouden. Geen extra libraries of installatie nodig.

## Starten

Open `index.html` rechtstreeks in de browser. Voor een lokale preview vanuit deze map:

```powershell
node tests/serve.js
```

Open vervolgens [SIMV5](http://127.0.0.1:4176/).

## Montagehandleiding

De nieuwe tab **Montagehandleiding** toont één van zes stappen tegelijk: bodem en wanden, motoren, bovenplaat met assen en lagers, draaiplateau met papier, krukken en penarmen, en penhouder met pen.

Elke geopende stap speelt automatisch een rustige animatie van 2,6 seconden af. Gebruik de pijltjes om vooruit of terug te gaan en **↻ Opnieuw** om de huidige animatie te herhalen. Het eerste vorige-pijltje en het laatste volgende-pijltje zijn uitgeschakeld. Bij het terugkeren naar de tab wordt de laatst gekozen stap opnieuw afgespeeld.

Eerder gemonteerde onderdelen blijven op hun plek. De voorwand, rechterwand en bovenplaat zijn doorschijnend om de montage binnen de box te kunnen volgen. Sleep op het model om het te draaien en scroll om te zoomen. De animatie gebruikt de bestaande modelonderdelen en 3D-renderer; zonder WebGL tekent de handleiding dezelfde vlakken met Canvas 2D.

De handleiding gebruikt een vaste beginstand uit de huidige machineconfiguratie. Ze verandert geen simulatie, tekening, camera of zichtbaarheidsinstellingen in de andere tabs. De montagebewegingen zijn een schematische uitleg bij het studentenprototype.

## Bestaande bediening

De app opent in **Mechanical Design → 3D**. De bestaande simulator, patronen, woordgenerator, behuizingsschakelaars, technische configuratie, validatie en SVG-/CSV-export blijven beschikbaar. Om te tekenen: kies in **Simulator** een patroon en druk **Power on → Home → Play**.

## Controles

```powershell
node tests/logic.test.js
node tests/integration.test.js
node tests/patterns.test.js
```

De integratietest controleert ook de zes stappen, opeenvolgende zichtbaarheid, montagebewegingen, stilstaande eerdere onderdelen, herhalen, terugbladeren, de navigatiegrenzen en behoud van de simulatiestatus. De overige tests controleren de bestaande geometrie, aandrijving, patronen en veiligheidslogica. Exports kunnen opnieuw worden gemaakt met `node tests/export.js`.
