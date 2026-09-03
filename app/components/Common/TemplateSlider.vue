<template>
  <div class="TemplateSlider" :class="{ 'no-thumbs': !showThumbs }">
    <div class="TemplateSlider-header">
      <label class="TemplateSlider-label">
        {{ label }}
      </label>
      <div class="TemplateSlider-nav">
        <button
          class="TemplateSlider-btn"
          :disabled="!canPrev"
          @click="sliderPrev"
        >
          <i class="ri-arrow-left-s-line"></i>
        </button>
        <span class="TemplateSlider-count">
          {{ sliderIndex + 1 }} / {{ templates.length }}
        </span>
        <button
          class="TemplateSlider-btn"
          :disabled="!canNext"
          @click="sliderNext"
        >
          <i class="ri-arrow-right-s-line"></i>
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="TemplateSlider-track TemplateSlider-track--loading"
    >
      <div class="TemplateSlider-spinner"></div>
    </div>
    <div
      v-else
      ref="sliderTrack"
      class="TemplateSlider-track"
      @scroll="onSliderScroll"
    >
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="TemplateSlider-card"
        :class="{ selected: selectedId === tpl.id }"
        @click="select(tpl.id)"
      >
        <a
          v-if="tpl.id"
          class="is-button is-button-icon TemplateSlider-eye"
          :href="getOpenLink(tpl.id)"
          target="_blank"
          rel="noopener"
          :title="$t('tryOnboarding.openTemplate')"
          @click.stop
        >
          <i class="ri-external-link-line"></i>
        </a>
        <div v-if="showThumbs" class="TemplateSlider-thumb">
          <i class="ri-file-list-3-line"></i>
        </div>
        <div class="TemplateSlider-title">
          <span class="TemplateSlider-radio"></span>
          {{ tpl.title }}
        </div>
        <div class="TemplateSlider-desc">
          {{ tpl.description }}
        </div>
      </div>
    </div>

    <div
      class="TemplateSlider-card TemplateSlider-empty"
      :class="{ selected: selectedId === null }"
      @click="select(null)"
    >
      <span class="TemplateSlider-plus">
        <i class="ri-add-line"></i>
      </span>
      <div>
        <div class="TemplateSlider-title">
          {{ $t('tryOnboarding.blankTemplate') }}
        </div>
        <div class="TemplateSlider-desc">
          {{ $t('tryOnboarding.blankTemplateDesc') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import ProjectManager from '~ims-app-base/logic/managers/ProjectManager';
import UiManager from '~ims-app-base/logic/managers/UiManager';

type TemplateItem = {
  id: string;
  title: string;
  description: string;
  lang: string;
};

export default defineComponent({
  name: 'TemplateSlider',
  props: {
    modelValue: {
      type: String as PropType<string | null>,
      default: null,
    },
    label: {
      type: String,
      required: true,
    },
    showThumbs: {
      type: Boolean,
      default: true,
    },
    initialTemplateId: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      templates: [] as TemplateItem[],
      loading: false,
      sliderIndex: 0,
      selectedId: null as string | null,
      canPrev: false,
      canNext: false,
    };
  },
  watch: {
    modelValue(val: string | null) {
      if (val !== this.selectedId) {
        this.selectedId = val;
      }
    },
  },
  async mounted() {
    await this.loadTemplates();
    await this.$nextTick();
    const track = this.$refs.sliderTrack as HTMLElement;
    if (track) {
      track.scrollLeft = 0;
    }
    this.$nextTick(() => this.updateScrollState());
    window.addEventListener('resize', this.updateScrollState);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateScrollState);
  },
  methods: {
    async loadTemplates() {
      this.loading = true;
      try {
        const lang = this.$getAppManager().get(UiManager).getLanguage();
        const all = await this.$getAppManager()
          .get(ProjectManager)
          .loadProjectTemplates();
        this.templates = all.filter(
          (p: TemplateItem) => p.lang === lang && p.id,
        );
        this.templates.push({
          id: 'dkg2gFzq',
          title: 'тест',
          description: 'тест',
          lang,
        });

        if (this.modelValue !== null && this.templates.some((t) => t.id === this.modelValue)) {
          this.selectedId = this.modelValue;
        } else if (this.initialTemplateId && this.templates.some((t) => t.id === this.initialTemplateId)) {
          this.selectedId = this.initialTemplateId;
        } else if (this.templates.length > 0) {
          this.selectedId = this.templates[0].id;
        } else {
          this.selectedId = null;
        }

        this.$emit('update:modelValue', this.selectedId);
      } catch {
        this.templates = [];
        this.selectedId = null;
        this.$emit('update:modelValue', null);
      } finally {
        this.loading = false;
      }
    },
    select(id: string | null) {
      this.selectedId = id;
      this.$emit('update:modelValue', id);
    },
    getOpenLink(projectId: string) {
      return `https://ims.cr5.space/app/p/${projectId}/project`;
    },
    sliderPrev() {
      const track = this.$refs.sliderTrack as HTMLElement;
      if (!track) return;
      const card = track.querySelector('.TemplateSlider-card') as HTMLElement;
      if (card) {
        track.scrollBy({ left: -(card.offsetWidth + 14), behavior: 'smooth' });
      }
    },
    sliderNext() {
      const track = this.$refs.sliderTrack as HTMLElement;
      if (!track) return;
      const card = track.querySelector('.TemplateSlider-card') as HTMLElement;
      if (card) {
        track.scrollBy({ left: card.offsetWidth + 14, behavior: 'smooth' });
      }
    },
    onSliderScroll() {
      const track = this.$refs.sliderTrack as HTMLElement;
      if (!track) return;
      const card = track.querySelector('.TemplateSlider-card') as HTMLElement;
      if (card) {
        const step = card.offsetWidth + 14;
        this.sliderIndex =
          step > 0
            ? Math.max(
                0,
                Math.min(
                  this.templates.length - 1,
                  Math.round(track.scrollLeft / step),
                ),
              )
            : 0;
      }
      this.updateScrollState();
    },
    updateScrollState() {
      const track = this.$refs.sliderTrack as HTMLElement;
      if (!track) {
        this.canPrev = false;
        this.canNext = false;
        return;
      }
      const maxScroll = track.scrollWidth - track.clientWidth;
      this.canPrev = track.scrollLeft > 1;
      this.canNext = track.scrollLeft < maxScroll - 1;
      const card = track.querySelector('.TemplateSlider-card') as HTMLElement;
      if (card) {
        const step = card.offsetWidth + 14;
        if (step > 0) {
          this.sliderIndex = Math.max(
            0,
            Math.min(
              this.templates.length - 1,
              Math.round(track.scrollLeft / step),
            ),
          );
        }
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@use '$style/devices-mixins.scss';

.TemplateSlider {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.TemplateSlider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.TemplateSlider-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--local-text-color);
}

.TemplateSlider-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.TemplateSlider-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--local-border-color);
  border-radius: 8px;
  background: var(--local-bg-color);
  color: var(--local-text-color);
  cursor: pointer;
  font-size: 16px;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.TemplateSlider-count {
  font-size: 13px;
  color: var(--local-sub-text-color);
  min-width: 36px;
  text-align: center;
}

.TemplateSlider-track {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding: 2px 2px 12px;

  &::-webkit-scrollbar {
    display: none;
  }

  .TemplateSlider-card {
    flex: none;
    width: calc((100% - 28px) / 3);
    scroll-snap-align: start;
    scroll-snap-stop: always;

    @include devices-mixins.device-type(not-pc) {
      width: calc((100% - 14px) / 2);
    }

    @include devices-mixins.device-type(mb) {
      width: calc(100% - 44px);
    }
  }
}

.TemplateSlider-track--loading {
  min-height: 130px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.TemplateSlider-spinner {
  width: 26px;
  height: 26px;
  border: 3px solid var(--local-border-color);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: TemplateSlider-rotate 0.8s linear infinite;
}

@keyframes TemplateSlider-rotate {
  to {
    transform: rotate(360deg);
  }
}

.TemplateSlider-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--local-border-color);
  border-radius: 18px;
  background: var(--local-bg-color);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s,
    background 0.2s;

  &:hover {
    border-color: rgba(238, 216, 17, 0.5);
    transform: translateY(-2px);
  }

  &.selected {
    border-color: var(--color-accent);
    background: rgba(238, 216, 17, 0.06);
    box-shadow: 0 0 0 1px var(--color-accent);
  }
}

.TemplateSlider-eye {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 2;
  text-decoration: none;

  &.is-button {
    --button-border-radius: 9px;
    --button-bg-color: var(--local-bg-color);
    --button-border-color: var(--local-border-color);
    --button-text-color: var(--local-sub-text-color);

    &:hover {
      --button-text-color: var(--color-accent);
      --button-border-color: rgba(238, 216, 17, 0.5);
    }
  }
}

.TemplateSlider-thumb {
  width: 100%;
  height: 60px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: var(--local-box-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--local-sub-text-color);
}

.TemplateSlider-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  line-height: 1.2;
  color: var(--local-text-color);
}

.TemplateSlider-radio {
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 50%;
  border: 1.5px solid var(--local-border-color);
  display: grid;
  place-items: center;
  transition: border-color 0.2s;

  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-accent);
    transform: scale(0);
    transition: transform 0.18s;
  }
}

.TemplateSlider-card.selected .TemplateSlider-radio {
  border-color: var(--color-accent);

  &::after {
    transform: scale(1);
  }
}

.TemplateSlider-desc {
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--local-sub-text-color);
}

.TemplateSlider-empty {
  align-items: center;
  gap: 12px;
  flex-direction: row;
}

.TemplateSlider-plus {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 10px;
  border: 1px dashed var(--local-border-color);
  display: grid;
  place-items: center;
  font-size: 18px;
  color: var(--local-sub-text-color);
}

.no-thumbs {
  .TemplateSlider-card {
    justify-content: center;
  }

  .TemplateSlider-title {
    justify-content: center;
  }

  .TemplateSlider-desc {
    text-align: center;
  }
}
</style>
