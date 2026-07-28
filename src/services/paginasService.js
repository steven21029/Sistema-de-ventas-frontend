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

  return asArray(payload);
}

export async function getProductosCatalogo(empresaSlug, filters = {}) {
  const endpoint =
    filters.catalogType === "examenes" ? "/catalogo/examenes/" : "/catalogo/productos/";
  const payload = await apiGet(endpoint, {
    empresa_slug: empresaSlug,
    buscar: filters.buscar,
  });

  return asArray(payload);
}

export const getExamenes = getProductosCatalogo;

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
