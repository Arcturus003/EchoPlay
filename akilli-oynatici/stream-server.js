const http = require('node:http');
const { spawn, execFile } = require('node:child_process');
const path = require('node:path');

let server = null;
let serverPort = null;
let activeFfmpegProcesses = new Set();

const SUPPORTED_AUDIO_CODECS = new Set(['aac', 'mp3', 'opus', 'vorbis', 'flac', 'wav']);

function probeMedia(filePath) {
    return new Promise((resolve) => {
        if (!filePath) return resolve(null);
        
        execFile('ffprobe', [
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

                for (const s of streams) {
                    if (s.codec_type === 'audio') {
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

                const hasUnsupportedAudio = audioTracks.length > 0 && !audioTracks[0].isSupported;
                resolve({
                    duration: parseFloat(data.format?.duration) || 0,
                    audioTracks,
                    subtitleTracks,
                    hasUnsupportedAudio
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

        const proc = spawn('ffmpeg', [
            '-v', 'quiet',
            '-i', filePath,
            '-map', `0:s:${subtitleIndex}`,
            '-f', 'webvtt',
            'pipe:1'
        ]);

        let vtt = '';
        proc.stdout.on('data', chunk => { vtt += chunk.toString(); });
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

function startServer() {
    return new Promise((resolve) => {
        if (server && serverPort) return resolve(serverPort);

        server = http.createServer((req, res) => {
            const reqUrl = new URL(req.url, `http://127.0.0.1:${serverPort}`);
            
            if (reqUrl.pathname === '/stream') {
                const filePath = reqUrl.searchParams.get('file');
                const audioIndex = parseInt(reqUrl.searchParams.get('audio') || '0', 10);
                const startTime = parseFloat(reqUrl.searchParams.get('start') || '0');

                if (!filePath) {
                    res.writeHead(400);
                    return res.end('Eksik dosya yolu');
                }

                const args = [];
                if (startTime > 0) {
                    args.push('-ss', startTime.toFixed(3));
                }
                args.push(
                    '-i', filePath,
                    '-map', '0:v:0',
                    '-map', `0:a:${audioIndex}`,
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    '-ac', '2',
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

                const ffmpegProc = spawn('ffmpeg', args);
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
                    } catch (e) {}
                };

                req.on('close', cleanup);
                res.on('finish', cleanup);
                res.on('error', cleanup);
                ffmpegProc.on('error', cleanup);
                ffmpegProc.on('close', () => {
                    activeFfmpegProcesses.delete(ffmpegProc);
                });
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

function getStreamUrl(filePath, audioIndex = 0, startTime = 0) {
    if (!serverPort) return null;
    return `http://127.0.0.1:${serverPort}/stream?file=${encodeURIComponent(filePath)}&audio=${audioIndex}&start=${startTime}&t=${Date.now()}`;
}

function stopServer() {
    for (const proc of activeFfmpegProcesses) {
        try { proc.kill('SIGKILL'); } catch (e) {}
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
    getStreamUrl
};
