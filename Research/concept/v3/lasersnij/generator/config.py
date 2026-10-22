"""All tweakable dimensions in one place (mm).

The drive is the one of MOTIO SIMV7 (Software/WARD-SIM/SIMV7): three stepper motors, mounted with their flange
against the underside of the lid, drive two cranks and the platter directly. Only the wood is 4 mm instead of 6 mm.
"""
import math

MATERIAL = 4.0

# Ward's minimum clearance between moving parts and anything else (SIMV7 "clearance")
CLEARANCE = 3.0

# SY42STH38-1684A: 42.3 x 42.3 mm flange, boss and shaft through the lid, four M3 holes on a 31 x 31 square
MOTOR_WIDTH = 42.3
MOTOR_BOSS_HOLE = 22.5
MOTOR_BOLT_HOLE = 3.6
MOTOR_BOLT_PITCH = 31.0

# Motor positions relative to each other: exactly SIMV7 (its plate is 358 x 404, positions from the back-left corner)
SIMV7_MOTOR_CENTRES = {"A": (280.0, 180.0), "B": (160.0, 100.0), "C": (150.0, 280.0)}
CRANK_RADIUS = 65.0      # motors A and B turn a crank of this length
CRANK_WIDTH = 24.0       # the crank is a rounded bar: its end reaches half a width beyond the radius
PLATTER_MOTOR = "C"      # the third motor turns the platter

# Platter (4 mm MDF) on the hub of motor C: Ø5.6 centre hole, four countersunk M3 on a Ø12.7 bolt circle
PLATTER_DIAMETER = 210.0
PLATTER_CENTRE_HOLE = 5.6
PLATTER_BOLT_HOLE = 3.4
PLATTER_BOLT_RADIUS = 6.35
DRAW_ZONE_DIAMETER = 190.0   # engraved: the pen may only work inside this circle


# ---- Lid size: as small as possible --------------------------------------------
# The three motors can be turned together over any angle: the mechanism does not care which way it points.
# This angle gives the smallest lid (searched in steps of 0.1 degrees; the front of the box is where the panel hangs).
MACHINE_ROTATION_DEGREES = 56.3

# The lid is the bounding box of everything that moves over it (platter, swept cranks) plus Ward's clearance
# on every side. The motors keep their SIMV7 distances; they only turn and move along with the smaller lid.
PLATTER_RADIUS = PLATTER_DIAMETER / 2
CRANK_SWEEP_RADIUS = CRANK_RADIUS + CRANK_WIDTH / 2


def _reach(name: str) -> float:
    return PLATTER_RADIUS if name == PLATTER_MOTOR else CRANK_SWEEP_RADIUS


def _rotated(x: float, y: float) -> tuple:
    a = math.radians(MACHINE_ROTATION_DEGREES)
    return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)


def _round_up(value: float) -> float:
    """Whole tenths of a millimetre, so the lid never comes out smaller than the envelope."""
    return math.ceil(value * 10 - 1e-9) / 10


_ROTATED = {n: _rotated(*xy) for n, xy in SIMV7_MOTOR_CENTRES.items()}
_LEFT = min(x - _reach(n) for n, (x, _) in _ROTATED.items())
_RIGHT = max(x + _reach(n) for n, (x, _) in _ROTATED.items())
_BACK = min(y - _reach(n) for n, (_, y) in _ROTATED.items())
_FRONT = max(y + _reach(n) for n, (_, y) in _ROTATED.items())

LID_WIDTH = _round_up(_RIGHT - _LEFT + 2 * CLEARANCE)
LID_DEPTH = _round_up(_FRONT - _BACK + 2 * CLEARANCE)
# the little slack left by the rounding is shared over both sides
_SHIFT_X = CLEARANCE + (LID_WIDTH - (_RIGHT - _LEFT + 2 * CLEARANCE)) / 2 - _LEFT
_SHIFT_Y = CLEARANCE + (LID_DEPTH - (_FRONT - _BACK + 2 * CLEARANCE)) / 2 - _BACK
MOTOR_CENTRES = {n: (x + _SHIFT_X, y + _SHIFT_Y) for n, (x, y) in _ROTATED.items()}
