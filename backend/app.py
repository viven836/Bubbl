import os
import re
from typing import List, Literal, Optional, TypedDict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TextClassificationPipeline

# Ensure HF cache persists on serverless providers (e.g., Vercel)
os.environ.setdefault("HF_HOME", "/tmp/huggingface")

# -------------------------
# Regex logic (kept as-is)
# -------------------------

def compile_patterns() -> List[re.Pattern]:
    flags = re.IGNORECASE

    hate_speech = [
        r"\b(hate|hating|hated)\b",
        r"\b(racist|racism|bigot|bigotry)\b",
        r"\b(sexist|sexism|misogyn|misandr)\b",
        r"\b(homophob|transphob)\b",
        r"\bn[i1]gg[e3]r\b",
        r"\bf[a@]gg[o0]t\b",
        r"\bk[i1]k[e3]\b",
        r"\bch[i1]nk\b",
        r"\bsp[i1]c\b",
        r"\bg[o0][o0]k\b",
        r"\bw[e3]tb[a@]ck\b",
        r"\br[e3]t[a@]rd\b",
        r"\b(trash|garbage)\s*(human|person|people)\b",
        r"\b(go\s*back\s*to\s*your\s*country)\b",
        r"\b(white|black|asian|latino|hispanic)\s*(supremacy|power)\b",
        r"\b(jew|muslim|islam|christian|hindu)\s*(hate|hater)\b",
        r"\b(deport|deportation)\b",
        r"\b(nazi|fascist|communist)\b",
        r"\b(libtard|conservatard)\b",
        r"\b(snowflake)\b",
        r"\b(sjw)\b",
        r"\b(triggered)\b",
        r"\b(woke)\s*(mob|culture|agenda)\b",
        r"\b(race\s*traitor)\b",
        r"\b(race\s*card)\b",
        r"\b(race\s*baiting)\b",
        r"\b(virtue\s*signal)\b",
        r"\b(trump|biden|obama)\s*(cult|cultist)\b",
        r"\b(left|right)\s*(wing|winger)\s*(extremist|radical)\b",
        r"\b(antifa|proud\s*boys)\b",
        r"\b(all\s*lives\s*matter)\b",
        r"\b(blue\s*lives\s*matter)\b",
        r"\b(illegal\s*alien)\b",
        r"\b(build\s*the\s*wall)\b",
        r"\b(lock\s*her\s*up)\b",
        r"\b(not\s*my\s*president)\b",
    ]

    harassment = [
        r"\b(stupid|idiot|dumb|moron)\b",
        r"\b(ugly|fat|disgusting)\b",
        r"\b(kill|die|death|suicide)\b",
        r"\b(threat|threaten)\b",
        r"\b(attack|assault)\b",
        r"\b(bully|bullying)\b",
        r"\b(harass|harassment)\b",
        r"\b(loser|pathetic|worthless)\b",
        r"\bshut up\b",
        r"\bgo away\b",
        r"\bnobody cares\b",
        r"\bnobody asked\b",
        r"\b(kys|kill\s*yourself)\b",
        r"\b(neck\s*yourself)\b",
        r"\b(hang\s*yourself)\b",
        r"\b(end\s*yourself)\b",
        r"\b(off\s*yourself)\b",
        r"\b(delete\s*yourself)\b",
        r"\b(delete\s*your\s*account)\b",
        r"\b(ratio|ratioed)\b",
        r"\b(clown|bozo)\b",
        r"\b(incel)\b",
        r"\b(simp)\b",
        r"\b(beta|alpha)\s*(male|female)\b",
        r"\b(soy\s*boy)\b",
        r"\b(cuck|cuckold)\b",
        r"\b(karen|chad)\b",
        r"\b(ok\s*boomer)\b",
        r"\b(cringe)\b",
        r"\b(cope|copium)\b",
        r"\b(seethe)\b",
        r"\b(malding)\b",
        r"\b(touch\s*grass)\b",
        r"\b(get\s*a\s*life)\b",
        r"\b(cry\s*about\s*it)\b",
        r"\b(cry\s*more)\b",
        r"\b(skill\s*issue)\b",
        r"\b(who\s*asked)\b",
        r"\b(didn'?t\s*ask)\b",
        r"\b(don'?t\s*care)\b",
        r"\b(don'?t\s*care\s*didn'?t\s*ask)\b",
        r"\b(you'?re\s*bad)\b",
        r"\b(you\s*suck)\b",
        r"\b(trash\s*player)\b",
        r"\b(garbage\s*player)\b",
        r"\b(uninstall)\b",
        r"\b(get\s*good|git\s*gud)\b",
        r"\b(ez|easy)\b",
        r"\b(lmao|lol)\s*(bad|trash|garbage)\b",
    ]

    profanity = [
        r"\b(fuck|fucking|fucker|fucked)\b",
        r"\b(shit|shitty|bullshit|bs)\b",
        r"\b(ass|asshole)\b",
        r"\b(bitch|bitches)\b",
        r"\b(cunt)\b",
        r"\b(dick|cock|penis)\b",
        r"\b(pussy|vagina)\b",
        r"\b(whore|slut)\b",
        r"\b(damn|goddamn)\b",
        r"\bcrap\b",
        r"\bhell\b",
        r"\bwtf\b",
        r"\bomg\b",
        r"\b(stfu)\b",
        r"\b(gtfo)\b",
        r"\b(fk|fck)\b",
        r"\b(f\*?ck|f\*\*k|f\*\*\*)\b",
        r"\b(s\*\*t|sh\*t)\b",
        r"\b(b\*tch)\b",
        r"\b(a\*\*|a\*\*hole)\b",
        r"\b(c\*nt)\b",
        r"\b(d\*ck)\b",
        r"\b(p\*ssy)\b",
        r"\b(wh\*re|sl\*t)\b",
        r"\b(ffs)\b",
        r"\b(af)\b",
        r"\b(lmfao|lmao)\b",
        r"\b(pos)\b",
        r"\b(sob)\b",
        r"\b(tits|titties|boobs)\b",
        r"\b(milf|dilf)\b",
        r"\b(thot)\b",
        r"\b(hoe|ho)\b",
        r"\b(bastard)\b",
        r"\b(douche|douchebag)\b",
        r"\b(jackass)\b",
        r"\b(piss|pissed)\b",
        r"\b(screw|screwed)\b",
        r"\b(jerk)\b",
        r"\b(darn)\b",
        r"\b(dang)\b",
        r"\b(freaking|frickin)\b",
        r"\b(bloody)\b",
        r"\b(bollocks)\b",
        r"\b(bugger)\b",
        r"\b(wanker)\b",
        r"\b(tosser)\b",
        r"\b(twat)\b",
        r"\b(prick)\b",
        r"\b(sod)\b",
        r"\b(git)\b",
    ]

    combined = hate_speech + harassment + profanity
    return [re.compile(p, flags) for p in combined]

OFFENSIVE_PATTERNS: List[re.Pattern] = compile_patterns()

def matches_offensive_regex(text: str) -> bool:
    if not text:
        return False
    for pat in OFFENSIVE_PATTERNS:
        if pat.search(text):
            return True
    return False

# -------------------------
# HF model (context-based)
# -------------------------

MODEL_NAME = "Hate-speech-CNERG/dehatebert-mono-english"
_tokenizer: Optional[AutoTokenizer] = None
_model: Optional[AutoModelForSequenceClassification] = None
_classifier: Optional[TextClassificationPipeline] = None
_id2label: Optional[dict] = None

def get_classifier() -> TextClassificationPipeline:
    global _tokenizer, _model, _classifier, _id2label
    if _classifier is None:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        _classifier = TextClassificationPipeline(
            model=_model,
            tokenizer=_tokenizer,
            task="text-classification",
            return_all_scores=True,
            function_to_apply="softmax",
            top_k=None,
            device=-1,  # CPU
        )
        _id2label = _model.config.id2label
    return _classifier

def normalize_scores(raw_scores: List[dict]) -> List[dict]:
    """
    Ensure scores are returned exactly for labels HATE and NON_HATE.
    raw_scores comes like: [{'label': 'HATE', 'score': 0.41}, {'label': 'NON_HATE', 'score': 0.58}]
    """
    # Map existing labels to uppercase, then pick out HATE/NON_HATE
    by_label = {item["label"].upper(): float(item["score"]) for item in raw_scores}
    hate = by_label.get("HATE")
    non_hate = by_label.get("NON_HATE")

    # Fallback: if labels are LABEL_0/LABEL_1, try to use id2label mapping
    if (hate is None or non_hate is None) and _id2label:
        # _id2label example: {0: 'HATE', 1: 'NON_HATE'}
        # try to align with raw_scores order
        tmp = {}
        for item in raw_scores:
            lbl = item["label"]
            # if label like 'LABEL_0', try to parse the index
            if lbl.upper().startswith("LABEL_"):
                try:
                    idx = int(lbl.split("_")[1])
                    mapped = _id2label.get(idx, lbl).upper()
                    tmp[mapped] = float(item["score"])
                except Exception:
                    tmp[lbl.upper()] = float(item["score"])
            else:
                tmp[lbl.upper()] = float(item["score"])
        by_label = {**by_label, **tmp}
        hate = by_label.get("HATE")
        non_hate = by_label.get("NON_HATE")

    # If still missing, distribute any available score or default to 0/1
    if hate is None and non_hate is None:
        # If we truly can't map, assume NON_HATE
        hate, non_hate = 0.0, 1.0
    elif hate is None:
        hate = 1.0 - non_hate
    elif non_hate is None:
        non_hate = 1.0 - hate

    # Clamp for safety
    hate = max(0.0, min(1.0, hate))
    non_hate = max(0.0, min(1.0, non_hate))

    return [
        {"label": "HATE", "score": round(hate, 3)},
        {"label": "NON_HATE", "score": round(non_hate, 3)},
    ]

# -------------------------
# FastAPI app
# -------------------------

app = FastAPI()

# Open CORS so the Chrome extension can call from any site
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Extensions can originate from many URLs
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassifyIn(BaseModel):
    text: str = Field(..., min_length=1)

class ScoreItem(TypedDict):
    label: Literal["HATE", "NON_HATE"]
    score: float

class ClassifyOut(BaseModel):
    label: Literal["HATE", "OFFENSIVE", "NORMAL"]
    scores: List[ScoreItem]

@app.post("/classify", response_model=ClassifyOut)
def classify(payload: ClassifyIn):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text must not be empty.")

    # 1) Regex hybrid rule: if matches → OFFENSIVE immediately
    regex_hit = matches_offensive_regex(text)

    # 2) Run model to get scores (returned even if regex matched)
    classifier = get_classifier()
    raw = classifier(text, return_all_scores=True)
    if not raw or not isinstance(raw, list) or not raw[0]:
        # Robust fallback
        scores = [{"label": "HATE", "score": 0.0}, {"label": "NON_HATE", "score": 1.0}]
    else:
        scores = normalize_scores(raw[0])

    if regex_hit:
        return ClassifyOut(label="OFFENSIVE", scores=scores)

    # 3) If model HATE >= 0.5 → HATE, else NORMAL
    hate_score = next((s["score"] for s in scores if s["label"] == "HATE"), 0.0)
    final_label: Literal["HATE", "OFFENSIVE", "NORMAL"] = "HATE" if hate_score >= 0.5 else "NORMAL"

    return ClassifyOut(label=final_label, scores=scores)

# Local run:
# uvicorn scripts.app:app --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
