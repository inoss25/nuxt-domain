import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    fileIsUnderRoot,
    isDomainPageRelativePath,
    isDomainRouteFile,
    removeDomainRoutes,
} from '../runtime/dev-watch'

const here = dirname(fileURLToPath(import.meta.url))
const domainsRoot = resolve(here, '../../../app/domains')

describe('dev-watch helpers', () => {
    it('detecte un fichier page domaine', () => {
        expect(
            isDomainPageRelativePath('dashboard/pages/settings.vue', ['.vue'])
        ).toBe(true)
        expect(
            isDomainPageRelativePath('_template/pages/index.vue', ['.vue'])
        ).toBe(false)
        expect(
            isDomainPageRelativePath('dashboard/components/Foo.vue', ['.vue'])
        ).toBe(false)
    })

    it('identifie les routes domaine par chemin fichier', () => {
        const domainFile = resolve(domainsRoot, 'home/pages/index.vue')
        const outsideFile = resolve(here, 'fixtures/home/home/pages/index.vue')
        expect(isDomainRouteFile(domainFile, domainsRoot)).toBe(true)
        expect(isDomainRouteFile(outsideFile, domainsRoot)).toBe(false)
    })

    it('retire les routes domaine sans toucher aux autres', () => {
        const domainFile = resolve(domainsRoot, 'home/pages/index.vue')
        const otherFile = resolve(here, 'other.vue')
        const pages = [
            { path: '/', file: domainFile, name: 'home' },
            { path: '/legacy', file: otherFile, name: 'legacy' },
        ]
        const next = removeDomainRoutes(pages, domainsRoot)
        expect(next).toHaveLength(1)
        expect(next[0]?.name).toBe('legacy')
    })

    it('fileIsUnderRoot fonctionne avec chemins relatifs', () => {
        const inside = resolve(domainsRoot, 'home/pages/index.vue')
        const outside = resolve(here, 'route-generator.test.ts')
        expect(fileIsUnderRoot(inside, domainsRoot)).toBe(true)
        expect(fileIsUnderRoot(outside, domainsRoot)).toBe(false)
    })
})
