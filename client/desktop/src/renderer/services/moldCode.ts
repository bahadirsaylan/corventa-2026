// Kalıp kodu v1 (BULUT_API_V2.md §2.1–2.2) — uygulama src/shared/moldCode.ts içinde (main demo da aynı
// kuralı kullansın diye). Test: node --experimental-strip-types scripts/mold-code-selftest.mjs

export {
  MOLD_CODE_V1_RE,
  MOLD_CODE_V1_VECTORS,
  MOLD_CODE_V1_INVALID,
  normalizeMoldCode,
  isValidMoldCode,
  moldCodeFormatError,
  parseMoldCode,
  formatMoldCode,
  moldCodeSelfTest,
  type MoldCodeParts,
  type MoldCodeParseResult,
} from '@shared/moldCode'
