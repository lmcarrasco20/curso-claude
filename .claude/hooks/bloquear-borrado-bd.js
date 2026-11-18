// Hook PreToolUse (Bash|PowerShell): bloquea el borrado de la BBDD vendehumos.db
const fs = require('fs')

const entrada = JSON.parse(fs.readFileSync(0, 'utf8') || '{}')
const comando = (entrada.tool_input && entrada.tool_input.command) || ''

const verbos_borrado = /(^|[\s;&|(])(rm|rmdir|del|erase|unlink|shred|truncate|ri|rd|remove-item|git\s+(rm|clean))(\s|$)/i
const apunta_a_bd = /vendehumos\.db|\*\.db\b|\.db\b/i
const borrado_por_codigo = /(unlinkSync|unlink|rmSync|rm_rf|os\.remove|Path\.Delete|File\.Delete)[\s\S]*vendehumos\.db|vendehumos\.db[\s\S]*(unlinkSync|rmSync|os\.remove)/i

if ((verbos_borrado.test(comando) && apunta_a_bd.test(comando)) || borrado_por_codigo.test(comando)) {
  console.error('Bloqueado: no se permite borrar la base de datos vendehumos.db.')
  process.exit(2)
}
