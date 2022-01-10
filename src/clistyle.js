module.exports = {
  // Styles
  // bold: (string) => apply(string, '\x1b[1m'),
  underline: (string) => apply(string, '\x1b[4m'),
  // inverse: (string) => apply(string, '\x1b[7m'),
  // Colors (text)
  // black: (string) => apply(string, '\x1b[30m'),
  red: (string) => apply(string, '\x1b[31m'),
  green: (string) => apply(string, '\x1b[32m'),
  yellow: (string) => apply(string, '\x1b[33m'),
  // blue: (string) => apply(string, '\x1b[34m'),
  // magenta: (string) => apply(string, '\x1b[35m'),
  // cyan: (string) => apply(string, '\x1b[36m'),
  // white: (string) => apply(string, '\x1b[37m'),
  // Colors (background)
  // blackBg: (string) => apply(string, '\x1b[40m'),
  // redBg: (string) => apply(string, '\x1b[41m'),
  // greenBg: (string) => apply(string, '\x1b[42m'),
  // yellowBg: (string) => apply(string, '\x1b[43m'),
  // blueBg: (string) => apply(string, '\x1b[44m'),
  // magentaBg: (string) => apply(string, '\x1b[45m'),
  // cyanBg: (string) => apply(string, '\x1b[46m'),
  // whiteBg: (string) => apply(string, '\x1b[47m'),
}

function apply(string, styleTag) {
  const resetTag = '\x1b[0m'
  return `${styleTag}${string}${resetTag}`
}
