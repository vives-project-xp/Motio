"""All dimensions in mm (converted to cm only when talking to Fusion).

The drive is the one of MOTIO SIMV7 (Software/WARD-SIM/SIMV7): three stepper motors with their flange against the
underside of the lid. All heights below count from that flange plane (SIMV7 DESIGN.md). Only the wood is 4 mm.
Kept in sync with the laser generator (lasersnij/generator/config.py).
Fusion frame: X = box width (left -> right), Y = box depth (front -> back), Z = up.
"""

# ---- Material & box -------------------------------------------------------
from .box_design.spec import BoxSpec  # noqa: E402

MATERIAL = 4.0
# As small as possible: the lid is the bounding box of the platter and the swept cranks plus 3 mm, with the whole
# machine turned over MACHINE_ROTATION_DEGREES (see the laser generator config); a test checks both configs agree
BOX_WIDTH = 343.4
BOX_DEPTH = 304.3
# Two stacked compartments; heights and finger size live in BoxSpec
BOX_SPEC = BoxSpec(width=BOX_WIDTH, depth=BOX_DEPTH, thickness=MATERIAL)
BOX_HEIGHT = BOX_SPEC.top_z
FLANGE_Z = BOX_SPEC.lid_z       # underside of the lid: the motor flanges sit here

# Control-panel wedge (Hardware/Bedieningspaneel) in front of the box
INCLUDE_WEDGE = True

# ---- Motors (SY42STH38-1684A) ----------------------------------------------
MOTOR_WIDTH, MOTOR_LENGTH = 42.3, 38.0
MOTOR_BOSS_D, MOTOR_BOSS_H = 22.0, 4.5
MOTOR_SHAFT_D, MOTOR_SHAFT_L = 5.0, 24.0
MOTOR_BOSS_HOLE = 22.5
MOTOR_BOLT_HOLE = 3.6
MOTOR_BOLT_PITCH = 31.0

# name, centre (x, y) in the *laser/SVG* frame (y measured from the back edge); SIMV7 distances, turned and moved onto the smaller lid
MOTORS = [
    ("Motor A", (263.363, 224.261)),
    ("Motor B", (263.338, 80.039)),
    ("Motor C (platter)", (108.037, 171.591)),
]
MOTOR_A, MOTOR_B, MOTOR_C = range(3)

# ---- Hubs, cranks, arms (heights above the flange plane) ----------------------
HUB_D, HUB_H = 19.0, 5.0
HUB_Z = {MOTOR_A: 13.0, MOTOR_B: 18.0, MOTOR_C: 17.0}   # C is 2 mm higher than in SIMV7: its platter is 4 mm, not 6
CRANK_RADIUS = 65.0
CRANK_WIDTH, CRANK_H = 24.0, 6.0
CRANK_Z = {MOTOR_A: 18.0, MOTOR_B: 27.0}
CRANK_B_ROOT_D, CRANK_B_ROOT_Z = 28.0, 23.0              # boss under the main crank B
ARM_LENGTH_A, ARM_LENGTH_B = 180.0, 160.0
ARM_WIDTH, ARM_H = 24.0, 16.0
ARM_Z = {MOTOR_A: 36.0, MOTOR_B: 57.0}

# Home pose of SIMV7 (phases in degrees) and its assembly branch; the cranks turn along with the machine
MACHINE_ROTATION_DEGREES = 56.3
HOME_PHASE_A, HOME_PHASE_B = 49.0031578912355, 154.84031330144893
BRANCH = -1

# ---- Platter, paper, pen ----------------------------------------------------
PLATTER_D, PLATTER_Z = 210.0, 22.0       # on the hub of motor C: z = 22 ... 26
PLATTER_CENTRE_HOLE = 5.6
PLATTER_BOLT_HOLE = 3.4
PLATTER_BOLT_RADIUS = 6.35
PAPER_Z, PAPER_T = PLATTER_Z + MATERIAL, 0.2
PEN_AXLE_D, PEN_AXLE_BORE, PEN_AXLE_L, PEN_AXLE_Z = 19.9, 13.0, 50.0, 35.5
PEN_D, PEN_LENGTH = 10.0, 110.0


# ---- Joints: pins and holes the animation turns about ------------------------------
PIVOT_PIN_D = 8.0                    # pin between a crank tip and its arm
CRANK_AXIS_HOLE = MOTOR_SHAFT_D      # the motor shaft goes through the crank
ARM_B_END_HOLE = PEN_AXLE_D          # arm B turns about the pen axle, which sits on arm A

# ---- Animation (rose pattern drawn while the platter turns) -------------------
# The pen moves along a line from the platter centre pointing along +Y (Fusion) while the platter turns, so the
# pen radius at each platter angle is the radius of the rose. Every pen position must stay reachable by both arms.
ANIMATION_FRAMES = 480                    # 16 s at 30 fps
ANIMATION_PLATTER_TURNS = 2
ROSE_MEAN_RADIUS, ROSE_AMPLITUDE = 62.0, 36.0       # mm; mean + amplitude must stay inside the paper (radius 105)
ROSE_PETALS_PER_TURN = 2.5                # x ANIMATION_PLATTER_TURNS must be a whole number, or the rose does not close
ROSE_GROW_FRACTION = 0.1                  # first part of the animation in which the rose grows out of the centre


def to_fusion_xy(svg_x: float, svg_y: float) -> tuple:
    """Laser/SVG frame (y down from the back) -> Fusion frame (y up from the front)."""
    return svg_x, BOX_DEPTH - svg_y
