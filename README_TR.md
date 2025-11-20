# 🎵 smd-gui

[![version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/vortique/smd-gui)
[![license](https://img.shields.io/github/license/vortique/smd-gui.svg)](LICENSE)
[![last-commit](https://img.shields.io/github/last-commit/vortique/smd-gui.svg)](https://github.com/vortique/smd-gui/commits/main)
[![issues](https://img.shields.io/github/issues/vortique/smd-gui.svg)](https://github.com/vortique/smd-gui/issues)
[![stars](https://img.shields.io/github/stars/vortique/smd-gui?style=social)](https://github.com/vortique/smd-gui)

Spotify parça bilgilerini ve YouTube'u (`yt-dlp` aracılığıyla) kullanarak müzik indirmeye yardımcı olan basit bir Electron GUI'si.

Bu proje aktif geliştirme aşamasındadır. Uygulama, Spotify'dan parça meta verilerini kullanarak YouTube'da eşleşen ses içeriğini bulur, indirir ve ardından bir ses dosyasına dönüştürür.

---

## Diller

- [İngilizce](README.md)
- [Türkçe](README_TR.md)

---

**Bu proje neden var?**: Spotify URL'si ile parçaları almak ve paketlenmiş `yt-dlp` ikili dosyaları ve `ffmpeg` kullanarak indirmek için hafif, platformlar arası bir masaüstü arayüzü sağlar. Ve en önemlisi, ben bu programı kullanacağım. Yani var olması gerekiyor.

**Durum**: Erken geliştirme aşaması — parça/çalma listesi/sanatçı/albüm indirme destekleniyor, ancak program özelleştirme ve hata yönetiminden yoksun.

**Desteklenen platformlar**: Linux, macOS, Windows (önceden derlenmiş `yt-dlp` ikili dosyaları `binaries/` altında yer alıyor).

**Test edilmemiş platformlar**: OpenBSD. yt-dlp deposuna göre, `binaries/linux/yt-dlp` ikili dosyası OpenBSD ile de çalışmalı, ancak bundan emin değilim.

**Not**: Bu proje, kolaylık sağlamak için `binaries/` içinde `yt-dlp` ikili dosyalarını paketler.

## İçindekiler

- **Özellikler**
- **Yol Haritası**
- **Ön Gereksinimler**
- **Kurulum**
- **Kullanım**
- **Önizleme**
- **Geliştirme**
- **Paketleme**
- **Katkıda Bulunma**
- **Yasal Uyarı**
- **Lisans**

## Özellikler

- **Basit tek parça indirme**: Meta verileri almak ve eşleşen bir YouTube sesini indirmek için bir Spotify parça URL'si girin.
- **Çalma Listesi/Albüm/Sanatçı indirme desteği**: İndirmek istediğiniz şeyin Spotify URL'sini girin ve indirme sayısını sınırlayarak istediğiniz kadar şarkı indirin.
- **Paketlenmiş ikili dosyalar**: Çalıştırmayı kolaylaştırmak için her işletim sistemi için `binaries/` içinde `yt-dlp` yürütülebilir dosyalarını içerir.
- **Ses dönüştürme**: İndirmeleri yaygın ses formatlarına dönüştürmek için `ffmpeg` (`ffmpeg-static-electron` aracılığıyla) kullanır.

## Yol Haritası

- [x] Tek parça indirme
- [x] Çalma listesi indirme
- [x] Albüm indirme
- [x] Sanatçı parçaları indirme
- [x] Özel indirme dizini
- [ ] İndirme kuyruğu
- [ ] Çoklu format dışa aktarma
- [ ] Youtube Music desteği (belki)

## Ön Gereksinimler

- **Node.js**: v16+ (veya projenin Electron sürümü ile uyumlu olmalı)
- **npm** veya **pnpm**: bağımlılıkları yüklemek ve betikleri çalıştırmak için

## Kurulum

Depoyu klonlayın ve bağımlılıkları yükleyin:

```bash
git clone https://github.com/vortique/smd-gui.git
cd smd-gui
npm install
```

Electron uygulamasını geliştirme modunda çalıştırın:

```bash
npm start
```

`start` betiği `electron .` komutunu çalıştırır (`package.json` dosyasına bakın).

## Kullanım

- Uygulamayı `npm start` ile başlatın.
- GUI girişine bir Spotify parça URL'si yapıştırın ve gönderin.
- Uygulama, en iyi eşleşen sonucu bulmak için YouTube'da (`yt-dlp` aracılığıyla) arama yapacak, videoyu indirecek ve sese dönüştürecektir.
- İndirilen dosyalar ve geçici dosyaların konumu işletim sistemine bağlıdır; geçici dosyalar işletim sisteminizin geçici dosya dizinine, indirilen şarkılar ise (şimdilik) işletim sisteminizin müzik dizinine gider.

### Nasıl Çalışır?

Programın indirme kısmı şu şekilde çalışır:

1. Spotify URL'sini al
2. URL'den Spotify ID'sini al
3. Spotify'dan Erişim Belirteci (Access Token) al (gerekirse)
4. Spotify API aracılığıyla URL'nin meta verilerini getir
5. Meta verileri yt-dlp'ye ver ve meta verilere göre YouTube'da arama yap
6. Bulunan videoyu meta verilere göre indir
7. İndirilen videodan sesi FFmpeg ile çıkar ve kaydet

## Önizleme

**Bilgi paneli önizlemesi**:
![info-panel-Preview](./github/previews/info-panel-preview.png)

**Bir şarkı indirme önizlemesi**:
![downloading-Preview](./github/previews/downloading-info-preview.png)

**NOT**: Bu ekran görüntüleri yalnızca önizleme içindir ve indirme sadece bir simülasyondur.

## Geliştirme

- Projeyi editörünüzde açın (örn. `code .`).
- Bağımlılıkları yükleyin: `npm install`.
- Uygulamayı başlatın: `npm start`.

Yararlı dosya referansları:

- **Ana süreç**: `src/main/main.js`
- **Render'lar**: `src/renderer/renderer.js`, `src/renderer/options-renderer.js`
- **Preload betikleri**: `src/renderer/preload/preload-main.js`, `src/renderer/preload/preload-options.js`
- **yt-dlp yardımcıları**: `src/main/yt-dlp/yt-dlp-binary-executors.js`, `src/main/yt-dlp/installers.js`

## Paketleme

Proje, `package.json` içinde `binaries/` dizinini ekstra kaynak olarak koruyan bir `build` bölümü içerir. Tercih ettiğiniz Electron paketleyiciyi (örn. `electron-builder` veya `electron-packager`) kullanın ve `binaries/` dizininin son uygulama paketine kopyalandığından emin olun.

Örnek (`electron-builder` kullanıyorsanız):

```bash
# electron-builder'ı yükleyin (isteğe bağlı)
npm install --save-dev electron-builder
# mevcut platform için derleyin (örnek)
npx electron-builder
```

## Katkıda Bulunma

Katkılar, hata raporları ve özellik istekleri memnuniyetle karşılanır. Lütfen sorunlar açın veya pull request gönderin. Katkıda bulunurken, değişikliğin net bir açıklamasını ve geçerliyse, yeniden üretme ve test etme adımlarını ekleyin.

## Yasal Uyarı

Bu proje, telif hakkıyla korunan içeriğin indirilmesini sağlamaz veya teşvik etmez.
Kullanıcılar, aldıkları sesleri indirme ve kullanma haklarına sahip olduklarından emin olmaktan sorumludur.

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır — ayrıntılar için `LICENSE` dosyasına bakın.