"""Puts the stepper-driven drawer together (static, in the home pose of SIMV7)."""
import math

import adsk.core
import adsk.fusion

from . import config as cfg
from .animation.animator import DrawerAnimator
from .animation.drive_joints import DriveJoints
from .animation.joint_drive import JointDrive
from .animation.joint_maker import JointMaker
from .animation.motion_plan import MotionPlan
from .animation.pen_trace import PenTrace
from .fusion import sketch_tools as st
from .fusion.assembly_tools import AppearancePalette, new_component, new_occurrence, placement
from .geometry.kinematics import crank_tip, direction, pen_position
from .parts.arm import BarBuilder
from .parts.box import BoxBuilder
from .parts.cylinder import SolidBuilder
from .parts.wedge import WedgeBuilder


# parts that move as one: what sits on a crank, the platter or arm A
RIGID_GROUPS = {
    "Rigid crank A": ["crank_a", "pin_a"],
    "Rigid crank B": ["crank_b", "pin_b", "crank_b_root"],
    "Rigid platter": ["platter", "paper"],
    "Rigid arm A": ["arm_a", "pen_axle", "pen"],
}


class DrawerAssembly:
    def __init__(self, app: adsk.core.Application, design) -> None:
        self.design = design
        self.palette = AppearancePalette(app, design)
        self.root = new_component(design.rootComponent, "Stepper drawer")
        self._moving = {}  # occurrences that move in the animation, by name
        self._box = None
        self.joints = None
        self.motor_xy = [cfg.to_fusion_xy(*xy) for _, xy in cfg.MOTORS]
        self.tip_a = crank_tip(self.motor_xy[cfg.MOTOR_A], cfg.CRANK_RADIUS, self._crank_angle(cfg.HOME_PHASE_A))
        self.tip_b = crank_tip(self.motor_xy[cfg.MOTOR_B], cfg.CRANK_RADIUS, self._crank_angle(cfg.HOME_PHASE_B))
        self.pen_xy = pen_position(self.tip_a, self.tip_b, cfg.ARM_LENGTH_A, cfg.ARM_LENGTH_B, -cfg.BRANCH)

    @staticmethod
    def _crank_angle(phase_degrees: float) -> float:
        """SIMV7 measures angles with y pointing down; Fusion has y pointing up."""
        return -math.radians(phase_degrees + cfg.MACHINE_ROTATION_DEGREES)

    # ------------------------------------------------------------------ public
    def build(self) -> str:
        self._box = BoxBuilder(self.root, self.palette).build(self._lid_holes())
        if cfg.INCLUDE_WEDGE:
            WedgeBuilder(self.root, self.palette).build()
        self._build_motors()
        self._build_hubs()
        self._build_cranks()
        self._build_arms()
        self._build_platter_paper_and_pen()
        self._build_pins()
        self._build_joints()
        return self._report()

    def _lid_holes(self) -> list:
        half = cfg.MOTOR_BOLT_PITCH / 2
        holes = []
        for x, y in self.motor_xy:
            holes.append((x, y, cfg.MOTOR_BOSS_HOLE))
            holes += [(x + dx, y + dy, cfg.MOTOR_BOLT_HOLE) for dx in (-half, half) for dy in (-half, half)]
        return holes

    # ---------------------------------------------------------------- motors
    def _build_motors(self) -> None:
        solids = SolidBuilder(new_component(self.root, "Motors"), self.palette)
        for (name, _), xy in zip(cfg.MOTORS, self.motor_xy):
            solids.block(f"{name} body", xy, cfg.FLANGE_Z - cfg.MOTOR_LENGTH, cfg.MOTOR_WIDTH, cfg.MOTOR_LENGTH, "motor")
            solids.ring(f"{name} boss", xy, cfg.FLANGE_Z, cfg.MOTOR_BOSS_D, 0, cfg.MOTOR_BOSS_H, "motor")
            solids.ring(f"{name} shaft", xy, cfg.FLANGE_Z, cfg.MOTOR_SHAFT_D, 0, cfg.MOTOR_SHAFT_L, "steel")

    def _build_hubs(self) -> None:
        solids = SolidBuilder(new_component(self.root, "Hubs"), self.palette)
        for (name, _), xy, z in zip(cfg.MOTORS, self.motor_xy, cfg.HUB_Z.values()):
            solids.ring(f"Hub {name}", xy, cfg.FLANGE_Z + z, cfg.HUB_D, cfg.MOTOR_SHAFT_D, cfg.HUB_H, "steel")

    # ---------------------------------------------------------- cranks & arms
    def _build_cranks(self) -> None:
        bars = BarBuilder(new_component(self.root, "Cranks"), self.palette)
        for motor, tip in ((cfg.MOTOR_A, self.tip_a), (cfg.MOTOR_B, self.tip_b)):
            xy = self.motor_xy[motor]
            self._moving[f"crank_{'ab'[motor]}"] = bars.build(
                f"Crank {'AB'[motor]}", xy, direction(xy, tip), cfg.FLANGE_Z + cfg.CRANK_Z[motor],
                cfg.CRANK_RADIUS, cfg.CRANK_WIDTH, cfg.CRANK_H, holes=[(0, cfg.CRANK_AXIS_HOLE)])
        solids = SolidBuilder(self.root, self.palette)
        self._moving["crank_b_root"] = solids.ring("Crank B root", self.motor_xy[cfg.MOTOR_B], cfg.FLANGE_Z + cfg.CRANK_B_ROOT_Z,
                    cfg.CRANK_B_ROOT_D, 0, cfg.CRANK_Z[cfg.MOTOR_B] - cfg.CRANK_B_ROOT_Z, "pla")

    def _build_arms(self) -> None:
        bars = BarBuilder(new_component(self.root, "Arms"), self.palette)
        self._moving["arm_a"] = bars.build(
            "Arm A", self.tip_a, direction(self.tip_a, self.pen_xy), cfg.FLANGE_Z + cfg.ARM_Z[cfg.MOTOR_A],
            cfg.ARM_LENGTH_A, cfg.ARM_WIDTH, cfg.ARM_H, holes=[(0, cfg.PIVOT_PIN_D)])
        self._moving["arm_b"] = bars.build(
            "Arm B", self.tip_b, direction(self.tip_b, self.pen_xy), cfg.FLANGE_Z + cfg.ARM_Z[cfg.MOTOR_B],
            cfg.ARM_LENGTH_B, cfg.ARM_WIDTH, cfg.ARM_H,
            holes=[(0, cfg.PIVOT_PIN_D), (cfg.ARM_LENGTH_B, cfg.ARM_B_END_HOLE)])

    # --------------------------------------------------- platter, paper, pen
    def _build_platter_paper_and_pen(self) -> None:
        centre = self.motor_xy[cfg.MOTOR_C]
        self._build_platter(centre)
        solids = SolidBuilder(self.root, self.palette)
        self._moving["paper"] = solids.ring("Paper", centre, cfg.FLANGE_Z + cfg.PAPER_Z, cfg.PLATTER_D, 0,
                                            cfg.PAPER_T, "paper")
        self._moving["pen_axle"] = solids.ring("Pen axle", self.pen_xy, cfg.FLANGE_Z + cfg.PEN_AXLE_Z,
                                               cfg.PEN_AXLE_D, cfg.PEN_AXLE_BORE, cfg.PEN_AXLE_L, "pla")
        self._moving["pen"] = solids.ring("Pen", self.pen_xy, cfg.FLANGE_Z + cfg.PAPER_Z + cfg.PAPER_T, cfg.PEN_D, 0,
                                          cfg.PEN_LENGTH, "pen")

    def _build_platter(self, centre) -> None:
        occ = new_occurrence(self.root, "Platter", placement(centre[0], centre[1], cfg.FLANGE_Z + cfg.PLATTER_Z))
        self._moving["platter"] = occ
        comp = occ.component
        sketch = st.new_sketch(comp)
        st.circle(sketch, 0, 0, cfg.PLATTER_D)
        st.circle(sketch, 0, 0, cfg.PLATTER_CENTRE_HOLE)
        for k in range(4):
            angle = math.pi / 2 * k
            st.circle(sketch, cfg.PLATTER_BOLT_RADIUS * math.cos(angle), cfg.PLATTER_BOLT_RADIUS * math.sin(angle),
                      cfg.PLATTER_BOLT_HOLE)
        self.palette.apply(st.extrude_sketch(comp, sketch, cfg.MATERIAL), "wood")

    # ---------------------------------------------------------- pins & joints
    def _build_pins(self) -> None:
        """Pins that hold each arm on its crank tip; without them the arms float above the cranks."""
        solids = SolidBuilder(self.root, self.palette)
        for motor, tip in ((cfg.MOTOR_A, self.tip_a), (cfg.MOTOR_B, self.tip_b)):
            bottom = cfg.FLANGE_Z + cfg.CRANK_Z[motor]
            top = cfg.FLANGE_Z + cfg.ARM_Z[motor] + cfg.ARM_H
            self._moving[f"pin_{'ab'[motor]}"] = solids.ring(
                f"Pin {'AB'[motor]}", tip, bottom, cfg.PIVOT_PIN_D, 0, top - bottom, "steel")

    def _build_joints(self) -> None:
        """Revolute joints (the arms close the loop) and rigid groups so that pins, pen and paper travel along."""
        part = lambda name: self._moving[name].component
        box = self._box
        self.joints = joints = JointMaker(self.design)
        joints.ground(box)
        joints.revolute("Axle A", part("crank_a"), box, (0, 0), cfg.CRANK_AXIS_HOLE)
        joints.revolute("Axle B", part("crank_b"), box, (0, 0), cfg.CRANK_AXIS_HOLE)
        joints.revolute("Axle platter", part("platter"), box, (0, 0), cfg.PLATTER_CENTRE_HOLE)
        joints.revolute("Pin A", part("arm_a"), part("crank_a"), (0, 0), cfg.PIVOT_PIN_D)
        joints.revolute("Pin B", part("arm_b"), part("crank_b"), (0, 0), cfg.PIVOT_PIN_D)
        joints.revolute("Pen joint", part("arm_b"), part("arm_a"), (cfg.ARM_LENGTH_B, 0), cfg.ARM_B_END_HOLE)
        for name, members in RIGID_GROUPS.items():
            joints.rigid_group(name, [part(member) for member in members])

    # ------------------------------------------------------------ animation
    def animate(self, app: adsk.core.Application) -> str:
        """Turns the cranks and the platter by script; Fusion's joints move the arms and the pen along."""
        if self.joints.problems:
            return "Animation not possible, joints that failed:\n" + "\n".join(self.joints.problems)
        drives = DriveJoints(
            crank_a=self._drive("Axle A", "crank_a"),
            crank_b=self._drive("Axle B", "crank_b"),
            platter=self._drive("Axle platter", "platter"))
        poses = MotionPlan(self.motor_xy, self.tip_a, self.tip_b).poses()
        animator = DrawerAnimator(drives, PenTrace(self._moving["paper"].component), self.motor_xy)
        return "Animation played." if animator.play(poses, app.userInterface) else "Animation cancelled."

    def _drive(self, joint: str, part: str) -> JointDrive:
        return JointDrive(self.joints.joints[joint], self._in_root_context(self._moving[part]))

    def _in_root_context(self, occurrence: adsk.fusion.Occurrence) -> adsk.fusion.Occurrence:
        return self.design.rootComponent.allOccurrencesByComponent(occurrence.component).item(0)

    # -------------------------------------------------------------- report
    def _report(self) -> str:
        centre = self.motor_xy[cfg.MOTOR_C]
        return "\n".join([
            "Stepper drawer assembly built (static, SIMV7 home pose).",
            "",
            f"Pen is {math.dist(self.pen_xy, centre):.0f} mm from the platter centre.",
            "Not modelled: bolts, nuts, washers, bearings, pen holder and pen clamp; see the SIMV7 bill of materials.",
            f"Joints made: {len(self.joints.joints)} of 6.",
            *[f"  NOT made - {problem}" for problem in self.joints.problems],
        ])
