"""Collects paths per layer and writes a laser-ready SVG (mm units)."""
from dataclasses import dataclass, field

CUT = "#FF0000"      # red  = cut (same as the box file)
ENGRAVE = "#0000FF"  # blue = engrave / score line
LABEL = "#777777"    # grey = text engrave


@dataclass
class SvgDocument:
    width: float
    height: float
    _items: list[str] = field(default_factory=list)

    def cut(self, d: str, ident: str = "") -> None:
        self._items.append(self._path(d, CUT, ident))

    def engrave(self, d: str, ident: str = "") -> None:
        self._items.append(self._path(d, ENGRAVE, ident))

    def label(self, x: float, y: float, text: str, size: float = 6) -> None:
        self._items.append(
            f'<text x="{x:.2f}" y="{y:.2f}" font-family="Arial" font-size="{size}" '
            f'fill="{LABEL}" stroke="none" text-anchor="middle">{text}</text>')

    def render(self) -> str:
        body = "\n".join(self._items)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" '
                f'width="{self.width}mm" height="{self.height}mm" '
                f'viewBox="0 0 {self.width} {self.height}">\n{body}\n</svg>\n')

    def save(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(self.render())

    @staticmethod
    def _path(d: str, colour: str, ident: str) -> str:
        id_attr = f' id="{ident}"' if ident else ""
        return (f'<path{id_attr} d="{d}" fill="none" stroke="{colour}" stroke-width="0.1" '
                f'vector-effect="non-scaling-stroke"/>')
