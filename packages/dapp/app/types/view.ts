export type ContractView = 'overview' | 'read' | 'interact' | 'code'

export interface SourceSelection {
  file?: number
  line?: number
  end?: number
}

export interface ContractViewState {
  view: ContractView
  fn?: string
  args?: string[]
  source?: SourceSelection
}
