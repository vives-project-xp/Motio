"""Turns one revolute joint so its part gets a wanted absolute angle."""
import math

import adsk.fusion

TURN = 2 * math.pi
PROBE_ANGLE = 0.2  # rad; to find out which way the joint turns


class JointDrive:
    def __init__(self, joint: adsk.fusion.Joint, part: adsk.fusion.Occurrence) -> None:
        """`part` is the turning occurrence as seen from the root component; it must still be in its home pose."""
        self._motion = joint.jointMotion
        self._part = part
        self._home_angle = self._part_angle()
        self._last_turn = 0.0
        self._sign = self._measure_sign()

    def turn_to(self, angle: float) -> None:
        """`angle` in radians, counter-clockwise from above, in the frame of the model."""
        turn = angle - self._home_angle
        turn += TURN * round((self._last_turn - turn) / TURN)  # keep it continuous: never jump a whole turn
        self._last_turn = turn
        self._motion.rotationValue = self._sign * turn

    def _part_angle(self) -> float:
        _, x_axis, _, _ = self._part.transform2.getAsCoordinateSystem()
        return math.atan2(x_axis.y, x_axis.x)

    def _measure_sign(self) -> int:
        """The joint axis can point up or down; try a small turn and see where the part goes."""
        self._motion.rotationValue = PROBE_ANGLE
        turned = self._part_angle() - self._home_angle
        self._motion.rotationValue = 0.0
        turned = math.atan2(math.sin(turned), math.cos(turned))
        if abs(turned) < PROBE_ANGLE / 2:
            raise RuntimeError("The joint did not move the part; check the joint in Fusion")
        return 1 if turned > 0 else -1
