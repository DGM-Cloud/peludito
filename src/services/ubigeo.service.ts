export type UbigeoPlace = { id: string; name: string };

export async function fetchUbigeo(
  query: { department?: string; province?: string } = {},
  signal?: AbortSignal,
): Promise<UbigeoPlace[]> {
  const params = new URLSearchParams();
  if (query.province) params.set("province", query.province);
  else if (query.department) params.set("department", query.department);
  const response = await fetch(`/api/ubigeo?${params.toString()}`, { signal });
  const body = (await response.json().catch(() => ({}))) as {
    places?: UbigeoPlace[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || "No se pudo cargar el ubigeo.");
  }
  return body.places ?? [];
}
