// Run this script from your project root whenever you add/update levels:
//   node build_data.js
//
// It reads data/_list.json and merges all individual level files into
// a single data/_data.json, which the site loads in one HTTP request
// instead of 1300+ separate requests.

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const dir = './data';
const list = JSON.parse(readFileSync(join(dir, '_list.json'), 'utf8'));

const data = list.map((path, i) => {
    try {
        const level = JSON.parse(readFileSync(join(dir, `${path}.json`), 'utf8'));
        return { ...level, path };
    } catch {
        console.warn(`Warning: Failed to load level #${i + 1} at ${path}.json`);
        return null;
    }
});

writeFileSync(join(dir, '_data.json'), JSON.stringify(data));
console.log(`Built _data.json with ${data.length} levels (${data.filter(Boolean).length} loaded successfully).`);
