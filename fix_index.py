import sys

with open('akilli-oynatici/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    // Video Yükleme (MP4 / HLS)
    if (videoSrc) {
        if (videoSrc.includes('.m3u8')) {
            let hls;
            if (Hls.isSupported()) {'''

replacement = '''    // Video Yükleme (MP4 / HLS)
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
            if (Hls.isSupported()) {'''

if target in content:
    content = content.replace(target, replacement)
    with open('akilli-oynatici/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed index.html m3u8 logic")
else:
    print("Could not find target in index.html")
