(function () {
    "use strict";

    function article(config) {
        const categorySlug = String(config.category || "gundem")
            .toLocaleLowerCase("tr-TR")
            .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
            .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        return {
            id: "curated-" + config.slug,
            title: config.title,
            slug: config.slug,
            summary: config.summary,
            content: config.content,
            category: config.category,
            category_name: config.category,
            category_slug: categorySlug,
            categories: { name: config.category, slug: categorySlug },
            image: config.image,
            image_url: config.image,
            status: "published",
            is_breaking: config.breaking === true,
            breaking: config.breaking === true,
            is_headline: Number.isInteger(config.headlineOrder),
            headline_order: Number.isInteger(config.headlineOrder) ? config.headlineOrder : null,
            headline_source: Number.isInteger(config.headlineOrder) ? "editorial_fallback" : null,
            views: 0,
            published_at: config.publishedAt,
            created_at: config.publishedAt,
            updated_at: config.publishedAt,
            origin_type: "automated",
            source_name: config.sourceName,
            source_url: config.sourceUrl
        };
    }

    window.AKCAABAT_CURRENT_NEWS = [
        article({
            title: "Trabzonspor'da Thomas Reis dönemi başladı",
            slug: "trabzonsporda-thomas-reis-donemi-basladi",
            summary: "Bordo-mavili ekipte teknik direktörlük görevine Thomas Reis getirildi. Alman çalıştırıcı, kulüp tarihinin 45. teknik direktörü oldu.",
            content: "Trabzonspor, teknik direktörlük görevi için Thomas Reis ile anlaşmaya vardı. Alman teknik adamın bordo-mavili kulübün tarihindeki 45. teknik direktör olduğu açıklandı.\n\nYeni teknik ekibin önündeki ilk gündem, takımın lig programına hazırlanması ve mevcut kadroyla çalışma düzeninin oluşturulması olacak.",
            category: "Trabzonspor",
            image: "assets/news/trabzonspor.svg",
            publishedAt: "2026-09-16T14:25:00+03:00",
            headlineOrder: 1,
            breaking: true,
            sourceName: "Yeni Şafak Spor",
            sourceUrl: "https://www.yenisafak.com/spor/trabzonspor-tarihinin-45inci-teknik-direktoru-thomas-reis-oldu-4856413"
        }),
        article({
            title: "Sebatspor, Erbaaspor maçı hazırlıklarını sürdürüyor",
            slug: "sebatspor-erbaaspor-maci-hazirliklarini-surduruyor",
            summary: "Akçaabat temsilcisi Sebatspor, ligde oynayacağı Erbaaspor karşılaşması öncesi hazırlıklarına devam ediyor.",
            content: "Sebatspor, hafta sonu oynanacak Erbaaspor karşılaşmasına yönelik hazırlıklarını sürdürüyor. Teknik ekip yönetimindeki çalışmaların maç programına göre devam ettiği bildirildi.\n\nKarşılaşma, Akçaabat temsilcisinin ligdeki yeni haftasında puan mücadelesine sahne olacak.",
            category: "Spor",
            image: "assets/news/sebatspor.svg",
            publishedAt: "2026-09-16T10:10:00+03:00",
            headlineOrder: 4,
            sourceName: "Akçaabat'ın Sesi",
            sourceUrl: "https://www.akcaabatinsesi.com/"
        }),
        article({
            title: "Atatürk'ün Trabzon'a gelişinin 102. yıl dönümü kutlandı",
            slug: "ataturkun-trabzona-gelisinin-102-yil-donumu-kutlandi",
            summary: "Gazi Mustafa Kemal Atatürk'ün Trabzon'a gelişinin 102. yıl dönümü kentte düzenlenen programlarla anıldı.",
            content: "Gazi Mustafa Kemal Atatürk'ün Trabzon'a gelişinin 102. yıl dönümü dolayısıyla kentte anma programı düzenlendi. Programda tarihî ziyaretin Trabzon açısından taşıdığı öneme dikkat çekildi.\n\nEtkinlikler, kamu kurumları ve kent protokolünün katılımıyla gerçekleştirildi.",
            category: "Trabzon",
            image: "assets/news/trabzon.svg",
            publishedAt: "2026-09-15T15:00:00+03:00",
            headlineOrder: 3,
            sourceName: "Trabzon Valiliği",
            sourceUrl: "https://www.trabzon.gov.tr/"
        }),
        article({
            title: "Trabzonspor üyeleri için aidat ödemelerinde son tarih 30 Eylül",
            slug: "trabzonspor-aidat-odemelerinde-son-tarih-30-eylul",
            summary: "Kulüp üyelerinin yıllık aidat işlemlerini 30 Eylül tarihine kadar tamamlaması gerekiyor.",
            content: "Trabzonspor'da üyelik haklarının kesintisiz sürdürülebilmesi için yıllık aidat ödemelerinde son tarihin 30 Eylül olduğu hatırlatıldı.\n\nÜyelerin ödeme durumlarını kulübün resmî kanalları üzerinden kontrol etmesi ve işlemlerini belirtilen süre içinde tamamlaması gerekiyor.",
            category: "Trabzonspor",
            image: "assets/news/trabzonspor.svg",
            publishedAt: "2026-09-14T12:30:00+03:00",
            headlineOrder: 10,
            sourceName: "61saat",
            sourceUrl: "https://www.61saat.com/trabzonsporda-son-tarih-15-eylul-bu-habere-dikkat"
        }),
        article({
            title: "Akçaabat'ta çocukların spor ve oyun alanlarına destek",
            slug: "akcaabatta-cocuklarin-spor-ve-oyun-alanlarina-destek",
            summary: "Akçaabat Belediyesi, çocukların güvenli alanlarda spor yapması ve oyun oynaması amacıyla yürüttüğü çalışmaları duyurdu.",
            content: "Akçaabat Belediyesi, çocukların hareketli yaşama katılabileceği spor ve oyun alanlarına yönelik çalışmalarını sürdürüyor. Çalışmaların, mahallelerde güvenli ve erişilebilir sosyal alanları artırmayı amaçladığı belirtildi.\n\nBelediye, çocukların fiziksel gelişimine katkı sağlayan alanların bakım ve iyileştirme programlarının devam edeceğini bildirdi.",
            category: "Akçaabat",
            image: "assets/news/akcaabat.svg",
            publishedAt: "2026-09-12T10:00:00+03:00",
            headlineOrder: 2,
            sourceName: "Akçaabat Belediyesi",
            sourceUrl: "https://www.akcaabat.bel.tr/"
        }),
        article({
            title: "Trabzonspor, Konyaspor deplasmanından puansız döndü",
            slug: "trabzonspor-konyaspor-deplasmanindan-puansiz-dondu",
            summary: "Trabzonspor, Süper Lig karşılaşmasında TÜMOSAN Konyaspor'a deplasmanda 1-0 mağlup oldu.",
            content: "Trabzonspor, deplasmanda karşılaştığı TÜMOSAN Konyaspor'a 1-0 mağlup oldu. Karşılaşmanın tek golü ev sahibi ekibe üç puanı getirdi.\n\nBordo-mavili takım, maçın ardından bir sonraki lig haftasının hazırlıklarına odaklandı.",
            category: "Trabzonspor",
            image: "assets/news/trabzonspor.svg",
            publishedAt: "2026-09-12T20:59:00+03:00",
            headlineOrder: 6,
            sourceName: "beIN SPORTS",
            sourceUrl: "https://beinsports.com.tr/haber/tumosan-konyaspor-trabzonspor-4"
        }),
        article({
            title: "Trabzon'da Uzunkum Yaşam Alanı için yeni aşama",
            slug: "trabzonda-uzunkum-yasam-alani-icin-yeni-asama",
            summary: "Trabzon Büyükşehir Belediyesi, Uzunkum Yaşam Alanı projesindeki son durumu ve kent içi ulaşım yatırımlarını paylaştı.",
            content: "Trabzon Büyükşehir Belediyesi, Uzunkum Yaşam Alanı projesinin yeni aşamasına ilişkin bilgi verdi. Projenin sahil bandında sosyal yaşam ve kamusal kullanım imkânlarını geliştirmesi hedefleniyor.\n\nAçıklamada kent ulaşımına yönelik raylı sistem çalışmaları da Trabzon'un öncelikli yatırımları arasında gösterildi.",
            category: "Trabzon",
            image: "assets/news/trabzon.svg",
            publishedAt: "2026-09-10T11:00:00+03:00",
            headlineOrder: 5,
            sourceName: "Trabzon Büyükşehir Belediyesi",
            sourceUrl: "https://www.trabzon.bel.tr/Web/Icerik/baskan-genc-uzunkum-un-temelini-10-eylul-de-hep-birlikte-atacagiz"
        }),
        article({
            title: "Trabzon Sanatevi'nin geleceğiyle ilgili görüşmeler sürüyor",
            slug: "trabzon-sanatevinin-gelecegiyle-ilgili-gorusmeler-suruyor",
            summary: "Trabzon Sanatevi'nin Büyükşehir Belediyesine devriyle ilgili gündeme ilişkin değerlendirme yapıldı.",
            content: "Trabzon Sanatevi'nin yönetim ve kullanım modeline ilişkin görüşmeler kent gündemindeki yerini koruyor. Büyükşehir Belediye Başkanı Ahmet Metin Genç, olası devir sürecine dair açıklamalarda bulundu.\n\nSanatevinin kültür ve sanat faaliyetlerini sürdürebileceği yapının ilgili taraflarla yapılacak değerlendirmeler sonunda netleşmesi bekleniyor.",
            category: "Trabzon",
            image: "assets/news/trabzon.svg",
            publishedAt: "2026-09-09T16:00:00+03:00",
            headlineOrder: 9,
            sourceName: "Haber61",
            sourceUrl: "https://www.haber61.net/trabzon/trabzon-sanatevi-buyuksehire-mi-devrediliyor-baskan-genc-acikladi/642798"
        }),
        article({
            title: "Akçaabat'ta büyüklerle gönül bağı buluşması",
            slug: "akcaabatta-buyuklerle-gonul-bagi-bulusmasi",
            summary: "Akçaabat Belediyesi, ilçedeki büyüklerle sosyal dayanışmayı güçlendiren ziyaret ve buluşma programını sürdürdü.",
            content: "Akçaabat Belediyesi tarafından yürütülen sosyal belediyecilik çalışmaları kapsamında ilçenin büyükleriyle bir araya gelindi. Ziyaretlerde vatandaşların talepleri ve günlük yaşamlarına ilişkin ihtiyaçları dinlendi.\n\nProgramın kuşaklar arasındaki bağı ve yerel dayanışmayı güçlendirmesi hedefleniyor.",
            category: "Akçaabat",
            image: "assets/news/akcaabat.svg",
            publishedAt: "2026-09-07T12:00:00+03:00",
            sourceName: "Akçaabat Belediyesi",
            sourceUrl: "https://www.akcaabat.bel.tr/"
        }),
        article({
            title: "Akçaabat'ta Zabıta Haftası programı düzenlendi",
            slug: "akcaabatta-zabita-haftasi-programi-duzenlendi",
            summary: "Akçaabat'ta Zabıta Haftası dolayısıyla belediye zabıta personeliyle bir araya gelindi.",
            content: "Zabıta Haftası dolayısıyla Akçaabat Belediyesi bünyesinde görev yapan zabıta personeliyle buluşma gerçekleştirildi. Programda zabıtanın kent düzeni, halk sağlığı ve günlük belediye hizmetlerindeki rolüne dikkat çekildi.\n\nPersonelin haftası kutlanırken saha çalışmalarında kolaylık dilendi.",
            category: "Akçaabat",
            image: "assets/news/akcaabat.svg",
            publishedAt: "2026-09-07T09:00:00+03:00",
            sourceName: "Akçaabat Belediyesi",
            sourceUrl: "https://www.akcaabat.bel.tr/"
        }),
        article({
            title: "Akçaabat'ta okullar yeni eğitim dönemine hazırlandı",
            slug: "akcaabatta-okullar-yeni-egitim-donemine-hazirlandi",
            summary: "Yeni eğitim dönemi öncesinde Akçaabat'taki okulların çevresinde temizlik ve hazırlık çalışmaları gerçekleştirildi.",
            content: "Akçaabat'ta yeni eğitim öğretim dönemi öncesinde okul çevrelerinde temizlik ve düzenleme çalışmaları yapıldı. Ekipler, öğrencilerin daha temiz ve güvenli bir çevrede ders başı yapabilmesi için sahada görev aldı.\n\nÇalışmaların okul yönetimleriyle koordineli biçimde ihtiyaç görülen bölgelerde sürdürüleceği bildirildi.",
            category: "Akçaabat",
            image: "assets/news/akcaabat.svg",
            publishedAt: "2026-09-06T11:00:00+03:00",
            headlineOrder: 7,
            sourceName: "Akçaabat Belediyesi",
            sourceUrl: "https://www.akcaabat.bel.tr/"
        }),
        article({
            title: "Elazığspor 3-1 Sebatspor: Akçaabat temsilcisi deplasmanda kaybetti",
            slug: "elazigspor-3-1-sebatspor-mac-sonucu",
            summary: "Sebatspor, lig karşılaşmasında deplasmanda Elazığspor'a 3-1 mağlup oldu.",
            content: "Sebatspor, Elazığspor deplasmanından 3-1'lik mağlubiyetle ayrıldı. Resmî maç kaydına göre ev sahibi ekip karşılaşmayı iki farklı üstünlükle tamamladı.\n\nAkçaabat temsilcisi, maçın ardından ligdeki bir sonraki karşılaşmasının hazırlık programına geçti.",
            category: "Spor",
            image: "assets/news/sebatspor.svg",
            publishedAt: "2026-09-06T18:00:00+03:00",
            sourceName: "Türkiye Futbol Federasyonu",
            sourceUrl: "https://www.tff.org/Default.aspx?macId=318677&pageId=29"
        }),
        article({
            title: "Akçaabat'ın ulaşım altyapısında saha çalışmaları sürüyor",
            slug: "akcaabatin-ulasim-altyapisinda-saha-calismalari-suruyor",
            summary: "Akçaabat Belediyesi, Büyükşehir Belediyesi desteğiyle yol ve ulaşım altyapısına yönelik çalışmaların sürdüğünü açıkladı.",
            content: "Akçaabat genelinde ulaşım altyapısını güçlendirmeye yönelik saha çalışmaları devam ediyor. Belediye, Trabzon Büyükşehir Belediyesi desteğiyle yol bakım, düzenleme ve ihtiyaç odaklı müdahalelerin yürütüldüğünü açıkladı.\n\nÇalışma programının mahallelerden gelen talepler ve teknik incelemeler doğrultusunda sürdürüldüğü belirtildi.",
            category: "Akçaabat",
            image: "assets/news/akcaabat.svg",
            publishedAt: "2026-09-04T12:00:00+03:00",
            headlineOrder: 8,
            sourceName: "Akçaabat Belediyesi",
            sourceUrl: "https://www.akcaabat.bel.tr/"
        }),
        article({
            title: "Trabzonspor'un özel maç programında Drogheda United ve Zenit var",
            slug: "trabzonspor-drogheda-united-ve-zenitle-ozel-mac-oynayacak",
            summary: "Trabzonspor'un millî aralarda Drogheda United ve Zenit ile özel karşılaşmalar oynaması planlandı.",
            content: "Trabzonspor'un millî maç aralarında iki özel karşılaşmaya çıkacağı açıklandı. Programda 1 Ekim'de Drogheda United ve 15 Kasım'da Zenit ile oynanması planlanan maçlar yer alıyor.\n\nKarşılaşmaların takımın maç ritmini koruması ve teknik ekibin kadro değerlendirmesi yapması açısından kullanılması bekleniyor.",
            category: "Trabzonspor",
            image: "assets/news/trabzonspor.svg",
            publishedAt: "2026-09-02T14:00:00+03:00",
            sourceName: "Anadolu Ajansı",
            sourceUrl: "https://www.aa.com.tr/tr/spor/trabzonspor-drogheda-united-ve-zenitle-ozel-maclarda-karsilasacak/4045381"
        }),
        article({
            title: "Akçaabat'ın yeni otogar ve yatırım gündemi değerlendirildi",
            slug: "akcaabatin-yeni-otogar-ve-yatirim-gundemi-degerlendirildi",
            summary: "Akçaabat'ta otogar başta olmak üzere ilçenin ulaşım ve hizmet yatırımlarına ilişkin değerlendirme yapıldı.",
            content: "Akçaabat'ın ulaşım ve kent hizmetleri gündeminde yer alan otogar yatırımıyla ilgili son durum değerlendirildi. İlçenin büyüme yönü ve günlük ulaşım ihtiyacı dikkate alınarak yatırım başlıklarının ele alındığı bildirildi.\n\nBelediye, devam eden ve planlanan projelere ilişkin bilgilendirmelerin resmî kanallardan paylaşılacağını duyurdu.",
            category: "Akçaabat",
            image: "assets/news/akcaabat.svg",
            publishedAt: "2026-09-01T15:00:00+03:00",
            sourceName: "Akçaabat Belediyesi",
            sourceUrl: "https://www.akcaabat.bel.tr/"
        })
    ];
})();
