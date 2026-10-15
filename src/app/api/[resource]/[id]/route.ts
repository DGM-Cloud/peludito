import { HttpError } from "@/server/errors";
import { handleGetById, handlePatch } from "@/server/handle";
import { NextResponse } from "next/server";

function fail(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Error inesperado";
  return NextResponse.json({ error: message }, { status: 500 });
}

type Context = { params: Promise<{ resource: string; id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { resource, id } = await context.params;
    const url = new URL(request.url);
    return NextResponse.json(await handleGetById(resource, id, url.searchParams));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { resource, id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json(await handlePatch(resource, id, body));
  } catch (error) {
    return fail(error);
  }
}
