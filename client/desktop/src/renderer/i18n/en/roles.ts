// İngilizce sözlük — rol sistemi (giriş / ilk kurulum, yetki uyarısı, kullanıcı yönetimi, rol rozeti).
// Anahtar = Türkçe kaynak metin (birebir), değer = İngilizce. {ad} yer tutucuları iki tarafta aynı.
const en: Record<string, string> = {
  // Rol adları (constants/permissions.ts ROLE_LABELS)
  'OPERATÖR': 'OPERATOR',
  'ADMİN': 'ADMIN',
  'SÜPERADMİN': 'SUPERADMIN',

  // Yetki uyarısı
  'BU İŞLEM İÇİN {role} YETKİSİ GEREKLİ': '{role} PERMISSION REQUIRED FOR THIS ACTION',

  // Giriş / ilk kurulum
  'KULLANICI ADI VE ŞİFRE ZORUNLU': 'USERNAME AND PASSWORD ARE REQUIRED',
  'KULLANICI ADI VEYA ŞİFRE HATALI': 'INVALID USERNAME OR PASSWORD',
  'KULLANICI PASİF — YÖNETİCİNİZE BAŞVURUN': 'USER IS INACTIVE — CONTACT YOUR ADMINISTRATOR',
  'ÇOK FAZLA HATALI DENEME — HESAP {time} SAATİNE KADAR KİLİTLİ':
    'TOO MANY FAILED ATTEMPTS — ACCOUNT LOCKED UNTIL {time}',
  'ÇOK FAZLA HATALI DENEME — HESAP GEÇİCİ OLARAK KİLİTLİ': 'TOO MANY FAILED ATTEMPTS — ACCOUNT TEMPORARILY LOCKED',
  'İLK KURULUM ZATEN YAPILMIŞ — GİRİŞ YAPIN': 'INITIAL SETUP ALREADY DONE — PLEASE LOG IN',
  'VERİ SERVİSİNE ULAŞILAMADI — BAĞLANTIYI KONTROL EDİN': 'DATA SERVICE UNREACHABLE — CHECK THE CONNECTION',
  'GİRİŞ BAŞARISIZ': 'LOGIN FAILED',
  'KULLANICI ADI 3-50 KARAKTER OLMALI': 'USERNAME MUST BE 3-50 CHARACTERS',
  'KULLANICI ADI BOŞLUK İÇEREMEZ': 'USERNAME CANNOT CONTAIN SPACES',
  'ŞİFRE EN AZ {n} KARAKTER OLMALI': 'PASSWORD MUST BE AT LEAST {n} CHARACTERS',
  'ŞİFRELER AYNI DEĞİL': 'PASSWORDS DO NOT MATCH',
  'BAĞLANILIYOR…': 'CONNECTING…',
  'İLK KURULUM — SÜPERADMİN OLUŞTUR': 'INITIAL SETUP — CREATE SUPERADMIN',
  'Makinede henüz kullanıcı yok. Tüm yetkilere sahip ilk yönetici hesabını oluşturun; diğer kullanıcıları sonra Ayarlar > Kullanıcı Yönetimi’nden ekleyebilirsiniz.':
    'There are no users on this machine yet. Create the first administrator account with full permissions; you can add other users later from Settings > User Management.',
  'AD SOYAD :': 'FULL NAME :',
  'ŞİFRE TEKRAR :': 'REPEAT PASSWORD :',
  'OLUŞTURULUYOR…': 'CREATING…',
  'SÜPERADMİN OLUŞTUR': 'CREATE SUPERADMIN',

  // Kullanıcı yönetimi
  'OTURUM SÜRESİ DOLDU — TEKRAR GİRİŞ YAPIN': 'SESSION EXPIRED — PLEASE LOG IN AGAIN',
  'YENİLE': 'REFRESH',
  'YÜKLENİYOR…': 'LOADING…',
  'KAYIT YOK': 'NO RECORDS',
  'SİZ': 'YOU',
  'KİLİTLİ': 'LOCKED',
  'Pasif kullanıcılar sisteme giriş yapamaz. 5 hatalı şifre denemesinde hesap 5 dakika kilitlenir; şifre sıfırlama kilidi açar. ADMİN sadece operatörleri, SÜPERADMİN tüm kullanıcıları yönetir.':
    'Inactive users cannot log in. After 5 wrong passwords the account is locked for 5 minutes; a password reset unlocks it. ADMIN manages operators only, SUPERADMIN manages all users.',
  'AD SOYAD ZORUNLU': 'FULL NAME IS REQUIRED',
  'KULLANICIYI DÜZENLE': 'EDIT USER',
  'ADMİN sadece OPERATÖR ekleyebilir': 'ADMIN can only add OPERATOR users',
  'Kendinizi pasifleştiremezsiniz': 'You cannot deactivate yourself',
  'YENİ ŞİFRE (SIFIRLAMA)': 'NEW PASSWORD (RESET)',
  'ŞİFRE': 'PASSWORD',
  'ŞİFRE TEKRAR': 'REPEAT PASSWORD',
  'Şifreyi değiştirmeyecekseniz boş bırakın.': 'Leave empty if you do not want to change the password.',
}

export default en
