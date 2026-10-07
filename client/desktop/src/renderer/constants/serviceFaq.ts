// Sık Sorulan Sorular / En Çok Alınan Öneriler / Sık Karşılaşılan Şikayetler.
//
// Şimdilik frontend constants olarak tutuluyor — useFaqEntries() hook'u bu listeyi döner.
// Cloud'a / DataApi'ye geçişte tek değişiklik: hook impl'i async fetch'e döner, bileşenler dokunmadan.
//
// Kategori-tip eşleşmesi:
//   question   → "SIK SORULAN SORULAR"
//   suggestion → "EN FAZLA ALINAN ÖNERİLER"
//   complaint  → "SIK KARŞILAŞILAN ŞİKAYETLER"

export interface FaqEntry {
  /** Kategori bazında kısa kod (S.1, Ö.2, Ş.3 gibi) */
  code: string
  question: string
  answer: string
}

export const FAQ_QUESTIONS: FaqEntry[] = [
  {
    code: 'S.1',
    question: 'MAKİNE GÜVENLİ MOD EKRANINDA AÇILDI, KIVRIM YAPAMIYORUM.',
    answer:
      'Güvenli mod, acil durdurma butonu basılıyken veya motor/faz/termal güvenlik sinyallerinden biri aktifken görüntülenir. Acil durdurma kilidini kontrol edin. Hata devam ediyorsa Ayarlar > Hata Raporları üzerinden son hatayı inceleyin.',
  },
  {
    code: 'S.2',
    question: 'MAKİNE KIVRIM ESNASINDA GÜVENLİ MODA GEÇEREK MİLLERİ SERBEST BIRAKTI.',
    answer:
      'Bu davranış genellikle aşırı yüklenmeye karşı koruma amaçlıdır. Yağ basıncı, motor termal değeri veya hidrolik akış sensörlerinden biri eşik dışına çıktığında milleri serbest bırakırız. Yağ sıcaklığı ve seviyesini ana ekrandan kontrol edin.',
  },
  {
    code: 'S.3',
    question: 'MAKİNE AÇILIŞTA TEMAS SENSÖRÜ ARIZASI VERDİ NASIL KIVRIM YAPABİLİRİM?',
    answer:
      'Bu hata temas sensörünün arızalandığını veya elektrik bağlantılarında bir sorun olduğunu gösterir. İlk olarak elektrik bağlantılarının doğru oturduğunu kontrol ederek sorunu anlamalıyız. Temas sensörünün görevi parçanın doğru yüklenmesini sağlamaktır. Bu işlemi manuel olarak ekrandaki TOUCH butonunu kullanarak ve makina üstündeki pozisyonu kullanarak gerçekleştirebilirsiniz.',
  },
  {
    code: 'S.4',
    question: 'MAKİNAYA KULLANICI NASIL EKLERİM VEYA DENETİMİNİ NASIL KALDIRABİLİRİM?',
    answer:
      'Ayarlar > Kullanıcı Yönetimi ekranı, makine üzerindeki tüm kullanıcıları listeler. Yeni kullanıcı eklemek için "Ekle" butonu ile ad, soyad ve yetki seviyesi tanımlayabilirsiniz. Denetimi kaldırma için kullanıcı satırından "Yetki Kaldır" seçeneği kullanılır.',
  },
]

export const FAQ_SUGGESTIONS: FaqEntry[] = [
  {
    code: 'Ö.1',
    question: 'SERVİS HİZMETİNİ YILLIK BAKIM ANLAŞMASI ADI ALTINDA TOPLAMAK',
    answer:
      'Önerinizle ilgili global çapta bir çalışmamız bulunmakta olup, bu değerli fikrinizi bizimle paylaştığınız için çok teşekkür ederiz.',
  },
  {
    code: 'Ö.2',
    question: 'SORU VE ŞİKAYET ÇÖZÜMLERİNDE ÇÖZÜM ADIMINA BUTON İLE YÖNLENDİRME',
    answer:
      'Öneriniz değerlendirilmek üzere ürün ekibimize iletilmiştir. Yapılan toplantı sonucu ilgili adımın bir sonraki sürümde gerçekleştirilmesine karar verilmiştir.',
  },
  {
    code: 'Ö.3',
    question: '7/24 CANLI DESTEK ALABİLMEK',
    answer:
      'Önerinizle ilgili global çapta bir çalışmamız bulunmakta olup, bu değerli fikrinizi bizimle paylaştığınız için çok teşekkür ederiz. Düşüncelerinizi bizlerle paylaştığınız için tarafınıza ufak bir hediye gönderimi sağlanmıştır.',
  },
  {
    code: 'Ö.4',
    question: 'SESLİ KOMUT ALGILAMA MODÜLÜ',
    answer:
      'Sesli komut altyapısının makinaya entegrasyonu üzerine bir çalışma başlatılmıştır. Geri dönüş süresi yaklaşık 6-9 aydır.',
  },
]

export const FAQ_COMPLAINTS: FaqEntry[] = [
  {
    code: 'Ş.1',
    question: 'MAKİNA YAĞ DEĞİŞİM ARALIĞI ÇOK KISA!',
    answer:
      'Yağ değişim aralığı, yağ kalitesi sensörlerinden alınan ölçümler doğrultusunda otomatik olarak hesaplanır. Eğer süre çok kısa görünüyorsa, yağ kalitesi düşmüş olabilir; servis ekibimiz yağ analizi için sizinle iletişime geçecektir.',
  },
  {
    code: 'Ş.2',
    question: 'MAKİNA PROFİLİ EZİYOR!',
    answer:
      'Şikayetinizden kaynaklı vals topu kodunu doğru girmediğinizden veya boş bıraktığınızdan dolayı oluşmuş olabilir. Lütfen "AI BENDING > KIVRIM PROFİLİNİ SEÇİNİZ > KIVRIM YÖNÜNÜ SEÇİNİZ > KIVRIM METODUNU SEÇİNİZ > KIVRIM ÖLÇÜLERİNİ GİRİNİZ" sayfasının alt uyarı bölümünde yer alan bölümdeki vals topu kodu ile makinenin üzerinde bulunan vals topu kodunu karşılaştırınız. Şikayetiniz devam ediyorsa İLETİŞİM > TEL. NO.',
  },
  {
    code: 'Ş.3',
    question: 'MAKİNA KIVRIM YAPMIYOR!',
    answer:
      'Bu sorun farklı sebeplerden kaynaklanabilir. Hidrolik motor açık değilse veya güvenli mod aktifse kıvrım komutları engellenir. Ana ekrandan motor durumunu kontrol edin. Sorun devam ediyorsa "Sorunum devam ediyor" seçeneğiyle canlı destek talep edebilirsiniz.',
  },
  {
    code: 'Ş.4',
    question: 'MAKİNA SÜREKLİ GÜVENLİ MOD\'A GİRİYOR!',
    answer:
      'Güvenli moda geçişin en yaygın sebepleri: faz sırası bozulması, motor termal koruma, yağ sıcaklığı yüksekliği veya acil durdurma butonunun mekanik gevşemesi. Ayarlar > Hata Raporları ekranında son 24 saatteki hata serisini görüp ortak nedeni tespit edebilirsiniz.',
  },
]

export function getFaqByType(type: 'question' | 'suggestion' | 'complaint'): FaqEntry[] {
  switch (type) {
    case 'question':
      return FAQ_QUESTIONS
    case 'suggestion':
      return FAQ_SUGGESTIONS
    case 'complaint':
      return FAQ_COMPLAINTS
  }
}
