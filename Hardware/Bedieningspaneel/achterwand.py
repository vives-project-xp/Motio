from bovenplaat import maakRechthoek
from onderdeel import Onderdeel
from paneel_maten import (
    ACHTERWAND_HOOGTE,
    BINNENBREEDTE,
    ACHTERWAND_TOP,
    KABELGAT_AFSTAND_ZIJKANT,
    KABELGAT_BREEDTE,
    KABELGAT_HOOGTE,
    KABELGAT_MIDDEN_Z,
    ZIJKANT_HOOGTE,
    MDF_DIKTE,
)
from vingers import TANDEN_ACHTERWAND_ONDER, TANDEN_ACHTERWAND_ZIJ


def maakAchterwand():
    """Achterwand tussen de zijkanten: x=0 is de binnenkant van de linkerzijkant, y=0 de bovenkant."""
    omtrek = [(0, 0), (BINNENBREEDTE, 0)]
    omtrek += maakRechterTanden()
    omtrek += maakOnderTanden()
    omtrek += maakLinkerTanden()
    return Onderdeel("achterwand", omtrek, [maakKabelgat()])


def maakKabelgat():
    """Opening voor de bekabeling, aan de kant van de linkerzijkant (x=0), dat is de rechterkant gezien van voren."""
    y = ZIJKANT_HOOGTE - (KABELGAT_MIDDEN_Z + KABELGAT_HOOGTE / 2) - ACHTERWAND_TOP
    return maakRechthoek(KABELGAT_BREEDTE, KABELGAT_HOOGTE, KABELGAT_AFSTAND_ZIJKANT, y)


def maakRechterTanden():
    """Tanden die door de rechterzijkant steken, van boven naar beneden."""
    punten = []
    for begin, eind in TANDEN_ACHTERWAND_ZIJ:
        x = BINNENBREEDTE
        punten += [(x, begin), (x + MDF_DIKTE, begin), (x + MDF_DIKTE, eind), (x, eind)]
    return punten


def maakLinkerTanden():
    """Tanden die door de linkerzijkant steken, van onder naar boven."""
    punten = []
    for begin, eind in reversed(TANDEN_ACHTERWAND_ZIJ):
        punten += [(0, eind), (-MDF_DIKTE, eind), (-MDF_DIKTE, begin), (0, begin)]
    return punten


def maakOnderTanden():
    """Tanden die in de bodemplaat vallen, van rechts naar links."""
    hoogte = ACHTERWAND_HOOGTE
    punten = [(BINNENBREEDTE, hoogte)]
    for begin, eind in reversed(TANDEN_ACHTERWAND_ONDER):
        punten += [(eind, hoogte), (eind, hoogte + MDF_DIKTE), (begin, hoogte + MDF_DIKTE), (begin, hoogte)]
    return punten + [(0, hoogte)]
