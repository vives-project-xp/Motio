"""As-built revolute joints between already positioned components."""
import math

import adsk.core
import adsk.fusion

from ..fusion.sketch_tools import MM


class JointMaker:
    """Creates joints in the root component; each part is found by its component."""

    def __init__(self, design: adsk.fusion.Design) -> None:
        self.root = design.rootComponent
        self.problems = []
        self.joints = {}
        self.rigid_groups = 0

    def ground(self, comp) -> None:
        self._occurrence(comp).isGrounded = True

    def rigid_with_children(self, name: str, comp) -> None:
        """Sub-parts (bolts, pen, paper) only move along when they share a rigid group."""
        try:
            occurrences = adsk.core.ObjectCollection.create()
            occurrences.add(self._occurrence(comp))
            group = self.root.rigidGroups.add(occurrences, True)
            group.name = name
            self.rigid_groups += 1
        except Exception as exc:
            self.problems.append(f"Rigid group {name}: {exc}")

    def revolute(self, name: str, moving, base, hole_xy, hole_d: float) -> None:
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

    def limit_rotation(self, name: str, max_deg: float) -> None:
        """Keep a revolute joint within +/- max_deg of its as-built angle.

        Used on the arm joint: two arms between two pins can meet on either side,
        and the limit stops Fusion from flipping to the wrong (pen off the paper) side.
        """
        try:
            limits = self.joints[name].jointMotion.rotationLimits
            limits.isMinimumValueEnabled = True
            limits.minimumValue = -math.radians(max_deg)
            limits.isMaximumValueEnabled = True
            limits.maximumValue = math.radians(max_deg)
        except Exception as exc:
            self.problems.append(f"Limits on {name}: {exc}")

    # ---------------------------------------------------------------- lookup
    def _occurrence(self, comp):
        return self.root.allOccurrencesByComponent(comp).item(0)

    @staticmethod
    def _circle_edge(comp, xy, radius: float):
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
