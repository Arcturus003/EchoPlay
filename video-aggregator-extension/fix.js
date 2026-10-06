const fs = require('fs');
let js = fs.readFileSync('player.js', 'utf8');

const regex = /\/\/ Eklentiden video gelirse[\s\S]*?(?=\/\/ Diğer siteler)/;

const replacement = `// Eklentiden video gelirse başlangıç ekranını gizle
    if (videoSrc) {
        const splashScreen = document.getElementById('splashScreen');
        if (splashScreen) splashScreen.style.display = 'none';
        
        const bigPlayBtn = document.getElementById('bigPlayBtn');
        if (bigPlayBtn) bigPlayBtn.style.display = 'flex';
    }

    // Iframe embed kaynaklarını tespit et
    const isIframeEmbed = urlParams.get('type') === 'iframe' || (videoSrc && (videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be') || videoSrc.includes('dood') || videoSrc.includes('filemoon') || videoSrc.includes('vimeo')));
    
    if (isIframeEmbed) {
        // YouTube yönlendirmesi (B Planı)
        if (videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be')) {
            let watchUrl = videoSrc;
            if (videoSrc.includes('/embed/')) {
                watchUrl = videoSrc.split('?')[0].replace('/embed/', '/watch?v=');
            }
            
            document.body.innerHTML = \`
                <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; background:#0f0f13; color:white; font-family:sans-serif;">
                    <i class="ph-bold ph-youtube-logo" style="font-size: 60px; color: #ff0000; margin-bottom: 20px;"></i>
                    <h2>YouTube Yönlendirmesi</h2>
                    <p style="color:#aaa;">Bu video dış sitelerde gömülü oynatılmaya kapatılmış.</p>
                    <p>YouTube'da açılıyor...</p>
                </div>
            \`;
            
            setTimeout(() => {
                window.location.replace(watchUrl);
            }, 1500);
            throw new Error("Yönlendiriliyor...");
        }

        `;

js = js.replace(regex, replacement);
fs.writeFileSync('player.js', js, 'utf8');
console.log('Fixed');
