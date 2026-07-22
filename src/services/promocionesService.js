import { apiGet, asArray } from "./apiClient";

export async function getBannersPromocionales(empresaSlug) {
  const payload = await apiGet("/promociones/banners/", {
    empresa_slug: empresaSlug,
    _refresh: Date.now(),
  });

  return asArray(payload).sort((first, second) => {
    const firstOrder = Number(first.orden) || 0;
    const secondOrder = Number(second.orden) || 0;

    return firstOrder - secondOrder;
  });
}
