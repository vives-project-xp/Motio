# MOTIO SIMV6

Nieuwe zelfstandige versie op basis van de huidige SIMV5. De drie motorflenzen zitten **rechtstreeks tegen de onderkant van de 4 mm MDF-bovenplaat**. SIMV5 is voor deze wijziging niet aangepast.

Open [index.html](index.html), of start `node tests/serve.js` en open [de lokale simulator](http://127.0.0.1:4177/). De app opent op het 3D-model. Gebruik **Montagehandleiding** voor de 38 montagestappen en **Onderdelenlijst** voor aantallen en CSV. Tekenen: **Simulator → Power on → Home → Play**.

## Wat is veranderd?

**Laatste wijziging: PETG-krukken. Op uitdrukkelijk verzoek zijn hiervoor geen tests of bewegingscontroles uitgevoerd. Eerdere validatieverslagen en PNG-voorbeelden gelden voor de aluminium uitvoering.**

- Lange motorbeugels, onderste motorsteunen, koppelingen, drie verlengassen, hoofdlagers en hun houders/borgingen zijn verwijderd.
- Drie vlakke stalen plaatjes van 60 × 60 × 1,5 mm bovenop het MDF verdelen de boutdruk. De motor raakt onderaan rechtstreeks het hout. Per motor vier M3×10 en ringen van 1 mm; nominale inschroefdiepte 3,5 mm.
- Drie metalen goBILDA 1309-0016-0005-klemnaven dragen krukken en plateau rechtstreeks op de ronde motorassen. Per naaf twee M4×14-klembouten; geen stelschroef tegen de as. Het lichaam is Ø32 × 8 mm, met de Ø14 × 2 mm centreerrand omlaag: Bij een as van 23 mm hebben A/C 10 mm asoverlap en B 9 mm (waarvan 7 mm in het naaflichaam); de volledige klemzone blijft op de as. De aansluitingen zijn 4× M4 op 16 × 16; de krukwortels zijn daarom Ø34. Ook de maximale aslengte 25 mm past onder het papier op z=26.
- Twee vlak geprinte PETG-krukken: 65 mm h.o.h., 24 mm breed en 6 mm dik, wortel Ø34 en uiteinde Ø24. Krukharten z=18/27 mm; penarmen 24 × 16 mm, wand 3 mm, op z=41/62. Acht krukbouten worden M4×12; de onderste M6-einden van de scharnierposten worden 13 mm. De hoge handklem is bereikbaar boven de armen. Alleen de twee ellebooglagers en twee penlagers blijven nodig.
- De radiale tekenroute staat op −130°. De ontworpen verticale ruimte tussen de krukvlakken is **3 mm**. De volledige bewegingsvrijloop is na de printwijziging niet opnieuw gecontroleerd. De lokale naafmontage wordt afzonderlijk gecontroleerd: bij A 1,5 mm tussen naaflichaam en staalplaat en 0,5 mm tussen de beide centreerranden. Controleer deze instelhoogte vóór het vastzetten.

## Bouwinformatie

Lees [DESIGN.md](DESIGN.md) voor hoogtestapels, lastberekeningen, fabricage en fysieke proeven. Beschikbaar in [exports](exports):

- `MOTIO-V6-mechanical.svg`: samenstelling / bovenaanzicht.
- `MOTIO-V6-mounting.svg`: motor-, naaf- en plaathoogtes A/B/C.
- `MOTIO-V6-section.svg` en `MOTIO-V6-pen-detail.svg`: doorsneden.
- `MOTIO-V6-top-plate`, `reinforcement`, `crank` en `platter`, elk als SVG en DXF: vlakke maakdelen en krukprofiel. SVG bevat toelichting; DXF alleen contouren en gaten in mm, zonder kerfcompensatie.
- `MOTIO-V6-crank.scad`: printmodel voor twee identieke PETG-krukken; openen en als STL exporteren met OpenSCAD. Vlak printen; 0,2 mm lagen, 6 wanden en 100% infill als voorlopige instellingen.
- `MOTIO-V6-BOM.csv`: aantallen fysieke onderdelen.
- `design-validation.json`: eerder verslag, gemarkeerd als verouderd na de printwijziging.
- `pattern-validation.json`: eerdere patroonruns, eveneens gemarkeerd als verouderd.

De simulator bevat een gedeeld geometrisch model, geen kant-en-klare parametrische STEP-assemblage. Voor de twee krukken is een eenvoudig OpenSCAD-printmodel toegevoegd; de printuitvoering is niet gevalideerd. De eenvoudige draaistukken, draadverbindingen en lagerpassingen zijn beschreven; de exacte werkplaatsuitvoering moet aan de gekozen materialen worden aangepast.

## Wat is wel en niet aangetoond?

De software bevat controles voor geometrie en belastingen, maar deze zijn voor de PETG-krukken niet uitgevoerd. De eerdere resultaten gelden voor de vorige aluminiumkrukken. Willekeurige combinaties van motorhoeken kunnen botsen of overbelasten; de simulator blokkeert die standen. Dit is geen vrijgave voor drie onbeperkt onafhankelijk ronddraaiende krukken.

De berekende aslasten bevatten penkracht, eigengewicht, kantelmoment, maximale penversnelling en 10% toeslag. De eerdere aluminiumuitvoering bleef op de gebruikte route binnen een **voorlopige vergelijking** met 10 N axiaal en 28 N op 20 mm. Voor de gewijzigde hoogtes zijn die resultaten niet opnieuw bepaald. Een fabrikantbewijs voor gecombineerde last, vermoeiing en levensduur ontbreekt. Naafklemming, MDF-stijfheid, printsterkte, penkracht en motorkoppel bij lage snelheid vereisen een fysieke proef. Validatie toont deze aspecten daarom als **NIET BEWEZEN**.

## Bestaande controlescripts (niet uitgevoerd na deze wijziging)

```powershell
node tests/logic.test.js
node tests/assembly-connections.test.js
node tests/clamping-hubs.test.js
node tests/mdf-thickness.test.js
node tests/integration.test.js
node tests/patterns.test.js
node tests/export.js
```

De bestaande scripts bevatten deels nog maatverwachtingen van de aluminiumkrukken; zij zijn op verzoek niet aangepast of uitgevoerd. De volledige patrooncontrole omvat dertien patronen en 33 letter-/woordgevallen. `node tests/patterns.test.js --hub-change` voert de gerichte controle na de naafwissel uit: cirkel, flower5, VIVES en MWMWMWMW, inclusief pauze/hervatten op 100 Hz. Het JSON-verslag vermeldt de daadwerkelijk uitgevoerde gevallen. De verbindingstest controleert echte uitgesneden modelvlakken, minimumaslengtes, montagestappen en het invoerpad van het drukpad. De klemnaaftest controleert onder meer dat de bouten de as niet raken en de M4-gaten niet door de verbindingsstrook worden dichtgezet.

Opstartherstel: de gebruikte radiale route is van −135° naar −130° verlegd vanwege de grotere PETG-krukuiteinden. De normale routecontrole bij het starten is hiervoor gericht gecontroleerd; de volledige testreeksen zijn niet uitgevoerd.
