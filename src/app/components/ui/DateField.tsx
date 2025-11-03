"use client";

/**
 * DateField — RHF-controlled date input (YYYY-MM-DD)
 * - Visual required indicator; validation enforced via Zod resolver
 * - a11y: exposes aria-invalid and associates error message
 */

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export default function DateField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  disabled,
  className = "",
}: Props<T>) {
  const id = `${String(name)}-date`;
  const errId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className={`block text-sm font-medium ${disabled ? "text-gray-400" : "text-gray-700"}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <>
            <input
              id={id}
              type="date"
              className={[
                // Prevent iOS from oversizing: force block + border-box
                "block w-full max-w-full box-border rounded-md shadow-sm px-3 py-2 text-sm outline-none",
                "focus:ring-[var(--color-green)] focus:outline-none focus:shadow-md",
                "border border-gray-200", // visible edge on iOS Safari
                disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white",
                fieldState.error ? "ring-2 ring-red-300 border-red-300" : "",
              ].join(" ")}
              value={(field.value ?? "") as string}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              disabled={disabled}
              data-field={String(name)}
              aria-required={required || undefined}
              aria-invalid={!!fieldState.error || undefined}
              aria-describedby={fieldState.error ? errId : undefined}
            />
            {fieldState.error?.message && (
              <p id={errId} className="text-red-500 text-sm mt-1">
                {String(fieldState.error.message)}
              </p>
            )}
          </>
        )}
      />
    </div>
  );
}
