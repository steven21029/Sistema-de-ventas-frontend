const DEFAULT_API_BASE_URL = "/api/v1";
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");
let accessToken = "";
let refreshRequest = null;
let unauthorizedHandler = null;

class ApiError extends Error {
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

async function readResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  }

  return responseText;
}

function createRequestSignal(options) {
  const timeoutMs = Number(options.timeoutMs);

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return {
      signal: options.signal,
      didTimeout: () => false,
      cleanup: () => {},
    };
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(options.signal?.reason);

  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", abortFromCaller);
    },
  };
}

async function performRequest(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    Accept: "application/json",
    ...(options.body !== undefined && !isFormData
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers || {}),
  };

  if (options.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const requestSignal = createRequestSignal(options);

  try {
    const response = await fetch(buildUrl(path, options.params), {
      method: options.method || "GET",
      cache: "no-store",
      credentials: options.credentials || (options.auth ? "include" : "same-origin"),
      headers,
      body:
        options.body !== undefined
          ? isFormData
            ? options.body
            : JSON.stringify(options.body)
          : undefined,
      signal: requestSignal.signal,
    });
    const payload = await readResponse(response);

    return { payload, response };
  } catch (error) {
    if (requestSignal.didTimeout()) {
      throw new ApiError(
        "La solicitud tardo demasiado. Intenta nuevamente en unos segundos.",
        408,
        null,
      );
    }

    throw error;
  } finally {
    requestSignal.cleanup();
  }
}

async function request(path, options = {}) {
  let result = await performRequest(path, options);

  if (result.response.status === 401 && options.auth && options.retryAuth !== false) {
    const renewedToken = await refreshApiAccessToken();

    if (renewedToken) {
      result = await performRequest(path, {
        ...options,
        retryAuth: false,
      });
    }
  }

  if (!result.response.ok) {
    if (result.response.status === 401 && options.auth) {
      setApiAccessToken("");
      unauthorizedHandler?.();
    }

    const defaultMessage =
      (options.method || "GET") === "GET"
        ? "No se pudo cargar la informacion solicitada."
        : "No se pudo guardar la informacion solicitada.";
    throw new ApiError(defaultMessage, result.response.status, result.payload);
  }

  return result.payload;
}

export function setApiAccessToken(token) {
  accessToken = token || "";
}

export function setApiUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

export async function refreshApiAccessToken() {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = (async () => {
    try {
      const { payload, response } = await performRequest("/usuarios/token/refresh/", {
        method: "POST",
        body: {},
        credentials: "include",
      });

      if (!response.ok || !payload?.access) {
        setApiAccessToken("");
        return "";
      }

      setApiAccessToken(payload.access);
      return payload.access;
    } catch {
      setApiAccessToken("");
      return "";
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
}

export function apiGet(path, params, options = {}) {
  return request(path, {
    ...options,
    method: "GET",
    params,
  });
}

export function apiPost(path, body = {}, options = {}) {
  return request(path, {
    ...options,
    method: "POST",
    body,
  });
}

export function apiPatch(path, body = {}, options = {}) {
  return request(path, {
    ...options,
    method: "PATCH",
    body,
  });
}

export function apiPut(path, body = {}, options = {}) {
  return request(path, {
    ...options,
    method: "PUT",
    body,
  });
}

export function apiDelete(path, options = {}) {
  return request(path, {
    ...options,
    method: "DELETE",
  });
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
