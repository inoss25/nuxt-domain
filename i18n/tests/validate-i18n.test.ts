import { describe, it, expect } from 'vitest'
import {
    extractInterpolationVariables,
    validateInterpolationAcrossLocales,
    validateJsonKeyFormat,
    validateLocaleStructures,
} from '../runtime/validate-i18n'

describe('validateJsonKeyFormat', () => {
    it('signale une clé camelCase si snake_case attendu', () => {
        const reports = validateJsonKeyFormat(
            { departureCity: 'Ville' },
            'snake_case',
            '/tmp/fr.json'
        )
        expect(reports).toHaveLength(1)
        expect(reports[0]?.kind).toBe('i18n-key-format')
    })

    it('accepte des clés conformes', () => {
        const reports = validateJsonKeyFormat(
            { departure_city: 'Ville' },
            'snake_case',
            '/tmp/fr.json'
        )
        expect(reports).toHaveLength(0)
    })
})

describe('validateLocaleStructures', () => {
    it('détecte une clé manquante', () => {
        const map = new Map([
            ['fr', { booking: { title: 'R', submit: 'OK' } }],
            ['en', { booking: { title: 'B' } }],
        ])
        const reports = validateLocaleStructures(map, 'missing', 'fr')
        expect(reports.some((r) => r.message.includes('booking.submit'))).toBe(
            true
        )
    })
})

describe('validateInterpolationAcrossLocales', () => {
    it('détecte des variables différentes', () => {
        const map = new Map([
            ['fr', { welcome: 'Bonjour {name}' }],
            ['en', { welcome: 'Hello {username}' }],
        ])
        const reports = validateInterpolationAcrossLocales(map, 'fr')
        expect(reports).toHaveLength(1)
        expect(reports[0]?.kind).toBe('i18n-interpolation')
    })
})

describe('extractInterpolationVariables', () => {
    it('ignore les accolades échappées', () => {
        expect(extractInterpolationVariables('literal \\{notVar}')).toEqual([])
        expect(extractInterpolationVariables('Hi {name}')).toEqual(['name'])
    })
})
