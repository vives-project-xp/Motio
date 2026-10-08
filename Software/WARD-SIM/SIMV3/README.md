# MOTIO V4 - mechanische simulator

V4 verfijnt de bestaande code in `SIMV3/`. De bestaande kinematica, WebGL-weergave en centrale configuratie blijven behouden. Geen installatie of externe runtimebibliotheken nodig.

Open `index.html` rechtstreeks, of start vanuit de repository:

```powershell
node Software/WARD-SIM/SIMV3/tests/serve.js
```

Open http://127.0.0.1:4173/SIMV3/.

## Bediening

Kies een patroon → Power on → Home → Play. De scrollbare lijst bevat negen berekende voorbeeldafbeeldingen: cirkel, drie bloemen, golfring, twee rozetten, spiraal en VIVES. Het volledige verwachte resultaat staat licht op het papier; de echte tekenlijn verschijnt donker en gebruikt onafhankelijk de bestaande voorwaartse kinematica. Voorbeeld tonen kan worden uitgeschakeld. A/B bepalen samen de penpositie; C draait het papier. Bij Eigen motorinstellingen gelden de invoersnelheden en richtingen voor de krukken en het papier. De live motorwaarden zijn de echte motoraswaarden: tegengesteld en vermenigvuldigd met de reductie. Positieve rotatie is met de klok mee in bovenaanzicht (+Y naar beneden).

De penhoogte wordt handmatig vastgezet. Home en afremmen tekenen ook. Pause/Stop remmen het ingestelde profiel af; een foutstop houdt de laatste toegestane pose vast. Dit is een virtuele interlock, geen garantie dat een echte machine instantaan kan stoppen. De geselecteerde patronen bewegen de pen over de al bewezen radiale route terwijl het papier draait. De acht geometrische figuren blijven binnen radius 81,7 mm; VIVES blijft binnen 82,7 mm en stoppen wanneer het volledige voorbeeld is getekend. De standaardbloem met vijf blaadjes duurt circa 70 simulatieseconden (circa 14 seconden bij 5×). Pause/Stop remmen op dezelfde curve af; Play hervat. Reset → Home begint een nieuwe tekening zonder het eerdere spoor. Home zonder Reset kan een terugkeerlijn achterlaten omdat de pen vast op het papier blijft. Willekeurige profielen hoeven niet volledig veilig te zijn: verboden standen worden geblokkeerd.

VIVES is een vaste lijntekening, geen algemene tekstgenerator. Afgeronde bubbelcontouren worden onderaan vloeiend verbonden met Catmull-Rom-curven, zonder de pen op te tillen of bij iedere knoop te stoppen. A/B blijven op de bewezen radiale route en C draait in beide richtingen: `r = hypot(x,y)` en `papierhoek = routehoek − atan2(y,x)`. De letterlijn ligt boven het papiercentrum zodat de papierhoek nergens onbepaald is. Het woord duurt circa 103 simulatieseconden bij 1×, circa 21 seconden bij 5×. Het profieltempo is 0,6 patroonrondes per minuut; de actuele A/B/C-snelheden variëren en worden door de bestaande limieten bewaakt.

1× gebruikt de werkelijke ingestelde bewegingssnelheid; de schuifregelaar versnelt alleen de simulatietijd. De acht geometrische patronen gebruiken tweemaal hun eerdere profieltempo. De voorlopige uitgangslimieten zijn A/B 8 RPM en 1 rad/s², C 16 RPM en 3 rad/s². Bij VIVES op het nieuwe tempo geeft het model circa 8,3 / 4,5 / 48 motor-RPM als pieksnelheden en circa 0,06 Nm benodigd motorkoppel, met de huidige geometrie en belastingaannames. Dit zijn berekende startinstellingen voor een stroomgeregelde driver op 24 V en 1,68 A, geen gemeten maximale machinesnelheid. De drivercondities blijven onbevestigd totdat de echte opstelling is gecontroleerd.

Precies vier tabbladen: Simulator, Mechanical Design, Validation en Components / BOM. Technische instellingen zijn uitgeklapt beschikbaar. Configuratiewijzigingen resetten de beweging, tekening en testgegevens.

### Woordgenerator

Typ 1 tot 8 letters (A–Z) in de woordgenerator. Kleine letters worden hoofdletters; spaties, cijfers en leestekens worden niet geaccepteerd. Het voorbeeld reageert tijdens het typen. **Gebruik woord** zet het woord op het papier en vraagt opnieuw Home; daarna werkt de bestaande bediening. Het woord wordt bewaard als `wordText` in de centrale configuratie en kan dus mee worden geëxporteerd.

De generator gebruikt een klein ingebouwd alfabet met afgeronde contouren, smalle I en bredere M/W. Letterverhoudingen blijven behouden; de grootte en tussenruimte worden automatisch bepaald. De volledige curve blijft binnen 86% van de veilige radius. De tekst wordt horizontaal gecentreerd en boven het papiercentrum geplaatst, zodat de bestaande radiale penroute en papierrotatie kunnen worden hergebruikt. De letters en binnenlussen vormen één pad met de pen op het papier. De tekentijd volgt het aantal curvegedeelten, zodat langere woorden meer tijd krijgen. Er zijn geen externe lettertypen of extra bibliotheken nodig.

## Bouwgeometrie

| Onderdeel | Keuze |
|---|---|
| Papier en draaiplateau | Rond Ø210 mm, gecentreerd |
| Veiligheidsmarge | 10 mm; tekenradius 95 mm / diameter 190 mm |
| Krukken A/B | 65 mm h.o.h. (voorheen 40 mm) |
| Penarmen A/B | Bestaande 360 / 340 mm h.o.h. |
| Draaipunten A/B | Bestaande (550,148.5) / (210,-185) mm |
| A/B tandwielparen | 20:60 tanden; module 1,5; hartafstand 60 mm; 3:1 |
| C tandwielpaar | 20:80 tanden; module 1,5; hartafstand 75 mm; 4:1 |
| Tandprofiel | Rechte tanden, 20° drukhoek, breedte 9 mm |
| Pen | Holle joint, twee onafhankelijke armlagers, manuele M4-klem |
| Onderplaat | 605 × 605 × 8 mm; frame en steunen passen binnen dezelfde plaat |

Eén motor- en één uitgangstandwiel per aandrijving. Uitwendige tandwielen draaien tegengesteld. De involute visualisatie gebruikt bijpassende tooth/gap-fases in 2D en 3D; het profiel is geen productie-CAD. De berekende theoretische contactratio is circa 1,67 voor A/B en 1,69 voor C. Naaf, materiaal, passingen en werkelijke tandspeling nog kiezen vóór fabricage.

## Bereik en veiligheid

De pen hoeft niet alle XY-punten zelfstandig te bereiken. Een continue radiale machinepositie `P(s) = papiercentrum + s·(cos(-140°),sin(-140°))`, voor `0 ≤ s ≤ 95 mm`, bestrijkt met onafhankelijke papierrotatie iedere radius en papierhoek.

`validation.js` controleert deze route over 190 aaneengesloten intervallen van 0,5 mm. Het gebruikt exacte afstandsgrenzen tot de draaipunten, de crank/arm-driehoek voor seriële singulariteiten, begrensde elleboogverplaatsingen voor parallelle sluiting en verplaatsingsenveloppen voor vrijloop. Dit zijn intervalgrenzen voor de volledige route, geen PASS op basis van losse steekproeven.

Voor de standaardconfiguratie: seriële sinusmarge minstens 0,410; parallelle sinusmarge minstens 0,991; Jacobiaanconditie hoogstens 2,79; gemodelleerde vrijloop minstens 4,22 mm (eis 3 mm). Volledige veilige tekencirkel: PASS in dit geometrische model. Botsingen en singulariteiten: PASS op deze route, met die reikwijdte expliciet in de interface. De fysische motorcapaciteit en spelingen: NIET BEWEZEN.

De bestaande faserastertest en 20 s omkeerproef blijven op de achtergrond beschikbaar. Een raster bewijst geen globale veiligheid. De simulator weigert kritische singulariteiten, botsingen, assembly/working-branchwissels en een penpositie buiten radius 95 mm. Tekensporen staan uitsluitend in roterende papiercoördinaten; papier en spoor draaien samen in alle weergaven.

## Motorbron en berekeningen

Bron: [meegeleverde SY42STH38-1684A-datasheet](../../../Research/Datasheets/Stappenmotoren/SY42STH38-1684A.pdf).

Drie identieke motoren: 1,8° (200 volle stappen/omwenteling), 1,68 A, 2,8 V per fase, houdkoppel 0,36 Nm, as Ø5 mm, motorbreedte maximaal 42,3 mm, lengte 38 ±1 mm en vier M3-gaten op 31 ±0,2 mm. De motor wordt met een stroomgeregelde driver gevoed; 2,8 V is de nominale fasespanning, de curve gebruikt een voeding van 24 V.

De pull-out-curve is ongeveer afgelezen uit de PDF. Condities: 24 VDC, constante stroom 1,68 A, halfstap. De x-as is PPS, niet RPM: 400 pulsen/omwenteling geeft `RPM = PPS × 60 / 400`. Het getoonde curvebereik 200–5000 PPS is 30–750 RPM. Afgelezen dynamisch koppel circa 0,26 Nm bij 30 RPM, oplopend naar circa 0,30 Nm bij 105 RPM en aflopend naar circa 0,19 Nm bij 750 RPM. Er wordt geen curve buiten dit bereik geëxtrapoleerd en geen houdkoppel als dynamisch koppel gebruikt.

Bij de patroonprofielen wisselen A/B van snelheid en richting; C draait bij de standaardbloem op maximaal 3,6 motor-RPM. De lage motorsnelheden liggen buiten het gepubliceerde curvebereik. Daarom blijft dynamische capaciteit daar niet aangetoond. Bij VIVES bereikt C circa 48 motor-RPM, binnen het curvebereik, maar ook dit patroon passeert lagere snelheden en stilstand. Ook binnen het curvebereik moet de gebruiker drivercondities bevestigen (`motorCurveConditionsConfirmed`) voordat een curvevergelijking als onderbouwd geldt. Een eigen gemeten curve kan via het bestaande `motorCurves`-veld, met bron, oplopende `[RPM,Nm]`-punten en `conditionsConfirmed:true`, worden ingevoerd. Werkelijke belastingmetingen blijven nodig.

Volle motorstappen per uitgangsomwenteling: A/B 600, C 800. In halfstap zijn dit 1200 / 1600 pulsen. Het bestaande gekoppelde lastmodel gebruikt penlast, arm-/krukmassa, inertie, wrijving, versnelling en rendement; het is een schatting. Aangenomen: penwrijving 2 N, pendruk 2 N, aluminium E=69000 N/mm²/dichtheid 2700 kg/m³, efficiëntie 85%, draaiende massa 0,45 kg en geschatte rotor-/tandwielinertie. Alleen de Ø210×4 mm aluminiumplaat weegt circa 0,374 kg; 0,45 kg omvat een voorlopige flens-/papierbijdrage. Deze aannames komen niet uit de motorcurve.

## Centrale bestanden en controles

`machineGeometry.js` bevat de centrale configuratie en gedeelde constructievolumes. Kinematica, papiertransformatie, collision checking, motorberekeningen, 2D/3D, Validation en BOM gebruiken dezelfde configuratiesnapshot. `motorAnalysis.js` bevat alleen de afgelezen broncurve, met het bestaande configuratieveld voor eigen curves. `patterns.js` bevat acht eenvoudige figuren en één vaste letterlijn met hun voorbeelden; het geselecteerde `patternId` staat in dezelfde centrale configuratie. De beginhoeken worden uit inverse kinematica bepaald. De bestaande simulator berekent de daadwerkelijke penpositie, snelheid, versnelling en veiligheidscontroles.

```powershell
node Software/WARD-SIM/SIMV3/tests/logic.test.js
node Software/WARD-SIM/SIMV3/tests/integration.test.js
node Software/WARD-SIM/SIMV3/tests/patterns.test.js
node Software/WARD-SIM/SIMV3/tests/export.js
```

De tests controleren 5184 FK/IK/Jacobiaanstanden, tandwielhartafstanden en rotatierichting, ronde grenzen, het continue bereikbewijs en onafhankelijke papiercoördinaten, collision-fixtures, lastmodel, motorcurvecondities, handmatige penhoogte, behoud van de laatste geldige pose, afremmen, centrale configuratiedoorwerking, vier tabs, vijf controles en vijfkoloms CSV. De patroontest voert alle negen profielen volledig uit, controleert pauzeren/hervatten, de overeenkomst tussen FK en het onafhankelijke polaire voorbeeld, de veilige grens en de compactere plaat. DOM/canvas-testdoubles worden aangevuld met visuele browsercontrole van echte WebGL en de interface.

`exports/` bevat V4-SVG-tekeningen en de vijfkoloms BOM-CSV. Sim V1/V2 blijven historische versies.

Nog te bevestigen aan het prototype: driver/voeding, motorlast bij lage RPM, tandflankspeling, lager-/aspassingen, toleranties, papierloop, schroef- en naafdetails. Het envelopmodel bevat niet alle bevestigingskoppen en kabels. Het geometrische bereikbewijs is geen fysieke bouwvrijgave.
