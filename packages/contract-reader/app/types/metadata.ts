export type SemanticType =
  | 'eth'
  | 'gwei'
  | 'timestamp'
  | 'address'
  | 'boolean'
  | 'blocknumber'
  | 'duration'
  | 'bytes32-utf8'
  | 'token-id'
  | 'percentage'
  | 'basis-points'
  | 'token-amount'
  | 'date'
  | 'datetime'
  | 'hidden'
  | { type: 'address'; ens?: boolean; addressBook?: boolean }
  | { type: 'token-amount'; tokenAddress: string }
  | { type: 'amount'; decimals?: number; symbol?: string }
  | { type: 'token-id'; tokenAddress: string }
  | { type: 'enum'; values: Record<string, string> }
  | { type: 'slider'; min: string; max: string; step?: string }

export type Autofill =
  | 'connected-address'
  | 'contract-address'
  | 'zero-address'
  | 'block-timestamp'
  | { type: 'constant'; value: string }

export interface ValidationRule {
  min?: string
  max?: string
  enum?: { value: string; label: string }[]
  pattern?: string
  message?: string
}

export interface ParamPreview {
  image?: string
}

export interface ParamMeta {
  label?: string
  description?: string
  type?: SemanticType
  autofill?: Autofill
  validation?: ValidationRule
  preview?: ParamPreview
  components?: Record<string, ParamMeta>
  /**
   * Input-side: don't render an input for this parameter; inject the autofill
   * value at call time. REQUIRES `autofill`. Orthogonal to `type: "hidden"`
   * which is display-side.
   */
  hidden?: boolean
  /**
   * Input-side: render the input but non-editable. REQUIRES `autofill`.
   * Mutually exclusive with `hidden: true`.
   */
  disabled?: boolean
  [key: `_${string}`]: unknown
}

export interface ActionExample {
  label: string
  params: Record<string, string>
}

/**
 * Metadata for the native currency (msg.value) sent with a payable call.
 * Always denominated in wei and rendered as the `eth` semantic type — hence
 * no `type` field. Shares lock semantics (`hidden`/`disabled` + `autofill`)
 * with parameters.
 */
export interface ValueMeta {
  label?: string
  description?: string
  /** Pre-populate the value input. A constant is denominated in wei. */
  autofill?: Autofill
  validation?: ValidationRule
  /** Do not render a value input; the `autofill` value is attached at call time. REQUIRES `autofill`. */
  hidden?: boolean
  /** Render the value input non-editable (e.g. a fixed mint price). REQUIRES `autofill`. Mutually exclusive with `hidden`. */
  disabled?: boolean
  [key: `_${string}`]: unknown
}

export type ComponentExtension =
  string | { type: string; about?: string; props?: Record<string, unknown> }

export interface ContractTheme {
  background?: string
  text?: string
  accent?: string
  accentText?: string
  border?: string
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

export interface AuditReference {
  auditor: string
  url: string
  date: string
  scope?: string
}

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
  audits?: AuditReference[]
  theme?: ContractTheme
}

export interface ActionMeta {
  /**
   * Reference to the ABI function this action invokes. Accepts a bare name,
   * full Solidity signature (for overloads), or 4-byte selector.
   *
   * Optional — when omitted, the action's id is used as the reference.
   * Variants whose id differs from the underlying function name MUST set
   * this explicitly.
   */
  function?: string
  order?: number
  title?: string
  description?: string
  group?: string
  warning?: string
  stateMutability?: 'view' | 'pure' | 'nonpayable' | 'payable'
  params?: Record<string, ParamMeta>
  /**
   * Metadata for the native currency (msg.value) sent with the call.
   * Only meaningful on payable functions.
   */
  value?: ValueMeta
  returns?: Record<string, ParamMeta>
  examples?: ActionExample[]
  /** Identifiers of related actions (keys in the top-level `actions` object). */
  related?: string[]
  intent?: string
  featured?: boolean
  hidden?: boolean
  deprecated?: string
  _component?: ComponentExtension
  [key: `_${string}`]: unknown
}

export interface EventMeta {
  order?: number
  title?: string
  description?: string
  params?: Record<string, ParamMeta>
  [key: `_${string}`]: unknown
}

export interface ErrorMeta {
  order?: number
  title?: string
  description?: string
  params?: Record<string, ParamMeta>
  [key: `_${string}`]: unknown
}

export interface MessageMeta {
  order?: number
  title?: string
  description?: string
  warning?: string
  intent?: string
  fields?: Record<string, ParamMeta>
  [key: `_${string}`]: unknown
}

export interface ContractUIMetadata extends ContractMeta {
  $schema?: string
  chainId?: number
  address?: string
  includes?: string[]
  links?: { label: string; url: string }[]
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
  events?: Record<string, EventMeta>
  errors?: Record<string, ErrorMeta>
  messages?: Record<string, MessageMeta>
  [key: `_${string}`]: unknown
}
