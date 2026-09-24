export { defineDomainConfig } from './defineDomainConfig'
export { loadDomainConfigs } from './config-loader'
export { isDomainEnabled } from './domain-enabled'
export {
  toPosixPath,
  fileIsUnderRoot,
  isIgnoredDomainPath,
  getSubDomainsDirName,
  normalizeDomainParts,
} from './paths'
export type {
  DomainConfig,
  DomainConfigPathFields,
  DomainPathsOptions,
  DomainRouteOverride,
} from './types'
export type {
  LoadDomainConfigsResult,
  LoadDomainConfigsParams,
} from './config-loader'
