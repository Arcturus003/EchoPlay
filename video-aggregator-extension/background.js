// Arka planda sekmelerde yüklenen video dosyalarını takip eder


const StorageManager = {
  queue: Promise.resolve(),
  
  addVideoUrl(tabId, url, type) {
    this.queue = this.queue.then(async () => {
      const result = await chrome.storage.session.get('tabVideoUrls');
      let tabVideos = result.tabVideoUrls || {};
      if (!tabVideos[tabId]) tabVideos[tabId] = [];
      const exists = tabVideos[tabId].find(v => v.url === url);
      if (!exists) {
        tabVideos[tabId].push({ url, type });
        await chrome.storage.session.set({ tabVideoUrls: tabVideos });
      }
    }).catch(console.error);
  },

  clearTab(tabId) {
    this.queue = this.queue.then(async () => {
      const result = await chrome.storage.session.get('tabVideoUrls');
      let tabVideos = result.tabVideoUrls || {};
      if (tabVideos[tabId]) {
        delete tabVideos[tabId];
        await chrome.storage.session.set({ tabVideoUrls: tabVideos });
      }
    }).catch(console.error);
  }
};

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    try {
      const tabId = details.tabId;

      const urlObj = new URL(details.url);
      const targetStr = (urlObj.pathname + urlObj.search).toLowerCase();

      let videoType = null;
      
      // 1. Önce URL'den basit kontrol yap (.m3u8, .mp4, .mpd)
      if (/\.m3u8(?:[?&#]|$)/.test(targetStr)) {
        videoType = 'hls';
      } else if (/\.mpd(?:[?&#]|$)/.test(targetStr)) {
        videoType = 'dash';
      } else if (/\.mp4(?:[?&#]|$)/.test(targetStr)) {
        videoType = 'mp4';
      }

      const hasImageExt = /\.(gif|jpg|jpeg|png)(?:[?&#]|$)/.test(targetStr);

      // 2. Eğer URL gizlenmişse, Sunucu Yanıtı (Header) üzerinden Content-Type'ı kontrol et
      if (!videoType && details.responseHeaders) {
        for (let header of details.responseHeaders) {
          if (header.name.toLowerCase() === 'content-type') {
            const val = header.value.toLowerCase();
            // .ts chunk'larını (video/mp2t) veya resim gibi görünen parçaları yoksay!
            if (val.includes('application/vnd.apple.mpegurl') || val.includes('application/x-mpegurl')) {
              videoType = 'hls';
            } else if (val.includes('application/dash+xml')) {
              videoType = 'dash';
            } else if (val.includes('video/mp4') || val.includes('video/webm')) {
              // Eğer bu bir MP4 ise ama resim uzantısı varsa (fake .png chunk) yoksay
              if (!hasImageExt) {
                videoType = 'mp4';
              }
            }
            break;
          }
        }
      }

      // 3. Bulduysak kaydet
      if (videoType) {
        if (tabId !== -1) {
          StorageManager.addVideoUrl(tabId, details.url, videoType);
        }
        
        // KORSAN KORUMASINI AŞMAK İÇİN DİNAMİK REFERER KURALI
        // Eğer sunucu videoyu sadece kendi sitesinden gelen isteklere veriyorsa (Referer kontrolü),
        // eklentinin (hls.js) yapacağı isteklere orijinal sitenin Referer'ını (veya URL'in kendisini) ekle.
        if (chrome.declarativeNetRequest) {
          const initiator = details.initiator || new URL(details.url).origin;
          
          let hash = 0;
          for (let i = 0; i < initiator.length; i++) {
            hash = (hash << 5) - hash + initiator.charCodeAt(i);
            hash |= 0;
          }
          const ruleId = (Math.abs(hash) % 4000) + 1000;
          
          const hostname = new URL(details.url).hostname;
          let rootDomain = hostname;
          // Eğer IP adresi değilse ve alt alan adı varsa, kök alan adını (root domain) al
          if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
            const parts = hostname.split('.');
            if (parts.length > 2) {
              rootDomain = parts.slice(-2).join('.');
            }
          }

          chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ruleId],
            addRules: [{
              id: ruleId,
              priority: 2,
              action: {
                type: "modifyHeaders",
                requestHeaders: [
                  { header: "Referer", operation: "set", value: initiator },
                  { header: "Origin", operation: "set", value: initiator }
                ]
              },
              condition: {
                requestDomains: [rootDomain],
                initiatorDomains: [chrome.runtime.id],
                resourceTypes: ["xmlhttprequest", "media"]
              }
            }]
          }).catch(console.error);
        }
      }
    } catch(e) {}
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Tab kapandığında hafızayı temizle
chrome.tabs.onRemoved.addListener((tabId) => {
  StorageManager.clearTab(tabId);
});

// Tab yeni bir sayfaya gittiğinde (örn: sonraki bölüm) eski videoları temizle
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    StorageManager.clearTab(tabId);
  }
});
