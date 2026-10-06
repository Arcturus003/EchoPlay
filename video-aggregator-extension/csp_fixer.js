const fs = require('fs');
const htmlFile = 'player.html';
const jsFile = 'player.js';

let html = fs.readFileSync(htmlFile, 'utf8');

// We have encoding issues with reading UTF-16 sometimes. Let's just assume it's UTF-8 because I replaced file contents using tools that write UTF-8.

// Extract the main script tag
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let mainScriptContent = '';
let htmlWithoutScript = html;

while ((match = scriptRegex.exec(html)) !== null) {
    // Only extract if it looks like our main script (has video = document.getElementById('myPlayer'))
    if (match[1].includes('myPlayer')) {
        mainScriptContent = match[1];
        htmlWithoutScript = htmlWithoutScript.replace(match[0], '<script src="player.js"></script>');
    }
}

// Now find and remove all onclick handlers
const onclickRegex = /<button([^>]*?)onclick="([^"]*)"([^>]*?)>/g;
let eventListeners = "\n\n// --- AUTO-GENERATED EVENT LISTENERS FOR CSP --- \n";

htmlWithoutScript = htmlWithoutScript.replace(onclickRegex, (fullMatch, before, onclickCode, after) => {
    // Check if element has an ID, if not, generate one
    let idMatch = before.match(/id="([^"]*)"/) || after.match(/id="([^"]*)"/);
    let id = idMatch ? idMatch[1] : null;
    
    let newBefore = before;
    let newAfter = after;
    
    if (!id) {
        id = 'auto_btn_' + Math.random().toString(36).substr(2, 9);
        newBefore += ` id="${id}"`;
    }
    
    // Add to eventListeners
    // Handle 'this' keyword by using an arrow function or function(e) and e.currentTarget
    let safeCode = onclickCode.replace(/\bthis\b/g, 'e.currentTarget');
    
    eventListeners += `document.getElementById('${id}').addEventListener('click', function(e) {\n    ${safeCode}\n});\n`;
    
    return `<button${newBefore}${newAfter}>`;
});

// Also check for any other elements with onclick (divs, spans, etc.)
const anyOnclickRegex = /<([^>]+?)onclick="([^"]*)"([^>]*?)>/g;
htmlWithoutScript = htmlWithoutScript.replace(anyOnclickRegex, (fullMatch, tagPrefix, onclickCode, after) => {
    // skip button since we already did it
    if (tagPrefix.trim().startsWith('button')) return fullMatch;
    
    let idMatch = tagPrefix.match(/id="([^"]*)"/) || after.match(/id="([^"]*)"/);
    let id = idMatch ? idMatch[1] : null;
    let newTagPrefix = tagPrefix;
    
    if (!id) {
        id = 'auto_el_' + Math.random().toString(36).substr(2, 9);
        newTagPrefix += ` id="${id}"`;
    }
    
    let safeCode = onclickCode.replace(/\bthis\b/g, 'e.currentTarget');
    eventListeners += `document.getElementById('${id}').addEventListener('click', function(e) {\n    ${safeCode}\n});\n`;
    
    return `<${newTagPrefix}${after}>`;
});

fs.writeFileSync(htmlFile, htmlWithoutScript, 'utf8');
fs.writeFileSync(jsFile, mainScriptContent + eventListeners, 'utf8');

console.log("CSP Fix completed successfully. Separated JS into player.js.");
