import type { DomainConfigPathFields } from './types'

/** Vrai si aucun ancêtre ni le domaine lui-même n'a `enabled: false`. */
export function isDomainEnabled(
  domainConfigs: Map<string, DomainConfigPathFields>,
  domainId: string
): boolean {
  const parts = domainId.split('/').filter(Boolean)
  for (let i = 1; i <= parts.length; i++) {
    const id = parts.slice(0, i).join('/')
    if (domainConfigs.get(id)?.enabled === false) return false
  }
  return true
}
