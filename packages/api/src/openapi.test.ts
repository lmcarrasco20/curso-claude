import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const spec = JSON.parse(readFileSync(path.join(__dirname, '../../../docs/api/openapi.json'), 'utf-8'))

const ENDPOINTS: [string, string][] = [
    ['post', '/auth/login'],
    ['post', '/auth/register'],
    ['get', '/employees'],
    ['post', '/employees'],
    ['get', '/employees/{id}'],
    ['get', '/restaurants'],
    ['post', '/restaurants'],
    ['get', '/restaurants/{id}'],
    ['put', '/restaurants/{id}'],
    ['get', '/restaurants/{restaurantId}/employees'],
    ['get', '/restaurants/{restaurantId}/ingredients'],
    ['post', '/restaurants/{restaurantId}/ingredients'],
    ['get', '/restaurants/{restaurantId}/ingredients/{id}'],
    ['put', '/restaurants/{restaurantId}/ingredients/{id}'],
    ['delete', '/restaurants/{restaurantId}/ingredients/{id}'],
    ['get', '/restaurants/{restaurantId}/dishes'],
    ['post', '/restaurants/{restaurantId}/dishes'],
    ['get', '/restaurants/{restaurantId}/dishes/{id}'],
    ['put', '/restaurants/{restaurantId}/dishes/{id}'],
    ['delete', '/restaurants/{restaurantId}/dishes/{id}'],
    ['get', '/restaurants/{restaurantId}/tables'],
    ['post', '/restaurants/{restaurantId}/tables'],
    ['get', '/restaurants/{restaurantId}/tables/{id}'],
    ['put', '/restaurants/{restaurantId}/tables/{id}'],
    ['delete', '/restaurants/{restaurantId}/tables/{id}'],
    ['patch', '/restaurants/{restaurantId}/tables/{id}/status'],
    ['post', '/restaurants/{restaurantId}/tables/{id}/occupy'],
    ['get', '/public/restaurants/{restaurantId}/tables'],
    ['get', '/restaurants/{restaurantId}/discount-codes'],
    ['post', '/restaurants/{restaurantId}/discount-codes'],
    ['get', '/restaurants/{restaurantId}/discount-codes/{id}'],
    ['put', '/restaurants/{restaurantId}/discount-codes/{id}'],
    ['delete', '/restaurants/{restaurantId}/discount-codes/{id}'],
    ['get', '/restaurants/{restaurantId}/points-rewards'],
    ['post', '/restaurants/{restaurantId}/points-rewards'],
    ['put', '/restaurants/{restaurantId}/points-rewards/{id}'],
    ['delete', '/restaurants/{restaurantId}/points-rewards/{id}'],
    ['post', '/orders/{id}/bill'],
    ['get', '/orders/{id}/bill'],
    ['get', '/restaurants/{restaurantId}/packs'],
    ['post', '/restaurants/{restaurantId}/packs'],
    ['get', '/restaurants/{restaurantId}/packs/{id}'],
    ['put', '/restaurants/{restaurantId}/packs/{id}'],
    ['delete', '/restaurants/{restaurantId}/packs/{id}'],
    ['get', '/public/restaurants/{restaurantId}/packs'],
    ['get', '/restaurants/{restaurantId}/points-rule'],
    ['put', '/restaurants/{restaurantId}/points-rule'],
    ['get', '/points/mine'],
    ['get', '/public/restaurants'],
    ['get', '/public/restaurants/{id}'],
    ['get', '/public/restaurants/{restaurantId}/dishes'],
    ['post', '/orders'],
    ['get', '/orders/active'],
    ['get', '/orders/mine'],
    ['get', '/orders/{id}'],
    ['patch', '/orders/{orderId}/items/{itemId}/status']
]

describe('Documento OpenAPI', () => {
    it('es un documento OpenAPI 3 con información y servidor', () => {
        expect(spec.openapi).toMatch(/^3\./)
        expect(spec.info.title).toBeTruthy()
        expect(spec.info.version).toBeTruthy()
        expect(spec.servers[0].url).toBe('/api/v1')
    })

    it.each(ENDPOINTS)('documenta %s %s', (method, route) => {
        expect(spec.paths[route]?.[method], `${method} ${route}`).toBeDefined()
    })

    it('no documenta endpoints que no existen en la lista', () => {
        const documented = Object.entries(spec.paths).flatMap(([route, ops]) =>
            Object.keys(ops as object).filter(k => k !== 'parameters').map(m => `${m} ${route}`)
        )
        expect(documented.sort()).toEqual(ENDPOINTS.map(([m, r]) => `${m} ${r}`).sort())
    })

    it('todas las operaciones tienen resumen, etiqueta y respuestas', () => {
        for (const [route, ops] of Object.entries<any>(spec.paths)) {
            for (const [method, op] of Object.entries<any>(ops)) {
                expect(op.summary, `${method} ${route} summary`).toBeTruthy()
                expect(op.tags?.length, `${method} ${route} tags`).toBeGreaterThan(0)
                expect(Object.keys(op.responses ?? {}).length, `${method} ${route} responses`).toBeGreaterThan(0)
            }
        }
    })

    it('las operaciones protegidas declaran seguridad y las públicas la desactivan', () => {
        const publicOps = (route: string) => route === '/auth/login' || route === '/auth/register' || route.startsWith('/public/')
        for (const [route, ops] of Object.entries<any>(spec.paths)) {
            for (const op of Object.values<any>(ops)) {
                if (publicOps(route)) expect(op.security, route).toEqual([])
                else expect(op.security ?? spec.security, route).toEqual([{ bearerAuth: [] }])
            }
        }
    })

    it('todas las referencias $ref apuntan a componentes existentes', () => {
        const refs = [...JSON.stringify(spec).matchAll(/"\$ref":"#\/components\/([^/]+)\/([^"]+)"/g)]
        expect(refs.length).toBeGreaterThan(0)
        for (const [, section, name] of refs) {
            expect(spec.components[section!]?.[name!], `#/components/${section}/${name}`).toBeDefined()
        }
    })

    it('los parámetros de ruta de cada path están declarados', () => {
        for (const [route, ops] of Object.entries<any>(spec.paths)) {
            const names = [...route.matchAll(/\{(\w+)\}/g)].map(m => m[1])
            for (const [method, op] of Object.entries<any>(ops)) {
                const declared = (op.parameters ?? []).filter((p: any) => p.in === 'path').map((p: any) => p.name)
                for (const n of names) expect(declared, `${method} ${route} {${n}}`).toContain(n)
            }
        }
    })

    it('el pedido admite packs y sus items indican a qué pack pertenecen', () => {
        expect(spec.components.schemas.CreateOrder.properties.packs).toBeDefined()
        expect(spec.components.schemas.Order.properties.packs).toBeDefined()
        expect(spec.components.schemas.OrderItem.properties.orderPackId).toBeDefined()
    })
})
