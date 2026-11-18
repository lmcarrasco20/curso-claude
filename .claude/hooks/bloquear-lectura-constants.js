// Hook PreToolUse (Read|Grep|Glob|Bash|PowerShell): impide leer el archivo CONSTANTS.js
const fs = require('fs')

const entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
const tool = entrada.tool_name || ''
const datos = entrada.tool_input || {}
const objetivo = /(^|[\/\s"'=])CONSTANTS\.js\b/i
const verbos_lectura = /(^|[\s;&|(])(cat|type|head|tail|less|more|bat|sed|awk|grep|egrep|rg|findstr|sls|select-string|get-content|gc|cp|copy|xxd|od|strings|node|code)(\s|$)/i

let bloquear = false

if (tool === 'Read') {
  bloquear = objetivo.test(datos.file_path || '')
} else if (tool === 'Grep' || tool === 'Glob') {
  bloquear = objetivo.test([datos.path, datos.glob, datos.pattern].filter(Boolean).join(' '))
} else {
  const comando = datos.command || ''
  bloquear = objetivo.test(comando) && verbos_lectura.test(comando)
}

if (bloquear) {
  console.error('Bloqueado: no se permite leer el archivo CONSTANTS.js.')
  process.exit(2)
}
