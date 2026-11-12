"""Works out every pose of the animation from the pen path (no Fusion dependency)."""
import math

from . import rose_pattern
from .. import config as cfg
from .pose import Pose
from ..geometry.kinematics import crank_tip_for_pen


class MotionPlan:
    def __init__(self, motor_xy: list, home_tip_a: tuple, home_tip_b: tuple) -> None:
        self.motor_xy = motor_xy
        self.home_tips = (home_tip_a, home_tip_b)

    def poses(self) -> list:
        """The first pose is the home pose; raises ValueError when the arms cannot reach the pen somewhere."""
        poses = []
        tips = self.home_tips
        for frame in range(cfg.ANIMATION_FRAMES + 1):
            pose = self._pose_at(frame / cfg.ANIMATION_FRAMES, tips)
            tips = (pose.tip_a, pose.tip_b)
            poses.append(pose)
        return poses

    def _pose_at(self, progress: float, previous_tips: tuple) -> Pose:
        centre = self.motor_xy[cfg.MOTOR_C]
        pen = (centre[0], centre[1] + rose_pattern.pen_radius(progress))
        return Pose(
            tip_a=self._tip(cfg.MOTOR_A, pen, cfg.ARM_LENGTH_A, previous_tips[0]),
            tip_b=self._tip(cfg.MOTOR_B, pen, cfg.ARM_LENGTH_B, previous_tips[1]),
            pen_xy=pen,
            platter_angle=2 * math.pi * cfg.ANIMATION_PLATTER_TURNS * progress,
        )

    def _tip(self, motor: int, pen: tuple, arm_length: float, previous_tip: tuple) -> tuple:
        return crank_tip_for_pen(self.motor_xy[motor], pen, cfg.CRANK_RADIUS, arm_length, previous_tip)
