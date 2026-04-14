<template>
  <section
    v-if="hasPreview"
    class="cr-metadata-preview"
  >
    <div
      v-if="resolving"
      class="cr-metadata-preview__state"
    >
      resolving uri...
    </div>

    <div
      v-else-if="error"
      class="cr-metadata-preview__state cr-metadata-preview__state--error"
    >
      {{ error }}
    </div>

    <template v-else-if="metadata">
      <div class="cr-metadata-preview__header">
        <span class="cr-metadata-preview__title">Metadata</span>

        <div
          v-if="rawJson"
          class="cr-metadata-preview__switch"
        >
          <button
            type="button"
            class="cr-metadata-preview__toggle"
            :class="{ 'is-active': !showRaw }"
            @click="showRaw = false"
          >
            Preview
          </button>
          <button
            type="button"
            class="cr-metadata-preview__toggle"
            :class="{ 'is-active': showRaw }"
            @click="showRaw = true"
          >
            JSON
          </button>
        </div>
      </div>

      <div
        v-if="showRaw && rawJson"
        class="cr-metadata-preview__raw"
      >
        <pre class="cr-metadata-preview__json">{{ rawJsonText }}</pre>
      </div>

      <template v-else>
        <div
          v-if="imageUrl || animationUrl"
          class="cr-metadata-preview__media"
        >
          <div
            v-if="(showAnimation || !imageUrl) && animationUrl"
            class="cr-metadata-preview__embed"
          >
            <iframe
              :src="animationUrl"
              title="animation preview"
              loading="lazy"
              sandbox="allow-scripts"
              referrerpolicy="no-referrer"
            />
          </div>

          <div
            v-else-if="imageUrl"
            class="cr-metadata-preview__image"
          >
            <img
              :src="imageUrl"
              :alt="metadata.name || 'Token image'"
              loading="lazy"
              @error="imageFailed = true"
            />
          </div>

          <div
            v-if="imageUrl && animationUrl"
            class="cr-metadata-preview__switch cr-metadata-preview__switch--media"
          >
            <button
              type="button"
              class="cr-metadata-preview__toggle"
              :class="{ 'is-active': !showAnimation }"
              @click="showAnimation = false"
            >
              Image
            </button>
            <button
              type="button"
              class="cr-metadata-preview__toggle"
              :class="{ 'is-active': showAnimation }"
              @click="showAnimation = true"
            >
              Animation
            </button>
          </div>
        </div>

        <div
          v-if="metadata.name"
          class="cr-metadata-preview__name"
        >
          {{ metadata.name }}
        </div>

        <div
          v-if="metadata.description"
          class="cr-metadata-preview__description"
        >
          {{ metadata.description }}
        </div>

        <a
          v-if="metadata.external_url"
          :href="metadata.external_url"
          target="_blank"
          rel="noopener noreferrer"
          class="cr-metadata-preview__link"
        >
          {{ cleanUrl(metadata.external_url) }}
        </a>

        <div
          v-if="metadata.attributes?.length"
          class="cr-metadata-preview__attributes"
        >
          <div
            v-for="(attr, index) in metadata.attributes"
            :key="index"
            class="cr-metadata-preview__attribute"
          >
            <span class="cr-metadata-preview__attribute-key">
              {{ attr.trait_type || 'attribute' }}
            </span>
            <span class="cr-metadata-preview__attribute-value">
              {{ formatAttributeValue(attr) }}
            </span>
          </div>
        </div>

        <div
          v-if="formattedExtraFields.length"
          class="cr-metadata-preview__extra"
        >
          <div
            v-for="field in formattedExtraFields"
            :key="field.key"
            class="cr-metadata-preview__field"
          >
            <span class="cr-metadata-preview__field-key">
              {{ field.key }}
            </span>
            <span class="cr-metadata-preview__field-value">
              {{ field.value }}
            </span>
            <CopyButton
              v-if="field.value"
              class="cr-metadata-preview__copy"
              :text="field.value"
            />
          </div>
        </div>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  cleanUrl,
  formatAttributeValue,
  formatFieldValue,
  type PreviewMetadata,
} from '../../utils/metadata-display'

const props = defineProps<{
  metadata: PreviewMetadata | null
  rawJson: Record<string, unknown> | null
  resolving: boolean
  error: string | null
}>()

const imageFailed = ref(false)
const showRaw = ref(false)
const showAnimation = ref(false)
const hasPreview = computed(
  () => props.resolving || Boolean(props.error || props.metadata),
)

const imageUrl = computed(() => {
  if (imageFailed.value) return null
  return props.metadata?.image || props.metadata?.image_url || null
})

const animationUrl = computed(() => {
  return props.metadata?.animation_url || props.metadata?.animation || null
})

const extraFields = computed(() => {
  if (!props.metadata?.extra) return []
  return Object.entries(props.metadata.extra).filter(
    ([, value]) => value !== null && value !== undefined,
  )
})

const formattedExtraFields = computed(() =>
  extraFields.value.map(([key, value]) => ({
    key,
    value: formatFieldValue(value),
  })),
)

const rawJsonText = computed(() => {
  if (!props.rawJson) return ''
  return JSON.stringify(props.rawJson, null, 2)
})

watch(
  () => props.metadata,
  () => {
    imageFailed.value = false
    showRaw.value = false
    showAnimation.value = false
  },
  { immediate: true },
)
</script>
