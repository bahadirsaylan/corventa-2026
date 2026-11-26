// 2026-11-26 — Admin Ayarları: piston konumda tutma + rotasyon top çapı → PLC
const en: Record<string, string> = {
  'PİSTON KONUMDA TUTMA': 'PISTON POSITION HOLD',
  'Paylaşılan valf başka eksen (rotasyon, diğer piston, yan dayama) için açılınca duran piston kayar. Açıkken SADECE büküm işi, elle düzeltme ve tahliye sırasında piston bırakıldığı yerde tutulur: kayma ölü bandı aşınca düşük gerilimle geri itilir. Üst top parça sıkılıyken asla tutulmaz. PLC programı güncel değilse etkisizdir (PLC/PISTON_TUTMA_YUKLEME.md).':
    'When the shared valve opens for another axis (rotation, another piston, a side support) an idle piston drifts. When ON, ONLY during a bending job, manual correction and unloading the piston is held where it was left: once the drift exceeds the dead band it is pushed back with a low voltage. The upper roll is never held while the part is clamped. Has no effect unless the PLC program is up to date (PLC/PISTON_TUTMA_YUKLEME.md).',
  'KONUMDA TUTMA': 'POSITION HOLD',
  'TUT': 'HOLD',
  'TUTMA': 'DO NOT HOLD',
  'ALT TOP — PARÇA SIKILIYKEN': 'LOWER ROLL — WHILE CLAMPED',
  'AÇIK: parça sıkılıyken de alt top tutulur (geri iterken sıkıştırma basıncı değişebilir). Önce KAPALI deneyin.':
    'ON: the lower roll is held while the part is clamped too (pushing back may change the clamping pressure). Try OFF first.',
  'ÜST TOP (SIKILI DEĞİLKEN)': 'UPPER ROLL (WHEN NOT CLAMPED)',
  'Üst top sadece parça sıkılı değilken tutulur; sıkıştırma sürerken ve sonrasında (geri çekilene kadar) hiç tutulmaz.':
    'The upper roll is held only when the part is not clamped; never during clamping or afterwards (until it is retracted).',
  'ÖLÜ BANT': 'DEAD BAND',
  'Bu kadar kayınca düzeltmeye başlar. Salınım varsa büyütün.': 'Correction starts after this much drift. Increase if it oscillates.',
  'BİTİŞ BANDI': 'EXIT BAND',
  'Bu kadar yaklaşınca düzeltmeyi bırakır (ölü banttan küçük).': 'Correction stops this close to the hold point (smaller than the dead band).',
  'Hata başına gerilim. Salınım varsa düşürün.': 'Voltage per mm of error. Decrease if it oscillates.',
  'EN DÜŞÜK GERİLİM': 'MINIMUM VOLTAGE',
  'Valf ölü bölgesi — piston kıpırdamıyorsa ("TUTMA ARIZASI") artırın.': 'Valve dead zone — increase if the piston does not move ("HOLD FAULT").',
  'EN YÜKSEK GERİLİM': 'MAXIMUM VOLTAGE',
  'Düzeltme en fazla bu kadar gerilimle yapılır (PLC sınırı %20).': 'Correction never uses more than this voltage (PLC limit 20%).',
  'SOL VALF SIFIR OFSETİ': 'LEFT VALVE NULL OFFSET',
  'SAĞ VALF SIFIR OFSETİ': 'RIGHT VALVE NULL OFFSET',
  'ÜST VALF SIFIR OFSETİ': 'UPPER VALVE NULL OFFSET',
  'ALT VALF SIFIR OFSETİ': 'LOWER VALVE NULL OFFSET',
  'Valf açıkken hep eklenir (+ = geri yönde). Sızıntı yönünün tersine küçük değer. Bilinmiyorsa 0.':
    'Always added while the valve is open (+ = backward). A small value against the leak direction. 0 if unknown.',
  "ROTASYON TOP ÇAPINI PLC'YE GÖNDER": 'SEND ROTATION ROLL DIAMETER TO PLC',
  'AÇIK: rotasyon mm hesabı ÜST TOP ÇAPI ile yapılır (değişiklik rotasyon dururken ve iş yokken uygulanır). KAPALI: PLC sabit 220 mm kullanır (eski davranış).':
    'ON: rotation mm are computed with the UPPER ROLL DIAMETER (a change is applied when rotation is stopped and no job runs). OFF: the PLC uses a fixed 220 mm (previous behaviour).',
  "Sıkıştırma hedefinde kullanılır. Rotasyon encoder'ı (RV3100) üst topta — aşağıdaki ayar açıkken rotasyon mesafeleri de bu çapla hesaplanır.":
    'Used for the clamping target. The rotation encoder (RV3100) is on the upper roll — with the setting below ON, rotation distances are computed with this diameter too.',
}

export default en
