from dataclasses import dataclass, field

from paneel_maten import MDF_DIKTE


@dataclass
class Onderdeel:
    """Een lasergesneden plaat: omtrek en gaten in mm, in het vlak van de plaat."""

    naam: str
    omtrek: list
    gaten: list = field(default_factory=list)
    dikte: float = MDF_DIKTE
    materiaal: str = "wood"   # uiterlijk in de 3D-weergave; alles behalve "wood" wordt niet lasergesneden

    def geefVormen(self):
        return [self.omtrek] + self.gaten
