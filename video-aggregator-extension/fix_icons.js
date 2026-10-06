const fs = require('fs');

let content = fs.readFileSync('player.html', 'utf8');

// Replace phosphor icons with unicode/emojis
const iconMap = {
    'ph-play': '▶',
    'ph-pause': '⏸',
    'ph-folder-open': '📂',
    'ph-waveform': '〰',
    'ph-download-simple': '⬇',
    'ph-warning': '⚠',
    'ph-arrow-counter-clockwise': '↺',
    'ph-arrow-clockwise': '↻',
    'ph-skip-forward': '⏭',
    'ph-subtitles': '💬',
    'ph-sparkle': '✨',
    'ph-eye-slash': '🚫',
    'ph-magnifying-glass': '🔍',
    'ph-upload-simple': '📁',
    'ph-speaker-high': '🔊',
    'ph-speaker-slash': '🔇',
    'ph-quotes': '❝',
    'ph-picture-in-picture': '⧉',
    'ph-gear-six': '⚙',
    'ph-corners-out': '⛶',
    'ph-corners-in': '⛶',
    'ph-clock': '⏱',
    'ph-spinner-gap': '⏳',
    'ph-faders': '🎚'
};

content = content.replace(/<i class="[^"]*ph-([^ "]+)[^"]*"><\/i>/g, (match, iconName) => {
    // try to match ph-fill ph-play etc.
    let mapped = iconMap['ph-' + iconName];
    if (!mapped) {
        // try to find any key
        for (let key in iconMap) {
            if (match.includes(key)) {
                mapped = iconMap[key];
                break;
            }
        }
    }
    return `<span style="font-style:normal;">${mapped || '•'}</span>`;
});

// Since the UI had huge icons inside bigPlayBtn, let's fix its font size if needed, but span will inherit.
// Also fix playPauseBtn toggle logic in JS which might check innerHTML for "ph-play"
content = content.replace(/innerHTML\s*=\s*['"]<i class="ph-fill ph-play"><\/i>['"]/g, 'innerHTML = \'<span style="font-style:normal;">▶</span>\'');
content = content.replace(/innerHTML\s*=\s*['"]<i class="ph-fill ph-pause"><\/i>['"]/g, 'innerHTML = \'<span style="font-style:normal;">⏸</span>\'');

fs.writeFileSync('player.html', content);
console.log('Icons replaced successfully.');
