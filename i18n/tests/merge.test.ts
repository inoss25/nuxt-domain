import { describe, it, expect } from 'vitest'
import { deepMerge, mergeAtDomainPath } from '../runtime/merge'

describe('deepMerge', () => {
    it('fusionne les objets imbriqués', () => {
        const base = { a: { x: 1, y: 2 }, b: 1 }
        const overlay = { a: { y: 3, z: 4 }, c: 2 }
        expect(deepMerge(base, overlay)).toEqual({
            a: { x: 1, y: 3, z: 4 },
            b: 1,
            c: 2,
        })
    })

    it('écrase les scalaires et tableaux', () => {
        const base = { a: [1, 2], b: 'old' }
        const overlay = { a: [3], b: 'new' }
        expect(deepMerge(base, overlay)).toEqual({ a: [3], b: 'new' })
    })
})

describe('mergeAtDomainPath', () => {
    it('place les messages sous un segment de domaine', () => {
        const root: Record<string, unknown> = {}
        mergeAtDomainPath(root, ['home'], { title: 'Accueil' })
        expect(root).toEqual({ home: { title: 'Accueil' } })
    })

    it('fusionne sous global pour le shared', () => {
        const root: Record<string, unknown> = {
            global: { appName: 'A' },
        }
        mergeAtDomainPath(root, ['global'], {
            common: { loading: '…' },
        })
        expect(root).toEqual({
            global: { appName: 'A', common: { loading: '…' } },
        })
    })

    it('fusionne plusieurs niveaux de sous-domaines', () => {
        const root: Record<string, unknown> = {}
        mergeAtDomainPath(root, ['shop', 'checkout'], { title: 'Paiement' })
        expect(root).toEqual({
            shop: { checkout: { title: 'Paiement' } },
        })
    })

    it('fusionne deux fichiers pour le même domaine', () => {
        const root: Record<string, unknown> = {}
        mergeAtDomainPath(root, ['home'], { title: 'A' })
        mergeAtDomainPath(root, ['home'], { subtitle: 'B' })
        expect(root).toEqual({ home: { title: 'A', subtitle: 'B' } })
    })
})
