"""Maakt het lasersnijbestand (SVG en DXF) met alle onderdelen en een 3D-voorbeeld. Start: python genereer.py"""
from pathlib import Path

from achterwand import maakAchterwand
from bodem import maakBodem
from bovenplaat import maakBovenplaat
from export import berekenAfmetingen, schrijfDxf, schrijfSvg
from steunplaat import maakSteunplaat
from vulring import maakVulring
from voorbeeld import schrijfVoorbeeld
from zijkant import maakZijkant

ONDERDEEL_AFSTAND = 5.0
UITVOER_MAP = Path(__file__).parent / "uitvoer"


def verplaats(vorm, dx, dy):
    return [(x + dx, y + dy) for x, y in vorm]


def plaatsRij(onderdelen, beginY):
    """Zet onderdelen naast elkaar op een rij. Geeft hun vormen en de onderkant van de rij."""
    vormen, volgendeX, onderkant = [], 0.0, beginY
    for onderdeel in onderdelen:
        minX, minY, maxX, maxY = berekenAfmetingen(onderdeel.geefVormen())
        vormen += [verplaats(vorm, volgendeX - minX, beginY - minY) for vorm in onderdeel.geefVormen()]
        volgendeX += maxX - minX + ONDERDEEL_AFSTAND
        onderkant = max(onderkant, beginY + maxY - minY)
    return vormen, onderkant


def maakIndeling():
    eersteRij, onderkant = plaatsRij([maakZijkant(), maakZijkant(), maakAchterwand()], 0.0)
    tweedeRij, _ = plaatsRij([maakBovenplaat(), maakSteunplaat(), maakVulring(), maakBodem()], onderkant + ONDERDEEL_AFSTAND)
    return eersteRij + tweedeRij


def main():
    UITVOER_MAP.mkdir(exist_ok=True)
    vormen = maakIndeling()
    schrijfSvg(vormen, UITVOER_MAP / "bedieningspaneel.svg")
    schrijfDxf(vormen, UITVOER_MAP / "bedieningspaneel.dxf")
    schrijfVoorbeeld(UITVOER_MAP / "voorbeeld_3d.svg")
    print(f"Geschreven naar {UITVOER_MAP}")


if __name__ == "__main__":
    main()
