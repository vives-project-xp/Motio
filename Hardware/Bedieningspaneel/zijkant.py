from math import sqrt

from onderdeel import Onderdeel
from paneel_maten import (
    ACHTERWAND_AFSTAND,
    ACHTERWAND_TOP,
    BOVENPLAAT_DIKTE,
    HAAK_HALS_BREEDTE,
    HAAK_HALS_LENGTE,
    HAAK_KOP_BREEDTE,
    HAAK_KOP_DIKTE,
    HAAK_MIDDEN_Y,
    MDF_DIKTE,
    ZIJKANT_HOOGTE,
)
from vingers import TANDEN_ACHTERWAND_ZIJ, TANDEN_SCHUINE_ZIJDE, TANDEN_ZIJKANT_ONDER, maakSleuf

HALS_BUITENKANT = HAAK_HALS_LENGTE
KOP_BUITENKANT = HAAK_HALS_LENGTE + HAAK_KOP_DIKTE
WORTEL_TWEE = sqrt(2)


def maakZijkant():
    """Zijkant met de verticale kant op x=0 (de haak steekt naar x<0) en de schuine zijde van (0,0) naar (H,H)."""
    omtrek = maakAchterkant() + maakOnderkant() + maakSchuineZijde()
    return Onderdeel("zijkant", omtrek, maakAchterwandSleuven())


def maakAchterkant():
    """Verticale kant met een T-haak: dunne hals door de sleuf, bredere kop erachter."""
    midden, hals, kop = HAAK_MIDDEN_Y, HAAK_HALS_BREEDTE / 2, HAAK_KOP_BREEDTE / 2
    return [
        (0, 0),
        (0, midden - hals),
        (-HALS_BUITENKANT, midden - hals),
        (-HALS_BUITENKANT, midden - kop),
        (-KOP_BUITENKANT, midden - kop),
        (-KOP_BUITENKANT, midden + kop),
        (-HALS_BUITENKANT, midden + kop),
        (-HALS_BUITENKANT, midden + hals),
        (0, midden + hals),
        (0, ZIJKANT_HOOGTE),
    ]


def maakOnderkant():
    """Tanden naar beneden, de zijkant staat met deze tanden in de bodemplaat."""
    hoogte = ZIJKANT_HOOGTE
    punten = []
    for begin, eind in TANDEN_ZIJKANT_ONDER:
        punten += [(begin, hoogte), (begin, hoogte + MDF_DIKTE), (eind, hoogte + MDF_DIKTE), (eind, hoogte)]
    return punten + [(hoogte, hoogte)]


def maakSchuineZijde():
    """Tanden loodrecht op de helling, zo hoog als beide lagen van de bovenplaat samen."""
    punten = []
    for begin, eind in reversed(TANDEN_SCHUINE_ZIJDE):
        punten += [
            langsHelling(eind, 0),
            langsHelling(eind, BOVENPLAAT_DIKTE),
            langsHelling(begin, BOVENPLAAT_DIKTE),
            langsHelling(begin, 0),
        ]
    return punten


def langsHelling(afstand, uitstulping):
    """Punt op de schuine zijde (afstand vanaf de top), uitstulping loodrecht naar boven."""
    langs = afstand / WORTEL_TWEE
    omhoog = uitstulping / WORTEL_TWEE
    return (langs + omhoog, langs - omhoog)


def maakAchterwandSleuven():
    return [
        maakSleuf(ACHTERWAND_AFSTAND, ACHTERWAND_TOP + begin, MDF_DIKTE, eind - begin)
        for begin, eind in TANDEN_ACHTERWAND_ZIJ
    ]
