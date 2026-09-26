# Canlı güzergâh süreleri

`traffic-eta`, Trabzon Trafik uygulamasının `getRoute` servisine dört sabit güzergâhı sorar. İki dakika boyunca yanıtı Edge Function belleğinde saklar; sağlayıcı erişilemezse tahmini süre uydurmaz. JWT denetimi kapalı, GET ile erişilen bir fonksiyondur. CORS yalnızca sitedeki tanımlı alan adlarına açıktır.

Bu bağlantı üçüncü tarafın servis sürekliliğine bağlıdır. Sağlayıcı erişimi değiştirirse güzergâh kartları canlı süreyi kapatır; Yandex yoğunluk haritası açık kalır.
