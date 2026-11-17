---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: [descripción opcional o pista del tipo/scope]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

# Commit con Conventional Commits

Crea un commit de los cambios actuales siguiendo la especificación [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/).

## Contexto

- Estado del repositorio: !`git status --short`
- Cambios en staging: !`git diff --cached`
- Cambios sin stagear: !`git diff`
- Últimos commits (para respetar el estilo): !`git log --oneline -10`

## Indicaciones del usuario

$ARGUMENTS

## Formato del mensaje

```
<tipo>[scope opcional][!]: <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

### Tipos permitidos

- `feat`: nueva funcionalidad (SemVer MINOR)
- `fix`: corrección de un bug (SemVer PATCH)
- `docs`: cambios solo en documentación
- `style`: cambios de formato que no afectan al significado del código
- `refactor`: cambio de código que no corrige un bug ni añade funcionalidad
- `perf`: mejora de rendimiento
- `test`: añadir o corregir tests
- `build`: cambios en el sistema de build o dependencias
- `ci`: cambios en la configuración de CI
- `chore`: tareas de mantenimiento que no modifican `src` ni tests
- `revert`: revierte un commit anterior

### Reglas

1. La descripción va en minúsculas, en imperativo, sin punto final y con un máximo de ~72 caracteres en la primera línea.
2. El `scope` es opcional y va entre paréntesis, indicando la parte afectada (por ejemplo `feat(users):`).
3. El cuerpo va separado de la primera línea por una línea en blanco y explica el *qué* y el *porqué*, no el *cómo*.
4. Un cambio incompatible (breaking change) se marca con `!` tras el tipo/scope (`feat(api)!:`) y/o con un pie `BREAKING CHANGE: <descripción>`.
5. Los pies siguen el formato `Token: valor` (por ejemplo `Refs: #123`, `Closes: #45`).
6. Escribe el mensaje en español, salvo los tokens y tipos, que se mantienen en inglés según la especificación.

## Pasos

1. Analiza los cambios (staging y sin stagear) para entender qué se ha modificado y por qué.
2. Si no hay nada en staging, añade los archivos relevantes con `git add <archivos>` (evita `git add -A` si hay archivos que no pertenecen al cambio, y nunca añadas secretos como `.env`).
3. Si los cambios mezclan varias intenciones distintas, propón dividirlos en varios commits y haz uno por cada intención.
4. Elige el tipo y el scope que mejor describan el cambio, teniendo en cuenta las indicaciones del usuario si las hay.
5. Redacta el mensaje cumpliendo las reglas anteriores.
6. Muestra el mensaje del commit al usuario y pidele que lo confirme con la tool `AskUserQuestion`. Si da el OK, continua con los siguentes pasos, y si no, proponle un nuevo mensaje y vuelve a preguntarle si este nuevo le parece mejor.
7. Crea el commit con `git commit -m "<mensaje>"` (usa varios `-m` o un heredoc si hay cuerpo y pies).
8. Muestra el resultado con `git log -1 --stat`.

## Restricciones

- No hagas `git push`.
- No uses `--amend`, `--no-verify` ni modifiques la configuración de git, salvo que el usuario lo pida explícitamente.
- Si no hay cambios que commitear, avísalo y no crees ningún commit vacío.
- Si falla un hook de pre-commit, corrige el problema y crea un commit nuevo; no lo saltes.
