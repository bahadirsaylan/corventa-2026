// TEK DOSYA DEMO paketi (2026-11-04) — `npm run package:demo` → release-demo\Corventa Demo <sürüm>.exe
// package.json "build" ayarlarının aynısı; farklar: makine arka ucu (backend) dahil DEĞİL (demo sahte makineyle
// çalışır), hedef "portable" (kurulumsuz tek exe). Exe adındaki "Demo" kelimesi main/demo/demoBoot.ts'te demo +
// pencere modunu açar — ortam değişkeni / bat dosyası gerekmez.
// STANDART SÜRÜM (2026-11-17): `npm run package:demo:standard` (CORVENTA_EDITION=standard) → "Corventa Demo <sürüm> Standart.exe"
// (exe adında "Demo" kalır → demoBoot.ts demo modunu yine açar).
const pkg = require('../package.json')
// 2026-11-19 (kullanıcı): ad "Corventa AI V<sürüm>" / "Corventa Otonom V<sürüm>" (Otonom = Standart sürüm).
// Demo modu artık addan değil derleme bayrağından (CORVENTA_DEMO_BUILD) açılır — ad serbest.
const editionName = process.env.CORVENTA_EDITION === 'standard' ? 'Corventa Otonom' : 'Corventa AI'

module.exports = {
  ...pkg.build,
  directories: { output: 'release-demo' },
  extraResources: pkg.build.extraResources.filter((r) => r.to !== 'backend'),
  win: { target: ['portable'], icon: 'build/icon.ico' },
  portable: { artifactName: editionName + ' V${version}.exe' },
}
