const DEFAULT_API_BASE_URL = "/api";
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(path, params = {}) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const base =
    typeof window === "undefined" ? "http://127.0.0.1:5173" : window.location.origin;
  const url = new URL(`${API_BASE_URL}${cleanPath}`, base);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

export async function apiGet(path, params, options = {}) {
  const response = await fetch(buildUrl(path, params), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError("No se pudo cargar la informacion solicitada.", response.status, payload);
  }

  return payload;
}

export async function apiPost(path, body = {}, options = {}) {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError("No se pudo guardar la informacion solicitada.", response.status, payload);
  }

  return payload;
}

export function asArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return payload ? [payload] : [];
}

export function resolveMediaUrl(value) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return value.startsWith("/") ? value : `/${value}`;
}
