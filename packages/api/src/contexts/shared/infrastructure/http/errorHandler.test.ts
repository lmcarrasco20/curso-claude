import { describe, it, expect } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    TableNotAvailableError,
    DuplicatedTableNumberError,
    InvalidTableError,
    InvalidTableStatusError,
    InvalidCredentialsError,
    DiscountCodeNotFoundError,
    PointsRewardNotFoundError,
    BillNotFoundError,
    OrderNotFoundError,
    DuplicatedDiscountCodeError,
    DuplicatedPointsRewardError,
    BillAlreadyRequestedError,
    OrderNotOwnedError,
    InvalidDiscountError,
    InvalidDiscountCodeError,
    InvalidPointsRewardError,
    InsufficientPointsError,
    PackNotFoundError,
    InvalidPackError,
    InvalidPackSelectionError
} from '@errors/DomainErrors.js'

const handle = (error: unknown): { status: number; body: any } => {
    let status = 0
    let body: any
    const res = {
        status(code: number) { status = code; return this },
        json(payload: unknown) { body = payload; return this }
    } as unknown as Response
    errorHandler(error, {} as Request, res, () => {})
    return { status, body }
}

describe('errorHandler', () => {
    it('devuelve 404 si la mesa no existe', () => {
        expect(handle(new TableNotFoundError()).status).toBe(404)
    })

    it.each([new TableNotAvailableError(), new DuplicatedTableNumberError()])('devuelve 409 para %s', error => {
        const { status, body } = handle(error)
        expect(status).toBe(409)
        expect(body.error).toBe(error.name)
    })

    it.each([new InvalidTableError(), new InvalidTableStatusError()])('devuelve 400 para %s', error => {
        expect(handle(error).status).toBe(400)
    })

    it('mantiene el 401 de las credenciales inválidas', () => {
        expect(handle(new InvalidCredentialsError()).status).toBe(401)
    })

    it('devuelve 500 para errores desconocidos', () => {
        expect(handle(new Error('boom')).status).toBe(500)
    })

    it.each([new DiscountCodeNotFoundError(), new PointsRewardNotFoundError(), new BillNotFoundError(), new OrderNotFoundError()])(
        'devuelve 404 para %s', error => {
            expect(handle(error).status).toBe(404)
        }
    )

    it.each([new DuplicatedDiscountCodeError(), new DuplicatedPointsRewardError(), new BillAlreadyRequestedError()])(
        'devuelve 409 para %s', error => {
            expect(handle(error).status).toBe(409)
        }
    )

    it('devuelve 403 si el pedido no es del usuario', () => {
        const { status, body } = handle(new OrderNotOwnedError())
        expect(status).toBe(403)
        expect(body.error).toBe('OrderNotOwnedError')
    })

    it.each([new InvalidDiscountError(), new InvalidDiscountCodeError(), new InvalidPointsRewardError(), new InsufficientPointsError()])(
        'devuelve 400 para %s', error => {
            expect(handle(error).status).toBe(400)
        }
    )

    it('devuelve 404 si el pack no existe', () => {
        expect(handle(new PackNotFoundError()).status).toBe(404)
    })

    it.each([new InvalidPackError(), new InvalidPackSelectionError()])('devuelve 400 para %s', error => {
        expect(handle(error).status).toBe(400)
    })
})
