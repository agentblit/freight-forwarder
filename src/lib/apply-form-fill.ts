import type {
  AddressBlock,
  AirPackage,
  BookingFormState,
  OceanPackage,
  PartyDetails,
  ShipmentItem,
} from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function mergeAddress(
  base: AddressBlock,
  patch: unknown,
): AddressBlock {
  if (!isRecord(patch)) return base;
  return {
    addressLine1: asString(patch.addressLine1, base.addressLine1),
    addressLine2: asString(patch.addressLine2, base.addressLine2),
    country: asString(patch.country, base.country),
    stateProvince: asString(patch.stateProvince, base.stateProvince),
    city: asString(patch.city, base.city),
    postalCode: asString(patch.postalCode, base.postalCode),
  };
}

function mergeParty(base: PartyDetails, patch: unknown): PartyDetails {
  if (!isRecord(patch)) return base;
  return {
    companyName: asString(patch.companyName, base.companyName),
    phone: asString(patch.phone, base.phone),
    email: asString(patch.email, base.email),
    address: mergeAddress(base.address, patch.address),
  };
}

function mergeOcean(base: OceanPackage, patch: unknown): OceanPackage {
  if (!isRecord(patch)) return base;
  return {
    containerType: asString(
      patch.containerType,
      base.containerType,
    ) as OceanPackage["containerType"],
    numberOfContainers: asNumber(
      patch.numberOfContainers,
      base.numberOfContainers,
    ),
    cargoWeightPerContainerKg: asNumber(
      patch.cargoWeightPerContainerKg,
      base.cargoWeightPerContainerKg,
    ),
    temperatureControl: asBoolean(
      patch.temperatureControl,
      base.temperatureControl,
    ),
  };
}

function mergeItems(
  base: ShipmentItem[],
  patch: unknown,
): ShipmentItem[] {
  if (!Array.isArray(patch)) return base;
  if (patch.length === 0) return base;

  return patch.map((raw, index) => {
    const prev = base[index];
    const row = isRecord(raw) ? raw : {};
    return {
      id: asString(row.id, prev?.id ?? crypto.randomUUID()),
      description: asString(row.description, prev?.description ?? ""),
      hsCode: asString(row.hsCode, prev?.hsCode ?? ""),
      countryOfManufacture: asString(
        row.countryOfManufacture,
        prev?.countryOfManufacture ?? "",
      ),
      quantity: asNumber(row.quantity, prev?.quantity ?? 1),
      unit: asString(row.unit, prev?.unit ?? "PCS"),
      weightKg: asNumber(row.weightKg, prev?.weightKg ?? 0),
      customsValueCny: asNumber(
        row.customsValueCny,
        prev?.customsValueCny ?? 0,
      ),
    };
  });
}

function mergeAirPackages(
  base: AirPackage[],
  patch: unknown,
): AirPackage[] {
  if (!Array.isArray(patch)) return base;
  if (patch.length === 0) return base;

  return patch.map((raw, index) => {
    const prev = base[index];
    const row = isRecord(raw) ? raw : {};
    return {
      id: asString(row.id, prev?.id ?? crypto.randomUUID()),
      packaging: asString(
        row.packaging,
        prev?.packaging ?? "standard",
      ) as AirPackage["packaging"],
      numberOfPackages: asNumber(
        row.numberOfPackages,
        prev?.numberOfPackages ?? 1,
      ),
      weightPerPackageKg: asNumber(
        row.weightPerPackageKg,
        prev?.weightPerPackageKg ?? 0,
      ),
      lengthCm: asNumber(row.lengthCm, prev?.lengthCm ?? 0),
      widthCm: asNumber(row.widthCm, prev?.widthCm ?? 0),
      heightCm: asNumber(row.heightCm, prev?.heightCm ?? 0),
    };
  });
}

export type FormFillApplyResult = {
  form: BookingFormState;
  /** True when SSE provided an explicit origin code. */
  originFromFill: boolean;
  /** True when SSE provided an explicit destination code. */
  destinationFromFill: boolean;
};

/**
 * Merge form-filling-connector `form_data.data` into booking form state.
 * Only keys present in `data` are applied (partial updates).
 */
export function applyFormFillData(
  prev: BookingFormState,
  data: unknown,
): FormFillApplyResult {
  if (!isRecord(data) || Object.keys(data).length === 0) {
    return {
      form: prev,
      originFromFill: false,
      destinationFromFill: false,
    };
  }

  const next: BookingFormState = { ...prev };
  let originFromFill = false;
  let destinationFromFill = false;

  if ("exporter" in data) next.exporter = mergeParty(prev.exporter, data.exporter);
  if ("importer" in data) next.importer = mergeParty(prev.importer, data.importer);
  if ("items" in data) next.items = mergeItems(prev.items, data.items);
  if ("ocean" in data) next.ocean = mergeOcean(prev.ocean, data.ocean);
  if ("airPackages" in data) {
    next.airPackages = mergeAirPackages(prev.airPackages, data.airPackages);
  }
  if ("cargoReadyDate" in data) {
    next.cargoReadyDate = asString(data.cargoReadyDate, prev.cargoReadyDate);
  }
  if ("mode" in data) {
    const mode = asString(data.mode, prev.mode).toLowerCase();
    if (mode === "air" || mode === "ocean") next.mode = mode;
  }
  if ("originCode" in data) {
    next.originCode = asString(data.originCode, prev.originCode);
    originFromFill = true;
  }
  if ("destinationCode" in data) {
    next.destinationCode = asString(
      data.destinationCode,
      prev.destinationCode,
    );
    destinationFromFill = true;
  }

  return { form: next, originFromFill, destinationFromFill };
}
