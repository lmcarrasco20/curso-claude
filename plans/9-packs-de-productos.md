# Plan: Packs de productos

## Metadatos

- **Issue**: #9
- **Título**: Packs de productos
- **Fecha**: 2026-11-17
- **Estado**: borrador
- **Rama sugerida**: `feature/9-packs-de-productos`

## Objetivo y alcance

**Objetivo**: que el administrador cree packs con precio cerrado formados por huecos de categoría (entrante, principal, bebida...), pudiendo bloquear platos concretos, y que el cliente pida un pack eligiendo qué plato quiere en cada hueco.

**Dentro del alcance**:

- API: CRUD de packs por restaurante (admin y gerente), listado público de packs disponibles, y pedidos que incluyen packs con la elección del cliente.
- Los platos elegidos se convierten en items normales del pedido (cada uno con su estado), de modo que cocina y barra los preparan como siempre.
- El total del pedido (y por tanto los puntos) cuenta el precio del pack una vez y no el de los platos que lo componen.
- web-admin: listado y formulario de packs con editor de huecos y platos bloqueados.
- web-clientes: sección de packs en la carta, selección de platos del pack y packs en el carrito y en el pedido.
- Seed, OpenAPI y modelo de datos.

**Fuera del alcance**:

- Packs con vigencia o con descuentos por porcentaje (el precio es fijo).
- Elegir varias unidades distintas del mismo hueco.
- Packs que mezclen restaurantes.
- Cambiar el contenido de un pack ya pedido.

## Contexto

- Capas de la API: `models` (interfaces y funciones de validación), `repositories` (interfaz + SQLite en el mismo archivo, mocks en `mocks/`), `services`, `controllers` y `routes` con `Router({ mergeParams: true })`. Los platos (`dish`) son el ejemplo más cercano: tienen una relación hija (`dish_ingredients`) y su repositorio guarda entidad e hijos juntos.
- Un pedido se crea con `OrderService.create`, que expande `quantity: n` en `n` filas de `order_items` de cantidad 1. Cada item guarda `dishId`, notas y estado; el repositorio añade nombre, precio y categoría del plato al leerlo.
- `calculateOrderTotal` (en `models/points.model.ts`) suma `dishPrice × cantidad` de todos los items; los puntos se calculan sobre ese total al quedar el pedido entregado.
- La categoría de un plato es `entrante`, `principal`, `postre` o `bebida`. Las tablas se crean con `CREATE TABLE IF NOT EXISTS`; añadir columnas no afecta a bases ya creadas, así que los datos nuevos van en tablas nuevas.
- La carta pública está en `/public/restaurants/:restaurantId/dishes`. web-clientes muestra la carta en `features/menu/restaurant-menu.component.ts`, y su `CartStore` es el único store (local, sin HTTP). web-admin sigue `features/<feature>/{models,pages,services,store}`.
- El proyecto no tiene tests de frontend; los repositorios SQLite se prueban con una base en memoria y `docs/api/openapi.json` tiene un test que exige documentar todos los endpoints.

## Tareas

Cada tarea dura 5-10 minutos e incluye su test (TDD) y el código mínimo para que pase. Las tareas de frontend no tienen test automático: se verifican con `ng build` y comprobación en el navegador.

- [x] **1. Modelo de pack y validación**
  - Test: `packages/api/src/models/pack.model.test.ts`: `validatePackInput` exige nombre, precio mayor que 0 y al menos un hueco; cada hueco tiene una categoría válida; los platos bloqueados se limpian de duplicados.
  - Código: `packages/api/src/models/pack.model.ts` con las interfaces `Pack` y `PackSlot` y errores `InvalidPackError` y `PackNotFoundError` en `errors/DomainErrors.ts`.
- [ ] **2. Repositorio de packs**
  - Test: `packages/api/src/repositories/pack.repository.test.ts` (base en memoria): guardar un pack con huecos y platos bloqueados, buscarlo por id con sus huecos, listar por restaurante, actualizar sustituyendo huecos y eliminar en cascada.
  - Código: tablas `packs`, `pack_slots` y `pack_slot_exclusions` en `config/database.ts`, `repositories/pack.repository.ts` (`PackRepository` y `SqlitePackRepository`) y `mocks/MockPackRepository.ts`.
- [ ] **3. Servicio de packs**
  - Test: `packages/api/src/services/pack.service.test.ts` con mock: crear, listar, obtener (404), actualizar, eliminar y listar solo los disponibles de un restaurante.
  - Código: `packages/api/src/services/pack.service.ts`.
- [ ] **4. Validar la elección del cliente**
  - Test: `packages/api/src/models/pack-selection.test.ts`: `validatePackSelection` acepta una elección por hueco con platos de la categoría correcta, disponibles y del mismo restaurante; rechaza huecos sin elegir, huecos repetidos, categoría equivocada, plato bloqueado y plato no disponible.
  - Código: función `validatePackSelection` en `models/pack.model.ts` y error `InvalidPackSelectionError`.
- [ ] **5. Crear pedidos con packs**
  - Test: ampliar `order.service.test.ts`: un pedido con un pack genera un item por plato elegido (cada uno `pendiente`), registra el pack con su precio, `quantity: 2` crea dos packs y se rechaza un pack no disponible o con una elección inválida.
  - Código: `OrderService.create` acepta `packs: [{ packId, quantity, selections: [{ slotId, dishId }] }]`; el servicio recibe `PackService` y `DishService` como dependencias opcionales; modelo `OrderPack` en `order.model.ts`.
- [ ] **6. Guardar y leer los packs de un pedido**
  - Test: `packages/api/src/repositories/order.repository.test.ts` (base en memoria): un pedido con packs se guarda y se lee con `packs` e items marcados con `orderPackId`, tanto por id como en activos y por cliente.
  - Código: tablas `order_packs` y `order_pack_items` en `config/database.ts` y soporte en `SqliteOrderRepository` y `MockOrderRepository`.
- [ ] **7. Total del pedido con packs**
  - Test: ampliar `points.model.test.ts`: `calculateOrderTotal` cuenta el precio de cada pack una vez y no suma el precio de los platos que pertenecen a un pack.
  - Código: `calculateOrderTotal` en `models/points.model.ts`.
- [ ] **8. Controllers, rutas y errores**
  - Test: ampliar `errorHandler.test.ts` con los códigos HTTP de los errores nuevos y verificar el flujo con la API en marcha (crear pack, listarlo público, pedirlo).
  - Código: `controllers/pack.controller.ts` y `routes/pack.routes.ts` (CRUD `admin` y `manager`), listado público en `/public/restaurants/:restaurantId/packs`, cuerpo del pedido con `packs` en `OrderController`, cableado en `app.ts` y `order.routes.ts`.
- [ ] **9. Seed, OpenAPI y modelo de datos**
  - Test: `packages/api/src/openapi.test.ts` actualizado con los endpoints nuevos (falla hasta documentarlos).
  - Código: un pack de ejemplo por restaurante en `scripts/seed.ts` (con una bebida bloqueada), endpoints y esquemas en `docs/api/openapi.json` y tablas en `docs/dominio/modelo-datos.md`.
- [ ] **10. web-admin: servicio, store y listado de packs**
  - Test: sin test automático; `ng build` y comprobación en el navegador.
  - Código: `features/packs/` en `packages/web-admin` con modelo, servicio, store y `pages/pack-list`, ruta y enlace "Packs" en el menú del restaurante.
- [ ] **11. web-admin: formulario de pack con huecos**
  - Test: sin test automático; `ng build` y prueba de crear un pack de entrante + principal + bebida con la cerveza bloqueada.
  - Código: `pages/pack-form` con nombre, descripción, precio, disponibilidad, editor de huecos (añadir y quitar por categoría) y casillas para bloquear platos de esa categoría; etiquetas asociadas y errores accesibles; rutas `new` y `:id/edit`.
- [ ] **12. web-clientes: packs en la carta**
  - Test: sin test automático; `ng build` y comprobación en el navegador.
  - Código: `core/models/pack.model.ts`, `core/services/pack.service.ts` y sección "Packs" en `restaurant-menu.component.ts` con nombre, precio y composición de cada pack.
- [ ] **13. web-clientes: elegir y pedir un pack**
  - Test: sin test automático; `ng build` y prueba de extremo a extremo (pedido con pack visible en cocina y barra, y con el total correcto).
  - Código: diálogo de selección de platos por hueco (solo platos permitidos), `CartStore` con líneas de pack, carrito que las muestra con su precio y `OrderService.createOrder` enviando `packs`; el detalle de pedido agrupa los platos del pack.

## Criterios de aceptación

- [ ] El administrador (y el gerente) crea, edita, lista y borra packs con nombre, precio fijo y huecos por categoría, y puede bloquear platos concretos dentro de cada hueco.
- [ ] El cliente ve los packs disponibles en la carta y, al elegir uno, tiene que escoger un plato por hueco sin poder elegir los bloqueados.
- [ ] La API rechaza una elección incompleta, con un plato de otra categoría, bloqueado o no disponible.
- [ ] El pedido con un pack genera un item por cada plato elegido, que cocina y barra gestionan igual que cualquier otro item.
- [ ] El total del pedido cuenta el precio del pack una sola vez y los puntos se calculan con ese total.
- [ ] El documento OpenAPI y el modelo de datos recogen los packs.
- [ ] Todas las tareas están completadas
- [ ] `npm test` pasa en verde

## Dudas abiertas

Ninguna

## Decisiones tomadas

1. **Huecos con lista de exclusión**: cada hueco es una categoría más una lista de platos bloqueados (el issue habla de "bloquear la cerveza"). Así los platos nuevos de esa categoría entran en el pack sin tocarlo.
2. **Un plato por hueco**: cada hueco se resuelve con una única elección. Si se quiere pedir dos bebidas, el pack define dos huecos de bebida.
3. **Tablas nuevas** (`packs`, `pack_slots`, `pack_slot_exclusions`, `order_packs`, `order_pack_items`) en lugar de añadir columnas a `order_items`, porque `CREATE TABLE IF NOT EXISTS` no altera bases ya creadas.
4. **Precio del pack guardado en el pedido**: `order_packs` guarda nombre y precio en el momento de pedir, para que editar el pack después no cambie pedidos pasados.
5. **Quién gestiona packs**: `admin` y `manager`, igual que los platos. La lectura pública devuelve solo packs disponibles.
6. **Cocina y barra no cambian**: los platos del pack son items normales y siguen su flujo y permisos por categoría.
