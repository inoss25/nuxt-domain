import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { tryResolveModule } from 'nuxt/kit'
import type { Nuxt, ModuleDependencies } from '@nuxt/schema'
import type { DomainLocaleInput } from './runtime/i18n/types'
import type { DomainModuleOptions } from './types'

const I18N_MODULE = '@nuxtjs/i18n'
const I18N_VERSION = '>=10.0.0'

type I18nConfig = Record<string, unknown>

function isI18nModuleEntry(entry: unknown): boolean {
    const name = Array.isArray(entry) ? entry[0] : entry
    return name === I18N_MODULE
}

/** Fichier JSON généré pour chaque locale : `<code>.json` dans `outputDir`. */
export function toI18nLocales(
    locales: DomainLocaleInput[]
): Array<Record<string, unknown>> {
    return locales.map((locale) =>
        typeof locale === 'string'
            ? { code: locale, file: `${locale}.json` }
            : { file: `${locale.code}.json`, ...locale }
    )
}

/**
 * `langDir` de `@nuxtjs/i18n` est relatif à son dossier `restructureDir`
 * (`i18n` par défaut) : on le fait pointer sur notre `outputDir`.
 */
export function resolveLangDir(
    rootDir: string,
    outputDir: string,
    i18nConfig: I18nConfig
): string {
    const baseDirName =
        typeof i18nConfig.restructureDir === 'string'
            ? i18nConfig.restructureDir
            : typeof i18nConfig.dir === 'string'
              ? i18nConfig.dir
              : 'i18n'
    const baseDir = isAbsolute(baseDirName)
        ? baseDirName
        : resolve(rootDir, baseDirName)
    const rel = relative(baseDir, resolve(rootDir, outputDir)).replace(/\\/g, '/')
    return rel && !rel.startsWith('..') ? rel : 'locales'
}

/**
 * Valeurs par défaut de `@nuxtjs/i18n` déduites de `domain.i18n` : la config
 * `i18n` de l'utilisateur reste prioritaire.
 */
export function resolveI18nDefaults(
    domainOptions: DomainModuleOptions | undefined,
    i18nConfig: I18nConfig
): I18nConfig {
    const domainI18n = domainOptions?.i18n || {}
    const defaults: I18nConfig = {}
    if (domainI18n.defaultLocale) {
        defaults.defaultLocale = domainI18n.defaultLocale
    }
    // Les fichiers sont enregistrés via `i18n:registerModule` ; ces locales
    // servent aux codes connus (génération, validation). `defu` concaténant
    // les tableaux, on ne les propose que si l'utilisateur n'en déclare pas.
    if (domainI18n.locales?.length && !i18nConfig.locales) {
        defaults.locales = toI18nLocales(domainI18n.locales)
    }
    return defaults
}

/**
 * Les types générés par Nuxt (`i18n:` dans `nuxt.config`) importent
 * `@nuxtjs/i18n` depuis le projet, où pnpm ne l'expose pas quand seul
 * nuxt-domain le fournit : on y fait pointer un `paths` TypeScript.
 */
export async function exposeBundledI18nTypes(nuxt: Nuxt): Promise<void> {
    if (nuxt.options.modules.some(isI18nModuleEntry)) return
    const pkgJson = await tryResolveModule(
        `${I18N_MODULE}/package.json`,
        import.meta.url
    )
    if (!pkgJson) return
    const pkgDir = dirname(pkgJson)

    nuxt.hook('prepare:types', ({ tsConfig, nodeTsConfig, sharedTsConfig }) => {
        // `nodeTsConfig` et `sharedTsConfig` n'existent qu'à partir de Nuxt 4.
        for (const config of [tsConfig, nodeTsConfig, sharedTsConfig]) {
            if (!config) continue
            config.compilerOptions ??= {}
            config.compilerOptions.paths ??= {}
            config.compilerOptions.paths[I18N_MODULE] ??= [pkgDir]
        }
    })
}

/**
 * Installe `@nuxtjs/i18n` avec nuxt-domain. Nuxt résout les dépendances depuis
 * le projet : sans installation explicite par l'utilisateur (cas pnpm), on
 * pointe vers la copie fournie avec nuxt-domain.
 */
export async function getI18nModuleDependencies(
    nuxt: Nuxt
): Promise<ModuleDependencies> {
    const options = nuxt.options as typeof nuxt.options & {
        domain?: DomainModuleOptions
        i18n?: I18nConfig
    }
    if (options.domain?.i18n === false) return {}

    const defaults = resolveI18nDefaults(options.domain, options.i18n ?? {})
    const declaredByUser = options.modules.some(isI18nModuleEntry)
    const target = declaredByUser
        ? I18N_MODULE
        : ((await tryResolveModule(I18N_MODULE, import.meta.url)) ?? I18N_MODULE)

    return {
        [target]: { version: I18N_VERSION, defaults },
    }
}
