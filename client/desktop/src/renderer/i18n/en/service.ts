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
  'SERVİS & DESTEK MERKEZİ': 'SERVICE & SUPPORT CENTER',
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
  'TALEBİN BAŞLIĞI :': 'REQUEST TITLE :',
  'BAŞLIK SEÇİNİZ...': 'SELECT A TITLE...',
  // Başlık seçenekleri (amaca göre). GÜNLÜK/HAFTALIK/AYLIK/6 AYLIK BAKIM → maintenanceRules.ts, DİĞER → settingsPages.ts
  'HİDROLİK ARIZA': 'HYDRAULIC FAULT',
  'ELEKTRİK / ELEKTRONİK ARIZA': 'ELECTRICAL / ELECTRONIC FAULT',
  'PLC / YAZILIM ARIZASI': 'PLC / SOFTWARE FAULT',
  'SENSÖR ARIZASI (ENCODER / BASINÇ / PARÇA SENSÖRÜ)': 'SENSOR FAULT (ENCODER / PRESSURE / PART SENSOR)',
  'MOTOR / POMPA ARIZASI': 'MOTOR / PUMP FAULT',
  'MEKANİK ARIZA (TOP / RULMAN / MİL)': 'MECHANICAL FAULT (ROLL / BEARING / SHAFT)',
  'ACİL STOP / EMNİYET DEVRESİ': 'EMERGENCY STOP / SAFETY CIRCUIT',
  'YILLIK BAKIM': 'ANNUAL MAINTENANCE',
  'YAĞ / FİLTRE DEĞİŞİMİ': 'OIL / FILTER CHANGE',
  'MÜŞTERİ TALEBİ': 'CUSTOMER REQUEST',
  'İLK KURULUM / DEVREYE ALMA': 'INITIAL INSTALLATION / COMMISSIONING',
  'MAKİNE TAŞIMA / YENİDEN KURULUM': 'MACHINE RELOCATION / REINSTALLATION',
  'KALIP / APARAT MONTAJI': 'MOLD / FIXTURE MOUNTING',
  'OPERATÖR EĞİTİMİ': 'OPERATOR TRAINING',
  'BAKIM EĞİTİMİ': 'MAINTENANCE TRAINING',
  'YAZILIM / YENİ ÖZELLİK EĞİTİMİ': 'SOFTWARE / NEW FEATURE TRAINING',
  'İLERİ SEVİYE (AI BÜKÜM) EĞİTİMİ': 'ADVANCED (AI BENDING) TRAINING',
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


  // ── Servis ağı (harita) ───────────────────────────────
  'SERVİS TALEBİ OLUŞTUR': 'CREATE SERVICE REQUEST',
  'SERVİS TALEBİ SORGULA': 'TRACK SERVICE REQUEST',
  'Ana ekran': 'Home screen',
  '© OpenStreetMap katkıda bulunanlar': '© OpenStreetMap contributors',

  // ── Talep detayı — tarihler / yanıt ───────────────────
  BAŞLAMA: 'STARTED',
  TAMAMLANMA: 'COMPLETED',
  'YANIT SÜRESİ': 'RESPONSE TIME',
  YANITLAYAN: 'RESPONDED BY',
  YANIT: 'RESPONSE',
  '{d} gün {h} sa': '{d} d {h} h',
  '{h} sa {m} dk': '{h} h {m} min',

  // ── servis talebi hazır maddeleri + ölçü ekranı hedef konum (2026-11-16) ──
  'HEDEF KONUM': 'TARGET POSITION',
  'ADIM SAYISI': 'STEP COUNT',
  'DETAY — İLGİLİ MADDELERİ İŞARETLEYİN': 'DETAILS — TICK THE RELEVANT ITEMS',
  'EK AÇIKLAMA (İSTEĞE BAĞLI)...': 'ADDITIONAL NOTE (OPTIONAL)...',
  'YAĞ KAÇAĞI VAR': 'OIL LEAK',
  'BASINÇ YÜKSELMİYOR / DÜŞÜK': 'PRESSURE DOES NOT RISE / LOW',
  'BASINÇ DALGALANIYOR': 'PRESSURE FLUCTUATES',
  'PİSTON YAVAŞ / GÜÇSÜZ HAREKET EDİYOR': 'PISTON MOVES SLOWLY / WEAKLY',
  'PİSTON KENDİLİĞİNDEN KAYIYOR': 'PISTON DRIFTS BY ITSELF',
  'YAĞ AŞIRI ISINIYOR': 'OIL OVERHEATS',
  'POMPADAN ANORMAL SES GELİYOR': 'ABNORMAL NOISE FROM PUMP',
  'VALF ÇALIŞMIYOR / TAKILIYOR': 'VALVE NOT WORKING / STICKING',
  'MAKİNE ENERJİ ALMIYOR': 'MACHINE HAS NO POWER',
  'SİGORTA / ŞALTER ATIYOR': 'FUSE / BREAKER TRIPS',
  'MOTOR TERMİĞİ ATIYOR': 'MOTOR THERMAL TRIPS',
  'FAZ HATASI UYARISI': 'PHASE FAULT WARNING',
  'PANO İÇİNDE KOKU / AŞIRI ISINMA': 'SMELL / OVERHEATING IN CABINET',
  'KABLO / KONNEKTÖR HASARI': 'CABLE / CONNECTOR DAMAGE',
  'EKRAN DONUYOR / YANIT VERMİYOR': 'SCREEN FREEZES / NOT RESPONDING',
  'PLC BAĞLANTISI KOPUYOR': 'PLC CONNECTION DROPS',
  'PROGRAM AÇILMIYOR': 'PROGRAM DOES NOT START',
  'EKRANDA HATA MESAJI ÇIKIYOR': 'ERROR MESSAGE ON SCREEN',
  'BÜKÜM YARIDA KALIYOR': 'BENDING STOPS HALFWAY',
  'ÖLÇÜ / HESAP YANLIŞ ÇIKIYOR': 'WRONG DIMENSION / CALCULATION',
  'ENCODER (CETVEL) DEĞERİ DEĞİŞMİYOR': 'ENCODER (SCALE) VALUE DOES NOT CHANGE',
  'ENCODER (CETVEL) DEĞERİ ZIPLIYOR': 'ENCODER (SCALE) VALUE JUMPS',
  'PARÇA SENSÖRÜ ALGILAMIYOR': 'PART SENSOR DOES NOT DETECT',
  'BASINÇ SENSÖRÜ YANLIŞ GÖSTERİYOR': 'PRESSURE SENSOR READS WRONG',
  'YAĞ SICAKLIK SENSÖRÜ YANLIŞ GÖSTERİYOR': 'OIL TEMPERATURE SENSOR READS WRONG',
  'ÖLÇÜM (GERİ ESNEME) SENSÖRÜ YANLIŞ ÖLÇÜYOR': 'MEASUREMENT (SPRINGBACK) SENSOR MEASURES WRONG',
  'MOTOR ÇALIŞMIYOR': 'MOTOR DOES NOT RUN',
  'MOTOR ÇALIŞIYOR AMA BASINÇ YOK': 'MOTOR RUNS BUT NO PRESSURE',
  'AŞIRI SES / TİTREŞİM': 'EXCESSIVE NOISE / VIBRATION',
  'MOTOR AŞIRI ISINIYOR': 'MOTOR OVERHEATS',
  'KAPLİN / BAĞLANTI HASARI': 'COUPLING / CONNECTION DAMAGE',
  'TOPLARDA AŞINMA / İZ': 'WEAR / MARKS ON ROLLS',
  'RULMANDAN SES GELİYOR': 'NOISE FROM BEARING',
  'MİLDE BOŞLUK / SALGI': 'SHAFT PLAY / RUNOUT',
  'ROTASYON DÖNMÜYOR / ZORLANIYOR': 'ROTATION DOES NOT TURN / STRAINS',
  'YAN DAYAMA ÇALIŞMIYOR': 'SIDE SUPPORT NOT WORKING',
  'CIVATA / BAĞLANTI GEVŞEMESİ': 'LOOSE BOLTS / CONNECTIONS',
  'ACİL STOP KURTARILAMIYOR': 'EMERGENCY STOP CANNOT BE RESET',
  'ACİL STOP ÇALIŞMIYOR': 'EMERGENCY STOP NOT WORKING',
  'EMNİYET KAPAĞI / SENSÖRÜ UYARI VERİYOR': 'SAFETY GUARD / SENSOR WARNING',
  'ALARM SUSMUYOR': 'ALARM DOES NOT STOP',
  'YAĞ SEVİYESİ KONTROLÜ': 'OIL LEVEL CHECK',
  'HİDROLİK KAÇAK GÖRSEL KONTROLÜ': 'VISUAL HYDRAULIC LEAK CHECK',
  'ACİL STOP TESTİ': 'EMERGENCY STOP TEST',
  'TOPLARIN VE ÇALIŞMA ALANININ TEMİZLİĞİ': 'CLEANING OF ROLLS AND WORK AREA',
  'PARÇA SENSÖRLERİNİN TEMİZLİĞİ': 'CLEANING OF PART SENSORS',
  'ANORMAL SES / TİTREŞİM KONTROLÜ': 'ABNORMAL NOISE / VIBRATION CHECK',
  'HAVA FİLTRESİ / SU TAHLİYESİ': 'AIR FILTER / WATER DRAIN',
  'PNÖMATİK HAT BASINCI KONTROLÜ': 'PNEUMATIC LINE PRESSURE CHECK',
  'BAĞLANTI CIVATALARI KONTROLÜ': 'MOUNTING BOLT CHECK',
  'ENCODER (CETVEL) OKUMALARI KONTROLÜ': 'ENCODER (SCALE) READING CHECK',
  'FAN VE SOĞUTMA KONTROLÜ': 'FAN AND COOLING CHECK',
  'RULMAN / MİL GRESLEME': 'BEARING / SHAFT GREASING',
  'HİDROLİK HORTUM VE RAKOR KONTROLÜ': 'HYDRAULIC HOSE AND FITTING CHECK',
  'ELEKTRİK PANO TEMİZLİĞİ VE KLEMENS KONTROLÜ': 'ELECTRICAL CABINET CLEANING AND TERMINAL CHECK',
  'S1 / S2 BASINÇ AYARI KONTROLÜ': 'S1 / S2 PRESSURE SETTING CHECK',
  'REDÜKTÖR YAĞ SEVİYESİ': 'GEARBOX OIL LEVEL',
  'YAN DAYAMA VE PNÖMATİK SİLİNDİR KONTROLÜ': 'SIDE SUPPORT AND PNEUMATIC CYLINDER CHECK',
  'GÖNYE / STAGE KONTROLÜ': 'SQUARE / STAGE CHECK',
  'HİDROLİK YAĞ ANALİZİ / KİRLİLİK KONTROLÜ': 'HYDRAULIC OIL ANALYSIS / CONTAMINATION CHECK',
  'HİDROLİK FİLTRE DEĞİŞİMİ': 'HYDRAULIC FILTER REPLACEMENT',
  'REDÜKTÖR YAĞI KONTROLÜ / DEĞİŞİMİ': 'GEARBOX OIL CHECK / CHANGE',
  'TOP YATAKLARI VE RULMAN KONTROLÜ': 'ROLL HOUSING AND BEARING CHECK',
  'SENSÖR KALİBRASYON KONTROLÜ': 'SENSOR CALIBRATION CHECK',
  'TOPRAKLAMA VE İZOLASYON ÖLÇÜMÜ': 'GROUNDING AND INSULATION MEASUREMENT',
  'HİDROLİK YAĞ DEĞİŞİMİ': 'HYDRAULIC OIL CHANGE',
  'TÜM FİLTRELERİN DEĞİŞİMİ': 'REPLACEMENT OF ALL FILTERS',
  'VALF VE PİSTON CONTA KONTROLÜ': 'VALVE AND PISTON SEAL CHECK',
  'MOTOR / POMPA GENEL KONTROLÜ': 'MOTOR / PUMP GENERAL CHECK',
  'TAM KALİBRASYON (ENCODER, BASINÇ, ÖLÇÜM)': 'FULL CALIBRATION (ENCODER, PRESSURE, MEASUREMENT)',
  'YAZILIM / PLC GÜNCELLEME KONTROLÜ': 'SOFTWARE / PLC UPDATE CHECK',
  'HAVA FİLTRESİ DEĞİŞİMİ': 'AIR FILTER REPLACEMENT',
  'REDÜKTÖR YAĞI DEĞİŞİMİ': 'GEARBOX OIL CHANGE',
  'YAĞ KİRLİLİK SENSÖRÜ KONTROLÜ': 'OIL CONTAMINATION SENSOR CHECK',
  'TOP / VALS DEĞİŞİMİ': 'ROLL REPLACEMENT',
  'RULMAN VE YATAK DEĞİŞİMİ': 'BEARING AND HOUSING REPLACEMENT',
  'HİDROLİK PİSTON REVİZYONU (CONTA)': 'HYDRAULIC PISTON OVERHAUL (SEALS)',
  'POMPA / MOTOR REVİZYONU': 'PUMP / MOTOR OVERHAUL',
  'VALF BLOĞU REVİZYONU': 'VALVE BLOCK OVERHAUL',
  'ELEKTRİK PANO REVİZYONU': 'ELECTRICAL CABINET OVERHAUL',
  'BOYA / GÖVDE ONARIMI': 'PAINT / BODY REPAIR',
  'KOMPLE GENEL REVİZYON': 'COMPLETE GENERAL OVERHAUL',
  'YERLEŞİM VE TESVİYE': 'POSITIONING AND LEVELLING',
  'ELEKTRİK BAĞLANTISI': 'ELECTRICAL CONNECTION',
  'HİDROLİK YAĞ DOLUMU': 'HYDRAULIC OIL FILLING',
  'GÖNYE VE STAGE AYARI': 'SQUARE AND STAGE SETUP',
  'DENEME BÜKÜMÜ': 'TEST BEND',
  'OPERATÖRE TESLİM': 'HANDOVER TO OPERATOR',
  'SÖKÜM VE PAKETLEME': 'DISMANTLING AND PACKING',
  'YENİ YERDE MONTAJ VE TESVİYE': 'ASSEMBLY AND LEVELLING AT NEW SITE',
  'BAĞLANTILAR VE DEVREYE ALMA': 'CONNECTIONS AND COMMISSIONING',
  'KALIP MONTAJI': 'MOLD MOUNTING',
  'KALIP KODU / LİSANS AKTİVASYONU': 'MOLD CODE / LICENCE ACTIVATION',
  'AYAR VE DENEME BÜKÜMÜ': 'ADJUSTMENT AND TEST BEND',
  'GÜVENLİ KULLANIM': 'SAFE OPERATION',
  'OTOMATİK / YAPAY ZEKA BÜKÜM': 'AUTOMATIC / AI BENDING',
  'TAHLİYE VE PARÇA DEĞİŞİMİ': 'UNLOADING AND PART CHANGE',
  'GÜNLÜK / HAFTALIK BAKIM': 'DAILY / WEEKLY MAINTENANCE',
  'YAĞ VE FİLTRE DEĞİŞİMİ': 'OIL AND FILTER CHANGE',
  'ARIZA TESPİTİ': 'FAULT DIAGNOSIS',
  'YENİ ÖZELLİKLER': 'NEW FEATURES',
  'AYARLAR VE KULLANICI YÖNETİMİ': 'SETTINGS AND USER MANAGEMENT',
  'BULUT / SERVİS TALEBİ': 'CLOUD / SERVICE REQUEST',
  'YAPAY ZEKA REÇETE KULLANIMI': 'AI RECIPE USE',
}

export default en
