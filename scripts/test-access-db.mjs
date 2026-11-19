import { URL } from 'node:url'
import console from 'node:console'
import process from 'node:process'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Ephemeral PostgreSQL engine. No network, credentials or existing databases.
const db = await PGlite.create()
try {
  for (const name of ['../supabase/tests/bootstrap.sql', '../supabase/migrations/202611170001_common_auth_access.sql', '../supabase/tests/access.sql', '../supabase/migrations/202611170002_executioner_workspace.sql', '../supabase/tests/execution.sql', '../supabase/migrations/202611180001_learning_records.sql', '../supabase/migrations/202611180002_learning_topic_thumbnails.sql', '../supabase/migrations/202611180003_learning_note_photos.sql', '../supabase/tests/learning.sql']) {
    const sql = (await readFile(new URL(name, import.meta.url), 'utf8')).replace(/^\\.*$/gm, '')
    await db.exec(sql)
  }
  console.log('PASS: auth access + executioner ownership, commands, stale-write rejection, day close/reopen, routines, immutable plans/events, revocation + personal learning records and access isolation')
} catch (error) {
  console.error('FAIL:', error.code, error.message, error.where ?? '')
  process.exitCode = 1
} finally { await db.close() }
