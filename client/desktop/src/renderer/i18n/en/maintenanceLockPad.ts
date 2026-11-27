// 2026-11-27 — bakım modunda tuş takımı / motor kilidi
const en: Record<string, string> = {
  'BAKIM MODU — TUŞ TAKIMI KAPALI': 'MAINTENANCE MODE — KEYPAD DISABLED',
  'Hidrolik motor kapalı. Bakım modundan çıkınca tuş takımı ve motor yeniden kullanılabilir.':
    'The hydraulic motor is off. The keypad and motor can be used again after leaving maintenance mode.',
  'BAKIM MODUNDA MOTOR VE TUŞ TAKIMI KİLİDİ': 'MOTOR AND KEYPAD LOCK IN MAINTENANCE MODE',
  'AÇIK: bakım modu açılınca hidrolik motor kapanır, bakım modundan çıkmadan çalıştırılamaz ve tuş takımı kapalı olur. Büküm / tahliye sürüyorsa motor iş bitince kapanır.':
    'ON: entering maintenance mode stops the hydraulic motor; it cannot be started and the keypad stays disabled until maintenance mode is left. If bending / unloading is running, the motor stops when it finishes.',
  'BAKIM MODU AÇIK — hidrolik motor çalıştırılamaz. Önce bakım modundan çıkın.':
    'MAINTENANCE MODE ON — the hydraulic motor cannot be started. Leave maintenance mode first.',
}

export default en
