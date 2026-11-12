"""Generates all laser files for the stepper-driven drawer (MOTIO SIMV7 drive in a 4 mm MDF box).

Usage: python main.py <output folder>
"""
import os
import sys

import config as cfg
from export import dxf_document
from export.svg_document import SvgDocument
from geometry import shapes
from layout.machine_layout import MachineLayout
from parts.box_part import BoxSheet
from parts.platter_part import PlatterPart

GAP = 8.0


def write_platter(path: str) -> None:
    part = PlatterPart()
    doc = SvgDocument(part.size + 2 * GAP, part.size + 2 * GAP + 12)
    part.draw(doc, GAP + part.size / 2, GAP + part.size / 2)
    doc.save(path)
    dxf_document.save(doc, path.replace(".svg", ".dxf"))


def write_assembly_preview(layout: MachineLayout, path: str) -> None:
    """Top view of the lid: motor holes, crank circles and the platter. Engraved only, nothing here is cut."""
    doc = SvgDocument(cfg.LID_WIDTH, cfg.LID_DEPTH)
    doc.engrave(f"M 0 0 L {cfg.LID_WIDTH} 0 L {cfg.LID_WIDTH} {cfg.LID_DEPTH} L 0 {cfg.LID_DEPTH} Z")
    for motor in layout.motors:
        for x, y, diameter in motor.lid_holes():
            doc.engrave(shapes.circle_path(x, y, diameter / 2))
        if motor.name != cfg.PLATTER_MOTOR:
            doc.engrave(shapes.circle_path(motor.x, motor.y, cfg.CRANK_RADIUS))
        doc.label(motor.x, motor.y + cfg.MOTOR_WIDTH, f"motor {motor.name}")
    platter = layout.platter_motor
    doc.engrave(shapes.circle_path(platter.x, platter.y, cfg.PLATTER_DIAMETER / 2))
    doc.save(path)


def main(out_dir: str) -> None:
    layout = MachineLayout()
    problems = layout.validate()
    if problems:
        sys.exit("Layout does not fit:\n- " + "\n- ".join(problems))
    os.makedirs(out_dir, exist_ok=True)

    BoxSheet(layout).save(os.path.join(out_dir, "1_doos_met_motorgaten.svg"))
    write_platter(os.path.join(out_dir, "2_plateau.svg"))
    write_assembly_preview(layout, os.path.join(out_dir, "montage_bovenaanzicht.svg"))

    for motor in layout.motors:
        print(f"motor {motor.name}: centre on lid ({motor.x:.1f}, {motor.y:.1f}) mm from the back-left corner")


if __name__ == "__main__":
    main(sys.argv[1])
