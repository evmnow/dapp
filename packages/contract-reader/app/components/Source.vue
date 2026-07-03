<template>
  <section class="cr-source">
    <header class="cr-source-header cr-panel">
      <slot
        name="file"
        :file="activeFile || null"
        :file-index="activeFileIndex"
        :files="files"
        :selected-source="selectedSource"
        :href="fileLink(activeFile, activeFileIndex)"
        :select-file="selectFile"
      >
        <select
          v-if="files.length > 1"
          :value="activeFileIndex"
          class="cr-input cr-source-control"
          @change="
            selectFile(Number(($event.target as HTMLSelectElement).value))
          "
        >
          <option
            v-for="(file, index) in files"
            :key="file.path"
            :value="index"
          >
            {{ file.path }}
          </option>
        </select>
        <a
          v-else-if="activeFile && fileLink(activeFile, activeFileIndex)"
          :href="fileLink(activeFile, activeFileIndex) || undefined"
          class="cr-source-control"
        >
          {{ activeFile.path }}
        </a>
        <span
          v-else
          class="cr-source-control"
        >
          {{ activeFile?.path || 'source' }}
        </span>
      </slot>
    </header>

    <div
      v-if="activeFile"
      class="cr-source-scroll cr-panel"
    >
      <table class="cr-source-table">
        <tbody>
          <tr
            v-for="(line, index) in lines"
            :key="index"
            :ref="(element) => setLineElement(element, index + 1)"
            :class="{ active: isActive(index + 1) }"
          >
            <slot
              name="line"
              :file="activeFile"
              :file-index="activeFileIndex"
              :line-number="index + 1"
              :line="line"
              :highlighted-line="highlightedLines[index] ?? ''"
              :active="isActive(index + 1)"
              :href="lineLink(activeFile, index + 1, line)"
              :select-line="selectLine"
            >
              <td class="cr-source-line-number-cell">
                <a
                  v-if="lineLink(activeFile, index + 1, line)"
                  class="cr-line-number"
                  :href="lineLink(activeFile, index + 1, line) || undefined"
                >
                  {{ index + 1 }}
                </a>
                <button
                  v-else
                  class="cr-line-number"
                  type="button"
                  @click="selectLine(index + 1)"
                >
                  {{ index + 1 }}
                </button>
              </td>
              <td class="cr-source-code-cell">
                <pre
                  class="cr-source-code-block"
                  v-html="highlightedLines[index]"
                />
              </td>
            </slot>
          </tr>
        </tbody>
      </table>
    </div>

    <p
      v-else
      class="cr-empty cr-muted cr-panel"
    >
      no source code available
    </p>
  </section>
</template>

<script setup lang="ts">
import type { SourceFile } from '../types/contract'
import type { SourceSelection } from '../utils/source'
import { highlightSolidity } from '../utils/syntax'

const props = defineProps<{
  files: SourceFile[]
  selectedSource?: SourceSelection
  fileHref?: (file: SourceFile, index: number) => string | undefined | null
  lineHref?: (
    file: SourceFile,
    lineNumber: number,
    line: string,
    fileIndex: number,
  ) => string | undefined | null
}>()

const emit = defineEmits<{
  'update:source': [source: SourceSelection]
}>()

defineSlots<{
  file?: (props: {
    file: SourceFile | null
    fileIndex: number
    files: SourceFile[]
    selectedSource: SourceSelection | undefined
    href: string | null
    selectFile: (file: number) => void
  }) => unknown
  line?: (props: {
    file: SourceFile
    fileIndex: number
    lineNumber: number
    line: string
    highlightedLine: string
    active: boolean
    href: string | null
    selectLine: (line: number) => void
  }) => unknown
}>()

const activeFileIndex = computed(() => {
  if (!props.files.length) return 0
  const index = props.selectedSource?.file ?? 0
  return Math.min(Math.max(index, 0), props.files.length - 1)
})
const activeFile = computed(
  () => props.files[activeFileIndex.value] || props.files[0],
)
const lines = computed(() => activeFile.value?.content.split('\n') || [])
const highlightedLines = computed(() =>
  activeFile.value ? highlightSolidity(activeFile.value.content) : [],
)
const lineElements = new Map<number, HTMLElement>()
let scrollFrame: number | null = null

function setLineElement(
  element: Element | ComponentPublicInstance | null,
  line: number,
) {
  if (element instanceof HTMLElement) {
    lineElements.set(line, element)
    if (line === props.selectedSource?.line) scheduleScrollToSelectedLine()
    return
  }

  lineElements.delete(line)
}

function scheduleScrollToSelectedLine() {
  if (typeof window === 'undefined') return
  if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame)

  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null
      scrollToSelectedLine()
    })
  })
}

function scrollToSelectedLine() {
  const line = props.selectedSource?.line
  if (!line) return

  const element = lineElements.get(line)
  if (!element || !document.contains(element)) return

  element.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
}

watch(activeFileIndex, () => lineElements.clear(), { flush: 'sync' })

watch(
  () => [
    activeFileIndex.value,
    props.selectedSource?.line,
    props.selectedSource?.end,
    lines.value.length,
  ],
  () => scheduleScrollToSelectedLine(),
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(() => {
  if (typeof window !== 'undefined' && scrollFrame !== null) {
    window.cancelAnimationFrame(scrollFrame)
  }
})

function fileLink(file: SourceFile | undefined, index: number) {
  if (!file) return null
  return props.fileHref?.(file, index) ?? null
}

function lineLink(
  file: SourceFile | undefined,
  lineNumber: number,
  line: string,
) {
  if (!file) return null
  return props.lineHref?.(file, lineNumber, line, activeFileIndex.value) ?? null
}

function isActive(line: number) {
  const source = props.selectedSource
  if (!source?.line) return false
  return line >= source.line && line <= (source.end ?? source.line)
}

function selectFile(file: number) {
  emit('update:source', { file })
}

function selectLine(line: number) {
  emit('update:source', { file: activeFileIndex.value, line })
}
</script>
