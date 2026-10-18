const http = require('node:http');
const { spawn, execFile } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

function getBinaryPath(name) {
    const ext = process.platform === 'win32' ? '.exe' : '';
    // 1. Packaged Electron extraResources (resources/bin/<name>.exe)
    if (process.resourcesPath) {
        const prodPath = path.join(process.resourcesPath, 'bin', name + ext);
        if (fs.existsSync(prodPath)) return prodPath;
    }
    // 2. Local development folder (__dirname/bin/<name>.exe)
    const devPath = path.join(__dirname, 'bin', name + ext);
    if (fs.existsSync(devPath)) return devPath;

    // 3. Fallback to system PATH
    return name;
}

let server = null;
let serverPort = null;
let activeFfmpegProcesses = new Set();

const SUPPORTED_AUDIO_CODECS = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac', 'wav']);
const SUPPORTED_VIDEO_CODECS = new Set(['h264', 'avc1', 'vp8', 'vp9', 'av1']);

function probeMedia(filePath) {
    return new Promise((resolve) => {
        if (!filePath) return resolve(null);
        
        execFile(getBinaryPath('ffprobe'), [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_streams',
            '-show_format',
            filePath
        ], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
            if (err || !stdout) {
                console.warn('[StreamServer] ffprobe hatası veya ffprobe bulunamadı:', err?.message);
                return resolve(null);
            }
            try {
                const data = JSON.parse(stdout);
                const streams = data.streams || [];
                
                let audioIndex = 0;
                const audioTracks = [];
                let subtitleIndex = 0;
                const subtitleTracks = [];
                let videoCodec = '';

                for (const s of streams) {
                    if (s.codec_type === 'video' && !videoCodec) {
                        videoCodec = (s.codec_name || '').toLowerCase();
                    } else if (s.codec_type === 'audio') {
                        const codec = (s.codec_name || '').toLowerCase();
                        const lang = s.tags?.language || 'und';
                        const title = s.tags?.title || `Ses ${audioIndex + 1} (${lang.toUpperCase()})`;
                        audioTracks.push({
                            streamIndex: s.index,
                            audioIndex: audioIndex++,
                            codec,
                            title,
                            language: lang,
                            channels: s.channels || 2,
                            isSupported: SUPPORTED_AUDIO_CODECS.has(codec),
                            isDefault: s.disposition?.default === 1
                        });
                    } else if (s.codec_type === 'subtitle') {
                        const codec = (s.codec_name || '').toLowerCase();
                        const lang = s.tags?.language || 'und';
                        const title = s.tags?.title || `Altyazı ${subtitleIndex + 1} (${lang.toUpperCase()})`;
                        subtitleTracks.push({
                            streamIndex: s.index,
                            subtitleIndex: subtitleIndex++,
                            codec,
                            title,
                            language: lang,
                            isDefault: s.disposition?.default === 1
                        });
                    }
                }

                const isSupportedVideo = SUPPORTED_VIDEO_CODECS.has(videoCodec);
                const needsVideoTranscode = videoCodec === 'hevc' || videoCodec === 'h265' || (!isSupportedVideo && !!videoCodec);
                const hasUnsupportedAudio = audioTracks.length > 0 && !audioTracks[0].isSupported;
                const needsTransmux = hasUnsupportedAudio || needsVideoTranscode;

                resolve({
                    duration: parseFloat(data.format?.duration) || 0,
                    videoCodec,
                    needsVideoTranscode,
                    hasUnsupportedAudio,
                    needsTransmux,
                    audioTracks,
                    subtitleTracks
                });
            } catch (parseErr) {
                console.error('[StreamServer] probe json parse hatası:', parseErr);
                resolve(null);
            }
        });
    });
}

function extractSubtitle(filePath, subtitleIndex) {
    return new Promise((resolve) => {
        if (!filePath || subtitleIndex === undefined) return resolve(null);

        const proc = spawn(getBinaryPath('ffmpeg'), [
            '-v', 'quiet',
            '-i', filePath,
            '-map', `0:s:${subtitleIndex}`,
            '-f', 'webvtt',
            'pipe:1'
        ]);

        let vtt = '';
        proc.stdout.on('data', chunk => { vtt += chunk.toString('utf8'); });
        proc.on('close', (code) => {
            if (code === 0 && vtt.trim()) {
                resolve(vtt);
            } else {
                resolve(null);
            }
        });
        proc.on('error', () => resolve(null));
    });
}

function detectSpeechOnset(filePath, startTime = 0, duration = 15) {
    return new Promise((resolve) => {
        if (!filePath) return resolve(null);
        const proc = spawn(getBinaryPath('ffmpeg'), [
            '-v', 'quiet',
            '-ss', startTime.toString(),
            '-t', duration.toString(),
            '-i', filePath,
            '-vn',
            '-af', 'highpass=f=500,lowpass=f=2500',
            '-ac', '1',
            '-ar', '16000',
            '-f', 's16le',
            'pipe:1'
        ]);

        const chunks = [];
        proc.stdout.on('data', chunk => chunks.push(chunk));
        proc.on('close', (code) => {
            if (code !== 0 || chunks.length === 0) return resolve(null);
            const buf = Buffer.concat(chunks);
            const samples = new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2));
            const winSize = 1600; // 100ms
            const energies = [];
            for (let i = 0; i < samples.length; i += winSize) {
                let sum = 0;
                const limit = Math.min(samples.length, i + winSize);
                for (let j = i; j < limit; j++) sum += Math.abs(samples[j]);
                energies.push(sum / (limit - i));
            }

            if (energies.length === 0) return resolve(null);

            // Yerel enerji sıçramasını (konuşma burst'unu) tespit et
            for (let k = 3; k < energies.length - 2; k++) {
                const localBaseline = (energies[k - 3] + energies[k - 2] + energies[k - 1]) / 3;
                if (energies[k] > localBaseline * 1.35 && energies[k + 1] > localBaseline * 1.35 && energies[k] > 700) {
                    const onset = startTime + (k * winSize) / 16000;
                    return resolve(onset);
                }
            }

            // Fallback: mutlak tepe noktası
            let maxE = 0;
            let bestK = 0;
            for (let k = 0; k < energies.length; k++) {
                if (energies[k] > maxE) {
                    maxE = energies[k];
                    bestK = k;
                }
            }
            resolve(startTime + (bestK * winSize) / 16000);
        });
        proc.on('error', () => resolve(null));
    });
}

function startServer() {
    return new Promise((resolve) => {
        if (server && serverPort) return resolve(serverPort);

        server = http.createServer((req, res) => {
            const reqUrl = new URL(req.url, `http://127.0.0.1:${serverPort}`);
            
            if (reqUrl.pathname === '/stream') {
                const filePath = reqUrl.searchParams.get('file');
                const audioIndex = parseInt(reqUrl.searchParams.get('audio') || '0', 10);
                const startTime = parseFloat(reqUrl.searchParams.get('start') || '0');
                const transcodeVideo = reqUrl.searchParams.get('transcodeVideo') === '1';

                if (!filePath) {
                    res.writeHead(400);
                    return res.end('Eksik dosya yolu');
                }

                const args = [];
                if (startTime > 0) {
                    args.push('-ss', startTime.toFixed(3));
                }
                args.push('-i', filePath);
                args.push('-map', '0:v:0');
                args.push('-map', `0:a:${audioIndex}`);

                if (transcodeVideo) {
                    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22', '-tune', 'zerolatency', '-pix_fmt', 'yuv420p');
                } else {
                    args.push('-c:v', 'copy');
                }

                args.push(
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    '-ac', '2',
                    '-strict', '-2',
                    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
                    '-f', 'mp4',
                    'pipe:1'
                );

                res.writeHead(200, {
                    'Content-Type': 'video/mp4',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache, no-store',
                    'Connection': 'keep-alive'
                });

                const ffmpegProc = spawn(getBinaryPath('ffmpeg'), args);
                activeFfmpegProcesses.add(ffmpegProc);

                ffmpegProc.stdout.pipe(res);

                ffmpegProc.stderr.on('data', () => {}); // Stderr buffer dolmasını engelle

                const cleanup = () => {
                    activeFfmpegProcesses.delete(ffmpegProc);
                    try {
                        if (ffmpegProc.stdout && !ffmpegProc.stdout.destroyed) {
                            ffmpegProc.stdout.destroy();
                        }
                        ffmpegProc.kill('SIGKILL');
                    } catch (e) {
                        console.warn('[StreamServer] Process cleanup error:', e.message);
                    }
                };

                req.on('close', cleanup);
                res.on('finish', cleanup);
                res.on('error', cleanup);
                ffmpegProc.on('error', cleanup);
                ffmpegProc.on('close', cleanup);
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        server.listen(0, '127.0.0.1', () => {
            serverPort = server.address().port;
            console.log(`[StreamServer] Canlı yayın sunucusu portta hazır: ${serverPort}`);
            resolve(serverPort);
        });
    });
}

function getStreamUrl(filePath, audioIndex = 0, startTime = 0, transcodeVideo = false) {
    if (!serverPort) return null;
    return `http://127.0.0.1:${serverPort}/stream?file=${encodeURIComponent(filePath)}&audio=${audioIndex}&start=${startTime}&transcodeVideo=${transcodeVideo ? 1 : 0}&t=${Date.now()}`;
}

function stopServer() {
    for (const proc of activeFfmpegProcesses) {
        try {
            if (proc.stdout && !proc.stdout.destroyed) {
                proc.stdout.destroy();
            }
            proc.kill('SIGKILL');
        } catch (e) {
            console.warn('[StreamServer] Process kill error:', e.message);
        }
    }
    activeFfmpegProcesses.clear();
    if (server) {
        server.close();
        server = null;
        serverPort = null;
    }
}

module.exports = {
    startServer,
    stopServer,
    probeMedia,
    extractSubtitle,
    detectSpeechOnset,
    getStreamUrl
};

