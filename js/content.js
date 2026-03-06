import { round, score } from './score.js';
import { store } from './main.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = '/data';

export async function fetchList() {
    if (store.listCache) return store.listCache;

    try {
        // Try fetching all levels in one request from _data.json
        const dataResult = await fetch(`${dir}/_data.json`);
        if (dataResult.ok) {
            const data = await dataResult.json();
            store.listCache = data.map((level, rank) => {
                if (!level) return [null, `unknown_${rank}`];
                return [
                    {
                        ...level,
                        records: level.records.sort((a, b) => b.percent - a.percent),
                    },
                    null,
                ];
            });
            return store.listCache;
        }
    } catch {}

    // Fallback: original per-file fetch behaviour
    const listResult = await fetch(`${dir}/_list.json`);
    try {
        const list = await listResult.json();
        const BATCH_SIZE = 50;
        const results = [];

        for (let i = 0; i < list.length; i += BATCH_SIZE) {
            const batch = list.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(async (path, batchIndex) => {
                    const rank = i + batchIndex;
                    const levelResult = await fetch(`${dir}/${path}.json`);
                    try {
                        const level = await levelResult.json();
                        return [
                            {
                                ...level,
                                path,
                                records: level.records.sort(
                                    (a, b) => b.percent - a.percent,
                                ),
                            },
                            null,
                        ];
                    } catch {
                        console.error(`Failed to load level #${rank + 1} ${path}.`);
                        return [null, path];
                    }
                }),
            );
            results.push(...batchResults);
        }

        store.listCache = results;
        return store.listCache;
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}

export async function fetchEditors() {
    if (store.editorsCache) return store.editorsCache;
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        store.editorsCache = await editorsResults.json();
        return store.editorsCache;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        // Verification
        const verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        ) || level.verifier;
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            level: level.name,
            score: score(rank + 1, 100, level.percentToQualify),
            link: level.verification,
        });

        // Records
        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    score: score(rank + 1, 100, level.percentToQualify),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify),
                link: record.link,
            });
        });
    });

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}
