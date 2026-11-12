"""As-built revolute joints between already positioned parts; joints that fail are collected, not raised."""
import adsk.core
import adsk.fusion

from ..fusion.sketch_tools import MM


class JointMaker:
    """Creates joints in the root component; each part is found by its component."""

    def __init__(self, design: adsk.fusion.Design) -> None:
        self.root = design.rootComponent
        self.problems = []
        self.joints = {}

    def ground(self, comp: adsk.fusion.Component) -> None:
        self._occurrence(comp).isGrounded = True

    def revolute(self, name: str, moving, base, hole_xy: tuple, hole_d: float) -> None:
        """Revolute joint about the hole (in `moving`'s own coordinates) between two parts."""
        try:
            moving_occ, base_occ = self._occurrence(moving), self._occurrence(base)
            edge = self._circle_edge(moving, hole_xy, hole_d / 2)
            geometry = adsk.fusion.JointGeometry.createByCurve(
                edge.createForAssemblyContext(moving_occ), adsk.fusion.JointKeyPointTypes.CenterKeyPoint)
            joint_input = self.root.asBuiltJoints.createInput(moving_occ, base_occ, geometry)
            joint_input.setAsRevoluteJointMotion(adsk.fusion.JointDirections.ZAxisJointDirection)
            joint = self.root.asBuiltJoints.add(joint_input)
            joint.name = name
            self.joints[name] = joint
        except Exception as exc:  # keep building; report at the end
            self.problems.append(f"{name}: {exc}")

    def rigid_group(self, name: str, comps: list) -> None:
        """Parts that sit on another part (pins, pen, paper) only move along when they share a rigid group."""
        try:
            occurrences = adsk.core.ObjectCollection.create()
            for comp in comps:
                occurrences.add(self._occurrence(comp))
            self.root.rigidGroups.add(occurrences, False).name = name
        except Exception as exc:
            self.problems.append(f"Rigid group {name}: {exc}")

    def _occurrence(self, comp: adsk.fusion.Component) -> adsk.fusion.Occurrence:
        return self.root.allOccurrencesByComponent(comp).item(0)

    @staticmethod
    def _circle_edge(comp: adsk.fusion.Component, xy: tuple, radius: float):
        for i in range(comp.bRepBodies.count):
            body = comp.bRepBodies.item(i)
            for j in range(body.edges.count):
                edge = body.edges.item(j)
                circle = adsk.core.Circle3D.cast(edge.geometry)
                if circle and abs(circle.radius - radius * MM) < 1e-4 \
                        and abs(circle.center.x - xy[0] * MM) < 1e-3 \
                        and abs(circle.center.y - xy[1] * MM) < 1e-3:
                    return edge
        raise LookupError(f"no hole Ø{2 * radius:g} at {xy} in {comp.name}")
