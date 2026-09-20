#!/usr/bin/env python3
"""Multi-country import tariff classify-or-ask.

Routes by importer destination (IN/US/CN/EU), validates printed codes,
or classifies from description — asking questions when facts are missing.

Usage:
  python3 classify.py --selftest
  python3 classify.py <<'EOF'
  {"destination":"US","items":[{"description":"...","printed":"","answers":{}}]}
  EOF
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
COUNTRIES_PATH = DATA / "countries.json"
HS6_CORE_PATH = DATA / "hs6-core.json"

MIN_LEAF = {
    "IN": 10_000,
    "US": 15_000,
    "CN": 5_000,
    "EU": 5_000,
}

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "with", "without", "for", "to", "in",
    "on", "by", "from", "other", "than", "pcs", "pc", "piece", "pieces", "pair",
    "pairs", "logo", "color", "colour", "black", "white", "purple", "grey", "gray",
    "size", "qty", "quantity", "unit", "price", "amount", "usd", "inr", "cny",
}

# Country name / alias → ISO2 key in countries.json
COUNTRY_ALIASES: dict[str, str] = {
    "in": "IN", "ind": "IN", "india": "IN", "bharat": "IN",
    "us": "US", "usa": "US", "united states": "US", "united states of america": "US",
    "america": "US",
    "cn": "CN", "chn": "CN", "china": "CN", "prc": "CN", "people's republic of china": "CN",
    "eu": "EU", "european union": "EU", "europe": "EU",
    "de": "DE", "deu": "DE", "germany": "DE", "deutschland": "DE",
    "fr": "FR", "fra": "FR", "france": "FR",
    "nl": "NL", "nld": "NL", "netherlands": "NL", "holland": "NL",
    "it": "IT", "ita": "IT", "italy": "IT",
    "es": "ES", "esp": "ES", "spain": "ES",
    "be": "BE", "bel": "BE", "belgium": "BE",
    "ie": "IE", "irl": "IE", "ireland": "IE",
    "pl": "PL", "pol": "PL", "poland": "PL",
    "at": "AT", "aut": "AT", "austria": "AT",
    "se": "SE", "swe": "SE", "sweden": "SE",
    "dk": "DK", "dnk": "DK", "denmark": "DK",
    "fi": "FI", "fin": "FI", "finland": "FI",
    "pt": "PT", "prt": "PT", "portugal": "PT",
    "gr": "GR", "grc": "GR", "greece": "GR",
    "cz": "CZ", "cze": "CZ", "czechia": "CZ", "czech republic": "CZ",
    "ro": "RO", "rou": "RO", "romania": "RO",
    "hu": "HU", "hun": "HU", "hungary": "HU",
}


def digits_only(value: str) -> str:
    return re.sub(r"\D+", "", value or "")


def looks_like_sku(value: str) -> bool:
    s = (value or "").strip()
    if not s:
        return False
    if re.fullmatch(r"[A-Za-z]{1,6}\d{2,}[-/]?\d*", s):
        return True
    if re.search(r"[A-Za-z]", s) and re.search(r"\d", s) and not re.fullmatch(
        r"\d{6,10}", digits_only(s)
    ):
        return True
    return False


def tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9%]+", (text or "").lower())
    out: set[str] = set()
    for w in words:
        if w in STOPWORDS or len(w) < 2:
            continue
        out.add(w)
        if w.endswith("s") and len(w) > 3 and w[:-1] not in STOPWORDS:
            out.add(w[:-1])
    return out


def load_countries() -> dict[str, Any]:
    return json.loads(COUNTRIES_PATH.read_text(encoding="utf-8"))


def normalize_destination(raw: str, countries: dict[str, Any]) -> str | None:
    s = (raw or "").strip()
    if not s:
        return None
    key = COUNTRY_ALIASES.get(s.lower())
    if key and key in countries:
        return key
    upper = s.upper()
    if upper in countries:
        return upper
    # try first token / strip punctuation
    cleaned = re.sub(r"[^A-Za-z ]+", " ", s).strip().lower()
    key = COUNTRY_ALIASES.get(cleaned)
    if key and key in countries:
        return key
    return None


def pack_path(meta: dict[str, Any]) -> Path:
    rel = meta.get("file") or f"packs/{meta['pack']}/tariff.json"
    return DATA / rel


def load_pack(meta: dict[str, Any]) -> dict[str, Any]:
    path = pack_path(meta)
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or "rows" not in raw:
        raise SystemExit(f"Invalid tariff pack: {path}")
    return raw


def load_hs6_core() -> list[dict[str, Any]]:
    if not HS6_CORE_PATH.is_file():
        return []
    raw = json.loads(HS6_CORE_PATH.read_text(encoding="utf-8"))
    return list(raw.get("rows") or [])


def index_pack(pack: dict[str, Any], leaf_digits: int) -> dict[str, Any]:
    by_code: dict[str, dict[str, Any]] = {}
    under_hs6: dict[str, list[dict[str, Any]]] = {}
    # merge hs6-core first (parents for scoring)
    for row in load_hs6_core():
        code = str(row.get("code") or "")
        if code.isdigit():
            by_code[code] = row
    for row in pack.get("rows") or []:
        code = str(row.get("code") or "")
        if not code.isdigit():
            continue
        by_code[code] = row
        digits = int(row.get("digits") or len(code))
        if digits == leaf_digits or len(code) == leaf_digits:
            hs6 = str(row.get("hs6") or code[:6])
            under_hs6.setdefault(hs6, []).append(row)
    return {
        "by_code": by_code,
        "under_hs6": under_hs6,
        "leaf_digits": leaf_digits,
    }


def extract_facts(description: str, answers: dict[str, Any]) -> dict[str, Any]:
    text = (description or "").lower()
    facts: dict[str, Any] = {}
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
    if any(k in text for k in ("knitted", "knit", "crocheted", "jersey")):
        facts["construction"] = "knitted"
    elif any(k in text for k in ("woven", "weaving", "denim")):
        facts["construction"] = "woven"
    elif "spandex" in text or "elastane" in text or "lycra" in text:
        if any(k in text for k in ("legging", "sportswear", "activewear", "yoga")):
            facts["construction_hint"] = "knitted"
    if any(
        k in text
        for k in ("polyester", "nylon", "acrylic", "spandex", "elastane", "lycra", "synthetic")
    ):
        facts["fibre"] = "synthetic"
    elif "cotton" in text:
        facts["fibre"] = "cotton"
    elif any(k in text for k in ("wool", "cashmere", "merino")):
        facts["fibre"] = "wool"
    elif "silk" in text:
        facts["fibre"] = "silk"
    elif any(k in text for k in ("viscose", "rayon", "modal", "artificial fibre", "artificial fiber")):
        facts["fibre"] = "artificial"
    if any(k in text for k in ("women", "woman", "girls", "girl", "ladies", "lady", "womens", "women's")):
        facts["gender"] = "women"
    elif any(k in text for k in ("men", "man", "boys", "boy", "mens", "men's")):
        facts["gender"] = "men"
    elif any(k in text for k in ("unisex", "kids", "infant", "baby")):
        facts["gender"] = "other"
    for key in ("garment", "construction", "fibre", "gender", "product", "material", "destination"):
        if key in answers and answers[key] not in (None, "", "unknown"):
            facts[key] = str(answers[key]).strip().lower()
    return facts


def apparel_questions(facts: dict[str, Any]) -> list[dict[str, Any]]:
    qs: list[dict[str, Any]] = []
    if "garment" not in facts:
        qs.append(
            {
                "id": "garment",
                "prompt": "What type of apparel is this?",
                "options": [
                    "leggings", "trousers", "skirt", "dress", "jacket", "suit",
                    "shirt", "tshirt", "blouse", "sweater", "hosiery", "other",
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
    garment = facts.get("garment")
    if garment in {"leggings", "trousers", "skirt", "dress", "suit", "jacket", "blouse"} and "gender" not in facts:
        qs.append(
            {
                "id": "gender",
                "prompt": "Is this women's/girls', men's/boys', or other?",
                "options": ["women", "men", "other", "unknown"],
            }
        )
    return qs


def resolve_apparel_hs6(facts: dict[str, Any]) -> str | None:
    garment = facts.get("garment")
    construction = facts.get("construction")
    fibre = facts.get("fibre")
    gender = facts.get("gender")
    if not garment or not construction or not fibre:
        return None
    if construction == "unknown" or fibre == "unknown":
        return None
    if garment == "hosiery":
        if fibre == "synthetic":
            return "611596" if construction == "knitted" else None
        if fibre == "cotton":
            return "611595"
        return "611599"
    if gender in (None, "unknown"):
        if garment in {"leggings", "trousers", "skirt", "dress", "suit", "jacket", "blouse"}:
            return None
        gender = "other"
    knit = construction == "knitted"
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
    if garment in {"leggings", "trousers"} and gender == "men":
        if knit:
            return {"synthetic": "610343", "cotton": "610342", "wool": "610341"}.get(fibre)
        return {"synthetic": "620343", "cotton": "620342", "wool": "620341"}.get(fibre)
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


def unique_national(idx: dict[str, Any], hs6: str) -> dict[str, Any] | None:
    children = idx["under_hs6"].get(hs6) or []
    leaf = idx["leaf_digits"]
    if len(children) == 1:
        return children[0]
    if len(children) == 0:
        # table lookup only — never invent pads
        for suffix in ("00", "0000", "000000"):
            cand = hs6 + suffix
            if len(cand) == leaf and cand in idx["by_code"]:
                row = idx["by_code"][cand]
                if int(row.get("digits") or len(cand)) == leaf:
                    return row
        return None
    return None


def resolve_printed(printed: str, idx: dict[str, Any]) -> dict[str, Any] | None:
    if looks_like_sku(printed):
        return None
    dig = digits_only(printed)
    leaf = idx["leaf_digits"]
    if len(dig) < 6 or len(dig) > 10:
        return None
    if len(dig) >= leaf:
        code = dig[:leaf]
        row = idx["by_code"].get(code)
        if row and (int(row.get("digits") or len(row["code"])) == leaf or len(row["code"]) == leaf):
            return row
        return None
    hs6 = dig[:6]
    return unique_national(idx, hs6)


def score_generic(
    description: str, facts: dict[str, Any], idx: dict[str, Any]
) -> list[tuple[float, dict[str, Any]]]:
    tokens = tokenize(description)
    for v in facts.values():
        if isinstance(v, str):
            tokens |= tokenize(v)
    if not tokens:
        return []
    scored: list[tuple[float, dict[str, Any]]] = []
    candidates = [
        r for r in idx["by_code"].values() if int(r.get("digits") or len(r["code"])) == 6
    ]
    for row in candidates:
        heading_tokens = tokenize(row.get("heading") or "")
        if not heading_tokens:
            continue
        overlap = tokens & heading_tokens
        if not overlap:
            continue
        score = len(overlap) / max(3, len(heading_tokens) ** 0.5)
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
        "apparel", "garment", "clothing", "wear", "legging", "skirt", "trouser",
        "shirt", "dress", "jacket", "blouse", "sweater", "polyester", "spandex", "cotton",
    )
    return any(k in text for k in keywords)


def public_facts(facts: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in facts.items() if not str(k).endswith("_hint")}


def result(
    *,
    source: str,
    facts: dict[str, Any],
    questions: list[dict[str, Any]],
    reason: str,
    code: str | None = None,
    heading: str | None = None,
) -> dict[str, Any]:
    return {
        "code": code,
        "heading": heading,
        "source": source,
        "facts": public_facts(facts),
        "questions": questions,
        "reason": reason,
    }


def leaf_code(row: dict[str, Any], leaf_digits: int) -> str:
    code = row.get("hts10") or row.get("hsn8") or row["code"]
    return code if len(code) == leaf_digits else code[:leaf_digits]


def classify_item(item: dict[str, Any], idx: dict[str, Any], label: str) -> dict[str, Any]:
    description = str(item.get("description") or "")
    printed = str(item.get("printed") or "")
    answers_raw = item.get("answers") or {}
    answers = {str(k): v for k, v in answers_raw.items()} if isinstance(answers_raw, dict) else {}
    leaf = idx["leaf_digits"]

    if printed.strip():
        if looks_like_sku(printed):
            return result(
                source="needs_questions",
                facts={},
                questions=[],
                reason=f"printed value looks like a SKU, not a tariff code: {printed!r}",
            )
        row = resolve_printed(printed, idx)
        if row:
            code = leaf_code(row, leaf)
            return result(
                source="printed",
                facts={},
                questions=[],
                reason=f"validated printed code against {label}",
                code=code if len(code) == leaf else None,
                heading=row.get("heading"),
            )
        return result(
            source="needs_questions",
            facts={},
            questions=[],
            reason=f"printed digits not found / not unique in {label}",
        )

    facts = extract_facts(description, answers)

    if ambiguous_description(description) and not answers:
        return result(
            source="needs_questions",
            facts=facts,
            questions=[
                {
                    "id": "product",
                    "prompt": "What is the specific product (not 'parts'/'set'/'accessories')?",
                    "options": [],
                }
            ],
            reason="description too vague for tariff classification",
        )

    if is_apparelish(facts, description):
        qs = apparel_questions(facts)
        if qs:
            return result(
                source="needs_questions",
                facts=facts,
                questions=qs,
                reason=f"missing apparel facts required for {label} (HS 61/62)",
            )
        hs6 = resolve_apparel_hs6(facts)
        if not hs6:
            return result(
                source="needs_questions",
                facts=facts,
                questions=[],
                reason="could not map apparel facts to a unique HS-6 heading",
            )
        row = unique_national(idx, hs6)
        if not row:
            children = idx["under_hs6"].get(hs6) or []
            if len(children) > 1:
                opts = [leaf_code(c, leaf) for c in children[:12]]
                return result(
                    source="needs_questions",
                    facts=facts,
                    questions=[
                        {
                            "id": "code_choice",
                            "prompt": f"Multiple {leaf}-digit lines under {hs6} in {label}. Which applies?",
                            "options": opts,
                        }
                    ],
                    reason=f"HS-6 {hs6} has {len(children)} national lines",
                )
            return result(
                source="needs_questions",
                facts=facts,
                questions=[],
                reason=f"no {leaf}-digit tariff line found under HS-6 {hs6}",
            )
        if "code_choice" in answers:
            chosen = digits_only(str(answers["code_choice"]))
            allowed = {leaf_code(c, leaf) for c in (idx["under_hs6"].get(hs6) or [])}
            if chosen in allowed:
                crow = idx["by_code"][chosen]
                return result(
                    source="classified",
                    facts=facts,
                    questions=[],
                    reason="user selected national line under apparel HS-6",
                    code=chosen,
                    heading=crow.get("heading"),
                )
        code = leaf_code(row, leaf)
        return result(
            source="classified",
            facts=facts,
            questions=[],
            reason=f"apparel facts → HS-6 {hs6} → unique {label} code",
            code=code,
            heading=row.get("heading"),
        )

    ranked = score_generic(description, facts, idx)
    if not ranked:
        return result(
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
    if second_score > 0 and (top_score - second_score) < 0.35:
        return result(
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
        return result(
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
    row = unique_national(idx, hs6)
    if not row:
        children = idx["under_hs6"].get(hs6) or []
        if len(children) > 1:
            return result(
                source="needs_questions",
                facts=facts,
                questions=[
                    {
                        "id": "code_choice",
                        "prompt": f"Multiple {leaf}-digit lines under {hs6}. Which applies?",
                        "options": [leaf_code(c, leaf) for c in children[:12]],
                    }
                ],
                reason=f"HS-6 {hs6} is not unique at {leaf} digits",
            )
        return result(
            source="needs_questions",
            facts=facts,
            questions=[],
            reason=f"no {leaf}-digit line under HS-6 {hs6}",
        )
    code = leaf_code(row, leaf)
    return result(
        source="classified",
        facts=facts,
        questions=[],
        reason=f"token match → HS-6 {hs6} → unique {label} code",
        code=code,
        heading=row.get("heading"),
    )


def classify_payload(payload: dict[str, Any]) -> dict[str, Any]:
    countries = load_countries()
    dest_raw = str(payload.get("destination") or "")
    answers0 = {}
    items_in = payload.get("items")
    if isinstance(items_in, list) and items_in and isinstance(items_in[0], dict):
        answers0 = items_in[0].get("answers") or {}

    dest = normalize_destination(dest_raw, countries)
    # allow destination override via answers
    if isinstance(answers0, dict) and answers0.get("destination"):
        dest = normalize_destination(str(answers0["destination"]), countries) or dest

    if not dest:
        return {
            "destination": None,
            "digits": None,
            "items": [
                result(
                    source="needs_questions",
                    facts={},
                    questions=[
                        {
                            "id": "destination",
                            "prompt": "Importer country is unsupported or missing. Which import tariff should we use?",
                            "options": ["IN", "US", "CN", "EU"],
                        }
                    ],
                    reason="destination country not recognized; need importer country for national tariff",
                )
            ],
        }

    meta = countries[dest]
    pack_id = meta["pack"]
    # Resolve to pack country key for leaf mins (IN/US/CN/EU)
    pack_key = pack_id
    leaf_digits = int(meta["digits"])
    label = meta.get("label") or pack_id
    pack = load_pack(meta)
    idx = index_pack(pack, leaf_digits)

    if not isinstance(items_in, list) or not items_in:
        return {"error": "items must be a non-empty array", "destination": dest, "digits": leaf_digits, "items": []}

    return {
        "destination": dest,
        "pack": pack_key,
        "digits": leaf_digits,
        "items": [
            classify_item(it if isinstance(it, dict) else {}, idx, label) for it in items_in
        ],
    }


def run_selftest() -> int:
    countries = load_countries()
    failures: list[str] = []

    for iso in ("IN", "US", "CN", "EU"):
        if iso not in countries:
            failures.append(f"missing countries.json entry {iso}")
            continue
        meta = countries[iso]
        path = pack_path(meta)
        if not path.is_file():
            failures.append(f"missing pack file {path}")
            continue
        pack = load_pack(meta)
        leaf = int(meta["digits"])
        n_leaf = sum(
            1
            for r in pack.get("rows") or []
            if int(r.get("digits") or len(str(r.get("code") or ""))) == leaf
            or len(str(r.get("code") or "")) == leaf
        )
        floor = MIN_LEAF.get(iso, 1000)
        if n_leaf < floor:
            failures.append(f"{iso} leaf count {n_leaf} < {floor}")
        idx = index_pack(pack, leaf)
        # apparel stems must exist
        for hs6 in ("610463", "610453"):
            kids = idx["under_hs6"].get(hs6) or []
            if not kids:
                failures.append(f"{iso}: no national lines under {hs6}")

    # IN parity cases
    cases = [
        {
            "name": "IN leggings asks",
            "payload": {
                "destination": "IN",
                "items": [{"description": "Leggings, 78% polyester 22% spandex", "printed": "", "answers": {}}],
            },
            "expect_source": "needs_questions",
        },
        {
            "name": "IN leggings classified",
            "payload": {
                "destination": "IN",
                "items": [
                    {
                        "description": "Leggings, 78% polyester 22% spandex",
                        "printed": "",
                        "answers": {"construction": "knitted", "gender": "women"},
                    }
                ],
            },
            "expect_code": "61046300",
        },
        {
            "name": "IN skirt classified",
            "payload": {
                "destination": "IN",
                "items": [
                    {
                        "description": "Skirt, polyester spandex",
                        "printed": "",
                        "answers": {"construction": "knitted", "gender": "women"},
                    }
                ],
            },
            "expect_code": "61045300",
        },
        {
            "name": "IN printed HS",
            "payload": {
                "destination": "India",
                "items": [{"description": "leggings", "printed": "HS 6104.63", "answers": {}}],
            },
            "expect_code": "61046300",
            "expect_source": "printed",
        },
        {
            "name": "SKU rejected",
            "payload": {
                "destination": "IN",
                "items": [{"description": "x", "printed": "VG0523-4", "answers": {}}],
            },
            "expect_code": None,
        },
        {
            "name": "US apparel asks or classifies",
            "payload": {
                "destination": "US",
                "items": [
                    {
                        "description": "Leggings, 78% polyester 22% spandex",
                        "printed": "",
                        "answers": {"construction": "knitted", "gender": "women"},
                    }
                ],
            },
            "expect_prefix": "610463",
            "expect_digits": 10,
        },
        {
            "name": "EU apparel",
            "payload": {
                "destination": "DE",
                "items": [
                    {
                        "description": "Leggings, 78% polyester 22% spandex",
                        "printed": "",
                        "answers": {"construction": "knitted", "gender": "women"},
                    }
                ],
            },
            "expect_prefix": "610463",
            "expect_digits": 8,
        },
        {
            "name": "CN apparel",
            "payload": {
                "destination": "China",
                "items": [
                    {
                        "description": "Leggings, 78% polyester 22% spandex",
                        "printed": "",
                        "answers": {"construction": "knitted", "gender": "women"},
                    }
                ],
            },
            "expect_prefix": "610463",
            "expect_digits": 10,
        },
        {
            "name": "unknown country asks",
            "payload": {
                "destination": "Brazil",
                "items": [{"description": "widgets", "printed": "", "answers": {}}],
            },
            "expect_source": "needs_questions",
        },
    ]

    for case in cases:
        out = classify_payload(case["payload"])
        item = (out.get("items") or [{}])[0]
        name = case["name"]
        if "expect_source" in case and item.get("source") != case["expect_source"]:
            failures.append(f"{name}: source {item.get('source')!r} != {case['expect_source']!r}")
        if "expect_code" in case and item.get("code") != case["expect_code"]:
            failures.append(f"{name}: code {item.get('code')!r} != {case['expect_code']!r}")
        if "expect_prefix" in case:
            code = item.get("code") or ""
            if item.get("source") == "needs_questions" and item.get("questions"):
                # OK if multiple national lines — must ask
                qids = {q["id"] for q in item["questions"]}
                if "code_choice" not in qids and not code.startswith(case["expect_prefix"]):
                    failures.append(f"{name}: expected code_choice or prefix {case['expect_prefix']}, got {item}")
            elif not code.startswith(case["expect_prefix"]):
                failures.append(f"{name}: code {code!r} missing prefix {case['expect_prefix']}")
            if code and "expect_digits" in case and len(code) != case["expect_digits"]:
                failures.append(f"{name}: len {len(code)} != {case['expect_digits']}")

    print(json.dumps({"ok": not failures, "failures": failures}, indent=2))
    return 1 if failures else 0


def main(argv: list[str]) -> int:
    if "--selftest" in argv:
        return run_selftest()
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
    out = classify_payload(payload)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if "error" not in out else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
