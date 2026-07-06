import type { Component } from 'vue'
import type { ActionMeta, ComponentExtension } from '../types/metadata'

// Registry for the contract-metadata `_component` extension (see the
// standard's `extensions/_component.md`): metadata may name a custom UI
// component for an action, and consumers that recognize the name render it.
// Unknown names are ignored, per the extension-safety rule.
//
// Register components once at app startup (e.g. in a Nuxt plugin):
//
//   registerActionComponent('checks-composite-preview', ChecksPreview)
//
// `ActionDetail` renders the resolved component in its preview area with the
// props `{ value, config, args, address, abi, action }`.

export interface ResolvedActionComponent {
  component: Component
  /** Static props from the extension object's `props` field. */
  config: Record<string, unknown>
}

const registry = new Map<string, Component>()

export function registerActionComponent(
  type: string,
  component: Component,
): void {
  registry.set(type, component)
}

export function resolveActionComponent(
  meta?: ActionMeta,
): ResolvedActionComponent | null {
  const extension = meta?._component as ComponentExtension | undefined
  if (!extension) return null

  const type = typeof extension === 'string' ? extension : extension.type
  const config =
    typeof extension === 'string'
      ? {}
      : ((extension.props as Record<string, unknown>) ?? {})

  const component = registry.get(type)
  if (!component) return null

  return { component, config }
}
