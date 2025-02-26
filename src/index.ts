import type { Plugin } from 'vite'
import type { Expand } from './utils'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { logger } from './logger'
import { formatFrom, mergeObject } from './utils'

const plugin_name = 'vite-mjs-to-zjs'

type OptionOutputFormats = 'zjs' | 'cjs'

export interface PluginOption {
  /**
   * 依赖别名(仅替换名字)
   */
  alias?: Record<string, string>,
  /**
   * 删除该模块的导入语句
   * @default ['zdjles']
   */
  removeImport?: string[]
  /**
   * 删除副作用导入
   * @default true
   */
  removeSideEffectImport?: boolean
  /**
   * 使用另一个 zjs文件 作为生成文件的基础模板, 生成的动作将作为最后一个动作添加
   */
  template?: {
    /**
     * 模板文件路径
     */
    filepath?: string
    /**
     * 生成的动作插入的位置, 1插入为第一个动作, 2同理, 超出边界则插入为最后一个动作
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

export default function zjsPlugin(pluginOption: PluginOption = {}): Plugin {
  const optionResolved = mergeObject(defaultOption, pluginOption) as OptionResolved

  if (!optionResolved.output?.formats?.length) {
    return {
      name: plugin_name
    }
  }

  return {
    name: plugin_name,
    config(config, env) {
      if (!(config.build?.lib as any).fileName) {
        (config.build?.lib as any).fileName = optionResolved.output.filename
      }
    },
    generateBundle(_normalizedOutputOptions, bundle) {
      Object.keys(bundle).forEach(filename => {
        const file = bundle[filename]
        const code = (<any>file)['code']
        processFile(code, optionResolved)
      })
    }
  }
}

export type DefaultOption = typeof defaultOption
const defaultOption = {
  removeImport: ['zdjles'],
  removeSideEffectImport: true,
  output: {
    filename: 'index',
    outdir: resolve('./dist'),
    formats: ['zjs']
  },
  template: {
    insertTo: Infinity
  },
  manifest: {
    delay: "0",
    pauseOnFail: true
  }
} satisfies PluginOption

type OptionResolved = Expand<DefaultOption & PluginOption>

function processFile(code: string, optionResolved: OptionResolved) {
  const outdir = optionResolved.output.outdir
  const filename = optionResolved.output.filename

  code = handleImport(code, optionResolved)
  code = handleExport(code)

  if (optionResolved.output?.formats?.includes('zjs')) {
    const processedScript = wrapZjs(code, optionResolved)
    const savefilename = `${filename}.zjs`
    saveScriptToFile(processedScript, outdir, savefilename)
  }

  if (optionResolved.output?.formats?.includes('cjs')) {
    const processedScript = wrapCjs(code)
    const savefilename = `${filename}.cjs`
    saveScriptToFile(processedScript, outdir, savefilename)
  }
}

function saveScriptToFile(content: string, outdir: string, filename: string) {
  const filePath = `${outdir}/${filename}`
  writeFile(filePath, content).catch(
    err => {
      logger.failure('Save File', 'Error', err.message)
    }
  )
}

function handleAlias(alias: OptionResolved['alias'], moduleName: string) {
  if (!alias) return moduleName
  if (Object.keys(alias).includes(moduleName)) {
    return alias[moduleName]
  }
  return moduleName
}

function handleImport(code: string, optionResolved: OptionResolved) {
  const alias = optionResolved.alias

  // 删除副作用导入
  if (optionResolved.removeSideEffectImport) {
    const sideEffectImportRegex = /import\ "[\S\s]+";/g
    code = code.replace(sideEffectImportRegex, '')
  }

  // 删除自定义导入
  if (optionResolved.removeImport.length) {
    const it = optionResolved.removeImport
    const regex = new RegExp(String.raw`import\s+([\s\S]*?)\s+from\s+['"](${it.join('|')})['"];`)
    code = code.replace(regex, '')
  }

  // 转换静态导入
  const staticImportRegex = /import\s+([\s\S]*?)\s+from\s+['"](.*?)['"];/g
  code = code.replace(staticImportRegex, (_match, ...[$1, $2]: Array<string>) => {
    if (alias) $2 = handleAlias(alias, $2)
    let to = ''
    // import $1(* as module) from '$2(module)'
    if ($1.startsWith('*')) {
      $1 = $1.split('as\ ')[1]
      to = `const ${$1} = require("${$2}");`
    }
    // import $1({ a as a1[, b] }) from '$2(module)'
    else if ($1.startsWith('{')) {
      $1 = $1.replace('\ as', ':')
      to = `const ${$1} = require("${$2}");`
    }
    // import $1(module, { add as add$1 }) from "$2(module)"
    else if ($1.includes(',\ {')) {
      const [defaultImport, ...namedImport] = $1.split(',\ {')
      to = `const ${defaultImport}=require("${$2}").default??require("${$2}");`
      namedImport[0].slice(1, -2)
        .split(',\ ')
        .forEach(item => {
          const [name, rename] = item.split('\ as\ ')
          to += `\nconst ${rename ?? name}=require("${$2}").${name};`
        })
    }
    // import $1(module) from '$2(module)'
    else {
      to = `const ${$1} = require("${$2}").default ?? require("${$2}");`
    }
    return to
  })

  // 转换动态导入
  const dynamicImportRegex = /import\s*\(\s*(['"].*?['"]|[^)]+)\s*\)/g
  code = code.replace(dynamicImportRegex, (_match, moduleName: string) => {
    if (alias && Object.keys(alias).length !== 0 && moduleName.startsWith(`"`)) {
      moduleName = handleAlias(alias, moduleName.slice(1, -1))
      moduleName = `"${moduleName}"`
    }
    return `Promise.resolve().then(() => require(${moduleName}))`
  })

  return code.trim()
}

function handleExport(code: string) {
  const exportRegex = /export\s*{([^}]+)};/g

  code = code.replace(exportRegex, (_match, exports: string) => {
    const exportStatements = exports
      .split(',')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0)

    const result = exportStatements.map(statement => {
      // named export
      if (statement.includes('as')) {
        const [original, alias] = statement.split('as').map(_ => _.trim())
        return `exports.${alias} = ${original};`
      }
      return `exports.${statement} = ${statement};`
    })

    return result.join('\n')
  })

  return code
}

function wrapZjs(code: string, optionResolved: OptionResolved) {
  const manifest = optionResolved.manifest
  const insertTo = optionResolved.template.insertTo

  const format: Record<string, any>[] = []
  const action = { type: "运行JS代码", jsCode: `"use strict";\n${code}`, desc: "@vite", }

  if (optionResolved.template.filepath) {
    const zjs = formatFrom({ filepath: optionResolved.template.filepath })
    format.push({ ...zjs[0], ...manifest }, ...zjs.slice(1))
    format.splice(insertTo <= 0 ? 1 : insertTo, 0, action)
  } else {
    format.push(manifest, action)
  }

  return format.map(action => JSON.stringify(action)).join('\n')
}

function wrapCjs(code: string) {
  // 可能存在顶级 await, 所以包一层 iife
  const iife = `(async function(module, exports){\n${code}\n}).call(globalThis, module, module.exports)`
  code = `"use strict";\nObject.defineProperties(exports ?? {}, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });\n${iife}`
  return code
}

