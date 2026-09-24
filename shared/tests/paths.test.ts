import { describe, it, expect } from 'vitest'
import {
    normalizeDomainParts,
    getSubDomainsDirName,
    isIgnoredDomainPath,
} from '../runtime/paths'
import type { DomainConfigPathFields } from '../runtime/types'

const baseOptions = { subDomainsDirName: 'domains' }

describe('isIgnoredDomainPath', () => {
    it('ignore les dossiers préfixés par _', () => {
        expect(isIgnoredDomainPath(['_template'])).toBe(true)
        expect(isIgnoredDomainPath(['shop', '_partial'])).toBe(true)
        expect(isIgnoredDomainPath(['home'])).toBe(false)
    })
})

describe('getSubDomainsDirName', () => {
    it('prend la valeur du parent, puis les options, puis le défaut', () => {
        expect(getSubDomainsDirName({ subDomainsDirName: 'subs' }, baseOptions)).toBe(
            'subs'
        )
        expect(getSubDomainsDirName(undefined, { subDomainsDirName: 'kids' })).toBe(
            'kids'
        )
        expect(getSubDomainsDirName(undefined, {})).toBe('domains')
    })
})

describe('normalizeDomainParts', () => {
    it('laisse un segment unique inchangé', () => {
        const configs = new Map<string, DomainConfigPathFields>()
        expect(normalizeDomainParts(configs, baseOptions, ['home'])).toEqual([
            'home',
        ])
    })

    it('ignore le dossier marqueur quand le parent a hasSubDomains', () => {
        const configs = new Map<string, DomainConfigPathFields>([
            ['shop', { hasSubDomains: true }],
        ])
        expect(
            normalizeDomainParts(configs, baseOptions, [
                'shop',
                'domains',
                'checkout',
            ])
        ).toEqual(['shop', 'checkout'])
    })

    it('conserve le marqueur si le parent n’a pas hasSubDomains', () => {
        const configs = new Map<string, DomainConfigPathFields>([
            ['shop', { hasSubDomains: false }],
        ])
        expect(
            normalizeDomainParts(configs, baseOptions, [
                'shop',
                'domains',
                'checkout',
            ])
        ).toEqual(['shop', 'domains', 'checkout'])
    })

    it('utilise subDomainsDirName du parent', () => {
        const configs = new Map<string, DomainConfigPathFields>([
            ['shop', { hasSubDomains: true, subDomainsDirName: 'subs' }],
        ])
        expect(
            normalizeDomainParts(configs, baseOptions, [
                'shop',
                'subs',
                'checkout',
            ])
        ).toEqual(['shop', 'checkout'])
    })
})
