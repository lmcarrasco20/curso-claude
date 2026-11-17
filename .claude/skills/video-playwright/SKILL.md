---
name: video-playwright
description: Genera con Playwright un vídeo (.webm) que muestra cómo se usa solo con teclado el formulario de platos de web-admin para crear un plato nuevo, incluyendo el error al enviar el formulario incompleto. Úsala cuando el usuario pida un vídeo o demo de la accesibilidad por teclado del formulario de platos.
argument-hint: "[restaurantId (por defecto rest-1)]"
---

# Vídeo Playwright del formulario de platos

Graba un vídeo del formulario de platos (`/restaurants/<restaurantId>/dishes/new`) usado únicamente con el teclado.

## Criterio de aceptación

- [ ] Se genera un vídeo con Playwright en `videos/formulario-platos-teclado.webm`.
- [ ] En el vídeo se ve cómo se crea un plato nuevo usando solo el teclado (Tab, Shift+Tab, flechas, Espacio, Enter...), sin ningún clic de ratón dentro del formulario.
- [ ] En el vídeo se muestra al menos un error de validación al enviar el formulario sin rellenar todos los campos obligatorios.
- [ ] Al final se ve que el plato se ha creado (aparece en el listado).
- [ ] Las teclas pulsadas se ven en pantalla (rótulo superpuesto) para que se entienda el recorrido.

## Pasos

1. **Comprueba los requisitos.** Hace falta la API (`:3000`), web-admin (`:4200`) y datos de seed. Si no están, pregunta antes de arrancar nada y usa `npm run seed`, `npm run dev:api` y `npm run dev:admin` desde la raíz (en segundo plano). Credenciales: `admin@resttek.com` / `admin@resttek.com`.
2. **Instala Playwright sin tocar `package.json`:** `npm install --no-save playwright` en la raíz. No hace falta descargar navegadores si hay Edge o Chrome instalado: el script los usa (`msedge`, luego `chrome`) y solo si no hay ninguno recurre al Chromium de Playwright (`npx playwright install chromium`). Para grabar vídeo Playwright necesita ffmpeg: ejecuta `npx playwright install ffmpeg` (descarga pequeña, no afecta al sistema).
3. **Ejecuta el script** [assets/record-dish-form.mjs](assets/record-dish-form.mjs) desde la raíz del repo:
   `node .claude/skills/video-playwright/assets/record-dish-form.mjs [restaurantId]`
4. **Verifica el resultado:** que el comando termina bien, que existe el vídeo y que no está vacío. El script imprime cada paso y comprueba que el error aparece y que el plato nuevo está en el listado; si falla, corrige y repite en lugar de dar el vídeo por bueno.
5. **Informa al usuario** de la ruta del vídeo, de qué se ve en él y de que ha quedado creado en la base de datos el plato "Plato demo teclado". Ofrece borrarlo; no lo borres sin preguntar.

## Guion que sigue el script

1. Login por API (guarda el token en `localStorage`) y apertura del formulario de nuevo plato.
2. Foco en el título y `Tab` hasta el primer campo.
3. `Tab` hasta **Guardar** y `Enter` con el formulario vacío: aparecen los errores de nombre y precio y el foco salta al primer campo inválido.
4. Rellena nombre, precio (`Tab`), categoría (flechas), disponible y descripción.
5. Añade un ingrediente con el selector (flechas), la cantidad y `Enter`; y otro con `Espacio` sobre el botón "Añadir ingrediente".
6. `Tab` hasta **Guardar** y `Enter`: vuelve al listado con el plato nuevo.

## Notas

- Si el formulario cambia (orden de campos, etiquetas), actualiza el script.
- Los vídeos son artefactos: no los commitees salvo que el usuario lo pida.
