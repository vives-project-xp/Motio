from bovenplaat import maakVakMetNokken
from onderdeel import Onderdeel
from paneel_maten import (
    GLASVAK_BREEDTE,
    GLASVAK_HOOGTE,
    NOK_DIEPTE,
    PLAAT_BREEDTE,
    PLAAT_DIEPTE,
    VINGER_SPELING,
    VULRING_DIKTE,
)
from steunplaat import maakModuleOpening


def maakVulring():
    """Ring in het glasvak, tussen steunplaat en glas. Hij tilt het glas op zodat het gelijk ligt met de bovenplaat.
    De nokken vallen in de nissen van het glasvak, zodat de ring op zijn plaats blijft."""
    krimp = VINGER_SPELING / 2
    x = (PLAAT_BREEDTE - GLASVAK_BREEDTE) / 2 + krimp
    y = (PLAAT_DIEPTE - GLASVAK_HOOGTE) / 2 + krimp
    omtrek = maakVakMetNokken(x, y, GLASVAK_BREEDTE - 2 * krimp, GLASVAK_HOOGTE - 2 * krimp, NOK_DIEPTE, krimp)
    return Onderdeel("vulring", omtrek, [maakModuleOpening()], VULRING_DIKTE)
