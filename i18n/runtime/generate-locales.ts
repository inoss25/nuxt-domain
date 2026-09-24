import fg from 'fast-glob'
import { resolve, relative } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { loadDomainConfigs } from '../../shared/runtime/config-loader'
import { isDomainEnabled } from '../../shared/runtime/domain-enabled'
import {
    normalizeDomainParts,
    toPosixPath,
} from '../../shared/runtime/paths'
import type { DomainConfigPathFields } from '../../shared/runtime/types'
import {
    formatDomainSegmentForI18nKey,
    resolveLocaleCodeFromPathSegments,
} from './locale'
import { isPlainObject, mergeAtDomainPath } from './merge'
import type { DomainI18nOptions } from './types'
import {
    collectI18nLeafKeys,
    createI18nKeyTracker,
    generateTypedI18nDts,
    reportI18nConflicts,
} from './typed-i18n'

function parseJsonFile(absPath: string): Record<string, unknown> {
    const raw = readFileSync(absPath, 'utf8')
    try {
        const data = JSON.parse(raw) as unknown
        if (!isPlainObject(data)) {
            throw new Error('La racine du JSON doit être un objet.')
        }
        return data
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new Error(`[domain-i18n] JSON invalide: ${absPath}\n${msg}`)
    }
}

function collectLocaleCodesFromNuxt(nuxt: {
    options: { i18n?: { locales?: unknown } }
}): Set<string> {
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

function writeIfChanged(outPath: string, content: string): boolean {
    if (existsSync(outPath)) {
        const prev = readFileSync(outPath, 'utf8')
        if (prev === content) return false
    }
    writeFileSync(outPath, content, 'utf8')
    return true
}

export interface GenerateLocalesParams {
    rootDir: string
    domainsRoot: string
    outputDir: string
    options: DomainI18nOptions
    nuxt: { options: { i18n?: { locales?: unknown } } }
    sharedRuntimeDir: string
    pagesRuntimeDir: string
    debugLog: (...args: unknown[]) => void
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
    } = params

    const strict = options.strict === true
    const conflictsByLocale = new Map<string, ReturnType<typeof createI18nKeyTracker>>()
    const i18nConflicts: NonNullable<ReturnType<ReturnType<typeof createI18nKeyTracker>['track']>>[] = []

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
        const tracker = getTracker(localeCode)
        const walk = (obj: Record<string, unknown>, parts: string[]) => {
            for (const [k, v] of Object.entries(obj)) {
                const next = [...parts, k]
                if (isPlainObject(v)) walk(v, next)
                else {
                    const conflict = tracker.track(next.join('.'), source)
                    if (conflict) i18nConflicts.push(conflict)
                }
            }
        }
        walk(parsed, prefixSegments)
    }

    if (!existsSync(domainsRoot)) {
        debugLog('⚠️ [domain-i18n] domainsDir absent, skip', domainsRoot)
    }

    const { configs: domainConfigs } = existsSync(domainsRoot)
        ? await loadDomainConfigs<DomainConfigPathFields>({
              domainsRoot,
              options,
              sharedRuntimeDir,
              pagesRuntimeDir,
              moduleLabel: 'domain-i18n',
              debugLog,
          })
        : { configs: new Map<string, DomainConfigPathFields>() }

    const byLocale = new Map<string, Record<string, unknown>>()
    const diskLocales = new Set<string>()

    const ensureLocale = (code: string) => {
        if (!byLocale.has(code)) byLocale.set(code, {})
        return byLocale.get(code)!
    }

    const sharedNs = options.sharedMessagesNamespace ?? 'global'

    const sharedDirs = (options.sharedI18nDirs ?? []).map((d) =>
        resolve(rootDir, d)
    )

    const sharedFilesNested = await Promise.all(
        sharedDirs.map(async (dir) => {
            if (!existsSync(dir)) {
                debugLog('ℹ️ [domain-i18n] shared absent (ok)', dir)
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
        for (const { abs, rel, dir } of batch) {
            const posixRel = toPosixPath(rel)
            const segs = posixRel.split('/').filter(Boolean)
            const code = resolveLocaleCodeFromPathSegments(segs)
            if (!code) continue
            diskLocales.add(code)
            const parsed = parseJsonFile(abs)
            const root = ensureLocale(code)
            mergeAtDomainPath(root, [sharedNs], parsed)
            trackParsed(parsed, [sharedNs], `${dir}/${rel}`, code)
            debugLog('📎 [domain-i18n] shared', { code, rel, namespace: sharedNs })
        }
    }

    if (existsSync(domainsRoot)) {
        const domainJsonFiles = await fg('**/i18n/**/*.json', {
            cwd: domainsRoot,
            onlyFiles: true,
            ignore: ['**/_*/**'],
        })

        for (const file of domainJsonFiles.sort()) {
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
                debugLog('⏭️ [domain-i18n] domaine désactivé, skip', domainId)
                continue
            }

            const keyFormat = options.domainSegmentKeyFormat ?? 'snake_case'
            const domainSegments = normalizedSegments.map((s) =>
                formatDomainSegmentForI18nKey(s, keyFormat)
            )

            const restSegs = rest.split('/').filter(Boolean)
            const code = resolveLocaleCodeFromPathSegments(restSegs)
            if (!code) continue
            diskLocales.add(code)

            const abs = resolve(domainsRoot, file)
            const parsed = parseJsonFile(abs)
            const root = ensureLocale(code)
            mergeAtDomainPath(root, domainSegments, parsed)
            trackParsed(parsed, domainSegments, file, code)

            debugLog('📦 [domain-i18n] domain', {
                file,
                normalizedPath: domainId,
                domainSegments,
                code,
            })
        }
    }

    reportI18nConflicts(i18nConflicts, strict)

    const configured = collectLocaleCodesFromNuxt(nuxt)
    const allLocales = new Set<string>([...configured, ...diskLocales])

    for (const code of configured) {
        ensureLocale(code)
    }

    mkdirSync(outputDir, { recursive: true })

    const allKeys: string[] = []

    for (const code of allLocales) {
        const data = byLocale.get(code) ?? {}
        allKeys.push(...collectI18nLeafKeys(data))
        const content = `${JSON.stringify(data, null, 2)}\n`
        const outPath = resolve(outputDir, `${code}.json`)
        if (writeIfChanged(outPath, content)) {
            debugLog('✅ [domain-i18n] écrit', relative(rootDir, outPath))
        } else {
            debugLog('⏩ [domain-i18n] inchangé', relative(rootDir, outPath))
        }
    }

    const typedContent = generateTypedI18nDts(allKeys)
    writeIfChanged(resolve(outputDir, 'typed-i18n.d.ts'), typedContent)

    return { localeCount: allLocales.size, keyCount: allKeys.length }
}
