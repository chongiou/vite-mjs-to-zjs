
enum Color {
  clear     = '\x1b[0m' , // 清除样式
  bright    = '\x1B[1m' , // 亮色
  grey      = '\x1B[2m' , // 灰色
  italic    = '\x1B[3m' , // 斜体
  underline = '\x1B[4m' , // 下划线
  reverse   = '\x1B[7m' , // 反向
  hidden    = '\x1B[8m' , // 隐藏
  black     = '\x1B[30m', // 黑色
  red       = '\x1B[31m', // 红色
  green     = '\x1B[32m', // 绿色
  yellow    = '\x1B[33m', // 黄色
  blue      = '\x1B[34m', // 蓝色
  magenta   = '\x1B[35m', // 品红
  cyan      = '\x1B[36m', // 青色
  white     = '\x1B[37m', // 白色
  bgblack   = '\x1B[40m', // 背景黑色
  bgred     = '\x1B[41m', // 背景红色
  bggreen   = '\x1B[42m', // 背景绿色
  bgyellow  = '\x1B[43m', // 背景黄色
  bgblue    = '\x1B[44m', // 背景蓝色
  bgmagenta = '\x1B[45m', // 背景品红
  bgcyan    = '\x1B[46m', // 背景青色
  bgwhite   = '\x1B[47m', // 背景白色
}

function grey(...text: Array<string>) {
  return Color.grey + text.join('\ ') + Color.clear
}
function bggreen(...text: Array<string>) {
  return Color.bggreen + text.join('\ ') + Color.clear
}
function bgred(...text: Array<string>) {
  return Color.bgred + text.join('\ ') + Color.clear
}
function bgyellow(...text: Array<string>) {
  return Color.bgyellow + text.join('\ ') + Color.clear
}
function bright(...text: Array<string>) {
  return Color.bright + text.join('\ ') + Color.clear
}

export const logger = {
  log(action: string, ...message: Array<any>) {
    console.log(grey(action), ...message)
  },
  success(action: string, ...message: Array<any>) {
    this.log(action, bright(bggreen(` Success `)), ...message)
  },
  failure(action: string, ...message: Array<any>) {
    this.log(action, bright(bgred(` Failure `)), ...message)
  },
  error(action: string, ...message: Array<any>) {
    this.log(action, bright(bgred(` Error `)), ...message)
  },
  warn(action: string, ...message: Array<any>) {
    this.log(action, bright(bgyellow(` Warn `)), ...message)
  }
}
export default logger
