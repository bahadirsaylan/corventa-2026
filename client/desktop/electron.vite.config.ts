import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Tek dosya demo paketi (npm run package:demo) main/preload kodunu da küçültür; normal build değişmez.
const minifyDemo = process.env.CORVENTA_MINIFY === '1'

// STANDART SÜRÜM (2026-11-17) — derleme anında sürüm: CORVENTA_EDITION=standard → 'standard', yoksa 'ai'.
// Tek okuma noktası src/shared/edition.ts (docs/STANDART_SURUM.md). main, preload ve renderer aynı değeri görür.
const editionDefine = {
  __CORVENTA_EDITION__: JSON.stringify(process.env.CORVENTA_EDITION === 'standard' ? 'standard' : 'ai'),
}

const sharedAliases = [
  { find: /^@shared$/, replacement: resolve('src/shared/index.ts') },
  { find: /^@shared\/(.*)$/, replacement: resolve('src/shared') + '/$1' },
]

export default defineConfig({
  main: {
    define: editionDefine,
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: [
        ...sharedAliases,
        { find: /^@main\/(.*)$/, replacement: resolve('src/main') + '/$1' },
      ],
    },
    build: {
      outDir: 'out/main',
      minify: minifyDemo,
    },
  },
  preload: {
    define: editionDefine,
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: sharedAliases,
    },
    build: {
      outDir: 'out/preload',
      minify: minifyDemo,
    },
  },
  renderer: {
    root: 'src/renderer',
    define: editionDefine,
    resolve: {
      alias: [
        { find: /^@\/(.*)$/, replacement: resolve('src/renderer') + '/$1' },
        ...sharedAliases,
      ],
    },
    plugins: [react()],
    build: {
      outDir: 'out/renderer',
    },
  },
})
