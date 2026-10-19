"""Script-driven animation of the working.

Fusion's API cannot create motion links, so the gears are turned by hand every frame: the crank
turns, the other gears follow by their tooth ratios (meshing gears turn in opposite directions)
and the pen arms follow the gears through their joints.
"""
import math
import os

import adsk

from .. import config as cfg

FRAME_SIZE = (1280, 720)
# number of gear meshes between the crank and each gear: every mesh reverses the direction
MESH_STEPS = {cfg.CRANK: 0, cfg.TURNTABLE: 1, cfg.LEFT: 2, cfg.RIGHT: 2}


class CrankAnimation:
    def __init__(self, joints: dict, gears: list, viewport) -> None:
        self.joints = joints      # joint name -> joint, from JointMaker
        self.gears = gears
        self.viewport = viewport

    def play(self) -> str:
        frames = cfg.ANIMATION_FRAMES
        try:
            for frame in range(frames + 1):
                self._pose(2 * math.pi * cfg.ANIMATION_CRANK_TURNS * frame / frames)
                adsk.doEvents()
                self._save_frame(frame)
            self._pose(0.0)
        except Exception as exc:
            return f"Animation stopped: {exc}"
        return f"Animation played: {cfg.ANIMATION_CRANK_TURNS} crank turns in {frames} frames."

    def _pose(self, crank_angle: float) -> None:
        for index, angle in self._gear_angles(crank_angle).items():
            self.joints[f"Axle {self.gears[index].name}"].jointMotion.rotationValue = angle

    def _gear_angles(self, crank_angle: float) -> dict:
        crank_teeth = self.gears[cfg.CRANK].gear.teeth
        return {index: (-1) ** MESH_STEPS[index] * crank_angle * crank_teeth / gear.gear.teeth
                for index, gear in enumerate(self.gears)}

    def _save_frame(self, frame: int) -> None:
        if not cfg.ANIMATION_FRAMES_DIR:
            return
        os.makedirs(cfg.ANIMATION_FRAMES_DIR, exist_ok=True)
        path = os.path.join(cfg.ANIMATION_FRAMES_DIR, f"frame_{frame:04d}.png")
        self.viewport.saveAsImageFile(path, *FRAME_SIZE)
