// İngilizce sözlük — Servis bölümü (ServicePage/*, ServiceNetworkPage, SSS, eğitim içerikleri).
// Anahtar = Türkçe kaynak metin (birebir), değer = İngilizce. {ad} yer tutucuları iki tarafta aynı.
const en: Record<string, string> = {
  // ── Ortak iskelet / genel ─────────────────────────────
  Geri: 'Back',
  'MÜŞTERİ ADI :': 'CUSTOMER NAME :',
  'Yükleniyor...': 'Loading...',
  'Hata: {err}': 'Error: {err}',
  İPTAL: 'CANCEL',
  GÖNDER: 'SEND',
  'GERİ DÖN': 'GO BACK',
  'AÇIKLAMA :': 'DESCRIPTION :',
  'KONU :': 'TOPIC :',

  // ── Ana sayfa + kategori rozetleri ────────────────────
  'SERVICE & DESTEK MERKEZİ': 'SERVICE & SUPPORT CENTER',
  SERVİCE: 'SERVICE',
  KURULUM: 'INSTALLATION',
  EĞİTİM: 'TRAINING',
  SORU: 'QUESTION',
  ÖNERİ: 'SUGGESTION',
  ŞİKAYET: 'COMPLAINT',
  TALEPLER: 'REQUESTS',
  'Henüz kayıtlı talep yok': 'No requests recorded yet',

  // ── Ticket durumları ──────────────────────────────────
  BEKLEMEDE: 'PENDING',
  CEVAPLANDI: 'ANSWERED',
  'DEVAM EDİYOR': 'IN PROGRESS',
  'ONAYLANDI KONU KAPATILDI': 'CONFIRMED, TOPIC CLOSED',
  KAPATILDI: 'CLOSED',

  // ── Servis talebi amaç + durumları ────────────────────
  'ARIZA GİDERME': 'TROUBLESHOOTING',
  'GENEL BAKIM': 'GENERAL MAINTENANCE',
  'AĞIR BAKIM': 'MAJOR OVERHAUL',
  PLANLANDI: 'PLANNED',
  GÖNDERİLDİ: 'SENT',
  TAMAMLANDI: 'COMPLETED',

  // ── Servis talepleri & raporları ──────────────────────
  'SERVİSİ DEĞERLENDİR': 'RATE THE SERVICE',
  'SERVİS TALEPLERİ & RAPORLARI': 'SERVICE REQUESTS & REPORTS',
  'SERVİS TALEPLERİ': 'SERVICE REQUESTS',
  'SERVİS RAPORLARI': 'SERVICE REPORTS',
  'Henüz talep yok': 'No requests yet',
  'Henüz rapor yok': 'No reports yet',
  '(Açıklama yok)': '(No description)',
  'YENİ TALEP OLUŞTUR': 'CREATE NEW REQUEST',
  'TALEPLERİ GÖRÜNTÜLE': 'VIEW REQUEST',
  'RAPOR GÖRÜNTÜLE': 'VIEW REPORT',

  // ── Talep / rapor detayı ──────────────────────────────
  'SERVİS DETAYI': 'SERVICE DETAILS',
  'SERVİS RAPORU': 'SERVICE REPORT',
  'SERVİS TALEBİ': 'SERVICE REQUEST',
  'SERVİS ONAYI ALINDI': 'SERVICE CONFIRMATION RECEIVED',
  'ONAY KODUNU GİRİNİZ': 'ENTER THE CONFIRMATION CODE',
  DOĞRULA: 'VERIFY',
  MÜŞTERİ: 'CUSTOMER',
  'MAKİNA MODELİ': 'MACHINE MODEL',
  'MAKİNA KODU': 'MACHINE CODE',
  TEKNİSYEN: 'TECHNICIAN',
  '(atanmamış)': '(unassigned)',
  AMAÇ: 'PURPOSE',
  DURUM: 'STATUS',
  DEĞERLENDİRME: 'RATING',
  'PROBLEM TANIMI / TEKNİK YANIT': 'PROBLEM DESCRIPTION / TECHNICAL RESPONSE',
  '(Detay yok)': '(No details)',
  'SERVİSİ TAMAMLA → RAPOR ÜRET': 'COMPLETE SERVICE → GENERATE REPORT',

  // ── Yeni servis talebi formu ──────────────────────────
  'YENİ SERVİS TALEBİ': 'NEW SERVICE REQUEST',
  'SERVİSİN AMACI :': 'SERVICE PURPOSE :',
  'TALEBİN BAŞLIĞINI GİRİNİZ...': 'ENTER THE REQUEST TITLE...',
  'TALEBİNİZİN DETAYINI YAZINIZ...': 'DESCRIBE YOUR REQUEST IN DETAIL...',
  'TALEBİ GÖNDER': 'SUBMIT REQUEST',

  // ── Servis değerlendirme ──────────────────────────────
  'ALDIĞINIZ SERVİSİ 1 İLE 10 ARALIĞINDA DEĞERLENDİREREK SERVİS KALİTESİNİ ARTTIRMAMIZA YARDIMCI OLABİLİRSİNİZ.':
    'BY RATING THE SERVICE YOU RECEIVED ON A SCALE OF 1 TO 10, YOU CAN HELP US IMPROVE OUR SERVICE QUALITY.',
  Arttır: 'Increase',
  Azalt: 'Decrease',
  '( ALDIĞINIZ HİZMETLE İLGİLİ GÖRÜŞLERİNİZİ PAYLAŞABİLİRSİNİZ. )':
    '( FEEL FREE TO SHARE YOUR THOUGHTS ABOUT THE SERVICE YOU RECEIVED. )',
  'DEĞERLENDİRMEYİ KAYDET': 'SAVE RATING',

  // ── Soru / Öneri / Şikayet merkezleri ─────────────────
  'SORU MERKEZİ': 'QUESTION CENTER',
  'ÖNERİ MERKEZİ': 'SUGGESTION CENTER',
  'ŞİKAYET MERKEZİ': 'COMPLAINT CENTER',
  'TEKNOLOJİNİN BİZE SUNDUĞU EN ÖNEMLİ DEĞER İLETİŞİMDİR. TAKILDIĞINIZ HER KONUDA BİLGİ VE TECRÜBEMİZLE SİZ DEĞERLİ MÜŞTERİLERİMİZE YARDIMCI OLMAYA ÇALIŞACAĞIZ.':
    'THE MOST VALUABLE THING TECHNOLOGY OFFERS US IS COMMUNICATION. WHEREVER YOU GET STUCK, WE WILL DO OUR BEST TO HELP YOU, OUR VALUED CUSTOMERS, WITH OUR KNOWLEDGE AND EXPERIENCE.',
  'SİZLERİN DEĞERLİ FİKİRLERİ BİZİM İÇİN ÇOK KIYMETLİDİR. GELECEĞİ FİKİRLER ŞEKİLLENDİRİR. ŞİRKET POLİTİKAMIZ GEREĞİ HER ÖNERİ DEĞERLENDİRİLEREK TARAFINIZA BİLGİLENDİRME YAPILACAKTIR.':
    'YOUR IDEAS ARE VERY VALUABLE TO US. IDEAS SHAPE THE FUTURE. IN LINE WITH OUR COMPANY POLICY, EVERY SUGGESTION IS EVALUATED AND YOU WILL BE INFORMED OF THE OUTCOME.',
  'HER NE KADAR SORUNLAR MÜKEMMELLİYETİN BİR PARÇASI OLSA DA, OLUŞTURDUĞUMUZ MADURİYETTEN DOLAYI ÖZÜR DİLERİZ. GÖSTERMİŞ OLDUĞUNUZ ANLAYIŞ İÇİN TEŞEKKÜR EDERİZ.':
    'ALTHOUGH PROBLEMS ARE PART OF THE PATH TO EXCELLENCE, WE APOLOGIZE FOR THE INCONVENIENCE CAUSED. THANK YOU FOR YOUR UNDERSTANDING.',
  'YENİ SORU OLUŞTUR': 'CREATE NEW QUESTION',
  'YENİ ÖNERİ OLUŞTUR': 'CREATE NEW SUGGESTION',
  'YENİ ŞİKAYET OLUŞTUR': 'CREATE NEW COMPLAINT',
  'SIK SORULAN SORULAR': 'FREQUENTLY ASKED QUESTIONS',
  'EN FAZLA ALINAN ÖNERİLER': 'MOST COMMON SUGGESTIONS',
  'SIK KARŞILAŞILAN ŞİKAYETLER': 'COMMON COMPLAINTS',
  'Henüz soru kaydı yok': 'No questions recorded yet',
  'Henüz öneri kaydı yok': 'No suggestions recorded yet',
  'Henüz şikayet kaydı yok': 'No complaints recorded yet',
  'CEVABI GÖR': 'VIEW ANSWER',

  // ── Ticket detay ──────────────────────────────────────
  '(Henüz cevaplanmadı. Teknik ekibimiz size en kısa sürede dönüş yapacaktır.)':
    '(Not answered yet. Our technical team will get back to you as soon as possible.)',
  'SORUNUM DEVAM EDİYOR': 'MY PROBLEM PERSISTS',
  '( CANLI TEKNİK DESTEK TALEP EDİYORUM )': '( I REQUEST LIVE TECHNICAL SUPPORT )',
  'SORUNUM ÇÖZÜLDÜ': 'MY PROBLEM IS SOLVED',
  'TEKRAR DETAYLANDIR': 'ADD MORE DETAIL',
  '( ANLAŞILMADIĞINI DÜŞÜNÜYORSAN YENİDEN DENE )': '( IF YOU THINK IT WAS MISUNDERSTOOD, TRY AGAIN )',
  'ÖNERİYİ SONLANDIR': 'CLOSE SUGGESTION',

  // ── Ticket oluşturma ──────────────────────────────────
  'LÜTFEN SORU BAŞLIĞINI GİRİNİZ...': 'PLEASE ENTER THE QUESTION TITLE...',
  'SORACAĞINIZ KONUYU KISACA ÖZETLEYEBİLİR MİSİNİZ?': 'COULD YOU BRIEFLY SUMMARIZE YOUR QUESTION?',
  'LÜTFEN ÖNERİNİZİN BAŞLIĞINI GİRİNİZ...': 'PLEASE ENTER THE TITLE OF YOUR SUGGESTION...',
  'ÖNERİNİZİN KONUSUNU KISACA ÖZETLEYEBİLİR MİSİNİZ?': 'COULD YOU BRIEFLY SUMMARIZE YOUR SUGGESTION?',
  'LÜTFEN ŞİKAYETİNİZİN BAŞLIĞINI GİRİNİZ...': 'PLEASE ENTER THE TITLE OF YOUR COMPLAINT...',
  'ŞİKAYETİNİZİN KONUSUNU KISACA ÖZETLEYEBİLİR MİSİNİZ?': 'COULD YOU BRIEFLY SUMMARIZE YOUR COMPLAINT?',
  '(TAHMİNİ GERİ DÖNÜŞ 2 SAAT)': '(ESTIMATED RESPONSE 2 HOURS)',

  // ── SSS: Sorular ──────────────────────────────────────
  'MAKİNE GÜVENLİ MOD EKRANINDA AÇILDI, KIVRIM YAPAMIYORUM.':
    'THE MACHINE STARTED IN SAFE MODE AND I CANNOT BEND.',
  'Güvenli mod, acil durdurma butonu basılıyken veya motor/faz/termal güvenlik sinyallerinden biri aktifken görüntülenir. Acil durdurma kilidini kontrol edin. Hata devam ediyorsa Ayarlar > Hata Raporları üzerinden son hatayı inceleyin.':
    'Safe mode is shown while the emergency stop button is pressed or one of the motor/phase/thermal safety signals is active. Check the emergency stop latch. If the error persists, review the latest error under Settings > Error Reports.',
  'MAKİNE KIVRIM ESNASINDA GÜVENLİ MODA GEÇEREK MİLLERİ SERBEST BIRAKTI.':
    'THE MACHINE SWITCHED TO SAFE MODE DURING BENDING AND RELEASED THE SHAFTS.',
  'Bu davranış genellikle aşırı yüklenmeye karşı koruma amaçlıdır. Yağ basıncı, motor termal değeri veya hidrolik akış sensörlerinden biri eşik dışına çıktığında milleri serbest bırakırız. Yağ sıcaklığı ve seviyesini ana ekrandan kontrol edin.':
    'This behavior is usually a protection against overload. The shafts are released when oil pressure, motor thermal value or one of the hydraulic flow sensors goes outside its threshold. Check the oil temperature and level on the main screen.',
  'MAKİNE AÇILIŞTA TEMAS SENSÖRÜ ARIZASI VERDİ NASIL KIVRIM YAPABİLİRİM?':
    'THE MACHINE REPORTED A CONTACT SENSOR FAULT AT STARTUP. HOW CAN I BEND?',
  'Bu hata temas sensörünün arızalandığını veya elektrik bağlantılarında bir sorun olduğunu gösterir. İlk olarak elektrik bağlantılarının doğru oturduğunu kontrol ederek sorunu anlamalıyız. Temas sensörünün görevi parçanın doğru yüklenmesini sağlamaktır. Bu işlemi manuel olarak ekrandaki TOUCH butonunu kullanarak ve makina üstündeki pozisyonu kullanarak gerçekleştirebilirsiniz.':
    'This error indicates that the contact sensor has failed or there is a problem with its electrical connections. First, check that the electrical connections are seated correctly to identify the problem. The contact sensor ensures the part is loaded correctly. You can perform this step manually using the TOUCH button on the screen and the position on the machine.',
  'MAKİNAYA KULLANICI NASIL EKLERİM VEYA DENETİMİNİ NASIL KALDIRABİLİRİM?':
    'HOW DO I ADD A USER TO THE MACHINE OR REMOVE THEIR ACCESS?',
  'Ayarlar > Kullanıcı Yönetimi ekranı, makine üzerindeki tüm kullanıcıları listeler. Yeni kullanıcı eklemek için "Ekle" butonu ile ad, soyad ve yetki seviyesi tanımlayabilirsiniz. Denetimi kaldırma için kullanıcı satırından "Yetki Kaldır" seçeneği kullanılır.':
    'The Settings > User Management screen lists all users on the machine. To add a new user, use the "Add" button to define first name, last name and permission level. To remove access, use the "Revoke Permission" option on the user row.',

  // ── SSS: Öneriler ─────────────────────────────────────
  'SERVİS HİZMETİNİ YILLIK BAKIM ANLAŞMASI ADI ALTINDA TOPLAMAK':
    'BUNDLE SERVICE UNDER AN ANNUAL MAINTENANCE AGREEMENT',
  'Önerinizle ilgili global çapta bir çalışmamız bulunmakta olup, bu değerli fikrinizi bizimle paylaştığınız için çok teşekkür ederiz.':
    'We are working on this globally. Thank you very much for sharing your valuable idea with us.',
  'SORU VE ŞİKAYET ÇÖZÜMLERİNDE ÇÖZÜM ADIMINA BUTON İLE YÖNLENDİRME':
    'BUTTON THAT LEADS DIRECTLY TO THE SOLUTION STEP FOR QUESTIONS AND COMPLAINTS',
  'Öneriniz değerlendirilmek üzere ürün ekibimize iletilmiştir. Yapılan toplantı sonucu ilgili adımın bir sonraki sürümde gerçekleştirilmesine karar verilmiştir.':
    'Your suggestion has been forwarded to our product team for evaluation. Following a meeting, it was decided to implement this step in the next release.',
  '7/24 CANLI DESTEK ALABİLMEK': '24/7 LIVE SUPPORT',
  'Önerinizle ilgili global çapta bir çalışmamız bulunmakta olup, bu değerli fikrinizi bizimle paylaştığınız için çok teşekkür ederiz. Düşüncelerinizi bizlerle paylaştığınız için tarafınıza ufak bir hediye gönderimi sağlanmıştır.':
    'We are working on this globally. Thank you very much for sharing your valuable idea with us. As a thank-you for sharing your thoughts, a small gift has been sent to you.',
  'SESLİ KOMUT ALGILAMA MODÜLÜ': 'VOICE COMMAND RECOGNITION MODULE',
  'Sesli komut altyapısının makinaya entegrasyonu üzerine bir çalışma başlatılmıştır. Geri dönüş süresi yaklaşık 6-9 aydır.':
    'Work has started on integrating a voice command infrastructure into the machine. Expected turnaround is about 6-9 months.',

  // ── SSS: Şikayetler ───────────────────────────────────
  'MAKİNA YAĞ DEĞİŞİM ARALIĞI ÇOK KISA!': 'THE OIL CHANGE INTERVAL IS TOO SHORT!',
  'Yağ değişim aralığı, yağ kalitesi sensörlerinden alınan ölçümler doğrultusunda otomatik olarak hesaplanır. Eğer süre çok kısa görünüyorsa, yağ kalitesi düşmüş olabilir; servis ekibimiz yağ analizi için sizinle iletişime geçecektir.':
    'The oil change interval is calculated automatically from oil quality sensor measurements. If the interval seems too short, the oil quality may have degraded; our service team will contact you for an oil analysis.',
  'MAKİNA PROFİLİ EZİYOR!': 'THE MACHINE IS CRUSHING THE PROFILE!',
  'Şikayetinizden kaynaklı vals topu kodunu doğru girmediğinizden veya boş bıraktığınızdan dolayı oluşmuş olabilir. Lütfen "AI BENDING > KIVRIM PROFİLİNİ SEÇİNİZ > KIVRIM YÖNÜNÜ SEÇİNİZ > KIVRIM METODUNU SEÇİNİZ > KIVRIM ÖLÇÜLERİNİ GİRİNİZ" sayfasının alt uyarı bölümünde yer alan bölümdeki vals topu kodu ile makinenin üzerinde bulunan vals topu kodunu karşılaştırınız. Şikayetiniz devam ediyorsa İLETİŞİM > TEL. NO.':
    'This may be caused by the roller code being entered incorrectly or left blank. Please compare the roller code shown in the warning section at the bottom of the "AI BENDING > SELECT BENDING PROFILE > SELECT BENDING DIRECTION > SELECT BENDING METHOD > ENTER BENDING DIMENSIONS" page with the roller code on the machine. If your complaint persists, see CONTACT > PHONE NO.',
  'MAKİNA KIVRIM YAPMIYOR!': 'THE MACHINE IS NOT BENDING!',
  'Bu sorun farklı sebeplerden kaynaklanabilir. Hidrolik motor açık değilse veya güvenli mod aktifse kıvrım komutları engellenir. Ana ekrandan motor durumunu kontrol edin. Sorun devam ediyorsa "Sorunum devam ediyor" seçeneğiyle canlı destek talep edebilirsiniz.':
    'This problem can have several causes. Bending commands are blocked if the hydraulic motor is off or safe mode is active. Check the motor status on the main screen. If the problem persists, you can request live support with the "My problem persists" option.',
  "MAKİNA SÜREKLİ GÜVENLİ MOD'A GİRİYOR!": 'THE MACHINE KEEPS ENTERING SAFE MODE!',
  'Güvenli moda geçişin en yaygın sebepleri: faz sırası bozulması, motor termal koruma, yağ sıcaklığı yüksekliği veya acil durdurma butonunun mekanik gevşemesi. Ayarlar > Hata Raporları ekranında son 24 saatteki hata serisini görüp ortak nedeni tespit edebilirsiniz.':
    'The most common causes of switching to safe mode are: phase sequence fault, motor thermal protection, high oil temperature or a mechanically loose emergency stop button. On the Settings > Error Reports screen you can see the errors of the last 24 hours and identify the common cause.',

  // ── Eğitim ────────────────────────────────────────────
  'EĞİTİM MERKEZİ': 'TRAINING CENTER',
  'KATILIMCI ADI SOYADI': 'PARTICIPANT FULL NAME',
  'LÜTFEN ADINIZI VE SOYADINIZI GİRİNİZ...': 'PLEASE ENTER YOUR FIRST AND LAST NAME...',
  'KATILIMCI ÜNVANI': 'PARTICIPANT JOB TITLE',
  'LÜTFEN ÇALIŞTIĞINIZ POZİSYONU TANIMLAYINIZ...': 'PLEASE DESCRIBE YOUR POSITION...',
  'ŞİRKET ADI ÜNVANI': 'COMPANY NAME',
  'LÜTFEN ŞİRKET ADINI TAM OLARAK GİRİNİZ...': 'PLEASE ENTER THE FULL COMPANY NAME...',
  'YENİ EĞİTİM BAŞLAT': 'START NEW TRAINING',
  'SINAVLARI BAŞLAT': 'START EXAMS',
  'EĞİTİMİ TEKRARLA': 'REPEAT TRAINING',
  'Eğitim konusu bulunamadı.': 'Training topic not found.',
  'EĞİTİM ANLATIMI': 'TRAINING LESSON',
  'SINAVLARA GEÇ': 'GO TO EXAMS',
  SINAV: 'EXAM',
  'EĞİTİM TAMAMLANDI': 'TRAINING COMPLETED',
  '✦ EĞİTİM TAMAMLANDI ✦': '✦ TRAINING COMPLETED ✦',
  'TEKRAR DENEYİN': 'PLEASE TRY AGAIN',
  'TEKRAR DENE': 'TRY AGAIN',
  'EĞİTİM MERKEZİNE DÖN': 'BACK TO TRAINING CENTER',
  'SORU {n} / {total}': 'QUESTION {n} / {total}',

  // Eğitim içeriği (constants/trainingTopics.ts)
  'KIVRIM ESASLARI VE MALZEME SEÇİMİ': 'BENDING FUNDAMENTALS AND MATERIAL SELECTION',
  'KIVRIM İÇ ÇAPIDIR. KIVRIM ESNASINDA MALZEME İÇ YAPISI ORANINDA SIKIŞMAYA İZİN VERİR. ET KALINLIĞI DÜŞÜK MALZEMELERDE KIVRIM ÇAPI KÜÇÜLDÜKÇE MARULLAMA GÖRÜLEBİLİR.':
    'IS THE INNER BENDING DIAMETER. DURING BENDING THE MATERIAL ALLOWS COMPRESSION IN PROPORTION TO ITS INTERNAL STRUCTURE. IN THIN-WALLED MATERIALS, WRINKLING MAY OCCUR AS THE BENDING DIAMETER DECREASES.',
  'KIVRIM DIŞ ÇAPIDIR. KIVRIM ESNASINDA MALZEME İÇ YAPISI ORANINDA UZAMAYA İZİN VERİR. ET KALINLIĞI DÜŞÜK MALZEMELERDE KIVRIM ÇAPI KÜÇÜLDÜKÇE DÜZLEŞMELER VE ÇÖKMELER GÖRÜLEBİLİR.':
    'IS THE OUTER BENDING DIAMETER. DURING BENDING THE MATERIAL ALLOWS ELONGATION IN PROPORTION TO ITS INTERNAL STRUCTURE. IN THIN-WALLED MATERIALS, FLATTENING AND COLLAPSE MAY OCCUR AS THE BENDING DIAMETER DECREASES.',
  'KIVRIM MERKEZİDİR. UZAMA GÖZLENMEZ.': 'IS THE BENDING CENTER LINE. NO ELONGATION OCCURS.',
  'KIVRIM İÇ ÇAPI "A" OLARAK İFADE EDİLİR Mİ?': 'IS THE INNER BENDING DIAMETER DENOTED AS "A"?',
  'AŞAĞIDAKİLERDEN HANGİSİ KIVRIM MERKEZİNİ İFADE EDER?': 'WHICH OF THE FOLLOWING DENOTES THE BENDING CENTER LINE?',
  'KIVRIM ESNASINDA "B" UZAMAYA İZİN VERİR Mİ?': 'DOES "B" ALLOW ELONGATION DURING BENDING?',
  'ET KALINLIĞI DÜŞÜK MALZEMEDE KIVRIM ÇAPI KÜÇÜLDÜKÇE "A" YÖNÜNDE NE GÖZLENİR?':
    'IN THIN-WALLED MATERIAL, WHAT IS OBSERVED ON SIDE "A" AS THE BENDING DIAMETER DECREASES?',
  HAYIR: 'NO',
  EVET: 'YES',
  UZAMA: 'ELONGATION',
  ÇÖKMELER: 'COLLAPSE',
  MARULLAMA: 'WRINKLING',
  HİÇBİRİ: 'NONE',

  // ── Kurulum ───────────────────────────────────────────
  'KURULUM HİZMETLERİ': 'INSTALLATION SERVICES',
  'Makinanın ilk kurulumu, operatör eğitimi ve devreye alma süreçleri burada listelenir. Yeni bir kurulum talep etmek için "Yeni Talep Oluştur" butonunu kullanın.':
    'Initial machine installation, operator training and commissioning are listed here. To request a new installation, use the "Create New Request" button.',
  'Henüz kurulum kaydı yok': 'No installation records yet',
  'YENİ KURULUM TALEBİ OLUŞTUR': 'CREATE NEW INSTALLATION REQUEST',

  // ── Servis ağı (harita) ───────────────────────────────
  'SERVİS TALEBİ OLUŞTUR': 'CREATE SERVICE REQUEST',
  'SERVİS TALEBİ SORGULA': 'TRACK SERVICE REQUEST',
  'Ana ekran': 'Home screen',
  '© OpenStreetMap katkıda bulunanlar': '© OpenStreetMap contributors',
}

export default en
