"""Plaatst de platte onderdelen in de ruimte zoals ze in elkaar gezet worden.

Assen: X = breedte, Y = diepte (0 = achterkant, voorkant is positief), Z = hoogte (0 = bovenkant van de bodem).
Elke plaatsing is een functie (punt, laag) -> (X, Y, Z), met laag 0 en MDF_DIKTE als de twee vlakken van de plaat.
"""
from math import sqrt

from achterwand import maakAchterwand
from bodem import maakBodem
from bovenplaat import maakBovenplaat
from paneel_maten import (
    ACHTERWAND_AFSTAND,
    ACHTERWAND_TOP,
    MDF_DIKTE,
    ZIJKANT_HOOGTE,
    ZIJKANT_X_LINKS,
    ZIJKANT_X_RECHTS,
)
from steunplaat import maakSteunplaat
from vulring import maakVulring
from scherm import maakSchermOnderdelen
from zijkant import maakZijkant

WORTEL_TWEE = sqrt(2)


def plaatsZijkant(xPositie):
    return lambda punt, laag: (xPositie + laag, punt[0], ZIJKANT_HOOGTE - punt[1])


def plaatsOpHelling(afstandVanHelling):
    """Plaat op de helling, afstandVanHelling is de hoogte van de onderkant van de laag boven de schuine zijde."""

    def plaats(punt, laag):
        langsHelling, dikte = punt[1], afstandVanHelling + laag
        return (punt[0], (langsHelling + dikte) / WORTEL_TWEE, ZIJKANT_HOOGTE - (langsHelling - dikte) / WORTEL_TWEE)

    return plaats


def plaatsBodem(punt, laag):
    return (punt[0], punt[1], laag - MDF_DIKTE)


def plaatsAchterwand(punt, laag):
    return (
        ZIJKANT_X_LINKS + MDF_DIKTE + punt[0],
        ACHTERWAND_AFSTAND + laag,
        ZIJKANT_HOOGTE - ACHTERWAND_TOP - punt[1],
    )


def maakOpstelling(metScherm=True):
    """Onderdelen met hun plaatsing, in volgorde van achter naar voor zoals de preview ze tekent."""
    onderdelen = [
        (maakBodem(), plaatsBodem),
        (maakAchterwand(), plaatsAchterwand),
        (maakZijkant(), plaatsZijkant(ZIJKANT_X_LINKS)),
        (maakZijkant(), plaatsZijkant(ZIJKANT_X_RECHTS)),
        (maakSteunplaat(), plaatsOpHelling(0.0)),
        (maakVulring(), plaatsOpHelling(MDF_DIKTE)),
        (maakBovenplaat(), plaatsOpHelling(MDF_DIKTE)),
    ]
    if metScherm:
        onderdelen += [(blok, plaatsOpHelling(afstand)) for blok, afstand in maakSchermOnderdelen()]
    return onderdelen
