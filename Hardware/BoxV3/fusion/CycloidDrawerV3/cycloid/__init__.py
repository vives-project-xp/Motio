"""Fusion script package. Puts the box design shared with the laser generator (BoxV3/box_design) on the import path."""
import sys
from pathlib import Path

SHARED_DIR = str(Path(__file__).resolve().parents[3])
if SHARED_DIR not in sys.path:
    sys.path.append(SHARED_DIR)
