import { jsonrepair } from 'jsonrepair';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { generateText, type LanguageModel } from 'ai';

export function parseMarkdown(md: string) {
  return DOMPurify.sanitize(marked.parse(md, { async: false }) as string);
}

export function fixJsonWithRepair(text: string) {
  const json = extractJsonFromMarkdown(text);
  if (json) return json;
  try {
    JSON.parse(text);
    return text;
  } catch {
    return jsonrepair(text);
  }
}

function extractJsonFromMarkdown(markdown: string): string | undefined {
  const regex = /```json\n([\s\S]*?)\n```/;
  const match = markdown.match(regex);
  return match ? match[1].trim() : undefined;
}

export function decodeLLMWrappedCode(val: string, lang: string[]) {
  const regexp = new RegExp(
    '^\\s*```(' + lang.join('|') + ')\\s*\\n(.*)\\n```\\s*$',
    's',
  );
  const match = val.match(regexp);
  if (match) return match[2];
  else return val;
}

function repairJSONAttempt2(raw: string): string {
  let noComments = '';
  let i = 0;
  const len = raw.length;
  while (i < len) {
    if (raw.charCodeAt(i) === 0xfeff) {
      i++;
      continue;
    }
    if (raw[i] === '/' && raw[i + 1] === '/') {
      i += 2;
      while (i < len && raw[i] !== '\n') i++;
      continue;
    }
    if (raw[i] === '/' && raw[i + 1] === '*') {
      i += 2;
      while (i < len - 1 && !(raw[i] === '*' && raw[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    noComments += raw[i];
    i++;
  }

  const str = noComments;
  const outChunks: string[] = [];
  let pos = 0;
  const L = str.length;

  const stack: string[] = [];
  let state = 'value';

  function isWhitespace(ch: string) {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
  }

  while (pos < L) {
    const ch = str[pos];

    if (isWhitespace(ch) && state !== 'inStringDQ' && state !== 'inStringSQ') {
      outChunks.push(ch);
      pos++;
      continue;
    }

    if (ch === '"' && state !== 'inStringSQ') {
      outChunks.push('"');
      pos++;
      while (pos < L) {
        if (str[pos] === '\\') {
          outChunks.push(str[pos++]);
          if (pos < L) outChunks.push(str[pos++]);
        } else if (str[pos] === '"') {
          outChunks.push('"');
          pos++;
          break;
        } else {
          outChunks.push(str[pos++]);
        }
      }
      if (state === 'value') state = 'comma';
      else if (state === 'key') state = 'colon';
      continue;
    }

    if (ch === "'" && state !== 'inStringDQ') {
      outChunks.push('"');
      pos++;
      while (pos < L) {
        if (str[pos] === '\\') {
          const esc = str[pos++];
          if (pos < L) {
            const nxt = str[pos];
            if (nxt === "'") {
              outChunks.push("'");
              pos++;
            } else if (nxt === '\\') {
              outChunks.push('\\\\');
              pos++;
            } else if (nxt === 'n') {
              outChunks.push('\\n');
              pos++;
            } else if (nxt === 't') {
              outChunks.push('\\t');
              pos++;
            } else if (nxt === 'r') {
              outChunks.push('\\r');
              pos++;
            } else if (nxt === '"') {
              outChunks.push('\\"');
              pos++;
            } else {
              outChunks.push(esc, nxt);
              pos++;
            }
          } else {
            outChunks.push(esc);
          }
        } else if (str[pos] === "'") {
          pos++;
          break;
        } else if (str[pos] === '"') {
          outChunks.push('\\"');
          pos++;
        } else {
          outChunks.push(str[pos++]);
        }
      }
      outChunks.push('"');
      if (state === 'value') state = 'comma';
      else if (state === 'key') state = 'colon';
      continue;
    }

    if (
      (ch >= '0' && ch <= '9') ||
      (ch === '-' && pos + 1 < L && str[pos + 1] >= '0' && str[pos + 1] <= '9')
    ) {
      const start = pos;
      if (str[pos] === '-') pos++;
      while (pos < L && str[pos] >= '0' && str[pos] <= '9') pos++;
      if (
        str[pos] === '.' &&
        pos + 1 < L &&
        str[pos + 1] >= '0' &&
        str[pos + 1] <= '9'
      ) {
        pos++;
        while (pos < L && str[pos] >= '0' && str[pos] <= '9') pos++;
      }
      if (str[pos] === 'e' || str[pos] === 'E') {
        pos++;
        if (str[pos] === '+' || str[pos] === '-') pos++;
        while (pos < L && str[pos] >= '0' && str[pos] <= '9') pos++;
      }
      outChunks.push(str.slice(start, pos));
      if (state === 'value') state = 'comma';
      continue;
    }

    if (state === 'value' && (ch === 't' || ch === 'f' || ch === 'n')) {
      const rest = str.slice(pos);
      if (rest.startsWith('true')) {
        outChunks.push('true');
        pos += 4;
        state = 'comma';
        continue;
      }
      if (rest.startsWith('false')) {
        outChunks.push('false');
        pos += 5;
        state = 'comma';
        continue;
      }
      if (rest.startsWith('null')) {
        outChunks.push('null');
        pos += 4;
        state = 'comma';
        continue;
      }
    }

    if (ch === '{') {
      outChunks.push('{');
      pos++;
      stack.push('object');
      state = 'key';
      continue;
    }
    if (ch === '[') {
      outChunks.push('[');
      pos++;
      stack.push('array');
      state = 'value';
      continue;
    }
    if (ch === '}') {
      outChunks.push('}');
      pos++;
      stack.pop();
      state = 'comma';
      continue;
    }
    if (ch === ']') {
      outChunks.push(']');
      pos++;
      stack.pop();
      state = 'comma';
      continue;
    }
    if (ch === ':') {
      outChunks.push(':');
      pos++;
      state = 'value';
      continue;
    }
    if (ch === ',') {
      outChunks.push(',');
      pos++;
      const container = stack[stack.length - 1];
      state = container === 'object' ? 'key' : 'value';
      continue;
    }

    if (state === 'key') {
      let key = '';
      while (pos < L && /[\p{L}\p{N}_$-]/u.test(str[pos])) {
        key += str[pos];
        pos++;
      }
      if (key.length > 0) {
        outChunks.push('"' + key + '"');
        state = 'colon';
      } else {
        outChunks.push(ch);
        pos++;
      }
      continue;
    }

    if (state === 'value') {
      let unquoted = '';
      while (pos < L) {
        const c = str[pos];
        if (c === ',' || c === '}' || c === ']') {
          if (c === ',') {
            let j = pos + 1;
            while (j < L && isWhitespace(str[j])) j++;
            const nextChar = j < L ? str[j] : '';
            if (
              nextChar === '"' ||
              nextChar === "'" ||
              nextChar === '{' ||
              nextChar === '[' ||
              nextChar === '}' ||
              nextChar === ']' ||
              (nextChar >= '0' && nextChar <= '9') ||
              nextChar === '-' ||
              (nextChar === 't' && str.substring(j, j + 4) === 'true') ||
              (nextChar === 'f' && str.substring(j, j + 5) === 'false') ||
              (nextChar === 'n' && str.substring(j, j + 4) === 'null')
            ) {
              break;
            } else {
              unquoted += c;
              pos++;
              continue;
            }
          } else {
            break;
          }
        } else {
          unquoted += c;
          pos++;
        }
      }
      outChunks.push(JSON.stringify(unquoted));
      state = 'comma';
      continue;
    }

    outChunks.push(ch);
    pos++;
  }

  let repaired = outChunks.join('');
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.stringify(JSON.parse(repaired));
  } catch (e: any) {
    throw new Error(
      `Could not repair JSON.\nRepaired string:\n${repaired}\n\nOriginal error: ${e.message}`,
    );
  }
}

function jsonrepairImproved(raw_json: string): string {
  if (!raw_json) return 'null';
  try {
    return jsonrepair(raw_json);
  } catch {
    return repairJSONAttempt2(raw_json);
  }
}

export function decodeLLMJSON(val: string) {
  const raw_json = decodeLLMWrappedCode(val, ['json']);
  try {
    return JSON.parse(raw_json);
  } catch {
    const repaired_json = jsonrepairImproved(raw_json);
    return JSON.parse(repaired_json);
  }
}

export async function decodeLLMJSONWithAi(
  repairModel: LanguageModel,
  val: string,
  validate?: (res: any) => void,
) {
  try {
    const res = decodeLLMJSON(val);
    if (validate) validate(res);
    return res;
  } catch {
    let last_prepared = val;
    try {
      const raw_json = decodeLLMWrappedCode(val, ['json']);
      last_prepared = raw_json;
      const repaired_json = jsonrepairImproved(raw_json);
      const res2 = JSON.parse(repaired_json);
      if (validate) validate(res2);
      last_prepared = repaired_json;
    } catch {
      // ignore
    }

    const response = await generateText({
      system:
        'You are tool that repairs given malformed JSON. *Answer always ONLY the JSON object. Do not include markdown code blocks, introductory text, or any other explanations.*',
      model: repairModel,
      prompt: last_prepared,
    });

    const res3 = decodeLLMJSON(response.text);
    if (validate) validate(res3);
    return res3;
  }
}

function svgrepair(svgString: string) {
  const svgTagRegex = /<svg\s+([^>]*?)>/i;
  const match = svgTagRegex.exec(svgString);

  if (!match) {
    return svgString;
  }

  const attributesString = match[1];
  const fullTag = match[0];
  const correctXmlns = 'http://www.w3.org/2000/svg';
  const xmlnsAttrRegex = /\bxmlns\s*=\s*(["'])(.*?)\1/i;

  const xmlnsMatch = xmlnsAttrRegex.exec(attributesString);

  let newAttributes: string;

  if (xmlnsMatch) {
    const existingValue = xmlnsMatch[2];
    if (existingValue === correctXmlns) {
      return svgString;
    }
    newAttributes = attributesString.replace(
      xmlnsAttrRegex,
      `xmlns=${xmlnsMatch[1]}${correctXmlns}${xmlnsMatch[1]}`,
    );
  } else {
    newAttributes = attributesString + ` xmlns="${correctXmlns}"`;
  }

  const newTag = `<svg ${newAttributes}>`;
  return svgString.replace(fullTag, newTag);
}

export function decodeLLMSVG(val: string) {
  const raw_svg = decodeLLMWrappedCode(val, ['svg']);
  const repaired_json = svgrepair(raw_svg);
  return repaired_json;
}
