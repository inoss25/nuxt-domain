#!/usr/bin/env node
/**
 * Crée un squelette de domaine sous app/domains/<name>/ (ou DOMAINS_DIR).
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createJiti } from 'jiti'

const jiti = createJiti(import.meta.url)
const { conformsToNameFormat, resolveNameFormat, formatName } = jiti(
    '../shared/runtime/naming.ts'
)

const args = process.argv.slice(2)

function usage() {
    console.log(`
Usage: create-domain <nom-du-domaine> [options]

Options:
  --domains-dir <path>     Racine des domaines (défaut: app/domains ou DOMAINS_DIR)
  --name-format <format>   Convention du dossier (snake_case | camelCase | PascalCase | kebab-case)
                           Défaut: kebab-case ou DOMAIN_NAME_FORMAT
  --i18n <codes>           Locales JSON (ex: fr,en)
  --prefix <segment>       prefix dans domain.config.ts (défaut: nom du domaine)
  --no-pages               Ne pas créer pages/index.vue
  -h, --help               Aide

Exemples:
  pnpm create-domain authentication
  pnpm create-domain shop --i18n fr,en --name-format kebab-case
`)
}

let domainsDir = process.env.DOMAINS_DIR ?? 'app/domains'
let nameFormatRaw = process.env.DOMAIN_NAME_FORMAT ?? 'kebab-case'
let name = ''
let i18nLocales = []
let prefix = ''
let withPages = true

for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-h' || arg === '--help') {
        usage()
        process.exit(0)
    }
    if (arg === '--domains-dir') {
        domainsDir = args[++i] ?? domainsDir
        continue
    }
    if (arg === '--name-format') {
        nameFormatRaw = args[++i] ?? nameFormatRaw
        continue
    }
    if (arg === '--i18n') {
        const raw = args[++i] ?? ''
        i18nLocales = raw.split(',').map((s) => s.trim()).filter(Boolean)
        continue
    }
    if (arg === '--prefix') {
        prefix = args[++i] ?? ''
        continue
    }
    if (arg === '--no-pages') {
        withPages = false
        continue
    }
    if (!arg.startsWith('-') && !name) {
        name = arg
    }
}

if (!name) {
    console.error('Erreur: indiquez un nom de domaine (ex: authentication).')
    usage()
    process.exit(1)
}

let nameFormat
try {
    nameFormat = resolveNameFormat(
        nameFormatRaw,
        'kebab-case',
        'name-format / DOMAIN_NAME_FORMAT'
    )
} catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
}

if (!conformsToNameFormat(name, nameFormat)) {
    const suggestion = formatName(name, nameFormat)
    console.error(
        `Erreur: le nom "${name}" ne respecte pas la convention ${nameFormat}.` +
            (suggestion ? `\nSuggestion: ${suggestion}` : '')
    )
    process.exit(1)
}

const root = process.cwd()
const domainRoot = resolve(root, domainsDir, name)

if (existsSync(domainRoot)) {
    console.error(`Erreur: le dossier existe déjà: ${domainRoot}`)
    process.exit(1)
}

const routePrefix = prefix || name

const domainConfig = `import { defineDomainConfig } from '#domain-pages'

export default defineDomainConfig({
    enabled: true,
    prefix: '${routePrefix}',
})
`

const indexVue = `<script setup lang="ts">
// Page d'accueil du domaine « ${name} » → /${routePrefix}
</script>

<template>
  <div>
    <h1>${name}</h1>
  </div>
</template>
`

const dirs = [
    'pages',
    'components',
    'composables',
    'layouts',
    'stores',
    'utils',
]

for (const dir of dirs) {
    mkdirSync(resolve(domainRoot, dir), { recursive: true })
}

writeFileSync(resolve(domainRoot, 'domain.config.ts'), domainConfig, 'utf8')

if (withPages) {
    writeFileSync(resolve(domainRoot, 'pages', 'index.vue'), indexVue, 'utf8')
}

for (const locale of i18nLocales) {
    const i18nDir = resolve(domainRoot, 'i18n')
    mkdirSync(i18nDir, { recursive: true })
    const json = JSON.stringify(
        {
            title: name.charAt(0).toUpperCase() + name.slice(1),
        },
        null,
        2
    )
    writeFileSync(resolve(i18nDir, `${locale}.json`), `${json}\n`, 'utf8')
}

console.log(`✅ Domaine créé: ${domainRoot}`)
console.log('')
console.log('Structure:')
console.log(`  ${domainsDir}/${name}/`)
console.log('    domain.config.ts')
if (withPages) console.log('    pages/index.vue')
for (const dir of dirs.filter((d) => d !== 'pages')) {
    console.log(`    ${dir}/`)
}
if (i18nLocales.length) {
    console.log(`    i18n/${i18nLocales.map((l) => `${l}.json`).join(', ')}`)
}
console.log('')
console.log('Prochaines étapes:')
console.log('  1. Lancez pnpm dev (ou nuxt dev)')
console.log(`  2. Ouvrez la route /${routePrefix}`)
