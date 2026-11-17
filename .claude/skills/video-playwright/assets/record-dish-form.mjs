// Graba un vídeo del formulario de platos usado solo con teclado.
// Uso (desde la raíz del repo): node record-dish-form.mjs [restaurantId]
import { createRequire } from 'node:module'
import { mkdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(resolve(process.cwd(), 'package.json'))
const { chromium } = require('playwright')

const restaurantId = process.argv[2] ?? 'rest-1'
const ADMIN = 'http://localhost:4200'
const API = 'http://localhost:3000/api/v1'
const DISH_NAME = 'Plato demo teclado'
const OUT_DIR = resolve(process.cwd(), 'videos')
const OUT_FILE = resolve(OUT_DIR, 'formulario-platos-teclado.webm')

const log = m => console.log(`[video] ${m}`)
const fail = m => { console.error(`[video] ERROR: ${m}`); process.exitCode = 1 }

// 1. Requisitos
for (const [name, url] of [['API', 'http://localhost:3000/health'], ['web-admin', ADMIN]]) {
  try { await fetch(url) } catch { fail(`${name} no responde en ${url}`); process.exit(1) }
}
const loginRes = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@resttek.com', password: 'admin@resttek.com' })
})
if (!loginRes.ok) { fail('login fallido (¿se ha ejecutado npm run seed?)'); process.exit(1) }
const { token, employee } = await loginRes.json()

// 2. Navegador (Edge/Chrome instalados; si no, Chromium de Playwright)
let browser
for (const channel of ['msedge', 'chrome', undefined]) {
  try { browser = await chromium.launch({ channel, headless: true, slowMo: 150 }); break } catch {}
}
if (!browser) { fail('no hay navegador disponible (npx playwright install chromium)'); process.exit(1) }

mkdirSync(OUT_DIR, { recursive: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } }
})

// Sesión iniciada sin pasar por el formulario de login
await context.addInitScript(([t, u]) => {
  localStorage.setItem('auth_token', t)
  localStorage.setItem('auth_user', u)
}, [token, JSON.stringify(employee)])

// Rótulo con las teclas pulsadas, visible en el vídeo
await context.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;padding:10px 18px;border-radius:8px;background:#000c;color:#fff;font:600 20px monospace;opacity:0;transition:opacity .2s;pointer-events:none'
    document.body.appendChild(el)
    let t
    addEventListener('keydown', e => {
      if (['Shift', 'Control'].includes(e.key)) return
      const prefix = (e.ctrlKey ? 'Ctrl + ' : '') + (e.shiftKey && e.key.length > 1 ? 'Shift + ' : '')
      el.textContent = prefix + (e.key === ' ' ? 'Espacio' : e.key)
      el.style.opacity = '1'
      clearTimeout(t)
      t = setTimeout(() => (el.style.opacity = '0'), 1200)
    }, true)
  })
})

const page = await context.newPage()
const pause = ms => page.waitForTimeout(ms)
const key = async (k, times = 1) => { for (let i = 0; i < times; i++) await page.keyboard.press(k) }
const type = text => page.keyboard.type(text, { delay: 90 })
const activeId = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)
const expectFocus = async id => {
  const f = await activeId()
  if (f !== id) throw new Error(`foco esperado en #${id}, está en ${f}`)
}

try {
  // 3. Abrir el formulario y colocar el foco en el título; desde aquí todo es teclado
  await page.goto(`${ADMIN}/restaurants/${restaurantId}/dishes/new`)
  await page.getByRole('heading', { name: 'Nuevo plato' }).waitFor()
  await page.evaluate(() => document.getElementById('page-title').focus())
  await pause(1200)

  // 4. Enviar vacío: Tab hasta Guardar y Enter
  log('Enviar formulario vacío')
  await key('Tab')                      // nombre
  await expectFocus('dish-name')
  await pause(800)
  await key('Tab', 4)                   // precio, categoría, disponible, descripción
  await key('Tab', 3)                   // ingrediente, cantidad, añadir
  await key('Tab', 2)                   // Cancelar, Guardar
  await pause(800)
  await key('Enter')
  await page.locator('#dish-name-error').waitFor()
  await page.locator('#dish-price-error').waitFor({ state: 'attached', timeout: 1000 }).catch(() => {})
  await expectFocus('dish-name')        // el foco salta al primer campo inválido
  log('Errores de validación visibles')
  await pause(2500)

  // 5. Rellenar con el teclado
  log('Rellenar el formulario')
  await type(DISH_NAME)
  await key('Tab')
  await key('Control+a')
  await type('12.5')
  await key('Tab')                      // categoría
  await pause(400)
  await key('ArrowDown', 2)
  await pause(500)
  await key('Tab')                      // disponible (se deja en "Sí")
  await pause(500)
  await key('Tab')                      // descripción
  await type('Plato creado solo con teclado')
  await key('Tab')                      // ingrediente
  await pause(400)
  await key('ArrowDown')
  await pause(500)
  await key('Tab')                      // cantidad
  await key('Control+a')
  await type('2')
  await pause(300)
  await key('Enter')                    // Enter añade el ingrediente
  await pause(1000)
  await key('Shift+Tab')                // vuelve al selector de ingrediente
  await pause(400)
  await key('ArrowDown', 2)             // otro ingrediente distinto
  await pause(500)
  await key('Tab', 2)                   // botón "Añadir ingrediente"
  await pause(400)
  await key(' ')                        // Espacio activa el botón
  await pause(1500)

  // 6. Enviar
  log('Guardar')
  await key('Tab', 2)                   // Cancelar, Guardar
  await pause(600)
  await key('Enter')
  await page.waitForURL(`**/restaurants/${restaurantId}/dishes`)
  await page.getByText(DISH_NAME).waitFor()
  log('Plato visible en el listado')
  await pause(2500)
} catch (e) {
  fail(e.message)
  await page.screenshot({ path: resolve(OUT_DIR, 'error.png') }).catch(() => {})
  log(`URL actual: ${page.url()} (captura en videos/error.png)`)
}

const video = page.video()
await context.close()
await video.saveAs(OUT_FILE)
await video.delete().catch(() => {})
await browser.close()

const size = statSync(OUT_FILE).size
if (process.exitCode) console.error(`[video] El vídeo (${size} bytes) puede estar incompleto: ${OUT_FILE}`)
else log(`OK -> ${OUT_FILE} (${(size / 1024).toFixed(0)} KB)`)
