// TEK DOSYA DEMO paketi (2026-11-04) — `npm run package:demo` → release-demo\Corventa Demo <sürüm>.exe
// package.json "build" ayarlarının aynısı; farklar: makine arka ucu (backend) dahil DEĞİL (demo sahte makineyle
// çalışır), hedef "portable" (kurulumsuz tek exe). Exe adındaki "Demo" kelimesi main/demo/demoBoot.ts'te demo +
// pencere modunu açar — ortam değişkeni / bat dosyası gerekmez.
const pkg = require('../package.json')

module.exports = {
  ...pkg.build,
  directories: { output: 'release-demo' },
  extraResources: pkg.build.extraResources.filter((r) => r.to !== 'backend'),
  win: { target: ['portable'] },
  portable: { artifactName: 'Corventa Demo ${version}.exe' },
}
