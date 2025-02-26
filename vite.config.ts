import type { UserConfig } from 'vite'
import path from 'path'
import dts from 'vite-plugin-dts'

export default {
  plugins: [
    dts({
      rollupTypes: true
    }),
  ],
  build: {
    target: 'es2022',
    minify: true,
    lib: {
      entry: path.resolve('./src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [/^node:/],
    }
  },
} satisfies UserConfig
