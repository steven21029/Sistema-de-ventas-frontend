import { apiGet, asArray } from "./apiClient";

export async function getFamilias(empresaSlug) {
  const payload = await apiGet("/catalogo/familias/", {
    empresa_slug: empresaSlug,
  });

  return asArray(payload);
}

export async function getCategorias(empresaSlug) {
  const payload = await apiGet("/catalogo/categorias/", {
    empresa_slug: empresaSlug,
  });

  return asArray(payload);
}

export async function getProductos(empresaSlug, filters = {}) {
  const payload = await apiGet("/catalogo/productos/", {
    empresa_slug: empresaSlug,
    buscar: filters.buscar,
    familia: filters.familia,
    categoria: filters.categoria,
    agotado: filters.agotado,
    orden: filters.orden,
  });

  return asArray(payload);
}
