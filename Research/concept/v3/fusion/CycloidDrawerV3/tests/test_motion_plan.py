import math
import unittest

from cycloid import config as cfg
from cycloid.animation.motion_plan import MotionPlan
from cycloid.geometry.kinematics import crank_tip

MAX_TIP_STEP = 10.0  # mm between two frames; a bigger jump means a crank flipped to its other branch


def _home_tip(motor: int, phase: float) -> tuple:
    angle = -math.radians(phase + cfg.MACHINE_ROTATION_DEGREES)
    return crank_tip(_motor_xy()[motor], cfg.CRANK_RADIUS, angle)


def _motor_xy() -> list:
    return [cfg.to_fusion_xy(*xy) for _, xy in cfg.MOTORS]


class MotionPlanTest(unittest.TestCase):
    def setUp(self):
        self.poses = MotionPlan(_motor_xy(), _home_tip(cfg.MOTOR_A, cfg.HOME_PHASE_A),
                                _home_tip(cfg.MOTOR_B, cfg.HOME_PHASE_B)).poses()

    def test_one_pose_per_frame_plus_the_home_pose(self):
        self.assertEqual(len(self.poses), cfg.ANIMATION_FRAMES + 1)

    def test_starts_in_the_home_pose(self):
        first = self.poses[0]
        self.assertLess(math.dist(first.tip_a, _home_tip(cfg.MOTOR_A, cfg.HOME_PHASE_A)), 0.01)
        self.assertLess(math.dist(first.tip_b, _home_tip(cfg.MOTOR_B, cfg.HOME_PHASE_B)), 0.01)

    def test_arms_keep_their_length(self):
        for pose in self.poses:
            self.assertAlmostEqual(math.dist(pose.tip_a, pose.pen_xy), cfg.ARM_LENGTH_A, places=6)
            self.assertAlmostEqual(math.dist(pose.tip_b, pose.pen_xy), cfg.ARM_LENGTH_B, places=6)

    def test_cranks_never_flip_branch(self):
        for before, after in zip(self.poses, self.poses[1:]):
            self.assertLess(math.dist(before.tip_a, after.tip_a), MAX_TIP_STEP)
            self.assertLess(math.dist(before.tip_b, after.tip_b), MAX_TIP_STEP)

    def test_pen_stays_on_the_paper(self):
        centre = _motor_xy()[cfg.MOTOR_C]
        for pose in self.poses:
            self.assertLessEqual(math.dist(pose.pen_xy, centre), cfg.PLATTER_D / 2)

    def test_rose_closes_after_whole_platter_turns(self):
        last = self.poses[-1]
        centre = _motor_xy()[cfg.MOTOR_C]
        self.assertAlmostEqual(math.dist(last.pen_xy, centre), cfg.ROSE_MEAN_RADIUS + cfg.ROSE_AMPLITUDE)
        self.assertAlmostEqual(last.platter_angle % (2 * math.pi), 0)


if __name__ == "__main__":
    unittest.main()
