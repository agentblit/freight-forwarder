---
name: hs-tariff
description: Classify import tariff codes by importer country (India HSN-8, US HTS-10, China HS-10, EU CN-8) from a line-item description, or return clarifying questions when facts are missing. Use when filling hsCode / HSN / HTS / commodity code for customs on a booking form. Destination comes from the importer country — never invent codes.
---

# hs-tariff (multi-country import classify-or-ask)

**Importer country drives the schedule.** Output is a national tariff `code` for that destination, or questions to ask. Not a customs ruling.

| Destination | Schedule | Digits |
| --- | --- | --- |
| IN | ITC-HS / HSN | 8 |
| US | HTS | 10 |
| CN | China customs HS | 10 |
| EU (+ DE/FR/…) | Combined Nomenclature | 8 |

## When to use

- Booking form / invoice fill needs `hsCode`
- You know (or just filled) `importer.address.country`
- Never hardcode India — pass the importer’s ISO2 / country name as `destination`

## Do this

```bash
python3 /home/user/skills/hs-tariff/scripts/classify.py <<'EOF'
{
  "destination": "US",
  "items": [{
    "description": "Leggings, 78% polyester 22% spandex",
    "printed": "",
    "answers": {}
  }]
}
EOF
```

Self-test:

```bash
python3 /home/user/skills/hs-tariff/scripts/classify.py --selftest
```

## Rules

1. Set `destination` from **importer** country (e.g. India→`IN`, United States→`US`, Germany→`DE`/`EU`).
2. Run `classify.py` — do **not** invent tariff codes from memory.
3. If `source` is `printed` or `classified` and `code` is set → use that as `hsCode`.
4. If `source` is `needs_questions` → ask **only** `questions[]`, then re-run with `answers`.
5. Never put a SKU in `code`. Never pad zeros yourself.
6. Unsupported country → script asks which supported destination to use, or returns null.

## Output

Top-level: `destination`, `digits`, `items[]`.

Per item: `code`, `heading`, `source` (`printed`|`classified`|`needs_questions`), `facts`, `questions`, `reason`.
