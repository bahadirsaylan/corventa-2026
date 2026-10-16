// Çeviri kontrolü:  npm run i18n:check            (İngilizce)
//                   npm run i18n:check -- de      (Almanca vb. — klasör yoksa tüm anahtarlar eksik sayılır)
//
// Raporlar:
//  1) Kodda t('...') ile kullanılan ama seçilen dilin sözlüğünde olmayan anahtarlar
//  2) (en dışı diller) İngilizce sözlükte olup bu dilde olmayan anahtarlar — yeni dil için yapılacaklar listesi
//  3) Aynı dilde farklı dosyalarda farklı karşılığı olan anahtarlar
//  4) t() ile sarılmamış görünen Türkçe JSX metinleri (sezgisel; yorum satırları hariç).
//     Çevrilmemesi gereken metin (firma adı vb.) için satıra {/* i18n-ignore */} yorumu ekleyin.
// Eksik varsa çıkış kodu 1.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../src/renderer/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const I18N = join(ROOT, 'i18n')
const lang = process.argv[2] ?? 'en'

const STR = String.raw`'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"`
const unesc = (s) => s.replace(/\\(['"\\])/g, '$1')

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|mjs)$/.test(n)) out.push(p)
  }
  return out
}

function loadDict(code) {
  const dir = join(I18N, code)
  const dict = new Map()
  const conflicts = []
  if (!existsSync(dir)) return { dict, conflicts }
  const pair = new RegExp(String.raw`^\s*(?:${STR})\s*:\s*(?:${STR})`, 'gm')
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
    const src = readFileSync(join(dir, f), 'utf8')
    for (const m of src.matchAll(pair)) {
      const k = unesc(m[1] ?? m[2])
      const v = unesc(m[3] ?? m[4])
      if (dict.has(k) && dict.get(k).v !== v) conflicts.push(`${k}  →  "${dict.get(k).v}" (${dict.get(k).f}) / "${v}" (${f})`)
      dict.set(k, { v, f })
    }
  }
  return { dict, conflicts }
}

const files = walk(ROOT).filter((f) => !f.startsWith(I18N))
const used = new Map()
const untranslated = []
const tCall = new RegExp(String.raw`\bt\(\s*(?:${STR})`, 'g')
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(tCall)) {
    const k = unesc(m[1] ?? m[2])
    if (!used.has(k)) used.set(k, relative(ROOT, f))
  }
  if (f.endsWith('.tsx')) {
    src.split('\n').forEach((line, i) => {
      // yorum satırları, t() içeren satırlar ve "i18n-ignore" işaretli satırlar (özel isimler vb.) atlanır
      if (/^\s*(\/\/|\*|\{\s*\/\*)/.test(line) || /\bt\(|i18n-ignore/.test(line)) return
      const jsx = line.match(/>\s*([^<>{}]*[ÇĞİÖŞÜçğıöşü][^<>{}]*)\s*</)
      if (jsx && jsx[1].trim()) untranslated.push(`${relative(ROOT, f)}:${i + 1}  ${jsx[1].trim()}`)
    })
  }
}

const { dict, conflicts } = loadDict(lang)
const missingUsed = [...used].filter(([k]) => !dict.has(k))
let missingRef = []
if (lang !== 'en') {
  const ref = loadDict('en').dict
  missingRef = [...ref.keys()].filter((k) => !dict.has(k))
}

const section = (title, list) => {
  console.log(`\n== ${title} (${list.length})`)
  for (const x of list.slice(0, 400)) console.log('  ' + x)
  if (list.length > 400) console.log(`  … ${list.length - 400} daha`)
}

console.log(`Dil: ${lang} — sözlük ${dict.size} anahtar, kodda ${used.size} sabit anahtar`)
section('Kodda kullanılıp sözlükte olmayan', missingUsed.map(([k, f]) => `${k}    [${f}]`))
if (lang !== 'en') section('İngilizcede olup bu dilde olmayan', missingRef)
section('Çakışan karşılıklar', conflicts)
section('t() ile sarılmamış görünen Türkçe metin', untranslated)

process.exit(missingUsed.length || missingRef.length || conflicts.length ? 1 : 0)
