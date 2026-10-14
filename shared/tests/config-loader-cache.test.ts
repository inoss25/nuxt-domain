import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import {
    createDomainConfigCache,
    getDomainConfigCache,
    invalidateDomainConfigCache,
    loadDomainConfigs,
} from '../runtime/config-loader'

const here = dirname(fileURLToPath(import.meta.url))
const sharedRuntimeDir = resolve(here, '../runtime')
const pagesRuntimeDir = resolve(here, '../../pages/runtime')

describe('loadDomainConfigs — cache partagé', () => {
    let domainsRoot: string

    const writeConfig = (domain: string, body: string) => {
        const dir = resolve(domainsRoot, domain)
        mkdirSync(dir, { recursive: true })
        writeFileSync(resolve(dir, 'domain.config.ts'), body, 'utf8')
    }

    const load = (cache?: ReturnType<typeof createDomainConfigCache>) => {
        const logs: string[] = []
        const promise = loadDomainConfigs({
            domainsRoot,
            options: { subDomainsDirName: 'domains' },
            sharedRuntimeDir,
            pagesRuntimeDir,
            moduleLabel: 'test',
            debugLog: (...args) => logs.push(String(args[0])),
            cache,
        })
        return { promise, logs }
    }

    beforeEach(() => {
        domainsRoot = mkdtempSync(resolve(tmpdir(), 'domain-cache-'))
        writeConfig('shop', 'export default { meta: { v: 1 } }\n')
        writeConfig('blog', 'export default { enabled: false }\n')
    })

    afterEach(() => {
        rmSync(domainsRoot, { recursive: true, force: true })
    })

    it('réutilise le cache quand aucun domain.config.ts ne change', async () => {
        const cache = createDomainConfigCache()

        const first = load(cache)
        const a = await first.promise
        expect(first.logs.some((l) => l.includes('en cache'))).toBe(false)

        const second = load(cache)
        const b = await second.promise
        expect(second.logs.some((l) => l.includes('en cache'))).toBe(true)

        expect([...b.configs.keys()].sort()).toEqual(['blog', 'shop'])
        expect(b.configs.get('shop')).toEqual(a.configs.get('shop'))
        expect(b.configs.get('blog')).toEqual({ enabled: false })
    })

    it('recharge une config modifiée (valeur fraîche, pas la version en cache)', async () => {
        const cache = createDomainConfigCache()
        const before = await load(cache).promise
        expect(before.configs.get('shop')).toEqual({ meta: { v: 1 } })

        // contenu de taille différente : l'empreinte change même si le mtime est identique
        writeConfig('shop', 'export default { meta: { v: 2222 } }\n')

        const run = load(cache)
        const after = await run.promise
        expect(run.logs.some((l) => l.includes('en cache'))).toBe(false)
        expect(after.configs.get('shop')).toEqual({ meta: { v: 2222 } })
        expect(after.configs.get('blog')).toEqual({ enabled: false })
    })

    it('prend en compte un domain.config.ts ajouté ou supprimé', async () => {
        const cache = createDomainConfigCache()
        await load(cache).promise

        writeConfig('admin', 'export default { prefix: "adm" }\n')
        const added = await load(cache).promise
        expect([...added.configs.keys()].sort()).toEqual(['admin', 'blog', 'shop'])

        rmSync(resolve(domainsRoot, 'blog'), { recursive: true, force: true })
        const removed = await load(cache).promise
        expect([...removed.configs.keys()].sort()).toEqual(['admin', 'shop'])
    })

    it('sans cache : rien n’est conservé et les modifications sont vues', async () => {
        const a = await load().promise
        expect(a.configs.get('shop')).toEqual({ meta: { v: 1 } })

        writeConfig('shop', 'export default { meta: { v: 7777 } }\n')
        const b = await load().promise
        expect(b.configs.get('shop')).toEqual({ meta: { v: 7777 } })
    })

    it('invalidateDomainConfigCache force un rechargement complet', async () => {
        const cache = createDomainConfigCache()
        await load(cache).promise
        invalidateDomainConfigCache(cache)

        const run = load(cache)
        await run.promise
        expect(run.logs.some((l) => l.includes('en cache'))).toBe(false)
    })

    it('signale les configs invalides à chaque appel, y compris depuis le cache', async () => {
        writeConfig('broken', 'throw new Error("boom")\n')
        const cache = createDomainConfigCache()

        const first = await load(cache).promise
        expect(first.failedCount).toBe(1)
        expect(first.configs.has('broken')).toBe(false)

        const second = await load(cache).promise
        expect(second.failedCount).toBe(1)
        expect([...second.configs.keys()].sort()).toEqual(['blog', 'shop'])
    })

    it('getDomainConfigCache : un cache par propriétaire, stable entre appels', () => {
        const owner = {}
        expect(getDomainConfigCache(owner)).toBe(getDomainConfigCache(owner))
        expect(getDomainConfigCache({})).not.toBe(getDomainConfigCache(owner))
    })
})
