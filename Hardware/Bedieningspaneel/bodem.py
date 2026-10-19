from bovenplaat import maakRechthoek
from onderdeel import Onderdeel
from paneel_maten import (
    ACHTERWAND_AFSTAND,
    MDF_DIKTE,
    PLAAT_BREEDTE,
    ZIJKANT_HOOGTE,
    ZIJKANT_X_LINKS,
    ZIJKANT_X_RECHTS,
)
from vingers import TANDEN_ACHTERWAND_ONDER, TANDEN_ZIJKANT_ONDER, maakSleuf


def maakBodem():
    """Bodemplaat die op de case komt. y loopt van de achterkant naar voren, zoals x in de zijkant."""
    omtrek = maakRechthoek(PLAAT_BREEDTE, ZIJKANT_HOOGTE, 0, 0)
    return Onderdeel("bodem", omtrek, maakZijkantSleuven() + maakAchterwandSleuven())


def maakZijkantSleuven():
    return [
        maakSleuf(x, begin, MDF_DIKTE, eind - begin)
        for x in (ZIJKANT_X_LINKS, ZIJKANT_X_RECHTS)
        for begin, eind in TANDEN_ZIJKANT_ONDER
    ]


def maakAchterwandSleuven():
    binnenKant = ZIJKANT_X_LINKS + MDF_DIKTE
    return [
        maakSleuf(binnenKant + begin, ACHTERWAND_AFSTAND, eind - begin, MDF_DIKTE)
        for begin, eind in TANDEN_ACHTERWAND_ONDER
    ]
