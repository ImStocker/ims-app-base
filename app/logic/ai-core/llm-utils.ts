import { jsonrepair } from "jsonrepair"
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { generateText, type LanguageModel } from "ai"

export function parseMarkdown(md: string) {
    return DOMPurify.sanitize(marked.parse(md, { async: false }) as string)
}

export function fixJsonWithRepair(text: string) {
    const json = extractJsonFromMarkdown(text)
    if (json) return json
    try {
        JSON.parse(text)
        return text
    } catch {
        return jsonrepair(text)
    }
}

function extractJsonFromMarkdown(markdown: string): string | undefined {
    const regex = /```json\n([\s\S]*?)\n```/
    const match = markdown.match(regex)
    return match ? match[1].trim() : undefined
}

export function decodeLLMWrappedCode(val: string, lang: string[]) {
    const regexp = new RegExp('^\\s*```(' + lang.join('|') + ')\\s*\\n(.*)\\n```\\s*$', 's')
    const match = val.match(regexp);
    if (match) return match[2]!;
    else return val;
}

function jsonrepairImproved(raw_json: string): string {
    if (!raw_json) return 'null';
    try {
        return jsonrepair(raw_json)
    }
    catch {
        return raw_json;
    }
}

export function decodeLLMJSON(val: string) {
    const raw_json = decodeLLMWrappedCode(val, ['json'])
    try {
        return JSON.parse(raw_json);
    }
    catch {
        const repaired_json = jsonrepairImproved(raw_json)
        return JSON.parse(repaired_json);
    }
}

export async function decodeLLMJSONWithAi(repairModel: LanguageModel, val: string, validate?: (res: any) => void) {
    try {
        const res = decodeLLMJSON(val)
        if (validate) validate(res);
        return res;
    }
    catch {
        let last_prepared = val;
        try {
            const raw_json = decodeLLMWrappedCode(val, ['json'])
            last_prepared = raw_json;
            const repaired_json = jsonrepairImproved(raw_json)
            const res2 = JSON.parse(repaired_json);
            if (validate) validate(res2);
            last_prepared = repaired_json;
        }
        catch {
            // Ignore
        }

        const response = await generateText({
            system: "You are tool that repairs given malformed JSON. *Answer always ONLY the JSON object. Do not include markdown code blocks, introductory text, or any other explanations.*",
            model: repairModel,
            prompt: last_prepared
        });

        const res3 = decodeLLMJSON(response.text);
        if (validate) validate(res3);
        return res3;
    }
}
