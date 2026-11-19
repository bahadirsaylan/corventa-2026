// TEK DOSYA DEMO (2026-11-04) — electron-builder "portable" exe adı "demo" içeriyorsa (ör. "Corventa Demo.exe")
// ortam değişkeni gerekmeden demo + pencere modu açılır. Karşı taraf sadece exe'ye çift tıklar.
// Portable çalıştırmada electron-builder PORTABLE_EXECUTABLE_FILE'ı verir; kurulu (NSIS) uygulamada bu değişken
// YOKTUR → gerçek makinede hiçbir şey değişmez. Bu modül IS_DEMO / IS_KIOSK okunmadan ÖNCE yüklenmeli
// (DemoMachine.ts'in ilk importu).

import { basename } from 'node:path'

// 2026-11-19 (kullanıcı): testçi exe adını değiştirince demo yerine gerçek makine modu açılıp "machine.db
// bulunamadı" veriyordu. Demo paketi artık DERLEME ANINDA işaretli (__CORVENTA_DEMO_BUILD__, sadece
// package:demo* script'leri) → ad ne olursa olsun demo açılır. Eski ad kontrolü yedek olarak duruyor.
// Kurulum (NSIS) paketi bu bayrakla derlenmez → gerçek makinede hiçbir şey değişmez.
const portableExe = process.env.PORTABLE_EXECUTABLE_FILE
if (__CORVENTA_DEMO_BUILD__ || (portableExe && /demo/i.test(basename(portableExe)))) {
  process.env.CORVENTA_DEMO = '1'
  process.env.CORVENTA_NO_KIOSK = '1'
}

export {}
