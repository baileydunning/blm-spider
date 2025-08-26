import { withCors } from "./http";

export function httpError(status: number, message: string, extra: Record<string, any> = {}) {
  return {
    status,
    headers: withCors({ "Content-Type": "application/json; charset=utf-8" }),
    data: { error: message, ...extra },
  };
}

export const badRequest = (m = "Bad Request", e = {}) => httpError(400, m, e);
export const unauthorized = (m = "Unauthorized", e = {}) => httpError(401, m, e);
export const forbidden = (m = "Forbidden", e = {}) => httpError(403, m, e);
export const notFound = (m = "Not Found", e = {}) => httpError(404, m, e);
export const tooMany = (m = "Too Many Requests", e = {}) => httpError(429, m, e);
export const serverError = (m = "Internal Server Error", e = {}) => httpError(500, m, e);

export async function safe<T>(
  fn: () => Promise<T>,
  onError?: (err: any) => { status: number; headers: Record<string, string>; data: any }
) {
  try {
    return await fn();
  } catch (err: any) {
    if (onError) return onError(err);
    return serverError(err?.message ?? "Unexpected error");
  }
}
