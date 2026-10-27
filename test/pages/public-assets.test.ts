import { describe, expect, it, vi } from 'vitest'
import { resolve } from 'node:path'
import type { DomainConfig, DomainPagesOptions } from '../../src/runtime/pages/types'
import { getDomainPublicAssets } from '../../src/runtime/pages/public-assets'

describe('getDomainPublicAssets', () => {
    it('namespaces active root and nested domain public folders', () => {
        const domainsRoot = resolve('app/domains')
        const configs = new Map<string, DomainConfig>([
            ['account', {}],
            ['inventory', { hasSubDomains: true }],
            ['inventory/brands', {}],
            ['disabled', { enabled: false }],
        ])
        const options: DomainPagesOptions = { subDomainsDirName: 'domains' }
        const debugLog = vi.fn()

        const assets = getDomainPublicAssets(
            domainsRoot,
            [
                'account/public',
                'inventory/domains/brands/public',
                'disabled/public',
                'unknown/public',
            ],
            configs,
            options,
            debugLog
        )

        expect(assets).toEqual([
            {
                dir: resolve(domainsRoot, 'account/public'),
                baseURL: 'domains/account',
                fallthrough: true,
                maxAge: 0,
            },
            {
                dir: resolve(domainsRoot, 'inventory/domains/brands/public'),
                baseURL: 'domains/inventory/brands',
                fallthrough: true,
                maxAge: 0,
            },
        ])
        expect(debugLog).toHaveBeenCalledWith(
            '📦 [domain-pages] public assets registered',
            expect.objectContaining({ domain: 'account' })
        )
        expect(debugLog).toHaveBeenCalledWith(
            '📦 [domain-pages] public assets registered',
            expect.objectContaining({ domain: 'inventory/brands' })
        )
    })

    it('ignores nested public folders when their parent disallows subdomains', () => {
        const configs = new Map<string, DomainConfig>([
            ['catalog', {}],
            ['catalog/domains/brands', {}],
        ])

        expect(
            getDomainPublicAssets(
                resolve('app/domains'),
                ['catalog/domains/brands/public'],
                configs,
                { subDomainsDirName: 'domains' },
                vi.fn()
            )
        ).toEqual([])
    })
})
