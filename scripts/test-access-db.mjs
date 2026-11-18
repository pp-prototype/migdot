import { URL } from 'node:url'
import console from 'node:console'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Ephemeral PostgreSQL engine. No network, credentials or existing databases.
const db = await PGlite.create()
try {
  for (const name of ['../supabase/tests/bootstrap.sql', '../supabase/migrations/202611170001_common_auth_access.sql', '../supabase/tests/access.sql']) {
    const sql = (await readFile(new URL(name, import.meta.url), 'utf8')).replace(/^\\.*$/gm, '')
    await db.exec(sql)
  }
  console.log('PASS: anonymous denial, no auto-promotion, owner RPCs, module grants, ownership, forged writes, live revocation, member disable, disabled modules')
} finally { await db.close() }
