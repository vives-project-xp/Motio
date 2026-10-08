# MOTIO SIMV4

SIMV4 is een zelfstandige kopie van SIMV3 met een compactere opstelling en een houten box van **358 × 404 × 108 mm** (buitenafmetingen). Alle modelmaten blijven in millimeter. SIMV3 is intact gebleven.

## Starten

Open `index.html` rechtstreeks, of voer vanuit deze map uit:

```powershell
node tests/serve.js
```

Open [SIMV4 op deze computer](http://127.0.0.1:4174/). De server deelt alleen deze SIMV4-map. Er zijn geen externe bibliotheken of installatiecommando's nodig; voor de optionele server en tests is Node.js nodig.

## Bediening

De app opent in **Mechanical Design → 3D**. De vier afzonderlijke zijwanden en de bodem hebben elk een zichtbaarheidsschakelaar. De bovenplaat kan ondoorzichtig, semi-transparant of transparant worden weergegeven. Deze instellingen veranderen alleen de weergave; ze veranderen geen motorstand, beweging, tekening of machineconfiguratie.

De box en plaatsing volgen de meegeleverde visuele referentie. **A, B en C houden ieder een eigen motor en een eigen tandwielpaar.** Er zijn geen tandwielverbindingen tussen de drie aandrijvingen. A en B bedienen de twee penarmen; C draait het ronde papier. De draaipunten, armlengtes, motorbeugels en asdoorvoeren zijn aan de compactere box aangepast. De uiteinden van beide armen komen bij dezelfde penas samen.

De krukken blijven 65 mm; de penarmen zijn nu 180 / 160 mm. Het papier blijft Ø210 mm met een veilige tekenradius van 95 mm. De eigen tandwielparen liggen onder de bovenplaat en zijn zichtbaar te maken via de behuizingsbediening. De bovenplaat en bodem zijn 8 mm dik; de vier zijwanden zijn 8 mm dik. De hoogte van 108 mm is de buitenhoogte van de box, zonder het mechanisme erboven.

Alle bestaande SIMV3-bedieningen blijven beschikbaar: vier tabbladen, 2D/3D, camera draaien/verplaatsen/zoomen en boven-/zij-/isometrisch aanzicht, patronen en woordgenerator, afzonderlijke motorsnelheden/richtingen/fasen, configuratie, validatie en SVG-/CSV-export.

Om te tekenen: kies in **Simulator** een patroon, druk **Power on → Home → Play**. A/B bepalen de penpositie en C draait het papier. De penhoogte blijft handmatig vastgezet. **Pause** en **Stop** remmen af; **Play** hervat. **Reset → Home** begint opnieuw. Home zonder Reset kan een terugkeerlijn achterlaten. De snelheidsregelaar versnelt alleen de simulatietijd. Bij **Eigen motorinstellingen** zijn de drie motorsnelheden en richtingen afzonderlijk instelbaar.

Technische configuratiewijzigingen resetten de beweging en testgegevens. Configuratie staat centraal in `js/machineGeometry.js`; kinematica, controles, 2D/3D en BOM gebruiken dezelfde configuratie. Alleen de weergave schakelen laat de lopende simulatie ongemoeid.

## Controles en exports

Voer vanuit deze map uit:

```powershell
node tests/logic.test.js
node tests/integration.test.js
node tests/patterns.test.js
node tests/export.js
```

De regressiecontroles toetsen de FK/IK/Jacobiaan-berekeningen, onafhankelijke A/B/C-aandrijving, papiercoördinaten, bereik en vrijloop, motorlastmodel, foutstops en afremmen. De integratiecontrole gebruikt DOM/canvas-testdoubles voor de bestaande bediening, camera's en behuizingsschakelaars. De patroontest doorloopt alle bestaande patronen en letter-/woordgevallen op de live stapgrootte van 10 ms, inclusief pauzeren/hervatten. Echte WebGL en de zichtbare opstelling worden aanvullend in de browser bekeken.

`tests/export.js` genereert de mechanische SVG, doorsnede, pendetail en vijfkoloms BOM-CSV in `exports/`, met de SIMV4-configuratie.

De simulatie behoudt de bestaande geometrische veiligheidscontroles en geschatte motorbelasting. De afgelezen motorcurve bewijst het werkelijke gedrag bij lage RPM niet; drivercondities, belasting, spelingen en toleranties moeten op het fysieke prototype worden bevestigd. De tekeningen zijn een simulatie en geen productie-CAD.
