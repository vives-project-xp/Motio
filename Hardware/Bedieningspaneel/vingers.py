from paneel_maten import (
    ACHTERWAND_HOOGTE,
    BINNENBREEDTE,
    GLASVAK_BREEDTE,
    NOK_LENGTE,
    PLAAT_DIEPTE,
    TAND_LENGTE,
    VINGER_SPELING,
    ZIJKANT_HOOGTE,
)


def berekenTanden(lengte, aantal, tandLengte):
    """Gelijk verdeelde tanden: elke tand staat gecentreerd in een gelijk vak. Geeft (begin, eind) per tand."""
    vak = lengte / aantal
    marge = (vak - tandLengte) / 2
    return [(i * vak + marge, i * vak + marge + tandLengte) for i in range(aantal)]


def maakSleuf(x, y, breedte, hoogte):
    """Rechthoekig gat voor een tand, met speling zodat de tand erin past."""
    ruimte = VINGER_SPELING / 2
    return [
        (x - ruimte, y - ruimte),
        (x + breedte + ruimte, y - ruimte),
        (x + breedte + ruimte, y + hoogte + ruimte),
        (x - ruimte, y + hoogte + ruimte),
    ]


# Tandverdelingen die zowel de tanden als de bijbehorende sleuven bepalen
TANDEN_SCHUINE_ZIJDE = berekenTanden(PLAAT_DIEPTE, 5, TAND_LENGTE)
TANDEN_ZIJKANT_ONDER = berekenTanden(ZIJKANT_HOOGTE, 4, TAND_LENGTE)
TANDEN_ACHTERWAND_ZIJ = berekenTanden(ACHTERWAND_HOOGTE, 3, TAND_LENGTE)
TANDEN_ACHTERWAND_ONDER = berekenTanden(BINNENBREEDTE, 4, TAND_LENGTE)
NOKKEN_GLASVAK = berekenTanden(GLASVAK_BREEDTE, 2, NOK_LENGTE)
