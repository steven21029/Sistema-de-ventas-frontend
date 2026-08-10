# Contexto maestro del frontend - Sistema de ventas multiempresa

Fecha de auditoria: 2026-08-05

Codigo auditado: rama `main`, commit `8c1ad60` (`cambio de pantalla`).

Este es el documento principal para conocer el estado del frontend: que existe,
que funciona, que esta parcial y que falta. Se reviso contra el codigo vigente
de `src/`, la configuracion de Vite/Vercel y los contratos locales disponibles.

## 1. Como usar este documento

Orden recomendado antes de modificar el proyecto:

1. Leer este archivo.
2. Revisar `REGISTRO_CAMBIOS_CONTINUOS.md` para cambios posteriores.
3. Si la tarea toca administracion, consultar `API_PANEL_ADMINISTRATIVO.md`.
4. Revisar `src/app/App.jsx` o `src/admin/AdminApp.jsx`, segun el area.
5. Revisar el servicio, pagina y componente que se vaya a cambiar.

Reglas de precedencia:

- El codigo vigente tiene prioridad sobre cualquier documento.
- El cambio con fecha mas reciente tiene prioridad sobre una nota anterior.
- Este archivo reemplaza a `BRIEF_FRONTEND.md` como resumen del estado actual.
- `BRIEF_FRONTEND.md` conserva contexto historico, pero contiene contratos
  antiguos y no debe usarse para recuperar endpoints retirados.
- No copiar secretos ni valores reales de `.env` a la documentacion.

## 2. Resumen ejecutivo: que va y que falta

| Area | Estado | Que existe | Que falta o debe verificarse |
| --- | --- | --- | --- |
| Tienda publica multiempresa | Implementado | Empresa por dominio, subdominio, query o slug local; marca, colores, menu y reglas comerciales dinamicas | Pruebas integrales con al menos dos empresas y dominios reales |
| Inicio y catalogo | Implementado | Banners, combos, mas vendidos, productos, examenes, perfiles, servicios y busqueda contextual | Pruebas visuales completas y estados extremos con catalogos grandes |
| Promociones, sucursales y contacto | Implementado | Ofertas, ubicaciones, Google Maps, redes sociales y formulario de contacto | Validar URLs, accesibilidad y flujo con datos reales de cada empresa |
| Sobre nosotros | Implementado | Plantilla publica y editor administrativo por empresa | Validar contenido e imagen final de cada empresa |
| Inicio y cierre de sesion | Implementado | JWT, access token en memoria, refresh `HttpOnly`, restauracion y logout | Pruebas automatizadas de expiracion y concurrencia de requests |
| Registro y recuperacion | Parcial | Registro de comprador, verificacion de correo y reenvio de codigo desde Mi cuenta | Crear recuperacion de contrasena y pruebas E2E del alta de cuenta |
| Favoritos | Implementado | Persistencia por usuario/empresa y paso al carrito | Pruebas de cambio de empresa, articulo inactivo y sesion expirada |
| Carrito | Parcial | Invitado en `localStorage`, autenticado en backend, calculo de precios e inventario | Resolver y verificar definitivamente la fusion invitado -> usuario |
| Checkout y pedidos | Implementado con pendientes | Retiro, envio local/nacional, pedido congelado y reintento de pago | Tarifa real de envio, QA de errores y portal del comprador |
| Pagos | Parcial | Inicio, consulta, sondeo de estado y reintento | Integrar proveedor real, redireccion automatica y validar webhooks de extremo a extremo |
| Panel administrativo | Implementado | Dashboard, reportes descargables y gestion de catalogo, promociones, usuarios, empresa, inventario y contenido | QA por rol, filtros avanzados y automatizacion de pruebas |
| Despliegue | Configurado, no cerrado | Vercel para frontend, Render para API/media y fallback SPA | Validar produccion, dominios, HTTPS, cookies, CORS/CSRF, correo, almacenamiento y monitoreo |
| Calidad automatizada | Pendiente | `npm run build` funciona | No hay scripts de test, lint ni pruebas E2E |

Lectura corta del estado:

- La tienda publica ya cubre el recorrido principal desde catalogo hasta crear
  pedido y consultar un intento de pago.
- El panel administrativo React ya existe y esta conectado a las APIs; esta es
  la diferencia mas importante respecto a la version anterior de este archivo.
- Los bloqueos principales para cerrar el producto son autenticacion completa
  del comprador, fusion confiable del carrito, pago real, pruebas y produccion.

## 3. Objetivo y alcance del frontend

Aplicacion web de ventas multiempresa. Una sola base React sirve a diferentes
empresas y Django determina el contexto visible y permitido.

Cada empresa puede controlar desde el backend:

- nombre, slug, dominio, logo y datos de contacto;
- colores del sitio;
- redes sociales;
- texto, orden y estado de los modulos oficiales del menu;
- familias, categorias, productos y servicios;
- perfiles y combos;
- banners, ofertas y descuentos;
- sucursales y contenido de Sobre nosotros;
- uso de imagenes de producto;
- impuesto, envios y modo de inventario.

El frontend tiene dos superficies:

1. Tienda publica para compradores.
2. Panel administrativo para personal autorizado.

## 4. Tecnologias y arquitectura actual

- Vite 5.
- React 18.
- JavaScript con modulos ES; no usa TypeScript.
- CSS Modules y estilos globales para tokens, base y utilidades.
- `lucide-react` para iconos.
- No usa React Router.
- La navegacion SPA usa `history.pushState`, `popstate` y utilidades propias.
- El cliente HTTP usa `fetch` mediante `src/services/apiClient.js`.
- No hay libreria de estado global; `App.jsx` y `AdminApp.jsx` coordinan el
  estado con hooks de React.
- No hay framework de formularios, cache de servidor ni suite de pruebas.

Punto de entrada:

```text
src/main.jsx
|-- /administracion... -> AdminApp
`-- cualquier otra ruta -> App (tienda publica)
```

## 5. Ejecucion local y compilacion

Instalar y ejecutar:

```powershell
npm ci
npm run dev
```

URL local normal:

```text
http://127.0.0.1:5173/
```

Compilacion y previsualizacion:

```powershell
npm run build
npm run preview
```

`vite.config.js` envia estas rutas al backend local en
`http://127.0.0.1:8000`:

```text
/api/*
/media/*
```

Variables admitidas por el codigo:

```env
VITE_API_URL=/api/v1
VITE_API_BASE_URL=/api/v1
VITE_EMPRESA_SLUG=slug-local
VITE_FRONTEND_HOST=empresa.localhost:5173
```

El cliente HTTP usa por defecto `/api/v1`. `VITE_API_URL` tiene prioridad sobre
`VITE_API_BASE_URL`; si se definen manualmente, deben apuntar a la base
versionada, por ejemplo `/api/v1`, para usar el proxy y conservar
correctamente las cookies.

No existe `.env.example` en el frontend. Crearlo es un pendiente de
documentacion/configuracion antes de incorporar mas variables.

## 6. Rutas y navegacion

### Tienda publica

Rutas oficiales configuradas como respaldo:

```text
/                 Inicio
/examenes         Catalogo de examenes/productos
/perfiles         Perfiles o paquetes
/servicios        Familias -> categorias -> productos
/promociones      Ofertas
/sucursales       Sucursales
/contacto         Contacto
/sobre-nosotros   Contenido institucional
```

El texto, orden y estado visible de estas opciones provienen del backend. Las
rutas externas tambien son admitidas por las utilidades del menu.

Rutas del proceso de compra:

```text
/checkout
/pago/{referencia}
```

### Administracion

```text
/administracion
/administracion/resumen
/administracion/productos
/administracion/familias
/administracion/categorias
/administracion/paquetes
/administracion/banners
/administracion/ofertas
/administracion/descuentos
/administracion/pedidos
/administracion/pagos
/administracion/inventario
/administracion/contactos
/administracion/sucursales
/administracion/sobre-nosotros
/administracion/menu
/administracion/usuarios
/administracion/configuracion
/administracion/empresas
```

`/administracion/empresas` solo aparece para superusuario. Inventario se oculta
cuando la empresa no maneja productos fisicos.

Vercel tiene fallback de cualquier ruta hacia `index.html`; esto es necesario
porque las rutas son SPA.

## 7. Resolucion multiempresa, marca y menu

Archivo principal: `src/services/empresaService.js`.

Orden de resolucion de empresa:

1. Query string: `empresa_slug`, `slug` o `empresa`.
2. Valor recordado en `localStorage` como `ventas_empresa_slug`.
3. Dominio/subdominio actual mediante `host` y `X-Frontend-Host`.
4. `VITE_EMPRESA_SLUG` como respaldo local.

Ejemplo local:

```text
http://127.0.0.1:5173/?empresa_slug=Analiza
```

Para eliminar el override guardado:

```js
localStorage.removeItem("ventas_empresa_slug")
```

Datos de empresa consumidos por la interfaz:

- nombre, slug y logo;
- colores principal, secundario, acento, texto y fondo;
- menu;
- telefono, correo y direccion;
- redes sociales;
- impuesto y porcentaje calculado;
- disponibilidad de envios;
- imagenes de producto;
- modo de inventario.

El tema publico se aplica con variables CSS construidas en `App.jsx`. El panel
usa variables propias basadas en los mismos colores de la empresa.

Si el backend publico falla, la tienda usa contenido neutral de `public/demo/`.
No debe mostrar Analiza ni otra marca real como respaldo de una empresa distinta.

## 8. Busqueda

Existe un solo buscador contextual en el header publico, con espera de 320 ms.
No se deben agregar buscadores duplicados dentro de cada pagina.

- Inicio: combos y productos mas vendidos.
- Examenes/productos: consulta el listado actual.
- Perfiles: consulta paquetes.
- Servicios: busca productos dentro de familias y categorias.
- Promociones: filtra ofertas y productos relacionados.
- Sucursales: consulta ubicaciones.
- Contacto, Sobre nosotros, checkout y pago: buscador oculto.

El panel administrativo tiene su propio buscador por recurso y paginacion de
20 registros.

## 9. Tienda publica implementada

### 9.1 Inicio

Archivo: `src/pages/HomePage.jsx`.

- Carrusel con banners activos que tengan imagen.
- Banner completo clickeable, con destinos internos o externos.
- Cambio automatico, controles y pausa por interaccion.
- Recarga de banners al recuperar foco, volver a la pestana y cada 30 segundos.
- Combos destacados; la seccion se oculta si esta vacia.
- Hasta 10 productos mas vendidos.
- Modo demo neutral cuando no responde el backend.

### 9.2 Examenes y productos

Archivo: `src/pages/ProductListPage.jsx`.

- El endpoint se selecciona segun el tipo inferido del menu.
- Busqueda desde el header.
- Tarjetas con nombre, descripcion, precio, inventario, favorito y carrito.
- Variantes normal, compacta, mini e inicio.
- Respeta `productos_con_imagen`.
- Impide agregar articulos marcados como agotados.

### 9.3 Perfiles, paquetes y combos

Archivos: `PackageListPage.jsx` y `PackageCard.jsx`.

- Perfiles y combos son articulos vendibles con codigo y precio propios.
- Muestran componentes, precio normal/final, favorito y carrito.
- Los combos destacados tambien aparecen en Inicio.
- Sus imagenes no dependen de la bandera de imagenes de productos simples.

### 9.4 Servicios

Archivo: `src/pages/ServiceTypesPage.jsx`.

- Acordeon en tres niveles: familia, categoria y producto.
- Carga el detalle de cada familia cuando se abre.
- Durante una busqueda carga los detalles necesarios y abre coincidencias.
- Familias y categorias admiten imagen propia.
- Productos usan tarjeta compacta con favorito y carrito.
- Las tarjetas compactas mantienen igual altura, ajustan el texto dentro de su
  ancho y alinean el boton de compra en la base.
- No crea subpaginas separadas por familia.
- La familia oficial `Examenes` conserva el acordeon completo de familia,
  categoria y examen dentro de Servicios.
- Al abrir `Examenes`, carga `/api/v1/catalogo/examenes/` y agrupa la respuesta
  por `categoria_nombre` usando el orden y las imagenes del listado general.
- Las demas familias cargan su contenido mediante `servicios/detalle`.

### 9.5 Promociones

Archivo: `src/pages/PromotionsPage.jsx`.

- Consume ofertas reales, separadas de los banners de Inicio.
- Muestra imagen, tipo, descripcion, productos, precios y porcentaje.
- Admite destino interno o externo.
- La pagina es informativa; el calculador del backend decide el descuento real
  del carrito.

### 9.6 Sucursales

Archivo: `src/pages/BranchesPage.jsx`.

- Nombre, imagen, direccion, telefono y horario.
- Busqueda desde el header.
- Enlace externo a Google Maps.

### 9.7 Contacto y redes sociales

Archivo: `src/pages/ContactPage.jsx`.

- Datos publicos de la empresa y enlaces sociales configurados.
- Formulario con nombre, telefono, correo, asunto y mensaje.
- Exige nombre, mensaje y al menos telefono o correo.
- Envia el mensaje a la bandeja administrativa de la empresa.

### 9.8 Sobre nosotros

Archivos: `src/pages/AboutPage.jsx` y `src/admin/AboutSettingsPage.jsx`.

- Plantilla unica y multiempresa.
- Introduccion, historia, mision, vision, valores, compromiso e imagen.
- Oculta secciones sin contenido.
- Reutiliza las redes sociales de la empresa.
- El panel permite editar texto e imagen.

## 10. Autenticacion y cuenta

### Implementado

- Login publico y login del panel.
- Restauracion de sesion al recargar.
- Access token guardado solo en memoria.
- Refresh token en cookie `HttpOnly` administrada por el backend.
- Renovacion automatica y un solo request de refresh concurrente.
- Reintento del request original despues de renovar.
- Logout y limpieza del access token.
- Un `401` definitivo limpia la sesion y solicita iniciar nuevamente.
- Deteccion de roles administrativos y acceso directo al panel.
- El cambio entre tienda y panel administrativo se realiza dentro de la misma
  aplicacion, sin recargar el documento ni perder el access token en memoria.
- Al abrir directamente o recargar una URL administrativa, la sesion continua
  restaurandose mediante la cookie de refresh `HttpOnly`.
- Registro de comprador desde Mi cuenta.
- Verificacion de correo con codigo.
- Reenvio del codigo de verificacion.
- El registro publico no envia rol; el backend crea cuentas de comprador.
- El nombre del registro admite solamente letras Unicode y espacios.
- Telefono e identidad usan entrada de texto con teclado numerico y eliminan
  cualquier caracter que no sea digito; la identidad se limita a 13 digitos.
- El codigo se limita a 6 digitos y siempre se envia al API como texto.
- Login, contrasena y confirmacion disponen de controles Eye/EyeOff de Lucide
  que no envian el formulario.
- Crear la cuenta no solicita otro codigo: el primer envio queda a cargo del
  registro. El mensaje `Código reenviado` aparece solamente cuando el endpoint
  de reenvio responde con HTTP `200`.
- Los errores de registro, verificacion y reenvio muestran el mensaje util
  devuelto por el backend cuando esta disponible.

### Pendiente en el frontend

- Solicitud y confirmacion de recuperacion de contrasena.
- Pantalla de perfil del comprador.
- Edicion de datos personales.
- Historial de pedidos del comprador.
- Direcciones guardadas.

La recuperacion de contrasena ya tiene endpoints documentados en el backend.
Para perfil, pedidos y direcciones debe confirmarse el contrato exacto antes
de construir las pantallas.

## 11. Favoritos y carrito

### Favoritos

- Persisten por usuario y empresa.
- Admiten producto, perfil y combo.
- Se muestran en un drawer.
- Se puede agregar un favorito directamente al carrito.
- Sin sesion se abre el login.

### Carrito invitado

- Persiste en `localStorage` bajo `ventas_cart_v1:<slug_empresa>`.
- Conserva cantidad, codigo, tipo, precio mostrado e inventario conocido.
- Se mantiene al recargar.
- Agregar un articulo actualiza el contador sin abrir automaticamente el drawer;
  el usuario lo abre desde el icono del encabezado.
- Un agregado exitoso cambia temporalmente el boton a `Agregado`, anima el
  contador y muestra una confirmacion con acceso a `Ver carrito`.

### Carrito autenticado

- Se obtiene y modifica en el backend.
- Admite producto, perfil y combo.
- Se conserva entre sesiones.
- Al iniciar sesion, `App.jsx` intenta pasar uno por uno los articulos locales
  al carrito del usuario.

### Calculo comercial

- El calculador publico se ejecuta 220 ms despues de cada cambio.
- El backend es la fuente final de precio, descuento, impuesto y total.
- La interfaz muestra precio original/final y regla aplicada.
- Las cantidades respetan inventario cuando existe.
- El checkout se bloquea si hay un error de calculo.

### Problema abierto

La fusion de carrito invitado a carrito autenticado no esta cerrada. Existe
codigo de migracion y conserva localmente las lineas que fallan, pero se reporto
perdida de productos y no hay una prueba automatizada que garantice el flujo.

Solucion recomendada:

- endpoint transaccional e idempotente para fusionar ambos carritos;
- borrar el almacenamiento local solo despues de una respuesta completa;
- devolver resultado por linea y conservar cualquier articulo rechazado;
- prueba E2E: invitado agrega -> login -> carrito conserva todo.

No recuperar contratos retirados como `agregar-producto`, `codigo_barra` como
entrada alternativa o campos antiguos `producto_nombre`.

## 12. Checkout, pedidos y pagos

### Checkout

- Requiere sesion.
- Sin envios usa visualmente `Carrito -> Pago` y envia
  `retiro_en_local` al backend.
- Con envios usa `Carrito -> Entrega -> Pago`.
- Admite envio local y nacional.
- Solicita destinatario, telefono, departamento, municipio, direccion y
  referencia cuando corresponde.
- Crea el pedido desde el carrito persistente.
- Permite elegir `Pagar en linea` o `Pagar en sucursal` antes de finalizar.
- El pago presencial carga las sucursales activas de la empresa y exige una
  seleccion antes de solicitar la prefactura.
- Si crear el pago falla despues de crear el pedido, guarda el pedido pendiente
  en `sessionStorage` y permite reintentar sin duplicarlo.
- El pedido devuelto pasa a ser la fotografia comercial congelada.

Pendientes del checkout:

- definir y mostrar tarifa real de envio antes de confirmar;
- eliminar el telefono temporal `88888888` cuando falte telefono empresarial;
- probar doble clic, recarga, expiracion de sesion y errores parciales;
- decidir si se implementaran direcciones guardadas.

### Pagos

- Ruta separada por referencia.
- Estados: pendiente, aprobado y rechazado.
- Consulta automatica cada 8 segundos mientras esta pendiente.
- No muestra una accion manual para actualizar el estado.
- Reintento de un pago rechazado cuando existe contexto local.
- Muestra `url_pago` si el backend devuelve una URL HTTP/HTTPS.
- El pago en linea conserva `POST /api/v1/pagos/iniciar/` sin cambios.
- El pago presencial usa
  `POST /api/v1/pedidos/pedidos/{id}/pago-en-sucursal/` y presenta la respuesta
  oficial del pedido, pago y prefactura.
- La pantalla de pago presencial descarga el PDF autenticado desde
  `GET /api/v1/pedidos/pedidos/{id}/prefactura/pdf/` y puede solicitar el
  reenvio mediante `POST .../prefactura/reenviar-correo/`.
- React no genera el PDF, no recibe correos alternativos, no envia mensajes y no
  confirma el pago presencial; todo eso permanece en el backend.

Estado parcial:

- El proveedor actual es simulado.
- No existe cobro bancario real ni redireccion automatica.
- El usuario espera redireccion al proveedor cuando exista una URL real.
- No almacenar tarjeta, CVV ni credenciales bancarias en este frontend.

## 13. Panel administrativo implementado

Entrada principal: `src/admin/AdminApp.jsx`.

### 13.1 Acceso y aislamiento

- Login y restauracion con la misma sesion segura.
- `Ir al panel administrativo` reutiliza la sesion activa de la tienda sin
  solicitar credenciales nuevamente.
- Contexto administrativo obtenido del backend.
- Empresa activa recordada como `ventas_admin_empresa_slug`.
- Selector de empresa para cuentas con mas de una empresa permitida.
- Gerentes y administradores quedan sujetos al contexto autorizado por el
  backend; React no debe considerarse una barrera de seguridad.
- Compradores no tienen acceso.
- Superusuario puede ver el modulo Todas las empresas.
- Menu lateral responsivo y enlace a la tienda publica de la empresa activa.

### 13.2 Dashboard

- Ingresos del mes, ventas confirmadas, ticket promedio y monto pendiente.
- Comparacion porcentual contra el mes anterior.
- Grafica de ingresos confirmados de los ultimos seis meses.
- Distribucion del mes actual entre pedidos confirmados, pendientes y rechazados.
- Desglose de subtotal, descuentos, impuestos y envios.
- Productos mas vendidos del periodo.
- Los indicadores oficiales se consumen desde
  `GET /api/v1/reportes/resumen-ventas/`; React ya no descarga todos los pedidos
  para calcular los totales.
- El dashboard solicita un resumen del mes actual con comparacion y otro resumen
  agrupado por mes para la serie de los ultimos seis meses.
- Solo la seccion Pedidos recientes conserva una consulta paginada de cinco
  registros a `GET /api/v1/pedidos/pedidos/`.
- El centro de reportes pide una fecha inicial y un periodo `semanal` de 7 dias,
  `quincenal` de 15 dias o `mensual` de un mes contado desde esa fecha. React
  calcula la fecha final sin pedirla al usuario.
- No se puede descargar un periodo que incluya fechas posteriores al dia actual;
  la fecha inicial maxima cambia automaticamente segun el periodo elegido.
- El usuario tambien elige contenido `resumen`, `ventas`, `pagos` o `impuestos`,
  y formato `PDF`, `XLSX` o `CSV`.
- Las descargas usan `GET /api/v1/reportes/ventas/exportar/`, conservan la
  autenticacion JWT y respetan el nombre indicado por `Content-Disposition`.
- Conteo de catalogo activo, usuarios y mensajes nuevos.
- Pedidos recientes.
- Mensajes pendientes de revision.
- Resumen de inventario, agotados y bajo stock cuando aplica.
- Los totales comerciales y contables mostrados proceden del backend; el
  frontend solo presenta y descarga la informacion autorizada para la empresa.

### 13.3 Modulos administrativos

| Modulo | Estado y acciones actuales |
| --- | --- |
| Familias | Listar, buscar, paginar, crear, editar, activar/desactivar, imagen y eliminar si el backend lo permite |
| Categorias | Igual que familias, con dependencia de familia |
| Productos y servicios | CRUD, clasificacion, precio, imagen, tipo de articulo y minimo de inventario |
| Perfiles y combos | CRUD, componentes con cantidad/orden, precio, imagen y destacado |
| Menu | Editar texto, orden y estado de modulos oficiales; no crear ni eliminar |
| Sucursales | CRUD de datos, ubicacion, Maps, orden e imagen |
| Banners | CRUD, imagen, destino, orden, fechas y vigencia |
| Ofertas | CRUD para uno/varios productos o paquete |
| Descuentos | CRUD de reglas porcentuales, alcance, productos y vigencia |
| Usuarios | Crear/editar segun rol, bloquear/desbloquear y asignar permisos; no eliminar |
| Mensajes | Consultar detalle y cambiar estado; contenido historico no editable |
| Pedidos | Listado y detalle de solo lectura |
| Pagos | Listado y detalle de solo lectura |
| Inventario | Resumen, busqueda y ajuste de existencia con motivo/referencia |
| Configuracion | Datos, contacto, redes, logo, imagen de sucursal, colores, impuesto, envios e imagenes de producto |
| Sobre nosotros | Editor de contenido institucional e imagen |
| Empresas | CRUD general visible solo al superusuario |

Comportamiento comun del panel:

- Busqueda, paginacion y opcion de incluir inactivos.
- Formularios laterales para crear, editar o consultar detalle.
- Carga de imagen por URL o archivo, segun el recurso.
- Errores de campo del backend.
- Confirmacion de eliminacion.
- Un `409 Conflict` se presenta como registro protegido por historial.
- Roles disponibles en el formulario de usuario se reducen segun el actor.
- En pedidos y pagos, `sin_pago` se presenta como `Pagadas en sucursal`; los
  registros con metodo sucursal que siguen pendientes muestran
  `Pendiente en sucursal`.

### 13.4 Pendientes del panel

- Probar cada modulo con superusuario, administrador maestro, administrador de
  empresa y gerente.
- Probar aislamiento cambiando slugs/IDs manualmente.
- Exponer filtros avanzados ya disponibles en APIs de pedidos, pagos, usuarios,
  fechas y estados; hoy la interfaz generica usa principalmente busqueda.
- Probar resumen y exportaciones con datos reales, periodos grandes, todos los
  formatos y cada rol administrativo autorizado.
- Ampliar reportes a inventario o usuarios si entran en el alcance; la primera
  version cubre resumen, ventas, pagos e impuestos.
- Definir devoluciones y cierres contables si deben formar parte de reportes
  posteriores.
- Incorporar historial detallado de movimientos de inventario.
- Definir flujo operativo para cambiar estados de pedido; actualmente pedidos
  y pagos son deliberadamente de solo lectura.
- Agregar notificaciones o indicadores de actividad en tiempo real.
- Pruebas automatizadas de CRUD, uploads, paginacion y permisos.
- Repetir la revision visual del panel con datos reales y tablas extensas; la
  estructura vacia y los formularios ya fueron validados en movil.

## 14. Servicios y contratos consumidos

Mapa por archivo:

```text
src/services/apiClient.js
  URL, fetch, JWT, refresh, errores, arrays y media.

src/services/empresaService.js
  Empresa actual, menu y Sobre nosotros.

src/services/paginasService.js
  Productos, examenes, perfiles, combos, servicios, sucursales y contacto.

src/services/promocionesService.js
  Banners y ofertas.

src/services/authService.js
  Login, perfil, restauracion y logout.

src/services/favoritosService.js
  Favoritos.

src/services/cartService.js
  Calculo y carrito persistente.

src/services/pedidoService.js
  Generacion de pedido desde carrito.

src/services/pagoService.js
  Inicio y consulta de pago.

src/services/adminService.js
  Contexto administrativo, CRUD generico, configuracion, inventario y acciones.
```

Contratos detallados del panel: `API_PANEL_ADMINISTRATIVO.md`.

## 15. Almacenamiento, sesion y seguridad del navegador

`localStorage`:

```text
ventas_empresa_slug
ventas_admin_empresa_slug
ventas_cart_v1:<slug_empresa>
```

`sessionStorage`:

- pedido creado pendiente de iniciar/reintentar pago;
- contexto minimo del pago para reintento, sucursal y prefactura.

No se guarda el access token en almacenamiento persistente. El refresh token
debe permanecer en una cookie `HttpOnly` del backend.

Antes de produccion se debe confirmar:

- HTTPS y cookies `Secure`/`SameSite` correctas;
- CORS, CSRF y hosts permitidos;
- aislamiento multiempresa en todos los endpoints;
- ausencia de secretos en el bundle Vite;
- validacion de archivos y URLs en el backend;
- politicas de expiracion, bloqueo y revocacion de sesiones;
- proteccion y firma de webhooks de pago.

## 16. Despliegue actual

`vercel.json` contiene:

- proxy de `/api/*` hacia el backend de Render;
- proxy de `/media/*` hacia Render;
- fallback de rutas SPA a `/index.html`.

Esto significa que el repositorio esta configurado para desplegar, pero no
demuestra por si solo que produccion este validada.

Falta confirmar en el entorno publicado:

- frontend y backend responden por HTTPS;
- login, refresh y logout conservan la cookie entre Vercel y Render;
- media e imagenes cargan correctamente;
- recargar cualquier ruta publica o administrativa no produce 404;
- dominios y empresas resuelven el tenant correcto;
- tiempos de arranque de Render no rompen la experiencia;
- proveedor de correo y pagos real;
- almacenamiento persistente de base de datos e imagenes;
- logs, monitoreo y alertas.

## 17. Estructura principal

```text
frontend/
|-- public/demo/                  Recursos neutrales sin backend
|-- src/
|   |-- admin/                    Panel administrativo
|   |-- app/App.jsx               Orquestador de tienda publica
|   |-- components/
|   |   |-- auth/
|   |   |-- cart/
|   |   |-- catalog/
|   |   |-- checkout/
|   |   |-- favorites/
|   |   |-- layout/
|   |   `-- social/
|   |-- config/demoContent.js
|   |-- pages/                    Paginas publicas, checkout y pago
|   |-- services/                 Cliente y contratos HTTP
|   |-- styles/                   Tokens, base y utilidades
|   `-- utils/                    Menu, busqueda, dinero, errores y pagos
|-- API_PANEL_ADMINISTRATIVO.md
|-- BRIEF_FRONTEND.md             Historico; no es la fuente actual
|-- CONTEXTO_CONTINUACION.md      Este documento maestro
|-- REGISTRO_CAMBIOS_CONTINUOS.md
|-- package.json
|-- vercel.json
`-- vite.config.js
```

Archivos que coordinan mas responsabilidades y requieren especial cuidado:

- `src/app/App.jsx`: empresa, menu, rutas, sesion, carrito, favoritos, busqueda,
  checkout y pago.
- `src/admin/AdminApp.jsx`: sesion administrativa, empresa activa, rutas,
  permisos visibles y composicion del panel.
- `src/admin/AdminResourcePage.jsx`: CRUD generico del panel.
- `src/admin/resourceConfigs.js`: campos, columnas y reglas de cada recurso.
- `src/services/apiClient.js`: autenticacion y comportamiento de todos los
  requests.
- `src/utils/menu.js`: compatibilidad entre menu de backend y paginas React.

## 18. Verificacion realizada el 2026-08-05

Repositorio antes de actualizar este documento:

- rama `main`;
- `HEAD` y `origin/main` en `8c1ad60`;
- arbol de trabajo limpio.

Compilacion:

```text
npm run build: correcto
Vite 5.4.21
1641 modulos transformados
CSS: 98.28 kB (16.98 kB gzip)
JS: 339.55 kB (97.62 kB gzip)
```

Limitaciones de la verificacion:

- `package.json` no tiene script de pruebas.
- No hay script de lint.
- No hay pruebas E2E.
- No se ejecuto una matriz completa contra el backend con todos los roles.
- No se verificaron visualmente todas las rutas y breakpoints en esta auditoria.
- La configuracion de despliegue se inspecciono, pero el sitio publicado no se
  valido como parte de esta actualizacion.

Una compilacion correcta confirma que el bundle se genera; no confirma por si
sola que cada flujo de negocio funcione contra datos reales.

## 19. Pendientes priorizados

### Prioridad alta: cerrar funcionalidad principal

1. Resolver y probar la fusion del carrito invitado al autenticarse.
2. Construir recuperacion de contrasena y probar el alta/verificacion de cuenta.
3. Integrar una pasarela de pago real y redirigir a `url_pago`.
4. Definir calculo/tarifa real de envio antes de cobrar.
5. Ejecutar pruebas E2E del recorrido catalogo -> carrito -> login -> pedido ->
   pago.
6. Probar el panel con todos los roles y con dos empresas para confirmar
   aislamiento y permisos.

### Prioridad media: completar experiencia y operacion

1. Crear perfil del comprador e historial de pedidos.
2. Decidir e implementar direcciones guardadas.
3. Probar prefactura PDF, correo y pago presencial con datos reales y todos los
   estados de error del backend.
4. Agregar filtros avanzados y exportaciones al panel.
5. Definir reportes, graficas e indicadores comerciales.
6. Agregar historial visible de movimientos de inventario.
7. Definir notificaciones de venta y atencion de mensajes.
8. Crear `.env.example` sin secretos.
9. Agregar pruebas unitarias, de integracion y E2E.
10. Agregar lint/formato y validaciones en CI.
11. Hacer auditoria de accesibilidad, teclado, foco, contraste y lectores de
    pantalla.
12. Probar responsive en movil, tablet, laptop y monitor amplio.

### Antes de produccion

1. Cambiar credenciales temporales.
2. Usar base de datos y almacenamiento persistentes.
3. Configurar correo real.
4. Configurar pagos, secretos y webhooks fuera del repositorio.
5. Configurar dominios, HTTPS, cookies, CORS, CSRF y hosts.
6. Validar backups y recuperacion.
7. Incorporar monitoreo de errores, logs y alertas.
8. Ejecutar pruebas de seguridad y aislamiento multiempresa.
9. Ejecutar pruebas de carga basicas para catalogo y panel.
10. Hacer una aceptacion funcional con datos reales de cada empresa.

## 20. Problemas y riesgos conocidos

- Fusion de carrito invitado no garantizada.
- Pagos simulados; el flujo no cobra dinero real.
- Envio aparece como `Por definir` antes de crear el pedido.
- Respaldo temporal de telefono `88888888` en checkout.
- Sin pruebas automatizadas, los cambios en `App.jsx` pueden afectar varias
  funciones a la vez.
- El panel depende de un CRUD generico grande; una modificacion de formularios
  puede impactar muchos recursos.
- No se ha documentado una estrategia final de observabilidad.
- El fallback demo permite revisar la apariencia, pero no valida ningun flujo
  autenticado ni comercial.
- El query string de empresa es util para desarrollo; produccion debe confiar
  principalmente en dominios autorizados y en aislamiento de backend.
- Las operaciones autenticadas del carrito tienen un limite de espera de 30
  segundos y los errores HTML de Django no se muestran como texto al usuario.
- El backend debe conservar `DATABASE_CONN_MAX_AGE=0` al usar el Session pooler
  de Supabase para no agotar su limite de conexiones.

## 21. Decisiones que deben conservarse

- Mantener el sistema multiempresa; no quemar datos de Analiza para todos.
- Este repositorio y sus tareas son exclusivamente de frontend. Si un cambio
  requiere backend, describirlo para el responsable sin abrir, ejecutar ni
  modificar el proyecto backend.
- Usar logo, colores, menu, contenido e imagenes del backend.
- Usar recursos neutrales si falla la empresa publica.
- Mantener un solo buscador contextual en el header.
- Servicios conserva los tres niveles: familia, categoria y producto o examen.
- La familia `Examenes` usa `/catalogo/examenes/`; las demas usan
  `servicios/detalle`.
- Servicios usa acordeones, no subpaginas.
- Inicio muestra solo secciones con contenido.
- Banners y ofertas son recursos diferentes.
- El banner completo puede ser clickeable.
- El backend decide precios, descuentos, impuesto e inventario.
- No mostrar impuesto cuando la empresa no lo cobra.
- No mostrar entrega cuando la empresa no ofrece envios.
- Sin envios: `Carrito -> Pago`.
- Con envios: `Carrito -> Entrega -> Pago`.
- Mantener checkout y estado de pago en pantallas separadas.
- No almacenar datos bancarios sensibles en React.
- Pedidos y pagos administrativos son historial de solo lectura, salvo que se
  apruebe un flujo de negocio controlado.
- `.agents/`, `skills-lock.json`, `node_modules/` y `dist/` no deben subirse.

## 22. Definicion practica de frontend terminado

El frontend no debe considerarse terminado solo porque compile. Para cerrar la
primera version deben cumplirse al menos estas condiciones:

- comprador puede registrarse, verificar correo, iniciar/cerrar sesion y
  recuperar contrasena;
- carrito conserva articulos al recargar y al autenticarse;
- precios, descuentos, inventario, impuesto y envio coinciden con backend;
- pedido se crea una sola vez aunque falle o se repita el pago;
- proveedor real confirma aprobado/rechazado mediante flujo seguro;
- comprador puede consultar al menos sus pedidos;
- cada rol administrativo puede hacer solo lo permitido;
- dos empresas simultaneas no comparten datos, marca, carrito ni permisos;
- rutas funcionan al abrirse y recargarse directamente en produccion;
- pruebas automatizadas cubren sesion, carrito, checkout, pagos y permisos;
- revision responsive, accesibilidad y seguridad aprobada;
- logs, backups y monitoreo configurados.

## 23. Prompt para continuar en una conversacion nueva

```text
Lee primero CONTEXTO_CONTINUACION.md. Despues revisa el codigo relacionado con
la tarea y, si toca administracion, API_PANEL_ADMINISTRATIVO.md. El codigo actual
tiene prioridad sobre notas antiguas. No recuperes endpoints o componentes
marcados como obsoletos. Antes de editar revisa Git. Conserva multiempresa,
branding dinamico, aislamiento por rol y las reglas de impuesto, inventario,
envio y precios calculados por el backend. Al terminar actualiza en este archivo
el estado de la funcion y la fecha de verificacion si el cambio es relevante.
```

## 24. Documentos relacionados

- `API_PANEL_ADMINISTRATIVO.md`: contrato detallado del panel.
- `REGISTRO_CAMBIOS_CONTINUOS.md`: historial reciente de backend y frontend.
- `BRIEF_FRONTEND.md`: contexto historico anterior al panel; usar con cautela.
- `INSTRUCCIONES_CODEX_PROYECTO.md`: requisitos generales originales.
- `README.md`: actualmente solo identifica el repositorio y debe ampliarse en
  una tarea posterior si se desea una guia publica corta.
