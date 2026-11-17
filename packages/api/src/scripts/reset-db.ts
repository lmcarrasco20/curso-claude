import type { Database } from '@config/database.js'

/**
 * Borra todos los datos de todas las tablas de la aplicación conservando el esquema.
 * Las tablas se leen de sqlite_master, así que las que se añadan en el futuro también se vacían.
 */
export const resetDatabase = async (db: Database): Promise<void> => {
    const tables = await db.all<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    )

    // Se desactivan las claves foráneas para no depender del orden de borrado
    await db.run('PRAGMA foreign_keys = OFF')
    try {
        for (const { name } of tables) {
            await db.run(`DELETE FROM "${name}"`)
        }
    } finally {
        await db.run('PRAGMA foreign_keys = ON')
    }
}
