"""Pick the document writer from the file extension (.svg or .dxf)."""
import os

from .dxf_document import DxfDocument
from .svg_document import SvgDocument

WRITERS = {".svg": SvgDocument, ".dxf": DxfDocument}


def new_document(path: str, width: float, height: float):
    return WRITERS[os.path.splitext(path)[1].lower()](width, height)
