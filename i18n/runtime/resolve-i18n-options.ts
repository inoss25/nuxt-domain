import {
    optionalNameFormat,
    resolveDomainKeyFormat,
    type NameFormat,
} from '../../shared/runtime/naming'
import type { DomainI18nOptions } from './types'
import type { LocaleStructureMode } from './validate-i18n'

export interface ResolvedI18nValidation {
    domainKeyFormat: NameFormat
    keyFormat?: NameFormat
    detectDuplicates: boolean
    validateInterpolation: boolean
    validateLocaleStructure: LocaleStructureMode
    referenceLocale?: string
    strict: boolean
}

export function resolveI18nValidation(
    options: DomainI18nOptions
): ResolvedI18nValidation {
    return {
        domainKeyFormat: resolveDomainKeyFormat(options),
        keyFormat: optionalNameFormat(
            options.keyFormat,
            'domain.i18n.keyFormat'
        ),
        detectDuplicates: options.detectDuplicates !== false,
        validateInterpolation: options.validateInterpolation === true,
        validateLocaleStructure: options.validateLocaleStructure ?? false,
        referenceLocale: options.referenceLocale,
        strict: options.strict === true,
    }
}
