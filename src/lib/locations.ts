export type TransportLocation = {
  code: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
};

/** Major seaports used for ocean origin / destination selection. */
export const PORTS: TransportLocation[] = [
  {
    code: "INNSA",
    name: "Jawaharlal Nehru (Nhava Sheva)",
    city: "Mumbai",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "INMAA",
    name: "Chennai Port",
    city: "Chennai",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "INMUN",
    name: "Mundra Port",
    city: "Mundra",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "INKAT",
    name: "Kolkata Port",
    city: "Kolkata",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "CNNGB",
    name: "Ningbo-Zhoushan Port",
    city: "Ningbo",
    country: "China",
    countryCode: "CN",
  },
  {
    code: "CNSHA",
    name: "Shanghai Port",
    city: "Shanghai",
    country: "China",
    countryCode: "CN",
  },
  {
    code: "CNSZX",
    name: "Shenzhen Port",
    city: "Shenzhen",
    country: "China",
    countryCode: "CN",
  },
  {
    code: "HKHKG",
    name: "Hong Kong Port",
    city: "Hong Kong",
    country: "Hong Kong",
    countryCode: "HK",
  },
  {
    code: "SGSIN",
    name: "Port of Singapore",
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
  },
  {
    code: "KRPUS",
    name: "Busan Port",
    city: "Busan",
    country: "South Korea",
    countryCode: "KR",
  },
  {
    code: "JPUKB",
    name: "Kobe Port",
    city: "Kobe",
    country: "Japan",
    countryCode: "JP",
  },
  {
    code: "JPYOK",
    name: "Yokohama Port",
    city: "Yokohama",
    country: "Japan",
    countryCode: "JP",
  },
  {
    code: "NLRTM",
    name: "Port of Rotterdam",
    city: "Rotterdam",
    country: "Netherlands",
    countryCode: "NL",
  },
  {
    code: "DEHAM",
    name: "Port of Hamburg",
    city: "Hamburg",
    country: "Germany",
    countryCode: "DE",
  },
  {
    code: "BEANR",
    name: "Port of Antwerp",
    city: "Antwerp",
    country: "Belgium",
    countryCode: "BE",
  },
  {
    code: "GBFXT",
    name: "Felixstowe Port",
    city: "Felixstowe",
    country: "United Kingdom",
    countryCode: "GB",
  },
  {
    code: "USLAX",
    name: "Port of Los Angeles",
    city: "Los Angeles",
    country: "United States",
    countryCode: "US",
  },
  {
    code: "USNYC",
    name: "Port of New York / New Jersey",
    city: "New York",
    country: "United States",
    countryCode: "US",
  },
  {
    code: "USSAV",
    name: "Port of Savannah",
    city: "Savannah",
    country: "United States",
    countryCode: "US",
  },
  {
    code: "AEJEA",
    name: "Jebel Ali Port",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
  },
  {
    code: "AUMEL",
    name: "Port of Melbourne",
    city: "Melbourne",
    country: "Australia",
    countryCode: "AU",
  },
  {
    code: "BRSSZ",
    name: "Port of Santos",
    city: "Santos",
    country: "Brazil",
    countryCode: "BR",
  },
];

/** Major airports used for air origin / destination selection. */
export const AIRPORTS: TransportLocation[] = [
  {
    code: "BOM",
    name: "Chhatrapati Shivaji Maharaj International",
    city: "Mumbai",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "DEL",
    name: "Indira Gandhi International",
    city: "Delhi",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "MAA",
    name: "Chennai International",
    city: "Chennai",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "BLR",
    name: "Kempegowda International",
    city: "Bengaluru",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "HYD",
    name: "Rajiv Gandhi International",
    city: "Hyderabad",
    country: "India",
    countryCode: "IN",
  },
  {
    code: "PVG",
    name: "Shanghai Pudong International",
    city: "Shanghai",
    country: "China",
    countryCode: "CN",
  },
  {
    code: "PEK",
    name: "Beijing Capital International",
    city: "Beijing",
    country: "China",
    countryCode: "CN",
  },
  {
    code: "CAN",
    name: "Guangzhou Baiyun International",
    city: "Guangzhou",
    country: "China",
    countryCode: "CN",
  },
  {
    code: "HKG",
    name: "Hong Kong International",
    city: "Hong Kong",
    country: "Hong Kong",
    countryCode: "HK",
  },
  {
    code: "SIN",
    name: "Singapore Changi",
    city: "Singapore",
    country: "Singapore",
    countryCode: "SG",
  },
  {
    code: "ICN",
    name: "Incheon International",
    city: "Seoul",
    country: "South Korea",
    countryCode: "KR",
  },
  {
    code: "NRT",
    name: "Narita International",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
  },
  {
    code: "HND",
    name: "Haneda Airport",
    city: "Tokyo",
    country: "Japan",
    countryCode: "JP",
  },
  {
    code: "AMS",
    name: "Amsterdam Schiphol",
    city: "Amsterdam",
    country: "Netherlands",
    countryCode: "NL",
  },
  {
    code: "FRA",
    name: "Frankfurt Airport",
    city: "Frankfurt",
    country: "Germany",
    countryCode: "DE",
  },
  {
    code: "LHR",
    name: "London Heathrow",
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
  },
  {
    code: "CDG",
    name: "Paris Charles de Gaulle",
    city: "Paris",
    country: "France",
    countryCode: "FR",
  },
  {
    code: "LAX",
    name: "Los Angeles International",
    city: "Los Angeles",
    country: "United States",
    countryCode: "US",
  },
  {
    code: "JFK",
    name: "John F. Kennedy International",
    city: "New York",
    country: "United States",
    countryCode: "US",
  },
  {
    code: "ORD",
    name: "O'Hare International",
    city: "Chicago",
    country: "United States",
    countryCode: "US",
  },
  {
    code: "DXB",
    name: "Dubai International",
    city: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
  },
  {
    code: "SYD",
    name: "Sydney Kingsford Smith",
    city: "Sydney",
    country: "Australia",
    countryCode: "AU",
  },
  {
    code: "GRU",
    name: "São Paulo/Guarulhos International",
    city: "São Paulo",
    country: "Brazil",
    countryCode: "BR",
  },
];

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Common alternate city spellings → canonical city used in the lists. */
const CITY_ALIASES: Record<string, string[]> = {
  mumbai: ["bombay", "navi mumbai", "nhava sheva", "jnpt"],
  bengaluru: ["bangalore"],
  delhi: ["new delhi", "ncr"],
  chennai: ["madras"],
  kolkata: ["calcutta"],
  "hong kong": ["hk"],
  "los angeles": ["la", "long beach"],
  "new york": ["nyc", "new jersey", "newark"],
  dubai: ["jebel ali"],
  "sao paulo": ["sao paulo", "guarulhos"],
  seoul: ["incheon"],
  tokyo: ["narita", "haneda"],
  london: ["heathrow"],
  paris: ["charles de gaulle", "cdg"],
  amsterdam: ["schiphol"],
  sydney: ["kingsford smith"],
};

function cityMatches(locationCity: string, inputCity: string): boolean {
  const city = normalizeText(locationCity);
  const input = normalizeText(inputCity);
  if (!input) return false;
  if (city === input || city.includes(input) || input.includes(city)) {
    return true;
  }
  const aliases = CITY_ALIASES[city] ?? [];
  return aliases.some(
    (alias) =>
      alias === input || input.includes(alias) || alias.includes(input),
  );
}

function countryMatches(loc: TransportLocation, country: string): boolean {
  const needle = normalizeText(country);
  if (!needle) return false;
  return (
    normalizeText(loc.country) === needle ||
    normalizeText(loc.countryCode) === needle ||
    normalizeText(loc.country).includes(needle) ||
    needle.includes(normalizeText(loc.country))
  );
}

/** Prefer locations matching the party country; fall back to the full list. */
export function locationsForCountry(
  list: TransportLocation[],
  country: string,
): TransportLocation[] {
  const needle = normalizeText(country);
  if (!needle) return list;

  const matched = list.filter((loc) => countryMatches(loc, country));
  return matched.length > 0 ? matched : list;
}

/**
 * Pick the best port/airport for an address.
 * Priority: city match (within country if set) → first country match → none.
 */
export function suggestLocation(
  list: TransportLocation[],
  address: { city?: string; country?: string; stateProvince?: string },
): TransportLocation | undefined {
  const city = address.city?.trim() ?? "";
  const country = address.country?.trim() ?? "";
  const state = address.stateProvince?.trim() ?? "";

  if (!city && !country && !state) return undefined;

  const inCountry = country
    ? list.filter((loc) => countryMatches(loc, country))
    : list;
  const pool = inCountry.length > 0 ? inCountry : list;

  const cityHit = pool.find(
    (loc) =>
      cityMatches(loc.city, city) ||
      (state ? cityMatches(loc.city, state) : false),
  );
  if (cityHit) return cityHit;

  // No city match — if we have a country filter, take the first for that country
  if (country && inCountry.length > 0) return inCountry[0];

  return undefined;
}

export function findLocation(
  list: TransportLocation[],
  code: string,
): TransportLocation | undefined {
  return list.find((loc) => loc.code === code);
}

export function formatLocationLabel(loc: TransportLocation) {
  return `${loc.code} — ${loc.name}, ${loc.city}`;
}
