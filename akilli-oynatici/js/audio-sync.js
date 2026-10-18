/**
 * SpeechSyncEngine - EchoPlay Akıllı Ses Senkronizasyonu ve VAD Motoru
 * Web Audio API bandpass filtreleme (300Hz-3400Hz), hece tespiti,
 * donma korumalı seek taraması ve reaktif VAD gösterge döngüsünü kapsüller.
 */
(function(window) {
    'use strict';

    let audioCtx = null;
    let audioSourceNode = null;
    let speakerGainNode = null;
    let vocalFilter = null;
    let audioAnalyser = null;
    let isAudioEngineInitialized = false;

    let vadBuffer = null;
    let isVadMonitoring = false;

    function init(videoElement) {
        if (isAudioEngineInitialized && audioCtx && audioCtx.state === 'running') return true;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return false;

            if (!audioCtx) {
                audioCtx = new AudioContextClass();
                audioSourceNode = audioCtx.createMediaElementSource(videoElement);

                // İnsan sesi için bandpass filtreleme (300Hz - 3400Hz)
                vocalFilter = audioCtx.createBiquadFilter();
                vocalFilter.type = 'bandpass';
                vocalFilter.frequency.value = 1000;
                vocalFilter.Q.value = 1.0;

                // Spektrum Analizörü
                audioAnalyser = audioCtx.createAnalyser();
                audioAnalyser.fftSize = 512;
                audioAnalyser.smoothingTimeConstant = 0.2;

                // Hoparlör ses kontrolü (Tarama sırasında cızırtıyı engellemek için)
                speakerGainNode = audioCtx.createGain();
                speakerGainNode.gain.value = 1;

                // Bağlantılar
                audioSourceNode.connect(speakerGainNode);
                speakerGainNode.connect(audioCtx.destination);

                audioSourceNode.connect(vocalFilter);
                vocalFilter.connect(audioAnalyser);

                isAudioEngineInitialized = true;
            }

            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            return true;
        } catch (e) {
            console.warn("[SpeechSyncEngine] Web Audio başlatılamadı:", e);
            return false;
        }
    }

    function getInstantAudioEnergy() {
        if (!audioAnalyser) return 0;
        if (!vadBuffer || vadBuffer.length !== audioAnalyser.frequencyBinCount) {
            vadBuffer = new Uint8Array(audioAnalyser.frequencyBinCount);
        }
        audioAnalyser.getByteFrequencyData(vadBuffer);
        let sum = 0;
        for (let i = 0; i < vadBuffer.length; i++) sum += vadBuffer[i];
        return sum / vadBuffer.length;
    }

    function monitorVAD(videoElement, indicatorElement, isDialogSkipMode) {
        if (!isDialogSkipMode || !audioAnalyser || videoElement.paused) {
            isVadMonitoring = false;
            if (indicatorElement) indicatorElement.style.display = isDialogSkipMode ? 'block' : 'none';
            return;
        }
        const energy = getInstantAudioEnergy();
        if (indicatorElement) {
            indicatorElement.style.display = 'block';
            if (energy > 20) {
                indicatorElement.style.background = '#00e676';
                indicatorElement.style.boxShadow = '0 0 8px #00e676';
            } else {
                indicatorElement.style.background = '#666';
                indicatorElement.style.boxShadow = 'none';
            }
        }
        requestAnimationFrame(() => monitorVAD(videoElement, indicatorElement, isDialogSkipMode));
    }

    function startVAD(videoElement, indicatorElement, isDialogSkipMode) {
        if (isDialogSkipMode && audioAnalyser && !videoElement.paused && !isVadMonitoring) {
            isVadMonitoring = true;
            requestAnimationFrame(() => monitorVAD(videoElement, indicatorElement, isDialogSkipMode));
        } else if (!isDialogSkipMode && indicatorElement) {
            indicatorElement.style.display = 'none';
        }
    }

    function stopVAD(indicatorElement) {
        isVadMonitoring = false;
        if (indicatorElement) indicatorElement.style.display = 'none';
    }

    async function findFirstDialogue(videoElement, startTime, maxSeconds = 180) {
        if (!init(videoElement)) return null;

        const originalTime = videoElement.currentTime;
        const wasPlaying = !videoElement.paused;

        if (speakerGainNode) speakerGainNode.gain.value = 0;
        videoElement.playbackRate = 4;

        let foundSpeechTime = null;

        try {
            await videoElement.play().catch(() => {});

            let probe = startTime;
            let maxIter = Math.min(100, Math.ceil(maxSeconds / 1.5));
            let iterations = 0;

            while (iterations < maxIter) {
                iterations++;
                probe += 1.5;
                if (probe >= videoElement.duration || probe >= startTime + maxSeconds) break;

                videoElement.currentTime = probe;
                // Deadlock koruması: seeked event'ine 1.2s timeout
                await Promise.race([
                    new Promise(r => videoElement.addEventListener('seeked', r, { once: true })),
                    new Promise(r => setTimeout(r, 1200))
                ]);
                await new Promise(r => setTimeout(r, 40));

                const energy = getInstantAudioEnergy();
                if (energy > 18) {
                    // Hece düşüşü (Syllable Drop) analizi ile müzik ve gürültü filtreleme
                    let energies = [];
                    for (let j = 0; j < 25; j++) {
                        energies.push(getInstantAudioEnergy());
                        await new Promise(r => setTimeout(r, 20));
                    }

                    const avg = energies.reduce((a, b) => a + b, 0) / energies.length;
                    let drops = 0;
                    for (let k = 1; k < energies.length; k++) {
                        if (energies[k - 1] > avg && energies[k] < avg * 0.7) {
                            drops++;
                        }
                    }

                    if (drops >= 1) {
                        foundSpeechTime = probe;
                        break;
                    }
                }
            }
        } catch (err) {
            console.error("[SpeechSyncEngine] Diyalog arama hatası:", err);
        } finally {
            videoElement.playbackRate = 1;
            if (speakerGainNode) speakerGainNode.gain.value = 1;
            videoElement.currentTime = originalTime;

            if (wasPlaying) await videoElement.play().catch(() => {});
            else videoElement.pause();
        }

        return foundSpeechTime;
    }

    window.SpeechSyncEngine = {
        init,
        getInstantAudioEnergy,
        startVAD,
        stopVAD,
        findFirstDialogue
    };

})(typeof window !== 'undefined' ? window : globalThis);
