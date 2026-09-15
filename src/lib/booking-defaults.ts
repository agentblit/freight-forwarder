import type { BookingFormState, PartyDetails } from "@/lib/types";

export const OCEAN_CONTAINER_OPTIONS: Array<{
  value: BookingFormState["ocean"]["containerType"];
  label: string;
  group: string;
}> = [
  { value: "20_dry_standard", label: "20' Dry Standard", group: "Regular sized cargo" },
  { value: "40_dry_standard", label: "40' Dry Standard", group: "Regular sized cargo" },
  { value: "40_dry_high", label: "40' Dry High", group: "Regular sized cargo" },
  { value: "45_dry_high", label: "45' Dry High", group: "Regular sized cargo" },
  { value: "20_tank", label: "20' Tank", group: "Regular sized cargo" },
  { value: "40_tank", label: "40' Tank", group: "Regular sized cargo" },
  { value: "20_reefer_standard", label: "20' Reefer Standard", group: "Reefer container" },
  { value: "40_reefer_high", label: "40' Reefer High", group: "Reefer container" },
  { value: "20_opentop", label: "20' Open Top", group: "In gauge cargo" },
  { value: "40_opentop", label: "40' Open Top", group: "In gauge cargo" },
  { value: "40_opentop_high", label: "40' Open Top High", group: "In gauge cargo" },
  { value: "40_flat_standard", label: "40' Flat Standard", group: "In gauge cargo" },
  { value: "40_flat_high", label: "40' Flat High", group: "In gauge cargo" },
];

const emptyAddress = () => ({
  addressLine1: "",
  addressLine2: "",
  country: "",
  stateProvince: "",
  city: "",
  postalCode: "",
});

const emptyParty = (): PartyDetails => ({
  companyName: "",
  phone: "",
  email: "",
  address: emptyAddress(),
});

export function createEmptyBookingForm(): BookingFormState {
  return {
    exporter: emptyParty(),
    importer: emptyParty(),
    items: [
      {
        id: crypto.randomUUID(),
        description: "",
        hsCode: "",
        countryOfManufacture: "",
        quantity: 1,
        unit: "PCS",
        weightKg: 0,
        customsValueCny: 0,
      },
    ],
    mode: "ocean",
    originCode: "",
    destinationCode: "",
    ocean: {
      containerType: "40_dry_standard",
      numberOfContainers: 1,
      cargoWeightPerContainerKg: 0,
      temperatureControl: false,
    },
    airPackages: [
      {
        id: crypto.randomUUID(),
        packaging: "standard",
        numberOfPackages: 1,
        weightPerPackageKg: 0,
        lengthCm: 0,
        widthCm: 0,
        heightCm: 0,
      },
    ],
    cargoReadyDate: "",
  };
}
