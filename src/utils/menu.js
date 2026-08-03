const DEFAULT_MENU_ITEMS = [
  { clave: "inicio", texto: "Inicio", ruta: "/", orden: 1 },
  { clave: "examenes", texto: "Examenes", ruta: "/examenes", orden: 2 },
  { clave: "perfiles", texto: "Perfiles", ruta: "/perfiles", orden: 3 },
  { clave: "servicios", texto: "Servicios", ruta: "/servicios", orden: 4 },
  { clave: "promociones", texto: "Promociones", ruta: "/promociones", orden: 5 },
  { clave: "sucursales", texto: "Sucursales", ruta: "/sucursales", orden: 6 },
  { clave: "contacto", texto: "Contacto", ruta: "/contacto", orden: 7 },
  {
    clave: "sobre_nosotros",
    texto: "Sobre nosotros",
    ruta: "/sobre-nosotros",
    orden: 8,
  },
];

const PAGE_TYPE_ALIASES = {
  home: "inicio",
  inicio: "inicio",
  portada: "inicio",
  productos: "productos",
  producto: "productos",
  products: "productos",
  product: "productos",
  catalogo: "productos",
  catalog: "productos",
  articulos: "productos",
  articulo: "productos",
  examenes: "productos",
  examen: "productos",
  paquetes: "paquetes",
  paquete: "paquetes",
  packages: "paquetes",
  package: "paquetes",
  perfiles: "paquetes",
  perfil: "paquetes",
  combos: "paquetes",
  combo: "paquetes",
  servicios: "servicios",
  servicio: "servicios",
  services: "servicios",
  service: "servicios",
  categorias: "servicios",
  categoria: "servicios",
  familias: "servicios",
  familia: "servicios",
  promociones: "promociones",
  promocion: "promociones",
  ofertas: "promociones",
  oferta: "promociones",
  sucursales: "sucursales",
  sucursal: "sucursales",
  branches: "sucursales",
  branch: "sucursales",
  ubicaciones: "sucursales",
  ubicacion: "sucursales",
  contacto: "contacto",
  contactenos: "contacto",
  contact: "contacto",
  sobre_nosotros: "sobre_nosotros",
  "sobre-nosotros": "sobre_nosotros",
  sobrenosotros: "sobre_nosotros",
};

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

function normalizeMenuPageType(value) {
  const normalizedValue = slugify(value);

  if (PAGE_TYPE_ALIASES[normalizedValue]) {
    return PAGE_TYPE_ALIASES[normalizedValue];
  }

  if (
    normalizedValue.includes("product") ||
    normalizedValue.includes("catalog") ||
    normalizedValue.includes("producto") ||
    normalizedValue.includes("catalogo") ||
    normalizedValue.includes("examen")
  ) {
    return "productos";
  }

  if (
    normalizedValue.includes("package") ||
    normalizedValue.includes("paquete") ||
    normalizedValue.includes("perfil") ||
    normalizedValue.includes("combo")
  ) {
    return "paquetes";
  }

  if (normalizedValue.includes("service") || normalizedValue.includes("servicio")) {
    return "servicios";
  }

  if (normalizedValue.includes("promo") || normalizedValue.includes("oferta")) {
    return "promociones";
  }

  if (
    normalizedValue.includes("branch") ||
    normalizedValue.includes("sucursal") ||
    normalizedValue.includes("ubicacion")
  ) {
    return "sucursales";
  }

  if (normalizedValue.includes("contact")) {
    return "contacto";
  }

  if (
    normalizedValue.includes("sobre-nosotros") ||
    normalizedValue.includes("sobrenosotros") ||
    normalizedValue.includes("about")
  ) {
    return "sobre_nosotros";
  }

  return normalizedValue;
}

function inferMenuPageType(item, label, href) {
  const explicitType =
    item.tipo_pagina ||
    item.page_type ||
    item.tipo ||
    item.plantilla ||
    item.componente ||
    item.seccion;

  if (explicitType) {
    return normalizeMenuPageType(explicitType);
  }

  const target = slugify(`${item.clave || ""} ${label || ""} ${href || ""}`);

  if (!target || target === "/") {
    return "inicio";
  }

  if (target.includes("inicio") || target.includes("home") || href === "/") {
    return "inicio";
  }

  if (
    target.includes("producto") ||
    target.includes("product") ||
    target.includes("catalogo") ||
    target.includes("catalog") ||
    target.includes("articulo") ||
    target.includes("examen")
  ) {
    return "productos";
  }

  if (
    target.includes("paquete") ||
    target.includes("package") ||
    target.includes("perfil") ||
    target.includes("combo")
  ) {
    return "paquetes";
  }

  if (
    target.includes("servicio") ||
    target.includes("service") ||
    target.includes("categoria") ||
    target.includes("familia")
  ) {
    return "servicios";
  }

  if (target.includes("promocion") || target.includes("oferta")) {
    return "promociones";
  }

  if (
    target.includes("sucursal") ||
    target.includes("branch") ||
    target.includes("ubicacion") ||
    target.includes("ubicaciones")
  ) {
    return "sucursales";
  }

  if (target.includes("contact")) {
    return "contacto";
  }

  if (
    target.includes("sobre-nosotros") ||
    target.includes("sobrenosotros") ||
    target.includes("about")
  ) {
    return "sobre_nosotros";
  }

  return "";
}

export function normalizeMenuItems(menu = []) {
  const sourceItems = Array.isArray(menu) && menu.length > 0 ? menu : DEFAULT_MENU_ITEMS;

  return [...sourceItems]
    .filter((item) => item && item.activo !== false)
    .sort((first, second) => (Number(first.orden) || 0) - (Number(second.orden) || 0))
    .map((item, index) => {
      const label = item.texto || item.nombre || item.titulo || item.clave || `Pagina ${index + 1}`;
      const href = normalizeRoute(item);
      const key = slugify(item.clave || label) || `pagina-${index + 1}`;
      const isExternal = /^https?:\/\//i.test(href);
      const pageType = isExternal ? "" : inferMenuPageType(item, label, href);

      return {
        ...item,
        key,
        label,
        href,
        pageType,
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
    menuItems.find(
      (item) =>
        !item.isExternal &&
        item.path &&
        item.path !== "/" &&
        normalizedCurrentPath.startsWith(`${item.path}/`),
    ) ||
    null
  );
}
