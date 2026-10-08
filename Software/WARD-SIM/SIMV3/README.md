# MOTIO Sim V3 — engineering simulator

Bestaand Sim V3 verder uitgebreid; Sim V1/V2 blijven ongewijzigd. Geen installatie of externe runtimebibliotheken nodig. Open index.html rechtstreeks of start vanuit de repository:

```powershell
node Software/WARD-SIM/SIMV3/tests/serve.js
```

Open http://127.0.0.1:4173/SIMV3/.

## Bediening

Power on → Home → Play. Exact drie aangedreven assen: A en B sluiten samen de penketen, C roteert het papier. De pen wordt handmatig op hoogte vastgezet. Er is geen automatische penlift, veerbeweging of vierde motor. Afremmen en Home tekenen dus door wanneer de pen op het papier staat. Home en foutstop zijn virtuele simulatorfuncties, geen hardwarebesturing of fysiek remmodel.

De bestaande simulator, technische 2D-tekening, WebGL-3D-view, camera's en Components/BOM blijven beschikbaar. Mechanical Design heeft Assembly, Drive, Bearing, Section, Pen Joint Detail en Exploded-modi. Klik onderdelen voor hun BOM-gegevens. Exploded offsets zijn uitsluitend montage-illustraties.

Centrale configuratie staat onder Simulator → Centrale configuratie. De JSON-editor bevat geometrie, materiaalwaarden, belastingen en analysegrenzen. Wijzigingen resetten beweging, tekening en het testresultaat. De gewone arm- en profielvelden gebruiken dezelfde configuratie. Workspace toont berekende celcentra; de IK-probe berekent motorasstanden zonder beweging uit te voeren.

Validation → Start engineering test voert een A/B-faseraster uit en daarna een 20 s acceleratie-/omkeerprofiel. Papierhoek wordt over 0–360° gescand. Resultaten zijn exporteerbaar met de gebruikte configuratie. De test kan worden geannuleerd. Het betreft een offline analyse, geen motorcommando.

## Centrale architectuur

- machineGeometry.js: configuratiesnapshot, afgeleide maten en gemeenschappelijke constructievolumes voor 3D, doorsneden en collision checking.
- kinematics.js: exacte cirkelsluiting, analytische inverse kinematics, vaste assembly branch en detectie van seriële working-branch passages.
- paperTransform.js: machine ↔ papiertransformatie; papieroorsprong is het spindelcentrum. Sporen worden uitsluitend in papiercoördinaten opgeslagen.
- singularityAnalysis.js: singular values van J, condition number κ₂(J), transmission quality en hoekafstand tot collineariteit.
- collisionDetection.js: conservatieve 2.5D capsule-/box-/cilinderenveloppen, hoogte-intervallen, minimale afstanden en expliciete bedoelde verbindingen.
- motorAnalysis.js: gekoppelde massamatrix uit translatie en rotatie van armen/krukken, numerieke massamatrixafgeleiden, inertie/Coriolis, penlast, wrijvingsaanname, reductie, rendement en rotorinertie.
- structuralEstimate.js: indicatieve Z-buiging en afzonderlijke axiale XY-foutbijdrage.
- validation.js: workspace, papierdekkingsscan, geometrische grenzen en incrementele engineeringtest.
- mechanics.js: gedeelde inspectiefunctie voor simulatie en validatie; geen tweede geometrische solver.
- bom.js: dynamische stuklijst en CSV uit dezelfde configuratie.

Eenheden: mm, rad, s, N, kg. Koppelberekeningen converteren naar SI en leveren Nm aan de motoras. Invoerfases en motorplaatsingsrichtingen zijn graden; profielen zijn uitgangs-RPM. Positieve rotatie is met de klok mee in bovenaanzicht, met Y naar beneden.

## Berekeningen en interpretatie

FK berekent E_A en E_B uit de twee krukken en P uit de vaste cirkelsnijpuntoriëntatie. IK gebruikt de cosinusregel per keten, controleert elke oplossing met FK en kan de seriële working branch vergrendelen. De simulator weigert een assembly-branch wissel. Een seriële singulariteit wordt zichtbaar gemeld; een forward aangedreven kruk kan die passeren. Dat is geen garantie dat willekeurige Cartesian opdrachten uitvoerbaar zijn.

Papiertransformatie: p_paper = R(-θC) × (P_machine − papiercentrum). Een stilstaande fysieke pen tekent daardoor bij roterend papier. De opgeslagen trace wordt alleen voor weergave naar het canvas vertaald.

Jacobiaan: U Pdot = diag(u_A·E'_A, u_B·E'_B) qdot. U bevat de twee eenheidsvectoren E→P. κ₂ = σmax/σmin. Transmission quality is het minimum van de absolute sinussen van de twee seriële hoeken en de hoek tussen de koppelarmen. SAFE/CAUTION/CRITICAL volgt uit configureerbare drempels, geen willekeurige heatmap.

Workspace gebruikt exacte IK per celcentrum en beoordeelt mogelijke oplossingen met singularity- en collision checking. Papierdekking gebruikt een raster inclusief hoeken/marges bij 24 papierhoeken. Een gevonden onbereikbaar punt bewijst FAIL; een raster zonder fouten bewijst geen continu volledig veilig gebied. Daarom blijven steekproefresultaten WARNING. PASS wordt alleen gebruikt voor de expliciete analytische sluitingscontrole of de vergelijking tussen papierhoekradius en plateauradius.

Motorlast: T = JᵀF + M(q)qddot + C(q,qdot)qdot, plus aangenomen wrijving. De penlast wordt per motor conservatief als norm van de Jacobiaankolom gebruikt. Voor C: penwrijvingsmoment + I·α met I = mR²/2. Beschikbaar dynamisch motorkoppel is UNKNOWN zonder torque-speed curve; houdkoppel geldt niet als bedrijfskoppel.

Een gemeten curve kan in de configuratie worden ingevoerd als motorCurves met per as A/B/C een object met source en points, bijvoorbeeld de structuur {"source":"meetrapport, driver en voedingsspanning","points":[[0,0.3],[100,0.2]]}. Deze voorbeeldgetallen zijn uitsluitend formaatuitleg, geen echte motorcurve. Interpolatie is lineair; buiten het ingevoerde RPM-bereik blijft het koppel onbekend.

Z-buiging gebruikt een cantilever-surrogaat met de volledige aangenomen pendruk op iedere arm plus verdeeld eigengewicht: δ = FL³/(3EI) + mgL³/(8EI). Axiale rek FL/(EA) wordt apart via de constraintmatrix naar XY gepropageerd. Verticale doorbuiging is geen XY-positioneringsfout. Totale positioneringsfout blijft NOT CALCULATED.

## Mechanisch concept

P: holle Ø20-bus met Ø13 doorvoer, twee onafhankelijke 6804-lagers (20×32×7), binnenring-spacer, schouder en borgmoer. Een buitenringzitting krijgt axiale vrijheid. De koker eindigt buiten de lagerboring en loopt niet door de pen-as. Onder de armen zit een handmatige klem met M4-kartelknop, vervangbaar zacht drukvlak en centreerbussen voor pennen Ø6–12. De penhoogte blijft vast.

C: twee gescheiden 6001-zittingen houden het riemvlak vrij. Het bovenste lager lokaliseert axiaal met schouder/moer en huisdeksels; de onderste buitenring kan axiaal schuiven. Zijposts verbinden de lagerconstructie met het frame. Geen onbedoelde voorspanning via beide buitenringen.

Dit zijn maatgebaseerde concepten, geen vrijgegeven productie-CAD. Lagerpassingen, schroefdraad, lokale uitsparingen, axiale borging, tolerantieketens en montage moeten nog worden uitgewerkt en fysiek getest.

## Bekende uitkomst en resterende grenzen

De standaardgeometrie sluit voor alle A/B-hoeken, maar bereikt niet het volledige bruikbare A3-oppervlak. Er bestaan seriële singulariteitszones. De uitgevoerde standaardscan vond geen collisions in de gemodelleerde volumes; minimumvrijloop circa 5 mm. Dat bewijst geen botsingsvrijheid tussen alle rasterpunten of met niet-gemodelleerde hardware.

Aannames zijn onder andere aluminium E=69000 N/mm², dichtheid 2700 kg/m³, penwrijving 2 N, pendruk 2 N, roterende plateaumassa 2.5 kg, rendement 85% en geschatte rotor-/pulley-inertie. Gebruik eigen metingen voor een bouwbesluit.

Nog niet gevalideerd: echte torque-speed curves, lagerlevensduur en volledige lagerreacties inclusief riemvoorspanning, eindstuk- en ascompliance, lager-/riemspeling, papierplaatvervorming, slingering, thermische uitzetting, toleranties en continue collision checking. Riemen gebruiken steeklijn-/envelopgeometrie; riemtanden, kabels en alle bevestigingsmiddelen zijn niet volledig gemodelleerd. Beschikbaarheid, prijzen en leveranciers blijven UNKNOWN waar niet vastgesteld.

## Verificatie en exports

```powershell
node Software/WARD-SIM/SIMV3/tests/logic.test.js
node Software/WARD-SIM/SIMV3/tests/integration.test.js
node Software/WARD-SIM/SIMV3/tests/export.js
```

Tests controleren onder andere 5184 FK/IK-poses, armlengtes, vaste assembly branch, Jacobiaan versus eindige verschillen, papiertransformaties, collision-fixtures, massamatrix versus onafhankelijk berekende kinetische energie, structurele schaling, tekenen tijdens afremmen, onbekende motorcurves, testmodus, configuratiedoorwerking, navigatie en exports. Integratietests gebruiken een DOM/canvas-testdouble; browsercontrole is aanvullend vereist voor WebGL en layout.

Exports: bovenaanzicht, C-doorsnede, P-detail en BOM-CSV in exports/. Ze worden gegenereerd uit dezelfde runtimegeometrie.

## Primaire referenties

- [Modern Robotics: singularities](https://modernrobotics.northwestern.edu/nu-gm-book-resource/5-3-singularities/): verlies van Jacobiaanrang.
- [Modern Robotics: manipulability](https://modernrobotics.northwestern.edu/nu-gm-book-resource/5-4-manipulability/): singular values en conditionering.
- [NSK 6804](https://www.nsk.com/engineering/6804-apn.html): basisafmetingen 20×32×7. Afdichting, passing en concrete variant nog selecteren.
- [SKF lageronderhoudshandboek](https://www.skf.com/binaries/pub12/Images/0901d1968013be94-SKF-bearing-maintenance-handbook---10001_1-EN%281%29_tcm_12-463040.pdf): lokaliserende en niet-lokaliserende lagerposities.

De machinegeometrie, modelaannames en gekozen grenswaarden zijn eigen engineeringkeuzes; de bronnen valideren deze machine niet.
