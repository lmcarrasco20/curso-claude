# Plan: Gestión de mesas

## Metadatos

- **Issue**: #5
- **Título**: Gestión de mesas
- **Fecha**: 2026-11-17
- **Estado**: borrador
- **Rama sugerida**: `feature/5-gestion-de-mesas`

## Objetivo y alcance

**Objetivo**: permitir que el administrador gestione las mesas de cada restaurante, que los empleados vean y cambien su estado junto con los pedidos de las mesas ocupadas, y que el cliente elija mesa (según el número de comensales) antes de ver la carta y pedir.

**Dentro del alcance**:

- API: entidad mesa con CRUD (admin), cambio de estado (empleados), listado de mesas libres filtrado por capacidad (público) y ocupación de una mesa por el cliente.
- API: los pedidos muestran el número de mesa en lugar de su identificador.
- web-admin: CRUD de mesas dentro de cada restaurante.
- web-empleados: página de mesas con estado editable y estado de los pedidos de las mesas ocupadas.
- web-clientes: paso de elección de mesa (comensales → mesas disponibles → continuar) antes de la carta; el pedido se envía con la mesa elegida.
- Seed con mesas de ejemplo, documentación OpenAPI y modelo de datos.

**Fuera del alcance**:

- Reservas con fecha y hora (el estado `reservada` solo se asigna a mano).
- Liberación automática de la mesa al terminar el pedido o por tiempo.
- Unir varias mesas para grupos grandes.
- Tests de frontend (el proyecto no tiene infraestructura para ellos).

## Contexto

- La API sigue la arquitectura por capas para dominios que no son `employee` (`models`, `repositories`, `services`, `controllers`, `routes`). Las mesas encajan en ese estilo, igual que `ingredient`: modelo con funciones de validación, repositorio con interfaz e implementación SQLite en el mismo archivo, servicio, controller y router con `Router({ mergeParams: true })` bajo `/restaurants/:restaurantId/tables`.
- Los `Error` de dominio extienden `AppError` y `errorHandler` los traduce por nombre a 404, 401 o 400 por defecto. Hará falta un 409 para "mesa no disponible".
- Las tablas se crean en `Database.runInitialMigrations()` con `CREATE TABLE IF NOT EXISTS`; una base ya creada obtiene la tabla nueva sin borrarla. `NODE_ENV=test` usa `:memory:`.
- `orders.table_id` ya existe y `Order.tableId` se guarda, pero siempre es `null` porque web-clientes envía `tableId: null`. Las pantallas de empleados muestran `Mesa {{ order.tableId }}`, que con un UUID no sirve.
- El seed borra todas las tablas antes de rellenarlas (`reset-db.ts` lee `sqlite_master`, así que incluirá la tabla nueva sola). Los restaurantes de prueba son `rest-1` y `rest-2`.
- web-admin y web-empleados siguen `features/<feature>/{models,pages,services,store}` con stores `providedIn: 'root'`, signals y `firstValueFrom`. web-clientes centraliza modelos y servicios en `core/` y sus componentes llaman a los servicios directamente. `CartStore` es el único store.
- Los tests de la API son unitarios, colocados junto al código, con mocks en `mocks/`. No hay tests HTTP ni de frontend. Los repositorios SQLite se prueban con una base en memoria.
- `OrderController` no usa `errorHandler`; los controladores nuevos sí (`next(error)`).
- El documento `docs/api/openapi.json` tiene un test que exige que todos los endpoints estén documentados.

## Tareas

Cada tarea dura 5-10 minutos e incluye su test (TDD) y el código mínimo para que pase. Las tareas de frontend no tienen test automático: se verifican con `ng build` y se indica en cada una.

- [x] **1. Modelo de mesa y validaciones**
  - Test: `packages/api/src/models/table.model.test.ts`: `normalizeTableStatus` acepta libre, ocupada y reservada (sin distinguir mayúsculas) y rechaza otros valores; `validateTableInput` exige número entero positivo, capacidad entera positiva y limpia la descripción.
  - Código: `packages/api/src/models/table.model.ts` con la interfaz `RestaurantTable`, `normalizeTableStatus` y `validateTableInput`; errores `InvalidTableError`, `InvalidTableStatusError`, `TableNotFoundError`, `DuplicatedTableNumberError` y `TableNotAvailableError` en `errors/DomainErrors.ts`.
- [x] **2. Repositorio SQLite de mesas**
  - Test: `packages/api/src/repositories/table.repository.test.ts` (base en memoria): guardar y buscar por id, listar por restaurante ordenado por número, actualizar, eliminar, buscar por número dentro del restaurante y actualizar solo el estado.
  - Código: tabla `restaurant_tables` en `config/database.ts` (número único por restaurante) y `packages/api/src/repositories/table.repository.ts` con la interfaz `TableRepository` y `SqliteTableRepository`; `repositories/mocks/MockTableRepository.ts`.
- [x] **3. Servicio: CRUD de mesas**
  - Test: `packages/api/src/services/table.service.test.ts` con el repositorio mock: crear con estado inicial `libre`, rechazar número duplicado en el mismo restaurante (y permitirlo en otro), listar, obtener (404 si no existe o es de otro restaurante), actualizar y eliminar.
  - Código: `packages/api/src/services/table.service.ts` con `create`, `findByRestaurantId`, `findById`, `update` y `delete`.
- [x] **4. Servicio: estados, mesas disponibles y ocupación**
  - Test: en `table.service.test.ts`: `changeStatus` valida el estado; `findAvailable` devuelve solo mesas libres con capacidad mayor o igual a los comensales, ordenadas por capacidad y número; `occupy` pasa una mesa libre a ocupada y lanza `TableNotAvailableError` si no está libre.
  - Código: métodos `changeStatus`, `findAvailable` y `occupy` en el servicio.
- [x] **5. Controller, rutas y cableado HTTP**
  - Test: no hay tests HTTP en el proyecto. Se añade un test del mapeo de errores a códigos HTTP en `packages/api/src/contexts/shared/infrastructure/http/errorHandler.test.ts` (404 para `TableNotFoundError`, 409 para `TableNotAvailableError` y `DuplicatedTableNumberError`, 400 para el resto) y se verifica el flujo con la API en marcha.
  - Código: `controllers/table.controller.ts`, `routes/table.routes.ts` (CRUD admin; listado y cambio de estado para empleados; `occupy` para usuarios autenticados) y `routes/table.public.routes.ts` (mesas libres por capacidad), montados en `app.ts`; `errorHandler` con 409 y el 404 nuevo.
- [x] **6. Número de mesa en los pedidos**
  - Test: ampliar `packages/api/src/repositories/order.repository.test.ts` (o crearlo con base en memoria): un pedido con `tableId` devuelve `tableNumber` al consultarlo por id, por pedidos activos y por cliente.
  - Código: `LEFT JOIN restaurant_tables` en `SqliteOrderRepository` y campo opcional `tableNumber` en `Order`.
- [x] **7. Seed, OpenAPI y modelo de datos**
  - Test: `packages/api/src/openapi.test.ts` actualizado con los nuevos endpoints (falla hasta documentarlos).
  - Código: mesas de ejemplo en `scripts/seed.ts` para `rest-1` y `rest-2`; endpoints y esquemas en `docs/api/openapi.json`; tabla `restaurant_tables` en `docs/dominio/modelo-datos.md`.
- [ ] **8. web-admin: servicio y store de mesas**
  - Test: sin test automático; se verifica compilando (`ng build`).
  - Código: `features/tables/models/table.model.ts`, `services/table.service.ts` y `store/table.store.ts` (signals, loading y error, `firstValueFrom`) en `packages/web-admin`.
- [ ] **9. web-admin: listado de mesas y enlace en el menú**
  - Test: sin test automático; `ng build` y comprobación en el navegador.
  - Código: `pages/table-list/table-list.component.*` con la tabla de mesas, borrado con confirmación y la recarga al cambiar de restaurante (escuchando `paramMap`), `tables.routes.ts`, ruta `tables` en `app.routes.ts` y enlace "Mesas" en el menú lateral de `shell.component.html` (icono registrado en `app.config.ts`).
- [ ] **10. web-admin: formulario de mesa**
  - Test: sin test automático; `ng build` y prueba creando, editando y borrando una mesa.
  - Código: `pages/table-form/table-form.component.*` (número, descripción, capacidad y estado) con etiquetas asociadas, validación y errores accesibles, rutas `tables/new` y `tables/:id/edit`.
- [ ] **11. web-empleados: página de mesas**
  - Test: sin test automático; `ng build` y prueba con camarero y gerente.
  - Código: `features/tables/` (modelo, servicio, store con sondeo cada 30 s, como `OrderStore`) y `pages/mesas/mesas.component.*` con las mesas, un selector para cambiar su estado y, en las ocupadas, los pedidos activos con el estado de cada item; ruta `mesas` con `roleGuard(['camarero', 'manager'])` y enlace en el menú. Las pantallas de cocina, barra y salón pasan a mostrar `tableNumber`.
- [ ] **12. web-clientes: elegir mesa antes de la carta**
  - Test: sin test automático; `ng build` y prueba del flujo completo.
  - Código: `core/models/table.model.ts`, `core/services/table.service.ts` y `features/tables/table-selection.component.ts` (comensales, mesas disponibles, elegir y continuar); `RestaurantListComponent` enlaza a `/restaurants/:id/tables`; ruta nueva en `app.routes.ts`.
- [ ] **13. web-clientes: pedido con la mesa elegida**
  - Test: sin test automático; `ng build` y prueba de extremo a extremo (pedido con mesa visible en empleados).
  - Código: al continuar se llama a `occupy`, la mesa se guarda en `CartStore` y se navega a la carta; `OrderService.createOrder` envía el `tableId`; la carta y el carrito muestran la mesa y, si no hay mesa elegida, redirigen a la selección.

## Criterios de aceptación

- [ ] El administrador puede crear, editar, listar y borrar mesas de un restaurante, con número, descripción, capacidad y estado (libre, ocupada, reservada); no puede repetir el número dentro de un restaurante.
- [ ] Un camarero o un gerente ve el estado de las mesas, lo cambia, y ve los pedidos de las mesas ocupadas con el estado de sus items.
- [ ] Un cliente indica el número de personas, ve solo mesas libres con capacidad suficiente, elige una y continúa: la mesa pasa a ocupada y llega a la carta.
- [ ] Un cliente no puede ocupar una mesa que ya no está libre (409).
- [ ] El pedido enviado queda asociado a la mesa y las pantallas de empleados muestran el número de mesa.
- [ ] El documento OpenAPI y el modelo de datos recogen las mesas.
- [ ] Todas las tareas están completadas
- [ ] `npm test` pasa en verde

## Dudas abiertas

Ninguna

## Decisiones tomadas

1. **Nombres de campos en inglés** (`number`, `description`, `capacity`, `status`) y valores de estado en español (`libre`, `ocupada`, `reservada`): es la convención del resto de la API (los pedidos usan `pendiente`, `listo`...). Corrígeme si prefieres `numero`, `descripcion` y `capacidad`.
2. **Tabla `restaurant_tables`** en lugar de `tables`, para evitar confundir con la palabra `table` de SQL.
3. **Quién puede qué**: el CRUD es solo de `admin` (como ingredientes). Ver el listado y cambiar el estado lo pueden hacer `admin`, `manager` y `camarero`; el cocinero queda fuera porque no trabaja con mesas. Ocupar una mesa lo puede hacer cualquier usuario autenticado (el cliente).
4. **La mesa no se libera sola**: la libera un empleado desde la página de mesas. Liberarla automáticamente al entregar el pedido queda fuera del alcance porque un cliente puede hacer varios pedidos en la misma mesa.
5. **Mesas disponibles por endpoint público** (`/public/restaurants/:restaurantId/tables?people=N`), siguiendo el patrón de la carta pública, y la ocupación por un endpoint autenticado.
6. **Mostrar el número de mesa** mediante un `LEFT JOIN` en el repositorio de pedidos en lugar de guardar el número en el pedido, para que siga siendo correcto si se edita la mesa.
7. **Un pedido sin mesa sigue siendo válido** (compatibilidad con pedidos existentes y con el flujo actual).
