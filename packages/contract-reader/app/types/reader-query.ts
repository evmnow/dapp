import type { ContractView, SourceSelection } from './view'

export interface ReaderQueryState {
  address?: string
  view: ContractView
  fn?: string
  args: string[]
  source?: SourceSelection
}
