// `consola` directement (ce que renvoie `useLogger` de `nuxt/kit`) : ce fichier
// est aussi chargé par jiti via `#domain-pages`, où importer `nuxt/kit` échoue.
import { consola } from 'consola'

/** Logger de Nuxt : respecte `--logLevel` et le mode silencieux. */
export const logger = consola.withTag('nuxt-domain')

/** Traces détaillées, affichées uniquement avec l'option `debug`. */
export function createDebugLog(
    debug: boolean | undefined
): (...args: unknown[]) => void {
    return (...args) => {
        if (debug) logger.info(...(args as [unknown, ...unknown[]]))
    }
}
