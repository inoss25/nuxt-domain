import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { generateLocales } from '../runtime/generate-locales'
import type { DomainI18nOptions } from '../runtime/types'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => resolve(here, 'fixtures', name)
const sharedRuntimeDir = resolve(here, '../../shared/runtime')
const pagesRuntimeDir = resolve(here, '../../pages/runtime')

const baseOptions: DomainI18nOptions = {
    domainsDir: 'app/domains',
    sharedI18nDirs: [],
    sharedMessagesNamespace: 'global',
    subDomainsDirName: 'domains',
    domainSegmentKeyFormat: 'snake_case',
}

describe('generateLocales', () => {
    let outputDir: string

    beforeEach(() => {
        outputDir = mkdtempSync(resolve(tmpdir(), 'domain-i18n-'))
    })

    afterEach(() => {
        rmSync(outputDir, { recursive: true, force: true })
    })

    it('agrège shared, domaines et sous-domaines', async () => {
        const rootDir = fixture('')
        await generateLocales({
            rootDir,
            domainsRoot: rootDir,
            outputDir,
            options: {
                ...baseOptions,
                sharedI18nDirs: [resolve(rootDir, 'shared-i18n')],
            },
            nuxt: {
                options: {
                    i18n: {
                        locales: [{ code: 'en', file: 'en.json' }],
                    },
                },
            },
            sharedRuntimeDir,
            pagesRuntimeDir,
            debugLog: () => {},
        })

        const compiled = JSON.parse(
            readFileSync(resolve(outputDir, 'en.json'), 'utf8')
        )
        expect(compiled).toEqual({
            global: {
                appName: 'TestApp',
                common: { save: 'Save' },
            },
            home: {
                title: 'Home',
                emailPlaceholder: 'you\\@example.com',
            },
            shop: { checkout: { title: 'Checkout' } },
        })
    })
})
