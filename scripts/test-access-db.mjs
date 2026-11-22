import { URL } from 'node:url'
import console from 'node:console'
import process from 'node:process'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Ephemeral PostgreSQL engine. No network, credentials or existing databases.
const db = await PGlite.create()
try {
  for (const name of ['../supabase/tests/bootstrap.sql', '../supabase/migrations/202611170001_common_auth_access.sql', '../supabase/tests/access.sql', '../supabase/migrations/202611170002_executioner_workspace.sql', '../supabase/migrations/202611220001_execution_routine_goals.sql', '../supabase/migrations/202611220002_execution_habit_coaching.sql', '../supabase/tests/execution.sql']) {
    const sql = (await readFile(new URL(name, import.meta.url), 'utf8')).replace(/^\\.*$/gm, '')
    await db.exec(sql)
  }
  console.log('PASS: auth access + executioner ownership, commands, stale-write rejection, day close/reopen, routines, immutable plans/events, revocation')
} catch (error) {
  console.error('FAIL:', error.code, error.message, error.where ?? '')
  process.exitCode = 1
} finally { await db.close() }
