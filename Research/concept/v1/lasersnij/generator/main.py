"""Generates all laser files for the cycloid drawer.

Usage: python main.py <output folder>
Writes every sheet as .svg and as .dxf (dxf/ subfolder).
"""
import os
import sys

import config as cfg
from export.formats import WRITERS, new_document
from geometry import shapes
from layout.machine_layout import MachineLayout
from parts.arm_part import build_arms
from parts.gear_part import build_gear_parts
from parts.box_part import BoxSheet

GAP = 8.0


def write_gears(parts, path: str) -> None:
    big, *small = parts
    col_x = GAP + big.size + GAP + max(p.size for p in small) / 2
    height = max(big.size, sum(p.size + GAP for p in small)) + 2 * GAP
    doc = new_document(path, col_x + max(p.size for p in small) / 2 + GAP, height)
    big.draw(doc, GAP + big.size / 2, GAP + big.size / 2)
    y = GAP
    for part in small:
        part.draw(doc, col_x, y + part.size / 2)
        y += part.size + GAP
    doc.save(path)


def write_arms(arms, path: str) -> None:
    pitch = 26.0 + 2 * GAP
    doc = new_document(path, max(a.length for a in arms) + 2 * GAP, len(arms) * pitch + GAP)
    for i, arm in enumerate(arms):
        arm.draw(doc, GAP, GAP + 6 + i * pitch)
    doc.save(path)


def write_assembly_preview(layout, parts, path: str) -> None:
    doc = new_document(path, cfg.LID_WIDTH, cfg.LID_DEPTH)
    doc.engrave(f"M 0 0 L {cfg.LID_WIDTH} 0 L {cfg.LID_WIDTH} {cfg.LID_DEPTH} L 0 {cfg.LID_DEPTH} Z")
    for placed, part in zip(layout.gears, parts):
        part.draw(doc, placed.x, placed.y)
    doc.save(path)


def main(out_dir: str) -> None:
    layout = MachineLayout()
    problems = layout.validate()
    if problems:
        sys.exit("Layout does not fit:\n- " + "\n- ".join(problems))
    os.makedirs(out_dir, exist_ok=True)
    parts = build_gear_parts(layout)

    for ext in WRITERS:
        folder = out_dir if ext == ".svg" else os.path.join(out_dir, "dxf")
        os.makedirs(folder, exist_ok=True)
        name = lambda base: os.path.join(folder, base + ext)
        BoxSheet(layout).save(name("1_doos_met_asgaten"))
        write_gears(parts, name("2_tandwielen"))
        write_arms(build_arms(), name("3_armen"))
        write_assembly_preview(layout, parts, name("montage_bovenaanzicht"))

    for p in layout.gears:
        print(f"{p.name:10s} z={p.gear.teeth:3d}  Ø{2 * p.gear.pitch_radius:.0f}  "
              f"centre on lid ({p.x:.1f}, {p.y:.1f}) mm")


if __name__ == "__main__":
    main(sys.argv[1])
