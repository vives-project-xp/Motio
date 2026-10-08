"""All tweakable dimensions in one place (mm)."""

MODULE = 3.0
MATERIAL = 4.0
M10_HOLE = 10.5          # clearance for an M10 bolt
PEN_HOLE = 12.0
HANDLE_HOLE = 6.5         # M6 crank handle (an M10 nut would hit the axle nut)
HANDLE_RADIUS = 17.0
PIN_SLOT_MIN_RADIUS = 20.0  # closer than this, the pin nut hits the axle nut

# Lid = "top" panel of the existing box SVG (outer size incl. finger joints)
LID_WIDTH = 358.0
LID_DEPTH = 408.0
LID_ORIGIN_IN_BOX_SVG = (772.0, 411.0)
LID_EDGE_MARGIN = 4.0    # keep gears clear of the wall thickness

# Teeth count per gear
TURNTABLE_TEETH = 100    # Ø300 pitch circle, carries the paper
LEFT_TEETH = 32
RIGHT_TEETH = 30         # different from the left one -> more varied patterns
CRANK_TEETH = 20

TURNTABLE_CENTRE = (179.0, 240.0)
SIDE_GEAR_DX = 110.0     # horizontal offset of the two top gears from the centre
CRANK_DX = 142.0         # horizontal offset of the crank gear (lower right)

# Paper guides (cut from A4: max 210 wide)
PAPER_CIRCLE = 210.0
PAPER_SQUARE = 200.0
