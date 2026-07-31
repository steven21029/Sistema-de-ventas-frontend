const DEMO_IMAGE_PATHS = {
  logo: "/demo/tu-logo-aqui.png",
  product: "/demo/tu-producto-aqui.png",
  banner: "/demo/tu-banner-promocional-aqui.png",
};

export const DEMO_EMPRESA = {
  nombre: "Tu logo aqui",
  slug: "demo",
  logo: DEMO_IMAGE_PATHS.logo,
  color_principal: "#1269e8",
  color_secundario: "#2388ff",
  color_acento: "#142033",
  color_texto: "#000000",
  color_fondo: "#ffffff",
  productos_con_imagen: true,
  menu: [
    { clave: "inicio", texto: "Inicio", ruta: "/", orden: 1, activo: true },
    { clave: "productos", texto: "Productos", ruta: "/productos", orden: 2, activo: true },
    { clave: "paquetes", texto: "Paquetes", ruta: "/paquetes", orden: 3, activo: true },
    { clave: "servicios", texto: "Servicios", ruta: "/servicios", orden: 4, activo: true },
    { clave: "promociones", texto: "Promociones", ruta: "/promociones", orden: 5, activo: true },
    { clave: "sucursales", texto: "Sucursales", ruta: "/sucursales", orden: 6, activo: true },
    { clave: "contacto", texto: "Contacto", ruta: "/contacto", orden: 7, activo: true },
  ],
};

export const DEMO_BANNERS = [
  {
    titulo: "Tu banner promocional aqui",
    texto_alternativo: "Tu banner promocional aqui",
    imagen_final: DEMO_IMAGE_PATHS.banner,
    url_boton: "#productos",
    orden: 1,
  },
];

export const DEMO_PRODUCTS = [
  {
    codigo: "DEMO-PRODUCTO",
    nombre: "Tu producto aqui",
    descripcion: "Imagen de producto de prueba para revisar la tienda sin backend.",
    categoria_nombre: "Producto de prueba",
    familia_nombre: "Catalogo",
    precio: 0,
    existencia: 1,
    imagen_final: DEMO_IMAGE_PATHS.product,
  },
];
