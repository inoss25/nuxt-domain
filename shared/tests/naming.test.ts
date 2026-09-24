import { describe, it, expect } from 'vitest'
import {
    conformsToNameFormat,
    formatName,
    resolveDomainKeyFormat,
    resolveNameFormat,
    tokenizeName,
} from '../runtime/naming'

describe('tokenizeName', () => {
    it('découpe snake, kebab et camelCase', () => {
        expect(tokenizeName('trip_prices')).toEqual(['trip', 'prices'])
        expect(tokenizeName('trip-prices')).toEqual(['trip', 'prices'])
        expect(tokenizeName('tripPrices')).toEqual(['trip', 'Prices'])
    })

    it('gère les acronymes intermédiaires', () => {
        expect(tokenizeName('HTTPClient')).toEqual(['HTTP', 'Client'])
    })
})

describe('formatName', () => {
    it('convertit vers les quatre formats', () => {
        expect(formatName('trip-prices', 'snake_case')).toBe('trip_prices')
        expect(formatName('trip-prices', 'kebab-case')).toBe('trip-prices')
        expect(formatName('trip-prices', 'camelCase')).toBe('tripPrices')
        expect(formatName('trip-prices', 'PascalCase')).toBe('TripPrices')
        expect(formatName('trip-prices', 'preserve')).toBe('trip-prices')
    })

    it('retourne vide pour entrée vide', () => {
        expect(formatName('   ', 'snake_case')).toBe('')
    })
})

describe('conformsToNameFormat', () => {
    it('valide kebab-case', () => {
        expect(conformsToNameFormat('authentication', 'kebab-case')).toBe(true)
        expect(conformsToNameFormat('trip_prices', 'kebab-case')).toBe(false)
        expect(conformsToNameFormat('2bad', 'kebab-case')).toBe(false)
    })

    it('valide snake_case', () => {
        expect(conformsToNameFormat('trip_prices', 'snake_case')).toBe(true)
        expect(conformsToNameFormat('trip-prices', 'snake_case')).toBe(false)
    })
})

describe('resolveDomainKeyFormat', () => {
    it('priorise domainKeyFormat', () => {
        expect(
            resolveDomainKeyFormat({
                domainKeyFormat: 'camelCase',
                domainSegmentKeyFormat: 'preserve',
            })
        ).toBe('camelCase')
    })

    it('retombe sur domainSegmentKeyFormat', () => {
        expect(
            resolveDomainKeyFormat({ domainSegmentKeyFormat: 'preserve' })
        ).toBe('preserve')
    })
})

describe('resolveNameFormat', () => {
    it('lève sur valeur inconnue', () => {
        expect(() =>
            resolveNameFormat('wrong', 'snake_case', 'test')
        ).toThrow(/test/)
    })
})
