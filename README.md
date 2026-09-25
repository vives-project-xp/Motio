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
  - [Team](#team)
  - [Academische Context](#academische-context)

## Projectoverzicht

Het Motio project is een initiatief ontwikkeld door 2de- en 3dejaars bachelorstudenten Elektronica-ICT van VIVES voor het vak Project Experience. Ons doel is het creëren van een systeem dat bewegingen tastbaar en zichtbaar maakt door ze om te zetten in fysieke tekeningen.

Het systeem combineert de beweging van meerdere elementen om complexe patronen te genereren. Een tekeninstrument vertaalt deze gecombineerde beweging naar lijnen op papier. Door parameters zoals snelheid, richting, fase en bewegingsverhouding te variëren, ontstaan telkens andere visuele patronen. Op die manier wordt de onderliggende beweging niet alleen geregistreerd, maar ook fysiek vastgelegd.

## Functies

- **Instelbare parameters:** snelheden, richtingen en fase zijn makkelijk regelbaar.
- **Visualisatie:** de beweging wordt gevisualiseerd door een tekeninstrument dat lijnen op papier maakt.
- **Preview:** indien mogelijk wordt de ingestelde beweging weergegeven op een scherm.
- **Modulaire opbouw:** gescheiden hardware- en softwarecomponenten voor eenvoudige uitbreiding.

## Technologie

### Hardware

- Stappenmotoren met dedicated drivers voor precisie-aansturing.
- Tekeninstrument als uitvoer naar papier.
- Raspberry Pi als besturingsplatform (zie [schermkeuzes](Research/Scherm/Scherm_gegevens.md) en [motor-aansturing](Research/Stappenmotoren/Stappenmotor_aansturing.md)).

### Software

- Interactieve simulators (SIMV1 en SIMV2) voor het instellen en previewen van bewegingen.
- Parameterbesturing voor snelheid, richting, fase en bewegingsverhouding.

## Project Structuur

```bash
Motio/
├── doc/              # Projectdocumentatie en de projectcanvas
├── Hardware/         # Hardware van het project
├── Materiaal/        # Materiaallijst en benodigdheden
├── Research/         # Onderzoek en keuzes (scherm, stappenmotor-aansturing)
├── Software/         # Softwarecomponenten van het project
├── WARD-SIM/         # Interactieve simulators
│   ├── SIMV1/        # Oorspronkelijke live simulator
│   └── SIMV2/        # Virtueel prototype met machinebediening
└── README.md         # Dit bestand
```

## Simulators

- [SIMV1](WARD-SIM/SIMV1/index.html): oorspronkelijke live simulator.
- [SIMV2](WARD-SIM/SIMV2/index.html): virtueel prototype met machinebediening, mechanische transmissies en engineeringweergave. Zie de [SIMV2-handleiding](WARD-SIM/SIMV2/README.md).

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
