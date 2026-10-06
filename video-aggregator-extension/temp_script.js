
    const video = document.getElementById('myPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const bigPlayBtn = document.getElementById('bigPlayBtn');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');
    const timeDisplay = document.getElementById('timeDisplay');
    const muteBtn = document.getElementById('muteBtn');
    const fullScreenBtn = document.getElementById('fullScreenBtn');
    const videoWrapper = document.getElementById('videoWrapper');
    const controlsContainer = document.getElementById('controlsContainer');
    const rewindBtn = document.getElementById('rewindBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    
    const volumeContainer = document.getElementById('volumeContainer');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeText = document.getElementById('volumeText');

    // =========================================================================
    // 🧠 1. TAMAMEN DİNAMİK METADATA AYRIŞTIRICI (SIFIR SABİT KOD)
    // =========================================================================
    // Desteklenen formatlar (+25 test):
    // [TempestFansub]Dr.Stone 7. Bölüm 1080p.mp4   -> Dr Stone S01B07
    // [SubsPlease] Dr. Stone - 07 (1080p).mkv       -> Dr Stone S01B07
    // Naruto Shippuden S02E05.mp4                   -> Naruto Shippuden S02B05
    // One.Piece.E1089.1080p.WEB-DL.mkv              -> One Piece S01B1089
    // Attack on Titan - S04E28 - The Dawn of...     -> Attack on Titan S04B28
    // Code_Geass_R2_-_05.mp4                        -> Code Geass S02B05
    // Jujutsu Kaisen 2. Sezon 5. Bölüm.mp4         -> Jujutsu Kaisen S02B05
    // Vinland Saga Season 2 Episode 13.mp4          -> Vinland Saga S02B13
    // Dr. Stone 3rd Season - 07.mp4                 -> Dr Stone S03B07
    // One_Punch_Man_2.Sezon_12.Bölüm_720p.mp4      -> One Punch Man S02B12
    // bleach_366.mp4                                -> bleach S01B366
    function detectVideoMetadata(src) {
        const urlParams = new URLSearchParams(window.location.search);
        
        let imdb = urlParams.get('imdb') || urlParams.get('imdb_id') || null;
        let season = parseInt(urlParams.get('s') || urlParams.get('season') || "0");
        let episode = parseInt(urlParams.get('e') || urlParams.get('episode') || urlParams.get('b') || urlParams.get('bolum') || "0");
        let title = urlParams.get('title') || urlParams.get('dizi');

        let pathname = "";
        let filename = "";
        try {
            const parsedUrl = new URL(src, window.location.href);
            pathname = decodeURIComponent(parsedUrl.pathname);
            filename = pathname.split('/').pop();
        } catch (e) {
            pathname = src;
            filename = src.split('/').pop();
        }

        // Kalıp 1: OpenAni / Zyapbot CDN (/animes/<slug>/<season>/<episode>-...)
        const animeMatch = pathname.match(/\/animes\/([^\/]+)\/(\d+)\/(\d+)/i);
        let extractedSlug = "";
        if (animeMatch) {
            extractedSlug = animeMatch[1];
            if (!season) season = parseInt(animeMatch[2]);
            if (!episode) episode = parseInt(animeMatch[3]);
        }

        // IMDb Tespiti
        if (!imdb) {
            const imdbMatch = (pathname + filename).match(/tt\d{7,8}/i);
            if (imdbMatch) imdb = imdbMatch[0];
        }

        // --- Dosya adını normalize et ---
        let stripped = filename
            .replace(/\.(mp4|mkv|webm|m3u8|avi|ts|mov|wmv|flv)$/i, '')
            .replace(/\[[^\]]*\]/g, ' ')    // [TempestFansub], [1080p], [ABCD1234]
            .replace(/\([^)]*\)/g, ' ');    // (BD 1080p), (WEB)
        
        // Alt çizgiyi boşluğa
        stripped = stripped.replace(/_/g, ' ');
        
        // "7. Bölüm", "2. Sezon" kalıplarını normalize et (noktayı kaldır)
        stripped = stripped
            .replace(/(\d+)\.\s*(?=(?:bölüm|bolum|sezon|season))/gi, '$1 ')
            .replace(/\./g, ' ')    // Kalan tüm noktaları boşluğa
            .replace(/\s{2,}/g, ' ').trim();

        // --- SEZON TESPİTİ ---
        if (!season) {
            const sp = [
                /\b(\d{1,2})(?:st|nd|rd|th)\s+(?:season|sezon)\b/i,   // 3rd Season
                /\b(\d{1,2})\s+(?:season|sezon)\b/i,                   // 2 Sezon
                /\b(?:season|sezon)\s+0*(\d{1,2})\b/i,                 // Season 2
                /\b(?:part|cour|kisim|kısım)\s+0*(\d{1,2})\b/i,        // Part 2
                /\bR(\d)\b/,                                            // R2
                /\bS0*(\d{1,2})\b(?!\w)/i,                              // S2
            ];
            // SxxExx birleşik kontrolü
            const sxex = stripped.match(/\bS0*(\d{1,2})\s*E0*(\d{1,4})\b/i);
            if (sxex) {
                season = parseInt(sxex[1]);
            } else {
                for (const p of sp) { const m = stripped.match(p); if (m) { season = parseInt(m[1]); break; } }
            }
        }
        if (!season) season = 1;

        // --- BÖLÜM TESPİTİ ---
        if (!episode) {
            // SxxExx birleşik kontrolü
            const sxex = stripped.match(/\bS0*(\d{1,2})\s*E0*(\d{1,4})\b/i);
            if (sxex) {
                episode = parseInt(sxex[2]);
            } else {
                const ep = [
                    /\b(?:ep|episode)\s+0*(\d{1,4})\b/i,                   // Episode 5
                    /\b(\d{1,4})\s+(?:bölüm|bolum)\b/i,                    // 7 Bölüm
                    /\b(?:bölüm|bolum)\s+0*(\d{1,4})\b/i,                  // Bölüm 7
                    /\bE0*(\d{1,4})\b/i,                                    // E05
                    /\s-\s0*(\d{1,4})(?:v\d)?(?:\s|$)/i,                    // - 07
                    /\s(\d{1,4})\s*$/i,                                     // sondaki numara
                ];
                for (const p of ep) { const m = stripped.match(p); if (m) { episode = parseInt(m[1]); break; } }
            }
        }
        if (!episode) episode = 1;

        // --- BAŞLIK TEMİZLEME ---
        if (!title) {
            if (extractedSlug) {
                title = extractedSlug
                    .replace(/[-_]+/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
            } else {
                let clean = stripped
                    // Kalite/Codec
                    .replace(/\b(1080p|720p|480p|360p|2160p|4k|uhd|fhd|hd|sd|web\s*dl|webrip|bdrip|dvdrip|bluray|blu\s*ray|x264|x265|hevc|h\s*264|h\s*265|avc|aac|flac|opus|10bit|8bit|hi10p|dual\s*audio|multi\s*sub|eng?\s*sub|tr\s*alt|türkçe\s*altyazılı?|hardcoded|softcoded)\b/gi, ' ')
                    // SxxExx
                    .replace(/\bS0*\d{1,2}\s*E0*\d{1,4}(?:v\d)?\b/gi, ' ')
                    // Season/Sezon
                    .replace(/\b\d{1,2}(?:st|nd|rd|th)\s+(?:season|sezon)\b/gi, ' ')
                    .replace(/\b\d{1,2}\s+(?:season|sezon)\b/gi, ' ')
                    .replace(/\b(?:season|sezon)\s+0*\d{1,2}\b/gi, ' ')
                    .replace(/\b(?:part|cour|kisim|kısım)\s+0*\d{1,2}\b/gi, ' ')
                    // Episode/Bölüm
                    .replace(/\b(?:ep|episode)\s+0*\d{1,4}(?:v\d)?\b/gi, ' ')
                    .replace(/\bE0*\d{1,4}(?:v\d)?\b/gi, ' ')
                    .replace(/\b\d{1,4}\s+(?:bölüm|bolum)\b/gi, ' ')
                    .replace(/\b(?:bölüm|bolum)\s+0*\d{1,4}\b/gi, ' ')
                    .replace(/\b(?:bölüm|bolum)\b/gi, ' ')
                    .replace(/\b(?:second)\b/gi, ' ')
                    // Fansub tire formatı: - 07
                    .replace(/\s-\s0*\d{1,4}(?:v\d)?\b/gi, ' ')
                    // Versiyon/R tag/S tag
                    .replace(/\bv\d\b/gi, ' ')
                    .replace(/\bR\d\b/g, ' ')
                    .replace(/\bS0*\d{1,2}\b/gi, ' ')
                    // Sondaki yalnız numara
                    .replace(/\s\d{1,4}\s*$/gi, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                title = clean.length >= 2 ? clean : "Video";
            }
        }

        const displayTitle = `${title} - S${season < 10 ? '0' : ''}${season}B${episode < 10 ? '0' : ''}${episode}`;
        return { imdb, season, episode, title, displayTitle };
    }

    // =========================================================================
    // 🎬 2. VİDEO KAYNAĞI VE KALİTE SİSTEMİ
    // =========================================================================
    const urlParams = new URLSearchParams(window.location.search);
    let videoSrc = urlParams.get('video') || urlParams.get('src') || ''; 
    let currentMeta = videoSrc ? detectVideoMetadata(videoSrc) : { displayTitle: "Video Bekleniyor...", title: "", season: null, episode: null, imdb: null };

    // Eklentiden video gelirse başlangıç ekranını gizle
    if (videoSrc) {
        const splashScreen = document.getElementById('splashScreen');
        if (splashScreen) splashScreen.style.display = 'none';
        
        const bigPlayBtn = document.getElementById('bigPlayBtn');
        if (bigPlayBtn) bigPlayBtn.style.display = 'flex';
    }

    // Iframe embed kaynaklarını tespit et
    const isIframeEmbed = videoSrc && (videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be') || videoSrc.includes('dood') || videoSrc.includes('filemoon') || videoSrc.includes('vimeo'));
    
    if (isIframeEmbed) {
        // Video etiketini iframe ile değiştir
        const iframe = document.createElement('iframe');
        iframe.src = videoSrc;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.setAttribute('allowfullscreen', 'true');
        video.parentNode.replaceChild(iframe, video);
        
        // Kontrolleri gizle çünkü iframe'de kendi kontrolleri var
        document.getElementById('controlsContainer').style.display = 'none';
        document.getElementById('bigPlayBtn').style.display = 'none';
        
        // Hata mesajı/uyarı göster
        setTimeout(() => {
            showFeedback('<i class="ph-bold ph-warning"></i> Gömülü oynatıcı tespit edildi. Özel kontroller devre dışı.', window.innerWidth / 2);
        }, 1000);
        
        // Geri kalan video kurulumunu atla
        videoSrc = ""; 
    }



    // Üst Bar Başlığını Güncelle
    document.getElementById('videoTitle').textContent = currentMeta.displayTitle;

    // Kesintisiz Kalite Değiştirme
    function switchQuality(newSrc, newLabel, btnElement) {
        const wasPlaying = !video.paused;
        const currentTime = video.currentTime;
        
        if (newSrc.startsWith('http://') || newSrc.startsWith('https://')) {
            video.crossOrigin = "anonymous";
        } else {
            video.removeAttribute('crossorigin');
        }
        video.src = newSrc;
        
        video.addEventListener('loadedmetadata', function onLoaded() {
            video.currentTime = currentTime;
            if (wasPlaying) {
                video.play().catch(e => console.log("Oynatma sürdürme:", e));
            }
            video.removeEventListener('loadedmetadata', onLoaded);
        });
        
        const btns = document.getElementById('qualityList').querySelectorAll('.menu-btn');
        btns.forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        closeAllMenus();
    }
    
    // Video Yükleme (MP4 / HLS)
    if (videoSrc) {
        if (videoSrc.includes('.m3u8')) {
            let hls;
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(videoSrc);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                    const levels = data.levels;
                    const qualityList = document.getElementById('qualityList');
                    qualityList.innerHTML = '';
                    
                    let autoBtn = document.createElement('button');
                    autoBtn.className = 'menu-btn active';
                    autoBtn.textContent = 'Otomatik';
                    autoBtn.onclick = () => { hls.currentLevel = -1; updateQualityMenu(autoBtn); };
                    qualityList.appendChild(autoBtn);

                    levels.slice().reverse().forEach((level, index) => {
                        const originalIndex = levels.length - 1 - index; 
                        let btn = document.createElement('button');
                        btn.className = 'menu-btn';
                        btn.textContent = level.height + 'p';
                        btn.onclick = () => { hls.currentLevel = originalIndex; updateQualityMenu(btn); };
                        qualityList.appendChild(btn);
                    });
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = videoSrc;
            }
        } else {
            if (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) {
                video.crossOrigin = "anonymous";
            }
            video.src = videoSrc;
            
            const qualityList = document.getElementById('qualityList');
            qualityList.innerHTML = '';
            let btn = document.createElement('button');
            btn.className = 'menu-btn active';
            btn.textContent = 'Yerel Dosya';
            qualityList.appendChild(btn);
        }
    }

    // =========================================================================
    // 📝 3. OTONOM ALTYAZI SİSTEMİ (PARSER & BACKEND ENTEGRASYONU)
    // =========================================================================
    let parsedDialogues = [];
    let currentSubtitleMode = 'off'; // Başlangıçta kapalı (kullanıcı isterse açar)

    function parseTimestamp(timeStr) {
        if (!timeStr) return 0;
        const clean = timeStr.trim().replace(',', '.');
        const parts = clean.split(':');
        if (parts.length === 3) {
            return (parseFloat(parts[0]) * 3600) + (parseFloat(parts[1]) * 60) + parseFloat(parts[2]);
        } else if (parts.length === 2) {
            return (parseFloat(parts[0]) * 60) + parseFloat(parts[1]);
        }
        return parseFloat(clean) || 0;
    }

    function parseVttCues(vttText) {
        const cues = [];
        if (!vttText) return cues;
        const lines = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();
            if (line.includes('-->')) {
                const parts = line.split('-->');
                const startTime = parseTimestamp(parts[0]);
                const endTime = parseTimestamp(parts[1].trim().split(' ')[0]);

                i++;
                let text = "";
                while (i < lines.length && lines[i].trim() !== "" && !lines[i].includes('-->')) {
                    if (!/^\d+$/.test(lines[i].trim())) {
                        text += (text ? " " : "") + lines[i].trim();
                    }
                    i++;
                }
                const cleanText = text.replace(/<[^>]+>/g, '').trim();
                if (cleanText && !isNaN(startTime)) {
                    cues.push({ startTime, endTime, text: cleanText });
                }
            } else {
                i++;
            }
        }
        
        cues.sort((a, b) => a.startTime - b.startTime);
        
        // Çakışma (Overlap) Konumlandırma Algoritması
        // Eğer bir altyazı başladığında ekranda hala başka altyazılar varsa, yenisini ekranın üstüne taşı (Anime Stili).
        for (let j = 0; j < cues.length; j++) {
            let activeOverlaps = 0;
            for (let k = 0; k < j; k++) {
                // Eğer önceki bir altyazının bitişi, yenisinin başlangıcından sonraysa ekranda hala var demektir
                if (cues[k].endTime > cues[j].startTime) {
                    activeOverlaps++;
                }
            }
            if (activeOverlaps > 0) {
                // Her yeni çakışma için yukarıdan %5-%10'luk yer aç
                cues[j].line = (activeOverlaps * 5) + "%"; 
            }
        }
        return cues;
    }

    function formatVttTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    function generateVtt(cues) {
        let vtt = "WEBVTT\n\n";
        cues.forEach(c => {
            const settings = c.line ? ` line:${c.line}` : "";
            vtt += `${formatVttTime(c.startTime)} --> ${formatVttTime(c.endTime)}${settings}\n${c.text}\n\n`;
        });
        return vtt;
    }

    let subtitleSyncOffset = 0;

    function adjustSubtitleSync(deltaSeconds) {
        if (!parsedDialogues || parsedDialogues.length === 0) return;

        subtitleSyncOffset += deltaSeconds;

        // Sadece arka plan array'ini güncelle
        for (let i = 0; i < parsedDialogues.length; i++) {
            parsedDialogues[i].startTime = Math.max(0, parsedDialogues[i].startTime + deltaSeconds);
            parsedDialogues[i].endTime = Math.max(0, parsedDialogues[i].endTime + deltaSeconds);
        }

        // Native cue'ları manipüle etmek Chrome'da "ghosting" (ekranda donup kalma) bug'ı yaratır.
        // Bu yüzden tüm altyazı track'ini sıfırdan güvenle yeniden yaratıyoruz.
        applySubtitle(null, 'Senkronlu Altyazı', true);

        const sign = subtitleSyncOffset > 0 ? '+' : '';
        showFeedback(`<i class="ph-bold ph-clock"></i> Senkron: ${sign}${subtitleSyncOffset.toFixed(1)}s`, window.innerWidth / 2);
    }

    function applySubtitle(vttText, label = "Türkçe", isSyncAdjustment = false) {
        if (!isSyncAdjustment) {
            parsedDialogues = parseVttCues(vttText);
            subtitleSyncOffset = 0; // Yeni altyazı yüklendiğinde sıfırla
        }
        
        // Ham dosyayı değil, çakışmalardan (overlap) arındırılmış temiz dosyayı kullan
        const cleanVtt = generateVtt(parsedDialogues);
        const blob = new Blob([cleanVtt], { type: 'text/vtt' });
        const blobUrl = URL.createObjectURL(blob);
        
        let existingTrack = document.getElementById('subtitleTrack');
        if (existingTrack) {
            // BUG FIX: Track'i DOM'dan silmeden önce kesinlikle gizli moda (hidden) al!
            // Aksi takdirde silinen elementin o anki cue'su ekranda sonsuza kadar takılı kalır (ghosting/üst üste binme).
            if (existingTrack.track) existingTrack.track.mode = 'hidden';
            existingTrack.remove();
        }
        
        const newTrack = document.createElement('track');
        newTrack.id = 'subtitleTrack';
        newTrack.label = label;
        newTrack.kind = 'subtitles';
        newTrack.srclang = 'tr';
        newTrack.default = true;
        newTrack.src = blobUrl;
        // Track yüklendiğinde ve cue'lar parse edildiğinde tetiklenecek event
        newTrack.onload = () => {
            if (video.textTracks && video.textTracks.length > 0) {
                // Diğer tüm dahili (.mkv) altyazıları gizle
                for (let i = 0; i < video.textTracks.length; i++) {
                    video.textTracks[i].mode = 'hidden';
                }
                
                // Sadece bizim yüklediğimiz track'i göster (hardsub/off değilse)
                if (currentSubtitleMode !== 'hardsub' && currentSubtitleMode !== 'off') {
                    newTrack.track.mode = 'showing';
                }
            }

            // Otomatik senkron özelliği kullanıcının isteği üzerine video yüklenişinden kaldırıldı.
            // Sadece menüden "Otomatik Altyazı" seçildiğinde veya Senkron butonuna tıklandığında çalışacak.
        };

        video.appendChild(newTrack);
    }

    // Oynatıcı Başladığında Otomatik Altyazı Sorgula (Arka Planda Otonom Çeker)
    async function autoFetchSubtitles(customMeta = null) {
        try {
            // customMeta varsa (manuel aramadan geliyorsa) onu kullan, yoksa otomatik çıkarılanı (currentMeta) kullan.
            const meta = customMeta || currentMeta;
            
            showFeedback(`<i class="ph-bold ph-spinner-gap"></i> Altyazı Aranıyor...`, window.innerWidth / 2);
            
            const requestData = {
                title: meta.title,
                imdb_id: meta.imdb,
                season: meta.season,
                episode: meta.episode,
                lang: 'tr'
            };
            
            const response = await fetch("https://buprmxeystecnnarhpnj.supabase.co/functions/v1/fetch-subtitle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error || "Altyazı bulunamadı veya sunucu hatası.";
                showFeedback(`<div style="font-size:16px; line-height:1.4;"><i class="ph-bold ph-warning" style="color:#e91e63;"></i><br>${errMsg}<br><span style="font-size:12px; opacity:0.8;">(Menüden orijinal adıyla aramayı deneyin)</span></div>`, window.innerWidth / 2);
                console.warn("[AutoSub Error]", errMsg);
                return;
            }
            const data = await response.json();
            
            if (data.vtt) {
                applySubtitle(data.vtt, 'Otomatik Altyazı');
                showFeedback(`<i class="ph-bold ph-subtitles"></i> Altyazı İndirildi (${parsedDialogues.length} Diyalog)`, window.innerWidth / 2);
            } else {
                showFeedback(`<i class="ph-bold ph-warning"></i> Altyazı Bulunamadı`, window.innerWidth / 2);
            }
        } catch (e) {
            console.log("Otonom altyazı çekme bilgisi:", e);
            showFeedback(`<i class="ph-bold ph-warning"></i> Bağlantı Hatası: ${e.message}`, window.innerWidth / 2);
        }
    }
    // autoFetchSubtitles() artık sayfa yüklendiğinde değil, menüden seçilince tetiklenecek.

    function setSubtitleMode(mode, btnElement) {
        currentSubtitleMode = mode;
        document.getElementById('fansubList').querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
        closeAllMenus();

        if (mode === 'off') {
            if (video.textTracks && video.textTracks.length > 0) {
                for (let i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = 'hidden';
            }
            showFeedback('<i class="ph-bold ph-eye-slash"></i> Altyazı Gizlendi', window.innerWidth / 2);
        } else if (mode === 'hardsub') {
            // Gömülü mod: Ekrandaki altyazıyı gizle, ama ses & zamanlama atlamasını hazır tut
            if (video.textTracks && video.textTracks.length > 0) {
                for (let i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = 'hidden';
            }
            initAudioEngine();
            if (parsedDialogues.length === 0) {
                autoFetchSubtitles(); // Arka plan zıplamaları için veriyi sessizce çek
            }
            showFeedback('<i class="ph-bold ph-waveform"></i> Gömülü Video Modu (Ses Analizli Atlama)', window.innerWidth / 2);
        } else if (mode === 'auto') {
            if (video.textTracks && video.textTracks.length > 0) {
                // Diğer tüm dahili (.mkv) altyazıları gizle
                for (let i = 0; i < video.textTracks.length; i++) {
                    video.textTracks[i].mode = 'hidden';
                }
                // Sadece bizim eklediğimizi göster
                const customTrack = document.getElementById('subtitleTrack');
                if (customTrack && customTrack.track) customTrack.track.mode = 'showing';
            }
            if (parsedDialogues.length === 0) {
                autoFetchSubtitles();
            } else {
                showFeedback('<i class="ph-bold ph-sparkle"></i> Otomatik Altyazı Açık', window.innerWidth / 2);
            }
        }
    }

    // Manuel Orijinal İsimle Arama
    const manualSubSearchBtn = document.getElementById('manualSubSearchBtn');
    const manualSubSearchInput = document.getElementById('manualSubSearchInput');
    
    manualSubSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            manualSubSearchBtn.click();
        }
    });

    manualSubSearchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const query = manualSubSearchInput.value.trim();
        if (!query) {
            showFeedback('<i class="ph-bold ph-warning"></i> Lütfen anime adını yazın', window.innerWidth / 2);
            return;
        }
        
        // Mevcut meta üzerinden sadece başlığı eziyoruz, böylece sezon ve bölüm numaraları korunur.
        const customMeta = {...currentMeta, title: query};
        autoFetchSubtitles(customMeta);
        closeAllMenus();
    });

    // Kullanıcının Kendi Dosyasını Yüklemesi
    const uploadSubBtn = document.getElementById('uploadSubBtn');
    const subFileInput = document.getElementById('subFileInput');
    uploadSubBtn.addEventListener('click', (e) => { e.stopPropagation(); subFileInput.click(); });
    subFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            let content = evt.target.result;
            if (file.name.endsWith('.srt')) {
                content = content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
                content = "WEBVTT\n\n" + content;
            }
            currentSubtitleMode = 'auto';
            applySubtitle(content, 'Özel Altyazı');
            document.getElementById('fansubList').querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
            uploadSubBtn.classList.add('active');
            closeAllMenus();
            showFeedback(`<i class="ph-bold ph-upload-simple"></i> Altyazı Yüklendi (${parsedDialogues.length} Diyalog)`, window.innerWidth / 2);
        };
        reader.readAsText(file);
    });

    // =========================================================================
    // 🎙️ 4. OTONOM SES ANALİZİ VE VAD (WEB AUDIO API)
    // =========================================================================
    let audioCtx = null;
    let audioSourceNode = null;
    let speakerGainNode = null;
    let vocalFilter = null;
    let audioAnalyser = null;
    let isAudioEngineInitialized = false;

    function initAudioEngine() {
        if (isAudioEngineInitialized && audioCtx && audioCtx.state === 'running') return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            if (!audioCtx) {
                audioCtx = new AudioContextClass();
                audioSourceNode = audioCtx.createMediaElementSource(video);

                // İnsan sesi için bandpass filtreleme (300Hz - 3400Hz)
                vocalFilter = audioCtx.createBiquadFilter();
                vocalFilter.type = 'bandpass';
                vocalFilter.frequency.value = 1000;
                vocalFilter.Q.value = 1.0;

                // Spektrum Analizörü
                audioAnalyser = audioCtx.createAnalyser();
                audioAnalyser.fftSize = 512;
                audioAnalyser.smoothingTimeConstant = 0.2;

                // Hoparlör ses şiddeti kontrolü (Tarama sırasında cızırtıyı engellemek için)
                speakerGainNode = audioCtx.createGain();
                speakerGainNode.gain.value = 1;

                // Bağlantılar: Hoparlör (Gain üzerinden) + Ses Analiz Hattı
                audioSourceNode.connect(speakerGainNode);
                speakerGainNode.connect(audioCtx.destination);

                audioSourceNode.connect(vocalFilter);
                vocalFilter.connect(audioAnalyser);

                isAudioEngineInitialized = true;
            }

            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        } catch (e) {
            console.warn("Web Audio Motoru:", e);
        }
    }

    ['click', 'keydown', 'play', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, () => { initAudioEngine(); }, { once: true });
    });

    function getInstantAudioEnergy() {
        if (!audioAnalyser) return 0;
        const buffer = new Uint8Array(audioAnalyser.frequencyBinCount);
        audioAnalyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        return sum / buffer.length;
    }

    const vadIndicator = document.getElementById('vadIndicator');
    function monitorVAD() {
        if (isDialogSkipMode && audioAnalyser && !video.paused) {
            const energy = getInstantAudioEnergy();
            if (vadIndicator) {
                vadIndicator.style.display = 'block';
                if (energy > 20) {
                    vadIndicator.style.background = '#00e676';
                    vadIndicator.style.boxShadow = '0 0 8px #00e676';
                } else {
                    vadIndicator.style.background = '#666';
                    vadIndicator.style.boxShadow = 'none';
                }
            }
        } else if (vadIndicator) {
            vadIndicator.style.display = isDialogSkipMode ? 'block' : 'none';
            vadIndicator.style.background = '#e91e63';
        }
        requestAnimationFrame(monitorVAD);
    }
    requestAnimationFrame(monitorVAD);

    // =========================================================================
    // 🎧 AKILLI SES SENKRONU (Fast-Forward Audio-Subtitle Sync)
    // =========================================================================
    const smartAudioSyncBtn = document.getElementById('smartAudioSyncBtn');

    smartAudioSyncBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (isScanningAudio) {
            showFeedback('<i class="ph-bold ph-waveform"></i> Sistem meşgul', window.innerWidth / 2);
            return;
        }

        if (!parsedDialogues || parsedDialogues.length === 0) {
            showFeedback('<i class="ph-bold ph-warning"></i> Önce Altyazı Yükleyin', window.innerWidth / 2);
            return;
        }

        fastForwardSync();
    });

    async function fastForwardSync() {
        if (!parsedDialogues || parsedDialogues.length === 0 || isScanningAudio || isSeekingLock) return;
        
        initAudioEngine();
        
        isScanningAudio = true;
        isSeekingLock = true;
        
        const originalTime = video.currentTime;
        const wasPlaying = !video.paused;

        showFeedback('<i class="ph-bold ph-magic-wand"></i> İlk Diyalog Aranıyor...', window.innerWidth / 2);
        
        if (speakerGainNode) speakerGainNode.gain.value = 0;
        video.playbackRate = 4;
        
        try {
            await video.play().catch(() => {});
            
            // MANUEL MOD: Kullanıcının olduğu zamandan ileriye doğru ilk konuşmayı arar.
            let probe = originalTime;
            let maxIter = 100; // max 150 saniye tarar
            
            let foundSpeechTime = null;
            let iterations = 0;

            while (iterations < maxIter) {
                iterations++;
                probe += 1.5;
                if (probe >= video.duration || probe >= originalTime + 180) break;
                
                video.currentTime = probe;
                await new Promise(r => video.addEventListener('seeked', r, { once: true }));
                await new Promise(r => setTimeout(r, 40));

                const energy = getInstantAudioEnergy();
                if (energy > 18) {
                    // POTANSİYEL SES BULUNDU. PEKİ BU GERÇEKTEN BİR İNSAN DİYALOĞU MU? (Müzik/Gürültü Koruması)
                    let isDialogue = false;
                    let energies = [];
                    
                    // Sesi yarım saniye boyunca detaylı analiz et (Hece boşluklarını ara)
                    for (let j = 0; j < 25; j++) {
                        energies.push(getInstantAudioEnergy());
                        await new Promise(r => setTimeout(r, 20));
                    }
                    
                    let avg = energies.reduce((a, b) => a + b, 0) / energies.length;
                    let drops = 0;
                    
                    // İnsan konuşmasında nefes ve sessiz harf boşlukları olur (mikro enerji düşüşleri)
                    // Müzik ve stüdyo jeneriklerinde ise enerji genelde sürekli yüksek seyreder.
                    for (let k = 1; k < energies.length; k++) {
                        if (energies[k - 1] > avg && energies[k] < avg * 0.7) {
                            drops++;
                        }
                    }
                    
                    if (drops >= 1) {
                        isDialogue = true; // Heceleme tespit edildi -> İnsan Sesi
                    } else {
                        console.log(`[SmartSync] ${probe.toFixed(1)}s'deki ses sürekli/müzik olarak reddedildi.`);
                    }

                    if (isDialogue) {
                        foundSpeechTime = probe;
                        break;
                    }
                }
            }

            if (foundSpeechTime !== null) {
                const firstSubTime = parsedDialogues[0].startTime;
                const offset = foundSpeechTime - firstSubTime;
                if (Math.abs(offset) > 0.5) {
                    const delta = offset - subtitleSyncOffset;
                    adjustSubtitleSync(delta);
                    showFeedback(`<i class="ph-bold ph-check-circle"></i> Sese Kilitlendi! (${offset > 0 ? '+' : ''}${offset.toFixed(1)}s)`, window.innerWidth / 2);
                } else {
                    showFeedback(`<i class="ph-bold ph-check"></i> Zaten Sese Uygun`, window.innerWidth / 2);
                }
            } else {
                showFeedback(`<i class="ph-bold ph-warning"></i> Diyalog Bulunamadı`, window.innerWidth / 2);
            }

        } catch (err) {
            console.error("FastForward Sync Hatası:", err);
        } finally {
            video.playbackRate = 1;
            if (speakerGainNode) speakerGainNode.gain.value = 1;
            
            video.currentTime = originalTime;
            
            if (wasPlaying) await video.play().catch(() => {});
            else video.pause();
            
            setTimeout(() => {
                isScanningAudio = false;
                isSeekingLock = false;
            }, 100);
        }
    }

    let isDialogSkipMode = false;
    const dialogSkipToggle = document.getElementById('dialogSkipToggle');
    dialogSkipToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        isDialogSkipMode = !isDialogSkipMode;
        initAudioEngine();
        if (isDialogSkipMode) {
            dialogSkipToggle.style.color = '#e91e63';
            dialogSkipToggle.title = 'Akıllı Diyalog & Ses Atlama (Açık)';
            showFeedback('<i class="ph-bold ph-quotes"></i> Diyalog Atlama Açık', window.innerWidth / 2);
        } else {
            dialogSkipToggle.style.color = '';
            dialogSkipToggle.title = 'Akıllı Diyalog & Ses Atlama (Kapalı)';
            showFeedback('<i class="ph-bold ph-quotes"></i> Diyalog Atlama Kapalı', window.innerWidth / 2);
        }
        resetIdleTimer();
    });

    // =========================================================================
    // 🛡️ 5. TEK SEFERLİK AKICI ATLAMA MOTORU (ÇİFT ÇALMA / KASMA YOK)
    // =========================================================================
    let isSeekingLock = false;

    function safeSeekTo(targetTime) {
        if (isSeekingLock) return;
        isSeekingLock = true;

        video.currentTime = targetTime;

        const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            setTimeout(() => { isSeekingLock = false; }, 50);
        };
        video.addEventListener('seeked', onSeeked);
        setTimeout(() => { isSeekingLock = false; }, 350);
    }

    function jumpTime(seconds) {
        if (isSeekingLock) return;
        const target = seconds > 0 
            ? Math.min(video.duration, video.currentTime + seconds)
            : Math.max(0, video.currentTime + seconds);
        safeSeekTo(target);
        if (seconds > 0) {
            showFeedback(`${seconds}s <i class="ph-bold ph-arrow-clockwise"></i>`, window.innerWidth / 2 + 50);
        } else {
            showFeedback(`<i class="ph-bold ph-arrow-counter-clockwise"></i> ${Math.abs(seconds)}s`, window.innerWidth / 2 - 50);
        }
        resetIdleTimer();
    }

    // Gerçek Zamanlı Ses Arayıcı (Altyazısız / Gömülü Videolarda Konuşmayı Canlı Taran)
    let isScanningAudio = false;

    async function scanAndSkipAudio(direction) {
        if (isSeekingLock || isScanningAudio) return;
        initAudioEngine();

        isScanningAudio = true;
        isSeekingLock = true;

        const wasPlaying = !video.paused;
        const initialTime = video.currentTime;
        const step = direction === 'forward' ? 1.5 : -1.5;
        const maxScanSeconds = 25;

        // Tarama bildirimini sadece ses yoksa sonradan gösterelim veya cızırtı/hızlı sarma sesi duyulmasın diye sessize alalım
        if (speakerGainNode) speakerGainNode.gain.value = 0;
        video.playbackRate = 4;
        
        try {
            await video.play().catch(() => {});

            let probe = initialTime;
            let foundSpeechTime = null;
            let iterations = 0;
            const maxIter = Math.floor(maxScanSeconds / Math.abs(step));

            while (iterations < maxIter) {
                iterations++;
                probe += step;
                if (probe <= 0) {
                    foundSpeechTime = 0;
                    break;
                }
                if (probe >= video.duration) {
                    foundSpeechTime = video.duration;
                    break;
                }

                video.currentTime = probe;
                await new Promise(r => video.addEventListener('seeked', r, { once: true }));
                await new Promise(r => setTimeout(r, 40));

                const energy = getInstantAudioEnergy();
                if (energy > 18) { // Threshold increased from 16 to 18 to reduce false positives in musical scenes
                    // DİYALOG DOĞRULAMASI (Müzik atlama)
                    let isDialogue = false;
                    let energies = [];
                    for (let j = 0; j < 25; j++) {
                        energies.push(getInstantAudioEnergy());
                        await new Promise(r => setTimeout(r, 20));
                    }
                    let avg = energies.reduce((a, b) => a + b, 0) / energies.length;
                    let drops = 0;
                    for (let k = 1; k < energies.length; k++) {
                        if (energies[k - 1] > avg && energies[k] < avg * 0.7) drops++;
                    }
                    
                    if (drops >= 1) {
                        foundSpeechTime = probe;
                        break;
                    }
                }
            }

            video.playbackRate = 1;
            if (speakerGainNode) speakerGainNode.gain.value = 1;

            if (foundSpeechTime !== null) {
                video.currentTime = foundSpeechTime;
                if (wasPlaying) await video.play().catch(() => {});
                else video.pause();

                const diff = Math.round(foundSpeechTime - initialTime);
                const diffStr = diff > 0 ? `+${diff}s` : `${diff}s`;
                showFeedback(`<i class="ph-bold ph-speaker-high"></i> Konuşma Bulundu (${diffStr})`, window.innerWidth / 2);
            } else {
                const fallback = direction === 'forward' 
                    ? Math.min(video.duration, initialTime + 10)
                    : Math.max(0, initialTime - 10);
                video.currentTime = fallback;
                if (wasPlaying) await video.play().catch(() => {});
                else video.pause();
                showFeedback(`<i class="ph-bold ph-waveform"></i> Konuşma Yok (10s Geçildi)`, window.innerWidth / 2);
            }
        } catch (err) {
            console.error("Ses tarama hatası:", err);
            video.playbackRate = 1;
            if (speakerGainNode) speakerGainNode.gain.value = 1;
            if (wasPlaying) video.play().catch(() => {});
            else video.pause();
        } finally {
            setTimeout(() => {
                isScanningAudio = false;
                isSeekingLock = false;
            }, 100);
            resetIdleTimer();
        }
    }

    function skipDialog(direction) {
        if (isSeekingLock) return;
        initAudioEngine();

        let cues = parsedDialogues;
        if (!cues || cues.length === 0) {
            if (video.textTracks && video.textTracks.length > 0 && video.textTracks[0].cues) {
                cues = Array.from(video.textTracks[0].cues).map(c => ({ startTime: c.startTime, endTime: c.endTime, text: c.text }));
            }
        }

        // 1. Durum: Altyazı Cueları Varsa (Hassas ve Hızlı Diyalog Zıplaması)
        if (cues && cues.length > 0) {
            const currentTime = video.currentTime;
            if (direction === 'forward') {
                for (let i = 0; i < cues.length; i++) {
                    if (cues[i].startTime > currentTime + 0.25) {
                        safeSeekTo(cues[i].startTime);
                        if (currentSubtitleMode === 'auto') {
                            const preview = cues[i].text.length > 25 ? cues[i].text.substring(0, 25) + '...' : cues[i].text;
                            showFeedback(`<i class="ph-bold ph-lightning"></i> "${preview}"`, window.innerWidth / 2);
                        } else {
                            const diff = Math.round(cues[i].startTime - currentTime);
                            showFeedback(`<i class="ph-bold ph-lightning"></i> Konuşma Bulundu (+${diff}s)`, window.innerWidth / 2);
                        }
                        resetIdleTimer();
                        return;
                    }
                }
                showFeedback('<i class="ph-bold ph-skip-forward"></i> Son Diyalog', window.innerWidth / 2);
                return;
            } else {
                for (let i = cues.length - 1; i >= 0; i--) {
                    if (cues[i].startTime < currentTime - 1.2) {
                        safeSeekTo(cues[i].startTime);
                        if (currentSubtitleMode === 'auto') {
                            const preview = cues[i].text.length > 25 ? cues[i].text.substring(0, 25) + '...' : cues[i].text;
                            showFeedback(`<i class="ph-bold ph-lightning"></i> "${preview}"`, window.innerWidth / 2);
                        } else {
                            const diff = Math.round(currentTime - cues[i].startTime);
                            showFeedback(`<i class="ph-bold ph-lightning"></i> Konuşma Bulundu (-${diff}s)`, window.innerWidth / 2);
                        }
                        resetIdleTimer();
                        return;
                    }
                }
                safeSeekTo(0);
                showFeedback('<i class="ph-bold ph-skip-back"></i> Başa Dönüldü', window.innerWidth / 2);
                return;
            }
        }

        // 2. Durum: Altyazı Hiç Yoksa (Fallback) Canlı Ses Taraması (VAD)
        scanAndSkipAudio(direction);
    }

    function handleSkipAction(direction) {
        if (isDialogSkipMode) {
            skipDialog(direction);
        } else {
            jumpTime(direction === 'forward' ? 10 : -10);
        }
    }

    rewindBtn.addEventListener('click', (e) => { e.stopPropagation(); handleSkipAction('backward'); });
    forwardBtn.addEventListener('click', (e) => { e.stopPropagation(); handleSkipAction('forward'); });

    // =========================================================================
    // 🎛️ 6. STANDART OYNATICI KONTROLLERİ VE ARAYÜZ
    // =========================================================================
    function togglePlay() {
        if (video.paused) {
            video.play().catch(err => {
                console.error("Video oynatma hatası:", err);
                alert("Oynatma Hatası: " + err.message);
            });
        } else {
            video.pause();
        }
    }
    
    playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); resetIdleTimer(); });
    bigPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); resetIdleTimer(); });
    
    video.addEventListener('click', (e) => {
        if(!settingsMenu.classList.contains('show') && !fansubMenu.classList.contains('show')) {
            togglePlay();
        }
        resetIdleTimer();
    }); 

    video.addEventListener('play', () => {
        playPauseBtn.innerHTML = '<i class="ph-fill ph-pause"></i>';
        bigPlayBtn.style.display = 'none'; 
        resetIdleTimer();
    });
    
    video.addEventListener('pause', () => {
        playPauseBtn.innerHTML = '<i class="ph-fill ph-play"></i>';
        bigPlayBtn.style.display = 'flex'; 
        videoWrapper.classList.remove('idle');
        clearTimeout(idleTimer);
    });

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // İlerleme Çubuğu Sürükleme
    let isDraggingProgress = false;
    let wasPlayingBeforeDrag = false;
    let lastSeekTime = 0;
    let finalDragPos = 0;

    function updateProgressFromEvent(e) {
        const rect = progressContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let pos = (clientX - rect.left) / rect.width;
        pos = Math.max(0, Math.min(1, pos)); 
        progressBar.style.width = (pos * 100) + '%';
        timeDisplay.textContent = `${formatTime(pos * video.duration)} / ${formatTime(video.duration)}`;
        finalDragPos = pos;
        return pos;
    }

    function startDrag(e) {
        e.stopPropagation();
        isDraggingProgress = true;
        wasPlayingBeforeDrag = !video.paused;
        video.pause(); 
        const pos = updateProgressFromEvent(e);
        video.currentTime = pos * video.duration;
    }
    progressContainer.addEventListener('mousedown', startDrag);
    progressContainer.addEventListener('touchstart', startDrag, {passive: false});

    function handleDragMove(e) {
        if (isDraggingProgress) {
            e.preventDefault(); 
            const pos = updateProgressFromEvent(e);
            const now = Date.now();
            if (now - lastSeekTime > 250) {
                video.currentTime = pos * video.duration;
                lastSeekTime = now;
            }
        }
    }
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, {passive: false});

    function stopDrag() {
        if (isDraggingProgress) {
            isDraggingProgress = false;
            video.currentTime = finalDragPos * video.duration;
            if (wasPlayingBeforeDrag) video.play(); 
            resetIdleTimer();
        }
    }
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    video.addEventListener('timeupdate', () => {
        if (!isDraggingProgress) {
            const percent = (video.currentTime / video.duration) * 100;
            progressBar.style.width = percent + '%';
            timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
    });

    // Ses Kontrolleri
    function updateMuteIcon() {
        let currentVol = video.muted ? 0 : video.volume;
        if(currentVol === 0) {
            muteBtn.innerHTML = '<i class="ph-fill ph-speaker-slash"></i>';
            muteBtn.style.color = '#888';
        } else if (currentVol < 0.5) {
            muteBtn.innerHTML = '<i class="ph-fill ph-speaker-low"></i>'; 
            muteBtn.style.color = '#fff';
        } else {
            muteBtn.innerHTML = '<i class="ph-fill ph-speaker-high"></i>';
            muteBtn.style.color = '#fff';
        }
        const percentage = currentVol * 100;
        volumeSlider.style.background = `linear-gradient(to right, #e91e63 ${percentage}%, rgba(255, 255, 255, 0.3) ${percentage}%)`;
        volumeText.textContent = Math.round(percentage);
    }

    volumeSlider.addEventListener('input', (e) => {
        video.volume = e.target.value;
        video.muted = video.volume === 0;
        updateMuteIcon();
        resetIdleTimer();
    });

    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.muted || video.volume === 0) {
            video.muted = false;
            if(video.volume === 0) video.volume = 1;
            volumeSlider.value = video.volume;
        } else {
            video.muted = true;
            volumeSlider.value = 0;
        }
        updateMuteIcon();
    });

    volumeContainer.addEventListener('wheel', (e) => {
        e.preventDefault(); 
        let currentVol = video.muted ? 0 : video.volume;
        if (e.deltaY < 0) currentVol = Math.min(1, currentVol + 0.05);
        else currentVol = Math.max(0, currentVol - 0.05);
        video.volume = currentVol;
        video.muted = currentVol === 0;
        volumeSlider.value = currentVol;
        updateMuteIcon();
    });
    updateMuteIcon();

    // Menüler
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const fansubBtn = document.getElementById('fansubBtn');
    const fansubMenu = document.getElementById('fansubMenu');

    function closeAllMenus() {
        settingsMenu.classList.remove('show');
        fansubMenu.classList.remove('show');
    }
    
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const isShowing = settingsMenu.classList.contains('show');
        closeAllMenus();
        if (!isShowing) settingsMenu.classList.add('show');
        resetIdleTimer();
    });

    fansubBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const isShowing = fansubMenu.classList.contains('show');
        closeAllMenus();
        if (!isShowing) fansubMenu.classList.add('show');
        resetIdleTimer();
    });
    
    document.addEventListener('click', closeAllMenus);
    settingsMenu.addEventListener('click', (e) => e.stopPropagation());
    fansubMenu.addEventListener('click', (e) => e.stopPropagation());

    // Sekmeler (Kalite & Hız)
    const tabQuality = document.getElementById('tabQuality');
    const tabSpeed = document.getElementById('tabSpeed');
    const qualityTabContent = document.getElementById('qualityTabContent');
    const speedTabContent = document.getElementById('speedTabContent');

    tabQuality.addEventListener('click', (e) => {
        e.stopPropagation();
        tabQuality.style.color = '#e91e63';
        tabQuality.style.borderBottom = '2px solid #e91e63';
        tabSpeed.style.color = '#aaa';
        tabSpeed.style.borderBottom = '2px solid transparent';
        qualityTabContent.style.display = 'block';
        speedTabContent.style.display = 'none';
    });

    tabSpeed.addEventListener('click', (e) => {
        e.stopPropagation();
        tabSpeed.style.color = '#e91e63';
        tabSpeed.style.borderBottom = '2px solid #e91e63';
        tabQuality.style.color = '#aaa';
        tabQuality.style.borderBottom = '2px solid transparent';
        speedTabContent.style.display = 'block';
        qualityTabContent.style.display = 'none';
    });

    function changeSpeed(speed, clickedBtn) {
        video.playbackRate = speed;
        document.getElementById('speedTabContent').querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        clickedBtn.classList.add('active');
        closeAllMenus();
    }

    // Auto-Hide Kontrolleri
    let isHoveringControls = false;
    controlsContainer.addEventListener('mouseenter', () => { isHoveringControls = true; resetIdleTimer(); });
    controlsContainer.addEventListener('mouseleave', () => { isHoveringControls = false; resetIdleTimer(); });

    let idleTimer;
    function resetIdleTimer() {
        videoWrapper.classList.remove('idle');
        clearTimeout(idleTimer);
        if (!video.paused) {
            idleTimer = setTimeout(() => {
                if(!settingsMenu.classList.contains('show') && !fansubMenu.classList.contains('show') && !isHoveringControls) {
                    videoWrapper.classList.add('idle');
                }
            }, 3000);
        }
    }

    videoWrapper.addEventListener('mousemove', resetIdleTimer);
    videoWrapper.addEventListener('touchstart', resetIdleTimer);
    videoWrapper.addEventListener('click', resetIdleTimer);

    // Çift Tıklama / Dokunma
    video.addEventListener('dblclick', (e) => {
        const clickX = e.clientX;
        const screenWidth = window.innerWidth;
        if (clickX < screenWidth / 3) {
            handleSkipAction('backward');
        } else if (clickX > (screenWidth * 2) / 3) {
            handleSkipAction('forward');
        } else {
            fullScreenBtn.click();
        }
    });

    // Mobil Çift Dokunma (dblclick mobilde güvenilmez)
    let lastTapTime = 0;
    video.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTapTime < 300) {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const screenWidth = window.innerWidth;
            if (touch.clientX < screenWidth / 3) {
                handleSkipAction('backward');
            } else if (touch.clientX > (screenWidth * 2) / 3) {
                handleSkipAction('forward');
            } else {
                fullScreenBtn.click();
            }
            lastTapTime = 0;
        } else {
            lastTapTime = now;
        }
    });

    // Splash Ekranı Dosya Seç Butonu
    const splashOpenBtn = document.getElementById('splashOpenBtn');
    if (splashOpenBtn) {
        splashOpenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            localVideoInput.click();
        });
    }
    const nextEpBtn = document.getElementById('nextEpBtn');
    nextEpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentMeta && currentMeta.episode) {
            const currentEp = currentMeta.episode;
            const nextEp = currentEp + 1;
            
            let newSrc = videoSrc;
            
            // Zyapbot/OpenAni URL deseni için basit değiştirme (/1/1-... -> /1/2-...)
            const aniMatch = newSrc.match(/\/(\d+)\/(\d+)-/);
            if (aniMatch) {
                newSrc = newSrc.replace(`/${aniMatch[1]}/${aniMatch[2]}-`, `/${aniMatch[1]}/${nextEp}-`);
            } else {
                // Klasik isim değiştirme
                newSrc = newSrc.replace(new RegExp(`([eE_\\.-])(0*)${currentEp}\\b`), `$1$2${nextEp}`);
            }
            
            // URL'deki query parametrelerini güncelle (s=1&e=1 -> s=1&e=2 vb.)
            const url = new URL(window.location.href);
            if (url.searchParams.has('e')) url.searchParams.set('e', nextEp);
            if (url.searchParams.has('episode')) url.searchParams.set('episode', nextEp);
            if (url.searchParams.has('b')) url.searchParams.set('b', nextEp);
            if (url.searchParams.has('bolum')) url.searchParams.set('bolum', nextEp);
            if (url.searchParams.has('src') || url.searchParams.has('video')) {
                url.searchParams.set(url.searchParams.has('video') ? 'video' : 'src', newSrc);
            }
            
            showFeedback('<i class="ph-bold ph-skip-forward"></i> Sonraki Bölüm...', window.innerWidth / 2);
            setTimeout(() => {
                window.location.href = url.href;
            }, 500);
        } else {
            showFeedback('<i class="ph-bold ph-warning"></i> Sonraki Bölüm Bulunamadı', window.innerWidth / 2);
        }
    });

    function showFeedback(htmlContent, x) {
        const fb = document.createElement('div');
        fb.className = 'tap-feedback';
        fb.innerHTML = htmlContent;
        fb.style.left = x + 'px';
        videoWrapper.appendChild(fb);
        setTimeout(() => { fb.style.opacity = '0'; }, 500);
        setTimeout(() => { fb.remove(); }, 1000);
    }

    // Tam Ekran & PiP
    const pipBtn = document.getElementById('pipBtn');
    pipBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('toggle-pip');
        } catch (err) {
            // Electron yoksa (mobil/web) standart PiP API kullan
            try {
                if (document.pictureInPictureElement) await document.exitPictureInPicture();
                else await video.requestPictureInPicture();
            } catch (e2) { console.error("PiP Hatası:", e2); }
        }
    });

    fullScreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            videoWrapper.requestFullscreen().catch(err => console.log(err.message));
        } else {
            document.exitFullscreen();
        }
    });

    document.addEventListener('fullscreenchange', () => {
        fullScreenBtn.innerHTML = document.fullscreenElement 
            ? '<i class="ph-bold ph-corners-in"></i>' 
            : '<i class="ph-bold ph-corners-out"></i>';
    });

    // İndir & Sorun Bildir
    document.getElementById('downloadBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = videoSrc; 
        a.target = "_blank"; 
        a.download = "video.mp4"; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showFeedback('<i class="ph-bold ph-download-simple"></i> İndirme Başlatıldı', window.innerWidth / 2);
    });

    const reportModal = document.getElementById('reportModal');
    document.getElementById('reportBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        resetIdleTimer();
        reportModal.style.display = 'block';
    });

    document.getElementById('sendReportBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        const reason = document.getElementById('reportReason').value;
        alert(`Teşekkürler! "${reason}" bildiriminiz alındı.`);
        reportModal.style.display = 'none';
        showFeedback('<i class="ph-bold ph-check-circle"></i> Bildirim İletildi', window.innerWidth / 2);
    });
    reportModal.addEventListener('click', (e) => e.stopPropagation());

    // Klavye Kısayolları
    let isSpaceHolding = false;
    let spaceHoldTimer = null;
    let originalPlaybackRate = 1.0;

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        switch (e.code) {
            case 'ArrowRight':
                e.preventDefault(); 
                handleSkipAction('forward');
                break;
            case 'ArrowLeft':
                e.preventDefault(); 
                handleSkipAction('backward');
                break;
            case 'ArrowUp':
                e.preventDefault(); 
                let volUp = video.muted ? 0 : video.volume;
                volUp = Math.min(1, volUp + 0.05);
                video.volume = volUp;
                video.muted = volUp === 0;
                volumeSlider.value = volUp;
                updateMuteIcon();
                showFeedback(`<i class="ph-fill ph-speaker-high"></i> %${Math.round(volUp*100)}`, window.innerWidth / 2);
                resetIdleTimer();
                break;
            case 'ArrowDown':
                e.preventDefault(); 
                let volDown = video.muted ? 0 : video.volume;
                volDown = Math.max(0, volDown - 0.05);
                video.volume = volDown;
                video.muted = volDown === 0;
                volumeSlider.value = volDown;
                updateMuteIcon();
                showFeedback(`<i class="ph-fill ph-speaker-low"></i> %${Math.round(volDown*100)}`, window.innerWidth / 2);
                resetIdleTimer();
                break;
            case 'Space':
                e.preventDefault(); 
                if (!e.repeat && !isSpaceHolding) {
                    if (!video.paused) {
                        // Video oynuyorsa basılı tutmayı algılamak için bekle
                        spaceHoldTimer = setTimeout(() => {
                            isSpaceHolding = true;
                            originalPlaybackRate = video.playbackRate;
                            video.playbackRate = 2.0;
                            showFeedback('<i class="ph-bold ph-fast-forward"></i> 2x İleri Sarılıyor...', window.innerWidth / 2);
                        }, 300);
                    }
                }
                break;
            case 'KeyG':
                e.preventDefault();
                adjustSubtitleSync(-0.5); // Altyazıyı 0.5s erkene al
                resetIdleTimer();
                break;
            case 'KeyH':
                e.preventDefault();
                adjustSubtitleSync(0.5); // Altyazıyı 0.5s ileri (gecikmeli) al
                resetIdleTimer();
                break;
            case 'KeyF':
                e.preventDefault(); 
                fullScreenBtn.click();
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.code === 'Space') {
            e.preventDefault();
            clearTimeout(spaceHoldTimer);
            if (isSpaceHolding) {
                // Basılı tutma bırakıldı, normal hıza dön
                video.playbackRate = originalPlaybackRate;
                isSpaceHolding = false;
                showFeedback('<i class="ph-bold ph-play"></i> Normal Hız', window.innerWidth / 2);
            } else {
                // Hızlı basıp çekilmiş (togglePlay)
                togglePlay();
                resetIdleTimer();
            }
        }
    });

    // =========================================================================
    // 📂 9. KULLANICI VİDEO YÜKLEME (DRAG & DROP VE BUTON)
    // =========================================================================
    const localVideoInput = document.getElementById('localVideoInput');
    const openLocalVideoBtn = document.getElementById('openLocalVideoBtn');

    if (openLocalVideoBtn && localVideoInput) {
        openLocalVideoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            localVideoInput.click();
        });

        localVideoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            loadUserVideo(file);
        });
    }

    // Drag & Drop
    videoWrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        videoWrapper.style.boxShadow = 'inset 0 0 50px rgba(233, 30, 99, 0.5)';
    });
    videoWrapper.addEventListener('dragleave', (e) => {
        e.preventDefault();
        videoWrapper.style.boxShadow = 'none';
    });
    videoWrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        videoWrapper.style.boxShadow = 'none';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            loadUserVideo(file);
        } else if (file && (file.name.endsWith('.srt') || file.name.endsWith('.vtt'))) {
            // Eğer altyazı sürüklenmişse altyazı yükleyiciyi tetikle
            const dt = new DataTransfer();
            dt.items.add(file);
            document.getElementById('subFileInput').files = dt.files;
            document.getElementById('subFileInput').dispatchEvent(new Event('change'));
        }
    });

    function loadUserVideo(file) {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('bigPlayBtn').style.display = 'none';
        
        const fileUrl = URL.createObjectURL(file);
        videoSrc = fileUrl;
        
        // Metadata'yı yeni dosya adına göre güncelle
        currentMeta = detectVideoMetadata(file.name);
        document.getElementById('videoTitle').textContent = currentMeta.displayTitle;
        
        // Videoyu yükle
        video.removeAttribute('crossorigin');
        video.src = fileUrl;
        video.play().catch(e => console.log('Oynatma hatası:', e));
        
        // Altyazıları sıfırla
        parsedDialogues = [];
        if (video.textTracks && video.textTracks.length > 0) {
            for (let i = 0; i < video.textTracks.length; i++) {
                video.textTracks[i].mode = 'hidden';
            }
        }
        
        const customTrack = document.getElementById('subtitleTrack');
        if (customTrack) {
            customTrack.src = '';
            if(customTrack.track) customTrack.track.mode = 'hidden';
        }

        showFeedback(`<i class="ph-bold ph-folder-open"></i> Yüklendi: ${currentMeta.displayTitle}`, window.innerWidth / 2);
        
        // Yeni video için otonom altyazı çekmeyi başlat
        // Sadece auto moddaysa değil, genel olarak çeksin (hardsub atlama için de lazım)
        setTimeout(() => autoFetchSubtitles(), 1000); 
    }

    try {
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('open-external-file', (event, filePath) => {
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('bigPlayBtn').style.display = 'none';
            
            const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
            videoSrc = fileUrl;
            
            const fileName = filePath.split('\\').pop().split('/').pop();
            currentMeta = detectVideoMetadata(fileName);
            document.getElementById('videoTitle').textContent = currentMeta.displayTitle;
            
            video.removeAttribute('crossorigin');
            video.src = fileUrl;
            video.play().catch(e => console.log('Oynatma hatası:', e));
            
            parsedDialogues = [];
            if (video.textTracks && video.textTracks.length > 0) {
                for (let i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = 'hidden';
            }
            const customTrack = document.getElementById('subtitleTrack');
            if (customTrack) {
                customTrack.src = '';
                if(customTrack.track) customTrack.track.mode = 'hidden';
            }
        });
    } catch(e) {}

    resetIdleTimer();

