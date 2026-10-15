export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function resolveUrl(path: string) {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const relative = `${configured}/api${path}`;
  if (relative.startsWith("http") || typeof window !== "undefined") {
    return relative;
  }

  const { headers } = await import("next/headers");
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  const proto = incoming.get("x-forwarded-proto") ?? "http";
  if (!host) return relative;
  return `${proto}://${host}${relative}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (typeof window === "undefined") {
    const { cookies } = await import("next/headers");
    const cookie = (await cookies()).toString();
    if (cookie) headers.set("cookie", cookie);
  }

  const response = await fetch(await resolveUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : "No se pudo completar la solicitud.";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
