"""The three joints that drive the animation: both cranks and the platter."""
from dataclasses import dataclass

from .joint_drive import JointDrive


@dataclass(frozen=True)
class DriveJoints:
    crank_a: JointDrive
    crank_b: JointDrive
    platter: JointDrive
