import sys

with open('akilli-oynatici/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    const args = process.argv;
    let filePath = null;
    for (let i = 1; i < args.length; i++) {
        const argLower = args[i].toLowerCase();
        if (args[i] && !args[i].startsWith('-') && 
            (argLower.endsWith('.mp4') || argLower.endsWith('.mkv') || argLower.endsWith('.webm') || argLower.endsWith('.m3u8'))) {
            filePath = args[i];
            break;
        }
    }'''

replacement = '''    const args = process.argv;
    let filePath = null;
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg && !arg.startsWith('-')) {
            let parsedPath = arg.toLowerCase();
            try {
                parsedPath = new URL(arg).pathname.toLowerCase();
            } catch(e) {
                parsedPath = arg.split('?')[0].toLowerCase();
            }

            if (parsedPath.endsWith('.mp4') || parsedPath.endsWith('.mkv') || parsedPath.endsWith('.webm') || parsedPath.endsWith('.m3u8')) {
                filePath = arg;
                break;
            }
        }
    }'''

if target in content:
    content = content.replace(target, replacement)
    with open('akilli-oynatici/main.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed main.js logic")
else:
    print("Could not find target in main.js")
