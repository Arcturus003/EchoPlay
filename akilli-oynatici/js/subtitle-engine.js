/**
 * SubtitleEngine - EchoPlay Derin Altyazı Motoru
 * SRT / WebVTT ayrıştırma, karakter kodlama tespiti (UTF-8 & CP1254),
 * çakışma (overlap) istifleme ve Blob URL yönetimini kapsüller.
 */
(function(window) {
    'use strict';

    function parseTimestamp(timeStr) {
        if (!timeStr) return 0;
        const cleanStr = timeStr.trim().replace(',', '.');
        const parts = cleanStr.split(':');
        let seconds = 0;
        if (parts.length === 3) {
            seconds = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
        } else if (parts.length === 2) {
            seconds = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
        }
        return isNaN(seconds) ? 0 : seconds;
    }

    function formatVttTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    function decodeBuffer(arrayBuffer) {
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(arrayBuffer);
        } catch (err) {
            try {
                return new TextDecoder('windows-1254').decode(arrayBuffer);
            } catch (e2) {
                return new TextDecoder('iso-8859-9').decode(arrayBuffer);
            }
        }
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

        // Çakışma (Overlap) Konumlandırma: Alttan yukarıya doğru istifle (%90, %82, %74)
        for (let j = 0; j < cues.length; j++) {
            let activeOverlaps = 0;
            for (let k = j - 1; k >= 0; k--) {
                if (cues[k].endTime > cues[j].startTime) {
                    activeOverlaps++;
                } else if (cues[j].startTime - cues[k].endTime > 120) {
                    break;
                }
            }
            if (activeOverlaps > 0) {
                cues[j].line = Math.max(15, 90 - (activeOverlaps * 8)) + "%";
            }
        }
        return cues;
    }

    function srtToVtt(srtText) {
        let vtt = srtText.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
        return "WEBVTT\n\n" + vtt;
    }

    function generateVtt(cues) {
        let vtt = "WEBVTT\n\n";
        for (let i = 0; i < cues.length; i++) {
            const c = cues[i];
            const settings = c.line ? ` line:${c.line}` : "";
            vtt += `${formatVttTime(c.startTime)} --> ${formatVttTime(c.endTime)}${settings}\n${c.text}\n\n`;
        }
        return vtt;
    }

    function adjustSync(cues, deltaSeconds) {
        if (!cues || cues.length === 0) return cues;
        for (let i = 0; i < cues.length; i++) {
            cues[i].startTime = Math.max(0, cues[i].startTime + deltaSeconds);
            cues[i].endTime = Math.max(0, cues[i].endTime + deltaSeconds);
        }
        return cues;
    }

    let activeBlobUrl = null;

    function applyToVideo(cues, videoElement, label = 'Türkçe') {
        const cleanVtt = generateVtt(cues);
        const blob = new Blob([cleanVtt], { type: 'text/vtt' });
        
        if (activeBlobUrl) {
            URL.revokeObjectURL(activeBlobUrl);
        }
        activeBlobUrl = URL.createObjectURL(blob);

        let existingTrack = document.getElementById('subtitleTrack');
        if (existingTrack) {
            if (existingTrack.track) existingTrack.track.mode = 'hidden';
            if (existingTrack.src) URL.revokeObjectURL(existingTrack.src);
            existingTrack.remove();
        }

        const newTrack = document.createElement('track');
        newTrack.id = 'subtitleTrack';
        newTrack.label = label;
        newTrack.kind = 'subtitles';
        newTrack.srclang = 'tr';
        newTrack.default = true;
        newTrack.src = activeBlobUrl;

        newTrack.onload = () => {
            if (videoElement.textTracks && videoElement.textTracks.length > 0) {
                for (let i = 0; i < videoElement.textTracks.length; i++) {
                    videoElement.textTracks[i].mode = 'hidden';
                }
                newTrack.track.mode = 'showing';
            }
        };

        videoElement.appendChild(newTrack);
        return activeBlobUrl;
    }

    function parseMatroskaTracks(buffer) {
        const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);
        const tracks = { audio: [], subtitle: [] };
        
        let tracksPos = -1;
        for (let i = 0; i < u8.length - 8; i++) {
            if (u8[i] === 0x16 && u8[i+1] === 0x54 && u8[i+2] === 0xAE && u8[i+3] === 0x6B) {
                for (let j = i + 4; j < Math.min(i + 40, u8.length); j++) {
                    if (u8[j] === 0xAE) { tracksPos = i; break; }
                }
                if (tracksPos !== -1) break;
            }
        }
        if (tracksPos === -1) return tracks;

        let p = tracksPos + 4;
        const maxEnd = Math.min(u8.length, tracksPos + 512 * 1024);

        while (p < maxEnd - 4) {
            if (u8[p] === 0xAE) {
                let trackType = 0;
                let codec = '';
                let lang = 'und';
                let name = '';

                const entryLimit = Math.min(maxEnd, p + 1024);
                for (let k = p; k < entryLimit - 4; k++) {
                    if (u8[k] === 0xAE && k > p + 10) break;
                    if (u8[k] === 0x83 && u8[k+1] === 0x81) {
                        trackType = u8[k+2];
                    }
                    if (u8[k] === 0x86) {
                        let sLen = u8[k+1] & 0x7F;
                        if (sLen > 0 && sLen < 64) {
                            let str = '';
                            for (let x = 0; x < sLen; x++) str += String.fromCharCode(u8[k + 2 + x]);
                            codec = str.replace(/\0/g, '').trim();
                        }
                    }
                    if (u8[k] === 0x22 && u8[k+1] === 0xB5 && u8[k+2] === 0x9C) {
                        let sLen = u8[k+3] & 0x7F;
                        if (sLen > 0 && sLen < 16) {
                            let str = '';
                            for (let x = 0; x < sLen; x++) str += String.fromCharCode(u8[k + 4 + x]);
                            lang = str.replace(/\0/g, '').trim();
                        }
                    }
                    if (u8[k] === 0x53 && u8[k+1] === 0x6E) {
                        let sLen = u8[k+2] & 0x7F;
                        if (sLen > 0 && sLen < 64) {
                            let str = '';
                            for (let x = 0; x < sLen; x++) str += String.fromCharCode(u8[k + 3 + x]);
                            name = str.replace(/\0/g, '').trim();
                        }
                    }
                }

                if (trackType === 2) {
                    tracks.audio.push({ codec, name: name || ('Ses (' + lang.toUpperCase() + ')'), lang });
                } else if (trackType === 17) {
                    tracks.subtitle.push({ codec, name: name || ('Altyazı (' + lang.toUpperCase() + ')'), lang });
                }
            }
            p++;
        }
        return tracks;
    }

    window.SubtitleEngine = {
        parseTimestamp,
        formatVttTime,
        decodeBuffer,
        parseVttCues,
        srtToVtt,
        generateVtt,
        adjustSync,
        applyToVideo,
        parseMatroskaTracks
    };

})(typeof window !== 'undefined' ? window : globalThis);
