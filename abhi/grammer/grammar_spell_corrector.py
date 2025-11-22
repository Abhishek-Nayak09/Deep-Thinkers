import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from typing import List, Optional


class GrammarSpellCorrector:
    """
    Grammar + Spelling + Punctuation corrector.

    This version loads the model directly from Hugging Face:
    'pszemraj/flan-t5-large-grammar-synthesis'.

    - Input: raw sentence (possibly with grammar/spelling mistakes)
    - Output: corrected sentence
    """

    def __init__(
        self,
        model_dir: str = "pszemraj/flan-t5-large-grammar-synthesis",
        device: Optional[str] = None,
    ):
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        print(
            f"[GrammarSpellCorrector] Loading model from '{model_dir}' on device: {self.device}"
        )

        # Load tokenizer & model from HF hub (or local cache if already downloaded)
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_dir)
        self.model.to(self.device)
        self.model.eval()

    @torch.no_grad()
    def correct(
        self,
        text: str,
        max_length: int = 128,
        num_beams: int = 8,
    ) -> str:
        """
        Correct grammar + spelling for a single string.
        Deterministic: beam search only (no sampling).
        """
        text = text.strip()
        if not text:
            return ""

        enc = self.tokenizer(
            [text],
            return_tensors="pt",
            padding=True,
            truncation=True,
        ).to(self.device)

        outputs = self.model.generate(
            **enc,
            max_length=max_length,
            num_beams=num_beams,
            do_sample=False,
            early_stopping=True,
        )

        corrected = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return corrected.strip()

    @torch.no_grad()
    def correct_batch(
        self,
        texts: List[str],
        max_length: int = 128,
        num_beams: int = 8,
    ) -> List[str]:
        """
        Correct grammar + spelling for a batch of sentences.
        """
        if not texts:
            return []

        cleaned = [t.strip() if t is not None else "" for t in texts]

        enc = self.tokenizer(
            cleaned,
            return_tensors="pt",
            padding=True,
            truncation=True,
        ).to(self.device)

        outputs = self.model.generate(
            **enc,
            max_length=max_length,
            num_beams=num_beams,
            do_sample=False,
            early_stopping=True,
        )

        decoded = self.tokenizer.batch_decode(outputs, skip_special_tokens=True)
        return [d.strip() for d in decoded]


if __name__ == "__main__":
    gc = GrammarSpellCorrector()
    s = "this sentences have many error and it are not write correctly."
    print("IN :", s)
    print("OUT:", gc.correct(s))
