from flask import Flask, request, jsonify, render_template
from grammar_spell_corrector import GrammarSpellCorrector

# Configure Flask to use our templates + static folders
app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates",
)

# ---------- LOAD GRAMMAR MODEL ONCE ----------

corrector = GrammarSpellCorrector()


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

    Returns JSON shaped like the frontend expects:

    {
      "mistakeCount": int,
      "correctness": int,
      "issues": [
        {
          "sentence": str,
          "whatIsWrong": str,
          "whyItsWrong": str,
          "suggestion": str
        },
        ...
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
    correctness = max(40, 100 - mistake_count * 10)  # simple heuristic (frontend refines further)

    return jsonify(
        {
            "mistakeCount": mistake_count,
            "correctness": correctness,
            "issues": issues,
        }
    )


if __name__ == "__main__":
    # Run the Flask app locally
    # debug=False so the heavy model is not loaded twice by the reloader
    app.run(host="0.0.0.0", port=5000, debug=False)
