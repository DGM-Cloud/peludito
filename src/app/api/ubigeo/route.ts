import { formatUbigeoName } from "@/utils/ubigeo-name";
import { NextResponse } from "next/server";

const source = "https://jmc-software-x.github.io/public-ubigeo-pe/data";
const day = 24 * 60 * 60 * 1000;

type Place = { id: string; name: string };

const memory = new Map<string, { at: number; places: Place[] }>();

function placesFrom(payload: unknown): Place[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => readPlace(item));
  }
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const list = record.districts ?? record.provinces;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => readPlace(item));
}

function readPlace(item: unknown): Place[] {
  if (!item || typeof item !== "object") return [];
  const record = item as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const name = typeof record.name === "string" ? record.name : "";
  if (!/^\d{2,6}$/.test(id) || !name.trim()) return [];
  return [{ id, name: formatUbigeoName(name) }];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department") ?? "";
  const province = searchParams.get("province") ?? "";

  if (province && !/^\d{4}$/.test(province)) {
    return NextResponse.json({ error: "Provincia no válida." }, { status: 400 });
  }
  if (department && !/^\d{2}$/.test(department)) {
    return NextResponse.json({ error: "Departamento no válido." }, { status: 400 });
  }

  const target = province
    ? `${source}/provinces/${province}.json`
    : department
      ? `${source}/departments/${department}.json`
      : `${source}/hierarchy.json`;

  const cached = memory.get(target);
  if (cached && Date.now() - cached.at < day) {
    return NextResponse.json({ places: cached.places });
  }

  try {
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { error: "No se pudo consultar el padrón de ubigeo." },
        { status: 502 },
      );
    }
    const places = placesFrom(await response.json()).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
    memory.set(target, { at: Date.now(), places });
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar el padrón de ubigeo." },
      { status: 502 },
    );
  }
}
