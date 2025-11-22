# Deep-Thinkers
Contexual Spell and Grammar Coach - editor that suggests corrections with explanations ; must: text editor and suggestion UI
# Grammar Studio 🧠✍️  
**Local Grammar Checker & Summarizer (Grammar Coach UI)**

Grammar Studio is a local-first web app that helps you clean up and compress text:

- ✅ **Grammar Checker** – grammar, spelling, and punctuation suggestions  
- 📝 **Summarizer** – turns long text into short key-point bullet summaries  
- 💻 **Runs fully on your machine** using pretrained Hugging Face models (no external API calls)

The UI is branded as **Grammar Coach** with a clean blue/white interface.

---

## ✨ Features

- **Grammar Checker (FLAN-T5 based)**  
  - Uses a fine-tuned FLAN-T5 model for grammar + spell correction  
  - Returns:
    - Suggested corrected sentence
    - “What is wrong” / “Why it’s wrong” explanations
    - Mistake count & approximate correctness score

- **Summarizer (BART-based)**  
  - Uses `facebook/bart-large-cnn` to generate **abstractive summaries**  
  - Splits long text into chunks, summarizes each, and converts into bullet points  
  - Configurable **max points** (number of bullets)

- **Single unified web app (Flask)**  
  - One backend (`app.py`) exposing:
    - `POST /api/grammar`
    - `POST /api/summarize`
  - Modern UI with:
    - Sidebar tools: **Grammar Checker**, **Summarizer**
    - Chatbot-style landing screen with quick action chips
    - Dark-on-light, sky-blue theme consistent with “Grammar Coach” logo

---

## 🧱 Tech Stack

- **Backend:** Python, Flask  
- **NLP Models:**  
  - Grammar: FLAN-T5–based grammar corrector (local HF weights)  
  - Summarization: `facebook/bart-large-cnn` (local HF weights)  
- **Frontend:** HTML, CSS, vanilla JS (no framework)  
- **Serving:** Flask dev server (for local use)

---

## 📂 Project Structure

```text
.
│   app.py                      # Main Flask app (unified)
│   summarizer_model.py         # BART-based key-point summarizer wrapper
│   api_summarizer.py           # (Optional / legacy) standalone summarizer API
│   requirements.txt
│   config.json                 # BART model config
│   generation_config.json
│   merges.txt
│   model.safetensors           # BART weights (large, usually git-ignored)
│   tokenizer.json
│   tokenizer_config.json
│   vocab.json
│   special_tokens_map.json
│
├── grammer/
│   │   app.py                  # (legacy) grammar-only Flask app – can be deleted
│   │   grammar_spell_corrector.py   # GrammarSpellCorrector class
│   │
│   └── grammar_spell_flan_t5/  # Local FLAN-T5 grammar model files
│       ├── config.json
│       ├── generation_config.json
│       ├── model.safetensors
│       ├── special_tokens_map.json
│       ├── spiece.model
│       ├── tokenizer.json
│       └── tokenizer_config.json
│
├── static/
│   ├── logo.png
│   ├── script.js               # Frontend logic (views, API calls, UI behavior)
│   └── styles.css              # Styling (sky blue + white theme)
│
├── templates/
│   └── index.html              # Main UI template
│
└── __pycache__/                # Python cache (ignored)
