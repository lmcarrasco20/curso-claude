# Plan: Códigos de descuentos

## Metadatos

- **Issue**: #8
- **Título**: Códigos de descuentos
- **Fecha**: 2026-11-17
- **Estado**: borrador
- **Rama sugerida**: `feature/8-codigos-de-descuento`

## Objetivo y alcance

**Objetivo**: que el administrador de un restaurante gestione códigos de descuento y la equivalencia entre puntos y euros de descuento, y que el cliente pueda aplicar un código y/o canjear sus puntos al pedir la cuenta.

**Dentro del alcance**:

- API: CRUD de códigos de descuento por restaurante (admin y gerente).
- API: CRUD de equivalencias puntos → descuento por restaurante (admin) y consulta para el cliente.
- API: acción "pedir la cuenta" de un pedido, que calcula el total aplicando código y/o canje de puntos, descuenta los puntos y guarda la cuenta.
- web-admin: pantallas de códigos de descuento y de equivalencias de puntos.
- web-clientes: "Pedir la cuenta" en el detalle del pedido con campo de código y selección de canje de puntos.
- Seed, OpenAPI y modelo de datos.

**Fuera del alcance**:

- Pago real: "pedir la cuenta" no cobra nada, solo calcula y registra el total.
- Límites de uso, fechas de caducidad o códigos de un solo uso.
- Descuentos por categoría de plato o por restaurante distinto al del pedido.
- Notificar a los empleados de que se ha pedido la cuenta.

## Contexto

- Depende del sistema de puntos ya implementado (issue "Implementar sistema de puntos"): `PointsService`, tablas `points_rules` y `points_transactions` (puntos ganados, `order_id` único) y `calculateOrderTotal` en `models/points.model.ts`.
- Capas de la API: `models`, `repositories` (interfaz + SQLite en el mismo archivo, mocks en `mocks/`), `services`, `controllers`, `routes` con `Router({ mergeParams: true })` para `/restaurants/:restaurantId/...`; `errorHandler` traduce errores de dominio por nombre.
- Las tablas se crean con `CREATE TABLE IF NOT EXISTS` en `Database.runInitialMigrations()`. Añadir columnas no afecta a una base ya creada, por lo que los cambios se hacen con tablas nuevas.
- No existe el concepto de "cuenta" ni de pago: `orders` solo tiene `id`, restaurante, mesa, cliente y fecha. Los pedidos de cliente se consultan en `GET /orders/mine` y `GET /orders/:id`.
- web-clientes tiene el detalle de pedido en `features/orders/order-detail.component.ts` y servicios en `core/services/`. web-admin sigue `features/<feature>/{models,pages,services,store}` y un menú lateral en `core/layout/shell.component.html`.
- El proyecto no tiene tests de frontend; los de la API son unitarios con mocks, y los repositorios SQLite se prueban con una base en memoria.
- `docs/api/openapi.json` tiene un test que exige documentar todos los endpoints.

## Tareas

Cada tarea dura 5-10 minutos e incluye su test (TDD) y el código mínimo para que pase. Las tareas de frontend no tienen test automático: se verifican con `ng build` y comprobación en el navegador.

- [x] **1. Modelo de código de descuento**
  - Test: `packages/api/src/models/discount.model.test.ts`: `normalizeDiscountCode` pasa a mayúsculas, recorta y rechaza vacíos o con espacios; `validateDiscountInput` exige tipo `porcentaje` (1-100) o `importe` (mayor que 0); `calculateCodeDiscount` aplica porcentaje o importe fijo sin superar el total.
  - Código: `packages/api/src/models/discount.model.ts` y errores `InvalidDiscountError`, `DiscountCodeNotFoundError`, `DuplicatedDiscountCodeError`, `InvalidDiscountCodeError` en `errors/DomainErrors.ts`.
- [x] **2. Repositorio de códigos de descuento**
  - Test: `packages/api/src/repositories/discount.repository.test.ts` (base en memoria): guardar, buscar por id y por código dentro del restaurante, listar, actualizar y eliminar; el código es único por restaurante.
  - Código: tabla `discount_codes` en `config/database.ts`, `repositories/discount.repository.ts` (`DiscountRepository` y `SqliteDiscountRepository`) y `mocks/MockDiscountRepository.ts`.
- [x] **3. Servicio de códigos de descuento**
  - Test: `packages/api/src/services/discount.service.test.ts` con mock: crear (código en mayúsculas, activo por defecto), rechazar código duplicado, listar, obtener (404), actualizar, eliminar y `findUsableByCode` (error si no existe o está inactivo).
  - Código: `packages/api/src/services/discount.service.ts`.
- [x] **4. Equivalencias puntos → descuento: modelo y repositorio**
  - Test: `packages/api/src/models/points-redemption.model.test.ts` (validación: puntos enteros positivos, descuento mayor que 0) y `packages/api/src/repositories/points-redemption.repository.test.ts` (CRUD y puntos únicos por restaurante).
  - Código: `models/points-redemption.model.ts`, tabla `points_rewards` (id, restaurante, puntos, descuento en euros), `repositories/points-redemption.repository.ts` y su mock.
- [x] **5. Equivalencias puntos → descuento: servicio**
  - Test: `packages/api/src/services/points-reward.service.test.ts`: crear, rechazar puntos duplicados en el restaurante, listar ordenado por puntos, actualizar y eliminar.
  - Código: `packages/api/src/services/points-reward.service.ts`.
- [x] **6. Canje de puntos: saldo y registro**
  - Test: ampliar `points.service.test.ts` y `points.repository.test.ts`: el saldo es lo ganado menos lo canjeado; `redeem` descuenta puntos una sola vez por pedido y falla si no hay saldo suficiente (`InsufficientPointsError`).
  - Código: tabla `points_redemptions` (único por pedido), métodos `addRedeemed` y `getBalance` actualizado en `PointsRepository`/`SqlitePointsRepository`/mock y `redeem` en `PointsService`.
- [x] **7. Cálculo de la cuenta**
  - Test: `packages/api/src/models/bill.model.test.ts`: `calculateBill` devuelve subtotal, descuento del código, descuento por puntos y total; los descuentos se aplican en ese orden, el total nunca es negativo y el descuento por puntos se limita al importe restante.
  - Código: `packages/api/src/models/bill.model.ts`.
- [x] **8. Servicio "pedir la cuenta"**
  - Test: `packages/api/src/services/bill.service.test.ts` con mocks: solo el cliente dueño del pedido puede pedirla, no se puede pedir dos veces, aplica un código válido, rechaza un código inexistente o inactivo, canjea puntos de una equivalencia si hay saldo y rechaza si no, y devuelve la cuenta guardada.
  - Código: tabla `bills`, `repositories/bill.repository.ts` y su mock, `services/bill.service.ts`; errores `BillAlreadyRequestedError` y `OrderNotOwnedError`.
- [x] **9. Controllers y rutas**
  - Test: ampliar `errorHandler.test.ts` con los códigos HTTP de los errores nuevos (404, 409, 403 y 400) y verificar el flujo con la API en marcha.
  - Código: `controllers/discount.controller.ts`, `points-reward.controller.ts` y `bill.controller.ts`; rutas `/restaurants/:restaurantId/discount-codes` (admin y gerente), `/restaurants/:restaurantId/points-rewards` (CRUD admin; listado también para clientes) y `POST /orders/:id/bill`; cableado en `app.ts` y `order.routes.ts`.
- [x] **10. Seed, OpenAPI y modelo de datos**
  - Test: `packages/api/src/openapi.test.ts` actualizado con los endpoints nuevos (falla hasta documentarlos).
  - Código: códigos y equivalencias de ejemplo en `scripts/seed.ts`, endpoints y esquemas en `docs/api/openapi.json` y tablas en `docs/dominio/modelo-datos.md`.
- [x] **11. web-admin: códigos de descuento (servicio, store y listado)**
  - Test: sin test automático; `ng build` y comprobación en el navegador.
  - Código: `features/discounts/` en `packages/web-admin` con modelo, servicio, store y `pages/discount-list`, ruta y enlace "Descuentos" en el menú del restaurante.
- [x] **12. web-admin: formulario de código de descuento**
  - Test: sin test automático; `ng build` y prueba de crear, editar y borrar.
  - Código: `pages/discount-form` con etiquetas asociadas, validación y errores accesibles; rutas `new` y `:id/edit`.
- [ ] **13. web-admin: equivalencias de puntos**
  - Test: sin test automático; `ng build` y prueba de crear, editar y borrar.
  - Código: `features/points-rewards/` con servicio, store y una página con listado y formulario integrado ("X puntos = Y € de descuento"), ruta y enlace "Puntos" en el menú.
- [ ] **14. web-clientes: pedir la cuenta**
  - Test: sin test automático; `ng build` y prueba de extremo a extremo (código, canje de puntos, cuenta final).
  - Código: `core/services/bill.service.ts`, `core/models/bill.model.ts` y, en `order-detail.component.ts`, el bloque "Pedir la cuenta" con campo de código, selector de canje de puntos con el saldo del cliente, mensaje de error y resumen de la cuenta (subtotal, descuentos y total).

## Criterios de aceptación

- [ ] El administrador (y el gerente) crea, edita, lista y borra códigos de descuento de su restaurante; el código es único por restaurante y puede ser un porcentaje o un importe fijo.
- [ ] El administrador define y edita equivalencias entre puntos y euros de descuento (por ejemplo, 10 puntos = 1 €, 100 puntos = 10 €).
- [ ] Al pedir la cuenta, el cliente puede aplicar un código válido y/o canjear puntos; el total mostrado coincide con el calculado por la API y nunca es negativo.
- [ ] Un código inexistente o inactivo se rechaza con un mensaje claro, y no se puede canjear más puntos de los que tiene el cliente.
- [ ] Los puntos canjeados se descuentan del saldo del cliente una sola vez, y la cuenta de un pedido no se puede pedir dos veces.
- [ ] Solo el cliente dueño del pedido puede pedir su cuenta.
- [ ] El documento OpenAPI y el modelo de datos recogen los cambios.
- [ ] Todas las tareas están completadas
- [ ] `npm test` pasa en verde

## Dudas abiertas

Ninguna

## Decisiones tomadas

1. **Tipos de código**: `porcentaje` (1-100) e `importe` (euros fijos). El issue no concreta el tipo; se admiten ambos porque cubren los casos habituales.
2. **Orden de aplicación**: primero el código y después el canje de puntos sobre el importe restante, con un máximo de un código y una equivalencia por cuenta.
3. **Puntos ganados sobre el subtotal**: los puntos de un pedido se siguen calculando sobre el importe de los platos (sin descuentos), porque se conceden al entregar y la cuenta puede pedirse después.
4. **"Pedir la cuenta" no exige que todo esté entregado**: el cliente puede pedirla cuando quiera. Corrígeme si debe exigirse.
5. **Tablas nuevas en lugar de columnas nuevas** (`points_redemptions`, `bills`...) porque `CREATE TABLE IF NOT EXISTS` no altera bases ya creadas.
6. **Quién gestiona qué**: códigos de descuento por `admin` y `manager`; equivalencias de puntos solo por `admin` (como la regla de puntos); los clientes solo las consultan.
7. **Una cuenta por pedido**: una vez pedida no se puede cambiar, para evitar canjear puntos varias veces.
