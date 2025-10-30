"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";

type UploadPickerProps = {
  label?: string;
  children?: React.ReactNode;
  onPick: (file: File | null) => void | Promise<void>;
  accept?: string;
  disabled?: boolean;
  ariaLabel?: string;
  cameraText?: string;
  filesText?: string;
  className?: string;
  showDefaultTile?: boolean;
};

export default function UploadPicker({
  label = "Upload",
  children,
  onPick,
  accept = "image/*,.heic,.heif,.pdf,.doc,.docx",
  disabled,
  ariaLabel,
  cameraText = "Take photo (camera)",
  filesText = "Choose from files",
  className,
  showDefaultTile = true,
}: UploadPickerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const btnId = useId();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function handleChange(input: HTMLInputElement, file: File | null) {
    try {
      await onPick(file);
    } finally {
      input.value = "";
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      <button
        id={btnId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={
          children
            ? "w-full"
            : "cursor-pointer flex items-center gap-2 h-10 px-4 text-sm text-gray-700 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition"
        }
      >
        {children ??
          (showDefaultTile && (
            <>
              <Camera className="w-4 h-4" />
              <span>{label}</span>
            </>
          ))}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={btnId}
          className="absolute top-full left-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden w-full min-w-[220px] z-[9999]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              cameraInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left text-sm font-medium text-gray-800 transition-colors"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            {cameraText}
          </button>
          <div className="border-t border-gray-200" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left text-sm font-medium text-gray-800 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-blue-600" />
            {filesText}
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        className="hidden"
        onChange={(e) =>
          handleChange(e.currentTarget, e.target.files?.[0] || null)
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) =>
          handleChange(e.currentTarget, e.target.files?.[0] || null)
        }
      />
    </div>
  );
}
