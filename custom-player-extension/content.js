// Formatlama fonksiyonu: Saniyeyi (Örn: 125) -> Dakika:Saniye (Örn: 02:05) formatına çevirir
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function injectCustomPlayer() {
    // Sayfadaki tüm standart HTML5 video elementlerini bul
    const originalVideos = document.querySelectorAll('video:not(.custom-player-video)');

    if (originalVideos.length > 0) {
        console.log(`[Custom Player] Sayfada ${originalVideos.length} adet video bulundu. Oynatıcı değiştiriliyor...`);

        originalVideos.forEach(video => {
            // Videonun kaynağını (URL) al
            const videoSrc = video.currentSrc || video.src;
            
            // Eğer kaynağı okuyamıyorsak veya zaten kendi oynatıcımızsa atla
            if (!videoSrc) return; 

            // 1. Orijinal videoyu gizle
            video.style.display = 'none';
            // Videonun sesini kapat ki arkada çalmaya devam etmesin
            video.muted = true;
            video.pause();

            // 2. Kendi oynatıcımızın ana kapsayıcısını (container) oluştur
            const container = document.createElement('div');
            container.className = 'custom-player-container';

            // 3. Yeni video elementini oluştur
            const newVideo = document.createElement('video');
            newVideo.className = 'custom-player-video';
            newVideo.src = videoSrc;
            
            // 4. Oynatıcı kontrollerini (Alt çubuk) oluştur
            const controls = document.createElement('div');
            controls.className = 'custom-player-controls';

            // Oynat/Duraklat butonu
            const playBtn = document.createElement('button');
            playBtn.className = 'custom-btn';
            playBtn.innerText = 'Oynat';

            // İlerleme çubuğu (Progress bar)
            const progressContainer = document.createElement('div');
            progressContainer.className = 'custom-progress-container';
            const progressBar = document.createElement('div');
            progressBar.className = 'custom-progress-bar';
            progressContainer.appendChild(progressBar);

            // Süre göstergesi (Time Display)
            const timeDisplay = document.createElement('div');
            timeDisplay.className = 'custom-time-display';
            timeDisplay.innerText = "00:00 / 00:00";

            // Tam ekran butonu (Fullscreen)
            const fullscreenBtn = document.createElement('button');
            fullscreenBtn.className = 'custom-btn';
            fullscreenBtn.innerText = 'Tam Ekran';
            fullscreenBtn.style.background = '#444';

            // Kontrolleri alt çubuğa ekle
            controls.appendChild(playBtn);
            controls.appendChild(progressContainer);
            controls.appendChild(timeDisplay);
            controls.appendChild(fullscreenBtn);

            // Elemanları ana kapsayıcıya ekle
            container.appendChild(newVideo);
            container.appendChild(controls);

            // Yeni oynatıcıyı, orijinal videonun hemen sonrasına sayfaya ekle
            video.parentNode.insertBefore(container, video.nextSibling);

            // --- ETKİLEŞİMLER (EVENT LISTENERS) ---

            // Oynat/Duraklat
            const togglePlay = () => {
                if (newVideo.paused) {
                    newVideo.play();
                    playBtn.innerText = 'Duraklat';
                } else {
                    newVideo.pause();
                    playBtn.innerText = 'Oynat';
                }
            };

            playBtn.addEventListener('click', togglePlay);
            newVideo.addEventListener('click', togglePlay); // Videoya tıklayınca da oynasın/dursun

            // Zaman Aktıkça İlerleme Çubuğunu ve Süreyi Güncelle
            newVideo.addEventListener('timeupdate', () => {
                // İlerleme çubuğunu uzat
                const progressPercent = (newVideo.currentTime / newVideo.duration) * 100;
                progressBar.style.width = `${progressPercent}%`;

                // Süre metnini güncelle
                timeDisplay.innerText = `${formatTime(newVideo.currentTime)} / ${formatTime(newVideo.duration)}`;
            });

            // Metadata (süre) yüklendiğinde toplam süreyi göster
            newVideo.addEventListener('loadedmetadata', () => {
                 timeDisplay.innerText = `00:00 / ${formatTime(newVideo.duration)}`;
            });

            // İlerleme Çubuğuna Tıklayarak İleri/Geri Sarma
            progressContainer.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const clickPercent = clickX / width;
                newVideo.currentTime = clickPercent * newVideo.duration;
            });
            
            // Video bittiğinde butonu sıfırla
            newVideo.addEventListener('ended', () => {
                 playBtn.innerText = 'Oynat';
            });

            // Tam Ekran İşlevi
            fullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    container.requestFullscreen().catch(err => {
                        console.log(`Tam ekran hatası: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            });
        });
    }
}

// Sayfa yüklendikten 1 saniye sonra çalıştır (Videonun sayfaya yüklenmesini beklemek için)
setTimeout(injectCustomPlayer, 1000);
