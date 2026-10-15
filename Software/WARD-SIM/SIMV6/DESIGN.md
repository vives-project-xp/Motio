# SIMV6 — bouwontwerp en onderbouwing

**Revisie PETG-krukken: alleen de krukken en noodzakelijke aansluitmaten zijn aangepast. Geen tests, bewegingscontrole of nieuwe lastvalidatie uitgevoerd, op verzoek van de gebruiker.**

## Uitgangspunt en onderdelenkeuze

De actuele SIMV5 is gekopieerd, inclusief bestaande lokale wijzigingen. Alle aanpassingen voor deze opdracht staan in SIMV6. De XY-hartafstanden, krukstralen 65/65 mm, armlengtes 180/160 mm en het plateau Ø210 blijven behouden. De box blijft 358 × 404 × 108 mm, met panelen van 4 mm MDF.

De drie stelschroefnaven zijn vervangen door [goBILDA 1309-0016-0005 Sonic Hub-klemnaven](https://www.gobilda.com/1309-series-sonic-hub-5mm-bore/). De ronde Ø5-boring wordt door twee meegeleverde tangentiële **M4×14-klembouten met 3 mm inbus** gesloten. Geen bout drukt tegen de motoras; een vlakke aszijde is niet nodig. Het [fabrikantmaatdiagram](references/clamping-hub-schematic.png) bepaalt **Ø32 × 8 mm, een centreerrand Ø14 × 2 mm en vier getapte M4-gaten op 16 × 16 mm**. De centreerrand wijst naar beneden. Het model toont een vereenvoudigde buitenenvelop, splitboring en tangentiële bouten; de exacte gepatenteerde buigvorm volgt het kooponderdeel. Koop drie naven, zonder extra assen, lagers of adapters.

De [werkelijke motortekening](references/motor-dimensions.png) bepaalt: 42,3 × 42,3 × 38 mm, vier M3 op 31 × 31, centreerrand Ø22 × 4,5, as Ø5 × 24 ±1 en maximaal 4,5 mm draadgatdiepte. Het model maakt geen fictief vlak op de ronde motorassen.

## Hoogtes en montage

Alle Z-maten beginnen bij het motorflensvlak, gelijk aan de onderkant van de bovenplaat.

| Onderdeel | Z-bereik / hoogte (mm) |
|---|---:|
| Motoren A/B/C | −38 … 0 |
| MDF-bovenplaat | 0 … 4 |
| Centreerrand | 0 … 4,5 |
| Vlakke stalen plaatjes | 4 … 5,5 |
| Motoras, nominale / uiterste tip | 24 / 23 … 25 |
| Klemnaaf A, lichaam / centreerrand | 7 … 15 / 5 … 7 |
| Geprinte PETG-kruk A, 6 mm | 15 … 21 |
| Klemnaaf B, lichaam / centreerrand | 16 … 24 / 14 … 16 |
| Geprinte PETG-kruk B, 6 mm | 24 … 30 |
| Klemnaaf C, lichaam / centreerrand | 14 … 22 / 12 … 14 |
| MDF-plateau / papier | 22 … 26 / vanaf 26 |
| Hart arm A / B | 41 / 62 |
| Arm A / B, 16 mm hoog | 33 … 49 / 54 … 70 |
| Penklem, centrum | 86 |

De motorcentreerrand steekt 0,5 mm boven het MDF en valt vrij in Ø22,5 van de staalplaat. De onderste centreerrand van klemnaaf A blijft 0,5 mm boven deze motorcentreerrand; het naaflichaam blijft 1,5 mm boven het staal. Dit zijn bewust kleine lokale montageafstanden, afzonderlijk van de 3 mm armvrijloop. Bij montage met een voelermaat controleren; de klemnaaf mag nergens aanlopen. Op de minimale as van 23 mm hebben A/C **10 mm overlap** en B **9 mm overlap**: de B-naaf zit 1 mm hoger en heeft 7 mm van zijn 8 mm lichaam op de as. De klemzone rond z=20 (±2 mm) blijft volledig op de as. Dit is een geometrische maatkeuze, geen nieuwe klembelastingsproef. De maximale as 25 mm blijft 1 mm onder het papier. Het centrale Ø5,6-gat in krukken en plateau voorkomt dat de langere as tegen het maakdeel stuit. Kruk A blijft onderaan op z=15; B schuift onderaan naar z=24. De armlagen en penhouder schuiven 3 mm omhoog; het plateau blijft behouden. Tussen krukvlakken is 3 mm ontworpen ruimte en tussen bovenkant kruk B en onderkant arm A eveneens 3 mm. Dit is geen controle van de volledige beweging.

Motorbout: M3×10 − MDF 4 − staal 1,5 − ring 1 = **3,5 mm inschroeven**, 1 mm vóór de nominale gatbodem. Bij de definitieve onderdelen minimaal 3 mm draad en minstens 0,3 mm bodemreserve aanhouden. De code keurt een dikkere plaat met dezelfde te korte bouten af. Werkelijke plaatdikte, ringen en boutlengte eerst meten.

Krukbout: M4×12 − PETG 6 − ring 0,5 = **5,5 mm** draad in het 8 mm naaflichaam. Plateaubout: verzonken M4×10 inclusief kop − MDF 4 = **6 mm** draad. Vier Ø4,4-gaten op 16 × 16; krukwortel vergroot naar Ø34. Geen onderliggende plateaumoeren, extra flens of afstandbussen. De 90°-verzinking wordt met de echte M4-boutkop gecontroleerd; een cilindrische kop-envelop in de simulator is geen freesgeometrie.

## Waarom deze onderdelen blijven

Elke motor krijgt één vlak verstevigingsplaatje en vier bestaande flensbouten. De twee identieke PETG-krukken zijn vlakke prints van 6 mm dik en 24 mm breed, h.o.h. 65 mm, wortel Ø34 en einde Ø24. De dikkere, bredere uitvoering vervangt de 4 mm aluminiumkrukken; dit is een voorlopige maatkeuze zonder sterktebewijs. Geen ribben, extra bussen of adapters toegevoegd. Hun ronde wortel, verbindingsstrook en krukeinde overlappen echt. De DXF geeft één gesloten buitencontour, zonder dubbele snijlijnen. De centrale gaten en naafgaten volgen het model. Het bestand `exports/MOTIO-V6-crank.scad` bevat het printmodel (tweemaal printen). Vlak op het bed, 0,2 mm lagen, 6 wanden en 100% infill als uitgangspunt; gaten na het printen op maat nabewerken. M4-bouten met bestaande stalen ringen licht en kruislings vastzetten, zonder PETG in te drukken. Kruip en doorbuiging zijn niet gevalideerd.

De getrapte stalen scharnierposten verbinden de lage krukken met twee verschillende armlagen. Ze zijn noodzakelijk voor die geometrie. Onderzijde M6 (13 mm), steun Ø10, journal Ø8 × 7, bovenzijde M6 (16,5 mm). De steunhoogtes zijn 16,5 mm bij A en 28,5 mm bij B. Een onderste ring/moer borgt de post in de kruk; een bus Ø12/6,4 × 4,5 boven het lager brengt de bovenste ring/moer tegen de binnenring. Gebruik normale M6-moeren met passende draadborging; het model toont 5 mm hoge moeren. De twee 608-lagers blijven als echte scharnieren.

De penarmen zijn voorlopig PETG-kokers 24 × 16 met wand 3 mm en geïntegreerde lagerogen. Een onderste aanslag ondersteunt elke buitenring; de uiteindelijke lichte perspassing/lagerborging vereist een proefstuk. De twee 6804-lagers draaien onafhankelijk rond de holle penas. De gesloten binnenringbus wordt vóór arm B geplaatst.

De holle stalen penas is Ø20/13 × 50,5 mm, z=32,5…83. M20×1 op de borgposities en het bovenste 8 mm gedeelte verbindt de houder op z=75…97. Twee **eenvoudig gedraaide ronde moeren Ø24 × 5, M20×1**, met passende pensleutelopname, sluiten de binnenringen op. Het zijn geen standaard zeskantmoeren van M20: die passen niet in deze ruimte. Deze moeren en de postjes zijn eenvoudige draaistukken; laat ze samen met de penas maken. Draai niet met een tang op de lagerjournals.

De penhouder zit boven de armen. Het zachte pad gaat eerst door de centrale opening en vervolgens radiaal in zijn binnenste kamer; daarna volgt de gesleufde penbus. Het pad gaat nooit door een te klein M4-schroefgat. De pen moet circa 80 mm rechte bruikbare lengte hebben en wordt alleen met de hand geklemd. Pas de bus aan de echte pen aan.

## Aslasten: bestaande schatting, niet opnieuw gevalideerd

Invoer: 2 N tekendrag, 2 N verticale penkracht, 0,10 kg penconstructie, 0,45 kg draaiende massa, maximale penversnelling 0,15 m/s². Per arm zijn PETG-koker, lagerogen, stalen post, twee lagers, moeren/bus en **30 g extra massatoeslag** meegerekend. De volledige penmassa en verticale penkracht zijn conservatief bij **elke** arm gelegd. Werkelijke afdruk- en postmassa wegen; de toeslag vervangt geen meting.

Vergelijkingsmoment uit motorlimiet: 28 N × 0,020 m = **0,56 Nm**. Voor elke arm:

`Fr = (2 N + m × 0,15 m/s²) / sin(armhoek)`

`M = Fr × max(0,020 m, armlaaghoogte) + Fz,overhang × 0,065 m + eigen krukgewicht × 0,0325 m`

`radiaal equivalent = M / 0,020 m`, daarna **10% toeslag** op zowel dit equivalent als de axiale kracht. Dit neemt kantelmoment door overhang en de hoge armlagen mee. Het model gebruikt de parallelle armhoek als conservatieve krachtschatting; verbindingen en werkelijke lastverdeling blijven vereenvoudigd.

Voor C: axiaal `0,45 × 9,80665 + 2 = 6,413 N`; kantelmoment omvat 2 N op maximaal 95 mm, 2 N horizontaal op z=26 en **2 mm massa-excentriciteit**. Ook hier 10% toeslag. Een excentrisch ongebalanceerd object is geen toegestane vervanging van het tekenpapier.

| As | Maximale axiale ontwerplast | Radiaal equivalent op 20 mm |
|---|---:|---:|
| A | 5,09 N | 20,60 N |
| B | 5,12 N | 23,07 N |
| C | 7,05 N | 13,80 N |
| Opgegeven grens | 10 N | 28 N |

Deze getallen zijn historische route-enveloppen van de aluminiumuitvoering. [design-validation.json](exports/design-validation.json) is als verouderd gemarkeerd; voor de PETG-krukken en hogere armen zijn geen nieuwe route-enveloppen berekend. De bestaande extra hoofd-/plateaulagering is niet uitgebreid. De grensvergelijking is **geen fabrikantvrijgave voor gecombineerde axiale/radiale last, schokken, levensduur of motorlagerstijfheid**. Grotere penkracht, massa, excentriciteit of een andere route opnieuw berekenen. De simulator blokkeert standen die deze schatting overschrijden, maar is geen hardwarebeveiliging.

Het beschikbare motorkoppel bij lage snelheid is ook niet bewezen door 0,36 Nm houdkoppel. De bestaande curve geldt vanaf 30 RPM bij halfstep, terwijl de simulator onder 30 RPM met 1/16 werkt. Controleer de gekozen driver, stroom, gemeten loopkoppel en eventuele stapverliezen.

## MDF en constructiestijfheid

Zonder verdeling zou één M3-ring een groot deel van de voorspanning op een klein MDF-oppervlak drukken. Daarom liggen de drie vlakke staalplaatjes **bovenop**. Als rekenindicatie: 0,15 Nm, wrijvingsfactor 0,2 en M3 geven circa 250 N voorspanning per bout. Vier bouten over motorvlak minus centreeropening (circa 1392 mm²) geven gemiddeld circa 0,72 MPa contactdruk. Zonder verdeelplaatje is de nominale druk onder één Ø9-ring circa 4,6 MPa. Dit is een eenvoudige spreidingsschatting, geen MDF-toelaatbare spanning of bewijs van uniforme drukverdeling.

Begin handvast, kruislings en maximaal ongeveer 0,15 Nm; pas het uiteindelijke moment aan na een MDF-proef. Te strak trekt het hout kapot. Staalplaatbuiging, lokale indrukking, lijmverbindingen en de globale 4 mm MDF-bovenplaat zijn niet structureel gevalideerd. Controleer vooral de complete gelijmde box met de echte motorgewichten; alleen een vlak plaatje lost globale plaatdoorbuiging niet op.

De isotrope PETG-kokerschatting geeft circa **0,42 mm** verticale doorbuiging als conservatieve cantileverindicatie met alle 2 N op één arm. E=1500 MPa en ρ=1270 kg/m³ zijn voorlopige waarden overgenomen uit SIMV5. Printoriëntatie, infill, kruip, lagerogen, asbuiging en verbindingen kunnen slechter uitvallen. Dit is geen voorspelde totale penfout; de buiging van de nieuwe PETG-krukken is hierin niet opgenomen.

## Geometrische verificatie en fysieke proef

Voor deze PETG-revisie zijn op uitdrukkelijk verzoek geen tests uitgevoerd. De eerder uitgevoerde bewegings-, patroon- en montagecontroles gelden voor de vorige aluminiumkrukken. De oude JSON-verslagen zijn als verouderd gemarkeerd en de oude PNG-voorbeelden hebben de naamtoevoeging previous-aluminium gekregen. De SVG/DXF-tekeningen en onderdelenlijst zijn uit de gewijzigde geometrie opnieuw gegenereerd, zonder validatie.

De bestaande simulatorcontroles blijven aanwezig. De montagecontrole voor asoverlap beoordeelt nu minimaal 9 mm totale overlap, minimaal 7 mm overlap in het naaflichaam en de volledig ondersteunde klemzone. Dit criterium is niet getest en is geen bewijs van de belastbaarheid van de naafverbinding. Onbeperkte onafhankelijke motorrotatie is niet vrijgegeven. De browser stuurt geen hardware aan.

Vóór gebruik:

1. Meet motoras, centreerrand, MDF/staal/ringen en bouten; controleer dat geen bout bodemt en de B-naaf 9 mm overlap heeft en de klemzone op de minimale as past.
2. Bouw eerst één motor-naaf-krukverbinding. Test herhaald ±0,20 Nm zonder verschuiven; markeer as/naaf, inspecteer afdrukken en stel volgens de naaffabrikant af.
3. Meet de gemonteerde MDF-box met motorgewichten en 2 N penlast. Richtwaarde maximaal 0,5 mm veranderlijke verplaatsing bij de motorsteunen; bij meer doorbuiging eerst een eenvoudige functionele rib ontwerpen en opnieuw controleren.
4. Test printpassingen en buitenringborging. Beide armen moeten vrij draaien zonder kantelen, kruip of voelbare axiale speling. Controleer de gedraaide posten, M20×1-verbinding en borgringen/moeren op echte afmetingen.
5. Meet plateauvlakheid en slingering; streef naar maximaal 0,3 mm bij de tekenrand. Weeg draaiende massa en armgroepen en meet verticale/zijwaartse penkracht. Pas berekening aan als aannames worden overschreden.
6. Doorloop alle trajecten eerst langzaam zonder pen, daarna met lichte penkracht; controleer botsingen, naafslip, motorstappen en warmte. De montageanimatie is een geometrische instructie, geen vervanging van deze proef.

Opstartherstel: de gebruikte radiale route is van −135° naar −130° verlegd vanwege de grotere PETG-krukuiteinden. De normale routecontrole bij het starten is hiervoor gericht gecontroleerd; de volledige testreeksen zijn niet uitgevoerd.
