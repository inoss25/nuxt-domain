import fg from 'fast-glob'
import { resolve, relative } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import {
    loadDomainConfigs,
    type DomainConfigCache,
} from '../shared/config-loader'
import type { DomainDiagnostic } from '../shared/diagnostics'
import { reportDiagnostics } from '../shared/diagnostics'
import { isDomainEnabled } from '../shared/domain-enabled'
import { writeIfChanged } from '../shared/fs'
import {
    normalizeDomainParts,
    toPosixPath,
} from '../shared/paths'
import {
    createDomainScanCache,
    getDomainTreeScan,
    type DomainScanCache,
} from '../shared/scan'
import type { DomainConfigPathFields } from '../shared/types'
import {
    formatDomainSegmentForI18nKey,
    resolveLocaleCodeFromPathSegments,
} from './locale'
import { isPlainObject, mergeAtDomainPath } from './merge'
import { resolveI18nValidation } from './resolve-i18n-options'
import type { DomainI18nOptions } from './types'
import {
    collectI18nLeafKeys,
    createI18nKeyTracker,
    generateTypedI18nDts,
} from './typed-i18n'
import {
    collectLeavesByLocale,
    detectMergeTypeConflict,
    validateInterpolationAcrossLocales,
    validateJsonKeyFormat,
    validateLocaleStructures,
} from './validate-i18n'

/**
 * Lit les fichiers avec un parallélisme plafonné. Une erreur de lecture est renvoyée comme
 * valeur (et non levée) pour que la première erreur reste celle, dans l'ordre
 * trié des fichiers, du fichier concerné — comme avec la lecture séquentielle.
 */
async function readTexts(absPaths: string[]): Promise<Array<string | Error>> {
    const results: Array<string | Error> = new Array(absPaths.length)
    // Garde un parallélisme utile sans ouvrir simultanément un descripteur par
    // fichier lorsque les projets contiennent de gros catalogues de locales.
    let nextIndex = 0
    const workerCount = Math.min(absPaths.length, 32)
    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (true) {
                const index = nextIndex++
                if (index >= absPaths.length) return
                try {
                    results[index] = await readFile(absPaths[index]!, 'utf8')
                } catch (e) {
                    results[index] = e instanceof Error ? e : new Error(String(e))
                }
            }
        })
    )
    return results
}

function parseJsonText(
    raw: string | Error,
    absPath: string
): Record<string, unknown> {
    if (raw instanceof Error) throw raw
    try {
        const data = JSON.parse(raw) as unknown
        if (!isPlainObject(data)) {
            throw new Error('The JSON root must be an object.')
        }
        return data
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new Error(
            `[domain-i18n] Invalid JSON: ${absPath}\n${msg}\nCheck the JSON syntax (commas, quotes, braces).`
        )
    }
}

/**
 * Partie de `nuxt.options` lue par le module. `@nuxtjs/i18n` étant optionnel,
 * on ne dépend pas de son augmentation de `NuxtOptions`.
 */
export interface NuxtI18nHost {
    options: {
        i18n?: {
            locales?: unknown
            defaultLocale?: string
            [key: string]: unknown
        }
    }
}

export function collectLocaleCodesFromNuxt(nuxt: NuxtI18nHost): Set<string> {
    const codes = new Set<string>()
    const locales = nuxt.options.i18n?.locales
    if (!Array.isArray(locales)) return codes
    for (const loc of locales) {
        if (typeof loc === 'string') {
            codes.add(loc)
            continue
        }
        if (loc && typeof loc === 'object' && 'code' in loc && loc.code) {
            codes.add(String(loc.code))
        }
    }
    return codes
}

function resolveReferenceLocale(
    nuxt: NuxtI18nHost,
    explicit?: string
): string | undefined {
    if (explicit) return explicit
    const d = nuxt.options.i18n?.defaultLocale
    return typeof d === 'string' ? d : undefined
}

export interface GenerateLocalesParams {
    rootDir: string
    domainsRoot: string
    outputDir: string
    options: DomainI18nOptions
    nuxt: NuxtI18nHost
    sharedRuntimeDir: string
    pagesRuntimeDir: string
    debugLog: (...args: unknown[]) => void
    /** Cache partagé des `domain.config.ts` (voir `getDomainConfigCache`). */
    configCache?: DomainConfigCache
    /** Index partagé de l'arborescence (voir `getDomainScanCache`). */
    scanCache?: DomainScanCache
}

export async function generateLocales(params: GenerateLocalesParams) {
    const {
        rootDir,
        domainsRoot,
        outputDir,
        options,
        nuxt,
        sharedRuntimeDir,
        pagesRuntimeDir,
        debugLog,
        configCache,
    } = params
    // Sans cache fourni, un cache local évite de scanner deux fois (configs + JSON).
    const scanCache = params.scanCache ?? createDomainScanCache()

    const validation = resolveI18nValidation(options)
    const strict = validation.strict
    const diagnostics: DomainDiagnostic[] = []

    const conflictsByLocale = new Map<
        string,
        ReturnType<typeof createI18nKeyTracker>
    >()

    const getTracker = (code: string) => {
        if (!conflictsByLocale.has(code)) {
            conflictsByLocale.set(code, createI18nKeyTracker())
        }
        return conflictsByLocale.get(code)!
    }

    const trackParsed = (
        parsed: Record<string, unknown>,
        prefixSegments: string[],
        source: string,
        localeCode: string
    ) => {
        if (!validation.detectDuplicates) return
        const tracker = getTracker(localeCode)
        const walk = (obj: Record<string, unknown>, prefix: string) => {
            for (const [k, v] of Object.entries(obj)) {
                const next = prefix ? `${prefix}.${k}` : k
                if (isPlainObject(v)) walk(v, next)
                else {
                    const conflict = tracker.track(next, source)
                    if (conflict) {
                        diagnostics.push({
                            ...conflict,
                            level: 'error',
                            file: source,
                        })
                    }
                }
            }
        }
        walk(parsed, prefixSegments.join('.'))
    }

    const ingestJson = (
        parsed: Record<string, unknown>,
        absPath: string,
        sourceLabel: string
    ) => {
        if (validation.keyFormat) {
            diagnostics.push(
                ...validateJsonKeyFormat(
                    parsed,
                    validation.keyFormat,
                    absPath
                )
            )
        }
        return { parsed, sourceLabel }
    }

    if (!existsSync(domainsRoot)) {
        debugLog('⚠️ [domain-i18n] domainsDir missing, skipping', domainsRoot)
    }

    const { configs: domainConfigs } = existsSync(domainsRoot)
        ? await loadDomainConfigs<DomainConfigPathFields>({
              domainsRoot,
              options,
              sharedRuntimeDir,
              pagesRuntimeDir,
              moduleLabel: 'domain-i18n',
              debugLog,
              cache: configCache,
              scanCache,
          })
        : { configs: new Map<string, DomainConfigPathFields>() }

    const byLocale = new Map<string, Record<string, unknown>>()
    const diskLocales = new Set<string>()

    const ensureLocale = (code: string) => {
        if (!byLocale.has(code)) byLocale.set(code, {})
        return byLocale.get(code)!
    }

    const sharedNs = options.sharedMessagesNamespace ?? 'global'
    const domainKeyFormat = validation.domainKeyFormat

    const sharedDirs = (options.sharedI18nDirs ?? []).map((d) =>
        resolve(rootDir, d)
    )

    const sharedFilesNested = await Promise.all(
        sharedDirs.map(async (dir) => {
            if (!existsSync(dir)) {
                debugLog('ℹ️ [domain-i18n] shared dir missing (ok)', dir)
                return [] as Array<{ abs: string; rel: string; dir: string }>
            }
            const files = await fg('**/*.json', { cwd: dir, onlyFiles: true })
            return files.sort().map((rel) => ({
                abs: resolve(dir, rel),
                rel,
                dir,
            }))
        })
    )

    for (const batch of sharedFilesNested) {
        const texts = await readTexts(batch.map((f) => f.abs))
        for (const [i, { abs, rel, dir }] of batch.entries()) {
            const posixRel = toPosixPath(rel)
            const segs = posixRel.split('/').filter(Boolean)
            const code = resolveLocaleCodeFromPathSegments(segs)
            if (!code) continue
            diskLocales.add(code)
            const parsed = parseJsonText(texts[i]!, abs)
            ingestJson(parsed, abs, `${dir}/${rel}`)
            const root = ensureLocale(code)
            mergeAtDomainPath(root, [sharedNs], parsed, {
                source: `${dir}/${rel}`,
                onTypeConflict: (keyPath, prev, next) => {
                    const d = detectMergeTypeConflict(
                        prev,
                        next,
                        keyPath,
                        'previous merge',
                        `${dir}/${rel}`
                    )
                    if (d) diagnostics.push({ ...d, file: abs })
                },
            })
            trackParsed(parsed, [sharedNs], `${dir}/${rel}`, code)
            debugLog('📎 [domain-i18n] shared', { code, rel, namespace: sharedNs })
        }
    }

    if (existsSync(domainsRoot)) {
        const sortedDomainFiles = (await getDomainTreeScan(domainsRoot, scanCache)).i18nFiles
        const domainTexts = await readTexts(
            sortedDomainFiles.map((f) => resolve(domainsRoot, f))
        )

        for (const [fileIndex, file] of sortedDomainFiles.entries()) {
            const posix = toPosixPath(file)
            const idx = posix.lastIndexOf('/i18n/')
            if (idx === -1) continue

            const underDomain = posix.slice(0, idx)
            const rest = posix.slice(idx + '/i18n/'.length)
            if (!underDomain || !rest) continue

            const rawParts = underDomain.split('/').filter(Boolean)
            const normalizedSegments = normalizeDomainParts(
                domainConfigs,
                options,
                rawParts,
                debugLog,
                'domain-i18n'
            )
            const domainId = normalizedSegments.join('/')

            if (!isDomainEnabled(domainConfigs, domainId)) {
                debugLog('⏭️ [domain-i18n] domain disabled, skipping', domainId)
                continue
            }

            const domainSegments = normalizedSegments.map((s) =>
                formatDomainSegmentForI18nKey(s, domainKeyFormat)
            )

            const restSegs = rest.split('/').filter(Boolean)
            const code = resolveLocaleCodeFromPathSegments(restSegs)
            if (!code) continue
            diskLocales.add(code)

            const abs = resolve(domainsRoot, file)
            const parsed = parseJsonText(domainTexts[fileIndex]!, abs)
            ingestJson(parsed, abs, file)
            const root = ensureLocale(code)
            mergeAtDomainPath(root, domainSegments, parsed, {
                source: file,
                onTypeConflict: (keyPath, prev, next) => {
                    const d = detectMergeTypeConflict(
                        prev,
                        next,
                        keyPath,
                        'previous source',
                        file
                    )
                    if (d) diagnostics.push({ ...d, file: abs })
                },
            })
            trackParsed(parsed, domainSegments, file, code)

            debugLog('📦 [domain-i18n] domain', {
                file,
                normalizedPath: domainId,
                domainSegments,
                code,
            })
        }
    }

    const refLocale = resolveReferenceLocale(nuxt, validation.referenceLocale)
    // Feuilles calculées une seule fois, partagées par les validations et le typage.
    const leavesByLocale = collectLeavesByLocale(byLocale)

    diagnostics.push(
        ...validateLocaleStructures(
            byLocale,
            validation.validateLocaleStructure,
            refLocale,
            leavesByLocale
        )
    )

    if (validation.validateInterpolation) {
        diagnostics.push(
            ...validateInterpolationAcrossLocales(
                byLocale,
                refLocale,
                leavesByLocale
            )
        )
    }

    reportDiagnostics('domain-i18n', diagnostics, strict)

    const configured = collectLocaleCodesFromNuxt(nuxt)
    const allLocales = new Set<string>([...configured, ...diskLocales])

    for (const code of configured) {
        ensureLocale(code)
    }

    mkdirSync(outputDir, { recursive: true })

    const allKeys = new Set<string>()
    let keyCount = 0
    const sortedLocales = [...allLocales].sort()

    for (const code of sortedLocales) {
        const data = byLocale.get(code) ?? {}
        const leaves = leavesByLocale.get(code)
        for (const key of leaves ? leaves.keys() : collectI18nLeafKeys(data)) {
            allKeys.add(key)
            keyCount++
        }
        const content = `${JSON.stringify(data, null, 2)}\n`
        const outPath = resolve(outputDir, `${code}.json`)
        if (writeIfChanged(outPath, content)) {
            debugLog('✅ [domain-i18n] written', relative(rootDir, outPath))
        } else {
            debugLog('⏩ [domain-i18n] unchanged', relative(rootDir, outPath))
        }
    }

    const schemaLocale =
        refLocale && allLocales.has(refLocale) ? refLocale : sortedLocales[0]
    const typedContent = generateTypedI18nDts(allKeys, schemaLocale)
    writeIfChanged(resolve(outputDir, 'typed-i18n.d.ts'), typedContent)

    return { localeCount: allLocales.size, keyCount }
}
