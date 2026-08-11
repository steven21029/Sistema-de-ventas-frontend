# Registro de cambios continuos

Este documento registra las modificaciones realizadas desde el 29 de julio
de 2026. A partir de esta fecha, cada cambio aprobado del backend debe
agregarse aqui, incluyendo su impacto para el frontend cuando corresponda.

## 2026-07-29 - Seguridad y duracion de la sesion JWT

Estado: implementado y verificado.

Cambios:

- El access token paso de 30 a 15 minutos.
- La sesion completa paso de 7 dias a un maximo absoluto de 5 horas.
- Renovar el access token no extiende el limite original de la sesion.
- El refresh token dejo de exponerse en la respuesta JSON del login.
- El refresh token se guarda en una cookie `HttpOnly`.
- El endpoint de renovacion ahora lee el refresh token desde la cookie.
- Se agrego un endpoint de cierre de sesion que bloquea el refresh token.
- Se habilito el registro interno de tokens bloqueados de SimpleJWT.
- Una sesion ausente, vencida o bloqueada responde con estado HTTP `401`.
- Se agregaron pruebas para login, renovacion, limite absoluto y logout.

API afectada:

- `POST /api/usuarios/login/`
- `POST /api/usuarios/token/refresh/`
- `POST /api/usuarios/token/logout/`

Impacto para el frontend:

- Usar `credentials: "include"` en login, refresh y logout.
- Guardar el access token solamente en memoria.
- No esperar el campo `refresh` en la respuesta del login.
- Enviar un objeto vacio al endpoint de refresh.
- Al recibir `401` despues de vencer la sesion, mostrar nuevamente el login.

Archivos modificados:

- `config/settings.py`
- `usuarios/serializers.py`
- `usuarios/views.py`
- `usuarios/urls.py`
- `usuarios/tests.py`
- `.env.example`
- `docs/BRIEF_FRONTEND.md`
- `docs/ESTADO_PROYECTO.md`

Verificacion:

- Migraciones oficiales de `token_blacklist` aplicadas correctamente.
- `python manage.py check`: sin problemas.
- `python manage.py test usuarios`: 4 pruebas aprobadas.
- `python manage.py test`: 32 pruebas completas aprobadas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.

- Aviso no bloqueante: la carpeta generada `staticfiles` aun no existe.

## 2026-07-29 - Empresas con productos fisicos y servicios

Estado: implementado, migrado y verificado por modulos.

Cambios:

- Se agregaron tres modos de empresa: `inventariado`, `sin_inventario` y `mixto`.
- Analiza quedo configurada como `sin_inventario`.
- Se agregaron los tipos `producto_fisico` y `servicio` al catalogo.
- En empresas inventariadas el tipo se asigna como producto fisico.
- En empresas sin inventario el tipo se asigna como servicio.
- En empresas mixtas la API exige seleccionar el tipo al crear.
- Cada registro recibe un `codigo_interno` automatico y unico por empresa.
- El codigo de barras quedo obligatorio solo para productos fisicos.
- Los servicios pueden tener `codigo_barra = null`.
- Los servicios no aparecen agotados y usan `estado_inventario = no_aplica`.
- Los servicios se excluyen de listados, resumen, alertas y movimientos de inventario.
- El carrito acepta `codigo` general y conserva `codigo_barra` como compatibilidad.
- El carrito valida existencia solo para productos fisicos.
- Al pagar, solo los productos fisicos generan salidas de inventario.
- Los servicios vendidos permanecen en los detalles para estadisticas y reportes.
- `productos-mas-vendidos` devuelve `total_vendido` desde pedidos pagados.
- Favoritos acepta servicios mediante el campo `codigo`.
- Promociones devuelve codigo y tipo de cada producto o servicio.
- DetallePedido conserva `codigo_interno` como dato historico.
- Se conservaron la existencia y los movimientos historicos de Analiza.

API afectada:

- `GET /api/empresas/actual/`
- `GET /api/empresas/publica/`
- APIs de productos y paginas publicas de catalogo.
- `POST /api/pedidos/carritos/{id}/agregar-producto/`
- APIs de carrito, pedidos y prefactura.
- `POST /api/favoritos/`
- APIs de promociones.
- Todas las APIs internas de inventario.

Impacto para el frontend:

- Leer `modo_inventario` al cargar la empresa.
- En empresa mixta preguntar por `tipo_item` al crear cada registro.
- Usar `codigo` para carrito y favoritos.
- Mostrar existencia solo cuando `controla_inventario` sea `true`.
- Tratar `existencia = null` como servicio, no como producto agotado.
- Ocultar inventario completo cuando la empresa use `sin_inventario`.
- Usar `total_vendido` para mostrar cantidad vendida.

Migraciones:

- `empresas.0011_empresa_modo_inventario`
- `catalogo.0004_producto_tipo_item_y_codigo_interno`
- `pedidos.0008_detallepedido_codigo_interno`

Verificacion:

- Las tres migraciones se aplicaron correctamente.
- Analiza tiene 3 servicios y conserva 1 movimiento historico.
- `python manage.py test empresas catalogo inventario pedidos`: 27 pruebas aprobadas.
- `python manage.py test favoritos promociones`: 6 pruebas aprobadas.
- `python manage.py test`: 40 pruebas completas aprobadas.

## 2026-07-29 - Motor de descuentos porcentuales

Estado: implementado, migrado y verificado por modulos.

Reglas aprobadas:

- Los descuentos se administran por empresa.
- El porcentaje permitido es de 1 a 99.
- Un descuento puede aplicarse a todos los articulos, a varios articulos
  seleccionados o a un solo articulo.
- Pueden existir varias reglas activas al mismo tiempo.
- Cada articulo recibe unicamente el descuento vigente de mayor porcentaje.
- Los porcentajes nunca se suman.
- Si dos reglas empatan, gana `individual`, luego `seleccionados` y por ultimo
  `todos`.
- Las reglas aplican tanto a productos fisicos como a servicios.
- Los banners y las ofertas visuales permanecen separados de este motor.

Cambios:

- Se agregaron `DescuentoPromocional` y `DescuentoProducto`.
- Cada regla tiene empresa, codigo, titulo, descripcion, alcance, porcentaje,
  estado y periodo opcional de vigencia.
- El administrador de Django valida la cantidad de articulos segun el alcance.
- La API valida que todos los articulos pertenezcan a la misma empresa.
- Las reglas vencidas, futuras, inactivas o mal configuradas no se aplican.
- Se agrego un servicio que resuelve una regla ganadora por articulo.
- Se agrego el calculo publico del carrito sin exigir inicio de sesion.
- El calculo publico recibe solo empresa, codigo y cantidad.
- Los precios, descuentos, impuesto y totales siempre se calculan en Django.
- Al confirmar un pedido se vuelven a consultar precios y reglas vigentes.
- Cada detalle de pedido conserva la fotografia historica del descuento.
- Los detalles antiguos conservaron su precio y subtotal como valores finales.

API de administracion y consulta:

- `GET /api/promociones/descuentos/?empresa_slug=analiza`
- `POST /api/promociones/descuentos/`
- `PATCH /api/promociones/descuentos/{id}/`
- `DELETE /api/promociones/descuentos/{id}/`
- Un administrador puede agregar `incluir_inactivos=true`.

Campos principales para crear una regla:

```json
{
  "empresa": 1,
  "codigo": "JULIO-20",
  "titulo": "Descuento de julio",
  "descripcion": "",
  "alcance": "seleccionados",
  "porcentaje": 20,
  "productos_ids": [10, 11],
  "activo": true,
  "fecha_inicio": null,
  "fecha_fin": null
}
```

Valores de `alcance`:

- `todos`: enviar `productos_ids: []`.
- `seleccionados`: enviar dos o mas identificadores.
- `individual`: enviar exactamente un identificador.

API publica para calcular el carrito:

- `POST /api/pedidos/carrito/calcular/`
- No requiere token.
- Maximo 100 articulos distintos y 999 unidades por articulo.
- Un codigo no se puede repetir dentro de la solicitud.

Ejemplo de solicitud:

```json
{
  "empresa_slug": "analiza",
  "items": [
    {
      "codigo": "ANA-000001",
      "cantidad": 2
    }
  ]
}
```

La respuesta incluye por linea:

- Datos basicos del articulo y cantidad.
- `precio_unitario`.
- `descuento_aplicado` o `null`.
- `descuento_unitario`.
- `precio_unitario_final`.
- `subtotal`.
- `descuento_total`.
- `subtotal_final`.

La respuesta general incluye:

- `subtotal`.
- `descuento_total`.
- `base_imponible`.
- `impuesto`, calculado al 15 por ciento sobre la base con descuento.
- `envio`, con valor cero porque se calcula al seleccionar la entrega.
- `total_sin_envio`.

Fotografia guardada en cada detalle de pedido:

- Codigo y titulo de la regla aplicada.
- Porcentaje aplicado.
- Precio original y precio final.
- Descuento unitario y total.
- Subtotal original y subtotal final.
- Referencia opcional a la regla, sin depender de ella para conservar el
  historial.

Migraciones:

- `promociones.0003_descuentoproducto_descuentopromocional_and_more`
- `pedidos.0009_detallepedido_descuento_promocional_and_more`

Verificacion:

- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.

- Las dos migraciones se aplicaron correctamente.
- `python manage.py test promociones pedidos`: 13 pruebas aprobadas.
- `python manage.py test`: 46 pruebas completas aprobadas.

## 2026-07-30 - Administracion unificada de descuentos

Estado: implementado.

Cambios:

- Se oculto `Productos de descuento` del menu principal de Django Admin.
- `DescuentoProducto` se conserva como relacion interna de base de datos.
- Los productos se seleccionan dentro del formulario de cada
  `Descuento promocional`.
- Crear, configurar el alcance y activar o desactivar una regla se realiza
  desde una sola pantalla.

## 2026-07-30 - Perfiles, combos e impuesto configurable

Estado: implementado, migrado y verificado por modulos.

Reglas:

- Los descuentos promocionales se aplican solamente a productos simples.
- Los perfiles y combos no reciben descuentos promocionales.
- Cada perfil o combo conserva su precio independiente definido en
  `precio_paquete`.
- Cada empresa puede decidir si cobra o no el 15 por ciento de ISV.
- Los pedidos conservan la configuracion fiscal usada al momento de crearse.

Cambios:

- El calculador publico acepta codigos de `Producto` y `PaqueteCatalogo`.
- Los paquetes activos pueden ser de tipo `perfil` o `combo`.
- Un perfil o combo devuelve `descuento_aplicado: null`.
- Para paquetes se usa `precio_paquete` como `precio_unitario`.
- Si un paquete contiene productos fisicos, se valida su existencia.
- Se agrego `cobra_impuesto` al perfil administrativo y a las APIs de empresa.
- El calculador devuelve `cobra_impuesto` y `porcentaje_impuesto`.
- Cuando `cobra_impuesto` es falso, `impuesto` vale `0.00`.
- Se agregaron `aplica_impuesto` y `tasa_impuesto` al pedido como fotografia
  historica.
- Cambiar la configuracion fiscal de la empresa no modifica pedidos anteriores.

API publica de empresa:

- `GET /api/empresas/actual/`
- El resultado ahora incluye `cobra_impuesto`.

API publica del calculador:

- `POST /api/pedidos/carrito/calcular/`
- La solicitud conserva el mismo formato de `empresa_slug`, `codigo` y
  `cantidad`.
- En cada linea se agrego `tipo_articulo`.
- `tipo_articulo` puede ser `producto`, `perfil` o `combo`.
- La respuesta general incluye `cobra_impuesto` y `porcentaje_impuesto`.

Comportamiento fiscal:

- Empresa con impuesto: `porcentaje_impuesto = 15.00`.
- Empresa sin impuesto: `porcentaje_impuesto = 0.00` e `impuesto = 0.00`.
- El total se calcula sobre la base imponible despues del descuento de
  productos simples.

Migraciones:

- `empresas.0012_empresa_cobra_impuesto`
- `pedidos.0010_pedido_aplica_impuesto_pedido_tasa_impuesto`

Verificacion:

- Las dos migraciones se aplicaron correctamente.
- `python manage.py test empresas pedidos`: 19 pruebas aprobadas.
- `python manage.py test`: 50 pruebas completas aprobadas.

## 2026-07-30 - Importacion del catalogo de examenes

Estado: implementado, importado y verificado.

Fuente:

- `Areas-Examenes(Recuperado automaticamente).xlsx`.
- Se utilizo la hoja `PRECIOS`.
- Columnas importadas: codigo, examen, area y precio 2026.

Validacion previa:

- 328 examenes.
- 12 categorias.
- Sin codigos duplicados.
- Sin nombres duplicados.
- Sin campos obligatorios vacios.
- Sin precios invalidos o negativos.
- Los precios se redondean a dos decimales con redondeo comercial.

Destino:

- Empresa: `Analiza`.
- Familia: `Examenes`.
- Los codigos del Excel se guardaron como `codigo_barra`.
- Cada examen recibio tambien su `codigo_interno` automatico.
- Los 328 registros se crearon como servicios sin control de inventario.
- Los productos que ya existian en Analiza no fueron modificados.

Categorias y cantidades:

- `Bacteriologia`: 5.
- `Biologia molecular`: 2.
- `Coagulacion`: 11.
- `Coprologia`: 15.
- `Farmacos y drogas de abuso`: 1.
- `Hematologia`: 17.
- `Microbiologia`: 27.
- `Patologia`: 2.
- `Pruebas especiales`: 7.
- `Quimica e Inmunologia`: 231.
- `Uroanalisis`: 7.
- `Uroanalisis y Coprologia`: 3.

Comando agregado:

- `python manage.py importar_examenes_excel --archivo <archivo.xlsx>`
- Usa por defecto la empresa `Analiza`, la familia `Examenes` y la hoja
  `PRECIOS`.
- `--dry-run` valida y muestra el resumen sin guardar.
- Es idempotente: los codigos existentes se omiten y no se duplican.
- `--actualizar-existentes` permite actualizar datos solo cuando se solicita
  explicitamente.
- Toda importacion real se ejecuta dentro de una unica transaccion.

Verificacion:

- Importacion real: 12 categorias y 328 examenes creados.
- Base local: 328 importados, 328 activos y 328 servicios.
- Segunda simulacion: 0 categorias nuevas, 0 examenes nuevos y 328 existentes.
- `python manage.py test catalogo`: 9 pruebas aprobadas.
- `python manage.py test`: 50 pruebas completas aprobadas.

## 2026-07-30 - Imagenes de productos configurables por empresa

Estado: implementado, migrado y verificado.

Objetivo:

- Cada empresa decide si sus productos usan imagenes individuales.
- Las empresas con catalogos grandes de servicios pueden trabajar solamente
  con imagenes de familias y categorias.
- La configuracion inicial de `Analiza` queda sin imagenes individuales de
  productos.

Configuracion de empresa:

- Se agrego `productos_con_imagen` al perfil de empresa.
- Valor predeterminado para empresas nuevas: activo.
- El administrador maestro puede modificarlo desde Django Admin.
- La API `GET /api/empresas/actual/` devuelve `productos_con_imagen`.

Comportamiento:

- Cuando `productos_con_imagen` es verdadero, cada producto puede usar
  `imagen_principal` o `imagen_url`.
- Cuando es falso, las APIs devuelven `imagen_final: null` para los productos.
- Tambien se ocultan los campos crudos de imagen en la respuesta administrativa
  de productos.
- No se aceptan nuevas imagenes individuales mediante API, Django Admin,
  importadores ni procesos internos mientras la opcion esta desactivada.
- Las imagenes antiguas no se borran al desactivar la configuracion; quedan
  ocultas y pueden recuperarse si la empresa vuelve a activarla.
- Los perfiles y combos conservan sus propias imagenes porque representan una
  oferta agrupada, no un producto simple.

Imagenes de clasificacion:

- `Familia` conserva `imagen`, `imagen_url` e `imagen_final`.
- Se agregaron `imagen`, `imagen_url` e `imagen_final` a `Categoria`.
- La URL externa tiene prioridad sobre el archivo local.
- Las APIs publicas de servicios incluyen `imagen_final` tanto para la familia
  como para cada categoria.

Uso esperado en frontend:

- Consultar `productos_con_imagen` desde `/api/empresas/actual/`.
- Si es verdadero, mostrar `imagen_final` de cada producto.
- Si es falso, no reservar espacio de imagen en la tarjeta del producto.
- En las pantallas de familias y categorias, usar siempre su propio
  `imagen_final` cuando exista.
- No reutilizar automaticamente la imagen de categoria en cada uno de los
  cientos de productos; la presencia visual se mantiene en los niveles de
  familia y categoria.

Migraciones:

- `catalogo.0005_categoria_imagen_categoria_imagen_url`
- `empresas.0013_empresa_productos_con_imagen`

Verificacion:

- Las dos migraciones se aplicaron correctamente.
- La base local confirma `Analiza.productos_con_imagen = False`.
- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `python manage.py test empresas catalogo`: 24 pruebas aprobadas.
- `python manage.py test`: 53 pruebas completas aprobadas.

## 2026-07-30 - Descripciones breves del catalogo de examenes

Estado: implementado, cargado y verificado.

Alcance:

- Se agrego una descripcion informativa a cada uno de los 328 examenes
  importados del archivo de Analiza.
- Cada descripcion contiene exactamente seis palabras.
- La relacion se guarda por `codigo_barra`, evitando depender de nombres que
  puedan escribirse de formas diferentes.
- Los productos manuales `barrer` y `prueba` no se modificaron porque no
  pertenecen al archivo importado.
- La API publica de examenes ya entrega el texto mediante el campo
  `descripcion` existente.

Implementacion:

- Catalogo auditable:
  `catalogo/datos/descripciones_examenes.py`.
- Comando reproducible:
  `python manage.py agregar_descripciones_examenes`.
- Simulacion sin escritura:
  `python manage.py agregar_descripciones_examenes --dry-run`.
- El comando exige exactamente 328 entradas.
- El comando falla antes de escribir si falta algun codigo o si una
  descripcion no contiene seis palabras.
- La actualizacion se ejecuta dentro de una transaccion y es idempotente.

Fuentes medicas de referencia:

- MedlinePlus en espanol, directorio de pruebas de laboratorio:
  `https://medlineplus.gov/spanish/pruebas-de-laboratorio/`.
- CDC, directorio y conceptos de pruebas para enfermedades infecciosas:
  `https://cdc.gov/infectious-diseases-labs/php/test-directory/`.
- Mayo Clinic Laboratories, catalogo interpretativo de pruebas:
  `https://www.mayocliniclabs.com/test-catalog/`.
- NIDDK, pruebas diagnosticas de la tiroides:
  `https://www.niddk.nih.gov/health-information/informacion-de-la-salud/pruebas-diagnosticas/pruebas-tiroides`.
- American Thyroid Association, pruebas de funcion tiroidea:
  `https://www.thyroid.org/las-pruebas-de-funcion-tiroidea/`.

Consideracion clinica:

- Los textos describen de forma general para que sirve cada prueba y no
  sustituyen una indicacion, interpretacion o diagnostico medico.
- Antes de publicarlos como contenido clinico definitivo conviene que el
  director tecnico del laboratorio confirme que cada descripcion coincide con
  la metodologia y el alcance exacto ofrecido por Analiza.

Verificacion:

- Primera simulacion: 328 examenes por actualizar.
- Carga real: 328 descripciones actualizadas.
- Segunda simulacion: 0 por actualizar y 328 sin cambios.
- Base local: 328 descripciones con exactamente seis palabras.
- API publica verificada con `Hemograma Completo`.
- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `python manage.py test catalogo`: 12 pruebas aprobadas.
- `python manage.py test`: 54 pruebas completas aprobadas.

## 2026-07-30 - Favoritos persistentes para todo el catalogo

Estado: implementado, migrado y verificado por modulo.

Alcance:

- Cada favorito continua perteneciendo a una empresa y un usuario autenticado.
- Ahora puede apuntar a un producto, servicio, examen, perfil o combo.
- Los favoritos permanecen en la base de datos y vuelven a mostrarse cuando el
  cliente inicia sesion desde otro momento o dispositivo.
- Los favoritos de cada cliente se mantienen separados.

Integridad de datos:

- `producto` ahora es opcional.
- Se agrego `paquete` como referencia opcional a `PaqueteCatalogo`.
- Una restriccion exige que exactamente uno de esos campos tenga valor.
- Existen restricciones independientes para impedir duplicados de productos y
  de perfiles/combos por empresa y usuario.
- Los registros de favoritos existentes se conservan durante la migracion.

API:

- Listar: `GET /api/favoritos/?empresa_slug=Analiza`.
- Agregar: `POST /api/favoritos/`.
- Eliminar: `DELETE /api/favoritos/{id}/`.
- El payload usa `codigo` y `tipo_articulo`.
- `tipo_articulo` acepta `producto`, `perfil` o `combo`.
- Si el tipo se omite y el codigo coincide con mas de un tipo, la API exige
  indicarlo para evitar guardar el articulo equivocado.

Respuesta unificada:

- `articulo_codigo`.
- `articulo_nombre`.
- `articulo_descripcion`.
- `articulo_imagen_final`.
- `articulo_precio`.
- `articulo_agotado`.
- `articulo_familia`.
- `articulo_categoria`.
- Los campos anteriores `producto_*` se mantienen temporalmente para no romper
  integraciones existentes.

Imagenes:

- Los productos y examenes respetan `productos_con_imagen`.
- Cuando la empresa desactiva imagenes individuales, Favoritos devuelve
  `articulo_imagen_final: null` para esos productos.
- Los perfiles y combos conservan su imagen independiente.

Migracion:

- `favoritos.0002_favorito_paquete_alter_favorito_producto_and_more`

Verificacion:

- La migracion se aplico correctamente en la base local.
- `python manage.py test favoritos`: 6 pruebas aprobadas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `python manage.py test`: 59 pruebas completas aprobadas.

## 2026-07-30 - Carrito persistente con perfiles y combos

Estado: implementado, migrado y verificado.

Alcance:

- El carrito guardado en la base de datos ahora acepta productos fisicos,
  servicios, examenes, perfiles y combos.
- Cada item apunta exactamente a un producto o a un `PaqueteCatalogo`.
- Los articulos permanecen en `mi-carrito` entre sesiones del cliente.
- Agregar nuevamente el mismo articulo aumenta su cantidad sin crear
  duplicados.

API:

- Nueva ruta recomendada:
  `POST /api/pedidos/carritos/{id}/agregar-articulo/`.
- La ruta `agregar-producto` se conserva temporalmente como alias compatible.
- El payload usa `codigo`, `tipo_articulo` y `cantidad`.
- `tipo_articulo` acepta `producto`, `perfil` o `combo`.
- El calculador publico tambien acepta `tipo_articulo` en cada linea.
- Si un codigo coincide entre tipos y no se especifica el tipo, la solicitud se
  rechaza para evitar ambiguedad.

Respuesta de items:

- `tipo_articulo`.
- `articulo_nombre`.
- `codigo`.
- `codigo_interno`.
- `codigo_barra`.
- `tipo_item`.
- `controla_inventario`.
- `agotado`.
- `imagen_final`.
- `cantidad`.
- `precio_unitario`.
- `subtotal`.
- Se mantienen nombres anteriores como `producto_nombre` e
  `imagen_principal` durante la transicion del frontend.

Seguridad:

- El endpoint directo de items valida el propietario del carrito al crear y
  tambien al intentar mover un item.
- Un comprador no puede escribir en el carrito de otro usuario, aunque ambos
  pertenezcan a la misma empresa.
- Los carritos, productos, perfiles, combos y componentes inactivos se
  rechazan antes de guardar.

Precios y descuentos:

- Productos y servicios simples usan su precio actual.
- Perfiles y combos usan `precio_paquete`.
- `mi-carrito` sincroniza el precio persistido cuando cambia el precio actual.
- Los descuentos promocionales siguen aplicandose solamente a productos
  simples.
- Perfiles y combos conservan su precio independiente y descuento cero.

Inventario:

- Los servicios no controlan existencia.
- Cada perfil o combo valida sus componentes fisicos.
- La validacion suma cantidades cuando varios paquetes comparten un producto.
- El calculador publico y el carrito persistente aplican la misma regla.
- Al pagar se agrupan las salidas del mismo producto para evitar descuentos
  parciales o duplicados.

Fotografia historica del pedido:

- `DetallePedido` ahora puede apuntar a producto o paquete.
- Se agregaron `tipo_articulo`, `codigo_articulo` y `nombre_articulo`.
- Se creo `DetallePedidoComponente` para fotografiar los productos incluidos
  en perfiles y combos.
- Si la composicion del paquete cambia despues de comprar, el pedido conserva
  los componentes originales.
- El inventario se descuenta usando esa fotografia historica.
- La respuesta de pedido y la prefactura incluyen `componentes`.
- Los detalles de pedidos existentes se completan automaticamente durante la
  migracion.

Migracion:

- `pedidos.0011_detallepedidocomponente_alter_itemcarrito_options_and_more`

Verificacion:

- La migracion se aplico correctamente en la base local.
- `python manage.py test pedidos`: 13 pruebas aprobadas.
- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `python manage.py test`: 65 pruebas completas aprobadas.

## 2026-07-30 - Limpieza del flujo de carrito y pedidos

Codigo simplificado:

- `AgregarProductoCarritoSerializer` se renombro internamente a
  `AgregarArticuloCarritoSerializer`, porque procesa productos, perfiles y
  combos.
- Las opciones validas de `tipo_articulo` se centralizaron para no mantener
  dos listas iguales.
- Se retiro la validacion individual de existencia del calculador publico,
  porque la validacion acumulada posterior cubre cada linea y tambien los
  productos compartidos entre paquetes.
- El calculador publico ahora rechaza perfiles o combos que contengan un
  componente inactivo, igual que el carrito persistente y la generacion del
  pedido.

Compatibilidad conservada intencionalmente:

- `agregar-producto` continua como alias temporal de `agregar-articulo`.
- `codigo_barra` continua como entrada alternativa temporal de `codigo`.
- `producto_nombre`, `imagen_principal` y `producto_nombre_actual` permanecen
  en las respuestas mientras el frontend termina de adoptar los nombres
  genericos.
- Estos elementos no son codigo muerto: forman parte del contrato anterior
  documentado para el frontend y retirarlos ahora podria romper una
  integracion pendiente.

Auditoria:

- No se encontraron imports, clases nuevas, rutas internas ni metodos del
  flujo actualizado sin referencias.
- Los archivos de `pedidos` compilan correctamente.
- `python manage.py test pedidos`: 14 pruebas aprobadas.
- `python manage.py test`: 66 pruebas completas aprobadas.
- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.

## 2026-07-31 - Retiro del contrato antiguo del carrito

El frontend termino la migracion al carrito unificado. Desde esta fecha queda
un solo contrato oficial para productos, servicios, examenes, perfiles y
combos.

Elementos retirados:

- Ruta `POST /api/pedidos/carritos/{id}/agregar-producto/`.
- Entrada alternativa `codigo_barra` al agregar un articulo. Ahora el payload
  exige `codigo`.
- Campo duplicado `producto_nombre` en los items del carrito.
- Campo duplicado `imagen_principal` en los items del carrito.
- Campo duplicado `producto_nombre_actual` en los detalles del pedido.

Contrato vigente:

- Ruta `POST /api/pedidos/carritos/{id}/agregar-articulo/`.
- Entrada con `codigo`, `tipo_articulo` y `cantidad`.
- Items con `articulo_nombre` e `imagen_final`.
- Detalles de pedido con `nombre_articulo` como valor historico.

Alcance:

- `codigo_barra` permanece como dato de salida para productos que tengan
  codigo de barras; solo se retiro como nombre alternativo del payload.
- `imagen_principal` permanece en el modelo y las APIs del catalogo; solo se
  retiro su duplicado en la respuesta del carrito.
- Las notas anteriores sobre compatibilidad quedan conservadas unicamente
  como historial y ya no describen el contrato vigente.

Verificacion:

- La ruta antigua responde `404 Not Found`.
- El payload con solo `codigo_barra` responde `400 Bad Request` y exige
  `codigo`.
- Las respuestas del carrito ya no contienen `producto_nombre` ni
  `imagen_principal`.
- Los detalles del pedido ya no contienen `producto_nombre_actual`.
- `python manage.py test pedidos`: 16 pruebas aprobadas.
- `python manage.py test`: 68 pruebas completas aprobadas.
- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.

## 2026-07-31 - Fotografia comercial inmutable del checkout

La fotografia del pedido ya no es solamente una copia inicial. Desde este
cambio tambien queda protegida contra modificaciones posteriores.

Datos congelados:

- Empresa, cliente y carrito de origen.
- Numero y tipo de entrega.
- Destinatario, telefono y direccion.
- Subtotal, descuento, impuesto, tarifa de envio y total.
- Moneda y observaciones.
- Tipo, codigo, nombre, precio y cantidad de cada articulo.
- Promocion aplicada y valores finales de cada linea.
- Componentes incluidos originalmente en perfiles y combos.

Reglas:

- Cambiar productos, paquetes, impuestos o tarifas no altera pedidos creados.
- Al marcar como pagado no se recalcula la tarifa ni el total.
- Pago, descuento de inventario y creacion de prefactura se ejecutan dentro de
  una misma transaccion.
- Un pedido pagado no puede volver a pendiente.
- Pedido, detalles y componentes no pueden eliminarse como registros
  ordinarios.
- Las APIs `pedidos/pedidos` y `pedidos/detalles` son de solo lectura.
- En Django Admin los datos comerciales son de solo lectura y unicamente se
  permite cambiar `estado_pago`.
- `articulo_nombre_actual` se retiro de la respuesta. El frontend debe usar
  `nombre_articulo`, que representa el valor historico comprado.

Verificacion:

- `python manage.py test pedidos`: 19 pruebas aprobadas.
- `python manage.py test`: 71 pruebas completas aprobadas.
- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.

## 2026-07-31 - Base neutral de pagos y webhooks

Se creo la app independiente `pagos` para conectar una pasarela sin acoplarla
al carrito ni a los modelos comerciales del pedido.

Modelos:

- `Pago` conserva pedido, empresa, cliente, referencia UUID, proveedor, monto,
  moneda, estado, identificador externo y fechas.
- `EventoWebhookPago` registra el identificador del evento, hash del payload,
  resultado y estado de procesamiento sin guardar datos sensibles.

API:

- `POST /api/pagos/iniciar/` crea o recupera el intento pendiente.
- `GET /api/pagos/` lista los pagos visibles para el usuario o personal de la
  empresa.
- `GET /api/pagos/{referencia}/` consulta un intento por su referencia publica.
- `POST /api/pagos/webhooks/{proveedor}/` recibe resultados firmados del
  proveedor.

Seguridad e integridad:

- El frontend solo envia `pedido_id`; monto y moneda siempre salen del pedido.
- Un cliente no puede iniciar ni consultar pagos de otro cliente.
- Solo existe un pago pendiente por pedido.
- Los eventos repetidos con el mismo contenido son idempotentes.
- Reutilizar `evento_id` con otro contenido se rechaza.
- La firma se valida con HMAC SHA-256 y comparacion de tiempo constante.
- Un pago solo cambia de estado mediante un webhook verificado.
- La aprobacion, el cambio del pedido, el inventario y la prefactura se
  procesan de forma atomica.
- Pagos confirmados y eventos se conservan como auditoria.
- No se almacenan datos de tarjeta, CVV ni credenciales bancarias.

Configuracion agregada:

- `PAGOS_PROVEEDOR_DEFAULT`
- `PAGOS_WEBHOOK_SECRET`

Estado de integracion:

- La base neutral y el proveedor local `simulado` estan preparados.
- Todavia no existe un cobro real ni una URL de redireccion.
- Al elegir la pasarela se implementara su adaptador de inicio, firma y
  traduccion de estados.

Migracion:

- `pagos.0001_initial`

Verificacion:

- `python manage.py test pagos`: 7 pruebas aprobadas.
- `python manage.py test pagos pedidos`: 26 pruebas aprobadas.
- `python manage.py test`: 78 pruebas completas aprobadas.
- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `pagos.0001_initial`: aplicada correctamente en la base local.

## 2026-07-31 - Cuentas locales para pruebas de roles

Se prepararon dos cuentas en la base local.

Superadministrador:

- Usuario de Django Admin: `admin`
- Correo para el login del frontend: `analizahn2025@gmail.com`
- Contrasena temporal: `0000`
- Rol: `administrador_maestro`
- Empresa fija: ninguna
- Cuenta activa y verificada.

Comprador de Analiza:

- Usuario: `compras`
- Correo para el login: `compras@example.com`
- Contrasena temporal: `0000`
- Rol: `comprador`
- Empresa: `Analiza`
- Cuenta activa y verificada.

Decision multiempresa:

- La supercuenta utilizara una sola identidad para administrar cualquier empresa.
- La empresa activa se determinara mediante dominio, subdominio o slug.
- La cuenta compradora permanece vinculada exclusivamente con Analiza.
- Antes del frontend administrativo se debe centralizar el contexto de empresa
  en las APIs.

Seguridad:

- Estas credenciales son exclusivamente para desarrollo local.
- Deben cambiarse antes de publicar el sistema o permitir acceso desde internet.
- No se crearon migraciones ni se modificaron archivos de codigo.

## 2026-08-03 - APIs completas para el panel administrativo React

Estado: implementado, migrado, documentado y verificado.

Objetivo:

- Preparar el backend del panel administrativo sin modificar el frontend.
- Mantener las APIs publicas actuales de la tienda.
- Aplicar el aislamiento multiempresa en el servidor y no confiar en IDs de
  empresa recibidos desde React.
- Ejecutar el trabajo en ocho fases consecutivas, verificando cada modulo antes
  de avanzar al siguiente.

Contexto multiempresa:

- Se agrego middleware para resolver la empresa mediante dominio, subdominio,
  `X-Frontend-Host` o `empresa_slug` durante desarrollo local.
- Se agrego `GET /api/empresas/contexto-administrativo/` para devolver usuario,
  perfil, empresa actual, empresas disponibles y permisos.
- Se agrego `GET/PATCH /api/empresas/mi-empresa/` para configuracion visual y
  comercial de la empresa actual.
- `PerfilUsuario` ahora tiene `empresas_permitidas` para limitar el alcance del
  administrador maestro.
- Administrador de empresa y gerente quedan forzados a su empresa aunque el
  JSON intente enviar otra.
- Las solicitudes explicitas hacia una empresa no permitida responden `403`.

Empresa, menu y sucursales:

- Se creo CRUD administrativo de menu en `/api/empresas/items-menu/`.
- Clave y orden del menu son unicos dentro de cada empresa.
- Se amplio `/api/empresas/sucursales/` con CRUD autenticado, busqueda, orden,
  paginacion e inclusion opcional de inactivas.
- La consulta publica de sucursales conserva su lista sin paginar y solo
  devuelve sucursales activas.
- Branding, colores, logo, imagen general de sucursales, datos de contacto,
  envios, impuesto e imagenes de productos se pueden modificar desde
  `mi-empresa`.
- Slug, dominios, modo de inventario y activacion de empresa permanecen bajo
  control del superusuario.

Catalogo y paquetes:

- El permiso de catalogo ahora reconoce `administrador_empresa`.
- Familias, categorias y productos tienen CRUD administrativo paginado, filtros
  por empresa, busqueda, orden e inclusion de inactivos.
- El serializador administrativo de producto devuelve su `id` interno.
- `existencia` permanece de solo lectura y solo cambia mediante inventario.
- Se agrego CRUD `/api/catalogo/paquetes/` para perfiles y combos.
- Cada componente del paquete recibe `producto_id`, `cantidad` y `orden`.
- La cantidad del componente participa en validacion del carrito, disponibilidad
  y descuento de inventario.
- Paquetes activos no pueden quedar vacios ni mezclar productos de empresas.
- Las eliminaciones protegidas por historial responden `409`.

Promociones:

- Banners, ofertas y descuentos continúan como tres recursos independientes.
- Los CRUD de `/api/promociones/banners/`, `/api/promociones/ofertas/` y
  `/api/promociones/descuentos/` quedaron aislados por empresas permitidas.
- Se agregaron busqueda, orden, paginacion opcional e inclusion de inactivos.
- Las ofertas reciben `productos_ids` para uno o varios productos segun su tipo.
- Todas las relaciones se validan contra la empresa actual.

Usuarios y sesiones:

- Se agrego CRUD sin eliminacion en `/api/usuarios/administracion/`.
- Superusuario crea administradores maestros y cualquier rol empresarial.
- Administrador maestro gestiona roles de sus empresas permitidas.
- Administrador de empresa gestiona gerentes y compradores.
- Gerente gestiona compradores solo cuando tiene
  `puede_crear_usuarios=true`.
- Comprador no tiene acceso al panel.
- Se agregaron filtros por texto, rol, estado, empresa y orden.
- La contrasena nunca aparece en las respuestas.
- Las acciones `bloquear` y `desbloquear` cambian tanto el perfil como el usuario
  Django.
- Bloquear, desactivar o cambiar contrasena revoca todos los refresh tokens.
- Crear sin `correo_verificado=true` deja la cuenta inactiva.
- El login rechaza perfiles con correo sin verificar.

Contactos, pedidos y pagos:

- Contactos permite creacion publica y bandeja administrativa aislada por
  empresa.
- En un mensaje administrativo solo se puede modificar `estado`; nombre,
  contacto y contenido quedan como historial.
- Pedidos y detalles siguen siendo de solo lectura y ahora admiten filtros por
  estado, cliente, busqueda, fechas y orden.
- Administrador de empresa y gerente pueden consultar todos los pedidos de su
  empresa; compradores solo los propios.
- Pagos ahora devuelve empresa y cliente para la bandeja administrativa.
- Se agregaron filtros por estado, proveedor, cliente, referencia, fechas y
  orden.
- Pedidos y pagos conservan su inmutabilidad; los estados de pago solo cambian
  mediante el flujo controlado y webhook firmado.

Paginacion y errores:

- Se agrego paginacion administrativa de 20 registros y maximo 100 mediante
  `tamano_pagina`.
- Promociones, contactos, pedidos y pagos aceptan `paginar=true` para conservar
  compatibilidad con respuestas anteriores.
- Los rangos de fecha usan `fecha_desde` y `fecha_hasta` en formato
  `AAAA-MM-DD`.
- Se estandarizo `409 Conflict` cuando una eliminacion esta bloqueada por
  historial relacionado.

Migraciones:

- `usuarios.0006_perfilusuario_empresas_permitidas`.
- `catalogo.0006_paqueteproducto_cantidad`.
- Ambas quedaron aplicadas en la base local.

Documentacion para frontend:

- Se creo `docs/API_PANEL_ADMINISTRATIVO.md` como contrato oficial del panel
  React.
- Incluye autenticacion, contexto de empresa, matriz de roles, endpoints,
  filtros, paginacion, imagenes, errores y reglas de eliminacion.
- `docs/BRIEF_FRONTEND.md` ahora enlaza este contrato para reemplazar secciones
  antiguas que marcaban estas APIs como pendientes.

Verificacion final:

- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `catalogo.0006` y `usuarios.0006`: aplicadas.
- `python manage.py test`: 134 pruebas aprobadas.
- `git diff --check`: sin errores de formato.
- Aviso no bloqueante: la carpeta generada `staticfiles` aun no existe.

Fuera de alcance de este cambio:

- No se modifico el proyecto frontend.
- No se conecto Supabase.
- No se integro una pasarela real ni credenciales de produccion.

## 2026-08-03 - Menu de modulos oficiales y plantilla Sobre nosotros

Estado: implementado, migrado, documentado y verificado.

Decision funcional:

- Se descarto la creacion de paginas y rutas genericas.
- Todas las empresas usan el mismo conjunto de modulos oficiales.
- Cada empresa solo cambia el texto visible, el orden y el estado activo de
  cada modulo.
- Las paginas funcionales conservan plantillas conocidas por el frontend.

Menu oficial:

- `inicio` usa `/`.
- `examenes` usa `/examenes`.
- `perfiles` usa `/perfiles`.
- `servicios` usa `/servicios`.
- `promociones` usa `/promociones`.
- `sucursales` usa `/sucursales`.
- `contacto` usa `/contacto`.
- `sobre_nosotros` usa `/sobre-nosotros`.

Restricciones:

- Toda empresa nueva recibe automaticamente los ocho modulos.
- `clave`, `ruta` y `abre_en_nueva_pestana` son inmutables.
- `POST` y `DELETE` de `/api/empresas/items-menu/` ya no estan disponibles.
- La API y Django Admin solo permiten cambiar `texto`, `orden` y `activo`.
- No se permiten dos modulos con el mismo orden dentro de una empresa.
- La base de datos rechaza claves que no pertenezcan al menu oficial.
- En Django Admin se retiraron las opciones de agregar y eliminar items.

Conversion de datos locales:

- El item `Sobre_nosotros` de Analiza se convirtio a `sobre_nosotros`.
- Su ruta cambio de `/sobrenosotros` a `/sobre-nosotros`.
- Se conservaron su texto, orden y estado activo.
- Los modulos oficiales faltantes se completaron para las empresas existentes.
- Los items libres que no correspondian a una plantilla oficial se retiraron.
- Los ordenes duplicados heredados se normalizaron conservando primero el
  modulo mas antiguo y moviendo el duplicado al primer numero libre.
- En Analiza, `Servicios` conservo el orden 2 y `Examenes` quedo en el orden 4.

Plantilla Sobre nosotros:

- Se creo un registro `SobreNosotrosEmpresa` uno a uno con cada empresa.
- Los campos fijos son titulo, introduccion, historia, mision, vision, valores,
  compromiso, imagen e imagen URL.
- `valores_lista` convierte las lineas no vacias de `valores` en una lista para
  el frontend.
- `imagen_final` conserva compatibilidad con archivos locales y futuras URLs de
  R2.
- Las fichas se crean automaticamente para empresas nuevas y mediante migracion
  para empresas existentes.

APIs:

- Publica: `GET /api/empresas/sobre-nosotros/?empresa_slug=Analiza`.
- Administrativa: `GET/PATCH /api/empresas/mi-sobre-nosotros/`.
- La API publica no expone IDs internos ni empresa.
- Si `sobre_nosotros` esta desactivado en el menu, la consulta publica responde
  `404`.
- Administrador maestro, administrador de empresa y gerente respetan el mismo
  aislamiento multiempresa del resto del panel.
- Compradores no pueden modificar este contenido.

Frontend:

- La ruta oficial que debe implementar React es `/sobre-nosotros`.
- Debe existir un solo componente fijo para todas las empresas.
- Las secciones vacias pueden ocultarse.
- Servicios no debe usarse como respaldo para esta ruta ni para rutas
  desconocidas.
- Se actualizaron `docs/API_PANEL_ADMINISTRATIVO.md` y
  `docs/BRIEF_FRONTEND.md` con el contrato nuevo.

Migracion:

- `empresas.0014_sobrenosotrosempresa_alter_itemmenuempresa_clave_and_more`.
- `empresas.0015_normalizar_orden_menu_oficial`.
- Ambas quedaron aplicadas correctamente en la base local.

Verificacion:

- `python manage.py check`: sin problemas.
- `python manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `python manage.py test empresas`: 39 pruebas aprobadas.
- `python manage.py test`: 143 pruebas aprobadas.
- `git diff --check`: sin errores de formato.

## 2026-08-03 - Contenido institucional de Analiza

Fuente:

- `Presentacion Analiza-Clientes Corporativos (1).pdf`.

Datos cargados en `SobreNosotrosEmpresa` para la empresa con slug `Analiza`:

- Introduccion con la presencia regional y atencion mediante sucursales en
  Honduras.
- Mision institucional.
- Vision de liderazgo regional para el ano 2030.
- Valores: Calidad, Innovacion, Servicio y Tecnologia.
- Compromiso con proyeccion social, cuidado del medio ambiente, manejo de
  residuos bioinfecciosos y capacitacion del equipo.
- `historia` permanece vacia porque el documento no incluye una historia
  empresarial identificable.
- No se asigno una imagen: las imagenes del documento forman parte de las
  diapositivas y no se utilizaron como recortes para la pagina web.

Alcance:

- No se modificaron modelos, migraciones, serializers, vistas ni rutas.
- La API publica existente respondio `200` con el contenido mediante
  `GET /api/empresas/sobre-nosotros/?empresa_slug=Analiza`.

## 2026-08-03 - Redes sociales por empresa

Configuracion:

- Se agregaron a `Empresa` las URLs opcionales `instagram_url`,
  `whatsapp_url`, `facebook_url` y `tiktok_url`.
- Los enlaces deben usar HTTPS y pertenecer al dominio oficial de la red.
- Django Admin muestra los cuatro campos dentro de `Redes sociales`.
- `GET/PATCH /api/empresas/mi-empresa/` permite consultar y actualizar los
  enlaces de la empresa administrada.
- Los enlaces de Analiza permanecen vacios hasta recibir sus URLs oficiales.

Contrato publico unico:

- `GET /api/empresas/actual/?host=...` y su respaldo
  `GET /api/empresas/publica/?slug=Analiza` devuelven el objeto
  `redes_sociales`.
- No se crearon endpoints adicionales.
- Contacto y Sobre nosotros no duplican las redes en sus respuestas.
- El frontend debe cargar la configuracion de empresa una vez y reutilizarla
  debajo del nombre en Contacto y al final de Sobre nosotros.
- Una URL vacia indica que el icono correspondiente no debe mostrarse.

Migracion y pruebas:

- Se creo y aplico
  `empresas.0016_empresa_facebook_url_empresa_instagram_url_and_more`.
- `python manage.py test empresas`: 47 pruebas aprobadas.
- `python manage.py test`: 151 pruebas aprobadas.

## 2026-08-05 - Registro de comprador desde Mi cuenta

Estado: implementado en frontend y compilado.

Cambios:

- El modal publico de Mi cuenta ahora permite cambiar entre iniciar sesion,
  crear cuenta y activar cuenta.
- El formulario de registro solicita nombre completo, correo, telefono,
  numero de identidad, contrasena, confirmacion y aceptaciones legales.
- El registro usa `POST /api/usuarios/registro-comprador/`.
- La verificacion usa `POST /api/usuarios/verificar-correo/`.
- El reenvio usa `POST /api/usuarios/reenviar-verificacion/`.
- El frontend no envia ningun campo de rol; las cuentas creadas por este flujo
  quedan sujetas al contrato publico de comprador del backend.
- Al crear la cuenta, la interfaz pasa automaticamente a pedir el codigo.
- Al verificar correctamente, vuelve al login con el correo precargado.

Archivos modificados:

- `src/services/authService.js`.
- `src/components/auth/AuthDialog.jsx`.
- `src/components/auth/AuthDialog.module.css`.
- `src/app/App.jsx`.
- `.gitignore`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- `npm ci --cache .\.npm-cache --no-audit`: correcto con acceso a red.
- `npm run build`: correcto.
- Servidor local Vite iniciado y disponible en `http://127.0.0.1:5173/`.

## 2026-08-05 - Base versionada de API y endpoint de Examenes

Estado: implementado en frontend.

Cambios:

- La base predeterminada del cliente HTTP cambio de `/api` a `/api/v1`.
- La pagina Examenes conserva el endpoint dedicado
  `GET /api/v1/catalogo/examenes/?empresa_slug=Analiza`.
- La pagina Servicios conserva el listado general
  `GET /api/v1/catalogo/servicios/?empresa_slug=Analiza`.
- El detalle de servicios queda limitado a ramas especificas mediante
  `GET /api/v1/catalogo/servicios/detalle/?empresa_slug=Analiza&servicio=...`.
- No se usa `servicios/detalle` como fuente de la pagina Examenes.

Archivo modificado:

- `src/services/apiClient.js`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

## 2026-08-05 - Servicios carga Examenes con su endpoint dedicado

Estado: implementado en frontend y compilado.

Motivo:

- La pagina Servicios podia intentar cargar el detalle de la familia
  `Examenes` mediante `servicios/detalle`, especialmente durante busquedas.
- Esa familia debe conservar la jerarquia visual de Servicios, pero cargar sus
  examenes mediante el endpoint dedicado
  `GET /api/v1/catalogo/examenes/?empresa_slug=Analiza`.

Cambios:

- `ServiceTypesPage` mantiene la familia oficial `Examenes` dentro del acordeon
  de Servicios.
- Al abrirla consulta `/api/v1/catalogo/examenes/` y agrupa los examenes por
  `categoria_nombre` dentro de las categorias del listado general.
- Las demas familias conservan su carga mediante `servicios/detalle`.
- Las ramas especificas de servicios, como `imagenes`, siguen usando
  `servicios/detalle`.

Archivo modificado:

- `src/pages/ServiceTypesPage.jsx`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

## 2026-08-05 - Simetria de tarjetas compactas en Servicios

Estado: implementado en frontend.

Cambios:

- Categoria y disponibilidad se distribuyen en lineas centradas cuando la
  empresa oculta las imagenes de producto.
- Los textos se ajustan dentro del ancho de la tarjeta sin superponerse.
- Todas las tarjetas de la cuadricula compacta comparten altura y mantienen el
  precio y el boton de compra alineados en la base.

Archivos modificados:

- `src/components/catalog/ProductCard.module.css`.
- `src/pages/DynamicPages.module.css`.

Verificacion:

- `npm run build`: correcto.

## 2026-08-06 - Carrito sin apertura automatica al agregar

Estado: implementado en frontend.

Cambios:

- Agregar productos, examenes, perfiles o combos actualiza los articulos y el
  contador sin abrir el drawer del carrito.
- Tras un agregado exitoso, el boton confirma `Agregado`, el contador se anima
  y aparece una notificacion temporal con el nombre del articulo.
- La notificacion permite abrir el carrito directamente o cerrarse, y desaparece
  automaticamente despues de unos segundos.
- El drawer se abre cuando el usuario pulsa el icono del carrito o cuando vuelve
  explicitamente desde checkout.

Archivos modificados:

- `src/app/App.jsx`.
- `src/app/App.module.css`.
- `src/components/catalog/ProductCard.jsx`.
- `src/components/catalog/ProductCard.module.css`.
- `src/components/catalog/PackageCard.jsx`.
- `src/components/catalog/PackageCard.module.css`.
- `src/components/layout/Header.jsx`.
- `src/components/layout/Header.module.css`.

Verificacion:

- `npm run build`: correcto.

## 2026-08-06 - Recuperacion del carrito ante fallos de conexion

Motivo:

- Supabase rechazo temporalmente el agregado de articulos con
  `EMAXCONNSESSION` al alcanzar el limite de 15 clientes del Session pooler.
- Mientras la peticion permanecia pendiente, la tarjeta continuaba mostrando
  `Agregando` y una respuesta HTML de Django podia ocupar el area de error.

Cambios:

- Las operaciones autenticadas del carrito tienen un tiempo maximo de 30
  segundos.
- Al agotarse el tiempo, el boton recupera su estado y se muestra un mensaje
  breve para volver a intentar.
- Las paginas HTML de depuracion y mensajes excesivamente largos ya no se
  muestran directamente en la interfaz.
- El backend libera cada conexion de Supabase al terminar la solicitud mediante
  `DATABASE_CONN_MAX_AGE=0`.

Archivos modificados en frontend:

- `src/services/apiClient.js`.
- `src/services/cartService.js`.
- `src/utils/apiError.js`.

Verificacion:

- `npm run build`: correcto.

## 2026-08-06 - Auditoria responsive integral

Estado: implementado y verificado en frontend.

Problema corregido:

- En telefonos, Mi cuenta se abria como una hoja casi completa y enfocaba el
  correo automaticamente. Los campos heredaban tipografias menores de 16 px,
  lo que podia activar el zoom del navegador movil.

Cambios:

- El login movil ahora es un dialogo centrado, compacto y con margen visible.
- Su altura en una pantalla de 320 x 720 bajo de 548 px a 421 px.
- Crear cuenta conserva desplazamiento interno y usa `100dvh` para respetar el
  espacio realmente disponible en el telefono.
- Se retiro `autoFocus` de login, registro y verificacion para no abrir el
  teclado ni ampliar la pagina al mostrar el dialogo.
- Los controles de autenticacion, busqueda, contacto, checkout y panel usan un
  minimo visual de 16 px en movil para evitar zoom automatico.
- El menu principal horizontal desplaza la seccion activa al centro cuando una
  ruta se abre o recarga directamente.

Archivos modificados:

- `src/components/auth/AuthDialog.jsx`.
- `src/components/auth/AuthDialog.module.css`.
- `src/components/layout/Header.module.css`.
- `src/components/layout/MainNav.jsx`.
- `src/pages/DynamicPages.module.css`.
- `src/pages/CheckoutPages.module.css`.
- `src/admin/AdminApp.module.css`.
- `src/styles/base.css`.

Verificacion:

- Rutas publicas revisadas: Inicio, Servicios, Examenes, Perfiles,
  Promociones, Sucursales, Contacto, Sobre nosotros, Checkout y Pago.
- Estados revisados: login, crear cuenta, carrito y favoritos.
- Las 18 secciones administrativas, el menu lateral y el editor de productos
  se revisaron con datos simulados solo dentro del navegador de prueba.
- Viewports revisados: 320 x 720, 375 x 812, 768 x 1024 y 1440 x 900.
- Ninguna pantalla genero desbordamiento horizontal.
- `npm run build`: correcto; Vite transformo 1641 modulos.

## 2026-08-06 - Dashboard comercial con comparacion mensual

Estado: implementado y verificado en frontend.

Datos utilizados:

- `GET /api/v1/pedidos/pedidos/` con `fecha_desde`, `fecha_hasta`, orden y
  paginacion completa.
- Una venta confirmada corresponde a `estado_pago=pagado` o `aprobado`.
- Los totales monetarios proceden del campo historico `total` del pedido.

Indicadores agregados:

- Ingresos confirmados del mes.
- Numero de ventas confirmadas.
- Ticket promedio.
- Monto y cantidad de pedidos pendientes de pago.
- Variacion de ingresos y ventas frente al mes anterior.
- Ingresos y ventas acumulados de los ultimos seis meses.

Visualizaciones y operacion:

- Grafica de barras con ingresos confirmados por mes.
- Distribucion de pedidos confirmados, pendientes, rechazados y otros estados.
- Accesos compactos a catalogo, usuarios y mensajes.
- Se conservaron pedidos recientes, mensajes e inventario.
- Si la consulta de pedidos falla, el panel muestra una advertencia sin bloquear
  los demas modulos.

Archivos modificados:

- `src/admin/AdminDashboard.jsx`.
- `src/admin/AdminApp.module.css`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- `npm run build`: correcto; Vite transformo 1641 modulos.
- Vista validada con pedidos simulados en 320, 768 y 1440 px.
- Ningun viewport genero desbordamiento horizontal.

Pendiente de backend para reportes formales:

- Resumen consolidado de ventas, pagos, impuestos, descuentos y devoluciones.
- Exportacion autorizada de CSV, XLSX y PDF por empresa y rango de fechas.
- Totales oficiales calculados del lado servidor para cierres contables.

## 2026-08-06 - Consumo de resumen oficial y descarga de reportes

Estado: implementado y verificado en frontend.

Integracion realizada:

- El dashboard consume `GET /api/v1/reportes/resumen-ventas/` para el mes actual
  y para la serie agrupada de los ultimos seis meses.
- Los ingresos, ventas, ticket promedio, pendientes, variaciones, estados,
  subtotal, descuentos, impuestos, envios y productos mas vendidos proceden del
  resumen calculado por el backend.
- Se elimino la descarga paginada de todos los pedidos para calcular las
  estadisticas en React.
- Pedidos recientes usa una sola pagina de cinco registros.

Descarga de reportes:

- Se agrego un centro de reportes con rango de fechas y contenido `resumen`,
  `ventas`, `pagos` o `impuestos`.
- Permite descargar `PDF`, `XLSX` y `CSV` mediante
  `GET /api/v1/reportes/ventas/exportar/`.
- La descarga conserva autenticacion JWT, renovacion automatica ante `401`,
  detalle de errores y nombre de archivo de `Content-Disposition`.
- Se valida que la fecha inicial no sea posterior a la final y que el archivo
  recibido no este vacio.

Archivos modificados:

- `src/services/apiClient.js`.
- `src/services/adminService.js`.
- `src/admin/AdminDashboard.jsx`.
- `src/admin/AdminApp.module.css`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- Las rutas locales de resumen y exportacion respondieron `401` sin credenciales,
  confirmando que existen y estan protegidas; ninguna respondio `404`.
- Prueba de navegador con el contrato simulado en 320, 768 y 1440 px: sin
  desbordamiento horizontal ni errores de consola.
- La prueba de descarga genero `ventas-analiza.csv` con el nombre enviado por el
  servidor.
- `npm run build`: correcto; Vite transformo 1641 modulos.

Pendiente operativo:

- Probar los tres formatos y los cuatro tipos con una sesion administrativa y
  datos reales de cada empresa.
- Validar permisos con superusuario, administrador maestro, administrador de
  empresa, gerente y comprador.

## 2026-08-06 - Compatibilidad de cabecera Accept en reportes

Estado: corregido en frontend.

- La descarga enviaba una lista cerrada de tipos MIME en `Accept`.
- Django REST Framework rechazaba la negociacion antes de ejecutar la
  exportacion y respondia que no podia satisfacer esa cabecera.
- La descarga ahora usa `Accept: */*`; el formato solicitado continua definido
  explicitamente por `formato=pdf`, `formato=xlsx` o `formato=csv`.

## 2026-08-06 - Periodos fijos y bloqueo de fechas futuras

Estado: implementado y verificado en frontend.

- El formulario ya no solicita fecha final.
- Solicita fecha inicial y periodo semanal, quincenal o mensual.
- Semanal calcula 7 dias inclusivos y quincenal 15 dias inclusivos.
- Mensual calcula un mes desde la fecha inicial y usa una fecha final inclusiva.
- La fecha final calculada se presenta antes de descargar.
- Si el periodo incluye una fecha futura, el boton queda deshabilitado y se
  informa la fecha inicial maxima permitida para ese tipo de reporte.
- El endpoint conserva el contrato `fecha_desde` y `fecha_hasta`; ambas fechas
  son calculadas y enviadas por React.

Verificacion:

- Un reporte semanal iniciado el 31/07/2026 envio
  `fecha_desde=2026-07-31&fecha_hasta=2026-08-06`.
- El intento semanal desde 01/08/2026 quedo bloqueado por terminar el
  07/08/2026, posterior al dia de la prueba.
- Descarga CSV verificada y sin desbordamiento horizontal a 320 px.

## 2026-08-06 - Pago en linea o en sucursal con prefactura

Estado: implementado y verificado en frontend con el contrato
`API_PAGO_EN_SUCURSAL.md`.

Checkout:

- Se agregaron las opciones `Pagar en linea` y `Pagar en sucursal`.
- El flujo en linea conserva `POST /api/v1/pagos/iniciar/`.
- El flujo presencial consulta sucursales activas y exige seleccionar una.
- Tras crear el pedido, envia solo `sucursal_id` a
  `POST /api/v1/pedidos/pedidos/{id}/pago-en-sucursal/`.
- Un pedido creado se conserva para reintentar si falla el inicio del pago, sin
  duplicarlo.

Prefactura y correo:

- La respuesta oficial de pedido, pago y prefactura se conserva durante la
  navegacion hacia `/pago/{referencia}`.
- El PDF se descarga con JWT desde
  `GET /api/v1/pedidos/pedidos/{id}/prefactura/pdf/`.
- El reenvio se solicita a
  `POST /api/v1/pedidos/pedidos/{id}/prefactura/reenviar-correo/` sin enviar una
  direccion desde React.
- La pantalla muestra el correo enmascarado y la sucursal de pago devueltos o
  asociados por el backend.
- React no genera archivos, no envia correos y no cambia el pago a aprobado.

Archivos modificados:

- `src/services/pagoService.js`.
- `src/pages/CheckoutPage.jsx`.
- `src/pages/PaymentPage.jsx`.
- `src/pages/CheckoutPages.module.css`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- Recorrido simulado completo: carrito autenticado, sucursal, pedido, pago
  presencial, pantalla de estado, descarga y reenvio.
- Las llamadas de inicio, PDF y reenvio incluyeron `Authorization: Bearer`.
- La descarga uso el nombre `prefactura-PED-001.pdf` enviado por el servidor.
- Viewports 320 y 1440 px sin desbordamiento horizontal ni errores de consola.
- `npm run build`: correcto; Vite transformo 1641 modulos.

## 2026-08-10 - Sesion compartida entre tienda y panel

Estado: corregido y verificado en frontend.

Problema:

- `Ir al panel administrativo` usaba `window.location.assign` y recargaba todo
  el documento.
- Como el access token se guarda solamente en memoria, la recarga lo eliminaba
  y el panel dependia de una renovacion inmediata para recuperar la sesion.
- Cuando la cookie de refresh no estaba disponible, se mostraba otro formulario
  de inicio de sesion aunque el usuario acabara de autenticarse en la tienda.

Solucion:

- `src/main.jsx` ahora mantiene un enrutador raiz que alterna entre la tienda y
  `AdminApp` al cambiar la ruta mediante History API.
- El acceso al panel y el regreso a la tienda ya no recargan la pagina.
- `restoreUsuarioSession` reutiliza primero el access token existente en memoria
  y solo solicita refresh cuando no existe uno.
- El token continua fuera de `localStorage` y `sessionStorage`.
- Abrir o recargar directamente `/administracion` conserva el mecanismo seguro
  de restauracion mediante refresh `HttpOnly`.

Archivos modificados:

- `src/main.jsx`.
- `src/app/App.jsx`.
- `src/admin/AdminApp.jsx`.
- `src/services/apiClient.js`.
- `src/services/authService.js`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- Sesion administrativa restaurada en la tienda y traslado a
  `/administracion` sin mostrar el login del panel.
- Regreso a la tienda con la misma sesion activa.
- Solo una llamada de refresh durante todo el recorrido.
- Sin errores de consola.
- `npm run build`: correcto; Vite transformo 1641 modulos.

## 2026-08-10 - Validacion del registro y verificacion de correo

Estado: implementado y compilado en frontend.

Cambios:

- Nombre completo elimina caracteres distintos de letras Unicode o espacios.
- Telefono e identidad usan `type="text"`, `inputMode="numeric"` y eliminan
  caracteres no numericos; identidad conserva un maximo de 13 digitos.
- El codigo de verificacion conserva un maximo de 6 digitos y el servicio lo
  envia como `string`.
- Se agregaron botones `type="button"` con Eye/EyeOff de Lucide en login,
  contrasena nueva y confirmacion.
- El registro pasa directamente a la verificacion sin llamar al endpoint de
  reenvio, porque el registro ya solicita el primer codigo.
- El mensaje `Código reenviado` solo se muestra cuando
  `/usuarios/reenviar-verificacion/` responde HTTP `200`.
- Las respuestas de error continúan mostrando el mensaje util del backend.

Archivos modificados:

- `src/components/auth/AuthDialog.jsx`.
- `src/components/auth/AuthDialog.module.css`.
- `src/services/apiClient.js`.
- `src/services/authService.js`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- `npm run build`: correcto; Vite transformo 1641 modulos.

## 2026-08-10 - Presentacion de pagos en sucursal

Estado: implementado y verificado en frontend.

Cambios:

- Se elimino el boton `Actualizar estado` de la pantalla de pago.
- La consulta automatica cada ocho segundos se mantiene mientras el pago esta
  pendiente.
- El estado administrativo `sin_pago` ahora se presenta como
  `Pagadas en sucursal`.
- Los pagos confirmados cuyo metodo es sucursal usan la misma etiqueta, los
  pendientes muestran `Pendiente en sucursal` y los pagos en linea conservan
  sus etiquetas originales.
- La presentacion se aplica tanto en los listados administrativos como en
  Pedidos recientes del dashboard.

Archivos modificados:

- `src/pages/PaymentPage.jsx`.
- `src/admin/AdminResourcePage.jsx`.
- `src/admin/AdminDashboard.jsx`.
- `src/utils/paymentStatus.js`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- Casos comprobados: `sin_pago`, sucursal pagado, sucursal pendiente y pago en
  linea pagado.
- `npm run build`: correcto; Vite transformo 1642 modulos.

## 2026-08-10 - Recuperacion del carrito al recargar

Estado: corregido y compilado en frontend.

Problema:

- El carrito autenticado dependia completamente de restaurar la sesion y
  completar `GET /api/v1/pedidos/carritos/mi-carrito/` durante cada recarga.
- Mientras se consultaba, o si la solicitud fallaba, los articulos desaparecian
  de la interfaz porque no existia una copia local de recuperacion.

Solucion:

- Se agrego una copia local aislada por empresa y usuario con el prefijo
  `ventas_account_cart_v1`.
- La copia se carga al restaurar la cuenta y se actualiza despues de sincronizar
  o modificar correctamente el carrito remoto.
- El backend continua siendo la fuente oficial del carrito autenticado.
- Si no se puede recuperar el carrito remoto, la copia permanece visible pero
  sus controles y el checkout quedan bloqueados para evitar cambios locales
  que no lleguen al servidor.
- El carrito invitado conserva su clave y comportamiento anteriores.

Archivos modificados:

- `src/app/App.jsx`.
- `src/components/cart/CartDrawer.jsx`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- Chrome headless: el contador con dos articulos se mantuvo despues de una
  recarga completa y un fallo `503` simulado de `mi-carrito`.
- La copia recuperada mantuvo visible el producto, mostro el error de
  sincronizacion y bloqueo sus controles.
- `npm run build`: correcto; Vite transformo 1642 modulos.

## 2026-08-10 - Pagos separados por metodo

Estado: implementado y verificado en frontend con el contrato oficial.

Integracion:

- El dashboard consume `resumen.pagos_por_metodo.sucursal` y
  `resumen.pagos_por_metodo.en_linea` desde
  `GET /api/v1/reportes/resumen-ventas/`.
- Se elimino la metrica principal `Pendiente de pago`.
- Se agregaron indicadores independientes de monto y cantidad aprobada para
  pagos en sucursal y pagos en linea.
- Pedidos recientes muestra el metodo de pago en vez de mezclarlo con el estado.
- Los listados y detalles administrativos de Pedidos y Pagos incluyen una
  columna o campo `Metodo` con etiquetas legibles.
- Los estados aprobado, pagado, pendiente, rechazado y cancelado conservan su
  significado independiente del metodo.

Archivos modificados:

- `src/admin/AdminDashboard.jsx`.
- `src/admin/AdminApp.module.css`.
- `src/admin/AdminResourcePage.jsx`.
- `src/admin/resourceConfigs.js`.
- `src/utils/paymentStatus.js`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- Contrato simulado con dos pagos aprobados por `L 2,000.00` en sucursal y tres
  por `L 3,500.00` en linea.
- Dashboard sin la tarjeta anterior y sin desbordamiento a 1440 y 320 px.
- Listado de pagos con ambos metodos legibles y sin mostrar `en_linea`.
- `npm run build`: correcto; Vite transformo 1642 modulos.

## 2026-08-10 - Gestion de pedidos y cobros pendientes

Estado: implementado y verificado en frontend con el contrato oficial.

Integracion:

- El dashboard consume `resumen.pendientes_por_metodo` y separa los pedidos por
  cobrar en sucursal, esperando pago en linea y sin metodo elegido, mostrando
  la cantidad y el monto decimal entregados por el backend.
- El total pendiente generico de `estados` se omite cuando existe el nuevo
  desglose para no duplicar pedidos.
- Pedidos permite filtrar por estado y cancelar un registro pendiente con un
  motivo obligatorio y confirmacion explicita.
- La cancelacion usa
  `POST /api/v1/pedidos/pedidos/{id}/cancelar-pendiente/`, conserva el mensaje
  de idempotencia y actualiza los datos de auditoria mostrados en el detalle.
- Pagos permite filtrar por estado y confirmar cobros pendientes en sucursal
  mediante `POST /api/v1/pagos/{referencia}/confirmar-en-sucursal/`.
- Desde un pedido pendiente de sucursal se puede abrir directamente su pago;
  la busqueda y el filtro `pendiente` se trasladan en la ruta administrativa.
- El detalle de Pagos carga el pedido relacionado y presenta sus articulos,
  cantidades, precios unitarios y subtotales para facilitar la verificacion del
  cobro.
- Los botones se muestran solo en estados validos, quedan bloqueados durante la
  solicitud y desaparecen despues de completar correctamente la accion.
- Las respuestas `500` con paginas o trazas de depuracion de Django se
  reemplazan por un mensaje seguro y breve en el panel administrativo.

Archivos modificados:

- `src/admin/AdminDashboard.jsx`.
- `src/admin/AdminApp.module.css`.
- `src/admin/AdminResourcePage.jsx`.
- `src/admin/resourceConfigs.js`.
- `src/services/adminService.js`.
- `src/utils/paymentStatus.js`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- `npm run build`: correcto; Vite transformo 1642 modulos.
- Chrome headless: dashboard, cancelacion con motivo, auditoria, filtros y
  confirmacion de cobro en sucursal comprobados con respuestas simuladas.
- Vista administrativa comprobada a 320 px sin desbordamiento horizontal.

## 2026-08-11 - Retiro de reportes CSV

Estado: implementado en frontend.

- Se retiro `CSV` del selector de formatos del centro de reportes.
- Los formatos visibles y solicitables desde el panel quedan limitados a `PDF`
  y `XLSX`, de acuerdo con el contrato actual del backend.

## 2026-08-11 - Reportes comerciales segmentados

Estado: implementado y verificado en frontend con el contrato oficial.

- Se agregaron los contenidos `Sucursales` y `Familias` a los cuatro reportes
  existentes.
- El panel carga y combina filtros por ciudad, sucursal, examen y familia.
- Los filtros se aplican al resumen del mes, la serie de seis meses y la
  descarga PDF o XLSX, sin enviar IDs vacios.
- Una fuente de opciones puede fallar sin bloquear los demas filtros.
- La grafica consume `serie` y los totales monetarios oficiales se presentan
  desde sus cadenas decimales sin recalcularlos en React.
- El servicio rechaza formatos o contenidos no admitidos y respeta el nombre
  recibido por `Content-Disposition`.

Verificacion:

- `npm run build`: correcto; Vite transformo 1642 modulos.
- Chrome headless: seis contenidos, formatos PDF/XLSX, filtro aplicado al
  resumen y a la descarga, y ancho de 320 px sin desbordamiento.
- Endpoints publicos locales: 371 examenes y 2 familias disponibles.
- Sucursales requiere aplicar la migracion local que agrega
  `empresas_sucursalempresa.ciudad`; el frontend mantiene disponibles los otros
  filtros mientras esa fuente responde con error.

## 2026-08-11 - Persistencia de registro, verificacion y checkout

Estado: implementado y verificado en frontend.

- El cuadro de cuenta conserva por pestana si estaba abierto y restaura el
  paso de inicio de sesion, creacion de cuenta o activacion despues de recargar.
- Registro conserva nombre, correo, telefono, identidad y aceptaciones; la
  activacion conserva el correo pendiente.
- Las contrasenas y el codigo de seis digitos nunca se guardan y siempre se
  restauran vacios.
- Al completar la verificacion se abandona el estado pendiente y al iniciar
  sesion se elimina el borrador de autenticacion.
- Checkout conserva tipo y datos de entrega, metodo de pago y sucursal,
  aislados por empresa y usuario, y limpia el borrador al iniciar el pago.

Archivos modificados:

- `src/app/App.jsx`.
- `src/components/auth/AuthDialog.jsx`.
- `src/pages/CheckoutPage.jsx`.
- `src/utils/authFlow.js`.
- `src/utils/paymentContext.js`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- `npm run build`: correcto; Vite transformo 1643 modulos.
- Chrome headless: verificacion y registro restaurados despues de recargar;
  correo y datos no sensibles presentes, contrasenas y codigo vacios.

## 2026-08-11 - Recordarme, recuperacion de contrasena y Favoritos responsive

Estado: implementado y verificado en frontend con el contrato actualizado.

- Login incorpora `Recordarme` y envia `recordarme` como booleano; login,
  refresh y logout conservan la cookie protegida mediante credenciales.
- `Olvide mi contrasena` solicita el codigo por correo y presenta un segundo
  paso para codigo, nueva contrasena y confirmacion.
- El codigo se limita a seis digitos y se envia como string.
- Los pasos de recuperacion sobreviven una recarga conservando solo el correo;
  codigo y contrasenas se restauran vacios.
- Se muestran los mensajes utiles del backend y se permite solicitar un nuevo
  codigo desde el segundo paso.
- El drawer de Favoritos usa el alto del viewport, scroll interno y padding
  suficiente; en movil las cards pasan a una sola columna.

Archivos modificados:

- `src/app/App.jsx`.
- `src/components/auth/AuthDialog.jsx`.
- `src/components/auth/AuthDialog.module.css`.
- `src/components/favorites/FavoritesDrawer.module.css`.
- `src/services/authService.js`.
- `src/utils/authFlow.js`.
- `CONTEXTO_CONTINUACION.md`.
- `REGISTRO_CAMBIOS_CONTINUOS.md`.

Verificacion:

- `npm run build`: correcto; Vite transformo 1643 modulos.
- Chrome headless a 320 px: payloads de login y recuperacion comprobados,
  secretos vacios tras recargar y Favoritos sin desbordamiento horizontal ni
  botones recortados.
