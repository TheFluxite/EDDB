const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const dir = './data';
const list = JSON.parse(readFileSync(join(dir, '_list.json'), 'utf8'));

// --- Build _data.json ---
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

// --- Build _leaderboard.json ---
function score(rank, percent, minPercent) {
    if (rank > 1500) return 0;
    if (rank > 400 && percent < 100) return 0;
    let s = (-24.9975 * Math.pow((rank - 1) * (180 / 1500), 0.4) + 200) *
        ((percent - (minPercent - 1)) / (100 - (minPercent - 1)));
    s = Math.max(0, s);
    if (percent != 100) return Math.round(s - s / 3);
    return Math.max(Math.round(s), 0);
}

const scoreMap = {};

data.forEach((level, rank) => {
    if (!level) return;

    const verifier = Object.keys(scoreMap).find(
        u => u.toLowerCase() === level.verifier.toLowerCase()
    ) || level.verifier;
    scoreMap[verifier] ??= { verified: [], completed: [], progressed: [] };
    scoreMap[verifier].verified.push({
        rank: rank + 1,
        level: level.name,
        score: score(rank + 1, 100, level.percentToQualify),
        link: level.verification,
    });

    (level.records || []).forEach(record => {
        if (!record.user) return;
        const user = Object.keys(scoreMap).find(
            u => u.toLowerCase() === record.user.toLowerCase()
        ) || record.user;
        scoreMap[user] ??= { verified: [], completed: [], progressed: [] };

        if (record.percent === 100) {
            scoreMap[user].completed.push({
                rank: rank + 1,
                level: level.name,
                score: score(rank + 1, 100, level.percentToQualify),
                link: record.link,
            });
        } else {
            scoreMap[user].progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        }
    });
});

const leaderboard = Object.entries(scoreMap).map(([user, scores]) => {
    const total = Math.round(
        [...scores.verified, ...scores.completed, ...scores.progressed]
            .reduce((sum, cur) => sum + cur.score, 0)
    );
    return { user, total, ...scores };
}).sort((a, b) => b.total - a.total);

writeFileSync(join(dir, '_leaderboard.json'), JSON.stringify(leaderboard));
console.log(`Built _leaderboard.json with ${leaderboard.length} players.`);
