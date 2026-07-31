import { apiGet, apiPost } from "./apiClient";

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
