import { describe, expect, it } from 'vitest'
import { collectI18nLeafKeys, generateTypedI18nDts } from '../../src/runtime/i18n/typed-i18n'

describe('generateTypedI18nDts', () => {
    it('type DefineLocaleMessage à partir du JSON de la locale de référence', () => {
        const dts = generateTypedI18nDts(['b.title', "a.it's"], 'fr')
        expect(dts).toContain("type DomainI18nSchema = typeof import('./fr.json')")
        expect(dts).toContain('interface DefineLocaleMessage extends DomainI18nSchema {}')
        expect(dts).toContain("  | 'a.it\\'s'\n  | 'b.title'")
        expect(dts).not.toContain('[key: DomainI18nKey]')
    })

    it('reste valide sans locale', () => {
        const dts = generateTypedI18nDts([])
        expect(dts).toContain('  | never')
        expect(dts).not.toContain("declare module 'vue-i18n'")
    })
})

describe('collectI18nLeafKeys', () => {
    it('collecte les clés feuilles en profondeur', () => {
        expect(collectI18nLeafKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual([
            'a.b',
            'a.c.d',
            'e',
        ])
    })
})
