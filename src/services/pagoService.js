import { apiDownload, apiGet, apiPost } from "./apiClient";

export function iniciarPago(pedidoId) {
  return apiPost(
    "/pagos/iniciar/",
    {
      pedido_id: pedidoId,
    },
    {
      auth: true,
    },
  );
}

export function getPago(referencia) {
  return apiGet(`/pagos/${encodeURIComponent(referencia)}/`, undefined, {
    auth: true,
  });
}

export function iniciarPagoEnSucursal(pedidoId, sucursalId) {
  const normalizedBranchId = Number(sucursalId);
  if (!Number.isInteger(normalizedBranchId) || normalizedBranchId <= 0) {
    throw new Error("Selecciona una sucursal valida para generar la prefactura.");
  }

  return apiPost(
    `/pedidos/pedidos/${encodeURIComponent(pedidoId)}/pago-en-sucursal/`,
    {
      sucursal_id: normalizedBranchId,
    },
    {
      auth: true,
    },
  );
}

export function descargarPrefactura(pedidoId) {
  return apiDownload(
    `/pedidos/pedidos/${encodeURIComponent(pedidoId)}/prefactura/pdf/`,
    undefined,
    { auth: true },
  );
}

export function reenviarPrefactura(pedidoId) {
  return apiPost(
    `/pedidos/pedidos/${encodeURIComponent(pedidoId)}/prefactura/reenviar-correo/`,
    {},
    { auth: true },
  );
}
