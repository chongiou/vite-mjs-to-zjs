import { defineConfig } from 'vite'
import path from 'path'
import dts from 'vite-plugin-dts'
import zdjl from './src'

const testConfig = defineConfig({
  plugins: [
    zdjl()
  ],
  build: {
    minify: false, 
    lib: {
      entry: path.resolve('src/test/index.ts'),
      formats: ['es'],
    }
  }
})

const productionConfig = defineConfig({
  plugins: [
    dts({
      rollupTypes: true
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    lib: {
      entry: path.resolve('src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [/^node:/],
    }
  },
})

export default defineConfig(({ mode }) => {
  if (mode === 'test') {
    return testConfig
  } else {
    return productionConfig
  }
})
