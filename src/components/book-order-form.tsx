"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  createEmptyBookingForm,
  OCEAN_CONTAINER_OPTIONS,
} from "@/lib/booking-defaults";
import { applyFormFillData } from "@/lib/apply-form-fill";
import { detectDangerousGoods } from "@/lib/dangerous-goods";
import {
  AIRPORTS,
  PORTS,
  findLocation,
  formatLocationLabel,
  locationsForCountry,
  suggestLocation,
} from "@/lib/locations";
import type {
  AirPackage,
  BookingFormState,
  ShipmentItem,
} from "@/lib/types";
import { useFormFillStream } from "@/hooks/use-form-fill-stream";
import {
  getOrCreateBookingSessionId,
  persistBookingSessionId,
} from "@/lib/booking-session";
import { AgentPanel } from "@/components/agent-panel";
import { CheckRow, Field, Section } from "@/components/form-ui";
import { PartyDetailsSection } from "@/components/party-section";

export function BookOrderForm({ agentEmbedUrl }: { agentEmbedUrl: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get("session_id")?.trim() || null;
  const [sessionId, setSessionId] = useState<string | null>(urlSessionId);
  const [form, setForm] = useState<BookingFormState>(() =>
    createEmptyBookingForm(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** When true, skip overwriting that end until address/mode changes. */
  const [originManual, setOriginManual] = useState(false);
  const [destinationManual, setDestinationManual] = useState(false);

  // One session_id for both embedded agent and form-fill SSE.
  useEffect(() => {
    if (urlSessionId) {
      persistBookingSessionId(urlSessionId);
      setSessionId(urlSessionId);
      return;
    }
    const id = getOrCreateBookingSessionId();
    setSessionId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("session_id", id);
    window.history.replaceState(null, "", url.toString());
  }, [urlSessionId]);

  const onFormFillData = useCallback((data: Record<string, unknown>) => {
    if ("originCode" in data) setOriginManual(true);
    else if ("exporter" in data) setOriginManual(false);
    if ("destinationCode" in data) setDestinationManual(true);
    else if ("importer" in data) setDestinationManual(false);

    setForm((prev) => applyFormFillData(prev, data).form);
  }, []);

  useFormFillStream({
    enabled: Boolean(sessionId),
    sessionId: sessionId ?? "",
    onData: onFormFillData,
  });

  const hazards = useMemo(
    () => detectDangerousGoods({ items: form.items }),
    [form.items],
  );

  const locationList = form.mode === "ocean" ? PORTS : AIRPORTS;
  const originOptions = useMemo(() => {
    const filtered = locationsForCountry(
      locationList,
      form.exporter.address.country,
    );
    const selected = findLocation(locationList, form.originCode);
    if (selected && !filtered.some((l) => l.code === selected.code)) {
      return [selected, ...filtered];
    }
    return filtered;
  }, [locationList, form.exporter.address.country, form.originCode]);
  const destinationOptions = useMemo(() => {
    const filtered = locationsForCountry(
      locationList,
      form.importer.address.country,
    );
    const selected = findLocation(locationList, form.destinationCode);
    if (selected && !filtered.some((l) => l.code === selected.code)) {
      return [selected, ...filtered];
    }
    return filtered;
  }, [locationList, form.importer.address.country, form.destinationCode]);

  const origin = findLocation(locationList, form.originCode);
  const destination = findLocation(locationList, form.destinationCode);

  // Auto-select origin from exporter address (city → country fallback)
  useEffect(() => {
    if (originManual) return;
    const suggested = suggestLocation(locationList, form.exporter.address);
    const nextCode = suggested?.code ?? "";
    setForm((prev) =>
      prev.originCode === nextCode ? prev : { ...prev, originCode: nextCode },
    );
  }, [
    locationList,
    form.exporter.address.city,
    form.exporter.address.country,
    form.exporter.address.stateProvince,
    form.mode,
    originManual,
  ]);

  // Auto-select destination from importer address
  useEffect(() => {
    if (destinationManual) return;
    const suggested = suggestLocation(locationList, form.importer.address);
    const nextCode = suggested?.code ?? "";
    setForm((prev) =>
      prev.destinationCode === nextCode
        ? prev
        : { ...prev, destinationCode: nextCode },
    );
  }, [
    locationList,
    form.importer.address.city,
    form.importer.address.country,
    form.importer.address.stateProvince,
    form.mode,
    destinationManual,
  ]);

  const update = (patch: Partial<BookingFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const updateItem = (id: string, patch: Partial<ShipmentItem>) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));

  const updateAirPackage = (id: string, patch: Partial<AirPackage>) =>
    setForm((prev) => ({
      ...prev,
      airPackages: prev.airPackages.map((pkg) =>
        pkg.id === id ? { ...pkg, ...patch } : pkg,
      ),
    }));

  const setMode = (mode: BookingFormState["mode"]) => {
    setOriginManual(false);
    setDestinationManual(false);
    setForm((prev) => ({
      ...prev,
      mode,
      originCode: "",
      destinationCode: "",
    }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shipFrom: {
            companyName: form.exporter.companyName,
            portName: origin
              ? `${origin.code} — ${origin.name}`
              : form.originCode,
            country: form.exporter.address.country,
          },
          deliverTo: {
            companyName: form.importer.companyName,
            portName: destination
              ? `${destination.code} — ${destination.name}`
              : form.destinationCode,
            country: form.importer.address.country,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit booking");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
      <form
        onSubmit={onSubmit}
        className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1"
      >
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2a9dba]">
            New shipment
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Book order
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Enter exporter and importer details, items, then choose ocean or air
            and select origin / destination. The agent on the right can help
            fill fields.
          </p>
        </header>

        <PartyDetailsSection
          title="Exporter details"
          value={form.exporter}
          onChange={(exporter) => {
            setOriginManual(false);
            update({ exporter });
          }}
        />

        <PartyDetailsSection
          title="Importer details"
          value={form.importer}
          onChange={(importer) => {
            setDestinationManual(false);
            update({ importer });
          }}
        />

        <Section title="Item details">
          {hazards.length > 0 ? (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Dangerous goods detected
              </div>
              <ul className="space-y-2 text-sm">
                {hazards.map((h) => (
                  <li key={h.hazardClass}>
                    <span className="font-semibold">{h.hazardClass}</span>
                    <span className="text-amber-900/80"> — {h.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Item {index + 1}</p>
                  {form.items.length > 1 ? (
                    <button
                      type="button"
                      className="ff-btn ff-btn-ghost h-8 px-2 text-destructive"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          items: prev.items.filter((i) => i.id !== item.id),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="ff-grid-2">
                  <Field label="Item description" className="sm:col-span-2">
                    <input
                      className="ff-input"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, { description: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Import tariff code (importer country)">
                    <input
                      className="ff-input"
                      value={item.hsCode}
                      onChange={(e) =>
                        updateItem(item.id, { hsCode: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Country/territory of manufacture">
                    <input
                      className="ff-input"
                      value={item.countryOfManufacture}
                      onChange={(e) =>
                        updateItem(item.id, {
                          countryOfManufacture: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Quantity">
                    <input
                      className="ff-input"
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Unit">
                    <input
                      className="ff-input"
                      value={item.unit}
                      onChange={(e) =>
                        updateItem(item.id, { unit: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Weight (kg)">
                    <input
                      className="ff-input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.weightKg}
                      onChange={(e) =>
                        updateItem(item.id, {
                          weightKg: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Customs value — ex CNY">
                    <input
                      className="ff-input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.customsValueCny}
                      onChange={(e) =>
                        updateItem(item.id, {
                          customsValueCny: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="ff-btn ff-btn-ghost"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  items: [
                    ...prev.items,
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
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>
          </div>
        </Section>

        <Section title="Transport mode">
          <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
            {(["ocean", "air"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                className={`cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-colors ${
                  form.mode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">
                Origin & destination
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Origin and destination are auto-selected from the exporter /
                importer city and country. You can still override them.
                {form.mode === "ocean"
                  ? " Using seaports for ocean."
                  : " Using airports for air."}
              </p>
              <div className="ff-grid-2">
                <Field
                  label={
                    form.mode === "ocean" ? "Origin port" : "Origin airport"
                  }
                >
                  <select
                    className="ff-input cursor-pointer"
                    value={form.originCode}
                    onChange={(e) => {
                      setOriginManual(true);
                      update({ originCode: e.target.value });
                    }}
                    required
                  >
                    <option value="">Select origin…</option>
                    {originOptions.map((loc) => (
                      <option key={loc.code} value={loc.code}>
                        {formatLocationLabel(loc)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label={
                    form.mode === "ocean"
                      ? "Destination port"
                      : "Destination airport"
                  }
                >
                  <select
                    className="ff-input cursor-pointer"
                    value={form.destinationCode}
                    onChange={(e) => {
                      setDestinationManual(true);
                      update({ destinationCode: e.target.value });
                    }}
                    required
                  >
                    <option value="">Select destination…</option>
                    {destinationOptions.map((loc) => (
                      <option key={loc.code} value={loc.code}>
                        {formatLocationLabel(loc)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">
                Package details
              </p>
              {form.mode === "air" ? (
                <div className="space-y-4">
                  {form.airPackages.map((pkg, index) => (
                    <div
                      key={pkg.id}
                      className="rounded-xl border border-border bg-muted/30 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          Package {index + 1}
                        </p>
                        {form.airPackages.length > 1 ? (
                          <button
                            type="button"
                            className="ff-btn ff-btn-ghost h-8 px-2 text-destructive"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                airPackages: prev.airPackages.filter(
                                  (p) => p.id !== pkg.id,
                                ),
                              }))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <div className="ff-grid-2">
                        <Field
                          label="Select packaging"
                          className="sm:col-span-2"
                        >
                          <select
                            className="ff-input cursor-pointer"
                            value={pkg.packaging}
                            onChange={(e) =>
                              updateAirPackage(pkg.id, {
                                packaging: e.target
                                  .value as AirPackage["packaging"],
                              })
                            }
                          >
                            <option value="standard">Standard packaging</option>
                            <option value="non_standard">
                              Non standard packaging
                            </option>
                            <option value="dry_ice">Dry ice</option>
                            <option value="lithium_batteries">
                              Lithium batteries
                            </option>
                          </select>
                        </Field>
                        <Field label="Number of packages">
                          <input
                            className="ff-input"
                            type="number"
                            min={1}
                            value={pkg.numberOfPackages}
                            onChange={(e) =>
                              updateAirPackage(pkg.id, {
                                numberOfPackages: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="Weight per package (kg)">
                          <input
                            className="ff-input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={pkg.weightPerPackageKg}
                            onChange={(e) =>
                              updateAirPackage(pkg.id, {
                                weightPerPackageKg: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="Length (cm)">
                          <input
                            className="ff-input"
                            type="number"
                            min={0}
                            value={pkg.lengthCm}
                            onChange={(e) =>
                              updateAirPackage(pkg.id, {
                                lengthCm: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="Width (cm)">
                          <input
                            className="ff-input"
                            type="number"
                            min={0}
                            value={pkg.widthCm}
                            onChange={(e) =>
                              updateAirPackage(pkg.id, {
                                widthCm: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="Height (cm)">
                          <input
                            className="ff-input"
                            type="number"
                            min={0}
                            value={pkg.heightCm}
                            onChange={(e) =>
                              updateAirPackage(pkg.id, {
                                heightCm: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="ff-btn ff-btn-ghost"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        airPackages: [
                          ...prev.airPackages,
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
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add another package
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="ff-grid-2">
                    <Field
                      label="Container type and size"
                      className="sm:col-span-2"
                    >
                      <select
                        className="ff-input cursor-pointer"
                        value={form.ocean.containerType}
                        onChange={(e) =>
                          update({
                            ocean: {
                              ...form.ocean,
                              containerType: e.target
                                .value as BookingFormState["ocean"]["containerType"],
                            },
                          })
                        }
                      >
                        {[
                          "Regular sized cargo",
                          "Reefer container",
                          "In gauge cargo",
                        ].map((group) => (
                          <optgroup key={group} label={group}>
                            {OCEAN_CONTAINER_OPTIONS.filter(
                              (o) => o.group === group,
                            ).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </Field>
                    <Field label="Number of containers">
                      <input
                        className="ff-input"
                        type="number"
                        min={1}
                        value={form.ocean.numberOfContainers}
                        onChange={(e) =>
                          update({
                            ocean: {
                              ...form.ocean,
                              numberOfContainers: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </Field>
                    <Field label="Cargo weight per container (kg)">
                      <input
                        className="ff-input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.ocean.cargoWeightPerContainerKg}
                        onChange={(e) =>
                          update({
                            ocean: {
                              ...form.ocean,
                              cargoWeightPerContainerKg: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <CheckRow
                    checked={form.ocean.temperatureControl}
                    onChange={(temperatureControl) =>
                      update({
                        ocean: { ...form.ocean, temperatureControl },
                      })
                    }
                  >
                    This cargo requires temperature control
                  </CheckRow>
                </div>
              )}
            </div>

            <Field label="Cargo ready date">
              <input
                className="ff-input"
                type="date"
                value={form.cargoReadyDate}
                onChange={(e) => update({ cargoReadyDate: e.target.value })}
                required
              />
            </Field>
          </div>
        </Section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 pb-8">
          <button
            type="button"
            className="ff-btn ff-btn-ghost"
            onClick={() => {
              setForm(createEmptyBookingForm());
              setOriginManual(false);
              setDestinationManual(false);
              setError(null);
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            className="ff-btn ff-btn-accent min-w-40"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit booking"
            )}
          </button>
        </div>
      </form>

      <div className="flex h-[min(70vh,560px)] min-h-0 w-full min-w-0 flex-1 flex-col lg:h-full">
        <AgentPanel src={agentEmbedUrl} sessionId={sessionId} />
      </div>
    </div>
  );
}
