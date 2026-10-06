# 🎬 EchoPlay

EchoPlay, modern web teknolojilerini ve Electron.js'i temel alan, akıllı ses senkronizasyonuna sahip, yüksek performanslı ve çapraz platform (Masaüstü & Mobil Web) bir video oynatıcıdır.

## ✨ Öne Çıkan Özellikler

- **🤖 Akıllı Senkron (Smart Sync):** VAD (Ses Etkinliği Tespiti) kullanarak altyazılarınızı tek tıkla videodaki seslere milisaniyesine kadar otomatik senkronize eder.
- **🛡️ HLS Hata Kurtarma:** Kesintili veya sorunlu (M3U8) yayınlarda video donmasını engeller, yayını otomatik olarak kurtarıp kaldığı yerden devam ettirir.
- **📱 Mobil Web Uyumluluğu:** Uygulama, hiçbir kurulum gerektirmeden cep telefonunuzun tarayıcısından da tam uyumlu şekilde (çift dokunma desteğiyle) kullanılabilir.
- **🖼️ Native PiP (Resim İçinde Resim):** Videoyu bilgisayar ekranınızın bir köşesine sabitleyerek diğer işlerinizi yaparken izlemenizi sağlar.
- **🔄 Otomatik Güncelleme:** GitHub üzerinden yeni sürümleri otomatik olarak tespit eder, tek tıkla arka planda indirip kurar.
- **📂 Geniş Format Desteği:** Yerel dosyaları (.mp4, .mkv), canlı yayınları (HLS/m3u8) ve altyazıları (.srt, .vtt) sürükle-bırak ile anında çalıştırır.

## 🚀 Kurulum ve Kullanım

### Windows İçin İndirin
Uygulamanın en güncel sürümünü yüklemek için:
1. Sağ taraftaki **Releases** sekmesine gidin.
2. En son sürümdeki EchoPlay Setup.exe dosyasını indirin ve kurun.

### Mobil ve Web Kullanımı
Eğer uygulamayı bilgisayarınıza kurmadan denemek veya telefonunuzdan erişmek isterseniz:
👉 **[EchoPlay Web Sürümünü Aç](https://echoplay-mobile-vega.netlify.app)**

## ⌨️ Kısayollar
- \Space\: Oynat / Duraklat (Basılı tutarsanız x2 hızında ileri sarar)
- \F\: Tam Ekran
- \Yön Tuşları\: İleri/Geri sarma (Sol/Sağ) ve Ses seviyesi (Aşağı/Yukarı)
- \G / H\: Manuel Altyazı Senkronizasyonu (-0.5sn / +0.5sn)

## 🛠️ Teknolojik Altyapı
- **Electron.js** & **Node.js**
- **HLS.js** (Yayın çözücü ve Akıllı kurtarma motoru)
- **Web Audio API** (VAD - Akıllı Senkron Motoru)
- **electron-updater** (Otonom Güncelleme Dağıtımı)

---
*Geliştirici:* Arcturus003
