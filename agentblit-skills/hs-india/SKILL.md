---
name: hs-india
description: Classify Indian import HSN (8-digit ITC-HS) from a line-item description, or return clarifying questions when facts are missing. Use when the destination is India and you need hsCode / HSN / tariff / commodity code for customs. Never invent an HSN — run the script.
---

# hs-india (India HSN classify-or-ask)

**Destination: India only.** Output is an **8-digit ITC-HS (HSN)** for import clearance, or a list of questions. This is **not** a CBIC ruling or CHA advice.

## When to use

- Importer / destination is India
- You have a goods description (and optional answers to prior questions)
- You need `hsn8` for a booking form or customs field

## Do this

```bash
python3 /home/user/skills/hs-india/scripts/classify.py <<'EOF'
{
  "destination": "IN",
  "items": [{
    "description": "Leggings, 78% polyester 22% spandex",
    "printed": "",
    "answers": {}
  }]
}
EOF
```

Or:

```bash
python3 /home/user/skills/hs-india/scripts/classify.py --selftest
```

## Rules

1. Run `classify.py` — do **not** invent an HSN from memory.
2. If `source` is `printed` or `classified` and `hsn8` is set → use that 8-digit code.
3. If `source` is `needs_questions` → ask **only** the prompts in `questions[]` (use the given `options` when present). Put answers back under `answers` keyed by `id`, then re-run.
4. Never put a style/SKU (e.g. `VG0523-4`) in `hsn8`.
5. Never pad `00` yourself — only use `hsn8` from the script.
6. If `hsn8` stays null after answers → leave the field empty; do not guess.

## Input

| Field | Meaning |
| --- | --- |
| `destination` | Must be `"IN"` |
| `items[].description` | Line-item text (composition, garment type, etc.) |
| `items[].printed` | Optional digits from an invoice HS/HSN/HTS column |
| `items[].answers` | Map of question `id` → chosen option / value |

## Output (per item)

| Field | Meaning |
| --- | --- |
| `hsn8` | 8-digit Indian HSN, or `null` |
| `heading` | Table description when known |
| `source` | `printed` \| `classified` \| `needs_questions` |
| `facts` | Facts the script extracted |
| `questions` | Ask these next (may be empty) |
| `reason` | Short explanation |

## Data

Tariff rows live in `data/hsn8-in.json` (Indian HSN goods codes + 2/4/6-digit parents). Edition and counts are checked by `--selftest`.
