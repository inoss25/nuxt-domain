import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { validateDomainFolderNames } from '../runtime/validate-domain-names'

const here = dirname(fileURLToPath(import.meta.url))

describe('validateDomainFolderNames', () => {
    let root: string

    beforeEach(() => {
        root = mkdtempSync(resolve(tmpdir(), 'domain-names-'))
    })

    afterEach(() => {
        rmSync(root, { recursive: true, force: true })
    })

    it('détecte une collision trip-prices / trip_prices', async () => {
        const a = resolve(root, 'trip-prices')
        const b = resolve(root, 'trip_prices')
        mkdirSync(resolve(a, 'pages'), { recursive: true })
        mkdirSync(resolve(b, 'pages'), { recursive: true })
        writeFileSync(
            resolve(a, 'domain.config.ts'),
            'export default {}',
            'utf8'
        )
        writeFileSync(
            resolve(b, 'domain.config.ts'),
            'export default {}',
            'utf8'
        )

        const reports = await validateDomainFolderNames({
            domainsRoot: root,
            domainKeyFormat: 'snake_case',
            detectDuplicates: true,
        })

        expect(reports.some((r) => r.kind === 'domain-name')).toBe(true)
    })

    it('signale un dossier non kebab-case', async () => {
        const d = resolve(root, 'Bad_Name')
        mkdirSync(resolve(d, 'pages'), { recursive: true })
        writeFileSync(resolve(d, 'domain.config.ts'), 'export default {}')

        const reports = await validateDomainFolderNames({
            domainsRoot: root,
            domainNameFormat: 'kebab-case',
            domainKeyFormat: 'snake_case',
            detectDuplicates: false,
        })

        expect(reports.length).toBeGreaterThan(0)
    })
})
