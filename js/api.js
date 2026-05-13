export class RankingService {
    static async sendRankingRequest(payload) {
        return fetch('./api/ranking.php', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });
    }

    static async loadRanking(diff, category = 'all') {
        const res = await fetch(`./api/ranking.php?diff=${diff}&category=${category}`);
        if (!res.ok) throw new Error('Failed to load ranking');
        return await res.json();
    }

    static async notifyStart() {
        return fetch('./api/ranking.php?action=start').catch(() => {});
    }
}
