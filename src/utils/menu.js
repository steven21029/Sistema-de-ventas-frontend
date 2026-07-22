const DEFAULT_MENU_ITEMS = [
  { clave: "inicio", texto: "Inicio", ruta: "/", orden: 1 },
  { clave: "examenes", texto: "Examenes", ruta: "/examenes", orden: 2 },
  { clave: "perfiles", texto: "Perfiles", ruta: "/perfiles", orden: 3 },
  { clave: "servicios", texto: "Servicios", ruta: "/servicios", orden: 4 },
  { clave: "promociones", texto: "Promociones", ruta: "/promociones", orden: 5 },
];

function slugify(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePath(path) {
  const cleanPath = String(path || "/").trim() || "/";
  const withoutQuery = cleanPath.split("?")[0].split("#")[0] || "/";
  const withSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const withoutTrailingSlash =
    withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;

  return withoutTrailingSlash.toLowerCase();
}

function normalizeRoute(menuItem) {
  const label = menuItem.texto || menuItem.nombre || menuItem.titulo || menuItem.clave;
  const route = menuItem.ruta || menuItem.url || `/${slugify(menuItem.clave || label)}`;
  const isExternal = /^https?:\/\//i.test(route);

  if (isExternal) {
    return route;
  }

  return route.startsWith("/") ? route : `/${route}`;
}

export function normalizeMenuItems(menu = []) {
  const sourceItems = Array.isArray(menu) && menu.length > 0 ? menu : DEFAULT_MENU_ITEMS;

  return [...sourceItems]
    .filter((item) => item && item.activo !== false)
    .sort((first, second) => (Number(first.orden) || 0) - (Number(second.orden) || 0))
    .map((item, index) => {
      const label = item.texto || item.nombre || item.titulo || item.clave || `Pagina ${index + 1}`;
      const href = normalizeRoute(item);
      const key = item.clave || slugify(label) || `pagina-${index + 1}`;
      const isExternal = /^https?:\/\//i.test(href);

      return {
        ...item,
        key,
        label,
        href,
        path: isExternal ? href : normalizePath(href),
        isExternal,
      };
    });
}

export function findActiveMenuItem(menuItems, currentPath) {
  const normalizedCurrentPath = normalizePath(currentPath);
  const homeItem = menuItems.find((item) => item.key === "inicio") || menuItems[0];

  if (normalizedCurrentPath === "/") {
    return homeItem;
  }

  return (
    menuItems.find((item) => !item.isExternal && item.path === normalizedCurrentPath) ||
    homeItem
  );
}
