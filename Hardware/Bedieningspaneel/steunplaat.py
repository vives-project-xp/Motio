from bovenplaat import maakRechthoek, maakZijkantSleuven
from onderdeel import Onderdeel
from paneel_maten import (
    GLAS_SPELING,
    GLASVAK_BREEDTE,
    GLASVAK_HOOGTE,
    MODULE_BREEDTE,
    MODULE_HOOGTE,
    MODULE_RAND_BOVEN,
    MODULE_RAND_ZIJKANT,
    MODULE_SPELING,
    PLAAT_BREEDTE,
    PLAAT_DIEPTE,
)


def maakSteunplaat():
    """Onderste laag onder de bovenplaat: het glas rust op de rand, de LCD-module steekt door de opening."""
    omtrek = maakRechthoek(PLAAT_BREEDTE, PLAAT_DIEPTE, 0, 0)
    return Onderdeel("steunplaat", omtrek, [maakModuleOpening()] + maakZijkantSleuven())


def maakModuleOpening():
    """De module ligt gecentreerd in de breedte, maar dichter bij de kabelkant (onderkant van het beeld) dan bij de bovenkant."""
    glasX = (PLAAT_BREEDTE - GLASVAK_BREEDTE) / 2 + GLAS_SPELING
    glasY = (PLAAT_DIEPTE - GLASVAK_HOOGTE) / 2 + GLAS_SPELING
    moduleX = glasX + MODULE_RAND_ZIJKANT
    moduleY = glasY + MODULE_RAND_BOVEN
    return maakRechthoek(
        MODULE_BREEDTE + 2 * MODULE_SPELING,
        MODULE_HOOGTE + 2 * MODULE_SPELING,
        moduleX - MODULE_SPELING,
        moduleY - MODULE_SPELING,
    )
