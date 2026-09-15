/**
 * Heuristic dangerous-goods detector.
 * Flags products from description / HS code and returns extra upload docs.
 */

export type DangerousGoodsMatch = {
  hazardClass: string;
  reason: string;
  requiredDocuments: string[];
};

type Rule = {
  keywords: string[];
  hsPrefixes: string[];
  hazardClass: string;
  reason: string;
  requiredDocuments: string[];
};

const RULES: Rule[] = [
  {
    keywords: ["lithium", "battery", "li-ion", "li ion", "power bank"],
    hsPrefixes: ["8506", "8507"],
    hazardClass: "Class 9 — Lithium batteries",
    reason: "Lithium batteries require air/ocean dangerous goods packing instructions.",
    requiredDocuments: [
      "Dangerous Goods Declaration (DGD)",
      "UN 38.3 Test Summary",
      "Battery packing certificate",
    ],
  },
  {
    keywords: ["dry ice", "co2 solid", "carbon dioxide solid"],
    hsPrefixes: ["2811"],
    hazardClass: "Class 9 — Dry ice",
    reason: "Dry ice is regulated as a refrigerant hazard.",
    requiredDocuments: [
      "Dry ice handling declaration",
      "Net dry ice weight statement",
    ],
  },
  {
    keywords: ["flammable", "gasoline", "petrol", "solvent", "paint thinner", "ethanol", "acetone"],
    hsPrefixes: ["2710", "2905", "3208"],
    hazardClass: "Class 3 — Flammable liquids",
    reason: "Flammable liquid indicators detected in cargo description or HS code.",
    requiredDocuments: [
      "MSDS / SDS",
      "Dangerous Goods Declaration (DGD)",
      "Flash point certificate",
    ],
  },
  {
    keywords: ["corrosive", "acid", "bleach", "sodium hydroxide", "sulfuric"],
    hsPrefixes: ["2806", "2807", "2815"],
    hazardClass: "Class 8 — Corrosives",
    reason: "Corrosive substance indicators detected.",
    requiredDocuments: ["MSDS / SDS", "Dangerous Goods Declaration (DGD)"],
  },
  {
    keywords: ["explosive", "ammunition", "firework", "detonator"],
    hsPrefixes: ["3601", "3602", "3604"],
    hazardClass: "Class 1 — Explosives",
    reason: "Explosive-related product indicators detected.",
    requiredDocuments: [
      "Explosives transport permit",
      "Dangerous Goods Declaration (DGD)",
      "Competent authority approval",
    ],
  },
  {
    keywords: ["pesticide", "insecticide", "toxic", "poison", "cyanide"],
    hsPrefixes: ["3808", "2903"],
    hazardClass: "Class 6.1 — Toxic substances",
    reason: "Toxic / pesticide indicators detected.",
    requiredDocuments: ["MSDS / SDS", "Dangerous Goods Declaration (DGD)"],
  },
  {
    keywords: ["chemical", "oxidizer", "peroxide", "chlorate"],
    hsPrefixes: ["2847", "2909"],
    hazardClass: "Class 5 — Oxidizing substances",
    reason: "Oxidizing chemical indicators detected.",
    requiredDocuments: ["MSDS / SDS", "Dangerous Goods Declaration (DGD)"],
  },
  {
    keywords: ["gas cylinder", "compressed gas", "aerosol", "propane", "butane"],
    hsPrefixes: ["2711", "2804"],
    hazardClass: "Class 2 — Gases",
    reason: "Compressed / flammable gas indicators detected.",
    requiredDocuments: [
      "Gas cylinder inspection certificate",
      "Dangerous Goods Declaration (DGD)",
    ],
  },
];

export function detectDangerousGoods(input: {
  items: Array<{ description: string; hsCode: string }>;
}): DangerousGoodsMatch[] {
  const text = input.items
    .map((i) => `${i.description} ${i.hsCode}`)
    .join(" ")
    .toLowerCase();

  const hsCodes = input.items.map((i) => i.hsCode.replace(/\D/g, ""));

  const matches: DangerousGoodsMatch[] = [];

  for (const rule of RULES) {
    const keywordHit = rule.keywords.some((k) => text.includes(k));
    const hsHit = rule.hsPrefixes.some((prefix) =>
      hsCodes.some((hs) => hs.startsWith(prefix)),
    );
    if (keywordHit || hsHit) {
      matches.push({
        hazardClass: rule.hazardClass,
        reason: rule.reason,
        requiredDocuments: rule.requiredDocuments,
      });
    }
  }

  return matches;
}

export function requiredDocumentsForBooking(input: {
  items: Array<{ description: string; hsCode: string }>;
  airPackages?: Array<{ packaging: string }>;
}): string[] {
  const docs = new Set<string>(["Commercial invoice", "IEC code"]);
  const hazards = detectDangerousGoods(input);
  for (const h of hazards) {
    for (const d of h.requiredDocuments) docs.add(d);
  }
  if (input.airPackages?.some((p) => p.packaging === "lithium_batteries")) {
    docs.add("Dangerous Goods Declaration (DGD)");
    docs.add("UN 38.3 Test Summary");
    docs.add("Battery packing certificate");
  }
  if (input.airPackages?.some((p) => p.packaging === "dry_ice")) {
    docs.add("Dry ice handling declaration");
    docs.add("Net dry ice weight statement");
  }
  if (input.airPackages?.some((p) => p.packaging === "non_standard")) {
    docs.add("Non-standard packaging approval");
  }
  return Array.from(docs);
}
