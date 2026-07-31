# Contexto de continuacion - Sistema de ventas multiempresa

Fecha del estado: 2026-07-31

Este documento resume el estado real del proyecto para continuar el trabajo en
otra computadora o en una conversacion nueva. El codigo actual y el registro de
cambios mas reciente del backend tienen prioridad sobre documentos antiguos.

## 1. Lectura recomendada para continuar

Leer en este orden:

1. Este archivo.
2. `backend/docs/REGISTRO_CAMBIOS_CONTINUOS.md`.
3. `frontend/src/app/App.jsx`.
4. Los servicios de `frontend/src/services/` relacionados con la tarea.
5. La pagina o componente que se vaya a modificar.

Regla de precedencia:

- El codigo vigente gana sobre una nota antigua.
- El cambio con fecha mas reciente gana sobre un contrato anterior.
- `frontend/BRIEF_FRONTEND.md` es una copia antigua del 22 de julio y no debe
  usarse para recuperar endpoints retirados del carrito.
- `backend/docs/REGISTRO_CAMBIOS_CONTINUOS.md` es el registro mas reciente, pero
  debe revisarse antes de publicarlo porque contiene notas locales de desarrollo.

## 2. Advertencia critica antes de cambiar de computadora

Los dos repositorios tienen muchos cambios locales que todavia no estan en
GitHub. Clonar ahora desde GitHub no recuperaria el estado descrito aqui.

Frontend:

- Repositorio: `https://github.com/steven21029/Sistema-de-ventas-frontend.git`
- Rama actual: `main`.
- Ultimo commit visible: `9c8cc99 pagina de servicio con cards`.
- Hay archivos modificados, eliminados y nuevos sin commit.

Backend:

- Repositorio: `https://github.com/steven21029/Sistema-de-ventas-backend.git`
- Rama actual: `main`.
- Ultimo commit visible: `c0892bc imagen en las cards de sucursales y que sea una sola para todas desde empreza`.
- Hay cambios de catalogo, empresas, favoritos, pedidos, promociones, usuarios,
  pagos, migraciones y documentacion sin commit.

Antes de moverse a otra PC se deben revisar, confirmar, hacer commit y subir los
cambios de ambos repositorios por separado.

No se deben subir estos archivos o carpetas sensibles/locales del backend:

- `.env`
- `db.sqlite3`
- `media/`
- `.venv/`

Estos elementos estan ignorados por Git. Si se necesita conservar exactamente
la base de prueba y sus imagenes, se deben copiar de forma privada o crear un
respaldo separado. Nunca se deben publicar credenciales locales.

En el frontend tambien estan ignorados intencionalmente:

- `.agents/`
- `skills-lock.json`
- `node_modules/`
- `dist/`

## 3. Objetivo del producto

Tienda web de ventas multiempresa. Cada empresa comparte la misma aplicacion,
pero controla desde Django:

- nombre y slug;
- logo;
- colores;
- menu y nombres de paginas;
- catalogo;
- familias, categorias y productos;
- perfiles y combos;
- banners y ofertas;
- sucursales y datos de contacto;
- uso de imagenes individuales;
- aplicacion de impuesto;
- disponibilidad de envios.

La interfaz esta orientada a vender productos y servicios. Debe ser visual,
clara, atractiva y rapida para comprar; no debe sentirse como un panel
administrativo ni como una pagina de lectura.

## 4. Tecnologias actuales

Frontend:

- Vite 5.
- React 18.
- JavaScript, sin TypeScript.
- CSS Modules y CSS global para tokens/base.
- `lucide-react` para iconos.
- Sin React Router; la navegacion SPA se controla con `history.pushState`,
  `popstate` y utilidades propias.

Backend:

- Django 5.2.
- Django REST Framework.
- SimpleJWT.
- SQLite en desarrollo local.
- Preparado para PostgreSQL/Supabase en el futuro.
- Pillow para imagenes.

## 5. Estructura local

```text
sistema de Ventas/
|-- backend/
|   |-- catalogo/
|   |-- contacto/
|   |-- empresas/
|   |-- favoritos/
|   |-- inventario/
|   |-- pagos/
|   |-- pedidos/
|   |-- promociones/
|   |-- usuarios/
|   |-- config/
|   |-- docs/
|   |-- media/                 # ignorado por Git
|   |-- db.sqlite3             # ignorado por Git
|   |-- .env                   # ignorado por Git
|   `-- manage.py
`-- frontend/
    |-- public/demo/           # imagenes neutrales sin backend
    |-- src/app/
    |-- src/components/
    |-- src/config/
    |-- src/pages/
    |-- src/services/
    |-- src/styles/
    |-- src/utils/
    `-- vite.config.js
```

## 6. Puesta en marcha en Windows

### Backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

La API local queda en:

```text
http://127.0.0.1:8000/api/
```

No copiar secretos a este documento. Configurar el `.env` de forma privada.

### Frontend

```powershell
cd frontend
npm ci
npm run dev
```

La aplicacion queda normalmente en:

```text
http://127.0.0.1:5173/
```

Si PowerShell no reconoce `npm` despues de instalar Node, cerrar y abrir la
terminal. Como reparacion temporal de la sesion:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
```

`vite.config.js` envia `/api` y `/media` a `http://127.0.0.1:8000`. El cliente
usa `/api` por defecto, por lo que no es obligatorio crear un `.env` del
frontend en desarrollo local.

Variables opcionales:

```env
VITE_API_URL=/api
VITE_EMPRESA_SLUG=Analiza
VITE_FRONTEND_HOST=analiza.localhost:5173
```

Es preferible mantener `VITE_API_URL=/api` durante desarrollo para aprovechar
el proxy y las cookies de sesion.

## 7. Resolucion multiempresa

Archivo principal: `src/services/empresaService.js`.

Orden actual de resolucion:

1. Query string: `empresa_slug`, `slug` o `empresa`.
2. Slug recordado en `localStorage` bajo `ventas_empresa_slug`.
3. Dominio o subdominio actual mediante `host` y `X-Frontend-Host`.
4. `VITE_EMPRESA_SLUG` como respaldo local.

Para probar Analiza localmente:

```text
http://127.0.0.1:5173/?empresa_slug=Analiza
```

Para probar otra empresa:

```text
http://127.0.0.1:5173/?empresa_slug=SLUG_DE_LA_EMPRESA
```

El valor queda recordado. Para dejar de forzar una empresa:

```js
localStorage.removeItem("ventas_empresa_slug")
```

Endpoint principal:

```text
GET /api/empresas/actual/?slug=Analiza
GET /api/empresas/actual/?host=analiza.localhost:5173
```

El frontend usa de la empresa, entre otros:

- `nombre`
- `slug`
- `logo`
- `color_principal`
- `color_secundario`
- `color_acento`
- `color_texto`
- `color_fondo`
- `menu`
- `telefono`
- `correo`
- `direccion`
- `cobra_impuesto`
- `tiene_envios`
- `productos_con_imagen`
- `modo_inventario`

No debe aparecer el nombre, logo ni color de Analiza como respaldo de otra
empresa. Si el backend falla se usan recursos neutrales de `public/demo/`.

## 8. Tema, logo e imagenes

El tema se construye en `src/app/App.jsx` con variables CSS:

```text
--color-ink       <- color_texto
--color-surface   <- color_fondo
--color-red-dark  <- color_principal
--color-red-light <- color_secundario
--color-blue      <- color_acento
```

Reglas de imagen:

- Usar siempre `imagen_final` cuando exista.
- Una URL externa tiene prioridad en el backend sobre un archivo local.
- No crear logos alternativos de Analiza en el frontend.
- Si el logo falla, mostrar una marca textual neutral de la empresa actual.
- No introducir imagenes que parezcan generadas por IA como contenido real.
- Los placeholders neutrales entregados por el usuario estan en `public/demo/`.

Medidas y comportamiento actuales:

- Banner recomendado: `1920 x 540`, proporcion aproximada `3.55:1`.
- El carrusel usa `object-fit: cover` y altura responsiva.
- Logo ancho de escritorio: `clamp(390px, 29vw, 460px)` y `146px` de alto.
- El header detecta logos de lienzo cuadrado y aplica otro recorte/tamano.
- Imagen de producto compacta: relacion `1:1`; se recomienda entregar una
  imagen cuadrada, por ejemplo `1200 x 1200`.
- Imagen de examen mini: contenedor `5:6`.
- Imagen de sucursal en escritorio: `140 x 140`; en movil: `94 x 94`.

El ancho general usa:

```css
--page-max: clamp(1120px, 88vw, 1440px);
```

## 9. Menu y navegacion

El menu no esta escrito de forma fija para cada empresa. Se carga desde:

```text
GET /api/empresas/menu/?empresa_slug=Analiza
```

Campos usados:

- `clave`
- `texto`
- `ruta`
- `orden`
- `activo`
- `abre_en_nueva_pestana`
- opcionalmente `tipo_pagina` o un alias equivalente

Rutas internas comienzan con `/`. Enlaces externos comienzan con `http://` o
`https://`. Los externos pueden abrirse en otra pestana.

`src/utils/menu.js` traduce claves, nombres y rutas a tipos genericos de pagina.
Los nombres visibles siempre vienen del backend.

Decision vigente sobre Examenes:

- Examenes no debe duplicar la misma informacion de Servicios.
- Si existe la pagina Servicios, el item independiente de Examenes se filtra
  del menu.
- `/examenes` se considera parte de Servicios.
- Servicios presenta familia -> categoria -> producto.

## 10. Buscador unico

Solo se usa el buscador grande del header. No deben agregarse buscadores
duplicados dentro de cada pagina.

Comportamiento por pagina:

- Inicio: busca combos y productos mas vendidos.
- Productos/Examenes: busca productos del listado actual.
- Perfiles/Paquetes: busca paquetes.
- Servicios: busca por nombre de producto dentro de las familias y categorias.
- Promociones: busca ofertas y productos relacionados.
- Sucursales: busca sucursales.
- Contacto: el buscador se oculta.
- Checkout y Pago: el buscador se oculta.

La busqueda tiene una espera de `320ms` antes de aplicarse.

## 11. Paginas publicas implementadas

### Inicio

Archivo: `src/pages/HomePage.jsx`.

- Carrusel de banners solo cuando hay banners activos con `imagen_final`.
- Si el endpoint devuelve una lista vacia, el carrusel desaparece y el
  contenido sube.
- El carrusel cambia con slide cada 6 segundos.
- Se pausa con hover o foco.
- Cada imagen completa es clickeable y usa su propia `url_boton`.
- Soporta rutas internas y URLs externas.
- Los banners se recargan al enfocar la ventana, al volver a verla y cada 30
  segundos para reflejar activacion/desactivacion del backend.
- Seccion Combos solo aparece cuando existen combos activos.
- Seccion Mas vendidos muestra como maximo 10 productos.
- Mas vendidos usa una cuadricula de 3 columnas en escritorio, 2 en pantalla
  intermedia y 1 en movil.
- La antigua seccion de categorias del inicio fue retirada.

Endpoints:

```text
GET /api/promociones/banners/?empresa_slug=SLUG
GET /api/catalogo/combos-destacados/?empresa_slug=SLUG
GET /api/catalogo/productos-mas-vendidos/?empresa_slug=SLUG
```

### Productos

Archivo: `src/pages/ProductListPage.jsx`.

- Consume productos o examenes segun el tipo inferido del menu.
- Titulo visible dinamico desde el menu.
- Tarjetas con nombre, descripcion del backend, precio, disponibilidad,
  favoritos y agregar al carrito.
- No usa iconos inventados por el frontend para categorias.
- No muestra el antiguo recuadro redundante `FAMILIA - Examenes`.
- Respeta `productos_con_imagen`; si es falso no reserva espacio de imagen.

Endpoints:

```text
GET /api/catalogo/productos/?empresa_slug=SLUG&buscar=TEXTO
GET /api/catalogo/examenes/?empresa_slug=SLUG&buscar=TEXTO
```

### Perfiles, paquetes y combos

Archivo: `src/pages/PackageListPage.jsx`.

- La pagina generica toma su nombre del menu.
- Perfiles y combos son paquetes vendibles con precio independiente.
- Pueden incluir varios productos.
- No reciben el descuento promocional de productos simples.
- Conservan sus propias imagenes aunque la empresa desactive imagenes de
  productos individuales.

Endpoint principal actual:

```text
GET /api/catalogo/perfiles/?empresa_slug=SLUG&buscar=TEXTO
```

### Servicios

Archivo: `src/pages/ServiceTypesPage.jsx`.

- No abre una subpagina por familia.
- Usa acordeones en la misma pagina.
- Primer nivel: familias de servicios.
- Segundo nivel: categorias, tambien cerradas por defecto.
- Tercer nivel: productos vendibles en tarjetas compactas.
- Toda la cabecera de familia y categoria es interactiva.
- La busqueda se hace por nombre de producto; carga los detalles necesarios y
  abre las coincidencias.
- Familias y categorias usan su propio `imagen_final`.
- Las tarjetas principales de familia tienen una altura consistente.

Endpoints:

```text
GET /api/catalogo/servicios/?empresa_slug=SLUG
GET /api/catalogo/servicios/detalle/?empresa_slug=SLUG&servicio=CLAVE
```

### Promociones

Archivo: `src/pages/PromotionsPage.jsx`.

- Los banners no se usan para llenar esta pagina.
- La pagina usa ofertas reales.
- Tipos esperados: `producto`, `productos` y `paquete`.
- Muestra imagen, descripcion, productos relacionados, precio normal, precio
  de oferta, porcentaje y destino.
- Las ofertas todavia son informativas; el motor de descuentos del backend es
  quien determina los precios aplicables del carrito.

Endpoint:

```text
GET /api/promociones/ofertas/?empresa_slug=SLUG
```

### Sucursales

Archivo: `src/pages/BranchesPage.jsx`.

- Muestra nombre grande, direccion, telefono, horario e imagen.
- El enlace abre Google Maps en otra pestana.
- El fondo de la imagen es transparente para integrarse con la tarjeta.

Endpoint:

```text
GET /api/empresas/sucursales/?empresa_slug=SLUG&buscar=TEXTO
```

### Contacto

Archivo: `src/pages/ContactPage.jsx`.

- Muestra datos de la empresa.
- Envia nombre, telefono, correo, asunto y mensaje.
- Nombre y mensaje son obligatorios.
- Se exige telefono o correo, al menos uno.
- El buscador del header se oculta.

Endpoint:

```text
POST /api/contacto/mensajes/
```

Body:

```json
{
  "empresa_slug": "Analiza",
  "nombre": "Cliente",
  "telefono": "99999999",
  "correo": "correo@ejemplo.com",
  "asunto": "Consulta",
  "mensaje": "Mensaje"
}
```

## 12. Autenticacion y sesion

Frontend implementado:

- Modal de inicio de sesion.
- Vista de cuenta activa.
- Cierre de sesion.
- Restauracion automatica al recargar.
- Access token guardado solo en memoria.
- Refresh token en cookie `HttpOnly` del backend.
- `credentials: "include"` en login, refresh y logout.
- Reintento automatico del request despues de renovar access token.
- Un `401` definitivo limpia la sesion y vuelve a abrir el login.

Endpoints usados:

```text
POST /api/usuarios/login/
POST /api/usuarios/token/refresh/
POST /api/usuarios/token/logout/
GET  /api/usuarios/perfiles/mi-perfil/
```

Duracion configurada en backend:

- Access token: 15 minutos.
- Limite absoluto de sesion: 5 horas.

Backend disponible pero frontend pendiente:

```text
POST /api/usuarios/registro-comprador/
POST /api/usuarios/verificar-correo/
POST /api/usuarios/reenviar-verificacion/
POST /api/usuarios/solicitar-recuperacion-contrasena/
POST /api/usuarios/confirmar-recuperacion-contrasena/
```

No existe todavia interfaz frontend para registro, verificacion de correo ni
recuperacion de contrasena.

## 13. Favoritos

- Persisten en el backend por usuario y empresa.
- Aceptan `producto`, `perfil` y `combo`.
- Se muestran en un drawer propio.
- Desde favoritos se puede agregar al carrito.
- Un usuario sin sesion debe iniciar sesion para usar esta persistencia.

Endpoints:

```text
GET    /api/favoritos/?empresa_slug=SLUG
POST   /api/favoritos/
DELETE /api/favoritos/{id}/
```

## 14. Carrito

### Contrato vigente

Tipos validos:

```text
producto
perfil
combo
```

Endpoint para agregar:

```text
POST /api/pedidos/carritos/{id}/agregar-articulo/
```

Body:

```json
{
  "codigo": "CODIGO",
  "tipo_articulo": "producto",
  "cantidad": 1
}
```

Campos vigentes de respuesta del item:

- `articulo_nombre`
- `codigo`
- `tipo_articulo`
- `imagen_final`
- `cantidad`
- `precio_unitario`
- `subtotal`

No recuperar compatibilidad antigua:

- `agregar-producto` fue retirado y responde 404.
- `codigo_barra` ya no es entrada alternativa al agregar.
- `producto_nombre` fue retirado del carrito.
- `imagen_principal` fue retirado de la respuesta del carrito.
- `producto_nombre_actual` fue retirado del detalle de pedido.

Otros endpoints:

```text
POST   /api/pedidos/carrito/calcular/
GET    /api/pedidos/carritos/mi-carrito/
PATCH  /api/pedidos/items-carrito/{id}/
DELETE /api/pedidos/items-carrito/{id}/
```

### Invitado y usuario autenticado

Invitado:

- Se guarda en `localStorage`.
- Clave: `ventas_cart_v1:<slug_empresa>`.
- Permanece al actualizar la pagina.

Autenticado:

- Se usa el carrito persistente del backend.
- Permanece entre sesiones.

Problema abierto de alta prioridad:

- Al agregar productos como invitado y luego iniciar sesion/registrarse, el
  usuario reporta que los productos desaparecen.
- `App.jsx` intenta migrarlos uno por uno al carrito del servidor.
- No se debe considerar resuelto hasta reproducir y verificar la respuesta de
  cada request.
- Solucion recomendada: endpoint transaccional e idempotente de backend para
  fusionar carrito invitado + carrito del usuario en una sola operacion.
- El frontend debe borrar el carrito local solo despues de recibir la fusion
  completa y valida.
- Si una linea falla, debe conservarse localmente y mostrarse el error.

### Calculo

- El frontend llama al calculador publico despues de cambios, con espera de
  `220ms`.
- El backend es la fuente final de precios, descuentos, impuesto y total.
- `cobra_impuesto` y `porcentaje_impuesto` vienen de la empresa/calculador.
- Empresas sin impuesto muestran impuesto cero y no deben inventar ISV.
- Empresas con impuesto usan actualmente 15 por ciento.
- Perfiles y combos conservan su precio propio y no reciben promociones de
  productos simples.

## 15. Checkout y pedidos

Rutas SPA:

```text
/checkout
/pago/{referencia}
```

El checkout exige sesion. Si no existe, abre el login.

Flujo para empresa sin envios:

```text
Carrito -> Pago
```

- El titulo es `Finaliza tu compra`.
- No muestra seleccion de entrega.
- No muestra observaciones.
- Internamente envia `tipo_entrega: retiro_en_local` porque el backend lo
  necesita como contrato.
- Muestra el aviso: examenes en la sucursal mas cercana; otros servicios por
  telefono.
- Usa `empresa.telefono` y `88888888` solo como respaldo temporal.

Flujo para empresa con envios:

```text
Carrito -> Entrega -> Pago
```

- Permite `envio_local` y `envio_nacional`.
- Solicita destinatario, telefono, departamento, municipio, direccion y
  referencia.
- Muestra observaciones.
- El envio aparece en el resumen solo para empresas con envios.

Crear pedido:

```text
POST /api/pedidos/carritos/{id}/generar-pedido/
```

Body actual:

```json
{
  "tipo_entrega": "retiro_en_local",
  "observaciones": "",
  "nombre_recibe": "",
  "telefono_recibe": "",
  "direccion_entrega": "",
  "referencia_entrega": "",
  "departamento_entrega": "",
  "municipio_entrega": ""
}
```

El pedido crea una fotografia comercial inmutable de empresa, cliente,
articulos, componentes, descuentos, impuesto, entrega y total. El frontend debe
usar `nombre_articulo` en detalles historicos.

Si el pedido se crea pero falla el inicio de pago, se guarda temporalmente en
`sessionStorage` para poder reintentar sin crear otro pedido.

## 16. Pagos

Endpoints:

```text
POST /api/pagos/iniciar/
GET  /api/pagos/{referencia}/
```

Inicio:

```json
{
  "pedido_id": 123
}
```

Reglas:

- El frontend solo envia `pedido_id`.
- Monto y moneda salen del pedido.
- Un cliente no puede acceder al pago de otro.
- Solo existe un intento pendiente por pedido.
- Estados soportados: `pendiente`, `aprobado`, `rechazado`.
- La pantalla consulta nuevamente cada 8 segundos mientras esta pendiente.
- Permite actualizar manualmente.
- Un pago rechazado puede reintentarse con el contexto guardado.

Estado actual importante:

- El backend usa el proveedor `simulado`.
- Todavia no existe cobro real.
- Todavia no existe `url_pago` real.
- Por eso el frontend muestra `Pago pendiente` y no puede abrir una plataforma
  bancaria.
- Si el backend devuelve `url_pago`, la pantalla actual muestra un enlace
  `Continuar con el proveedor`.
- Preferencia pendiente del usuario: cuando exista una URL real, redirigir
  automaticamente al proveedor en lugar de obligar a pulsar otro boton.

No almacenar datos de tarjeta, CVV ni credenciales bancarias en este proyecto.

## 17. Modo de prueba cuando el backend esta apagado

Archivos:

- `src/config/demoContent.js`
- `public/demo/tu-logo-aqui.png`
- `public/demo/tu-banner-promocional-aqui.png`
- `public/demo/tu-producto-aqui.png`

Comportamiento:

- No muestra Analiza como respaldo de otra empresa.
- Usa una empresa neutral y recursos `Tu ... aqui`.
- Muestra un aviso de modo de prueba.
- El modo demo sirve para revisar estructura visual, no para probar carrito
  autenticado, favoritos, pedidos ni pagos.

## 18. Archivos principales del frontend

```text
src/app/App.jsx
  Orquestacion general, empresa, rutas, sesion, carrito, favoritos y busqueda.

src/services/apiClient.js
  Cliente HTTP, access token en memoria, refresh cookie, errores y media.

src/services/empresaService.js
  Resolucion multiempresa y menu.

src/services/paginasService.js
  Catalogo, perfiles, servicios y sucursales.

src/services/promocionesService.js
  Banners y ofertas.

src/services/authService.js
  Login, perfil, restauracion y logout.

src/services/cartService.js
  Calculo y carrito persistente.

src/services/favoritosService.js
  Favoritos autenticados.

src/services/pedidoService.js
  Generacion de pedido.

src/services/pagoService.js
  Inicio y consulta de pago.

src/pages/HomePage.jsx
  Carrusel, combos y mas vendidos.

src/pages/ServiceTypesPage.jsx
  Familias, categorias y productos en acordeon.

src/pages/CheckoutPage.jsx
  Revision, entrega opcional, pedido e inicio de pago.

src/pages/PaymentPage.jsx
  Estado de pago y reintentos.

src/pages/DynamicPages.module.css
  Layout comun, tarjetas, sucursales, contacto y servicios.

src/pages/CheckoutPages.module.css
  Checkout y pago.

src/components/layout/Header.module.css
  Tamano y comportamiento del logo/header. Contiene ajustes manuales aprobados.
```

## 19. Codigo retirado que no debe recuperarse

Se eliminaron por no usarse:

- `src/components/catalog/CategoryStrip.jsx`
- `src/components/catalog/CategoryStrip.module.css`
- `src/components/catalog/FeaturedProducts.jsx`
- `src/components/catalog/FeaturedProducts.module.css`
- `src/services/catalogoService.js`

Tambien se retiraron los alias antiguos del carrito en el frontend.

Una auditoria estatica encontro que todos los archivos fuente restantes son
alcanzables desde `src/main.jsx`.

## 20. Estado de verificacion

Frontend:

- Ultimo `npm run build`: correcto.
- Vite transformo 1630 modulos.
- No existe aun un script de pruebas automatizadas en `package.json`.
- La revision visual se ha realizado principalmente con capturas del usuario.
- El navegador automatizado no estuvo disponible en la ultima revision.

Backend, segun el registro del 31 de julio:

- `python manage.py test`: 78 pruebas aprobadas.
- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- La app `pagos` y su migracion inicial estan aplicadas localmente.

Estas verificaciones describen el ultimo estado registrado; deben repetirse
despues de instalar el proyecto en otra PC.

## 21. Pendientes priorizados

### Prioridad alta

1. Corregir y verificar la fusion del carrito invitado al iniciar sesion o
   registrarse.
2. Revisar, hacer commit y subir todos los cambios locales de frontend y
   backend.
3. Elegir e integrar una pasarela de pago real.
4. Redirigir automaticamente a `url_pago` cuando el proveedor real la entregue.
5. Implementar frontend de registro, verificacion de correo y recuperacion de
   contrasena.

### Prioridad media

1. Agregar pruebas automatizadas para sesion, carrito, multiempresa y checkout.
2. Probar responsive en movil, laptop y monitor grande con screenshots.
3. Definir despliegue real del frontend y backend.
4. Definir almacenamiento externo de imagenes.
5. Generar PDF real de prefactura si sigue dentro del alcance.
6. Decidir conexion final con PostgreSQL/Supabase.

### Antes de produccion

1. Cambiar todas las credenciales temporales.
2. Configurar HTTPS y cookies seguras.
3. Configurar dominios, CORS, CSRF y hosts reales.
4. Configurar proveedor de correo real.
5. Configurar secretos de pagos fuera del repositorio.
6. Respaldar y migrar datos e imagenes.
7. Ejecutar pruebas completas y revision de seguridad.

## 22. Preferencias y decisiones del usuario que deben conservarse

- Hablar en espanol y explicar claramente antes de cambios grandes.
- Mantener el sistema multiempresa; no quemar datos de Analiza para todos.
- Usar logo, colores, menu e imagenes del backend.
- No mostrar una marca antigua o inventada si falla el logo.
- Evitar recursos que parezcan creados por IA como contenido real.
- Mantener un solo buscador contextual en el header.
- No duplicar Examenes y Servicios.
- Servicios debe usar acordeones, no subpaginas.
- Categorias dentro de Servicios tambien deben abrir/cerrar.
- Inicio solo usa combos activos y hasta 10 mas vendidos.
- Ocultar secciones vacias como banners y combos.
- Banners y promociones reales son conceptos separados.
- Las imagenes de banner completas son clickeables.
- No mostrar impuesto cuando la empresa no cobra impuesto.
- No mostrar envio cuando la empresa no ofrece envios.
- Sin envios, el flujo visual es `Carrito -> Pago`.
- Con envios, el flujo visual es `Carrito -> Entrega -> Pago`.
- No mostrar Observaciones cuando la empresa no tiene envios.
- Mantener el carrito despues de recargar y despues de autenticarse.
- La pantalla de pago debe estar separada del checkout.
- Cuando exista pasarela real, el usuario espera ser enviado al pago real.
- `.agents/` y `skills-lock.json` no deben subirse a GitHub.

## 23. Instruccion de inicio para una conversacion nueva

Prompt recomendado:

```text
Lee primero CONTEXTO_CONTINUACION.md y despues revisa el codigo relacionado con
la tarea. No recuperes endpoints ni componentes marcados como obsoletos. El
codigo actual y REGISTRO_CAMBIOS_CONTINUOS.md tienen prioridad sobre briefs
antiguos. Antes de editar, verifica el estado de Git para no perder cambios
locales. Continua respetando multiempresa, branding dinamico y las reglas de
impuesto y envio de cada empresa.
```

## 24. Lista de traslado a otra PC

1. Revisar secretos y credenciales temporales en documentos locales.
2. Hacer commit del frontend.
3. Hacer push del frontend.
4. Hacer commit del backend.
5. Hacer push del backend.
6. Respaldar de forma privada `backend/db.sqlite3` si se necesitan los datos.
7. Respaldar de forma privada `backend/media/` si se necesitan las imagenes.
8. Guardar de forma segura las variables necesarias del `.env`.
9. Clonar ambos repositorios en la nueva PC.
10. Recrear `.venv` y `node_modules`.
11. Restaurar base, media y `.env` sin subirlos a GitHub.
12. Ejecutar migraciones.
13. Ejecutar pruebas del backend.
14. Ejecutar `npm run build` en frontend.
15. Probar Analiza y una segunda empresa.
16. Probar login, carrito invitado, fusion, favoritos, checkout y pago.

