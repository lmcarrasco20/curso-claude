---
name: plan-feature
description: Genera un plan de implementación en markdown dentro de la carpeta "plans", a partir de la plantilla de la skill. Úsala cuando el usuario pida planificar una feature, issue o cambio antes de implementarlo.
argument-hint: <num_issue> <descripción de la feature>
---

# Plan de feature

Genera un plan de implementación en markdown siguiendo la plantilla [assets/plan-template.md](assets/plan-template.md).

## Entrada

`$ARGUMENTS` contiene el número de issue y una descripción de la feature. Si falta el número de issue, pregúntaselo al usuario con `AskUserQuestion`. No lo inventes.

## Pasos

1. Lee la plantilla [assets/plan-template.md](assets/plan-template.md). Es la fuente de verdad del formato y la estructura.
2. Explora el código relevante (rutas, controllers, services, repositories, tests) y lee `CLAUDE.md` y los docs que apliquen (por ejemplo `docs/api/api-pagination.md` si la feature pagina un endpoint), para que el plan respete la arquitectura y las convenciones del proyecto.
3. Calcula el nombre del archivo: `plans/<num_issue>-<breve-descripcion>.md`.
   - `<breve-descripcion>` en kebab-case, minúsculas, sin tildes ni caracteres especiales, de 2 a 5 palabras.
   - Ejemplo: `plans/42-paginar-listado-vendehumos.md`.
   - Crea la carpeta `plans` si no existe. Si el archivo ya existe, no lo sobrescribas sin preguntar.
4. Rellena la plantilla y escribe el plan en español, con todas estas secciones y en este orden:
   - **Metadatos**: issue, título, fecha, estado (`borrador`) y rama sugerida.
   - **Objetivo y alcance**: qué se consigue, qué entra y qué queda fuera.
   - **Contexto**: estado actual del código, archivos afectados y restricciones relevantes.
   - **Tareas**: lista con checkboxes (`- [ ]`).
   - **Criterios de aceptación**: lista con checkboxes (`- [ ]`) que indican cuándo el plan está terminado.
   - **Dudas abiertas**: preguntas para que el usuario las conteste.
   - **Decisiones tomadas**: decisiones que has tomado por tu cuenta, con su motivo, para que el usuario pueda corregirlas.
5. Al terminar, indica al usuario la ruta del plan y resume las dudas abiertas y las decisiones tomadas. No implementes nada.
6. Avisa por Slack: publica un mensaje en el canal `curso-claude` (ID `C0CHB9C0CGK`) con la herramienta `mcp__slack__slack_post_message` (si es diferido, cárgala antes con `ToolSearch`). El mensaje, en español y breve, indica que el plan está listo, su ruta, el número de issue y cuántas dudas abiertas y decisiones tomadas tiene. Si no se encuentra el canal por ese ID, búscalo por nombre con `mcp__slack__slack_list_channels`. Si el envío falla, díselo al usuario; no reintentes en bucle.

## Reglas para las tareas

- Cada tarea debe poder hacerse en 5-10 minutos. Si es más grande, divídela.
- Cada tarea incluye los tests (TDD) y el código mínimo para que pasen: primero el test que falla, después la implementación.
- Respeta la arquitectura por capas del proyecto (controllers, services, repositories) y ordena las tareas de forma que cada una deje los tests en verde.
- Formato de tarea: título breve, y debajo los sub-puntos `Test` y `Código`, con los archivos implicados.
- Los tests se ejecutan con `npm test`.

## Reglas para los criterios de aceptación

- Deben ser verificables (observables o comprobables), no vagos.
- Incluye siempre: todas las tareas completadas y `npm test` en verde.

## Reglas para dudas y decisiones

- Una duda es algo que no se puede resolver con el código ni con las instrucciones, y que cambia el plan. Formúlala como pregunta con un espacio `Respuesta:` vacío.
- Una decisión es una elección que has hecho tú ante una ambigüedad menor. Indica la decisión y por qué, para que el usuario pueda corregirla.
- Si no hay dudas o decisiones, escribe `Ninguna` en la sección.
