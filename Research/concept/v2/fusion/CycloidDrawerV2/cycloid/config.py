"""All dimensions in mm (converted to cm only when talking to Fusion).

Kept in sync with the laser generator (lasersnij/generator/config.py).
Fusion frame: X = box width (left -> right), Y = box depth (front -> back), Z = up.
"""

# ---- Material & box -------------------------------------------------------
from .box_design.spec import BoxSpec  # noqa: E402

MATERIAL = 4.0
BOX_WIDTH = 358.0
BOX_DEPTH = 408.0
# Two stacked compartments; heights, collar and finger size live in BoxSpec
BOX_SPEC = BoxSpec(width=BOX_WIDTH, depth=BOX_DEPTH, thickness=MATERIAL)
BOX_HEIGHT = BOX_SPEC.top_z
LID_TOP_Z = BOX_HEIGHT

# ---- Gears (same as laser files) ----------------------------------------
MODULE = 3.0
BACKLASH = 0.15
M10_HOLE = 10.5
HANDLE_HOLE = 6.5
HANDLE_RADIUS = 17.0

# name, teeth, centre (x, y) in the *laser/SVG* frame (y measured from the back edge)
GEARS = [
    ("Turntable z100", 100, (179.0, 240.0)),
    ("Left gear z32", 32, (69.0, 75.4)),
    ("Right gear z30", 30, (289.0, 79.0)),
    ("Crank gear z20", 20, (321.0, 350.6)),
]
TURNTABLE, LEFT, RIGHT, CRANK = range(4)
PIN_SLOT_MIN_RADIUS = 20.0

# ---- Stack heights (Z, mm) -----------------------------------------------
NUT_M10_AF, NUT_M10_H = 17.0, 8.0
HEAD_M10_AF, HEAD_M10_H = 16.0, 6.4
WASHER_PTFE_D, WASHER_PTFE_T = 22.0, 1.5
LID_NUT_Z = LID_TOP_Z                         # nut on top of the lid
GEAR_Z = LID_NUT_Z + NUT_M10_H + WASHER_PTFE_T  # underside of every gear
GEAR_TOP_Z = GEAR_Z + MATERIAL
AXLE_LOCKNUT_Z = GEAR_TOP_Z + WASHER_PTFE_T
AXLE_TOP_Z = AXLE_LOCKNUT_Z + NUT_M10_H + 2.0
TURNTABLE_AXLE_TOP_Z = GEAR_TOP_Z - 1.0       # must stay below the paper

# ---- Linkage (classic setup: one pen arm per gear pin) ---------------------
PIN_RADIUS = 28.0
PIN_ANGLE_LEFT_DEG = -45.0    # desired pin direction (snapped to the tooth mesh)
PIN_ANGLE_RIGHT_DEG = 225.0
ARM_LENGTH, ARM_WIDTH = 260.0, 26.0
ARM_FIRST_HOLE, ARM_HOLE_PITCH, ARM_HOLE_COUNT = 13.0, 20.0, 11
ARM_PEN_HOLE = 245.0
PEN_HOLE = 12.0
ARM_A_Z = AXLE_TOP_Z + 2.0            # left arm, clears the axle nuts
ARM_B_Z = ARM_A_Z + MATERIAL          # right arm sits on top of the left arm
SPACER_D = 16.0

# ---- Paper & pen ------------------------------------------------------------
PAPER_DIAMETER = 210.0
PAPER_T = 0.2
PEN_D, PEN_LENGTH = 10.0, 140.0

# ---- Crank handle -------------------------------------------------------------
HANDLE_GRIP_D, HANDLE_GRIP_L = 20.0, 40.0


def to_fusion_xy(svg_x: float, svg_y: float) -> tuple:
    """Laser/SVG frame (y down from the back) -> Fusion frame (y up from the front)."""
    return svg_x, BOX_DEPTH - svg_y
