"""Audio / video transcription for ingestion.

Hybrid strategy: transcribe locally with faster-whisper first. If the local
transcript is empty or low-confidence AND a cloud backend is configured,
re-transcribe with the cloud service for higher quality. If no cloud backend
is configured, the local result is used as-is.

Public API:
- is_media(filename) -> bool
- transcribe(path) -> {"text", "segments", "confidence", "extractor", "modality"}
"""

from __future__ import annotations

import os
import math

from dotenv import load_dotenv

load_dotenv()

AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm"}
MEDIA_EXTS = AUDIO_EXTS | VIDEO_EXTS

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
try:
    MIN_CONF = float(os.getenv("TRANSCRIBE_MIN_CONF", "0.5"))
except ValueError:
    MIN_CONF = 0.5


def is_media(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in MEDIA_EXTS


def modality_of(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext in VIDEO_EXTS:
        return "video"
    if ext in AUDIO_EXTS:
        return "audio"
    return "document"


# --------------------------------------------------------------------------
# Local transcription (faster-whisper)
# --------------------------------------------------------------------------
_model = None


def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        # int8 keeps it fast on CPU; downloads weights on first use.
        _model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    return _model


def _logprob_to_conf(avg_logprob: float) -> float:
    """Map a whisper avg_logprob (roughly -1..0) to a 0..1 confidence."""
    try:
        return max(0.0, min(1.0, math.exp(avg_logprob)))
    except (OverflowError, ValueError):
        return 0.0


def _local_transcribe(path: str) -> dict:
    model = _get_model()
    seg_iter, _info = model.transcribe(path, vad_filter=True)

    segments = []
    confs = []
    for s in seg_iter:
        text = (s.text or "").strip()
        if not text:
            continue
        segments.append({"start": float(s.start), "end": float(s.end), "text": text})
        # Penalise likely-silence segments.
        conf = _logprob_to_conf(getattr(s, "avg_logprob", -1.0))
        no_speech = getattr(s, "no_speech_prob", 0.0) or 0.0
        confs.append(conf * (1.0 - min(1.0, no_speech)))

    confidence = sum(confs) / len(confs) if confs else 0.0
    text = " ".join(s["text"] for s in segments).strip()
    return {
        "text": text,
        "segments": segments,
        "confidence": confidence,
        "extractor": f"faster-whisper:{WHISPER_MODEL}",
    }


# --------------------------------------------------------------------------
# Cloud escalation (optional, pluggable)
# --------------------------------------------------------------------------
def _cloud_transcribe(path: str) -> dict | None:
    """Best-effort cloud transcription. Returns None if no backend configured."""
    if os.getenv("OPENAI_API_KEY"):
        result = _openai_transcribe(path)
        if result:
            return result
    if os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("TRANSCRIBE_S3_BUCKET"):
        result = _aws_transcribe(path)
        if result:
            return result
    return None


def _openai_transcribe(path: str) -> dict | None:
    try:
        from openai import OpenAI

        client = OpenAI()
        with open(path, "rb") as f:
            resp = client.audio.transcriptions.create(
                model=os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1"),
                file=f,
                response_format="verbose_json",
            )
        data = resp.model_dump() if hasattr(resp, "model_dump") else dict(resp)
        raw_segments = data.get("segments") or []
        segments = [
            {
                "start": float(s.get("start", 0.0)),
                "end": float(s.get("end", 0.0)),
                "text": (s.get("text") or "").strip(),
            }
            for s in raw_segments
            if (s.get("text") or "").strip()
        ]
        text = (data.get("text") or "").strip()
        if not text:
            return None
        return {
            "text": text,
            "segments": segments,
            "confidence": 0.9,  # managed service assumed high-quality
            "extractor": "openai:" + os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1"),
        }
    except Exception:
        return None


def _aws_transcribe(path: str) -> dict | None:
    """AWS Transcribe is async (S3 + job). Kept minimal and best-effort."""
    try:
        import time
        import json
        import uuid
        import urllib.request

        import boto3

        bucket = os.environ["TRANSCRIBE_S3_BUCKET"]
        region = os.getenv("AWS_REGION", "eu-central-1")
        s3 = boto3.client("s3", region_name=region)
        transcribe = boto3.client("transcribe", region_name=region)

        key = f"company-brain/{uuid.uuid4()}{os.path.splitext(path)[1].lower()}"
        s3.upload_file(path, bucket, key)

        job = f"cb-{uuid.uuid4()}"
        transcribe.start_transcription_job(
            TranscriptionJobName=job,
            Media={"MediaFileUri": f"s3://{bucket}/{key}"},
            IdentifyLanguage=True,
        )
        for _ in range(120):  # up to ~10 min
            status = transcribe.get_transcription_job(TranscriptionJobName=job)
            state = status["TranscriptionJob"]["TranscriptionJobStatus"]
            if state in ("COMPLETED", "FAILED"):
                break
            time.sleep(5)
        if state != "COMPLETED":
            return None

        uri = status["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
        with urllib.request.urlopen(uri) as r:
            payload = json.loads(r.read())
        text = payload["results"]["transcripts"][0]["transcript"].strip()
        if not text:
            return None
        return {
            "text": text,
            "segments": [],
            "confidence": 0.9,
            "extractor": "aws-transcribe",
        }
    except Exception:
        return None


# --------------------------------------------------------------------------
# Public entry point
# --------------------------------------------------------------------------
def transcribe(path: str, filename: str | None = None) -> dict:
    filename = filename or os.path.basename(path)
    result = _local_transcribe(path)

    if not result["text"] or result["confidence"] < MIN_CONF:
        escalated = _cloud_transcribe(path)
        if escalated and escalated["text"]:
            result = escalated

    result["modality"] = modality_of(filename)
    return result
