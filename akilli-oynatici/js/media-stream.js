/**
 * MediaStreamAdapter - EchoPlay Birleşik Medya Akış Adaptörü
 * HLS (.m3u8) yayın çözücü, akıllı medya hata kurtarma (recoverMediaError)
 * ve yerel dosya M3U8 IPC okumasını şeffaf bir arayüz arkasında toplar.
 */
(function(window) {
    'use strict';

    function attachHlsErrorRecovery(hls, onFeedback) {
        hls.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.warn('[MediaStreamAdapter] HLS Ağ Hatası:', data);
                        if (onFeedback) onFeedback('<i class="ph-bold ph-warning-circle"></i> M3U8 ağ hatası (Erişim reddedildi)');
                        hls.destroy();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('[MediaStreamAdapter] HLS Medya Hatası kurtarılıyor...', data);
                        hls.recoverMediaError();
                        break;
                    default:
                        if (onFeedback) onFeedback('<i class="ph-bold ph-warning-circle"></i> HLS Hatası');
                        hls.destroy();
                        break;
                }
            }
        });
    }

    function load(videoElement, url, localFilePath = '', callbacks = {}) {
        const isM3u8 = url.toLowerCase().includes('.m3u8');
        const onFeedback = callbacks.onFeedback || function() {};
        const onManifestParsed = callbacks.onManifestParsed || function() {};

        if (window.hlsInstance) {
            window.hlsInstance.destroy();
            window.hlsInstance = null;
        }

        if (isM3u8) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                if (url.startsWith('file:///') && window.electronAPI && typeof window.electronAPI.readLocalM3u8 === 'function') {
                    const filePath = localFilePath || decodeURIComponent(url.replace(/^file:\/\/\/?/, ''));
                    window.electronAPI.readLocalM3u8(filePath).then(dataUri => {
                        if (dataUri) {
                            setupHls(videoElement, dataUri, onManifestParsed, onFeedback);
                        } else {
                            setupHls(videoElement, url, onManifestParsed, onFeedback);
                        }
                    }).catch(() => setupHls(videoElement, url, onManifestParsed, onFeedback));
                } else {
                    setupHls(videoElement, url, onManifestParsed, onFeedback);
                }
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                videoElement.src = url;
                videoElement.play().catch(e => console.log('[MediaStreamAdapter] Native HLS hatası:', e));
            }
        } else {
            videoElement.removeAttribute('crossorigin');
            videoElement.src = url;
            videoElement.play().catch(e => console.log('[MediaStreamAdapter] Oynatma hatası:', e));
        }
    }

    function setupHls(videoElement, sourceUrl, onManifestParsed, onFeedback) {
        const hls = new Hls();
        window.hlsInstance = hls;
        hls.loadSource(sourceUrl);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
            onManifestParsed(data.levels, hls);
        });
        attachHlsErrorRecovery(hls, onFeedback);
    }

    window.MediaStreamAdapter = {
        load,
        attachHlsErrorRecovery
    };

})(typeof window !== 'undefined' ? window : globalThis);
