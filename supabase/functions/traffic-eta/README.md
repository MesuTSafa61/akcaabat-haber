# Canlı güzergâh süreleri

Bu fonksiyon Apple Maps Server API'den dört sabit güzergâhın tahmini yolculuk ve trafik gecikme sürelerini alır. Anahtarlar tarayıcıya gönderilmez.

Supabase projesindeki Edge Function secrets bölümünde şu değerleri tanımlayın:

- `APPLE_MAPS_TEAM_ID`: Apple Developer takım kimliği
- `APPLE_MAPS_KEY_ID`: Maps özel anahtarının kimliği
- `APPLE_MAPS_PRIVATE_KEY`: İndirilen `.p8` dosyasının PEM içeriği

Fonksiyonu `traffic-eta` adıyla, JWT denetimi kapalı bir herkese açık GET servisi olarak dağıtın. CORS yalnızca kaynakta tanımlı site alan adlarına izin verir. Trafik sayfası fonksiyon devrede değilken süre uydurmaz; mevcut Yandex yoğunluk haritasını göstermeye devam eder.

Apple Maps Server API kullanımı ve kota koşullarını kendi Apple Developer hesabınızda doğrulayın. Bu fonksiyonun Apple ile gerçek uçtan uca testi ancak hesap anahtarı eklendikten sonra yapılabilir.
