---
name: implement-plan
description: Implementa un plan de la carpeta "plans" tarea a tarea con TDD estricto, creando la rama del plan a partir de development, haciendo un commit por tarea y marcando tareas y criterios de aceptación en el plan. Úsala cuando el usuario pida implementar, ejecutar o desarrollar un plan.
argument-hint: <ruta del plan, p. ej. plans/42-paginar-listado-vendehumos.md>
---

# Implementar un plan

Implementa el plan que indique el usuario, siguiendo TDD estricto, con un commit por tarea.

## Entrada

`$ARGUMENTS` contiene la ruta del plan (por ejemplo `plans/0-login-registro-usuarios.md`). Si falta, o no existe el archivo, pregúntaselo al usuario con `AskUserQuestion`. No elijas un plan por tu cuenta.

## Antes de empezar

1. Lee el plan completo y `CLAUDE.md` (arquitectura por capas, `;` solo cuando sea necesario, funciones en snake_case, documentación en español), además de los docs que apliquen.
2. Si en `Dudas abiertas` queda alguna sin respuesta, pregúntasela al usuario antes de seguir.
3. Comprueba con `git status` que el árbol de trabajo no tiene cambios que se mezclarían con los commits de las tareas. Si los hay, avisa al usuario y pregunta cómo proceder. No los incluyas en tus commits.

## Paso 1: la rama

1. Obtén el nombre de la rama del plan, en `Metadatos` → `Rama sugerida`. Si no aparece, pregúntaselo al usuario.
2. Comprueba si existe la rama `development` (`git branch --list development` y `git branch -r --list origin/development`).
   - Si no existe, créala a partir de la rama principal: `main` o, si no existe, `master`. Usa `git switch -c development <principal>`.
   - Si existe, cámbiate a ella con `git switch development`.
3. Crea la rama del plan a partir de `development`: `git switch -c <rama>`. Si la rama del plan ya existe, cámbiate a ella y continúa por la primera tarea sin marcar.
4. No hagas push ni crees PR salvo que el usuario lo pida.

## Paso 2: las tareas, de 1 en 1

Recorre las tareas del plan en orden, solo las que sigan sin marcar (`- [ ]`). Para cada una, aplica TDD estricto:

1. **Rojo**: escribe primero el test (el sub-punto `Test` de la tarea). Ejecuta `npm test` y comprueba que **falla** por la razón esperada (la funcionalidad no existe o no cumple), no por un error de sintaxis o de configuración. Si el test sale en verde sin escribir código, el test no sirve: revísalo.
2. **Verde**: escribe el código mínimo (el sub-punto `Código`) para que el test pase. Ejecuta `npm test` y comprueba que todo está en verde, incluidos los tests anteriores.
3. **Refactor** (opcional): limpia lo que haga falta sin romper los tests y vuelve a ejecutar `npm test`.
4. **Marca la tarea** en el plan cambiando `- [ ]` por `- [x]` en esa tarea.
5. **Commit** con la skill `commit` (Conventional Commits), **sin pedir confirmación al usuario**: salta el paso de confirmación de esa skill y haz el commit directamente. El commit incluye juntos los tests, el código y el plan actualizado de esa tarea. Un commit por tarea, nunca varias tareas en un commit.

Reglas:

- Nunca escribas código de producción antes de ver el test en rojo.
- No pases a la siguiente tarea hasta que `npm test` esté en verde y el commit hecho.
- Si una tarea no tiene test posible (por ejemplo, solo documentación), indícalo, haz la tarea, márcala y haz commit igualmente.
- Si el plan es incorrecto o una tarea no se puede hacer como está descrita, para y consulta al usuario en vez de improvisar. Si haces una desviación menor, anótala en `Decisiones tomadas` del plan.
- Respeta las convenciones de `CLAUDE.md` y la arquitectura por capas.

## Paso 3: criterios de aceptación

Cuando todas las tareas estén hechas:

1. Ejecuta `npm test` y comprueba que está en verde.
2. Revisa uno a uno los `Criterios de aceptación` del plan y verifícalos de verdad (con tests, ejecutando la API o leyendo el código), sin darlos por buenos sin comprobar. Marca con `- [x]` solo los que se cumplan.
3. Si algún criterio no se cumple, corrígelo (con TDD si implica código, y un commit) o, si no es posible, déjalo sin marcar y explícale el motivo al usuario.
4. Cambia el `Estado` de los metadatos del plan a `implementado` si todos los criterios están marcados.
5. Haz un último commit con la skill `commit`, también sin pedir confirmación, con los cambios del plan (criterios marcados y estado).

## Al terminar

Resume al usuario: la rama creada, las tareas completadas (con sus commits), el estado de los criterios de aceptación y cualquier desviación o criterio pendiente.
