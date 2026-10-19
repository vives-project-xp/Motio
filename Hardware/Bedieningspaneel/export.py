SNIJLIJN_KLEUR = "red"
SNIJLIJN_DIKTE = 0.1


def berekenAfmetingen(vormen):
    punten = [punt for vorm in vormen for punt in vorm]
    xs = [x for x, _ in punten]
    ys = [y for _, y in punten]
    return min(xs), min(ys), max(xs), max(ys)


def schrijfSvg(vormen, pad):
    minX, minY, maxX, maxY = berekenAfmetingen(vormen)
    breedte, hoogte = maxX - minX, maxY - minY
    paden = "\n".join(
        f'  <polygon points="{_formatteerPunten(vorm)}" fill="none" '
        f'stroke="{SNIJLIJN_KLEUR}" stroke-width="{SNIJLIJN_DIKTE}"/>'
        for vorm in vormen
    )
    with open(pad, "w", encoding="utf-8") as bestand:
        bestand.write(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{breedte:.2f}mm" height="{hoogte:.2f}mm" '
            f'viewBox="{minX:.2f} {minY:.2f} {breedte:.2f} {hoogte:.2f}">\n{paden}\n</svg>\n'
        )


def schrijfDxf(vormen, pad):
    """Schrijft elke vorm als gesloten reeks LINE-entiteiten (DXF R12). Y wordt omgedraaid want DXF heeft y omhoog."""
    regels = ["0", "SECTION", "2", "ENTITIES"]
    for vorm in vormen:
        for begin, eind in zip(vorm, vorm[1:] + vorm[:1]):
            regels += _maakLijn(begin, eind)
    regels += ["0", "ENDSEC", "0", "EOF"]
    with open(pad, "w", encoding="ascii") as bestand:
        bestand.write("\n".join(regels) + "\n")


def _maakLijn(begin, eind):
    (x1, y1), (x2, y2) = begin, eind
    return ["0", "LINE", "8", "SNIJDEN", "10", f"{x1:.3f}", "20", f"{-y1:.3f}", "11", f"{x2:.3f}", "21", f"{-y2:.3f}"]


def _formatteerPunten(vorm):
    return " ".join(f"{x:.3f},{y:.3f}" for x, y in vorm)
