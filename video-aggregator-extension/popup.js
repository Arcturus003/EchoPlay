document.getElementById('findVideoBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.style.display = 'none';

  // Aktif sekmeyi bul
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    statusDiv.textContent = "Aktif sekme bulunamadı.";
    statusDiv.style.display = 'block';
    return;
  }

  // Önce arka planda (background.js) yakalanmış saf video URL'si var mı diye storage'dan al
  const result = await chrome.storage.session.get('tabVideoUrls');
  const tabVideos = result.tabVideoUrls || {};
  const responseUrls = tabVideos[tab.id] || [];

  let bestUrl = null;
  let bestType = null;
  
  if (responseUrls.length > 0) {
    const urls = [...responseUrls].reverse(); // [{url, type}, {url, type}]
    
    // Öncelik 1: Açıkça master veya index playlist olan HLS
    for (let item of urls) {
      if (item.type === 'hls' && (item.url.includes('master') || item.url.includes('index'))) {
        bestUrl = item.url;
        bestType = item.type;
        break;
      }
    }
    
    // Öncelik 2: Herhangi bir HLS veya DASH
    if (!bestUrl) {
      for (let item of urls) {
        if (item.type === 'hls' || item.type === 'dash') {
          bestUrl = item.url;
          bestType = item.type;
          break;
        }
      }
    }
    
    // Öncelik 3: MP4
    if (!bestUrl) {
      for (let item of urls) {
        if (item.type === 'mp4') {
          bestUrl = item.url;
          bestType = item.type;
          break;
        }
      }
    }
    
    if (!bestUrl) {
      bestUrl = urls[0].url;
      bestType = urls[0].type;
    }
  }

  if (bestUrl) {
    // Arka planda saf videoyu başarıyla ağ (network) üzerinden yakaladık!
    const playerUrl = chrome.runtime.getURL(`player.html?src=${encodeURIComponent(bestUrl)}&streamType=${bestType}&tabTitle=${encodeURIComponent(tab.title)}`);
    chrome.tabs.create({ url: playerUrl });
  } else {
    // Eğer ağ üzerinden yakalanmış bir şey yoksa, HTML'in içine sızarak tarama yap (Eski Yöntem)
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['content.js']
      });

      if (results && results.length > 0) {
        let bestResult = null;
        
        for (const res of results) {
          if (res.result && res.result.type === 'video' && res.result.url !== 'NOT_FOUND') {
            bestResult = res.result;
            break; 
          }
        }
        
        if (!bestResult) {
          for (const res of results) {
            if (res.result && res.result.type === 'iframe' && res.result.url !== 'NOT_FOUND') {
              bestResult = res.result;
              break;
            }
          }
        }

        if (!bestResult || bestResult.type === 'error' || bestResult.url === 'NOT_FOUND') {
          statusDiv.textContent = "Sayfada desteklenen bir video bulunamadı. Lütfen videoyu 1-2 saniye oynatıp tekrar deneyin.";
          statusDiv.style.display = 'block';
        } else {
          const playerUrl = chrome.runtime.getURL(`player.html?src=${encodeURIComponent(bestResult.url)}&streamType=${bestResult.type}&tabTitle=${encodeURIComponent(tab.title)}`);
          chrome.tabs.create({ url: playerUrl });
        }
      } else {
        statusDiv.textContent = "Sayfadan yanıt alınamadı.";
        statusDiv.style.display = 'block';
      }
    } catch (error) {
      statusDiv.textContent = "Hata (Muhtemelen kısıtlı sayfa): " + error.message;
      statusDiv.style.display = 'block';
    }
  }
});
