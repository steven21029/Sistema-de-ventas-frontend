import { apiGet } from "./apiClient";

const FALLBACK_EMPRESA_SLUG = import.meta.env.VITE_EMPRESA_SLUG || "Analiza";

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

export function getEmpresaPublica(slug) {
  return apiGet("/empresas/publica/", { slug });
}

export async function getEmpresaActual() {
  const host = getFrontendHost();

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
    } catch {
      return apiGet("/empresas/actual/", { slug: FALLBACK_EMPRESA_SLUG });
    }
  }

  return apiGet("/empresas/actual/", { slug: FALLBACK_EMPRESA_SLUG });
}
