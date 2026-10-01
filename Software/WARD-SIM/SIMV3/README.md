# MOTIO — Sim V3

Eerste mechanisch digitaal prototype, apart van **SIMV2**. Geen bestanden uit V2 worden aangepast of gedeeld als runtimeafhankelijkheid. Open `index.html` rechtstreeks in een moderne browser; geen installatie, CDN of externe bibliotheek nodig.

Voor de ingebouwde browser kun je vanuit de repository starten:

```powershell
node Software/WARD-SIM/SIMV3/tests/serve.js
```

Open daarna `http://127.0.0.1:4173/SIMV3/`. De previewserver luistert uitsluitend op deze computer. Stop met Ctrl+C.

## Bediening

1. **Power on → Home → Pen down → Play**. Home is een virtuele referentieroutine, geen sensor- of firmware-implementatie.
2. A, B en C hebben onafhankelijke, getekende uitgangs-RPM. Positief is met de klok mee in het bovenaanzicht (wereld-Y naar beneden).
3. Play bouwt snelheid op met begrensde versnelling. Pause/Stop heffen de pen en remmen alle drie assen gecoördineerd af. Home tijdens draaien wacht op deze stop.
4. Een mechanische interlock weigert de eerstvolgende onveilige pose; de laatste veilige pose blijft staan, de pen wordt virtueel geheven en Home is opnieuw nodig. Deze onmiddellijke ideale foutstop is **geen fysiek remmodel**. Een echte machine moet eerder remmen met voldoende remafstand en hardwarefouten herkennen.
5. Wijzigingen aan profielen, fases en geometrie resetten de digitale simulatie en vereisen Home. Reset en Power off zijn simulatoracties, geen hardwarecommando's. Een echte machine mag configuratiewijzigingen pas na stilstand uitvoeren.
6. **Mechanical Design**: maatgebaseerd 2D-bovenaanzicht, zijdoorsnede, montage en controles. **3D**: sleep om te roteren, Shift/rechts-sleep om te pannen, scroll om te zoomen, klik op een onderdeel voor uitleg. Met toetsen: pijlen draaien, +/− zoomen, 0 herstelt. Boven/zij/isometrisch zijn vaste camerastanden. Naar onderen draaien toont de onderzijde.
7. Semi-exploded tilt onderdelen verticaal uit elkaar in 3D en doorsnede; dit is geen bedrijfsstand. De 2D-tekening blijft een gemonteerd bovenaanzicht. Download de 2D-SVG of de BOM als CSV. Statische referentiebestanden staan ook in [exports](exports/): [bovenaanzicht](exports/MOTIO-SimV3-mechanical.svg), [doorsnede](exports/MOTIO-SimV3-section.svg), [BOM](exports/MOTIO-SimV3-BOM.csv). Die kun je met `node Software/WARD-SIM/SIMV3/tests/export.js` opnieuw genereren.

## Van V2 naar V3

V2: één driverfase → gearverhoudingen → twee krukpennen → snijpunt van vaste armlengtes → pen in papiercoördinaten.

V3 behoudt cirkelsluiting, papiertransformatie, vaste tijdstap, traceonderbrekingen, machinebediening en patroonreferenties. De gedeelde driver en geartrain vervallen. Iedere motor heeft een eigen hoek, snelheid en acceleratieramp. De eerste preset gebruikt de uitgaande V2-snelheden als softwareprofiel, afgerond op 0,001 RPM. Door gewijzigde bouwgeometrie en aanlooprampen is het patroon geen exacte reproductie van V2.

### Mechanische keten

```
Motor A → 20T/60T riem → O_A → kruk A → E_A → arm A ─┐
                                                     P → pen
Motor B → 20T/60T riem → O_B → kruk B → E_B → arm B ─┘
Motor C → 20T/80T riem → gelagerde spindel → papierplateau
```

Het penmechanisme is een gesloten vijfstangenketen: grond, twee krukken, twee koppelarmen. Vijf revolute verbindingen O_A, O_B, E_A, E_B en P geven twee planaire vrijheidsgraden: M = 3(5−1) − 2×5 = 2. De twee penlagers liggen op dezelfde verticale schouderas; de armen draaien onafhankelijk rond deze as en zijn niet onderling vastgeklemd. De pen heeft geen derde XY-geleiding. Alleen de penbus beweegt compliant in Z om papierhoogte en pendruk op te vangen.

Alle verticale assen moeten parallel zijn. De ideale planaire keten wordt fysiek uitgevoerd met verschillende armhoogtes; de stijve penas houdt hun XY-centra coaxiaal. Een axiaal zwevende zitting/spacerregeling voorkomt dat montagehoogtefouten de lagers klemmen. Dat corrigeert geen grote hoekfouten: uitlijning blijft noodzakelijk. Lagergaten in één opspanning maken, hoogte met shims instellen en de keten vóór motorisering met de hand controleren.

## Geometrie en standaardcomponenten

Alle maten zijn **engineering startwaarden**, geen productieklare CAD of vrijgegeven stuktekeningen.

| Parameter | Startwaarde |
| --- | --- |
| Wereldnulpunt | Linkerbovenhoek van niet-geroteerd A3-papier |
| Papiercentrum / plaat | (210; 148,5), Ø526 × 4 mm aluminium |
| Draaiende massa | 2,5 kg inclusief plateau, flens en bevestiging |
| Draagplaat | X −90…700; Y −310…460; 790 × 770 × 8 mm aluminium |
| Frame | 2020 randprofielen + dwarssteun X=90; 90 mm vrije hoogte onder de plaat |
| O_A / O_B | (550; 148,5) / (210; −185) mm |
| Pivotafstand | 476,259 mm |
| Krukken A / B | Beide 40 mm hart-op-hart; 16 × 8 mm aluminium |
| Koppelarmen | A 360 / B 340 mm tussen lagercentra; Al koker 20 × 20 × 1,5 mm |
| Krukhoogtes | A z64 / B z96 mm |
| Armhoogtes | A z84 / B z116 mm; kokerhoogte 20 mm |
| Papierplaat | Midden z30; onder/boven z28/z32; clips maximaal z36 |
| Riemaandrijving | HTD 3M, 9 mm breed, gemeenschappelijk hoogtevlak z−12 |
| Motorbeugels | Frontvlak z−30; 5 mm open montageplaat z−30…−25; verticale bevestigingen tot onderkant draagplaat |
| A/B riem | 270 mm, 90 tanden, 20T/60T; exacte steeklijn-hartafstand circa 72,5 mm |
| C riem | 519 mm, 173 tanden, 20T/80T; hartafstand 182,24 mm |
| Motorplaatsing | A radiaal rechts van O_A; B boven O_B; C rechts van papierspindel |
| Motoren | 3 × NEMA17, 1,8°, 42 × 42 × 48 mm, Ø5-as, 0,45 Nm houdkoppel als componentvoorbeeld |
| Krukassen | Ø8 staal, lagercentra A z12/44, B z44/76; circa 100/132 mm lang |
| Papierspindel | Ø12 staal, 6001-lagercentra z−36/8; circa 95 mm lang; flens Ø60 z20…28 |
| Lagering | 8 × 608 (8 × 22 × 7) + 2 × 6001 (12 × 28 × 8) |
| Pen | Veerbus, circa 2 N neerwaarts, 5 mm vrije Z-weg, handmatige lift als mechanisch minimum |

Lagerhuizen blijven vast; pulleys, assen en krukken draaien. Pulleys en krukken hebben klemnaven. Een coaxiale flexibele askoppeling is niet nodig: motor- en werkassen zijn parallel verbonden met een riem. Riemen sturen het koppel naar afzonderlijk gelagerde assen en vermijden arm-/plateaulast op motorlagers. De motorlagers dragen wel riemvoorspanning; die moet op toegestane radiale last worden gecontroleerd.

De onderplaat heeft doorvoeren voor de drie werkassen. Motorbeugels en lagerhuizen worden gebout en met paspennen uitgelijnd. De hoge B-lagersteun loopt door tot z8 en heeft geen vrijhangend lagerhuis. Motorassen lopen van z−30 tot z−6; het pulleyvlak ligt op z−12, boven de motorbeugel en onder de draagplaat. De dwarssteun zit op X=90 en loopt niet door de papierspindel of pulleys. Alle riemen liggen onder de draagplaat, beide armsystemen boven de papierplaat. Lagerpassingen, naafdiameters, sleuflengtes, eindstukken, boutpatronen en voorspanning moeten nog in detail-CAD worden vastgelegd.

De complete componentenlijst met aantal, functie, type, specificatie en reden staat in **Components / BOM**. De CSV gebruikt puntkomma's en UTF-8 met BOM voor lokale spreadsheetsoftware. Standaardcomponenten zijn categorievoorstellen: pulleyboringen, klemnaven en riembeschikbaarheid controleren vóór bestelling.

## Kinematische en mechanische validatie

`mechanics.js` sluit de keten met twee cirkels en behoudt expliciet de negatieve montagetak. Geen automatische takwisseling bij slechte geometrie. De pen-Jacobiaan wordt bepaald door de twee armconstraints; A en B worden nooit als twee zelfstandige penposities behandeld.

### Sluiting en singulariteiten

Met pivotafstand D en krukstralen r_A/r_B ligt de afstand tussen ellebogen gegarandeerd tussen D−r_A−r_B en D+r_A+r_B. Deze grenzen worden analytisch getoetst aan |L_A−L_B| en L_A+L_B. Dezelfde grenzen leveren een conservatieve ondergrens voor |sin γ|, waarbij γ de hoek tussen de koppelarmen bij P is. De live interlock stopt onder 0,25.

Standaardgeometrie:

- Alle krukhoeken kunnen de keten sluiten; analytische |sin γ| ≥ **0,93287**.
- Raster 72 × 72 = **5.184** poses: γ circa **68,9…105,2°**, geen afgekeurde poses, minimaal **6 mm** gemodelleerde vrijloop.
- Penbereik in dit raster: X circa **150,0…233,3**, Y **109,3…195,0 mm**. Met papierrotatie blijft de standaardpen ruim binnen de A3-grenzen; V3 tekent alleen binnen het papier.
- Kruk/arm-collineariteit kan periodiek voorkomen. Dan verliest die motor lokaal Cartesian effect (seriële singulariteit). De gesloten keten blijft forward aangedreven zolang de twee koppelarmen niet collineair worden. Dit is een patroonmachine met krukprofielen, geen robot die elke willekeurige XY-opdracht kan volgen.

### Botsingen en bewegingslimieten

Live controles gebruiken gesegmenteerde arm-/krukenveloppen, verticale diktes, vaste lagertorens, papierhoogte, penhouderafstand en draagplaatafmetingen. Intentionele verbindingen bij E_A/E_B/P zijn uitgezonderd. Er zijn aparte controles op motor-/pulleyvrijloop t.o.v. het onderframe. Geen dubbele materiaalvolumes in hetzelfde armvlak; z84/z116 geeft 12 mm tussen de kokers. De laagste gemodelleerde vrijloop is 6 mm bij de eigen kruk/armhoogtes. Schouderposts, borgkappen en lagerzittingen hebben lokale functionele passingen en vallen niet onder deze algemene 3 mm vrijloopgrens.

Dit is een controle van **ontwerpenveloppen**, geen volledige botsingsanalyse van schroefkoppen, werkelijke riemtanden, kabels, montagefouten en toleranties. Het raster bewijst geen continue botsingsvrijheid tussen alle poses. De analytische grens bewijst wel sluiting en afstand tot de parallelle singulariteit voor alle hoeken van de standaardketen. Iedere simulatiestap wordt vervolgens gecontroleerd; grote aanroepintervallen worden in 2 ms verdeeld.

Uitgaande limieten A/B ±8 RPM en 0,4 rad/s²; C ±4 RPM en 0,2 rad/s². Pensnelheid maximaal 120 mm/s; penversnelling maximaal 150 mm/s². Normale stop is een begrensde ramp. De virtuele Home gebruikt een gezamenlijk quintisch A/B-pad met begrensde asversnelling en snelheid, met voorafgaande padscan en live pencontroles. Er is geen automatische individuele motorhoming die aan de gesloten keten trekt.

### Krachten, buiging en knik

**Startlasten:** 2 N horizontale penlast, 2 N pendruk, 5 N conservatieve verticale kokerbuiglast; aluminium E=69.000 N/mm²; geschatte mechanische efficiëntie 85%.

- Armkracht worst-case ≤ F/|sin γ|: maximaal circa **2,144 N** in de standaardscan.
- T_A/B = F × norm(J-kolom) + 0,025 Nm reserve: maximaal circa **0,110 Nm** per uitgaande krukas.
- T_C = F × penradius + I_plaat × α_C + 0,03 Nm reserve: maximaal circa **0,190 Nm** in de standaardscan. I_plaat = mR²/2 met m=2,5 kg.
- Aangenomen motorbedrijfskoppel 0,20 Nm geeft bij 85% rendement **0,510 Nm** A/B en **0,680 Nm** C. Houdkoppel is niet gelijk aan beschikbaar dynamisch koppel; motorcurve/driver/voeding verifiëren.
- 20 × 20 × 1,5 mm koker: I=(20⁴−17⁴)/12. Conservatieve cantileverbuiging δ=FL³/(3EI) bij 5 N en L=360: circa **0,177 mm**. Dit model bevat geen eindstuk- en lagercompliance.
- Ideale scharnierend ondersteunde Eulerknik π²EI/L²: circa **33,5 kN**. Dit is een theoretische kokerwaarde, geen toegestane last van de complete arm of scharnieren.

De Z-offset van 32 mm aan P kan bij circa 2,15 N armkracht een momentorde van 0,07 Nm op de penas/eindstukken geven. Een Ø8 stalen schouderas is een redelijke startmaat; daadwerkelijke lagerkanteling, boutverbindingen en pencompliance moeten worden gecontroleerd. De ellebogen gebruiken korte stalen Ø8-schouderposts, door de 8 mm kruk geklemd en geborgd met M6. De binnenring wordt tussen spacers geklemd; de buitenring draait vrij met de arm. Bij 2,15 N en een conservatieve 20 mm uitkraging is het buigmoment circa 0,043 Nm, nominale schouderbuigspanning circa 0,86 MPa (32M/πd³, exclusief kerffactor). De schroefdraad ligt buiten het Ø8-belastingsvlak. Een vaste dubbele-afschuivingsvork is hier ongunstig: haar zijwand zou in de volledige relatieve armomloop komen. Lage penlast, lichte kokers, korte schouderposts en gespreide hoofdlagers beperken torsie en buiging. Er is geen claim van FEA, levensduurvalidatie of een bouwvrijgave.

## 3D-uitvoering

Zelfstandige orthografische geometrie met WebGL-dieptetest op een canvas: motorblokken, werkassen, lagerhuizen, pulleys, riemspannen, frame, krukken, armkokers en pen. Een transparante draagplaat laat de onderliggende aandrijvingen inspecteren. Er worden geen CAD-bestanden geladen. Zonder WebGL verwijst de interface naar de 2D-tekening en doorsnede, die beschikbaar blijven. De exploded offsets zijn illustratief, geen alternatieve montagehoogtes.

## Bouwverificatie die nog nodig is

1. Detail-CAD en toleranties: lagerpassingen, schouderlengtes/spacers, vlakheid en parallelle assen. Geen axiale klemkracht op de draaiende buitenringen.
2. Motorcurve, riembelasting en spanning volgens fabrikant; gemeten penwrijving en werkelijke massa's invullen. Koppelreserve en remafstand voor foutgevallen bevestigen.
3. Eindstukken, kruknaven en plaatflens op stijfheid, borging en lokale belasting controleren; papierplaat op slingering meten.
4. Ketting eerst ongemotoriseerd met handlift vrij laten lopen, daarna langzaam en gecoördineerd met geheven pen. Geen homing met één geblokkeerde as.
5. Drie drivers, outputreferentiesensoren en hardwarestop/foutdetectie toevoegen. Een open-loop simulator detecteert geen gemiste stappen of echte blokkering; encoder-/driverfouten moeten alle betrokken aandrijvingen stoppen. De penlift in de UI is virtueel; handmatige lift is de minimale bouwvariant.

## Tests

Vanuit de repository:

```powershell
node Software/WARD-SIM/SIMV3/tests/logic.test.js
node Software/WARD-SIM/SIMV3/tests/integration.test.js
node Software/WARD-SIM/SIMV2/tests/logic.test.js
node Software/WARD-SIM/SIMV2/tests/integration.test.js
```

V3: 20.736 A/B-combinaties, vaste armlengtes en montagetak, analytische singulariteitsgrens, Jacobiaan t.o.v. eindige verschillen, tandriemhartafstanden, papiertransformaties, onafhankelijke assen, ramps/stop, Home, traceonderbrekingen en interlock vóór positiecommit. Integratie: HTML-controls, navigatie, alle presets, technische SVG, export-Blobs, 3D/canvas en eindige rendercoördinaten. Deze tests vervangen geen fysieke proefbouw.

Visueel gecontroleerd in de ingebouwde browser op smalle en desktopbreedte: tekenen, afremmen, 2D, 3D-dieptetest, camerastanden, keyboardrotatie/zoom, semi-exploded, penonderdeellabel en BOM. Geen browserconsolefouten waargenomen. De downloadcontrole leverde in deze ingebouwde browser geen voltooid download-event; exportinhoud en bestandsnamen zijn daarom aanvullend getest in de integratie en als statische bestanden meegeleverd. Bewijsbeeld: `output/simv3-mechanical.jpg` in de repository.

## Primaire componentbronnen

- [STEPPERONLINE NEMA17 17HS19-1684S1](https://www.stepperonline.ca/nema-17-bipolar-1-8deg-45ncm-64oz-in-1-68a-2-8v-42x42x48mm-4-wires-17hs19-1684s1.html): motorcategorie, houdkoppel en Ø5-as.
- [SKF 608-2RSH](https://www.emarketplace.in.skf.com/deep-groove-ball-bearing/608-2rsh): 8 × 22 × 7 mm.
- [SKF 6001-2RSH/C3](https://www.skf.com/ch/de/productinfo/productid-6001-2RSH%2FC3): 12 × 28 × 8 mm. Bron voor maat; normale CN-speling als startkeuze, geen automatische C3-selectie.
- [Gates Light Power and Precision Manual](https://assets.gates.com/content/dam/gates/home/knowledge-center/resource-library/catalogs/light-power-and-precision-manual.pdf): HTD 3M-categorie, lengtes en ontwerpregels. Stock, breedte en pulley-naafcompatibiliteit per leverancier bevestigen.

Bronnen gecontroleerd tijdens implementatie op 1 oktober 2026. De machinegeometrie en prestatieaannames zijn eigen engineeringkeuzes.
