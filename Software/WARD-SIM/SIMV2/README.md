# MOTIO — SIMV2

Virtueel prototype, doorontwikkeld uit SIMV1. Open `index.html` rechtstreeks in een browser; geen installatie nodig.

## Bediening

1. **Power on → Home**. De gekoppelde assen keren in een geïdealiseerde referentieroutine terug naar nul. De ingestelde krukfasen blijven behouden.
2. **Pen down → Play**. Machine View toont de machine; Paper View toont het vaste A3-papierbeeld.
3. **Pause** behoudt de positie. **Stop** stopt op de actuele positie en heft de pen. **Reset** wist het spoor, reset de simulatie en vereist opnieuw Home.
4. Gear-, fase-, geometrie- en richtingswijzigingen resetten de tekening en vereisen Home. Simulation speed verandert alleen de afspeelsnelheid.
5. Engineering overlay toont steekcirkels, krukbanen, toerentallen, coördinaten en referentiekaders.

## ASSUMPTION FOR V1 — mechanische architectuur

Eén motor drijft een centrale as met drie gelijke tandriempoelies. Drie afzonderlijke 1:1 riemtrappen op verschillende hoogtes koppelen die as aan gelijke driver-pinions. Elke pinion grijpt in een verwisselbaar uitgaand tandwiel: papier, Arm A of Arm B. Alle assen staan in lagerblokken; de pinionposities verschuiven met de tandenaantallen. Riemlengtes en spanning moeten na wisselen mechanisch worden aangepast.

Module 1 mm: steekstraal = tanden / 2 mm; hartafstand = (driver + uitgang) / 2 mm. De getekende tanden zijn schematisch, geen productieklare involuutprofielen. Het papierwiel zit coaxiaal onder het platform; een gelabelde doorsnede toont dit verborgen tandwielpaar. Stippellijnen zijn onderliggende riemtrajecten, geen losse actuatoren. De krukken zitten op de uitgaande assen boven de transmissies. Armen liggen in verschillende hoogtevlakken en ontmoeten elkaar in een gemeenschappelijke penhouder.

Een rond platform Ø526 mm draagt een gecentreerd A3-blad van 420 × 297 mm. Het spoor is opgeslagen in papiercoördinaten en draait in Machine View mee met het blad. De Paper View behoudt de lokale coördinaten. De marge is 20 mm. Buiten het blad of met geheven pen ontstaat geen spoor; bij hervatting begint een nieuwe lijn.

## Berekening

Driverhoek → verhouding −driverT/outputT → krukpennen → snijpunt van twee cirkels met vaste armlengtes → wereldpositie pen → inverse papierrotatie → tekening.

SIMV1's bestaande cirkelsnijpuntmodel, panelen, presets en vaste tijdstap zijn behouden. De continuïteitskeuze gebruikt nu afstand tot de vorige penpositie, zonder voorkeur die plots van tak wisselt om binnen het papier te blijven. Onbereikbare geometrie blokkeert de aandrijving.

De exacte gezamenlijke faseherhaling is het KGV van de gereduceerde ratio-noemers in driveromwentelingen. Een symmetrisch patroon kan eerder visueel herhalen. De weergegeven duur gebruikt driver-RPM, zonder versnellingsrampen. RPM verandert tijdsverloop, niet de geometrische patroonvorm; tandenaantallen, fasen, krukstralen en armlengtes veranderen die wel. Omkeren keert de doorlooprichting om.

## Scope en bron

Gebaseerd op de meegegeven masterprompt en de projectbeschrijving in de repository-README. Er was geen afzonderlijke projectbrief beschikbaar. Mechanische opbouw, module, platformdiameter, controller en sensoren zijn expliciete prototypeaannames.

Dit is ideale kinematica: geen berekening van motorvermogen, buiging, backlash, riemspanning, botsingen of toleranties. De homingroutine interpoleert de gemeenschappelijke driverfase in twee simulatieseconden naar de virtuele referentie; dit is geen firmware of realistisch begrensd motorprofiel. Sensorblokjes zijn statusindicatoren. Voor een bouwontwerp zijn hoogteverschillen, vrije ruimte en montage nog te controleren. Het spoor bewaart maximaal circa 350.000 punten en verwijdert daarna de oudste 50.000 om geheugen te begrenzen.

## Controle

`node tests/logic.test.js`

Controleert ratios, transformaties, vaste armlengtes, continuïteit, machine-interlocks, homing, penonderbrekingen, veranderde tandenaantallen, richting, faseherhaling en RPM-tijdschaling.

`node tests/integration.test.js`

Controleert de bestaande HTML-controls en rendercode met een gesimuleerd document en canvas, inclusief tekenen, onderbreken en hervatten. Dit vervangt geen visuele browsercontrole. De ingebouwde browser blokkeerde het lokale file-adres tijdens ontwikkeling, dus visuele QA is niet afgerond.
