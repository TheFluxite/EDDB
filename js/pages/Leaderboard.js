import { store } from "../main.js";
import { localize } from "../util.js";
import { fetchLeaderboard } from "../content.js";

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
                        Leaderboard may be incorrect: {{ errors.join(', ') }}
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
                        <tr v-if="filteredLeaderboard.length === 0">
                            <td colspan="3" style="padding: 1rem; color: var(--color-dim); text-align: center;">
                                <p class="type-label-lg">No players found</p>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container">
                    <div class="player" v-if="entry">
                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                        <h3>{{ localize(entry.total) }}</h3>
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a></td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed">
                                <td class="rank"><p>#{{ score.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a></td>
                                <td class="score"><p>+{{ localize(score.score) }}</p></td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{ entry.progressed.length }})</h2>
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

        const [leaderboard, errs] = await fetchLeaderboard();
        this.leaderboard = leaderboard;
        this.errors = errs;

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
    },
};
