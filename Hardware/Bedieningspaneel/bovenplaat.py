from onderdeel import Onderdeel
from paneel_maten import (
    GLASVAK_BREEDTE,
    GLASVAK_HOOGTE,
    MDF_DIKTE,
    NOK_DIEPTE,
    PLAAT_BREEDTE,
    PLAAT_DIEPTE,
    ZIJKANT_X_LINKS,
    ZIJKANT_X_RECHTS,
)
from vingers import NOKKEN_GLASVAK, TANDEN_SCHUINE_ZIJDE, maakSleuf


def maakRechthoek(breedte, hoogte, x, y):
    return [(x, y), (x + breedte, y), (x + breedte, y + hoogte), (x, y + hoogte)]


def maakBovenplaat():
    """Bovenste laag met het glasvak: het glas zit hierin verzonken. y loopt langs de helling vanaf de achterkant."""
    omtrek = maakRechthoek(PLAAT_BREEDTE, PLAAT_DIEPTE, 0, 0)
    return Onderdeel("bovenplaat", omtrek, [maakGlasvak()] + maakZijkantSleuven())


def maakGlasvak():
    x = (PLAAT_BREEDTE - GLASVAK_BREEDTE) / 2
    y = (PLAAT_DIEPTE - GLASVAK_HOOGTE) / 2
    return maakVakMetNokken(x, y, GLASVAK_BREEDTE, GLASVAK_HOOGTE, NOK_DIEPTE)


def maakVakMetNokken(x, y, breedte, hoogte, diepte, krimp=0.0):
    """Rechthoek met nokken op de voor- en achterrand. Als gat in de bovenplaat zijn het nissen, de vulring heeft er nokken voor."""
    onder = y + hoogte
    punten = [(x, y)]
    for begin, eind in NOKKEN_GLASVAK:
        punten += [(x + begin + krimp, y), (x + begin + krimp, y - diepte), (x + eind - krimp, y - diepte), (x + eind - krimp, y)]
    punten += [(x + breedte, y), (x + breedte, onder)]
    for begin, eind in reversed(NOKKEN_GLASVAK):
        punten += [(x + eind - krimp, onder), (x + eind - krimp, onder + diepte), (x + begin + krimp, onder + diepte), (x + begin + krimp, onder)]
    return punten + [(x, onder)]


def maakZijkantSleuven():
    """Sleuven voor de tanden van de zijkanten, gedeeld door beide lagen van de bovenplaat."""
    return [
        maakSleuf(x, begin, MDF_DIKTE, eind - begin)
        for x in (ZIJKANT_X_LINKS, ZIJKANT_X_RECHTS)
        for begin, eind in TANDEN_SCHUINE_ZIJDE
    ]
