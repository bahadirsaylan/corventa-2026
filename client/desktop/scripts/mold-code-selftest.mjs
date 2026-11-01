// Kalıp kodu v1 test vektörleri (BULUT_API_V2.md §2.2) — src/shared/moldCode.ts
// Çalıştır: npm run test:mold-code   (Node ≥ 22.6, --experimental-strip-types)
import { moldCodeSelfTest, MOLD_CODE_V1_VECTORS, MOLD_CODE_V1_INVALID } from '../src/shared/moldCode.ts'

const failures = moldCodeSelfTest()
if (failures.length) {
  console.error('KALIP KODU TESTİ BAŞARISIZ:')
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`kalıp kodu v1: ${MOLD_CODE_V1_VECTORS.length} geçerli + ${MOLD_CODE_V1_INVALID.length} geçersiz vektör OK`)
