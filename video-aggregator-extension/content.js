// Bu fonksiyon sayfa bağlamında çalışır ve sonucu popup'a döner.
(function() {
  // 1. YouTube'da mıyız? Doğrudan YouTube sayfasındaysak embed linkine çevir.
  if (window.location.hostname.includes('youtube.com') && window.location.pathname === '/watch') {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    if (videoId) {
      return { type: 'iframe', url: 'https://www.youtube.com/embed/' + videoId };
    }
  }

  // 2. Doğrudan <video> etiketi var mı diye bak
  const videos = document.querySelectorAll('video');
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const src = video.currentSrc || video.src;
    if (src) {
      if (src.startsWith('blob:')) {
        return { type: 'iframe', url: window.location.href };
      }
      return { type: 'video', url: src }; 
    }
    const sources = video.querySelectorAll('source');
    for (let j = 0; j < sources.length; j++) {
      if (sources[j].src) {
        if (sources[j].src.startsWith('blob:')) {
          return { type: 'iframe', url: window.location.href };
        }
        return { type: 'video', url: sources[j].src };
      }
    }
  }

  // 3. İframeleri tara: Genellikle anime sitelerinde video oynatıcı en büyük iframe'dir.
  const iframes = Array.from(document.querySelectorAll('iframe'));
  let bestIframe = null;
  let maxArea = 0;

  for (let i = 0; i < iframes.length; i++) {
    const iframe = iframes[i];
    const src = iframe.src;
    
    // Geçersiz veya reklam/login iframelerini atla
    if (!src || src.includes('accounts.youtube.com') || src.includes('doubleclick.net') || src.startsWith('about:blank')) {
      continue;
    }

    // İframe alanını (genişlik * yükseklik) hesapla
    const rect = iframe.getBoundingClientRect();
    const area = rect.width * rect.height;

    // Eğer iframe makul bir boyuttaysa (en az 300x200) ve şu ana kadarki en büyükse kaydet
    if (rect.width >= 300 && rect.height >= 200 && area > maxArea) {
      maxArea = area;
      bestIframe = src;
    }
  }

  if (bestIframe) {
    return { type: 'iframe', url: bestIframe };
  }

  // 4. Hiçbir şey bulunamadı
  return { type: 'error', url: 'NOT_FOUND' };
})();
