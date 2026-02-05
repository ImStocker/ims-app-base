<template>
  <div class="FormDatePicker">
    <DatePicker
      :model-value="value"
      :mode="mode"
      :locale="datePickerLocale"
      is24hr
      @update:model-value="onInput"
    >
      <template #default="{ togglePopover }">
        <div class="FormDatePicker-box" @click="open(togglePopover)">
          <slot name="icon"></slot>
          <input
            v-model="rawValueStr"
            class="FormDatePicker-input"
            type="text"
            :disabled="disabled"
            @change="emitFromRawValueStr"
          />
          <button
            v-if="value && nullable"
            type="button"
            class="FormDatePicker-clear"
            tabindex="-1"
            @click="clearValue"
          >
            <i class="ri-close-fill"></i>
          </button>
          <i
            v-if="showCalendarIcon"
            class="ri-calendar-2-fill FormDatePicker-input-i"
          ></i>
        </div>
      </template>
    </DatePicker>
  </div>
</template>

<script type="text/ecmascript-6" lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { DatePicker } from 'v-calendar';
import 'v-calendar/style.css';
import { formatDate, formatDateTime } from '../../logic/utils/format';

import dayjs from '../../lib/dayjs';
import ProjectManager from '../../logic/managers/ProjectManager';
import UiManager from '../../logic/managers/UiManager';

export default defineComponent({
  title: 'FormCalendar',
  components: {
    DatePicker,
    //Calendar
  },
  model: {
    prop: 'value',
    event: 'change',
  },
  props: {
    value: {
      type: String,
      default: () => '',
    },
    min: {
      type: String,
      default: () => '',
    },
    max: {
      type: String,
      default: () => '',
    },
    nullable: {
      type: Boolean,
      default: true,
    },
    mode: {
      type: String as PropType<'date' | 'dateTime' | 'dateTimeShort' | 'time'>,
      default: () => 'date',
    },
    showCalendarIcon: {
      type: Boolean,
      default: () => true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['change'],
  data() {
    return {
      rawValueStr: '',
    };
  },
  computed: {
    attributesForCalendar() {
      return [];
    },
    datePickerLocale(): string {
      return this.$getAppManager().get(UiManager).getLanguage();
    },
    compRawValueStr(): string {
      const val = this.value;
      if (this.mode === 'dateTime' || this.mode === 'dateTimeShort') {
        return formatDateTime(
          val,
          this.datePickerLocale,
          this.mode === 'dateTimeShort',
        );
      }
      return formatDate(val, this.datePickerLocale);
    },
    getProjectInfo(): any {
      return this.$getAppManager().get(ProjectManager).getProjectInfo();
    },
  },
  watch: {
    compRawValueStr() {
      this.rawValueStr = this.compRawValueStr;
    },
  },
  created() {
    this.rawValueStr = this.compRawValueStr;
  },
  methods: {
    open(open_func: () => void) {
      if (!this.disabled) {
        open_func();
      }
    },
    clearValue() {
      this.onInput(null);
    },
    async onInput(val: any) {
      if (val && val.toISOString) {
        const time = val.getTime();
        val = new Date(
          time - (time % 1000) - val.getTimezoneOffset() * 60 * 1000,
        )
          .toISOString()
          .replace(/Z$/, '');
      }
      this.$emit('change', val);
    },
    emitFromRawValueStr() {
      if (!this.rawValueStr) {
        this.onInput(null);
        return;
      }
      const d = dayjs(
        this.rawValueStr ? this.rawValueStr.trim() : '',
        [
          'YYYY-MM-DD',
          'DD.MM.YYYY',
          'MM/DD/YYYY',
          'DD.MM.YY',
          'MM/DD/YY',
          'YYYY-MM-DD HH:mm',
          'DD.MM.YYYY HH:mm',
          'MM/DD/YYYY HH:mm',
          'DD.MM.YY HH:mm',
          'MM/DD/YY HH:mm',
          'YYYY-MM-DD HH:mm:ss',
          'DD.MM.YYYY HH:mm:ss',
          'MM/DD/YYYY HH:mm:ss',
          'DD.MM.YY HH:mm:ss',
          'MM/DD/YY HH:mm:ss',
        ],
        true,
      );
      if (!d.isValid()) {
        this.rawValueStr = this.compRawValueStr;
        return;
      }

      this.onInput(d.toDate());
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
.FormDatePicker-box {
  position: relative;
  display: flex;
}
.FormDatePicker-input {
  border: 1px solid #363633;
  background: transparent;
  border-radius: 4px;
  color: var(--local-text-color);
  max-height: 32px;
  cursor: pointer;
  padding-left: 10px;
  font-size: inherit;
  padding: 5px;
  flex: 1;
  width: 100%;
  &:hover {
    border-color: #ccc;
  }
}
.FormDatePicker-input-i {
  position: absolute;
  top: 5px;
  right: 10px;
  font-size: 16px;
  color: #ccc;
}

.FormDatePicker-clear {
  border: none;
  background: transparent;
  position: absolute;
  cursor: pointer;
  right: 30px;
  top: 5px;
  opacity: 0.5;
  color: var(--text-intense);
  &:hover {
    opacity: 1;
  }
}
.FormDatePicker:deep(.vc-popover-content-wrapper) {
  position: fixed !important;
}
.FormDatePicker:deep(.is-today) {
  color: var(--default-accent-secondary);
}
</style>
