import sys
import re

with open('video-aggregator-extension/player.js', 'r', encoding='utf-8') as f:
    content = f.read()

original_snippet = """    function switchQuality(newSrc, newLabel, btnElement) {
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
        let isHls = urlParams.get('streamType') === 'hls';
        try {
            if (new URL(videoSrc).pathname.toLowerCase().endsWith('.m3u8')) {
                isHls = true;
            }
        } catch (e) {
            if (videoSrc.toLowerCase().includes('.m3u8')) {
                isHls = true;
            }
        }

        if (isHls) {
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
    }"""

start_idx = content.find('    function switchQuality(newSrc, newLabel, btnElement) {')
end_idx = content.find('    // =========================================================================\n    // 📝 3. OTONOM ALTYAZI SİSTEMİ (PARSER & BACKEND ENTEGRASYONU)')

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + original_snippet + '\n\n' + content[end_idx:]
    with open('video-aggregator-extension/player.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Fixed player.js')
else:
    print('Could not find boundaries')
