import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/errors";

export function errorResponse(
  error: unknown,
  fallbackMessage: string,
  context: string,
): NextResponse {
  console.error(`[${context}]`, error);

  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("INVALID_BODY", "Invalid JSON request body.");
  }
}
