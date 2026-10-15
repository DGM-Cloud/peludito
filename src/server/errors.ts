export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type QueryResult = PromiseLike<{
  data: any;
  error: { message: string } | null;
}>;

export async function rows(result: QueryResult): Promise<any[]> {
  const { data, error } = await result;
  if (error) throw new HttpError(error.message, 500);
  return data ?? [];
}

export async function one(result: QueryResult, missing = "No encontrado"): Promise<any> {
  const { data, error } = await result;
  if (error) throw new HttpError(error.message, 500);
  if (data == null) throw new HttpError(missing, 404);
  return data;
}
