// 2026-11-28 — bükümde yan dayama sırası (M = mafsal / joint, G = gövde / body, K = makara / reel)
const en: Record<string, string> = {
  'YAN DAYAMA SIRASI': 'SIDE SUPPORT ORDER',
  'Bükümde her taraftaki yan dayamalar bu sırayla konuma gider (sıkıştırmadan önce sıfıra çekmede de). M = MAFSAL, G = GÖVDE, K = MAKARA.':
    'In bending the side supports on each side move to position in this order (also when retracting to zero before clamping). J = JOINT, B = BODY, R = REEL.',
  'M→G→K': 'J→B→R',
  'M→K→G': 'J→R→B',
  'G→M→K': 'B→J→R',
  'G→K→M': 'B→R→J',
  'K→M→G': 'R→J→B',
  'K→G→M': 'R→B→J',
}

export default en
