from bovenplaat import maakRechthoek
from onderdeel import Onderdeel
from paneel_maten import (
    GLAS_BREEDTE,
    GLAS_DIKTE,
    GLAS_HOOGTE,
    GLAS_SPELING,
    GLASVAK_BREEDTE,
    GLASVAK_HOOGTE,
    MDF_DIKTE,
    MODULE_BREEDTE,
    MODULE_DIKTE,
    MODULE_HOOGTE,
    MODULE_RAND_BOVEN,
    MODULE_RAND_ZIJKANT,
    PCB_BREEDTE,
    PCB_DIKTE,
    PCB_HOOGTE,
    PI_AFSTANDHOUDER,
    PI_BREEDTE,
    PI_DIKTE,
    PI_GAT_AFSTAND_LINKS,
    PI_GAT_AFSTAND_ONDER,
    PI_GAT_STEEKMAAT_Y,
    MODULE_RAND_ONDER,
    PI_GAT_RAND,
    PI_HOOGTE,
    PLAAT_BREEDTE,
    PLAAT_DIEPTE,
    VULRING_DIKTE,
)

GLAS_ONDERKANT = MDF_DIKTE + VULRING_DIKTE
MODULE_ONDERKANT = GLAS_ONDERKANT - MODULE_DIKTE
PCB_ONDERKANT = MODULE_ONDERKANT - PCB_DIKTE
PI_BOVENKANT = PCB_ONDERKANT - PI_AFSTANDHOUDER


def maakSchermOnderdelen():
    """Glas, LCD-module, printplaat en Pi als blokken, alleen voor de weergave. Geeft (blok, hoogte boven de helling)."""
    glasX = (PLAAT_BREEDTE - GLASVAK_BREEDTE) / 2 + GLAS_SPELING
    glasY = (PLAAT_DIEPTE - GLASVAK_HOOGTE) / 2 + GLAS_SPELING
    return [
        (maakBlok("glas", GLAS_BREEDTE, GLAS_HOOGTE, glasX, glasY, GLAS_DIKTE, "glass"), GLAS_ONDERKANT),
        (maakModule(glasX, glasY), MODULE_ONDERKANT),
        (maakPrintplaat(glasX, glasY), PCB_ONDERKANT),
        (maakPi(glasX, glasY), PI_BOVENKANT - PI_DIKTE),
    ]


def maakModule(glasX, glasY):
    return maakBlok("module", MODULE_BREEDTE, MODULE_HOOGTE, glasX + MODULE_RAND_ZIJKANT,
                    glasY + MODULE_RAND_BOVEN, MODULE_DIKTE, "screen")


def maakPrintplaat(glasX, glasY):
    return maakBlok("printplaat", PCB_BREEDTE, PCB_HOOGTE, *geefPiHoek(glasX, glasY), PCB_DIKTE, "board")


def maakPi(glasX, glasY):
    """De Pi hangt aan de vier M2.5-gaten van de module."""
    return maakBlok("pi", PI_BREEDTE, PI_HOOGTE, *geefPiHoek(glasX, glasY), PI_DIKTE, "board")


def geefPiHoek(glasX, glasY):
    """Linkerbovenhoek (x, y) van de Pi in het vlak van de plaat. y loopt van de bovenkant van het beeld naar beneden."""
    eersteGatX = glasX + MODULE_RAND_ZIJKANT + PI_GAT_AFSTAND_LINKS
    ondersteGatY = glasY + GLAS_HOOGTE - MODULE_RAND_ONDER - PI_GAT_AFSTAND_ONDER
    return eersteGatX - PI_GAT_RAND, ondersteGatY - PI_GAT_STEEKMAAT_Y - PI_GAT_RAND


def maakBlok(naam, breedte, hoogte, x, y, dikte, materiaal):
    return Onderdeel(naam, maakRechthoek(breedte, hoogte, x, y), [], dikte, materiaal)
