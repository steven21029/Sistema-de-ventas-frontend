import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient";

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
  return apiGet("/pedidos/carritos/mi-carrito/", undefined, {
    auth: true,
  });
}

export function agregarArticuloCarrito(carritoId, codigo, tipoArticulo, cantidad = 1) {
  return apiPost(
    `/pedidos/carritos/${carritoId}/agregar-articulo/`,
    {
      codigo,
      tipo_articulo: tipoArticulo || undefined,
      cantidad,
    },
    {
      auth: true,
    },
  );
}

export function actualizarCantidadCarrito(itemId, cantidad) {
  return apiPatch(
    `/pedidos/items-carrito/${itemId}/`,
    {
      cantidad,
    },
    {
      auth: true,
    },
  );
}

export function eliminarItemCarrito(itemId) {
  return apiDelete(`/pedidos/items-carrito/${itemId}/`, {
    auth: true,
  });
}
