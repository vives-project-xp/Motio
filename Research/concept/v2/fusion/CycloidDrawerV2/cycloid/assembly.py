"""Puts the whole cycloid drawer together."""
import math

import adsk.core

from . import config as cfg
from .fusion.assembly_tools import AppearancePalette, new_component
from .geometry.involute import InvoluteGear
from .geometry.kinematics import FiveBarPose, mesh_rotation
from .parts.arm import ArmBuilder
from .parts.box import BoxBuilder
from .parts.gear import GearBuilder, GearFeatures
from .parts.hardware import HardwareBuilder


class PlacedGear:
    def __init__(self, name: str, teeth: int, svg_xy) -> None:
        self.name = name
        self.gear = InvoluteGear(teeth, cfg.MODULE, cfg.BACKLASH)
        self.xy = cfg.to_fusion_xy(*svg_xy)
        self.rotation = 0.0

    def point_at(self, radius: float, local_angle: float = 0.0):
        a = self.rotation + local_angle
        return (self.xy[0] + radius * math.cos(a), self.xy[1] + radius * math.sin(a))


class CycloidDrawerAssembly:
    def __init__(self, app: adsk.core.Application, design) -> None:
        self.palette = AppearancePalette(app, design)
        self.root = new_component(design.rootComponent, "Cycloid drawer")
        self.gears = [PlacedGear(*g) for g in cfg.GEARS]
        self.hardware = HardwareBuilder(new_component(self.root, "Hardware"), self.palette)
        self.pose = None

    # ------------------------------------------------------------------ public
    def build(self) -> str:
        self._phase_gears()
        BoxBuilder(self.root, self.palette).build([g.xy for g in self.gears])
        self._build_gears()
        self._build_axles()
        self._build_linkage()
        self._build_paper_and_pen()
        self._build_handle()
        return self._report()

    # --------------------------------------------------------------- gears
    def _phase_gears(self) -> None:
        table = self.gears[cfg.TURNTABLE]
        wanted = {cfg.LEFT: cfg.PIN_ANGLE_LEFT_DEG, cfg.RIGHT: cfg.PIN_ANGLE_RIGHT_DEG, cfg.CRANK: 0.0}
        for idx, deg in wanted.items():
            g = self.gears[idx]
            g.rotation = mesh_rotation(table.gear, table.rotation, table.xy, g.gear, g.xy, math.radians(deg))

    def _build_gears(self) -> None:
        builder = GearBuilder(new_component(self.root, "Gears"), self.palette)
        features = {cfg.TURNTABLE: GearFeatures(), cfg.LEFT: GearFeatures(pin_slots=True),
                    cfg.RIGHT: GearFeatures(pin_slots=True), cfg.CRANK: GearFeatures(handle_hole=True)}
        for idx, g in enumerate(self.gears):
            builder.build(g.name, g.gear, g.xy, g.rotation, features[idx])
            adsk.doEvents()

    def _build_axles(self) -> None:
        hw = self.hardware
        head_z = cfg.LID_TOP_Z - cfg.MATERIAL - cfg.HEAD_M10_H
        for idx, g in enumerate(self.gears):
            is_table = idx == cfg.TURNTABLE
            hw.bolt(g.xy, head_z, cfg.TURNTABLE_AXLE_TOP_Z if is_table else cfg.AXLE_TOP_Z)
            hw.nut(g.xy, cfg.LID_NUT_Z)
            hw.ptfe_washer(g.xy, cfg.LID_NUT_Z + cfg.NUT_M10_H)
            if not is_table:  # the turntable just rests on its washer: nothing may stick up
                hw.ptfe_washer(g.xy, cfg.GEAR_TOP_Z)
                hw.nut(g.xy, cfg.AXLE_LOCKNUT_Z)

    # ------------------------------------------------------------- linkage
    def _build_linkage(self) -> None:
        left, right = self.gears[cfg.LEFT], self.gears[cfg.RIGHT]
        pin_a, pin_b = left.point_at(cfg.PIN_RADIUS), right.point_at(cfg.PIN_RADIUS)
        holes = [cfg.ARM_FIRST_HOLE + i * cfg.ARM_HOLE_PITCH for i in range(cfg.ARM_HOLE_COUNT)]
        self.pose = FiveBarPose(pin_a, pin_b, holes, cfg.ARM_PEN_HOLE, self.gears[cfg.TURNTABLE].xy)

        arms = ArmBuilder(new_component(self.root, "Arms"), self.palette)
        arms.build("Pen arm A (left)", pin_a, self.pose.arm_angle_a(), cfg.ARM_A_Z)
        arms.build("Pen arm B (right)", pin_b, self.pose.arm_angle_b(), cfg.ARM_B_Z)

        hw = self.hardware
        for pin, arm_z in ((pin_a, cfg.ARM_A_Z), (pin_b, cfg.ARM_B_Z)):
            arm_top = arm_z + cfg.MATERIAL
            hw.bolt(pin, cfg.GEAR_Z - cfg.HEAD_M10_H, arm_top + cfg.NUT_M10_H)
            hw.nut(pin, cfg.GEAR_TOP_Z)
            hw.spacer(pin, cfg.GEAR_TOP_Z + cfg.NUT_M10_H, arm_z)
            hw.nut(pin, arm_top)
        joint, top = self.pose.joint, cfg.ARM_B_Z + cfg.MATERIAL
        hw.bolt(joint, cfg.ARM_A_Z - cfg.HEAD_M10_H, top + cfg.NUT_M10_H)
        hw.nut(joint, top)

    def _build_paper_and_pen(self) -> None:
        hw = self.hardware
        hw.ring("Paper Ø210", self.gears[cfg.TURNTABLE].xy, cfg.GEAR_TOP_Z,
                cfg.PAPER_DIAMETER, 0, cfg.PAPER_T, "paper")
        hw.ring("Pen", self.pose.pen, cfg.GEAR_TOP_Z + cfg.PAPER_T, cfg.PEN_D, 0, cfg.PEN_LENGTH, "pen")

    def _build_handle(self) -> None:
        crank = self.gears[cfg.CRANK]
        spot = crank.point_at(cfg.HANDLE_RADIUS)
        grip_z = cfg.GEAR_TOP_Z + 5.0
        hw = self.hardware
        hw.bolt(spot, cfg.GEAR_Z - 4.0, grip_z + cfg.HANDLE_GRIP_L + 5.0, size="M6")
        hw.nut(spot, cfg.GEAR_TOP_Z, size="M6")
        hw.ring("Handle grip", spot, grip_z, cfg.HANDLE_GRIP_D, 6.5, cfg.HANDLE_GRIP_L, "grip")
        hw.nut(spot, grip_z + cfg.HANDLE_GRIP_L, size="M6")

    # -------------------------------------------------------------- report
    def _report(self) -> str:
        p = self.pose
        idx = lambda pos: int(round((pos - cfg.ARM_FIRST_HOLE) / cfg.ARM_HOLE_PITCH)) + 1
        centre = self.gears[cfg.TURNTABLE].xy
        lines = [
            "Cycloid drawer assembly built.",
            "",
            f"Arms joined at hole {idx(p.hole_a)} (left arm) and hole {idx(p.hole_b)} (right arm),",
            f"counting from the pin end. Pen is {math.dist(p.pen, centre):.0f} mm from the turntable centre.",
            "",
            "Hardware:",
        ]
        lines += [f"  {n}x  {name}" for name, n in sorted(self.hardware.bill.items())
                  if name.startswith(("Bolt", "Nut", "PTFE", "Spacer"))]
        return "\n".join(lines)
