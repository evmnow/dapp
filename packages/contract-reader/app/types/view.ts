import type { SourceSelection } from '../utils/source'

export type { SourceSelection }

/** The reader surfaces shipped by this layer. Apps may add their own tabs. */
export type ContractView = 'overview' | 'read' | 'interact' | 'code'

export interface ContractViewState<View extends string = ContractView> {
  view: View
  fn?: string
  args?: string[]
  source?: SourceSelection
}

export interface ReaderQueryState<View extends string = ContractView> {
  address?: string
  view: View
  fn?: string
  args: string[]
  source?: SourceSelection
}
