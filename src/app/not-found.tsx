import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-gray-600 mb-4">The page you’re looking for doesn’t exist or has moved.</p>
        <Link href="/guard" className="button-base">Go to home</Link>
      </div>
    </div>
  );
}


