import { useHead } from '#imports';
import type { MergeHead, UseHeadInput, UseHeadOptions } from '@unhead/vue';

export function usePageHead<T extends MergeHead>(
  input: UseHeadInput<T>,
  options?: UseHeadOptions,
) {
  if (import.meta.server && typeof input === 'function') {
    useHead(input(), options);
  } else {
    useHead(input, options);
  }
}
