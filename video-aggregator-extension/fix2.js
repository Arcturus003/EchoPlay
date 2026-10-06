const fs = require('fs');
let js = fs.readFileSync('player.js', 'utf8');

// The file has two 'function detectVideoMetadata(src) {'
// Let's find the first one and the second one.
let firstIndex = js.indexOf('function detectVideoMetadata(src) {');
let secondIndex = js.indexOf('function detectVideoMetadata(src) {', firstIndex + 1);

if (secondIndex !== -1) {
    // We need to delete everything between the first 'const video = document.getElementById('myPlayer');'
    // that got duplicated, or just delete the first copy.
    // Let's look at the duplicated block start.
    let dupStart = js.indexOf('const video = document.getElementById(\'myPlayer\');');
    let secondDupStart = js.indexOf('const video = document.getElementById(\'myPlayer\');', dupStart + 1);
    
    if (secondDupStart !== -1) {
        // Remove from first dupStart to secondDupStart
        js = js.substring(0, dupStart) + js.substring(secondDupStart);
        fs.writeFileSync('player.js', js, 'utf8');
        console.log('Deduplicated block.');
    } else {
        console.log('Could not find second dup start.');
    }
} else {
    console.log('No duplicate found.');
}
