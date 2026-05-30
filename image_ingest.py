"""Image ingestion for the knowledge base.

Turns an image (JPEG / PNG / HEIC / etc.) into text so it can be chunked and
embedded like any other document. We use a vision-capable Claude model to
transcribe ALL visible text (tables, labels, screenshots, diagrams) and add a
short factual description of non-text visual content.

HEIC/HEIF and other formats are normalised to JPEG via Pillow before being
sent to the model (Claude accepts jpeg/png/gif/webp, not heic).

Public API:
- is_image(filename) -> bool
- extract(path, filename=None) -> {"text", "extractor", "confidence", "modality"}
"""

from __future__ import annotations

import io
import os
import base64

from dotenv import load_dotenv

load_dotenv()

IMAGE_EXTS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".heic",
    ".heif",
    ".webp",
    ".gif",
    ".bmp",
    ".tif",
    ".tiff",
}

VISION_MODEL = os.getenv("VISION_MODEL", "claude-sonnet-4-6")

_PROMPT = (
    "You are extracting knowledge from an image for SIX, a financial "
    "regulatory-data company's knowledge base.\n"
    "1. Transcribe ALL text visible in the image VERBATIM - including tables, "
    "labels, headers, footnotes, and text inside diagrams or screenshots. "
    "Preserve table structure with simple pipe-separated rows.\n"
    "2. After the transcription, add a short, factual description of any "
    "charts, diagrams, logos, or photos (what they show, not interpretation).\n"
    "Do NOT invent or infer content that is not visible. If the image has no "
    "meaningful text or content, reply with exactly: NO_CONTENT"
)


def is_image(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTS


def _to_jpeg_b64(path: str) -> str:
    """Open any supported image (incl. HEIC) and return base64 JPEG bytes."""
    from PIL import Image

    try:
        # Enables HEIC/HEIF support if pillow-heif is installed.
        from pillow_heif import register_heif_opener

        register_heif_opener()
    except Exception:
        pass

    with Image.open(path) as img:
        img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def extract(path: str, filename: str | None = None) -> dict:
    """Vision OCR + description. Returns text + extractor metadata."""
    filename = filename or os.path.basename(path)
    result = {
        "text": "",
        "extractor": f"claude-vision:{VISION_MODEL}",
        "confidence": 0.0,
        "modality": "image",
    }

    try:
        b64 = _to_jpeg_b64(path)
    except Exception:
        return result

    try:
        from langchain_anthropic import ChatAnthropic
        from langchain_core.messages import HumanMessage

        llm = ChatAnthropic(model=VISION_MODEL, temperature=0, max_tokens=4000)
        message = HumanMessage(
            content=[
                {"type": "text", "text": _PROMPT},
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": b64,
                    },
                },
            ]
        )
        resp = llm.invoke([message])
        text = (resp.content if isinstance(resp.content, str) else str(resp.content)).strip()
    except Exception:
        return result

    if not text or text.strip().upper() == "NO_CONTENT":
        return result

    result["text"] = text
    # Vision OCR is generally reliable; we have no per-token score, so use a
    # fixed high-but-not-certain confidence when content was returned.
    result["confidence"] = 0.8
    return result
