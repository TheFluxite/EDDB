import { store } from "../main.js";
import { localize } from "../util.js";

import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="errors.length > 0">
                        {{ errors.join(', ') }}
                    </p>
                </div>
                <div class="board-container">
                    <div class="search-container">
                        <input
                            class="search-input"
                            type="text"
                            v-model="searchQuery"
                            placeholder="Search players..."
                        />
                    </div>
                    <table class="board">
                        <tr v-for="(ientry, i) in filteredLeaderboard">
                            <td class="rank"><p class="type-label-lg">#{{ originalRank(ientry) }}</p></td>
                            <td class="total"><p class="type-label-lg">{{ localize(ientry.total) }}</p></td>
                            <td class="user" :class="{ 'active': selected == originalRank(ientry) - 1 }">
                                <button @click="selected = originalRank(ientry) - 1">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                        <tr v-if="filteredLeaderboard.length === 0 && !errors.length">
                            <td colspan="3" style="padding: 1rem; color: var(--color-dim); text-align: center;">
                                <p class="type-label-lg">No players found</p>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container">
                    <div class="player" v-if="entry">
                        <div class="player-header">
                            <div>
                                <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                                <h3>{{ localize(entry.total) }}</h3>
                            </div>
                            <button
                                class="share-btn"
                                @click="sharePlayer"
                                :class="{ copied: justCopied }"
                                title="Copy share link"
                            >
                                <span v-if="!justCopied">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                    </svg>
                                    Share
                                </span>
                                <span v-else>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    Copied!
                                </span>
                            </button>
                        </div>
                        <h2 v-if="entry.verified && entry.verified.length > 0">Verified ({{ entry.verified.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a></td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed && entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a></td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed && entry.progressed.length > 0">Progressed ({{ entry.progressed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a></td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        errors: [],
        store,
        searchQuery: '',
        justCopied: false,
    }),
    computed: {
        entry() {
            return this.leaderboard[this.selected];
        },
        filteredLeaderboard() {
            if (!this.searchQuery.trim()) return this.leaderboard;
            const q = this.searchQuery.trim().toLowerCase();
            return this.leaderboard.filter(e => e.user.toLowerCase().includes(q));
        },
    },
    async mounted() {
        const targetUser = this.$route?.query?.user;

        try {
            const res = await fetch('/data/_leaderboard.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.leaderboard = await res.json();
        } catch (e) {
            this.errors = [`Failed to load leaderboard: ${e.message}`];
        }

        if (targetUser) {
            const idx = this.leaderboard.findIndex(
                (e) => e.user.toLowerCase() === targetUser.toLowerCase()
            );
            if (idx !== -1) this.selected = idx;
        }

        this.loading = false;
    },
    methods: {
        localize,
        originalRank(entry) {
            return this.leaderboard.findIndex(e => e.user === entry.user) + 1;
        },
        sharePlayer() {
            if (!this.entry) return;

            // /player?user=Name  → proper OG embed for Discord
            const shareUrl = `${location.origin}/leaderboard?user=${encodeURIComponent(this.entry.user)}`;

            navigator.clipboard.writeText(shareUrl).then(() => {
                this.justCopied = true;
                setTimeout(() => { this.justCopied = false; }, 2000);
            }).catch(() => {
                // Fallback for browsers that block clipboard
                const ta = document.createElement('textarea');
                ta.value = shareUrl;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                this.justCopied = true;
                setTimeout(() => { this.justCopied = false; }, 2000);
            });
        },
    },
};
