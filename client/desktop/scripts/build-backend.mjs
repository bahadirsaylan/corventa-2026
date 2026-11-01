// 2026-11-01 — Paketli sürüm için backend'i (DataApi + Bending API) self-contained Release exe olarak derler.
// Çıktı: backend-dist/DataApi, backend-dist/BendingApi → electron-builder bunları resources/backend altına koyar.
// Backend repo yolu: CORVENTA_BACKEND_REPO, yoksa %USERPROFILE%\Desktop\SoftPLCCorventa.
// Hedef PC'de .NET kurulu olması gerekmez (self-contained, win-x64).
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outRoot = resolve(here, '..', 'backend-dist')
const repo = process.env.CORVENTA_BACKEND_REPO ?? join(homedir(), 'Desktop', 'SoftPLCCorventa')

const projects = [
  { name: 'DataApi', csproj: join(repo, 'src', 'CncBendingMachine.DataApi', 'CncBendingMachine.DataApi.csproj') },
  { name: 'BendingApi', csproj: join(repo, 'src', 'CncBendingMachine.Api', 'CncBendingMachine.Api.csproj') },
]

rmSync(outRoot, { recursive: true, force: true })

for (const p of projects) {
  if (!existsSync(p.csproj)) {
    console.error(`csproj bulunamadı: ${p.csproj} (CORVENTA_BACKEND_REPO ile repo yolunu verin)`)
    process.exit(1)
  }
  const out = join(outRoot, p.name)
  console.log(`\n=== ${p.name} → ${out}`)
  execFileSync(
    'dotnet',
    [
      'publish', p.csproj,
      '-c', 'Release',
      '-r', 'win-x64',
      '--self-contained', 'true',
      '-p:PublishSingleFile=false',
      '-p:DebugType=none',
      '-o', out,
    ],
    { stdio: 'inherit' },
  )
  // Geliştirme DB'si pakete girmesin (paketli sürüm C:\ProgramData\Corventa\machine.db kullanır)
  for (const f of ['machine.db', 'machine.db-wal', 'machine.db-shm']) {
    rmSync(join(out, f), { force: true })
  }
}

console.log(`\nBackend hazır: ${outRoot}`)
