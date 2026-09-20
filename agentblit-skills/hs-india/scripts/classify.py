#!/usr/bin/env python3
"""India HSN classify-or-ask.

Given line-item descriptions (and optional answers), return a validated
8-digit Indian HSN or a list of clarifying questions. Stdlib only.

Usage:
  python3 classify.py --selftest
  python3 classify.py <<'EOF'
  {"destination":"IN","items":[{"description":"...","printed":"","answers":{}}]}
  EOF
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "hsn8-in.json"

# Official ITC-HS / Indian HSN goods schedules are typically 10k–16k 8-digit lines.
MIN_DIGIT8_COUNT = 10_000
MIN_DIGIT6_COUNT = 4_000
MIN_DIGIT4_COUNT = 1_000
MIN_DIGIT2_COUNT = 90

STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "with",
    "without",
    "for",
    "to",
    "in",
    "on",
    "by",
    "from",
    "other",
    "than",
    "pcs",
    "pc",
    "piece",
    "pieces",
    "pair",
    "pairs",
    "logo",
    "color",
    "colour",
    "black",
    "white",
    "purple",
    "grey",
    "gray",
    "size",
    "qty",
    "quantity",
    "unit",
    "price",
    "amount",
    "usd",
    "inr",
    "cny",
}


def load_table(path: Path = DATA_PATH) -> dict[str, Any]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or "rows" not in raw:
        raise SystemExit(f"Invalid tariff file: {path}")
    return raw


def index_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    by_code: dict[str, dict[str, Any]] = {}
    digit8: list[dict[str, Any]] = []
    under_hs6: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        code = str(row.get("code") or "")
        if not code.isdigit():
            continue
        by_code[code] = row
        if row.get("digits") == 8 or len(code) == 8:
            digit8.append(row)
            hs6 = str(row.get("hs6") or code[:6])
            under_hs6.setdefault(hs6, []).append(row)
    return {
        "by_code": by_code,
        "digit8": digit8,
        "under_hs6": under_hs6,
    }


def digits_only(value: str) -> str:
    return re.sub(r"\D+", "", value or "")


def looks_like_sku(value: str) -> bool:
    s = (value or "").strip()
    if not s:
        return False
    # Style numbers like VG0523-4: letters + digits, not pure HSN digits.
    if re.fullmatch(r"[A-Za-z]{1,6}\d{2,}[-/]?\d*", s):
        return True
    if re.search(r"[A-Za-z]", s) and re.search(r"\d", s) and not re.fullmatch(r"\d{6,10}", digits_only(s)):
        return True
    return False


def tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9%]+", (text or "").lower())
    out: set[str] = set()
    for w in words:
        if w in STOPWORDS or len(w) < 2:
            continue
        out.add(w)
        # light stemming for plural garments
        if w.endswith("s") and len(w) > 3 and w[:-1] not in STOPWORDS:
            out.add(w[:-1])
    return out


def extract_facts(description: str, answers: dict[str, Any]) -> dict[str, Any]:
    text = (description or "").lower()
    facts: dict[str, Any] = {}

    # --- garment type ---
    garment_map = [
        ("leggings", ("legging", "leggings")),
        ("trousers", ("trouser", "trousers", "pants", "pant", "breeches", "shorts")),
        ("skirt", ("skirt", "skirts")),
        ("dress", ("dress", "dresses")),
        ("jacket", ("jacket", "jackets", "blazer", "blazers")),
        ("suit", ("suit", "suits")),
        ("tshirt", ("t-shirt", "tshirt", "tee")),
        ("shirt", ("shirt", "shirts")),
        ("blouse", ("blouse", "blouses")),
        ("sweater", ("sweater", "sweaters", "pullover", "jumper")),
        ("hosiery", ("hosiery", "tights", "pantyhose", "stockings")),
    ]
    for name, keys in garment_map:
        if any(k in text for k in keys):
            facts["garment"] = name
            break

    # --- construction ---
    if any(k in text for k in ("knitted", "knit", "crocheted", "jersey")):
        facts["construction"] = "knitted"
    elif any(k in text for k in ("woven", "weaving", "denim")):
        facts["construction"] = "woven"
    # stretch sportswear + spandex often implies knit, but only as soft hint
    elif "spandex" in text or "elastane" in text or "lycra" in text:
        if any(k in text for k in ("legging", "sportswear", "activewear", "yoga")):
            facts["construction_hint"] = "knitted"

    # --- fibre ---
    if any(k in text for k in ("polyester", "nylon", "acrylic", "spandex", "elastane", "lycra", "synthetic")):
        facts["fibre"] = "synthetic"
    elif "cotton" in text:
        facts["fibre"] = "cotton"
    elif any(k in text for k in ("wool", "cashmere", "merino")):
        facts["fibre"] = "wool"
    elif "silk" in text:
        facts["fibre"] = "silk"
    elif any(k in text for k in ("viscose", "rayon", "modal", "artificial fibre", "artificial fiber")):
        facts["fibre"] = "artificial"

    # --- gender ---
    if any(k in text for k in ("women", "woman", "girls", "girl", "ladies", "lady", "womens", "women's")):
        facts["gender"] = "women"
    elif any(k in text for k in ("men", "man", "boys", "boy", "mens", "men's")):
        facts["gender"] = "men"
    elif any(k in text for k in ("unisex", "kids", "infant", "baby")):
        facts["gender"] = "other"

    # apply answers (override)
    for key in ("garment", "construction", "fibre", "gender", "product", "material"):
        if key in answers and answers[key] not in (None, "", "unknown"):
            facts[key] = str(answers[key]).strip().lower()

    # promote construction_hint only when answer did not contradict
    if "construction" not in facts and facts.get("construction_hint") == "knitted":
        # Still ask unless answer already provided — hint alone is not enough
        # for returning HSN without confirmation, except when selftest passes
        # via explicit answer. Keep as hint for scoring boost only.
        pass

    return facts


def apparel_questions(facts: dict[str, Any]) -> list[dict[str, Any]]:
    qs: list[dict[str, Any]] = []
    if "garment" not in facts:
        qs.append(
            {
                "id": "garment",
                "prompt": "What type of apparel is this?",
                "options": [
                    "leggings",
                    "trousers",
                    "skirt",
                    "dress",
                    "jacket",
                    "suit",
                    "shirt",
                    "tshirt",
                    "blouse",
                    "sweater",
                    "hosiery",
                    "other",
                ],
            }
        )
    if "construction" not in facts:
        qs.append(
            {
                "id": "construction",
                "prompt": "Is the fabric knitted (stretch jersey / crocheted) or woven?",
                "options": ["knitted", "woven", "unknown"],
            }
        )
    if "fibre" not in facts:
        qs.append(
            {
                "id": "fibre",
                "prompt": "What is the dominant fibre?",
                "options": ["synthetic", "cotton", "wool", "silk", "artificial", "unknown"],
            }
        )
    # Gender: chapter 61/62 women's headings for skirts/trousers/dresses
    garment = facts.get("garment")
    if garment in {"leggings", "trousers", "skirt", "dress", "suit", "jacket", "blouse"} and "gender" not in facts:
        # Default women's fashion from exporter context is common, but ask if missing
        # for skirts/trousers we need women's vs men's split in tariff
        qs.append(
            {
                "id": "gender",
                "prompt": "Is this women's/girls', men's/boys', or other?",
                "options": ["women", "men", "other", "unknown"],
            }
        )
    return qs


def resolve_apparel_hs6(facts: dict[str, Any]) -> str | None:
    """Map apparel facts to a 6-digit HS. Returns None if incomplete."""
    garment = facts.get("garment")
    construction = facts.get("construction")
    fibre = facts.get("fibre")
    gender = facts.get("gender")

    if not garment or not construction or not fibre:
        return None
    if construction == "unknown" or fibre == "unknown":
        return None

    # Hosiery → 6115
    if garment == "hosiery":
        if fibre == "synthetic":
            return "611596" if construction == "knitted" else None
        if fibre == "cotton":
            return "611595"
        return "611599"

    if gender in (None, "unknown"):
        # For skirts/trousers assume women only after explicit answer in classify flow;
        # callers should have asked. If still missing, refuse.
        if garment in {"leggings", "trousers", "skirt", "dress", "suit", "jacket", "blouse"}:
            return None
        gender = "other"

    knit = construction == "knitted"

    # Women's knitted trousers / leggings → 6104.63 synthetic, 6104.62 cotton, 6104.61 wool
    if garment in {"leggings", "trousers"} and gender == "women":
        if knit:
            return {"synthetic": "610463", "cotton": "610462", "wool": "610461", "artificial": "610469", "silk": "610469"}.get(fibre)
        return {"synthetic": "620463", "cotton": "620462", "wool": "620461", "artificial": "620469", "silk": "620469"}.get(fibre)

    if garment == "skirt" and gender == "women":
        if knit:
            return {"synthetic": "610453", "cotton": "610452", "wool": "610451", "artificial": "610459", "silk": "610459"}.get(fibre)
        return {"synthetic": "620453", "cotton": "620452", "wool": "620451", "artificial": "620459", "silk": "620459"}.get(fibre)

    if garment == "dress" and gender == "women":
        if knit:
            return {"synthetic": "610443", "cotton": "610442", "wool": "610441", "artificial": "610444", "silk": "610449"}.get(fibre)
        return {"synthetic": "620443", "cotton": "620442", "wool": "620441", "artificial": "620444", "silk": "620449"}.get(fibre)

    if garment == "jacket" and gender == "women":
        if knit:
            return {"synthetic": "610433", "cotton": "610432", "wool": "610431"}.get(fibre)
        return {"synthetic": "620433", "cotton": "620432", "wool": "620431"}.get(fibre)

    if garment == "suit" and gender == "women":
        if knit:
            return {"synthetic": "610413", "cotton": "610412", "wool": "610411"}.get(fibre)
        return {"synthetic": "620413", "cotton": "620412", "wool": "620411"}.get(fibre)

    # Men's trousers
    if garment in {"leggings", "trousers"} and gender == "men":
        if knit:
            return {"synthetic": "610343", "cotton": "610342", "wool": "610341"}.get(fibre)
        return {"synthetic": "620343", "cotton": "620342", "wool": "620341"}.get(fibre)

    # T-shirts knitted
    if garment == "tshirt" and knit:
        return {"cotton": "610910", "synthetic": "610990"}.get(fibre, "610990")

    if garment == "shirt":
        if knit:
            return {"cotton": "610510", "synthetic": "610520"}.get(fibre)
        if gender == "men":
            return {"cotton": "620520", "synthetic": "620530"}.get(fibre)
        if gender == "women":
            return {"cotton": "620630", "synthetic": "620640"}.get(fibre)

    if garment == "blouse" and gender == "women":
        if knit:
            return {"cotton": "610610", "synthetic": "610620"}.get(fibre)
        return {"cotton": "620630", "synthetic": "620640"}.get(fibre)

    if garment == "sweater" and knit:
        return {"wool": "611011", "cotton": "611020", "synthetic": "611030"}.get(fibre)

    return None


def unique_hsn8(idx: dict[str, Any], hs6: str) -> dict[str, Any] | None:
    children = idx["under_hs6"].get(hs6) or []
    if len(children) == 1:
        return children[0]
    if len(children) == 0:
        # try ...00 if present as exact code (still table lookup, not blind pad)
        candidate = idx["by_code"].get(hs6 + "00")
        if candidate and (candidate.get("digits") == 8 or len(candidate["code"]) == 8):
            return candidate
        return None
    return None


def resolve_printed(printed: str, idx: dict[str, Any]) -> dict[str, Any] | None:
    if looks_like_sku(printed):
        return None
    dig = digits_only(printed)
    if len(dig) < 6 or len(dig) > 10:
        return None
    if len(dig) >= 8:
        code8 = dig[:8]
        row = idx["by_code"].get(code8)
        if row and (row.get("digits") == 8 or len(row["code"]) == 8):
            return row
        return None
    # 6 or 7 digits → take first 6, require unique 8-digit child
    hs6 = dig[:6]
    if hs6 not in idx["by_code"] and hs6 not in idx["under_hs6"]:
        # still allow if children exist
        if hs6 not in idx["under_hs6"]:
            return None
    return unique_hsn8(idx, hs6)


def score_generic(description: str, facts: dict[str, Any], idx: dict[str, Any]) -> list[tuple[float, dict[str, Any]]]:
    tokens = tokenize(description)
    for v in facts.values():
        if isinstance(v, str):
            tokens |= tokenize(v)
    if not tokens:
        return []

    scored: list[tuple[float, dict[str, Any]]] = []
    # Prefer scoring 6-digit then map to unique 8
    candidates = [r for r in idx["by_code"].values() if r.get("digits") == 6 or len(r["code"]) == 6]
    for row in candidates:
        heading_tokens = tokenize(row.get("heading") or "")
        if not heading_tokens:
            continue
        overlap = tokens & heading_tokens
        if not overlap:
            continue
        score = len(overlap) / max(3, len(heading_tokens) ** 0.5)
        # boost chapter hints
        code = row["code"]
        if facts.get("construction") == "knitted" and code.startswith("61"):
            score += 1.5
        if facts.get("construction") == "woven" and code.startswith("62"):
            score += 1.5
        if facts.get("fibre") == "synthetic" and "synthetic" in heading_tokens:
            score += 0.8
        if facts.get("fibre") == "cotton" and "cotton" in heading_tokens:
            score += 0.8
        scored.append((score, row))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:10]


def ambiguous_description(description: str) -> bool:
    text = (description or "").lower().strip()
    if not text:
        return True
    vague = ("parts", "accessories", "accessory", "set", "assortment", "miscellaneous", "other goods", "sample")
    # Only treat as ambiguous if very short or purely vague
    tokens = tokenize(text)
    if len(tokens) <= 1:
        return True
    if any(v == text or text.startswith(v + " ") for v in vague) and len(tokens) <= 3:
        return True
    return False


def is_apparelish(facts: dict[str, Any], description: str) -> bool:
    if facts.get("garment"):
        return True
    text = (description or "").lower()
    keywords = (
        "apparel",
        "garment",
        "clothing",
        "wear",
        "legging",
        "skirt",
        "trouser",
        "shirt",
        "dress",
        "jacket",
        "blouse",
        "sweater",
        "polyester",
        "spandex",
        "cotton",
    )
    return any(k in text for k in keywords)


def public_facts(facts: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in facts.items() if not str(k).endswith("_hint")}


def empty_result(
    *,
    source: str,
    facts: dict[str, Any],
    questions: list[dict[str, Any]],
    reason: str,
    hsn8: str | None = None,
    heading: str | None = None,
) -> dict[str, Any]:
    return {
        "hsn8": hsn8,
        "heading": heading,
        "source": source,
        "facts": public_facts(facts),
        "questions": questions,
        "reason": reason,
    }


def classify_item(item: dict[str, Any], idx: dict[str, Any]) -> dict[str, Any]:
    description = str(item.get("description") or "")
    printed = str(item.get("printed") or "")
    answers_raw = item.get("answers") or {}
    answers = {str(k): v for k, v in answers_raw.items()} if isinstance(answers_raw, dict) else {}

    # 1) Printed first
    if printed.strip():
        if looks_like_sku(printed):
            return empty_result(
                source="needs_questions",
                facts={},
                questions=[],
                reason=f"printed value looks like a SKU, not HSN: {printed!r}",
            )
        row = resolve_printed(printed, idx)
        if row:
            code = row.get("hsn8") or row["code"]
            return empty_result(
                source="printed",
                facts={},
                questions=[],
                reason="validated printed HSN against Indian tariff table",
                hsn8=code if len(code) == 8 else None,
                heading=row.get("heading"),
            )
        return empty_result(
            source="needs_questions",
            facts={},
            questions=[],
            reason="printed digits not found / not unique in Indian HSN table",
        )

    facts = extract_facts(description, answers)

    # Ambiguous short lines
    if ambiguous_description(description) and not answers:
        return empty_result(
            source="needs_questions",
            facts=facts,
            questions=[
                {
                    "id": "product",
                    "prompt": "What is the specific product (not 'parts'/'set'/'accessories')?",
                    "options": [],
                }
            ],
            reason="description too vague for HSN classification",
        )

    # Apparel path
    if is_apparelish(facts, description):
        qs = apparel_questions(facts)
        # If construction missing but we have a strong stretch-knit hint, still ask (fail closed)
        if qs:
            return empty_result(
                source="needs_questions",
                facts={k: v for k, v in facts.items() if not k.endswith("_hint")},
                questions=qs,
                reason="missing apparel facts required for Indian HSN (61/62)",
            )
        hs6 = resolve_apparel_hs6(facts)
        if not hs6:
            return empty_result(
                source="needs_questions",
                facts=facts,
                questions=[],
                reason="could not map apparel facts to a unique HS-6 heading",
            )
        row = unique_hsn8(idx, hs6)
        if not row:
            children = idx["under_hs6"].get(hs6) or []
            if len(children) > 1:
                opts = [c.get("hsn8") or c["code"] for c in children[:8]]
                return empty_result(
                    source="needs_questions",
                    facts=facts,
                    questions=[
                        {
                            "id": "hsn8_choice",
                            "prompt": f"Multiple Indian 8-digit lines under {hs6}. Which applies?",
                            "options": opts,
                        }
                    ],
                    reason=f"HS-6 {hs6} has {len(children)} Indian 8-digit lines",
                )
            return empty_result(
                source="needs_questions",
                facts=facts,
                questions=[],
                reason=f"no Indian 8-digit tariff line found under HS-6 {hs6}",
            )
        # Optional explicit 8-digit answer
        if "hsn8_choice" in answers:
            chosen = digits_only(str(answers["hsn8_choice"]))
            if chosen in {c.get("hsn8") or c["code"] for c in (idx["under_hs6"].get(hs6) or [])}:
                crow = idx["by_code"][chosen]
                return empty_result(
                    source="classified",
                    facts=facts,
                    questions=[],
                    reason="user selected 8-digit line under apparel HS-6",
                    hsn8=chosen,
                    heading=crow.get("heading"),
                )
        code = row.get("hsn8") or row["code"]
        return empty_result(
            source="classified",
            facts=facts,
            questions=[],
            reason=f"apparel facts → HS-6 {hs6} → unique Indian HSN",
            hsn8=code,
            heading=row.get("heading"),
        )

    # Generic goods: score headings
    ranked = score_generic(description, facts, idx)
    if not ranked:
        return empty_result(
            source="needs_questions",
            facts=facts,
            questions=[
                {
                    "id": "product",
                    "prompt": "Describe the product type and primary material more specifically.",
                    "options": [],
                }
            ],
            reason="no tariff heading matched the description tokens",
        )

    top_score, top_row = ranked[0]
    second_score = ranked[1][0] if len(ranked) > 1 else 0.0
    # Fail closed if close top-2
    if second_score > 0 and (top_score - second_score) < 0.35:
        return empty_result(
            source="needs_questions",
            facts=facts,
            questions=[
                {
                    "id": "product",
                    "prompt": "Which description fits better?",
                    "options": [
                        f"{ranked[0][1]['code']}: {(ranked[0][1].get('heading') or '')[:80]}",
                        f"{ranked[1][1]['code']}: {(ranked[1][1].get('heading') or '')[:80]}",
                    ],
                }
            ],
            reason="top HS-6 candidates are too close; need clarification",
        )

    if top_score < 1.2:
        return empty_result(
            source="needs_questions",
            facts=facts,
            questions=[
                {
                    "id": "material",
                    "prompt": "What is the primary material / composition?",
                    "options": [],
                }
            ],
            reason="match confidence too low",
        )

    hs6 = top_row["code"][:6]
    row = unique_hsn8(idx, hs6)
    if not row:
        children = idx["under_hs6"].get(hs6) or []
        if len(children) > 1:
            return empty_result(
                source="needs_questions",
                facts=facts,
                questions=[
                    {
                        "id": "hsn8_choice",
                        "prompt": f"Multiple Indian 8-digit lines under {hs6}. Which applies?",
                        "options": [c.get("hsn8") or c["code"] for c in children[:8]],
                    }
                ],
                reason=f"HS-6 {hs6} is not unique at 8 digits",
            )
        return empty_result(
            source="needs_questions",
            facts=facts,
            questions=[],
            reason=f"no Indian 8-digit line under HS-6 {hs6}",
        )

    code = row.get("hsn8") or row["code"]
    return empty_result(
        source="classified",
        facts=facts,
        questions=[],
        reason=f"token match → HS-6 {hs6} → unique Indian HSN",
        hsn8=code,
        heading=row.get("heading"),
    )


def classify_payload(payload: dict[str, Any], idx: dict[str, Any]) -> dict[str, Any]:
    dest = str(payload.get("destination") or "").upper()
    if dest and dest not in {"IN", "IND", "INDIA"}:
        return {
            "error": "destination must be IN (India). This skill only returns Indian 8-digit HSN.",
            "items": [],
        }
    items_in = payload.get("items")
    if not isinstance(items_in, list) or not items_in:
        return {"error": "items must be a non-empty array", "items": []}
    return {"items": [classify_item(it if isinstance(it, dict) else {}, idx) for it in items_in]}


def run_selftest(idx: dict[str, Any], meta: dict[str, Any]) -> int:
    counts = meta.get("counts") or {}
    n8 = counts.get("digit8") or sum(1 for r in meta["rows"] if r.get("digits") == 8)
    n6 = counts.get("digit6") or sum(1 for r in meta["rows"] if r.get("digits") == 6)
    n4 = counts.get("digit4") or sum(1 for r in meta["rows"] if r.get("digits") == 4)
    n2 = counts.get("digit2") or sum(1 for r in meta["rows"] if r.get("digits") == 2)
    failures: list[str] = []

    if n8 < MIN_DIGIT8_COUNT:
        failures.append(f"digit8 count {n8} < {MIN_DIGIT8_COUNT} (table looks truncated)")
    if n6 < MIN_DIGIT6_COUNT:
        failures.append(f"digit6 count {n6} < {MIN_DIGIT6_COUNT}")
    if n4 < MIN_DIGIT4_COUNT:
        failures.append(f"digit4 count {n4} < {MIN_DIGIT4_COUNT}")
    if n2 < MIN_DIGIT2_COUNT:
        failures.append(f"digit2 count {n2} < {MIN_DIGIT2_COUNT}")

    # Required AIKA tariff lines exist and are unique under HS-6
    for hs6, hsn8 in (("610463", "61046300"), ("610453", "61045300")):
        row = idx["by_code"].get(hsn8)
        if not row:
            failures.append(f"missing required HSN {hsn8}")
        children = [c.get("hsn8") or c["code"] for c in idx["under_hs6"].get(hs6, [])]
        if children != [hsn8] and hsn8 not in children:
            failures.append(f"{hs6} children unexpected: {children}")

    cases = [
        {
            "name": "leggings asks construction",
            "item": {
                "description": "Leggings, 78% polyester 22% spandex, Without Logo",
                "printed": "",
                "answers": {},
            },
            "expect_source": "needs_questions",
            "expect_q_ids": {"construction"},
        },
        {
            "name": "leggings knitted → 61046300",
            "item": {
                "description": "Leggings, 78% polyester 22% spandex",
                "printed": "",
                "answers": {"construction": "knitted", "gender": "women"},
            },
            "expect_hsn8": "61046300",
            "expect_source": "classified",
        },
        {
            "name": "skirt knitted → 61045300",
            "item": {
                "description": "Skirt, Outside: 95% Polyester & 5% Spandex; Inside: 92% Polyester & 8% Spandex",
                "printed": "",
                "answers": {"construction": "knitted", "gender": "women"},
            },
            "expect_hsn8": "61045300",
            "expect_source": "classified",
        },
        {
            "name": "SKU alone unmatched",
            "item": {"description": "VG0523-4", "printed": "VG0523-4", "answers": {}},
            "expect_hsn8": None,
            "reject_sku": True,
        },
        {
            "name": "printed HS 6104.63 → 61046300",
            "item": {
                "description": "leggings",
                "printed": "HS 6104.63",
                "answers": {},
            },
            "expect_hsn8": "61046300",
            "expect_source": "printed",
        },
        {
            "name": "printed 8-digit",
            "item": {
                "description": "leggings",
                "printed": "61046300",
                "answers": {},
            },
            "expect_hsn8": "61046300",
            "expect_source": "printed",
        },
    ]

    for case in cases:
        result = classify_item(case["item"], idx)
        name = case["name"]
        if "expect_source" in case and result["source"] != case["expect_source"]:
            failures.append(f"{name}: source {result['source']!r} != {case['expect_source']!r}")
        if "expect_hsn8" in case and result.get("hsn8") != case["expect_hsn8"]:
            failures.append(f"{name}: hsn8 {result.get('hsn8')!r} != {case['expect_hsn8']!r}")
        if "expect_q_ids" in case:
            ids = {q["id"] for q in result.get("questions") or []}
            if not case["expect_q_ids"].issubset(ids):
                failures.append(f"{name}: missing questions {case['expect_q_ids'] - ids}")
        if case.get("reject_sku") and result.get("hsn8"):
            failures.append(f"{name}: SKU must not yield hsn8")

    print(
        json.dumps(
            {
                "ok": not failures,
                "counts": {"digit2": n2, "digit4": n4, "digit6": n6, "digit8": n8},
                "failures": failures,
            },
            indent=2,
        )
    )
    return 1 if failures else 0


def main(argv: list[str]) -> int:
    meta = load_table()
    idx = index_rows(meta["rows"])

    if "--selftest" in argv:
        return run_selftest(idx, meta)

    raw = sys.stdin.read().strip()
    if not raw:
        print(
            "Usage: python3 classify.py --selftest | python3 classify.py < payload.json",
            file=sys.stderr,
        )
        return 1
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"invalid JSON: {exc}", "items": []}))
        return 1
    if not isinstance(payload, dict):
        print(json.dumps({"error": "payload must be a JSON object", "items": []}))
        return 1

    out = classify_payload(payload, idx)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if "error" not in out else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
