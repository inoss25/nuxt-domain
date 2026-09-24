import { describe, it, expect } from 'vitest'
import {
    formatDomainSegmentForI18nKey,
    localeCodeFromFilename,
    resolveLocaleCodeFromPathSegments,
} from '../runtime/locale'

describe('formatDomainSegmentForI18nKey', () => {
    it('convertit en snake_case par défaut', () => {
        expect(formatDomainSegmentForI18nKey('user-profile', 'snake_case')).toBe(
            'user_profile'
        )
        expect(formatDomainSegmentForI18nKey('Home', 'snake_case')).toBe('home')
    })

    it('préserve le nom du dossier', () => {
        expect(formatDomainSegmentForI18nKey('user-profile', 'preserve')).toBe(
            'user-profile'
        )
    })
})

describe('localeCodeFromFilename', () => {
    it('extrait le code depuis le nom de fichier', () => {
        expect(localeCodeFromFilename('en.json')).toBe('en')
        expect(localeCodeFromFilename('fr.json')).toBe('fr')
        expect(localeCodeFromFilename('en-US.json')).toBe('en-US')
        expect(localeCodeFromFilename('readme.txt')).toBeNull()
    })
})

describe('resolveLocaleCodeFromPathSegments', () => {
    it('accepte un fichier plat en.json', () => {
        expect(resolveLocaleCodeFromPathSegments(['en.json'])).toBe('en')
    })

    it('accepte un dossier par locale', () => {
        expect(resolveLocaleCodeFromPathSegments(['fr', 'partials.json'])).toBe(
            'fr'
        )
    })

    it('rejette un premier segment invalide', () => {
        expect(
            resolveLocaleCodeFromPathSegments(['bad locale', 'x.json'])
        ).toBeNull()
    })
})
