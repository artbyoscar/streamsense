const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchFiles(filePath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.ts')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                if (line.includes('Fragment')) {
                    console.log(`Found in ${filePath}:${index + 1}: ${line.trim()}`);
                }
            });
        }
    });
}

searchFiles('C:\\Users\\OscarNuñez\\Desktop\\streamsense\\src');
