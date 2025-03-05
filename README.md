<h1 align="center">vite-mjs-to-zjs</h1>

<p align="center">
  一款用于在 <a href="https://cn.vitejs.dev/guide/build.html#library-mode">库模式</a> 中从 <code>.ts</code> 源文件生成 <code>.zjs</code> 文件的 Vite 插件
</p>

## 安装

```sh
npm i vite-mjs-to-zjs -D
```

## 使用

在 `vite.config.ts`：

```ts
import { defineConfig } from 'vite'
import { resolve } from 'path'
import zdjl from './src'

export default defineConfig({
  plugins: [
    zdjl()
  ],
  build: {
    minify: false, 
    lib: {
      entry: resolve(__dirname, './src/index.ts'),
      formats: ['es'], // 必须, 转换使用 mjs 文件作为基础
    }
  }
})
```

## 选项

```ts
type OptionOutputFormats = 'zjs' | 'cjs'

export interface PluginOption {
  /**
   * 依赖别名(仅替换名字)
   */
  alias?: Record<string, string>,
  /**
   * 删除该模块的导入语句
   */
  removeImport?: string[]
  /**
   * 删除副作用导入
   * @default true
   */
  removeSideEffectImport?: boolean
  /**
   * 使用另一个 zjs 文件作为生成文件的基础模板
   */
  template?: {
    /**
     * 模板文件路径
     */
    filepath?: string
    /**
     * 生成的动作插入的位置, 例如 1 则插入为第 1 个动作, 2 同理, 超出边界则插入为最后一个动作
     * @default Infinity
     */
    insertTo?: number
  },
  /**
   * 输出选项
   */
  output?: {
    /**
     * 输出目录
     */
    outdir?: string
    /**
     * 输出文件名
     */
    filename?: string
    /**
     * 输出格式
     */
    formats?: OptionOutputFormats[]
  },
  /**
   * zjs 脚本全局属性
   */
  manifest?: {
    [x: string]: any
    /**
     * 默认等待(ms)
     * @default "0"
     */
    delay?: string,
    /**
     * 动作失败后暂停
     * @default true
     */
    pauseOnFail?: boolean,
  }
}
```

## 已知问题
### 无法处理动态导入
vite默认会将动态导入(`import()`)拆分为单独的文件, 插件无法处理, 得到的文件内容不正确 
### 解决方案
**内联动态导入**
1. 在 vite 配置中设置 `build.rollupOptions.output.inlineDynamicImports` 为 `true`
   > 注意: 内联动态导入会将模块所有内容合并, 无法进行 tree-shaking 优化

**从网络导入**
1. 在 `build.rollupOptions.external` 中排除模块
   > 插件会将 ESM 模块语法转为 CJS 模块语法, 排除模块后 zdjl 将从网络载入
2. (可选)在插件选项 `alias` 中设置别名, 例如: `alias: {axios: 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'}`
