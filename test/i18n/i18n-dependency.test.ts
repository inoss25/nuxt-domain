import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import type { Nuxt } from '@nuxt/schema'
import {
    getI18nModuleDependencies,
    resolveI18nDefaults,
    resolveLangDir,
    toI18nLocales,
} from '../../src/i18n-dependency'

const fakeNuxt = (options: Record<string, unknown>) =>
    ({ options: { rootDir: '/app', modules: [], ...options } }) as unknown as Nuxt

describe('toI18nLocales', () => {
    it('déduit le fichier <code>.json, objets compris', () => {
        expect(
            toI18nLocales(['fr', { code: 'en', name: 'English' }, { code: 'de', file: 'x.json' }])
        ).toEqual([
            { code: 'fr', file: 'fr.json' },
            { code: 'en', file: 'en.json', name: 'English' },
            { code: 'de', file: 'x.json' },
        ])
    })
})

describe('resolveI18nDefaults', () => {
    it('reprend locales et defaultLocale de domain.i18n', () => {
        expect(
            resolveI18nDefaults({ i18n: { locales: ['fr'], defaultLocale: 'fr' } }, {})
        ).toEqual({
            defaultLocale: 'fr',
            locales: [{ code: 'fr', file: 'fr.json' }],
        })
    })

    it('ne propose pas de locales si i18n.locales est déjà défini', () => {
        expect(
            resolveI18nDefaults({ i18n: { locales: ['fr'] } }, { locales: ['en'] })
        ).toEqual({})
    })
})

describe('resolveLangDir', () => {
    const root = resolve('/project')

    it('relatif au dossier i18n par défaut', () => {
        expect(resolveLangDir(root, 'i18n/locales', {})).toBe('locales')
    })

    it('suit restructureDir', () => {
        expect(resolveLangDir(root, 'lang/generated', { restructureDir: 'lang' })).toBe(
            'generated'
        )
    })

    it('retombe sur "locales" hors du dossier i18n', () => {
        expect(resolveLangDir(root, 'other/locales', {})).toBe('locales')
    })
})

describe('getI18nModuleDependencies', () => {
    it('aucune dépendance avec domain.i18n: false', async () => {
        expect(
            await getI18nModuleDependencies(fakeNuxt({ domain: { i18n: false } }))
        ).toEqual({})
    })

    it('réutilise le module déclaré par le projet', async () => {
        const deps = await getI18nModuleDependencies(
            fakeNuxt({ modules: [['@nuxtjs/i18n', {}]], domain: {} })
        )
        expect(Object.keys(deps)).toEqual(['@nuxtjs/i18n'])
    })

    it('sinon pointe vers la copie fournie avec nuxt-domain', async () => {
        const deps = await getI18nModuleDependencies(
            fakeNuxt({ domain: { i18n: { defaultLocale: 'fr' } } })
        )
        const [target] = Object.keys(deps)
        expect(target).toMatch(/@nuxtjs[\\/]i18n[\\/]/)
        expect(deps[target!]).toEqual({
            version: '>=10.0.0',
            defaults: { defaultLocale: 'fr' },
        })
    })
})
