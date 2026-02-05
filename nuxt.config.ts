import { defineNuxtConfig } from 'nuxt/config';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  srcDir: 'app/',

  imports: {
    autoImport: false,
  },

  components: {
    dirs: [],
  },

  alias: {
    '#components': fileURLToPath(new URL('./app/components', import.meta.url)),
    '#logic': fileURLToPath(new URL('./app/logic', import.meta.url)),
    $style: fileURLToPath(new URL('./app/style', import.meta.url)),
    '~ims-plugin-base': fileURLToPath(
      new URL('./ims-plugins/base', import.meta.url),
    ),
  },

  // Needed to change priority for vscode
  typescript: {
    tsConfig: {
      compilerOptions: {
        paths: {
          '#components/*': ['../app/components/*'],
          '#logic/*': ['../app/logic/*'],
          '$style/*': ['../app/style/*'],
          '~ims-plugin-base/*': ['../ims-plugins/base/*'],
        },
      },
    },
  },

  vite: {
    plugins: [
      nodePolyfills({
        include: ['path'],
      }),
    ],
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
  },

  modules: ['@nuxtjs/i18n', '@nuxt/eslint'],
});
