// js/leaderboard.worker.js
// Runs leaderboard score computation in a background thread. Alright!

function score(rank, percent, minPercent) {
    if (rank > 1500) return 0;
    if (rank > 400 && percent < 100) return 0;

    let s = (-24.9975 * Math.pow((rank - 1) * (180 / 1500), 0.4) + 200) *
        ((percent - (minPercent - 1)) / (100 - (minPercent - 1)));

    s = Math.max(0, s);

    if (percent != 100) return round(s - s / 3);
    return Math.max(round(s), 0);
}

function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+0') + 'e-0');
    }
    var arr = ('' + num).split('e');
    var sig = +arr[1] + 0 > 0 ? '+' : '';
    return +(Math.round(+arr[0] + 'e' + sig + (+arr[1] + 0)) + 'e-0');
}

self.onmessage = function (e) {
    const list = e.data;
    const scoreMap = {};
    const errs = [];

    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        const verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        ) || level.verifier;
        scoreMap[verifier] ??= { verified: [], completed: [], progressed: [] };
        scoreMap[verifier].verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
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

    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const total = round(
            [...scores.verified, ...scores.completed, ...scores.progressed]
                .reduce((prev, cur) => prev + cur.score, 0)
        );
        return { user, total, ...scores };
    });

    res.sort((a, b) => b.total - a.total);

    self.postMessage({ leaderboard: res, errs });
};
