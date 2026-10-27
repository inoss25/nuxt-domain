import type { DomainConfig, DomainPagesOptions } from './types'
import {
    loadDomainConfigs as loadDomainConfigsShared,
    type DomainConfigCache,
    type LoadDomainConfigsResult,
} from '../../shared/runtime/config-loader'
import type { DomainScanCache } from '../../shared/runtime/scan'

export type { LoadDomainConfigsResult }

/**
 * @param sharedRuntimeDir - Chemin absolu vers `shared/runtime`
 * @param pagesRuntimeDir - Chemin absolu vers `pages/runtime`
 * @param cache - Cache partagé des `domain.config.ts` (optionnel)
 * @param scanCache - Index partagé de l'arborescence (optionnel)
 */
export async function loadDomainConfigs(
    domainsRoot: string,
    options: DomainPagesOptions,
    sharedRuntimeDir: string,
    pagesRuntimeDir: string,
    debugLog?: (...args: unknown[]) => void,
    cache?: DomainConfigCache,
    scanCache?: DomainScanCache
): Promise<Map<string, DomainConfig>> {
    const { configs } = await loadDomainConfigsShared<DomainConfig>({
        domainsRoot,
        options,
        sharedRuntimeDir,
        pagesRuntimeDir,
        moduleLabel: 'domain-pages',
        debugLog,
        cache,
        scanCache,
        onConfigLoaded: ({ file, domainId, config }) => {
            debugLog?.('🧾 [domain-pages] domain.config chargé', {
                file,
                domainId,
                hasSubDomains: config?.hasSubDomains,
                subDomainsDirName: config?.subDomainsDirName,
            })
        },
    })
    return configs
}

export { normalizeDomainParts } from './utils'
