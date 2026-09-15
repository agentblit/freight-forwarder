"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="ff-label">{label}</span>
      {children}
    </label>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="ff-section">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ff-section-title mb-0">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="ff-check cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

export function RadioRow({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="ff-check cursor-pointer">
      <input
        type="radio"
        className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span>{children}</span>
    </label>
  );
}
