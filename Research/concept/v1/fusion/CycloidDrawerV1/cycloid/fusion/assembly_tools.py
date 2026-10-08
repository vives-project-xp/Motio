"""Creating positioned components and giving bodies an appearance."""
import adsk.core
import adsk.fusion

from .sketch_tools import MM


def placement(x: float, y: float, z: float, angle: float = 0.0) -> adsk.core.Matrix3D:
    """Rotation about Z (rad), then a translation (mm)."""
    m = adsk.core.Matrix3D.create()
    m.setToRotation(angle, adsk.core.Vector3D.create(0, 0, 1), adsk.core.Point3D.create(0, 0, 0))
    m.translation = adsk.core.Vector3D.create(x * MM, y * MM, z * MM)
    return m


def frame(origin, x_axis, y_axis, z_axis) -> adsk.core.Matrix3D:
    """Matrix from an origin (mm) and three world unit axes for local X, Y, Z."""
    m = adsk.core.Matrix3D.create()
    vec = lambda v: adsk.core.Vector3D.create(*v)
    m.setWithCoordinateSystem(adsk.core.Point3D.create(*(c * MM for c in origin)),
                              vec(x_axis), vec(y_axis), vec(z_axis))
    return m


def new_component(parent: adsk.fusion.Component, name: str,
                  matrix: adsk.core.Matrix3D = None) -> adsk.fusion.Component:
    occ = parent.occurrences.addNewComponent(matrix or adsk.core.Matrix3D.create())
    occ.component.name = name
    return occ.component


class AppearancePalette:
    """Looks up library appearances by keyword; silently skips if none is found."""

    KEYWORDS = {
        "wood": ["oak", "birch", "pine", "wood"],
        "gear": ["walnut", "cherry", "maple", "wood"],
        "steel": ["steel - satin", "steel", "zinc"],
        "ptfe": ["plastic - matte (white)", "plastic - glossy (white)", "plastic"],
        "paper": ["paper", "paint - enamel glossy (white)", "white"],
        "pen": ["paint - enamel glossy (blue)", "blue"],
        "grip": ["rubber", "plastic - matte (black)", "black"],
    }

    def __init__(self, app: adsk.core.Application, design: adsk.fusion.Design) -> None:
        self.design = design
        self._library = self._library_appearances(app)
        self._cache = {}

    @staticmethod
    def _library_appearances(app) -> list:
        found = []
        try:
            for i in range(app.materialLibraries.count):
                lib = app.materialLibraries.item(i)
                if "appearance" in lib.name.lower():
                    found += [lib.appearances.item(j) for j in range(lib.appearances.count)]
        except Exception:
            pass
        return found

    def apply(self, body: adsk.fusion.BRepBody, role: str) -> None:
        try:
            app_ = self._resolve(role)
            if app_:
                body.appearance = app_
        except Exception:
            pass  # appearance is cosmetic only

    def _resolve(self, role: str):
        if role in self._cache:
            return self._cache[role]
        result = None
        for keyword in self.KEYWORDS.get(role, []):
            match = next((a for a in self._library if keyword in a.name.lower()), None)
            if match:
                existing = self.design.appearances.itemByName(match.name)
                result = existing or self.design.appearances.addByCopy(match, match.name)
                break
        self._cache[role] = result
        return result
