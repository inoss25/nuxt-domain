import fg from 'fast-glob'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
    applyDomainWatchEvent,
    getDomainScanCache,
    getDomainTreeScan,
    requiresRestart,
} from '../../src/runtime/shared/scan'

const FILES = [
    'shop/domain.config.ts',
    'shop/pages/index.vue',
    'shop/pages/_draft.vue',
    'shop/pages/components/Inline.vue',
    'shop/components/Card.vue',
    'shop/layouts/default.vue',
    'shop/layouts/auth/login.vue',
    'shop/i18n/en.json',
    'shop/i18n/fr/partials.json',
    'shop/domains/cart/domain.config.ts',
    'shop/domains/cart/pages/list.vue',
    'shop/domains/cart/utils/price.ts',
    'shop/_template/domain.config.ts',
    'shop/_template/pages/index.vue',
    'shop/notes.json',
]

let root: string

beforeEach(() => {
    root = mkdtempSync(resolve(tmpdir(), 'nuxt-domain-scan-'))
    for (const file of FILES) {
        mkdirSync(dirname(resolve(root, file)), { recursive: true })
        writeFileSync(resolve(root, file), '')
    }
})

afterEach(() => {
    rmSync(root, { recursive: true, force: true })
})

describe('getDomainTreeScan', () => {
    it('donne les mêmes résultats que les globs dédiés', async () => {
        const glob = async (pattern: string | string[], extra = {}) =>
            (await fg(pattern, { cwd: root, ignore: ['**/_*/**'], ...extra })).sort()

        const scan = await getDomainTreeScan(root)

        expect(scan.configFiles).toEqual(await glob('**/domain.config.ts'))
        expect(scan.pageFiles).toEqual(await glob('**/pages/**/*.vue'))
        expect(scan.i18nFiles).toEqual(await glob('**/i18n/**/*.json'))
        expect(scan.layoutFiles).toEqual(
            await glob('**/layouts/**/*.vue', {
                ignore: ['**/pages/**', '**/_*/**'],
            })
        )
        expect(scan.autoImportDirs).toEqual(
            await glob(
                ['**/components', '**/composables', '**/public', '**/stores', '**/utils'],
                { onlyDirectories: true, ignore: ['**/pages/**', '**/_*/**'] }
            )
        )
    })

    it('réutilise le scan en cache', async () => {
        const cache = getDomainScanCache({}, root)
        const first = await getDomainTreeScan(root, cache)
        writeFileSync(resolve(root, 'shop/pages/new.vue'), '')
        expect(await getDomainTreeScan(root, cache)).toBe(first)
    })
})

describe('applyDomainWatchEvent', () => {
    it('ajoute et retire des fichiers sans rescanner', async () => {
        const cache = getDomainScanCache({}, root)
        await getDomainTreeScan(root, cache)

        const added = resolve(root, 'blog/pages/post.vue')
        expect(applyDomainWatchEvent(cache, root, 'add', added)).toBe(true)
        expect((await getDomainTreeScan(root, cache)).pageFiles).toContain('blog/pages/post.vue')

        // Idempotent : un second module peut rejouer le même événement.
        expect(applyDomainWatchEvent(cache, root, 'add', added)).toBe(false)

        const removed = resolve(root, 'shop/pages/index.vue')
        applyDomainWatchEvent(cache, root, 'unlink', removed)
        expect((await getDomainTreeScan(root, cache)).pageFiles).not.toContain('shop/pages/index.vue')
    })

    it('supprime tout le contenu d’un dossier retiré', async () => {
        const cache = getDomainScanCache({}, root)
        await getDomainTreeScan(root, cache)
        applyDomainWatchEvent(cache, root, 'unlinkDir', resolve(root, 'shop/domains'))
        const scan = await getDomainTreeScan(root, cache)
        expect(scan.configFiles).toEqual(['shop/domain.config.ts'])
        expect(scan.autoImportDirs).not.toContain('shop/domains/cart/utils')
    })

    it('ignore les dossiers réservés et les fichiers hors racine', async () => {
        const cache = getDomainScanCache({}, root)
        await getDomainTreeScan(root, cache)
        expect(
            applyDomainWatchEvent(cache, root, 'add', resolve(root, 'shop/_tpl/pages/a.vue'))
        ).toBe(false)
        expect(
            applyDomainWatchEvent(cache, root, 'add', resolve(root, '../elsewhere.vue'))
        ).toBe(false)
    })
})

describe('requiresRestart', () => {
    it('détecte les sources enregistrées seulement au setup', () => {
        expect(requiresRestart(root, 'addDir', resolve(root, 'blog/components'))).toBe(true)
        expect(requiresRestart(root, 'add', resolve(root, 'blog/layouts/main.vue'))).toBe(true)
        expect(requiresRestart(root, 'add', resolve(root, 'blog/pages/a.vue'))).toBe(false)
        expect(requiresRestart(root, 'addDir', resolve(root, 'blog/pages/components'))).toBe(false)
        expect(requiresRestart(root, 'change', resolve(root, 'blog/layouts/main.vue'))).toBe(false)
    })
})
