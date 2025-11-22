# api_summarizer.py
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from summarizer_model import KeyPointSummarizer


app = FastAPI(title="Local Key-Point Summarizer Backend")

# Allow any local tool/UI to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once at startup (from your Windows path)
summarizer = KeyPointSummarizer()


class SummarizeRequest(BaseModel):
    text: str
    max_points: int = 5
    max_length: int = 180
    min_length: int = 50


class SummarizeResponse(BaseModel):
    bullets: List[str]
    joined: str


@app.post("/summarize", response_model=SummarizeResponse)
def summarize_endpoint(req: SummarizeRequest):
    bullets = summarizer.summarize(
        text=req.text,
        max_points=req.max_points,
        max_length=req.max_length,
        min_length=req.min_length,
    )
    joined = "\n".join(f"- {b}" for b in bullets)
    return SummarizeResponse(bullets=bullets, joined=joined)
