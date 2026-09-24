import { describe, it, expect } from 'vitest'
import { isDomainEnabled } from '../runtime/domain-enabled'
import type { DomainConfigPathFields } from '../runtime/types'

describe('isDomainEnabled', () => {
  it('retourne false si un ancêtre est désactivé', () => {
    const configs = new Map<string, DomainConfigPathFields>([
      ['shop', { enabled: false }],
      ['shop/checkout', { enabled: true }],
    ])
    expect(isDomainEnabled(configs, 'shop/checkout')).toBe(false)
  })

  it('retourne true si la chaîne est active', () => {
    const configs = new Map<string, DomainConfigPathFields>([
      ['shop', { enabled: true }],
      ['shop/checkout', { enabled: true }],
    ])
    expect(isDomainEnabled(configs, 'shop/checkout')).toBe(true)
  })
})
