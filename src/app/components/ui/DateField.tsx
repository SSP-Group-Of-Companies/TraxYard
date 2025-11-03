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
            <div
              className={[
                "relative w-full rounded-md shadow-sm",
                fieldState.error ? "ring-2 ring-red-300 border border-red-300" : "border border-gray-200",
                disabled ? "bg-gray-100" : "bg-white",
              ].join(" ")}
            >
              <input
                id={id}
                type="date"
                className={[
                  // Ensure no overflow within wrapper
                  "block w-full max-w-full box-border appearance-none outline-none bg-transparent",
                  "px-3 py-2 text-sm",
                  disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-900",
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
            </div>
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
