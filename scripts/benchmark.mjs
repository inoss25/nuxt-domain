import fg from 'fast-glob'
import { createViteServer } from 'vitest/node'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

const rootDir = process.cwd()
const domainCount = positiveInteger(process.env.DOMAIN_BENCH_DOMAINS, 50)
const pagesPerDomain = positiveInteger(process.env.DOMAIN_BENCH_PAGES, 10)
const localesPerDomain = positiveInteger(process.env.DOMAIN_BENCH_LOCALES, 2)
const iterations = positiveInteger(process.env.DOMAIN_BENCH_ITERATIONS, 7)
const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'nuxt-domain-bench-'))
const domainsRoot = resolve(fixtureRoot, 'app/domains')
const outputDir = resolve(fixtureRoot, '.nuxt/domain-i18n')
const sharedRuntimeDir = resolve(rootDir, 'shared/runtime')
const pagesRuntimeDir = resolve(rootDir, 'pages/runtime')
const debugLog = () => {}
const pagesOptions = { subDomainsDirName: 'domains' }
const i18nOptions = {
    domainsDir: 'app/domains',
    sharedI18nDirs: [],
    sharedMessagesNamespace: 'global',
    subDomainsDirName: 'domains',
    domainSegmentKeyFormat: 'snake_case',
}
const localeCodes = Array.from({ length: localesPerDomain }, (_, index) => `l${index + 1}`)

function positiveInteger(value, fallback) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function writeFixtureFile(path, content) {
    mkdirSync(resolve(path, '..'), { recursive: true })
    writeFileSync(path, content)
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function measure(label, operation, count = iterations) {
    await operation() // warmup: exclude one-off JIT/module initialization
    const samples = []
    for (let i = 0; i < count; i++) {
        const start = performance.now()
        await operation()
        samples.push(performance.now() - start)
    }
    const med = median(samples)
    const min = Math.min(...samples)
    const p95 = [...samples].sort((a, b) => a - b)[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)]
    console.log(`${label.padEnd(42)} médiane ${med.toFixed(2)} ms | min ${min.toFixed(2)} ms | p95 ${p95.toFixed(2)} ms`)
}

let vite
try {
    for (let domainIndex = 0; domainIndex < domainCount; domainIndex++) {
        const domain = `domain-${domainIndex + 1}`
        const domainDir = resolve(domainsRoot, domain)
        writeFixtureFile(resolve(domainDir, 'domain.config.ts'), 'export default {}\n')
        for (const kind of ['components', 'composables', 'layouts', 'public', 'stores', 'utils']) {
            mkdirSync(resolve(domainDir, kind), { recursive: true })
        }
        writeFixtureFile(resolve(domainDir, 'components/Example.vue'), '<template><div /></template>\n')
        writeFixtureFile(resolve(domainDir, 'composables/useExample.ts'), 'export const useExample = () => true\n')
        writeFixtureFile(resolve(domainDir, 'layouts/default.vue'), '<template><slot /></template>\n')
        writeFixtureFile(resolve(domainDir, 'public/example.svg'), '<svg/>\n')
        for (let pageIndex = 0; pageIndex < pagesPerDomain; pageIndex++) {
            writeFixtureFile(resolve(domainDir, `pages/page-${pageIndex + 1}.vue`), '<template><div>Benchmark page</div></template>\n')
        }
        for (const locale of localeCodes) {
            writeFixtureFile(resolve(domainDir, `i18n/${locale}.json`), JSON.stringify({ title: `${domain} ${locale}`, common: { save: 'Save' } }))
        }
    }

    vite = await createViteServer({
        configFile: false,
        root: rootDir,
        logLevel: 'error',
        server: { middlewareMode: true },
        appType: 'custom',
    })
    const [{ createDomainConfigCache }, { loadDomainConfigs }, { generateDomainRoutes }, { generateLocales }] = await Promise.all([
        vite.ssrLoadModule('/shared/runtime/config-loader.ts'),
        vite.ssrLoadModule('/pages/runtime/config-loader.ts'),
        vite.ssrLoadModule('/pages/runtime/route-generator.ts'),
        vite.ssrLoadModule('/i18n/runtime/generate-locales.ts'),
    ])

    const warmConfigCache = createDomainConfigCache()
    const configs = await loadDomainConfigs(domainsRoot, pagesOptions, sharedRuntimeDir, pagesRuntimeDir, debugLog, warmConfigCache)
    const localeParams = {
        rootDir: fixtureRoot,
        domainsRoot,
        outputDir,
        options: i18nOptions,
        nuxt: { options: { i18n: { locales: localeCodes } } },
        sharedRuntimeDir,
        pagesRuntimeDir,
        debugLog,
        configCache: warmConfigCache,
    }

    const totalPages = domainCount * pagesPerDomain
    const totalLocaleFiles = domainCount * localesPerDomain
    console.log(`Benchmark nuxt-domain : ${domainCount} domaines, ${totalPages} pages, ${totalLocaleFiles} fichiers i18n`)
    console.log(`Échantillons : ${iterations} par mesure; temps en millisecondes (médiane/min/p95).\n`)

    await measure('Chargement des configs (cache froid)', () =>
        loadDomainConfigs(domainsRoot, pagesOptions, sharedRuntimeDir, pagesRuntimeDir, debugLog, createDomainConfigCache())
    )
    await measure('Chargement des configs (cache chaud)', () =>
        loadDomainConfigs(domainsRoot, pagesOptions, sharedRuntimeDir, pagesRuntimeDir, debugLog, warmConfigCache)
    )
    await measure('Scan auto-imports, layouts et public', async () => {
        await Promise.all([
            fg(['**/components', '**/composables', '**/public', '**/stores', '**/utils'], {
                cwd: domainsRoot,
                onlyDirectories: true,
            }),
            fg('**/layouts/**/*.vue', { cwd: domainsRoot }),
        ])
    })
    await measure(`Génération de ${totalPages} routes`, () =>
        generateDomainRoutes(domainsRoot, configs, pagesOptions, debugLog)
    )
    await measure(`Génération i18n (${totalLocaleFiles} fichiers)`, () => generateLocales(localeParams))
} finally {
    await vite?.close()
    rmSync(fixtureRoot, { recursive: true, force: true })
}
