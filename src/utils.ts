import { readFileSync } from "node:fs"

/** 
 * 展开对象属性
 */
export type Expand<DeepObject> = DeepObject extends object
  ? DeepObject extends infer InferType
  ? { [Prop in keyof InferType]: Expand<InferType[Prop]> }
  : never
  : DeepObject

type Input = { filepath: string, content?: never } | { content: string, filepath?: never }
export function formatFrom(zjs: Input) {
  let content = zjs.content ?? readFileSync(zjs.filepath).toString()
  // 用户的内容会被转义一遍 \r\n -> \\r\\n, 所以直接替换也没问题, 除非是用户自己粘贴的……
  const replaced = content.replace(/}\r?\n{(\r?\n\ \ )?"type":/g, '},\r\n{"type":')

  const wrap = `[${replaced}]`
  const formatted: Record<string, any>[] = JSON.parse(wrap)
  return formatted
}

export function isPlainObject(val: unknown): val is Record<string, any> {
  return Object.prototype.toString.call(val) === '[object Object]'
}

/** 
 * 合并对象
 */
export function mergeObject(target: Record<string, any>, ...sources: Array<Record<string, any>>) {
  if (!(Object.keys(target) || sources.length)) {
    return sources[0]
  }
  return sources.reduce((target, sourceElement) => {
    // 遍历源
    return Object.keys(sourceElement).reduce((target, sourceElementKey) => {
      const sourceElementValue = (sourceElement)[sourceElementKey]
      if (isPlainObject(sourceElementValue)) {
        // 目标同名属性类型冲突，覆盖为空对象
        !isPlainObject(target[sourceElementKey]) && (target[sourceElementKey] = {})
        target[sourceElementKey] = mergeObject(target[sourceElementKey], sourceElementValue)
      }
      // else if (Array.isArray(sourceElementValue) && Array.isArray(target[sourceElementKey])) {
      //   target[sourceElementKey] = [...target[sourceElementKey], ...sourceElementValue]
      // }
      else {
        target[sourceElementKey] = sourceElementValue
      }

      return target
    }, target)
  }, target)
}
