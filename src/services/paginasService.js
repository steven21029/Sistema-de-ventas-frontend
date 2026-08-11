import { apiGet, apiPost, asArray } from "./apiClient";

function sortByOrder(items) {
  return asArray(items).sort((first, second) => {
    const firstOrder = Number(first.orden) || 0;
    const secondOrder = Number(second.orden) || 0;

    return firstOrder - secondOrder;
  });
}

export async function getCombosDestacados(empresaSlug) {
  const payload = await apiGet("/catalogo/combos-destacados/", {
    empresa_slug: empresaSlug,
  });

  return sortByOrder(payload);
}

export async function getProductosMasVendidos(empresaSlug) {
  const payload = await apiGet("/catalogo/productos-mas-vendidos/", {
    empresa_slug: empresaSlug,
  });

  return asArray(payload)
    .sort(
      (first, second) =>
        (Number(second.total_vendido) || 0) - (Number(first.total_vendido) || 0),
    )
    .slice(0, 10);
}

export async function getProductosCatalogo(empresaSlug, filters = {}) {
  if (filters.catalogType === "examenes") {
    return getExamenes(empresaSlug, filters);
  }

  const payload = await apiGet("/catalogo/productos/", {
    empresa_slug: empresaSlug,
    buscar: filters.buscar,
  });

  return asArray(payload);
}

export async function getExamenes(empresaSlug, filters = {}) {
  const payload = await apiGet("/catalogo/examenes/", {
    empresa_slug: empresaSlug,
    buscar: filters.buscar,
  });

  return asArray(payload);
}

export async function getFamilias(empresaSlug, filters = {}) {
  const payload = await apiGet("/catalogo/familias/", {
    empresa_slug: empresaSlug,
    buscar: filters.buscar,
  });

  return sortByOrder(payload);
}

export async function getPerfiles(empresaSlug, filters = {}) {
  const payload = await apiGet("/catalogo/perfiles/", {
    empresa_slug: empresaSlug,
    buscar: filters.buscar,
  });

  return sortByOrder(payload);
}

export async function getServiciosPagina(empresaSlug, filters = {}) {
  const payload = await apiGet("/catalogo/servicios/", {
    empresa_slug: empresaSlug,
    buscar: filters.buscar,
  });

  return sortByOrder(payload);
}

export async function getServicioDetalle(empresaSlug, servicio) {
  return apiGet("/catalogo/servicios/detalle/", {
    empresa_slug: empresaSlug,
    servicio,
  });
}

export async function getSucursales(empresaSlug, filters = {}) {
  const payload = await apiGet("/empresas/sucursales/", {
    empresa_slug: empresaSlug,
    buscar: filters.buscar,
  });

  return sortByOrder(payload);
}

export function enviarMensajeContacto(payload) {
  return apiPost("/contacto/mensajes/", payload);
}
