"""Plays the poses of a MotionPlan on the Fusion model."""
import adsk.core

from .. import config as cfg
from ..fusion import sketch_tools as st
from ..geometry.kinematics import direction
from .drive_joints import DriveJoints
from .pen_trace import PenTrace
from .pose import Pose

PROGRESS_EVERY = 10  # updating the dialog every frame costs time


class DrawerAnimator:
    def __init__(self, drives: DriveJoints, trace: PenTrace, motor_xy: list) -> None:
        self.drives = drives
        self.trace = trace
        self.motor_xy = motor_xy

    def play(self, poses: list, ui: adsk.core.UserInterface) -> bool:
        """Shows every pose; returns False when the user cancelled."""
        progress = ui.createProgressDialog()
        progress.isCancelButtonShown = True
        progress.show("Animation", "Frame %v of %m", 0, len(poses) - 1, 1)
        try:
            return self._play_all(poses, progress)
        finally:
            progress.hide()

    def _play_all(self, poses: list, progress) -> bool:
        for frame, pose in enumerate(poses):
            if progress.wasCancelled:
                return False
            self.show(pose)
            adsk.doEvents()
            if frame % PROGRESS_EVERY == 0:
                progress.progressValue = frame
        return True

    def show(self, pose: Pose) -> None:
        """The arms and the pen follow the cranks through their joints."""
        motor_a, motor_b, centre = (self.motor_xy[m] for m in (cfg.MOTOR_A, cfg.MOTOR_B, cfg.MOTOR_C))
        self.drives.crank_a.turn_to(direction(motor_a, pose.tip_a))
        self.drives.crank_b.turn_to(direction(motor_b, pose.tip_b))
        self.drives.platter.turn_to(pose.platter_angle)
        offset = (pose.pen_xy[0] - centre[0], pose.pen_xy[1] - centre[1])
        self.trace.extend_to(st.rotate_points([offset], -pose.platter_angle)[0])
