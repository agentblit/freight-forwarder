export type AddressBlock = {
  addressLine1: string;
  addressLine2: string;
  country: string;
  stateProvince: string;
  city: string;
  postalCode: string;
};

/** Exporter or importer contact + address. */
export type PartyDetails = {
  companyName: string;
  phone: string;
  email: string;
  address: AddressBlock;
};

export type ShipmentItem = {
  id: string;
  description: string;
  hsCode: string;
  countryOfManufacture: string;
  quantity: number;
  unit: string;
  weightKg: number;
  customsValueCny: number;
};

export type AirPackage = {
  id: string;
  packaging: "standard" | "non_standard" | "dry_ice" | "lithium_batteries";
  numberOfPackages: number;
  weightPerPackageKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type OceanContainerType =
  | "20_dry_standard"
  | "40_dry_standard"
  | "40_dry_high"
  | "45_dry_high"
  | "20_tank"
  | "40_tank"
  | "20_reefer_standard"
  | "40_reefer_high"
  | "20_opentop"
  | "40_opentop"
  | "40_opentop_high"
  | "40_flat_standard"
  | "40_flat_high";

export type OceanPackage = {
  containerType: OceanContainerType;
  numberOfContainers: number;
  cargoWeightPerContainerKg: number;
  temperatureControl: boolean;
};

export type BookingFormState = {
  exporter: PartyDetails;
  importer: PartyDetails;
  items: ShipmentItem[];
  mode: "air" | "ocean";
  /** UN/LOCODE port code or IATA airport code. */
  originCode: string;
  destinationCode: string;
  ocean: OceanPackage;
  airPackages: AirPackage[];
  cargoReadyDate: string;
};

export type BookingConfirmation = {
  expectedDelivery: string;
  trackingNumber: string;
  pickupConfirmationNumber: string;
  waybillNumber: string;
  shipmentLabelPdf: string;
  transactionRecordPdf: string;
};

export type OrderSummary = {
  id: string;
  trackingNumber: string;
  mode: string;
  status: string;
  shipFromCompany: string | null;
  shipFromPort: string | null;
  deliverToCompany: string | null;
  deliverToPort: string | null;
  cargoReadyDate: string | null;
  expectedDelivery: string | null;
  totalPriceUsd: number | null;
  createdAt: string;
};
