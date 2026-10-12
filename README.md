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
  - [Functies](#functies)
  - [Technologie](#technologie)
    - [Hardware](#hardware)
    - [Software](#software)
  - [Project Structuur](#project-structuur)
  - [Simulators](#simulators)
    - [Simulator starten](#simulator-starten)
    - [Screenshots](#screenshots)
    - [Beginposter](#beginposter)
  - [Team](#team)
  - [Academische Context](#academische-context)

## Projectoverzicht

Het Motio project is een initiatief ontwikkeld door 2de- en 3dejaars bachelorstudenten Elektronica-ICT van VIVES voor het vak Project Experience. Ons doel is het creëren van een systeem dat bewegingen tastbaar en zichtbaar maakt door ze om te zetten in fysieke tekeningen.

Het systeem combineert de beweging van meerdere elementen om complexe patronen te genereren. Een tekeninstrument vertaalt deze gecombineerde beweging naar lijnen op papier. Door parameters zoals snelheid, richting, fase en bewegingsverhouding te variëren, ontstaan telkens andere visuele patronen. Op die manier wordt de onderliggende beweging niet alleen geregistreerd, maar ook fysiek vastgelegd.

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
- Raspberry Pi als besturingsplatform (zie [schermkeuzes](Research/Scherm/Scherm_gegevens.md) en [motor-aansturing](Research/Stappenmotoren/Stappenmotor_aansturing.md)).

### Software

- MOTIO V4 (map `SIMV3`): browsersimulator in vanilla JavaScript, zonder installatie of externe bibliotheken. SIMV1 en SIMV2 zijn historische referenties.
- Vier tabbladen: Simulator, Mechanical Design (2D en 3D), Validation en Components / BOM.
- Parameterbesturing voor snelheid, richting, fase en bewegingsverhouding.

## Project Structuur

```bash
Motio/
├── doc/              # Projectdocumentatie en de projectcanvas
├── Hardware/         # Hardware van het project
├── Research/         # Onderzoek en keuzes (scherm, stappenmotor-aansturing, concepten v1/v2)
├── Software/         # Softwarecomponenten van het project
├── Software/WARD-SIM/ # Interactieve simulators
│   ├── SIMV1/        # Oorspronkelijke live simulator
│   ├── SIMV2/        # Virtueel prototype met machinebediening
│   └── SIMV3/        # MOTIO V4: rond papier, tandwielen, drie motoren, 2D/3D en BOM
└── README.md         # Dit bestand
```

## Simulators

- [SIMV1](Software/WARD-SIM/SIMV1/index.html): oorspronkelijke live simulator.
- [SIMV2](Software/WARD-SIM/SIMV2/index.html): virtueel prototype met machinebediening, mechanische transmissies en engineeringweergave. Zie de [SIMV2-handleiding](Software/WARD-SIM/SIMV2/README.md).
- [MOTIO V4](Software/WARD-SIM/SIMV3/index.html): huidige simulator met rond papier Ø210 mm, dertien patronen, woordgenerator, veilige tekenzone Ø190 mm, drie SY42STH38-1684A-motoren, directe tandwielen en vereenvoudigde 2D/3D-interface. Zie [ontwerp en controles](Software/WARD-SIM/SIMV3/README.md).

### Simulator starten

Open `Software/WARD-SIM/SIMV3/index.html` rechtstreeks in een browser, of start een lokale server:

```powershell
node Software/WARD-SIM/SIMV3/tests/serve.js
```

Open daarna <http://127.0.0.1:4173/SIMV3/>. Kies een patroon, druk op **Power on → Home → Play** en zet eventueel de simulatiesnelheid hoger. De tests draai je met `node Software/WARD-SIM/SIMV3/tests/logic.test.js` (idem voor `integration.test.js` en `patterns.test.js`).

### Screenshots

**Simulator** – de bloem met vijf blaadjes, getekend op het ronde papier terwijl de machine in bovenaanzicht meebeweegt.

![Simulator met voltooide bloemtekening](./doc/assets/simulator/simulator-tekening.png)

**Mechanical Design** – technisch bovenaanzicht met maten en een interactief 3D-model.

| 2D technische tekening | Interactief 3D-model |
| :---: | :---: |
| ![Mechanical Design 2D](./doc/assets/simulator/mechanical-2d.png) | ![Mechanical Design 3D](./doc/assets/simulator/mechanical-3d.png) |

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
