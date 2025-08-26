// src/middleware/http.ts
import zlib from "zlib";

export type Headers = Record<string, string>;

export const defaultCors: Headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export function withCors(headers: Headers = {}) {
  return { ...defaultCors, ...headers };
}

export function json(data: any, extra: Headers = {}) {
  return {
    status: 200,
    headers: withCors({ "Content-Type": "application/json; charset=utf-8", ...extra }),
    data,
  };
}

// Optional: serve gzipped JSON (use only if your clients can handle it)
export function gzjson(data: any, extra: Headers = {}) {
  const raw = Buffer.from(JSON.stringify(data));
  const gz = zlib.gzipSync(raw);
  return {
    status: 200,
    headers: withCors({
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "gzip",
      "Vary": "Accept-Encoding",
      ...extra,
    }),
    // IMPORTANT: in Harper Resources, `data` can be a Buffer for binary responses.
    data: gz,
  };
}

// Quick 204 for OPTIONS preflight
export function corsPreflight(extra: Headers = {}) {
  return { status: 204, headers: withCors(extra), data: "" };
}
