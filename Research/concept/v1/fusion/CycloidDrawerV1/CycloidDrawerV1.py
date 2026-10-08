"""Fusion 360 script: builds the cycloid drawer as a 3D assembly in a new design.

Run via Utilities > Add-Ins > Scripts and Add-Ins > (+) > Script from my computer,
pick this folder (CycloidDrawerV1), then Run. Dimensions live in cycloid/config.py.
"""
import os
import sys
import traceback

import adsk.core
import adsk.fusion

HERE = os.path.dirname(os.path.realpath(__file__))


def _use_own_package_path():
    """v1 and v2 both have a 'cycloid' package: make sure this script's copy wins."""
    while HERE in sys.path:
        sys.path.remove(HERE)
    sys.path.insert(0, HERE)


def _fresh_import():
    """Drop cached modules so edits in config.py are picked up on every run."""
    _use_own_package_path()
    for name in [m for m in sys.modules if m == "cycloid" or m.startswith("cycloid.")]:
        del sys.modules[name]
    from cycloid.assembly import CycloidDrawerAssembly
    return CycloidDrawerAssembly


def run(context):
    app = adsk.core.Application.get()
    ui = app.userInterface
    try:
        assembly_cls = _fresh_import()
        app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
        design = adsk.fusion.Design.cast(app.activeProduct)
        design.designType = adsk.fusion.DesignTypes.ParametricDesignType
        report = assembly_cls(app, design).build()
        app.activeViewport.fit()
        ui.messageBox(report, "Cycloid drawer v1")
    except Exception:
        ui.messageBox("Failed:\n{}".format(traceback.format_exc()), "Cycloid drawer v1")
