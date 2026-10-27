import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/** Dernier contenu écrit par processus : évite de relire le fichier à chaque génération. */
const lastWritten = new Map<string, string>()

/**
 * N'écrit que si le contenu change (évite de réveiller watchers et TS server).
 * @returns true si le fichier a été écrit.
 */
export function writeIfChanged(path: string, content: string): boolean {
    if (existsSync(path)) {
        const prev = lastWritten.get(path) ?? readFileSync(path, 'utf8')
        if (prev === content) {
            lastWritten.set(path, content)
            return false
        }
    }
    writeFileSync(path, content, 'utf8')
    lastWritten.set(path, content)
    return true
}
