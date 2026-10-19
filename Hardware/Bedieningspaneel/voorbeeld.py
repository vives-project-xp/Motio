"""Tekent een isometrisch 3D-voorbeeld (SVG) van de opgebouwde kast, bekeken van rechtsvoor-boven."""
from montage import maakOpstelling

SCHAAL = 3.0
MARGE = 20.0
COS_30 = 0.866
KLEUREN = {
    "bodem": "#9aa5b1",
    "achterwand": "#c9a66b",
    "zijkant": "#7fb3d5",
    "steunplaat": "#d98880",
    "vulring": "#f7dc6f",
    "bovenplaat": "#e59866",
    "glas": "#85c1e9",
    "module": "#34495e",
    "printplaat": "#58d68d",
    "pi": "#ec7063",
}


def projecteer(punt):
    x, y, z = punt
    return ((x - y) * COS_30 * SCHAAL, ((x + y) * 0.5 - z) * SCHAAL)


def maakVlakken(onderdeel, plaats):
    """Geeft per vorm de projectie van beide vlakken van de plaat."""
    lagen = (0.0, onderdeel.dikte)
    return [[[projecteer(plaats(punt, laag)) for punt in vorm] for vorm in onderdeel.geefVormen()] for laag in lagen]


def maakPad(vormen):
    delen = []
    for vorm in vormen:
        punten = " L ".join(f"{x:.2f},{y:.2f}" for x, y in vorm)
        delen.append(f"M {punten} Z")
    return " ".join(delen)


def maakKanten(voorVlak, achterVlak):
    """Lijnen tussen beide vlakken op de hoeken van de omtrek, zodat de plaatdikte zichtbaar is."""
    return "".join(
        f'<line x1="{a[0]:.2f}" y1="{a[1]:.2f}" x2="{b[0]:.2f}" y2="{b[1]:.2f}"/>'
        for a, b in zip(voorVlak[0], achterVlak[0])
    )


def tekenOnderdeel(onderdeel, plaats):
    laag0, laag1 = maakVlakken(onderdeel, plaats)
    kleur = KLEUREN[onderdeel.naam]
    stijl = f'fill="{kleur}" fill-opacity="0.55" fill-rule="evenodd" stroke="#222" stroke-width="0.6"'
    return (
        f'<g><path d="{maakPad(laag0)}" {stijl}/>'
        f'<g stroke="#222" stroke-width="0.6">{maakKanten(laag0, laag1)}</g>'
        f'<path d="{maakPad(laag1)}" {stijl}/></g>'
    )


def maakBereik(delen):
    punten = [punt for laag0, _ in delen for vorm in laag0 for punt in vorm]
    xs, ys = [x for x, _ in punten], [y for _, y in punten]
    return min(xs) - MARGE, min(ys) - MARGE, max(xs) + MARGE, max(ys) + MARGE


def schrijfVoorbeeld(pad):
    opstelling = maakOpstelling()
    delen = [maakVlakken(onderdeel, plaats) for onderdeel, plaats in opstelling]
    minX, minY, maxX, maxY = maakBereik(delen)
    figuren = "\n".join(tekenOnderdeel(onderdeel, plaats) for onderdeel, plaats in opstelling)
    with open(pad, "w", encoding="utf-8") as bestand:
        bestand.write(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{maxX - minX:.0f}" height="{maxY - minY:.0f}" '
            f'viewBox="{minX:.2f} {minY:.2f} {maxX - minX:.2f} {maxY - minY:.2f}">\n'
            f'<rect x="{minX:.2f}" y="{minY:.2f}" width="{maxX - minX:.2f}" height="{maxY - minY:.2f}" fill="white"/>\n'
            f"{figuren}\n</svg>\n"
        )
