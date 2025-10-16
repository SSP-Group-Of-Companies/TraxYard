// src/app/api/auth/[...nextauth]/route.ts

export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions"; // clean alias import

const handler = NextAuth(authOptions);
export const GET = handler;
export const POST = handler;
