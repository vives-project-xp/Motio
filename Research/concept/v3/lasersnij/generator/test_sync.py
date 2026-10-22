"""Checks that the laser generator and the Fusion script describe the same box. Start: python -m unittest"""
import importlib
import sys
import unittest
from pathlib import Path

FUSION_DIR = Path(__file__).resolve().parents[2] / "fusion" / "CycloidDrawerV3"


def loadFusionConfig():
    sys.path.insert(0, str(FUSION_DIR))
    try:
        return importlib.import_module("cycloid.config")
    finally:
        sys.path.remove(str(FUSION_DIR))


class TestLaserEnFusionGelijk(unittest.TestCase):
    def setUp(self):
        import config as laser
        self.laser = laser
        self.fusion = loadFusionConfig()

    def test_kastmaten_zijn_gelijk(self):
        self.assertAlmostEqual(self.fusion.BOX_WIDTH, self.laser.LID_WIDTH, places=2)
        self.assertAlmostEqual(self.fusion.BOX_DEPTH, self.laser.LID_DEPTH, places=2)
        self.assertEqual(self.fusion.MACHINE_ROTATION_DEGREES, self.laser.MACHINE_ROTATION_DEGREES)

    def test_motorposities_zijn_gelijk(self):
        fusion = {name: xy for name, xy in self.fusion.MOTORS}
        for letter, xy in self.laser.MOTOR_CENTRES.items():
            naam = next(n for n in fusion if n.startswith(f"Motor {letter}"))
            self.assertAlmostEqual(fusion[naam][0], xy[0], places=2)
            self.assertAlmostEqual(fusion[naam][1], xy[1], places=2)


if __name__ == "__main__":
    unittest.main()
