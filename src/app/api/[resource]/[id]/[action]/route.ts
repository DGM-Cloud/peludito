import { HttpError } from "@/server/errors";
import { handleAction } from "@/server/handle";
import { NextResponse } from "next/server";

function fail(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Error inesperado";
  return NextResponse.json({ error: message }, { status: 500 });
}

type Context = {
  params: Promise<{ resource: string; id: string; action: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { resource, id, action } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(await handleAction(resource, id, action, body));
  } catch (error) {
    return fail(error);
  }
}
