import { apiPost } from "./apiClient";

export function generarPedidoDesdeCarrito(carritoId, datosEntrega) {
  return apiPost(
    `/pedidos/carritos/${carritoId}/generar-pedido/`,
    datosEntrega,
    {
      auth: true,
    },
  );
}
