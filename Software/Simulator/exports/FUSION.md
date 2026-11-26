# Printonderdelen bewerken in Autodesk Fusion

Bij elk van de **17 STL-bestanden** staat nu een gelijknamig **`.step`-bestand**: de 14 oorspronkelijke onderdelen, de PEN2-vervanger en de twee passingproeven. Elk bestand bevat één CAD-solid in millimeters, in dezelfde oriëntatie als de printversie, met de onderzijde op z=0.

De STEP-bestanden zijn opgebouwd uit de brongeometrie in de printmanifests. Ronde gaten en buitenvlakken zijn echte cilindervlakken; moervakken blijven zeshoekig. Ook de gesloten luchtkamers in de armen zijn behouden.

## Openen en aanpassen

1. Kies in Fusion **File → Open → Open from my computer** en open bijvoorbeeld `MOTIO-V7-PEN2.step`. Gebruik voor CAD-bewerking het STEP-bestand; de STL blijft beschikbaar voor de slicer.
2. Bewerk het solid in de **Design / Solid**-omgeving. Met **Modify → Press Pull (Q)** kun je vlakken en cilindervlakken aanpassen. Je kunt ook nieuwe schetsen, uitsparingen, extrusies en afrondingen toevoegen.
3. Sla je bewerkte versie op als een eigen Fusion-ontwerp. Voor een lokaal Fusion-bestand kies je **File → Export → Autodesk Fusion Archive (`.f3d`)**. Geef dit een eigen naam zodat het bij opnieuw genereren behouden blijft.
4. Exporteer na de aanpassing opnieuw een STL voor het printen, in millimeters.

STEP bevat **geen oorspronkelijke Fusion-schetsen, maatconstraints of feature-tijdlijn**. Je bewerkt de geïmporteerde solid rechtstreeks. **Capture Design History** kan je nieuwe bewerkingen vastleggen, maar reconstrueert de oorspronkelijke schetsen niet. Als Fusion directe wijzigingen blokkeert, gebruik dan de directe modelleermodus of bewerk de geïmporteerde Base Feature.

De bestanden zijn automatisch met OpenCascade opnieuw ingelezen en gecontroleerd, niet handmatig in Fusion getest. Resultaten staan in [step-validation.json](step-validation.json): één geldige solid per bestand, behoud van afmetingen en volume na STEP-export, en vergelijking met de bestaande STL. Kleine verschillen met de STL komen door de 96-hoekige benadering van ronde vlakken in de mesh; STEP gebruikt exacte cirkels.

## Opnieuw genereren

Vanuit `Software/Simulator`, in een Python-omgeving met [requirements-cad.txt](../tests/requirements-cad.txt):

```powershell
python -m pip install -r tests/requirements-cad.txt
python tests/step-parts.py --compare-stl
```

Het script leest `print-manifest.json` en `print-pen2-manifest.json`. Na wijzigingen aan de simulator maak je eerst die manifests en de STL's opnieuw; zie [tests](../tests/README.md). De passingproeven gebruiken dezelfde maten als `print-parts.py`.

Voor alleen PEN2:

```powershell
node tests/export.js --pen2-only
python tests/print-parts.py --pen2-only
python tests/step-parts.py --pen2-only --compare-stl
```

Die laatste opdracht maakt `MOTIO-V7-PEN2.step` en `step-pen2-validation.json`. De andere STEP-bestanden blijven behouden. Bij een volledige export wordt `step-validation.json` voor alle onderdelen vernieuwd.

Wijzigingen die je zelf in Fusion doet, gaan niet terug naar de simulator of de manifests. Bewaar je aangepaste Fusion-ontwerp dus apart. Opnieuw genereren overschrijft de bijgeleverde STEP-bestanden.

## Autodesk-uitleg

- [Ontwerpen en STEP-bestanden openen](https://help.autodesk.com/cloudhelp/ENU/Fusion-Designs/files/ASM-OPEN-FUSION-DESIGN.htm)
- [Direct modelleren van geïmporteerde CAD-modellen](https://www.autodesk.com/learn/ondemand/tutorial/direct-modeling-imported-3d-cad-models?contextId=AP-DIRECT-MODELING-IMPORTED-3D-CAD-MODELS)
- [Waarom geïmporteerde bestanden geen oorspronkelijke tijdlijn bevatten](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Imported-files-do-not-contain-timeline-features-in-Fusion-360.html)
