// Servis ağı — dashboard'daki Corventa logosuna tıklanınca açılan harita ekranı (SEKIL-6).
//
// Şimdilik frontend sabiti. İleride buluttan gelecek: noktalar enlem/boylam ile tutulduğu için
// liste değişse de pinler haritada doğru yere oturur (projeksiyon aşağıda).
//
// Harita arka planı: OpenStreetMap z10 döşemelerinden bir kez üretilmiş statik görüntü
// (assets/images/service-map-bursa.jpg, 1800×1250 px = z10 pikseli × 1). Makine internetsiz
// çalışabildiği için canlı döşeme yok. Bölge dışına çıkan nokta haritada gösterilmez, listede kalır.

export interface ServicePoint {
  name: string
  city: string
  phone: string
  web: string
  email: string
  lat: number
  lon: number
}

/** Bu makinenin konumu ve üretici iletişim bilgisi (sağ panel + mavi pin) */
export const MACHINE_LOCATION: ServicePoint = {
  name: 'CORVENTA',
  city: 'NİLÜFER / BURSA',
  phone: '+90 (224) 555 44 33',
  web: 'www.corventabending.com',
  email: 'service@corventabending.com',
  lat: 40.226,
  lon: 28.873,
}

/** Yetkili servis noktaları (sol panel + kırmızı pinler) */
export const SERVICE_POINTS: ServicePoint[] = [
  {
    name: 'İMAGES SERVİCES',
    city: 'MUSTAFA KEMAL PAŞA / BURSA',
    phone: '+90 (224) 526 13 52',
    web: 'www.imageservices.com',
    email: 'servis@imageservices.com',
    lat: 40.0355,
    lon: 28.4115,
  },
  {
    name: 'KELESTEK',
    city: 'KELES / BURSA',
    phone: '+90 (224) 699 23 23',
    web: 'www.kelestek.com',
    email: 'service@kelestek.com',
    lat: 39.9135,
    lon: 29.2327,
  },
  {
    name: 'DURSUNMAK',
    city: 'DURSUNBEY / BALIKESİR',
    phone: '+90 (266) 476 63 63',
    web: 'www.dursunmak.com',
    email: 'info@dursunmak.com',
    lat: 39.5858,
    lon: 28.6253,
  },
]

// Statik harita görüntüsünün projeksiyonu: Web Mercator z10, sol-üst köşe (ORIGIN_X, ORIGIN_Y)
// z10 piksel koordinatı. Sahne 1080×750; görüntü sahneye SCALE ile küçültülür.
const MAP_ZOOM = 10
const MAP_ORIGIN_X = 151197
const MAP_ORIGIN_Y = 98710
export const MAP_SCALE = 0.6

/** Enlem/boylam → sahne pikseli (1080×750 üst alan) */
export function projectToScene(lat: number, lon: number): { x: number; y: number } {
  const n = 256 * 2 ** MAP_ZOOM
  const latRad = (lat * Math.PI) / 180
  const px = ((lon + 180) / 360) * n
  const py = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x: (px - MAP_ORIGIN_X) * MAP_SCALE, y: (py - MAP_ORIGIN_Y) * MAP_SCALE }
}
