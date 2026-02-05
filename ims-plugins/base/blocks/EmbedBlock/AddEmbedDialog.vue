<template>
  <dialog-content class="AddEmbedDialog">
    <div class="Dialog-header">
      {{ $t('assetEditor.embedBlockAddDialogHeader') }}
    </div>
    <div class="Dialog-body">
      <div class="AddEmbedDialog-row">
        {{ $t('assetEditor.embedBlockLinkAnyPlaceholder') }}:
      </div>
      <div class="AddEmbedDialog-row AddEmbedDialog-link-row">
        <div
          class="AddEmbedDialog-kind"
          :class="{
            'type-empty': !link,
          }"
        >
          <div class="AddEmbedDialog-kind-icon">
            <svg
              v-if="
                detectedKind.type === DetectedEmbedKindType.UNKNOWN || !link
              "
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path fill="none" d="M0 0h24v24H0z"></path>
              <path
                d="M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V11H19L18.9999 6.413L11.2071 14.2071L9.79289 12.7929L17.5849 5H13V3H21Z"
              ></path>
            </svg>
            <svg
              v-else-if="detectedKind.type === DetectedEmbedKindType.INVALID"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path fill="none" d="M0 0h24v24H0z"></path>
              <path
                d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15V17H13V15H11ZM11 7V13H13V7H11Z"
              ></path>
            </svg>
            <svg
              v-else-if="detectedKind.type === DetectedEmbedKindType.GOOGLE_DOC"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.1875 19.6875H4.8125C4.08756 19.6875 3.5 19.0999 3.5 18.375V2.625C3.5 1.90006 4.08756 1.3125 4.8125 1.3125H13.125L17.5 5.6875V18.375C17.5 19.0999 16.9124 19.6875 16.1875 19.6875Z"
                fill="#2196F3"
              ></path>
              <path
                d="M17.5 5.6875H13.125V1.3125L17.5 5.6875Z"
                fill="#BBDEFB"
              ></path>
              <path
                d="M13.125 5.6875L17.5 10.0625V5.6875H13.125Z"
                fill="#1565C0"
              ></path>
              <path
                d="M6.5625 10.0625H14.4375V10.9375H6.5625V10.0625ZM6.5625 11.8125H14.4375V12.6875H6.5625V11.8125ZM6.5625 13.5625H14.4375V14.4375H6.5625V13.5625ZM6.5625 15.3125H10.9375V16.1875H6.5625V15.3125Z"
                fill="#E3F2FD"
              ></path>
            </svg>
            <svg
              v-else-if="detectedKind.type === DetectedEmbedKindType.MIRO"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 40 40"
              fill="none"
            >
              <g clip-path="url(#clip0_735_2)">
                <path
                  d="M0 10C0 4.47715 4.47715 0 10 0H30C35.5229 0 40 4.47715 40 10V30C40 35.5229 35.5229 40 30 40H10C4.47715 40 0 35.5229 0 30V10Z"
                  fill="#FFDD33"
                />
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M26.593 7.625H22.9619L25.9877 12.9415L19.3307 7.625H15.6997L19.0282 14.1231L12.0686 7.625H8.4375L12.0686 15.8964L8.4375 32.4375H12.0686L19.0282 14.7148L15.6997 32.4375H19.3307L25.9877 13.5331L22.9619 32.4375H26.593L33.25 11.7599L26.593 7.625Z"
                  fill="black"
                />
              </g>
              <defs>
                <clipPath id="clip0_735_2">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <svg
              v-else-if="detectedKind.type === DetectedEmbedKindType.FIGMA"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              width="16"
              height="16"
            >
              <g transform="translate(64 122)">
                <mask id="a">
                  <path d="M-64-122h16v16h-16v-16z" fill="#FFF" />
                </mask>
                <g style="mix-blend-mode: normal" mask="url(#a)">
                  <use
                    xlink:href="#b"
                    transform="translate(-56 -116)"
                    fill="#1ABCFE"
                    style="mix-blend-mode: normal"
                  />
                  <use
                    xlink:href="#c"
                    transform="translate(-61 -111)"
                    fill="#0ACF83"
                    style="mix-blend-mode: normal"
                  />
                  <use
                    xlink:href="#d"
                    transform="matrix(0 1 1 0 -56 -121)"
                    fill="#FF7262"
                    style="mix-blend-mode: normal"
                  />
                  <use
                    xlink:href="#e"
                    transform="matrix(1 0 0 -1 -61 -116)"
                    fill="#F24E1E"
                    style="mix-blend-mode: normal"
                  />
                  <use
                    xlink:href="#e"
                    transform="matrix(1 0 0 -1 -61 -111)"
                    fill="#A259FF"
                    style="mix-blend-mode: normal"
                  />
                </g>
              </g>
              <defs>
                <path id="b" d="M0 2.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1-5 0z" />
                <path
                  id="c"
                  d="M0 2.5A2.5 2.5 0 0 1 2.5 0H5v2.5a2.5 2.5 0 0 1-5 0z"
                />
                <path id="d" d="M0 0h5v2.5a2.5 2.5 0 0 1-5 0V0z" />
                <path
                  id="e"
                  d="M0 2.5A2.5 2.5 0 0 1 2.5 0H5v5H2.5A2.5 2.5 0 0 1 0 2.5z"
                />
              </defs>
            </svg>
            <svg
              v-else-if="detectedKind.type === DetectedEmbedKindType.YOUTUBE"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="rgba(255,0,0,1)"
            >
              <path
                d="M12.2439 4C12.778 4.00294 14.1143 4.01586 15.5341 4.07273L16.0375 4.09468C17.467 4.16236 18.8953 4.27798 19.6037 4.4755C20.5486 4.74095 21.2913 5.5155 21.5423 6.49732C21.942 8.05641 21.992 11.0994 21.9982 11.8358L21.9991 11.9884L21.9991 11.9991C21.9991 11.9991 21.9991 12.0028 21.9991 12.0099L21.9982 12.1625C21.992 12.8989 21.942 15.9419 21.5423 17.501C21.2878 18.4864 20.5451 19.261 19.6037 19.5228C18.8953 19.7203 17.467 19.8359 16.0375 19.9036L15.5341 19.9255C14.1143 19.9824 12.778 19.9953 12.2439 19.9983L12.0095 19.9991L11.9991 19.9991C11.9991 19.9991 11.9956 19.9991 11.9887 19.9991L11.7545 19.9983C10.6241 19.9921 5.89772 19.941 4.39451 19.5228C3.4496 19.2573 2.70692 18.4828 2.45587 17.501C2.0562 15.9419 2.00624 12.8989 2 12.1625V11.8358C2.00624 11.0994 2.0562 8.05641 2.45587 6.49732C2.7104 5.51186 3.45308 4.73732 4.39451 4.4755C5.89772 4.05723 10.6241 4.00622 11.7545 4H12.2439ZM9.99911 8.49914V15.4991L15.9991 11.9991L9.99911 8.49914Z"
              ></path>
            </svg>
            <svg
              v-else-if="
                detectedKind.type === DetectedEmbedKindType.GOOGLE_PRESENTATION
              "
              viewBox="0 0 30 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <path fill="#fff" d="M10 13h20v20H10z" />
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M7.76289 35.1004H28.2379c1.3053 0 2.3625-1.0435 2.3625-2.3318V9.45039l-8.55-8.549999H7.76289c-1.30528 0-2.3625 1.043489-2.3625 2.331819V32.7686c0 1.2883 1.05722 2.3318 2.3625 2.3318Zm4.16251-20.7h14.175v10.8H9.90039v-10.8h2.02501Zm-.225 9h12.6v-7.2h-12.6v7.2Z"
                  fill="#FFBA00"
                />
                <path
                  d="m22.0508.900391 8.55 8.549999h-8.55V.900391Z"
                  fill="#FF9500"
                />
              </g>
            </svg>
            <svg
              v-else-if="
                detectedKind.type === DetectedEmbedKindType.GOOGLE_SHEET
              "
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.1875 19.6875H4.8125C4.08756 19.6875 3.5 19.0999 3.5 18.375V2.625C3.5 1.90006 4.08756 1.3125 4.8125 1.3125H13.125L17.5 5.6875V18.375C17.5 19.0999 16.9124 19.6875 16.1875 19.6875Z"
                fill="#43A047"
              ></path>
              <path
                d="M17.5 5.6875H13.125V1.3125L17.5 5.6875Z"
                fill="#C8E6C9"
              ></path>
              <path
                d="M13.125 5.6875L17.5 10.0625V5.6875H13.125Z"
                fill="#2E7D32"
              ></path>
              <path
                d="M13.5625 10.0625H7.4375H6.5625V10.9375V11.8125V12.6875V13.5625V14.4375V15.3125V16.1875H14.4375V15.3125V14.4375V13.5625V12.6875V11.8125V10.9375V10.0625H13.5625ZM7.4375 10.9375H9.1875V11.8125H7.4375V10.9375ZM7.4375 12.6875H9.1875V13.5625H7.4375V12.6875ZM7.4375 14.4375H9.1875V15.3125H7.4375V14.4375ZM13.5625 15.3125H10.0625V14.4375H13.5625V15.3125ZM13.5625 13.5625H10.0625V12.6875H13.5625V13.5625ZM13.5625 11.8125H10.0625V10.9375H13.5625V11.8125Z"
                fill="#E8F5E9"
              ></path>
            </svg>
          </div>
        </div>
        <form-input
          class="AddEmbedDialog-linkInput"
          :autofocus="true"
          :value="link"
          placeholder="https://..."
          @input="setLink($event)"
        />
      </div>
      <div v-if="putPlain" class="AddEmbedDialog-asLinkWarning">
        <i class="ri-error-warning-fill"></i>
        {{ $t('assetEditor.embedBlockWillBeInsertedAsLink') }}
      </div>
    </div>
    <div class="Form-row-buttons">
      <div class="Form-row-buttons-center use-buttons-action">
        <button type="button" class="is-button" @click="dialog.close()">
          {{ $t('common.dialogs.cancelCaption') }}
        </button>
        <button
          type="button"
          class="is-button accent AddEmbedDialog-button-ok"
          :disabled="!canSave"
          @click="save"
        >
          {{ $t('common.dialogs.ok') }}
        </button>
      </div>
    </div>
  </dialog-content>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import DialogContent from '#components/Dialog/DialogContent.vue';
import FormInput from '#components/Form/FormInput.vue';
import { DetectedEmbedKindType, detectEmbedKind } from './detectEmbedKind';
import type { DialogInterface } from '#logic/managers/DialogManager';

type DialogProps = {
  link: string;
};

type DialogResult = { link: string };

export default defineComponent({
  name: 'AddEmbedDialog',
  components: {
    DialogContent,
    FormInput,
  },
  props: {
    dialog: {
      type: Object as PropType<DialogInterface<DialogProps, DialogResult>>,
      required: true,
    },
  },
  data() {
    return {
      link: this.dialog.state.link,
      DetectedEmbedKindType,
    };
  },
  computed: {
    detectedKind() {
      return detectEmbedKind(this.link);
    },
    canSave() {
      return this.detectedKind.type !== DetectedEmbedKindType.INVALID;
    },
    putPlain() {
      return this.detectedKind.type === DetectedEmbedKindType.UNKNOWN;
    },
  },
  methods: {
    save() {
      this.dialog.close({
        link: (this.link ?? '').trim(),
      });
    },
    setLink(link: string) {
      this.link = link ? link.trim() : '';
    },
  },
});
</script>

<style lang="scss" rel="stylesheet/scss" scoped>
@use '$style/Form';
.AddEmbedDialog {
  width: 600px;
}
.AddEmbedDialog-row {
  margin-bottom: 10px;
}

.AddEmbedDialog-kind {
  background-color: var(--input-bg-color);
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-color: var(--input-border-color);
  border-width: 1px 0px 1px 1px;
  border-style: solid;
  background-size: 16px 16px;
  background-position: center center;
  background-repeat: no-repeat;
  width: 32px;
  box-sizing: border-box;

  .AddEmbedDialog-kind-icon {
    width: 18px;
    height: 18px;
    line-height: normal;
    display: flex;
  }
}

.AddEmbedDialog-link-row {
  display: flex;
}

.AddEmbedDialog-linkInput {
  flex: 1;
  --input-border-radius: 0px 4px 4px 0px;
}

.AddEmbedDialog-asLinkWarning {
  border: 1px solid;
  border-radius: 4px;
  color: var(--color-warn);
  padding: 15px 20px;
  margin-bottom: 10px;
}
</style>
