<template>
  <section
    v-if="artifactKind"
    class="cr-artifact-preview"
  >
    <div class="cr-artifact-preview__header">
      <span class="cr-artifact-preview__title">Onchain artifact</span>
      <div class="cr-artifact-preview__actions">
        <span class="cr-artifact-preview__kind">{{ artifactKind }}</span>
        <button
          type="button"
          class="cr-artifact-preview__button"
          title="View fullscreen"
          aria-label="View fullscreen"
          @click="fullscreen = true"
        >
          <Icon name="lucide:expand" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      class="cr-artifact-preview__frame-wrap"
      :style="frameStyle"
    >
      <img
        v-if="imageSrc"
        class="cr-artifact-preview__image"
        :src="imageSrc"
        :alt="`${artifactKind} preview`"
        @load="measureImage"
      />
      <iframe
        v-else-if="previewSrcdoc"
        class="cr-artifact-preview__frame"
        :src="previewBlobUrl || undefined"
        sandbox="allow-scripts"
        referrerpolicy="no-referrer"
        :title="`${artifactKind} preview`"
      />
    </div>

    <dialog
      ref="dialog"
      class="cr-artifact-preview__dialog"
      @close="fullscreen = false"
      @click.self="closeFullscreen"
    >
      <div class="cr-artifact-preview__dialog-shell">
        <div class="cr-artifact-preview__header cr-artifact-preview__header--dialog">
          <span class="cr-artifact-preview__title">Onchain artifact</span>
          <div class="cr-artifact-preview__actions">
            <span class="cr-artifact-preview__kind">{{ artifactKind }}</span>
            <button
              type="button"
              class="cr-artifact-preview__button"
              title="Close fullscreen"
              aria-label="Close fullscreen"
              @click="closeFullscreen"
            >
              <Icon name="lucide:x" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          class="cr-artifact-preview__dialog-frame-wrap"
          :style="frameStyle"
        >
          <img
            v-if="imageSrc"
            class="cr-artifact-preview__image"
            :src="imageSrc"
            :alt="`${artifactKind} preview`"
            @load="measureImage"
          />
          <iframe
            v-else-if="previewSrcdoc"
            class="cr-artifact-preview__frame"
            :src="previewBlobUrl || undefined"
            sandbox="allow-scripts"
            referrerpolicy="no-referrer"
            :title="`${artifactKind} preview`"
          />
        </div>
      </div>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import {
  buildPreviewSrcdoc,
  detectPreviewMarkupKind,
  toSvgDataUri,
} from '../../utils/markup-preview'

const props = defineProps<{
  value: string | null
}>()

const artifactKind = computed(() => detectPreviewMarkupKind(props.value))

const imageSrc = computed(() => {
  if (!props.value || artifactKind.value !== 'svg') return null
  return toSvgDataUri(props.value)
})

const previewSrcdoc = computed(() => {
  if (!props.value || !artifactKind.value || artifactKind.value === 'svg') {
    return null
  }

  return buildPreviewSrcdoc(props.value, artifactKind.value)
})

const measuredRatio = ref<string | null>(null)
const frameStyle = computed(() => {
  if (measuredRatio.value) return { aspectRatio: measuredRatio.value }

  const ratio =
    artifactKind.value === 'svg' ? getSvgAspectRatio(props.value) : null
  return ratio ? { aspectRatio: ratio } : undefined
})

watch(
  () => props.value,
  () => {
    measuredRatio.value = null
  },
)

const previewBlobUrl = ref<string | null>(null)

watch(
  previewSrcdoc,
  (srcdoc, _previousSrcdoc, onCleanup) => {
    if (previewBlobUrl.value) {
      URL.revokeObjectURL(previewBlobUrl.value)
      previewBlobUrl.value = null
    }

    if (!srcdoc) return

    const blob = new Blob([srcdoc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    previewBlobUrl.value = url

    onCleanup(() => {
      URL.revokeObjectURL(url)
      if (previewBlobUrl.value === url) previewBlobUrl.value = null
    })
  },
  { immediate: true },
)

onUnmounted(() => {
  if (previewBlobUrl.value) URL.revokeObjectURL(previewBlobUrl.value)
})

const fullscreen = ref(false)
const dialog = ref<HTMLDialogElement | null>(null)

watch(fullscreen, (isOpen) => {
  const element = dialog.value
  if (!element) return

  if (isOpen && !element.open) element.showModal()
  if (!isOpen && element.open) element.close()
})

function closeFullscreen() {
  fullscreen.value = false
}

function measureImage(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  if (!image.naturalWidth || !image.naturalHeight) return

  measuredRatio.value = `${image.naturalWidth} / ${image.naturalHeight}`
}

function getSvgAspectRatio(value: string | null): string | null {
  const svg = decodeSvg(value)
  if (!svg) return null

  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1]
  const viewBoxValues = viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)

  if (viewBoxValues?.length === 4 && viewBoxValues[2] && viewBoxValues[3]) {
    return `${viewBoxValues[2]} / ${viewBoxValues[3]}`
  }

  const width = parseSvgLength(svg.match(/\bwidth=["']([^"']+)["']/i)?.[1])
  const height = parseSvgLength(svg.match(/\bheight=["']([^"']+)["']/i)?.[1])

  return width && height ? `${width} / ${height}` : null
}

function decodeSvg(value: string | null): string | null {
  if (!value) return null
  if (!value.toLowerCase().startsWith('data:image/svg+xml')) return value

  const match = value.match(/^data:image\/svg\+xml(?:[^,]*),(.*)$/is)
  if (!match) return null

  try {
    return value.toLowerCase().includes(';base64,')
      ? atob(match[1] || '')
      : decodeURIComponent(match[1] || '')
  } catch {
    return null
  }
}

function parseSvgLength(value: string | undefined): number | null {
  if (!value) return null
  const match = value.trim().match(/^(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}
</script>
