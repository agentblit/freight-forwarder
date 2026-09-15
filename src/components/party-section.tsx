"use client";

import type { PartyDetails } from "@/lib/types";
import { Field, Section } from "@/components/form-ui";

export function PartyDetailsSection({
  title,
  value,
  onChange,
}: {
  title: string;
  value: PartyDetails;
  onChange: (next: PartyDetails) => void;
}) {
  const set = <K extends keyof PartyDetails>(key: K, v: PartyDetails[K]) =>
    onChange({ ...value, [key]: v });

  const setAddress = <K extends keyof PartyDetails["address"]>(
    key: K,
    v: PartyDetails["address"][K],
  ) => onChange({ ...value, address: { ...value.address, [key]: v } });

  return (
    <Section title={title}>
      <div className="ff-grid-2">
        <Field label="Company name" className="sm:col-span-2">
          <input
            className="ff-input"
            value={value.companyName}
            onChange={(e) => set("companyName", e.target.value)}
          />
        </Field>
        <Field label="Address line 1" className="sm:col-span-2">
          <input
            className="ff-input"
            value={value.address.addressLine1}
            onChange={(e) => setAddress("addressLine1", e.target.value)}
          />
        </Field>
        <Field label="Address line 2" className="sm:col-span-2">
          <input
            className="ff-input"
            value={value.address.addressLine2}
            onChange={(e) => setAddress("addressLine2", e.target.value)}
          />
        </Field>
        <Field label="Country">
          <input
            className="ff-input"
            value={value.address.country}
            onChange={(e) => setAddress("country", e.target.value)}
            placeholder="e.g. India"
          />
        </Field>
        <Field label="State or Province">
          <input
            className="ff-input"
            value={value.address.stateProvince}
            onChange={(e) => setAddress("stateProvince", e.target.value)}
          />
        </Field>
        <Field label="City">
          <input
            className="ff-input"
            value={value.address.city}
            onChange={(e) => setAddress("city", e.target.value)}
          />
        </Field>
        <Field label="Postal code">
          <input
            className="ff-input"
            value={value.address.postalCode}
            onChange={(e) => setAddress("postalCode", e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input
            className="ff-input"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className="ff-input"
            type="email"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
      </div>
    </Section>
  );
}
