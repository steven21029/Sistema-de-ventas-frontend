import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPatch,
  apiPost,
  asArray,
} from "./apiClient";

const ADMIN_REQUEST_OPTIONS = { auth: true };

export function getAdminContext(empresaSlug = "") {
  return apiGet(
    "/empresas/contexto-administrativo/",
    empresaSlug ? { empresa_slug: empresaSlug } : undefined,
    ADMIN_REQUEST_OPTIONS,
  );
}

export function getMyCompany(empresaSlug) {
  return apiGet(
    "/empresas/mi-empresa/",
    { empresa_slug: empresaSlug },
    ADMIN_REQUEST_OPTIONS,
  );
}

export function updateMyCompany(empresaSlug, payload) {
  return apiPatch(
    `/empresas/mi-empresa/?empresa_slug=${encodeURIComponent(empresaSlug)}`,
    payload,
    ADMIN_REQUEST_OPTIONS,
  );
}

export function getMyAbout(empresaSlug) {
  return apiGet(
    "/empresas/mi-sobre-nosotros/",
    { empresa_slug: empresaSlug },
    ADMIN_REQUEST_OPTIONS,
  );
}

export function updateMyAbout(empresaSlug, payload) {
  return apiPatch(
    `/empresas/mi-sobre-nosotros/?empresa_slug=${encodeURIComponent(empresaSlug)}`,
    payload,
    ADMIN_REQUEST_OPTIONS,
  );
}

export function listAdminResource(path, empresaSlug, filters = {}) {
  return apiGet(
    path,
    {
      empresa_slug: empresaSlug,
      ...filters,
    },
    ADMIN_REQUEST_OPTIONS,
  );
}

export function getAdminResourceDetail(path, id, empresaSlug) {
  return apiGet(
    `${path}${encodeURIComponent(id)}/`,
    { empresa_slug: empresaSlug },
    ADMIN_REQUEST_OPTIONS,
  );
}

export async function listAllAdminResource(path, empresaSlug, filters = {}) {
  const firstPage = await listAdminResource(path, empresaSlug, {
    ...filters,
    paginar: true,
    page: 1,
    tamano_pagina: 100,
  });

  if (!firstPage?.results || !Number.isFinite(Number(firstPage.count))) {
    return asArray(firstPage);
  }

  const results = [...firstPage.results];
  const totalPages = Math.ceil(Number(firstPage.count) / 100);

  for (let page = 2; page <= totalPages; page += 1) {
    const payload = await listAdminResource(path, empresaSlug, {
      ...filters,
      paginar: true,
      page,
      tamano_pagina: 100,
    });
    results.push(...asArray(payload));
  }

  return results;
}

export function createAdminResource(path, empresaSlug, payload) {
  return apiPost(
    `${path}?empresa_slug=${encodeURIComponent(empresaSlug)}`,
    payload,
    ADMIN_REQUEST_OPTIONS,
  );
}

export function updateAdminResource(path, id, empresaSlug, payload) {
  return apiPatch(
    `${path}${encodeURIComponent(id)}/?empresa_slug=${encodeURIComponent(empresaSlug)}&incluir_inactivos=true`,
    payload,
    ADMIN_REQUEST_OPTIONS,
  );
}

export function deleteAdminResource(path, id, empresaSlug) {
  return apiDelete(
    `${path}${encodeURIComponent(id)}/?empresa_slug=${encodeURIComponent(empresaSlug)}&incluir_inactivos=true`,
    ADMIN_REQUEST_OPTIONS,
  );
}

export function runAdminAction(path, id, action, empresaSlug, payload = {}) {
  return apiPost(
    `${path}${encodeURIComponent(id)}/${action}/?empresa_slug=${encodeURIComponent(empresaSlug)}&incluir_inactivos=true`,
    payload,
    ADMIN_REQUEST_OPTIONS,
  );
}

export function cancelPendingOrder(orderId, reason) {
  return apiPost(
    `/pedidos/pedidos/${encodeURIComponent(orderId)}/cancelar-pendiente/`,
    { motivo: String(reason || "").trim() },
    ADMIN_REQUEST_OPTIONS,
  );
}

export function confirmBranchPayment(reference) {
  return apiPost(
    `/pagos/${encodeURIComponent(reference)}/confirmar-en-sucursal/`,
    {},
    ADMIN_REQUEST_OPTIONS,
  );
}

export function getInventorySummary(empresaSlug) {
  return apiGet(
    "/inventario/resumen/",
    { empresa_slug: empresaSlug },
    ADMIN_REQUEST_OPTIONS,
  );
}

export function getSalesSummary(empresaSlug, filters = {}) {
  return apiGet(
    "/reportes/resumen-ventas/",
    {
      empresa_slug: empresaSlug,
      ...filters,
    },
    ADMIN_REQUEST_OPTIONS,
  );
}

export async function downloadSalesReport(empresaSlug, filters) {
  const format = String(filters.formato || "pdf").toLowerCase();
  const type = String(filters.tipo || "resumen").toLowerCase();
  const result = await apiDownload(
    "/reportes/ventas/exportar/",
    {
      empresa_slug: empresaSlug,
      ...filters,
      formato: format,
      tipo: type,
    },
    ADMIN_REQUEST_OPTIONS,
  );

  return {
    ...result,
    filename:
      result.filename ||
      `reporte-${type}-${filters.fecha_desde}-${filters.fecha_hasta}.${format}`,
  };
}

export function adjustInventory(empresaSlug, payload) {
  return apiPost(
    "/inventario/ajustar-existencia/",
    { empresa_slug: empresaSlug, ...payload },
    ADMIN_REQUEST_OPTIONS,
  );
}
