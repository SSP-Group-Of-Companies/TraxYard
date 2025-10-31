import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ error: "API route not found" }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ error: "API route not found" }, { status: 404 });
}

// Optionally handle other methods
export function PUT() {
  return NextResponse.json({ error: "API route not found" }, { status: 404 });
}

export function DELETE() {
  return NextResponse.json({ error: "API route not found" }, { status: 404 });
}
