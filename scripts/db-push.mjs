// Applies supabase/migrations/*.sql to a hosted Supabase database, in order,
// once each (tracked in public.payflow_migrations). Reads SUPABASE_DB_URL from
// .env.local so the connection string never appears on the command line.
//   npm run db:push
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import pg from 'pg'

function loadEnv(file) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv('.env.local')

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Set SUPABASE_DB_URL in .env.local (Supabase → Connect → Session pooler connection string).')
  process.exit(1)
}

// Parse by hand so passwords containing @ # / ? % etc. work without URL-encoding.
const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@/:]+)(?::(\d+))?\/([^?]*)/)
if (!m) {
  console.error('SUPABASE_DB_URL is not a valid postgresql:// connection string.')
  process.exit(1)
}
let password = m[2]
try {
  if (/%[0-9A-Fa-f]{2}/.test(password)) password = decodeURIComponent(password)
} catch { /* keep as typed */ }
const client = new pg.Client({
  user: m[1], password, host: m[3], port: Number(m[4] || 5432), database: m[5] || 'postgres',
  ssl: { rejectUnauthorized: false },
})
await client.connect()
await client.query(`create table if not exists public.payflow_migrations (name text primary key, applied_at timestamptz not null default now())`)
await client.query(`alter table public.payflow_migrations enable row level security`)
await client.query(`revoke all on public.payflow_migrations from anon, authenticated`)
const done = new Set((await client.query('select name from public.payflow_migrations')).rows.map((r) => r.name))

const dir = 'supabase/migrations'
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(file)) {
    console.log(`skip   ${file}`)
    continue
  }
  const sql = readFileSync(`${dir}/${file}`, 'utf8')
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('insert into public.payflow_migrations (name) values ($1)', [file])
    await client.query('commit')
    console.log(`apply  ${file}`)
  } catch (e) {
    await client.query('rollback')
    console.error(`failed ${file}: ${e.message}`)
    process.exit(1)
  }
}
await client.end()
console.log('Database is up to date.')
