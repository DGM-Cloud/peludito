import {
  lookupPublicAppointment,
  replyPublicAppointment,
} from "@/server/public-appointment";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const appointment = await lookupPublicAppointment(token);
    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }
    return NextResponse.json(appointment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo abrir la cita";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { token } = await context.params;
    const body = (await request.json().catch(() => null)) as { reply?: string } | null;
    const reply = body?.reply;
    if (reply !== "confirmada" && reply !== "no_puede") {
      return NextResponse.json({ error: "Respuesta no válida" }, { status: 400 });
    }
    const result = await replyPublicAppointment(token, reply);
    if ("error" in result && result.error) {
      const status = result.error === "Cita no encontrada" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.appointment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la respuesta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
