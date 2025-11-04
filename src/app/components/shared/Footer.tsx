"use client";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0b1a2a] text-center text-white py-3 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-1">
        <p className="font-semibold tracking-tight">
          © {new Date().getFullYear()} SSP Group of Companies. All rights
          reserved.
        </p>
        <p className="text-gray-300">TraxYard – Internal Trailer Management System</p>
      </div>
    </footer>
  );
}
