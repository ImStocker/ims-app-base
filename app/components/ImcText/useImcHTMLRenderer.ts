import Autolinker from 'autolinker';
import type {
  ListGroup,
  ListItem,
} from '../../lib/quill-delta-to-html/src/main';
import { QuillDeltaToHtmlConverter } from '../../lib/quill-delta-to-html/src/main';
import validator from 'validator';
import {
  convertTranslatedTitle,
  makeAnchorTagId,
} from '../../logic/utils/assets';
import {
  type ImcAssetBlotData,
  IMC_ASSET_BLOT_CLASS,
} from './blots/ImcAssetBlot';
import { type ImcFileBlotData, IMC_FILE_BLOT_CLASS } from './blots/ImcFileBlot';
import {
  castAssetPropValueToString,
  type AssetPropValue,
} from '../../logic/types/Props';
import { unpackQuillDeltaFromPropValue } from './ImcContent';
import { useAppManager } from '../../composables/useAppManager';
import { useFilePresenterRenderer } from '../File/FilePresenter';
import {
  getProjectLinkHref,
  sanitizeProjectUrl,
  type ProjectInfoForLink,
} from '../../logic/router/routes-helpers';
import ProjectManager from '../../logic/managers/ProjectManager';
import { IMC_ICON_BLOT_CLASS, type ImcIconBlotData } from './blots/ImcIconBlot';
import type { Op } from 'quill-delta';
import { type ImcPropBlotData, IMC_PROP_BLOT_CLASS } from './blots/ImcPropBlot';
import {
  IMC_FORMULA_BLOT_CLASS,
  type ImcFormulaBlotData,
} from './blots/ImcFormulaBlot';
import { renderToString as katexRenderToString } from 'katex';
import { useRouter } from '#app';
import type { Router } from 'vue-router';
import hljs from 'highlight.js';
import { ImcTextCodeLangs } from './imc-text-code-langs';

export type ImcHTMLRenderer = (
  value: AssetPropValue,
  options?: {
    getHeaderAnchor?: (
      title: string,
      level: number,
      index: number,
    ) => null | string;
    contentId?: string;
    project?: ProjectInfoForLink;
  },
) => string;

export function useImcHTMLRenderer(
  project?: ProjectInfoForLink,
): ImcHTMLRenderer {
  const filePresenterRenderer = useFilePresenterRenderer();
  return (value, options?): string => {
    const appManager = useAppManager();
    const $router = useRouter();
    const project_for_link: ProjectInfoForLink | null = options?.project
      ? options?.project
      : project
        ? project
        : appManager.get(ProjectManager).getProjectInfo();

    let html: string;
    const get_header_anchor = options?.getHeaderAnchor;
    if (typeof value === 'string') {
      html = (
        '<p>' +
        validator
          .escape(
            convertTranslatedTitle(value, (...args) => appManager.$t(...args)),
          )
          .replace(/\n/g, '</p><p>') +
        '</p>'
      ).replace(/<p><\/p>/g, '<p><br></p>');
    } else {
      const quillContent = unpackQuillDeltaFromPropValue(value);
      const prepared_ops: Op[] = [];
      for (let i = 0; i < quillContent.ops.length; i++) {
        /*prepared_ops.push({
          insert: {
            opref: i,
          },
        });*/
        let op = quillContent.ops[i];
        if (op?.attributes?.asset) {
          const asset_blot = op.attributes.asset as ImcAssetBlotData;
          const asset_project = asset_blot.value.Pid
            ? {
                id: asset_blot.value.Pid,
                title: '-',
              }
            : project_for_link;
          if (!asset_project) {
            delete op.attributes.asset;
          } else {
            op = {
              ...op,
              attributes: {
                ...op.attributes,
                link: getProjectLinkHref(
                  appManager.getRouter(),
                  asset_project,
                  {
                    name: 'project-asset-by-id',
                    params: {
                      assetId: asset_blot.value.AssetId,
                    },
                    hash: asset_blot.value.BlockId
                      ? '#' +
                        makeAnchorTagId(
                          asset_blot.value.BlockId,
                          asset_blot.value.Anchor
                            ? asset_blot.value.Anchor
                            : undefined,
                        )
                      : undefined,
                  },
                  true,
                ),
              },
            };
          }
        }
        prepared_ops.push(op);
      }
      const converter = new QuillDeltaToHtmlConverter(prepared_ops, {
        multiLineParagraph: false,
        linkTarget: '',
        customTagAttributes(op) {
          if (op.attributes) {
            if (
              op.attributes.header &&
              [1, 2, 3].includes(op.attributes.header)
            ) {
              if (get_header_anchor) {
                return {
                  id: '#',
                } as any;
              } else {
                return {} as any;
              }
            } else if (op.attributes.asset) {
              const asset_blot = op.attributes.asset as ImcAssetBlotData;
              return {
                class: IMC_ASSET_BLOT_CLASS,
                'data-asset-id': asset_blot.value?.AssetId,
                'data-asset-name': asset_blot.value?.Name ?? '',
                'data-asset-title': asset_blot.value?.Title,
                'data-asset-pid': asset_blot.value?.Pid ?? '',
                'data-asset-block-id': asset_blot.value?.BlockId ?? '',
                'data-asset-anchor': asset_blot.value?.Anchor ?? '',
                'data-asset-icon': asset_blot.icon ?? '',
              } as any;
            } else if (op.attributes.imcAdditionalIndent) {
              return {
                'data-imc-additional-indent': op.attributes.imcAdditionalIndent,
              };
            }
          }
        },
        urlSanitizer: (str: string) => {
          let val = str;
          val = val.replace(/^\s*/gm, '');
          const whiteList =
            /^((https?|s?ftp|file|blob|mailto|tel):|#|\/|data:image\/)/;
          if (whiteList.test(val)) {
            return val;
          }

          const project_link = project_for_link
            ? sanitizeProjectUrl($router as Router, project_for_link, val)
            : null;
          if (project_link) return project_link;

          return 'unsafe:' + val;
        },
      });
      converter.renderCustomWith((customOp, _contextOp) => {
        if (customOp.insert.type === 'file') {
          const file_blot = customOp.insert.value as ImcFileBlotData;
          const attributes = `
                class="${IMC_FILE_BLOT_CLASS}" 
                data-file-id="${validator.escape(`${file_blot.value?.FileId}`)}"
                data-inline="${file_blot.inline ? '1' : '0'}"
                data-dir="${validator.escape(`${file_blot.value?.Dir ?? ''}`)}"
                data-store="${validator.escape(`${file_blot.value?.Store}`)}"
                data-size="${validator.escape(`${file_blot.value?.Size}`)}"
                data-title="${validator.escape(`${file_blot.value?.Title}`)}"
                data-width="${validator.escape(`${file_blot.width}`)}"
                data-height="${validator.escape(`${file_blot.height}`)}"
                ${options?.contentId ? `data-content-id="${options?.contentId}"` : ''}
              `;
          if (customOp.attributes && customOp.attributes.link) {
            return `<a 
                  href="${validator.escape(customOp.attributes.link)}" 
                  ${attributes}>
                </a>`;
          } else {
            return `<span ${attributes}>${filePresenterRenderer({
              value: file_blot.value,
              width: file_blot.width,
              height: file_blot.height,
              inline: file_blot.inline,
            })}</span>`;
          }
        }
        if (customOp.insert.type === 'formula') {
          const formula_blot = customOp.insert.value as ImcFormulaBlotData;
          const attributes = `
                class="${IMC_FORMULA_BLOT_CLASS}" 
                data-value="${validator.escape(`${formula_blot}`)}"
              `;

          const formula = formula_blot
            ? katexRenderToString(formula_blot.toString(), {
                throwOnError: false,
                errorColor: 'var(--color-main-error)',
                strict: false,
              })
            : '';
          return `<span ${attributes}>${formula}</span>`;
        } else if (customOp.insert.type === 'upload-job') {
          return '';
        } else if (customOp.insert.type === 'icon') {
          const icon_blot = customOp.insert.value as ImcIconBlotData;
          return `<span class='${IMC_ICON_BLOT_CLASS}'><i class='asset-icon-${validator.escape(icon_blot)}'></i></span>`;
        } else if (customOp.insert.type === 'prop') {
          const prop_blot = customOp.insert.value as ImcPropBlotData;
          return `<span 
            class='${IMC_PROP_BLOT_CLASS}'
            data-inline="${prop_blot.inline ? '1' : '0'}"
            data-value="${validator.escape(JSON.stringify(prop_blot.value))}"
            >${validator.escape(castAssetPropValueToString(prop_blot.value))}</span>`;
        } else if (customOp.insert.type === 'opref') {
          return `<!--op:${customOp.insert.value}-->`;
        } else {
          return customOp.insert.type;
        }
      });
      const process_list_indents = (
        list_item: ListItem,
        expect_indent: number,
      ) => {
        const cur_indent = +(list_item.item.op.attributes.indent ?? 0);
        if (cur_indent > expect_indent) {
          list_item.item.op.attributes.imcAdditionalIndent =
            cur_indent - expect_indent;
        }
        if (list_item.innerList) {
          for (const item of list_item.innerList.items) {
            process_list_indents(item, cur_indent + 1);
          }
        }
      };

      converter.beforeRender((group_type, data) => {
        if (group_type === 'list') {
          const list_data = data as ListGroup;
          for (const item of list_data.items) {
            process_list_indents(item, 0);
          }
        }
        return '';
      });
      let header_cur_index = 0;
      converter.afterRender((group_type, html_string) => {
        if (group_type === 'block') {
          if (options?.getHeaderAnchor) {
            const parsed_tag_content = html_string.match(
              /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/,
            );
            if (parsed_tag_content) {
              const header_text = parsed_tag_content[2].replace(
                /<br\s*\/?>/gi,
                '',
              );

              const anchor = options?.getHeaderAnchor(
                header_text,
                parseInt(parsed_tag_content[1]),
                header_cur_index,
              );
              header_cur_index++;

              if (anchor) {
                html_string = html_string.replace(
                  'id="#"',
                  `id="${validator.escape(anchor)}"`,
                );
              }
            }
          }
          const parsed_pre_content = html_string.match(
            /^<pre([^>]*)>([\s\S]*?)<\/pre>$/,
          );
          if (parsed_pre_content) {
            const pre_attrs = parsed_pre_content[1] || '';
            const code_text = validator.unescape(parsed_pre_content[2]);

            const langMatch = pre_attrs.match(/data-language="([^"]+)"/);
            const lang = langMatch ? langMatch[1] : 'plain';

            const lang_opt = ImcTextCodeLangs.find((l) => l.key === lang);

            if (lang !== 'plain' && lang_opt) {
              try {
                const highlighted = hljs.highlight(code_text, {
                  language: lang,
                  ignoreIllegals: true,
                }).value;

                html_string = `<pre${pre_attrs}><span class="code-lang">${lang_opt.label}</span>${highlighted}</pre>`;
              } catch {
                // Do nothing
              }
            }
          }
        }
        return html_string;
      });
      html = converter.convert();
    }
    html = Autolinker.link(html.replace(/&#x2F;/g, '/'), {
      stripPrefix: false,
      urls: {
        schemeMatches: true,
        tldMatches: false,
      },
      replaceFn: (match) => {
        switch (match.type) {
          case 'phone': {
            const phone = match.getPhoneNumber();
            return phone.length < 12;
          }
        }
        return true;
      },
    });
    return html;
  };
}
