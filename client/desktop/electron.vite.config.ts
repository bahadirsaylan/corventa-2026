import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Tek dosya demo paketi (npm run package:demo) main/preload kodunu da küçültür; normal build değişmez.
const minifyDemo = process.env.CORVENTA_MINIFY === '1'

const sharedAliases = [
  { find: /^@shared$/, replacement: resolve('src/shared/index.ts') },
  { find: /^@shared\/(.*)$/, replacement: resolve('src/shared') + '/$1' },
]

export default defineConfig({
  main: {
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
