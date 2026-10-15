import { HttpError } from "@/server/errors";
import { handleGet, handlePost } from "@/server/handle";
import { NextResponse } from "next/server";

function fail(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Error inesperado";
  return NextResponse.json({ error: message }, { status: 500 });
}

type Context = { params: Promise<{ resource: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { resource } = await context.params;
    const url = new URL(request.url);
    return NextResponse.json(await handleGet(resource, url.searchParams));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { resource } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(await handlePost(resource, body), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
