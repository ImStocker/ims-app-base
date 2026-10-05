<template>
  <div class="SaveViewButton">
    <button
      class="is-button is-button-action accent SaveViewButton-button"
      @click="$emit('save')"
    >
      <i class="ri-save-3-line"></i>
      <caption-string :value="$t('viewSettings.saveView')"></caption-string>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CaptionString from '../../Common/CaptionString.vue';

export default defineComponent({
  name: 'SaveViewButton',
  components: {
    CaptionString,
  },
  emits: ['save'],
});
</script>

<style lang="scss" scoped>
@use './viewToolbarButton';

// Структура как у соседей: корень-обёртка + кнопка внутри (у них корень —
// <menu-button> с пустым scoped-стилем, здесь обычный div без своих правил).
// Это не формальность: миксин печатает селектор
// `.SaveViewButton .SaveViewButton-button`, и он срабатывает только если это
// два РАЗНЫХ элемента. На одном элементе получился бы self-descendant, который
// не матчится никогда, и кнопка молча осталась бы с padding и радиусом из
// `use-buttons-options`. Побочная польза — (0,3,0) со scoped-атрибутом, ровно
// как у соседей, вместо (0,2,0), который проигрывал бы
// `:root .use-buttons-options .is-button` (0,3,0).
.SaveViewButton {
  @include viewToolbarButton.view-toolbar-accent-button(
    'SaveViewButton-button'
  );
}
</style>
