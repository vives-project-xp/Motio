# MOTIO SIMV5

Zelfstandige simulator met directe 1:1-aandrijving en een gedetailleerde montagehandleiding. Deze uitbreiding blijft volledig binnen SIMV5 en gebruikt de bestaande geometrie, renderer en animatielus. Geen extra libraries of installatie nodig.

## Starten

Open `index.html` rechtstreeks in de browser, of start vanuit deze map:

```powershell
node tests/serve.js
```

Open vervolgens [SIMV5](http://127.0.0.1:4176/).

## Montagehandleiding

De tab **Montagehandleiding** heeft 46 kleinere montagestappen. Elke stap toont de instructie, aantallen voor deze stap en voor de hele machine, afmetingen, materiaal en uitvoering. De aantallen volgen uit unieke fysieke exemplaren in het model; meerdere tekenprimitieven van één motor, arm of beugel tellen samen als één onderdeel. De gegevens komen uit dezelfde BOM als de onderdelenlijst en CSV-export.

Naast de volledige opbouw staat een uitvergroot los voorbeeld van elke nieuwe componentsoort. Kleine bouten, ringen en moeren worden naast elkaar getoond. In de montage zijn alle benodigde exemplaren aanwezig. De nieuwe onderdelen blijven eerst kort buiten de constructie staan en schuiven daarna op hun plaats. De animatie duurt 5 seconden en gebruikt dezelfde renderlus als de simulator.

Gebruik de pijltjes om te bladeren en **↻ Opnieuw** om de animatie te herhalen. Bij terugbladeren verdwijnen latere onderdelen; eerdere onderdelen blijven op hun plek. Alleen bij de expliciete plaatsingsstappen bewegen complete, eerder opgebouwde eenheden samen. Terugkeren naar de tab speelt de geselecteerde stap opnieuw af. Doorzichtig hout en gedeeltelijk doorzichtige lagerhouders laten interne verbindingen zien. Een aantal verbindingen krijgt automatisch een detailcamera op A of C; uitzoomen toont de andere exemplaren. Sleep op het grote model om te draaien en scroll om te zoomen.

De handleiding gebruikt een vaste beginstand uit de huidige configuratie en verandert geen live simulatie, tekening of andere camera. Zonder WebGL tekent de handleiding dezelfde modelvlakken met Canvas 2D.

## Materialen en mechanische details

- Box, bodem, bovenplaat, zijwanden en rond draaiplateau: **MDF van 4 mm**.
- Motorbeugels, lagerhouders, krukken, penarmen, plateauflens, penhouder, centreer- en afstandsbus, draaiknop: voorlopig PETG.
- Assen, holle penas, scharnierposten, borgingen, bouten, ringen en moeren: staal; lagers zijn standaard kogellagers.
- Askoppelingen: standaard metaal met elastisch element. Inzetten voor de drie naafstelschroeven: messing.
- Drukpad: TPU of vergelijkbaar zacht materiaal. Pen en papier: gewone gebruiksonderdelen.

De armen hebben nu een kokerdoorsnede van **24 × 24 mm met 3 mm wand**, in plaats van de oude aluminiumkoker van 20 × 20 × 1,5 mm. De krukken hebben verdikte naven. De armlagen zijn 2 mm verhoogd naar 86/118 mm om de grotere doorsnede vrij te houden van de penhouder. De geometrische tekenroute is opnieuw gecontroleerd; dit bewijst geen printsterkte.

De voorlopige rekenschatting gebruikt **E = 1500 MPa** en **ρ = 1270 kg/m³** voor PETG, gebaseerd op het [Prusament PETG-datablad, versie 1.1](https://storage.googleapis.com/prusa3d-content-prod-14e8-wordpress-prusament-prod/2023/10/9f8d2165-tds_prusament-petg_n_en.pdf). Deze waarden gelden niet automatisch voor jullie print. Het model vereenvoudigt de kokerwand als volledig gevuld en isotroop; laaghechting, kruip, printinstellingen, eindstukken, lagerpassing en verbindingen zijn niet gevalideerd. De validatietab meldt de printconstructie daarom afzonderlijk als **NIET BEWEZEN**. De draaiende massa van 0,45 kg blijft een expliciete conservatieve ontwerpschatting die gewogen moet worden.

De [meegeleverde motortekening](references/motor-dimensions.png) bepaalt de referentiematen: 42,3 mm maximaal, lengte 38 ±1 mm, as Ø5 +0/−0,012 mm en 24 ±1 mm lang, centreerpassing Ø22 +0/−0,05 mm met 4,5 mm hoogte, en vier M3-gaten op 31 ±0,2 mm met 4,5 mm gatdiepte. De geprinte beugel heeft een vrije centrale opening; de nominale motor- en configuratiematen blijven zichtbaar in de BOM.

De bevestigingen zijn een voorlopig uitgewerkte montage: 12 motorbouten M3×8 met ringen, 18 montagebouten M4×20, 4 verzonken plateaubouten voorlopig M4×18, 40 M4-ringen en 22 M4-moeren. Drie messing inzetten met stelschroeven borgen de kruknaven en plateauflens. Ook zes stalen binnenborgringen en zes askraagstelschroeven zijn zichtbaar en opgenomen in de BOM. De lokale asvlakken en de opnamegaten voor de inzetten zijn gemodelleerd. Exacte kooptypes, print-/lagerpassingen, borggroefmaten, houtverbindingen en aansluitingen van penhouder/penas blijven waar nodig benoemd als nog te bepalen. De modellen tonen koppen, schachten, moeren en ringen zonder schroefdraad; het zijn geen productieklare STL- of CAD-bestanden.

De botsingscontrole gebruikt de bijgewerkte constructie-enveloppen, inclusief kruknaven, dikkere armogen en bewegende elleboogborgingen. Kleine statische bevestigingen bij hun bedoelde aansluitingen vallen binnen een schematische montage en vormen geen afzonderlijk bewijs voor alle fabricage- en montagepassingen. Draaiende bevestigingen volgen de bijbehorende kruk of papierspindel in het zichtbare model.

## MDF-plaatdikte: 4 mm

Alle zes boxpanelen en het draaiplateau zijn standaard 4 mm MDF. De buitenmaat van de box blijft 358 × 404 × 108 mm. Daardoor worden voor- en achterwand 358 × 100 × 4 mm en de tussenliggende zijwanden 396 × 100 × 4 mm; bodem en bovenplaat zijn 358 × 404 × 4 mm. De hoogtes van de lagerhoudervoeten, hun steunpootjes en bevestigingen volgen uit de werkelijke bovenplaatdikte.

De motoren blijven 4 mm vrij boven de bodem. Met de dunnere bodem en bovenplaat staan ze 8 mm lager dan in het eerdere 8mm-model; koppelingen volgen mee en de drie aandrijfassen worden 8 mm langer. Lager-, kruk-, pen- en plateauhoogtes blijven gelijk. Montagebouten zijn nu M4×20, berekend uit de klemlengte met ringen, moer en draaduitsteek. De MDF-schijf onder het papier was al 4 mm; de plateaubouten blijven voorlopig M4×18. Model, montagehandleiding, BOM en technische SVG gebruiken dezelfde configuratie.

Deze wijziging controleert geometrie en montage, zonder een nieuwe materiaalberekening te introduceren. MDF-doorbuiging en boutdruk zijn niet gevalideerd; de bestaande sterktecontrole vermeldt dit expliciet. Gebruik doorlopende bouten met sluitringen en plet de dunne MDF-plaat niet bij het aandraaien. De draaiende massa blijft de voorlopige invoerwaarde en moet inclusief MDF-schijf en bevestigingen worden gewogen.

## Gecorrigeerde montageverbindingen

De beugels hebben buitenliggende montageoren op 78 mm h.o.h., met vrije Ø4,6 mm doorvoeren in hout en PETG. De moeren liggen naast de verticale steunen; de lagerhoudervoeten bedekken deze verbindingen niet. De renderer toont echte openingen en hun binnenwanden, ook bij de motorflenzen, voetplaten, koppelingen en naven. Ringen, bouten en moeren worden achtereenvolgens vanaf de juiste zijde aangebracht.

De houders worden eerst boven de machine als losse eenheden opgebouwd. De onderste lagers komen van onderaf, de bovenste van bovenaf, tegen de naar binnen gerichte aanslagen. Zichtbare open stalen borgringen in buitenliggende groeven sluiten de buitenringen op. Onderste askragen worden vooraf geplaatst; daarna zakt de complete houder op het hout. De assen gaan door de lagers en onderste kragen, waarna alleen de bovenste kragen over de assen worden geschoven. Bij A/B is de onderste lagerhoogte 8 mm verhoogd om de onderste kragen en hun schroeven bereikbaar boven de plaat te houden. De koppelingen zijn vóór de houders geplaatst en hun radiale schroeven grijpen in fabrieksgaten van de koppelingen.

Flens en krukken krijgen hun messing inzetten als losse onderdelen, vóór plaatsing op de assen. Het getrapte opnamegat is al zichtbaar bij de introductie. De stelschroef klemt daarna op een lokaal vlak in de stalen as: er is geen dwarsgat nodig. Het flensgat ligt tussen de vier plateaubouten om onderlinge kruising te vermijden. De plateaubouten liggen op straal 24 mm en zijn voorlopig 18 mm lang, zodat ze niet in de C-houder steken. De ringen en moeren worden eerst zijdelings in de ruimte onder de flens gelegd; daarna worden de bouten van boven ingestoken. De gesloten afstandbus wordt tussen arm A en arm B geplaatst, voordat de bovenste arm wordt gemonteerd. De box blijft aan de onderzijde open tot de verbindingen zijn afgesteld.

De voorlopige borggroeven, asvlakken en radiale gaten verduidelijken de montage; hun productietoleranties en de exacte kooponderdelen blijven te bevestigen met leverancier en proefstukken. Dit is geen fysieke mechanische validatie.

## Bestaande bediening

De app opent in **Mechanical Design → 3D**. Simulator, patronen, woordgenerator, behuizingsschakelaars, configuratie, validatie en SVG-/CSV-export blijven beschikbaar. Om te tekenen: kies een patroon en druk **Power on → Home → Play**.

## Controles

```powershell
node tests/logic.test.js
node tests/integration.test.js
node tests/assembly-connections.test.js
node tests/mdf-thickness.test.js
node tests/patterns.test.js
```

De tests controleren onder meer FK/IK, geometrische vrijloop, motor-/belastingsschattingen, materiaalstatus, fysieke aantallen, bewegende bevestigingen, elke montagestap, alle losse voorbeelden, ontbreken van toekomstige onderdelen, behoud van eerdere posities, herhalen, navigatiegrenzen, gedeelde configuratie en bestaande simulatorbediening. De patroontest doorloopt dertien patronen en 33 letter-/woordgevallen op de live stapgrootte van 10 ms. Maak exports met `node tests/export.js`.
