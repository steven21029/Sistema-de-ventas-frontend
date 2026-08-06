import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient";

const CART_REQUEST_TIMEOUT_MS = 30000;
const CART_REQUEST_OPTIONS = {
  auth: true,
  timeoutMs: CART_REQUEST_TIMEOUT_MS,
};

export function calcularCarritoPublico(empresaSlug, items) {
  return apiPost("/pedidos/carrito/calcular/", {
    empresa_slug: empresaSlug,
    items: items.map((item) => ({
      codigo: item.codigo,
      tipo_articulo: item.tipoArticulo || item.tipo_articulo || undefined,
      cantidad: item.cantidad,
    })),
  });
}

export function getMiCarrito() {
  return apiGet("/pedidos/carritos/mi-carrito/", undefined, CART_REQUEST_OPTIONS);
}

export function agregarArticuloCarrito(carritoId, codigo, tipoArticulo, cantidad = 1) {
  return apiPost(
    `/pedidos/carritos/${carritoId}/agregar-articulo/`,
    {
      codigo,
      tipo_articulo: tipoArticulo || undefined,
      cantidad,
    },
    CART_REQUEST_OPTIONS,
  );
}

export function actualizarCantidadCarrito(itemId, cantidad) {
  return apiPatch(
    `/pedidos/items-carrito/${itemId}/`,
    {
      cantidad,
    },
    CART_REQUEST_OPTIONS,
  );
}

export function eliminarItemCarrito(itemId) {
  return apiDelete(`/pedidos/items-carrito/${itemId}/`, CART_REQUEST_OPTIONS);
}
