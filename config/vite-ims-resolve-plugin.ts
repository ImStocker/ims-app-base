import { type PluginOption, normalizePath } from 'vite';
import { extname } from 'node:path';

export type ViteImsResolvePluginOptions = {
  projectRoots: string[];
};

// Plugins make sure that alises #components, #logic
// resolved corretly relative subprojects
export function viteImsResolvePlugin(
  pluginOptions: ViteImsResolvePluginOptions,
): PluginOption {
  const projectRoots = pluginOptions.projectRoots.map((r) => {
    const norm_r = normalizePath(r);
    return norm_r + (norm_r[norm_r.length - 1] === '/' ? '' : '/');
  });
  return {
    enforce: 'pre',
    name: 'ims-resolve-plugin',
    config(config) {
      if (config.resolve && config.resolve.alias) {
        delete config.resolve.alias['#components'];
        delete config.resolve.alias['#logic'];
      }
    },
    resolveId(source, importer, options) {
      const alias_match = source.match(/^(#components|#logic)\//);
      if (alias_match) {
        for (const root of projectRoots) {
          if (importer?.startsWith(root)) {
            const target =
              root +
              'app/' +
              alias_match[1].substring(1) +
              '/' +
              source.substring(alias_match[0].length);
            const ext = extname(source);
            return target + (ext ? '' : '.ts');
          }
        }
      }
      return null;
    },
  };
}
