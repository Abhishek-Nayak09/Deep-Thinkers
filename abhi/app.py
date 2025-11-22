from flask import Flask, request, jsonify, render_template
from grammer.grammar_spell_corrector import GrammarSpellCorrector
from summarizer_model import KeyPointSummarizer

# Configure Flask to use our templates + static folders
app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates",
)

# ---------- LOAD MODELS ONCE ----------

# Grammar model (local FLAN-T5 in grammer/grammar_spell_flan_t5)
corrector = GrammarSpellCorrector(
    model_dir=r"grammer/grammar_spell_flan_t5",
)

# Summarizer model (local BART in current folder via summarizer_model.py)
summarizer = KeyPointSummarizer()


# ---------- FRONTEND ROUTE ----------

@app.route("/")
def index():
    """Serve the main UI (index.html)."""
    return render_template("index.html")


# ---------- API: GRAMMAR + SPELL CHECK ----------

@app.route("/api/grammar", methods=["POST"])
def grammar_api():
    """
    Expects JSON: { "text": "..." }

    Returns JSON:

    {
      "mistakeCount": int,
      "correctness": int,
      "issues": [
        {
          "sentence": str,
          "whatIsWrong": str,
          "whyItsWrong": str,
          "suggestion": str
        }
      ]
    }
    """
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()

    # No text provided -> no issues
    if not text:
        return jsonify(
            {
                "mistakeCount": 0,
                "correctness": 100,
                "issues": [],
            }
        )

    # Call the grammar model
    corrected = corrector.correct(text)

    # If model didn't change anything, treat as no mistakes
    if corrected.strip() == text.strip():
        return jsonify(
            {
                "mistakeCount": 0,
                "correctness": 100,
                "issues": [],
            }
        )

    # Otherwise, create a single "issue" covering the whole sentence
    issues = [
        {
            "sentence": text,
            "whatIsWrong": "The model detected grammar, spelling, or punctuation issues in this text.",
            "whyItsWrong": "Some words or structures are not standard or correct in formal English.",
            "suggestion": corrected,
        }
    ]

    mistake_count = len(issues)
    correctness = max(40, 100 - mistake_count * 10)  # simple heuristic

    return jsonify(
        {
            "mistakeCount": mistake_count,
            "correctness": correctness,
            "issues": issues,
        }
    )


# ---------- API: SUMMARIZER ----------

@app.route("/api/summarize", methods=["POST"])
def summarize_api():
    """
    Expects JSON: { "text": "...", "max_points": int? }

    Returns JSON:
    {
      "bullets": [str, ...],
      "joined": "- point 1\n- point 2\n..."
    }
    """
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    max_points = int(data.get("max_points", 5))

    if not text:
        return jsonify({"bullets": [], "joined": ""})

    bullets = summarizer.summarize(text=text, max_points=max_points)
    joined = "\n".join(f"- {b}" for b in bullets)

    return jsonify({"bullets": bullets, "joined": joined})


if __name__ == "__main__":
    # Single unified app on port 8003
    app.run(host="0.0.0.0", port=8003, debug=False)
