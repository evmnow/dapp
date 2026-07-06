import type {
  ActionMeta as SdkActionMeta,
  ParamMeta as SdkParamMeta,
} from '@evmnow/sdk'

// The document types come from `@evmnow/sdk` — the canonical implementation
// of the contract-metadata standard — so the layer can never drift from the
// schema. The layer adds only what the SDK leaves untyped: tuple member
// metadata (`ParamMeta.components`) and the `_component` UI extension.

export type {
  ParamType as SemanticType,
  Autofill,
  ValidationRule,
  ParamPreview,
  ActionExample,
  ValueMeta,
  EventMeta,
  ErrorMeta,
  MessageMeta,
  AuditReference,
  Theme as ContractTheme,
} from '@evmnow/sdk'

export interface ParamMeta extends SdkParamMeta {
  /** Metadata for tuple members, keyed by component name or positional `_N`. */
  components?: Record<string, ParamMeta>
}

/**
 * The `_component` extension (see the standard's `extensions/_component.md`):
 * a custom UI component reference, as a bare name or `{ type, props }`.
 */
export type ComponentExtension =
  string | { type: string; about?: string; props?: Record<string, unknown> }

export interface ActionMeta extends SdkActionMeta {
  params?: Record<string, ParamMeta>
  returns?: Record<string, ParamMeta>
  _component?: ComponentExtension
}

export type ContractCategory =
  | 'token'
  | 'token-id'
  | 'nft'
  | 'defi'
  | 'governance'
  | 'bridge'
  | 'oracle'
  | 'utility'
  | 'game'
  | 'social'
  | 'identity'

export interface ContractMeta {
  name?: string
  symbol?: string
  description?: string
  image?: string
  banner_image?: string
  featured_image?: string
  external_link?: string
  collaborators?: string[]
  about?: string
  category?: ContractCategory | string
  links?: { label: string; url: string }[]
  tags?: string[]
  risks?: string[]
  audits?: import('@evmnow/sdk').AuditReference[]
  theme?: import('@evmnow/sdk').Theme
}

export interface ContractUIMetadata extends ContractMeta {
  $schema?: string
  chainId?: number
  address?: string
  includes?: string[]
  meta?: {
    version?: number
    lastUpdated?: string
    locale?: string
    signature?: string
  }
  groups?: Record<
    string,
    { label: string; description?: string; order: number }
  >
  actions?: Record<string, ActionMeta>
  events?: Record<string, import('@evmnow/sdk').EventMeta>
  errors?: Record<string, import('@evmnow/sdk').ErrorMeta>
  messages?: Record<string, import('@evmnow/sdk').MessageMeta>
  [key: `_${string}`]: unknown
}
