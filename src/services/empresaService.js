import { apiGet } from "./apiClient";

const FALLBACK_EMPRESA_SLUG = import.meta.env.VITE_EMPRESA_SLUG || "";
const LOCAL_EMPRESA_STORAGE_KEY = "ventas_empresa_slug";

function getFrontendHost() {
  if (import.meta.env.VITE_FRONTEND_HOST) {
    return import.meta.env.VITE_FRONTEND_HOST;
  }

  return typeof window === "undefined" ? "" : window.location.host;
}

function shouldUseLocalSlugFallback(host) {
  return (
    !host ||
    host.startsWith("127.") ||
    host.startsWith("localhost") ||
    host.startsWith("[::1]")
  );
}

function getBrowserEmpresaSlugOverride() {
  if (typeof window === "undefined") {
    return "";
  }

  const params = new URLSearchParams(window.location.search);
  const slugFromUrl = params.get("empresa_slug") || params.get("slug") || params.get("empresa");

  if (slugFromUrl) {
    window.localStorage.setItem(LOCAL_EMPRESA_STORAGE_KEY, slugFromUrl);
    return slugFromUrl;
  }

  return window.localStorage.getItem(LOCAL_EMPRESA_STORAGE_KEY) || "";
}

export function getEmpresaPublica(slug) {
  return apiGet("/empresas/publica/", { slug });
}

export async function getEmpresaActual() {
  const host = getFrontendHost();
  const slugOverride = getBrowserEmpresaSlugOverride();

  if (slugOverride) {
    return apiGet("/empresas/actual/", { slug: slugOverride });
  }

  if (!shouldUseLocalSlugFallback(host)) {
    try {
      return await apiGet(
        "/empresas/actual/",
        { host },
        {
          headers: {
            "X-Frontend-Host": host,
          },
        },
      );
    } catch (error) {
      if (FALLBACK_EMPRESA_SLUG) {
        return apiGet("/empresas/actual/", { slug: FALLBACK_EMPRESA_SLUG });
      }

      throw error;
    }
  }

  if (FALLBACK_EMPRESA_SLUG) {
    return apiGet("/empresas/actual/", { slug: FALLBACK_EMPRESA_SLUG });
  }

  return apiGet(
    "/empresas/actual/",
    { host },
    {
      headers: {
        "X-Frontend-Host": host,
      },
    },
  );
}
