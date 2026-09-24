import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NuxtPage } from '@nuxt/schema'
import { generateDomainRoutes } from '../runtime/route-generator'
import type { DomainConfig, DomainPagesOptions } from '../runtime/types'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => resolve(here, 'fixtures', name)

const baseOptions: DomainPagesOptions = {
    domainsDir: 'app/domains',
    childrenDirName: 'children',
    subDomainsDirName: 'domains',
}

const noop = () => {}

function collectPaths(pages: Iterable<NuxtPage>): string[] {
    const out: string[] = []
    const walk = (page: NuxtPage, parent = '') => {
        const seg = page.path ?? ''
        let full: string
        if (!parent) {
            full = seg || '/'
        } else if (seg === '') {
            full = parent
        } else {
            const base = parent === '/' ? '' : parent.replace(/\/$/, '')
            full = `${base}/${seg}`.replace(/\/+/g, '/')
        }
        if (full !== '/' && !full.startsWith('/')) full = `/${full}`
        out.push(full)
        for (const child of page.children ?? []) walk(child, full)
    }
    for (const page of pages) walk(page)
    return out.sort()
}

describe('generateDomainRoutes', () => {
    it('génère une route d’accueil / avec noPrefix + home', async () => {
        const configs = new Map<string, DomainConfig>([
            ['home', { enabled: true, home: true, noPrefix: true }],
        ])
        const { routeMap } = await generateDomainRoutes(
            fixture('home'),
            configs,
            baseOptions,
            noop
        )
        const home = [...routeMap.values()].find((r) => r.path === '/')
        expect(home).toBeDefined()
        expect(home?.name).toBe('home')
    })

    it('préfixe les routes par le nom du domaine', async () => {
        const configs = new Map<string, DomainConfig>([
            ['dashboard', { enabled: true }],
        ])
        const { routeMap } = await generateDomainRoutes(
            fixture('dashboard'),
            configs,
            baseOptions,
            noop
        )
        const paths = collectPaths(routeMap.values())
        expect(paths).toContain('/dashboard')
        expect(paths).toContain('/dashboard/settings')
    })

    it('convertit les segments dynamiques [id] en :id', async () => {
        const configs = new Map<string, DomainConfig>([
            ['projects', { enabled: true }],
        ])
        const { routeMap } = await generateDomainRoutes(
            fixture('projects'),
            configs,
            baseOptions,
            noop
        )
        const paths = collectPaths(routeMap.values())
        expect(paths).toContain('/projects/:id')
    })

    it('applique les overrides routes du domain.config', async () => {
        const configs = new Map<string, DomainConfig>([
            [
                'authentication',
                {
                    enabled: true,
                    noPrefix: true,
                    routes: {
                        login: { path: '/signin', name: 'signin' },
                    },
                },
            ],
        ])
        const { routeMap } = await generateDomainRoutes(
            fixture('auth'),
            configs,
            baseOptions,
            noop
        )
        const login = [...routeMap.values()].find((r) => r.name === 'signin')
        expect(login?.path).toBe('/signin')
    })

    it('ignore les domaines avec enabled: false', async () => {
        const configs = new Map<string, DomainConfig>([
            ['reports', { enabled: false }],
        ])
        const { routeMap } = await generateDomainRoutes(
            fixture('disabled'),
            configs,
            baseOptions,
            noop
        )
        expect(routeMap.size).toBe(0)
    })

    it('résout les sous-domaines via le dossier marqueur domains/', async () => {
        const configs = new Map<string, DomainConfig>([
            ['inventory', { enabled: true, hasSubDomains: true }],
            ['inventory/brands', { enabled: true }],
        ])
        const { routeMap } = await generateDomainRoutes(
            fixture('subdomains'),
            configs,
            baseOptions,
            noop
        )
        const paths = collectPaths(routeMap.values())
        expect(paths).toContain('/inventory/brands/list')
    })
})

describe('normalizeDomainParts (via routes)', () => {
    it('ignore les dossiers _template', async () => {
        const configs = new Map<string, DomainConfig>([
            ['_template', { enabled: true }],
        ])
        const { routeMap } = await generateDomainRoutes(
            resolve(here, '../../../app/domains'),
            configs,
            baseOptions,
            noop
        )
        const templateRoutes = [...routeMap.values()].filter((r) =>
            String(r.file).includes('_template')
        )
        expect(templateRoutes).toHaveLength(0)
    })
})
