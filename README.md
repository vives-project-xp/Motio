# Motio

*Makes motion visible.*

[![VIVES Elektronica-ICT](https://img.shields.io/badge/VIVES-Elektronica--ICT-blue)](https://www.vives.be/nl/technology/elektronica-ict)
[![Project Experience](https://img.shields.io/badge/Project-Experience-brightgreen)](https://github.com/vives-project-xp)
[![GitHub](https://img.shields.io/badge/GitHub-Motio-181717)](https://github.com/vives-project-xp/Motio/tree/main)

> Een innovatief project voor het zichtbaar en tastbaar maken van beweging,
> door meerdere bewegende elementen om te zetten in fysieke tekeningen op papier.

![cycloide drawing machine](./doc/assets/cycloide%20drawing%20machine.png)

## Inhoudsopgave

- [Motio](#motio)
  - [Inhoudsopgave](#inhoudsopgave)
  - [Projectoverzicht](#projectoverzicht)
  - [Projectstatus](#projectstatus)
  - [Functies](#functies)
  - [Technologie](#technologie)
    - [Hardware](#hardware)
    - [Software](#software)
  - [Project Structuur](#project-structuur)
  - [Simulators](#simulators)
    - [Screenshots](#screenshots)
    - [Beginposter](#beginposter)
  - [Team](#team)
  - [Academische Context](#academische-context)

## Projectoverzicht

Het Motio project is een initiatief ontwikkeld door 2de- en 3dejaars bachelorstudenten Elektronica-ICT van VIVES voor het vak Project Experience. Ons doel is het creëren van een systeem dat bewegingen tastbaar en zichtbaar maakt door ze om te zetten in fysieke tekeningen.

Het systeem combineert de beweging van meerdere elementen om complexe patronen te genereren. Een tekeninstrument vertaalt deze gecombineerde beweging naar lijnen op papier. Door parameters zoals snelheid, richting, fase en bewegingsverhouding te variëren, ontstaan telkens andere visuele patronen. Op die manier wordt de onderliggende beweging niet alleen geregistreerd, maar ook fysiek vastgelegd.

## Projectstatus

*Stand in oktober 2026.*

| Onderdeel | Status | Toelichting |
| --------- | ------ | ----------- |
| Concept & onderzoek | Afgerond | Cycloïde-tekenmachine, keuze motoren (SY42STH38-1684A), scherm en lagers. Zie [Research](Research/README.md). |
| Box V1 | Afgerond | Manueel aangedreven prototype dat één patroon tekent. Zie [UitlegBoxV1](Research/concept/UitlegBoxV1.md). |
| Box V2 | In uitwerking | Parametrisch Fusion-model (CycloidDrawerV2) en lasersnijbestanden. |
| Simulator | Ver gevorderd | SIMV1 t.e.m. SIMV6 met 13 patronen, woordgenerator, veiligheidscontroles en montagehandleiding. |
| Bedieningspaneel | In uitwerking | Wig van 4 mm MDF met 10.1" scherm; maten en snijbestanden worden gegenereerd. Zie [Bedieningspaneel](Hardware/Bedieningspaneel/README.md). |
| Elektronica | Gestart | Schema's voor Raspberry Pi 5 en gShield, testcode voor motoraansturing (PWM). |
| Pi-interface | Eerste versie | `Software/Pi-Interface/motio.py` laat de simulator de echte motoren aansturen. Nog niet getest op de volledige machine. |
| Volledige machine | Nog niet gebouwd | Mechanica en elektronica zijn nog niet samen werkend gemonteerd. |

### Volgende stappen

1. **Elektronica koppelen aan de mechanica:** de drie motoren werkend op de box, eerst met testcode, daarna via de Pi-interface.
2. **Materialen bestellen** zodat de machine gebouwd kan worden.
3. **Box V2 of SIMV6-ontwerp bouwen** en de eerste echte tekening maken.

## Functies

- **Instelbare parameters:** snelheden, richtingen en fase zijn makkelijk regelbaar.
- **Visualisatie:** de beweging wordt gevisualiseerd door een tekeninstrument dat lijnen op papier maakt.
- **Preview:** de simulator toont het verwachte resultaat licht op het papier, de echte tekenlijn verschijnt donker.
- **Patronen en woorden:** dertien kant-en-klare patronen en een woordgenerator (tot 8 letters) voor verbonden bubbelletters.
- **Veiligheidscontroles:** de simulator blokkeert singulariteiten, botsingen en posities buiten de veilige tekenzone.
- **Modulaire opbouw:** gescheiden hardware- en softwarecomponenten voor eenvoudige uitbreiding.

## Technologie

### Hardware

- Stappenmotoren met dedicated drivers voor precisie-aansturing.
- Tekeninstrument als uitvoer naar papier.
- Bedieningspaneel met schuin scherm: zie [Bedieningspaneel](Hardware/Bedieningspaneel/README.md). Elektronicaschema's staan in [Schemas](Schemas).
- Raspberry Pi als besturingsplatform (zie [schermkeuzes](Research/Scherm/Scherm_gegevens.md) en [motor-aansturing](Research/Stappenmotoren/Stappenmotor_aansturing.md)).

### Software

- MOTIO SIMV6 als huidige simulator, met directe motoraandrijving en een geanimeerde montagehandleiding. Eerdere versies blijven beschikbaar.
- Pi-interface ([motio.py](Software/Pi-Interface/motio.py)): de simulator berekent de motorstanden, de Raspberry Pi zet ze om in step-pulsen.
- Testcode voor [Raspberry Pi 5 en Arduino](Software/TestCode).
- Parameterbesturing voor snelheid, richting, fase en bewegingsverhouding.

## Project Structuur

```bash
Motio/
├── doc/              # Projectdocumentatie en de projectcanvas
├── Hardware/         # Hardware: bedieningspaneel en snijbestanden box V1
├── Research/         # Onderzoek en keuzes (scherm, stappenmotor-aansturing, concepten v1/v2)
├── Schemas/          # Elektronicaschema's (Raspberry Pi 5, gShield)
├── Software/         # Softwarecomponenten van het project
│   ├── Pi-Interface/ # Server die de simulator met de motoren verbindt
│   └── TestCode/     # Testcode Raspberry Pi 5 en Arduino
├── Software/WARD-SIM/ # Interactieve simulators
│   ├── SIMV1/        # Oorspronkelijke live simulator
│   ├── SIMV2/        # Virtueel prototype met machinebediening
│   ├── SIMV3/        # Behouden werkende basis met drie motoren, 2D/3D en BOM
│   ├── SIMV4/        # Compacte box 358 × 404 × 108 mm en instelbare zichtbaarheid
│   ├── SIMV4-5/      # Drie directe motoraandrijvingen
│   ├── SIMV5/        # Montagehandleiding met zes geanimeerde stappen
│   └── SIMV6/        # Motoren tegen de bovenplaat, PETG-krukken, 38 montagestappen
└── README.md         # Dit bestand
```

## Simulators

- [SIMV1](Software/WARD-SIM/SIMV1/index.html): oorspronkelijke live simulator.
- [SIMV2](Software/WARD-SIM/SIMV2/index.html): virtueel prototype met machinebediening, mechanische transmissies en engineeringweergave. Zie de [SIMV2-handleiding](Software/WARD-SIM/SIMV2/README.md).
- [MOTIO SIMV3](Software/WARD-SIM/SIMV3/index.html): behouden werkende basis met rond papier Ø210 mm, veilige tekenzone Ø190 mm, drie SY42STH38-1684A-motoren en 2D/3D-interface. Zie [ontwerp en controles](Software/WARD-SIM/SIMV3/README.md).
- [MOTIO SIMV4](Software/WARD-SIM/SIMV4/index.html): simulator met compacte opstelling, box 358 × 404 × 108 mm en afzonderlijke zichtbaarheid van wanden, bodem en bovenplaat. De drie motoren en bestaande bediening blijven behouden. Zie [starten en controles](Software/WARD-SIM/SIMV4/README.md).
- [MOTIO SIMV4-5](Software/WARD-SIM/SIMV4-5/index.html): behouden versie met drie directe motoraandrijvingen.
- [MOTIO SIMV5](Software/WARD-SIM/SIMV5/index.html): gebaseerd op SIMV4-5, met een tab **Montagehandleiding**: zes stappen, automatische opbouwanimaties, voortgang en herhalen. Zie [starten en bediening](Software/WARD-SIM/SIMV5/README.md).
- [MOTIO SIMV6](Software/WARD-SIM/SIMV6/index.html): huidige versie, gebaseerd op SIMV5. De motorflenzen zitten rechtstreeks tegen de MDF-bovenplaat, de krukken zijn PETG, en de handleiding telt 38 stappen met onderdelenlijst. De laatste wijziging (PETG-krukken) is nog niet getest. Zie [ontwerp en bediening](Software/WARD-SIM/SIMV6/README.md).

### Screenshots

Deze referentiebeelden komen uit [SIMV4](Software/WARD-SIM/SIMV4/index.html).

**Simulator** – de bloem met vijf blaadjes, getekend op het ronde papier terwijl de machine in bovenaanzicht meebeweegt.

![Simulator met voltooide bloemtekening](./doc/assets/simulator/simulator-tekening.png) 

**Tekeningen** – het eindresultaat van de dertien ingebouwde patronen en een zelf getypt woord, zoals de simulator ze op het ronde papier tekent.

<table>
  <tr><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-circle.png" width="200" alt="Cirkel"><br><sub>Cirkel</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-flower3.png" width="200" alt="Bloem · 3 blaadjes"><br><sub>Bloem · 3 blaadjes</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-flower5.png" width="200" alt="Bloem · 5 blaadjes"><br><sub>Bloem · 5 blaadjes</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-flower7.png" width="200" alt="Bloem · 7 blaadjes"><br><sub>Bloem · 7 blaadjes</sub></td></tr>
  <tr><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-ripple12.png" width="200" alt="Golfring"><br><sub>Golfring</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-rosette52.png" width="200" alt="Rozet · 2 rondes"><br><sub>Rozet · 2 rondes</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-rosette73.png" width="200" alt="Rozet · 3 rondes"><br><sub>Rozet · 3 rondes</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-openRosette.png" width="200" alt="Open rozet"><br><sub>Open rozet</sub></td></tr>
  <tr><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-wovenFlower.png" width="200" alt="Verweven bloem"><br><sub>Verweven bloem</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-wovenRosette.png" width="200" alt="Dichte rozet"><br><sub>Dichte rozet</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-wovenStar.png" width="200" alt="Sterrozet"><br><sub>Sterrozet</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-spiral.png" width="200" alt="Spiraal"><br><sub>Spiraal</sub></td></tr>
  <tr><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-vives.png" width="200" alt="VIVES"><br><sub>VIVES</sub></td><td align="center"><img src="./doc/assets/simulator/tekeningen/tekening-word.png" width="200" alt="Eigen woord: MOTIO"><br><sub>Eigen woord: MOTIO</sub></td></tr>
</table>

**Mechanical Design** – interactief 3D-model van de box en een technisch bovenaanzicht met maten.

|                       Interactief 3D-model                        |                      2D technische tekening                       |
| :---------------------------------------------------------------: | :---------------------------------------------------------------: |
| ![Mechanical Design 3D](./doc/assets/simulator/mechanical-3d.png) | ![Mechanical Design 2D](./doc/assets/simulator/mechanical-2d.png) |

**Validation** – vijf controles op bereik, botsingen, singulariteiten, motorcapaciteit en spelingen.

![Validation-tabblad](./doc/assets/simulator/validation.png)

### Beginposter

<img src="./doc/assets/begin_poster_motio.png" height="auto" width="420">

## Team

|                                                                             |                |         |
| :-------------------------------------------------------------------------: | -------------- | ------- |
| <img src="https://github.com/kyell182.png" width="64" alt="Kyell De Windt"> | Kyell De Windt | Teamlid |
| <img src="https://github.com/Jarno-max.png" width="64" alt="Jarno Bostyn">  | Jarno Bostyn   | Teamlid |
| <img src="https://github.com/Ward-Elek.png" width="64" alt="Ward Dereeper"> | Ward Dereeper  | Teamlid |
|  <img src="https://github.com/ToneyBacon.png" width="64" alt="Cobe Dudal">  | Cobe Dudal     | Teamlid |
|   <img src="https://github.com/Tibo668.png" width="64" alt="Tibo Morgan">   | Tibo Morgan    | Teamlid |

## Academische Context

|              |                          |
| ------------ | ------------------------ |
| Universiteit | VIVES Hogeschool         |
| Opleiding    | Bachelor Elektronica-ICT |
| Vak          | Project Experience       |
| Academiejaar | 2026-2027                |

Gemaakt door VIVES Bachelor Elektronica-ICT studenten.
