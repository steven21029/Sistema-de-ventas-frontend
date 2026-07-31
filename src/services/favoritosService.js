import { apiDelete, apiGet, apiPost, asArray } from "./apiClient";

export async function getFavoritos(empresaSlug) {
  const payload = await apiGet(
    "/favoritos/",
    {
      empresa_slug: empresaSlug,
    },
    {
      auth: true,
    },
  );

  return asArray(payload);
}

export function agregarFavorito(empresaSlug, codigo, tipoArticulo) {
  return apiPost(
    "/favoritos/",
    {
      empresa_slug: empresaSlug,
      codigo,
      tipo_articulo: tipoArticulo,
    },
    {
      auth: true,
    },
  );
}

export function eliminarFavorito(favoritoId) {
  return apiDelete(`/favoritos/${favoritoId}/`, {
    auth: true,
  });
}
