import { QuizModel, TimerModel } from './model.js';
import { QuizView } from './view.js';
import { RankingService } from './api.js';
import { CONFIG } from './config.js';
import { TRANSLATIONS } from './lang.js';

// ============================================================
// Sound - Web Audio API による効果音再生
// ============================================================
class Sound {
    constructor() {
        this.ctx = null;
        this.isMuted = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * 指定した周波数・波形で短い効果音を鳴らす。
     * @param {number} frequency - 周波数 (Hz)
     * @param {string} type      - オシレーター波形 ('sine' | 'sawtooth' 等)
     * @param {number} duration  - 長さ (秒)
     * @param {number} volume    - 音量 (0〜1)
     */
    play(frequency, type, duration, volume) {
        if (this.isMuted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.start();
        oscillator.stop(this.ctx.currentTime + duration);
    }

    correct() {
        this.play(880, 'sine', 0.1, 0.2);
        setTimeout(() => this.play(1760, 'sine', 0.2, 0.2), 100);
    }

    wrong() {
        this.play(150, 'sawtooth', 0.3, 0.2);
    }
}

// ============================================================
// Utility
// ============================================================

/**
 * Fisher-Yates Shuffle Algorithm for fair randomization.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================================
// QuizController - アプリケーション全体の制御
// ============================================================
class QuizController {
    #isProcessing = false;

    constructor() {
        // Load settings from persistence
        this.lang = localStorage.getItem('quiz_lang') || 'ja';
        this.isQuickMode = localStorage.getItem('quiz_quick_mode') === 'true';

        this.view = new QuizView();
        this.sound = new Sound();
        this.model = null;
        this.timer = null;
        this.gameAbortController = null;
        this.questionCache = {};

        // Reactive State
        this.state = new Proxy({
            score: 0,
            currentIndex: 0,
            combo: 0,
            currentQuestion: null,
            timeLeft: 10
        }, {
            set: (target, prop, value) => {
                target[prop] = value;
                this.view.renderState(prop, value, {
                    lang: this.lang,
                    total: this.model ? this.model.questions.length : 10
                });
                return true;
            }
        });

        this.init();
    }

    // ----------------------------------------------------------
    // 初期化
    // ----------------------------------------------------------
    init() {
        this.syncSettingsUI();
        this.setupEventListeners();

        if (navigator.onLine) this.processOfflineQueue();
        this.applyTranslations();
    }

    /** 保存済みの設定を UI に同期する */
    syncSettingsUI() {
        this.view.els.langSelect.value = this.lang;
        this.view.els.quickModeCheck.checked = this.isQuickMode;
    }

    // ----------------------------------------------------------
    // イベントリスナー登録（init() から分離）
    // ----------------------------------------------------------
    setupEventListeners() {
        // --- ゲーム操作 ---
        document.getElementById('btn-start').addEventListener('click', () => {
            this.sound.init();
            this.startQuiz();
        });

        document.getElementById('btn-view-ranking').addEventListener('click', () => {
            this.sound.init();
            this.openStandaloneRanking();
        });

        document.getElementById('btn-true').addEventListener('click', () => this.handleAnswer(true));
        document.getElementById('btn-false').addEventListener('click', () => this.handleAnswer(false));
        document.getElementById('btn-retry').addEventListener('click', () => this.resetGame());
        document.getElementById('logo-home').addEventListener('click', (e) => {
            e.preventDefault();
            this.resetGame();
        });

        // --- モーダル ---
        document.querySelectorAll('dialog').forEach(dialog => {
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) dialog.close();
            });
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            this.sound.init();
            this.view.els.settingsModal.showModal();
        });

        document.getElementById('btn-close-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('btn-close-ranking').addEventListener('click', () => {
            this.view.els.rankingModal.close();
        });

        this.view.els.rankingDiffSelect.addEventListener('change', () => {
            this.loadStandaloneRanking();
        });
        this.view.els.rankingCatSelect.addEventListener('change', () => {
            this.loadStandaloneRanking();
        });

        document.getElementById('ranking-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRanking();
        });

        // --- ミュート ---
        document.getElementById('btn-mute').addEventListener('click', () => {
            this.sound.init();
            this.sound.isMuted = !this.sound.isMuted;
            this.view.updateMuteUI(this.sound.isMuted);
        });

        // --- キーボード操作 ---
        document.addEventListener('keydown', (e) => {
            if (this.#isProcessing || this.view.els.quizScreen.classList.contains('hidden')) return;
            if (document.activeElement.tagName === 'INPUT') return;
            if (this.view.els.settingsModal.open || this.view.els.rankingModal.open) return;

            if (e.key === 'ArrowLeft') document.getElementById('btn-true').click();
            if (e.key === 'ArrowRight') document.getElementById('btn-false').click();
        });

        // --- グローバルイベント ---
        window.addEventListener('online', () => this.processOfflineQueue());

        window.addEventListener('beforeunload', (e) => {
            if (!this.view.els.quizScreen.classList.contains('hidden')) {
                e.preventDefault();
                e.returnValue = '';
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.timer && this.timer.isRunning) {
                this.handleAnswer(null);
            }
        });
    }

    // ----------------------------------------------------------
    // 設定の保存と適用
    // ----------------------------------------------------------
    saveSettings() {
        this.lang = this.view.els.langSelect.value;
        this.isQuickMode = this.view.els.quickModeCheck.checked;

        localStorage.setItem('quiz_lang', this.lang);
        localStorage.setItem('quiz_quick_mode', this.isQuickMode);

        this.applyTranslations();
        document.documentElement.lang = this.lang;

        // Re-render current question if quiz is active
        if (this.model && this.state.currentQuestion && !this.view.els.quizScreen.classList.contains('hidden')) {
            this.view.renderState('currentQuestion', this.state.currentQuestion, { lang: this.lang });
        }

        this.view.els.settingsModal.close();
    }

    // ----------------------------------------------------------
    // アクセシビリティ：スクリーンリーダー向けアナウンス
    // ----------------------------------------------------------
    announce(msg) {
        const announcer = document.getElementById('announcer');
        if (announcer) {
            announcer.textContent = '';
            setTimeout(() => { announcer.textContent = msg; }, 50);
        }
    }

    // ----------------------------------------------------------
    // ゲーム制御
    // ----------------------------------------------------------
    resetGame() {
        this.sound.init();
        if (this.timer) this.timer.stop();
        if (this.gameAbortController) this.gameAbortController.abort();

        // 状態を初期化
        this.state.score = 0;
        this.state.currentIndex = 0;
        this.state.combo = 0;
        this.model = null;

        // View Transitions を使ってスタート画面へ美しく戻る
        this.view.showScreen('start');
    }

    async startQuiz() {
        if (this.#isProcessing) return;
        this.#isProcessing = true;

        const cat = this.view.els.categorySelect.value;
        const diff = this.view.els.diffSelect.value;

        try {
            if (this.gameAbortController) this.gameAbortController.abort();
            this.gameAbortController = new AbortController();

            let data = this.questionCache[cat];
            if (!data) {
                const res = await fetch(`./js/data/${cat}.json`, {
                    signal: this.gameAbortController.signal
                });
                if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
                data = await res.json();
                data.forEach((q, i) => q.originalIndex = i);
                this.questionCache[cat] = data;
            }
            const filtered = data.filter(q => q.difficulty == diff);

            if (filtered.length === 0) {
                this.#isProcessing = false;
                return this.view.showToast("No questions available!");
            }

            // Use Fisher-Yates for fair shuffle
            const randomized = shuffleArray(filtered).slice(0, CONFIG.QUESTIONS_PER_PLAY);

            this.model = new QuizModel(randomized, diff, cat);
            this.timer = new TimerModel(CONFIG.TIME_LIMIT,
                (timeLeft) => { this.state.timeLeft = timeLeft; },
                () => this.handleAnswer(null)
            );

            // --- Cheat Prevention: Notify server of game start ---
            RankingService.notifyStart();

            this.view.showScreen('quiz');
            this.loadQuestion();
        } catch (err) {
            console.error(err);
            this.view.showToast(TRANSLATIONS[this.lang]['load-error']);
        } finally {
            this.#isProcessing = false;
        }
    }

    loadQuestion() {
        this.state.currentQuestion = this.model.getCurrentQuestion();
        this.state.currentIndex = this.model.currentIndex;
        this.state.score = this.model.score;
        this.state.combo = this.model.combo;
        this.timer.start();

        const qNumMsg = TRANSLATIONS[this.lang]['question-num'].replace('{0}', this.model.currentIndex + 1);
        this.announce(qNumMsg);
    }

    handleAnswer(ans) {
        if (this.#isProcessing || (!this.timer.isRunning && ans !== null)) return;
        this.#isProcessing = true;
        this.timer.stop();

        const isCorrect = this.model.submitAnswer(ans, this.state.timeLeft);
        this.state.combo = this.model.combo;
        this.view.flash(isCorrect ? 'success' : 'error');

        this.announce(TRANSLATIONS[this.lang][isCorrect ? 'correct-msg' : 'wrong-msg']);

        // Haptic Feedback (Vibration)
        if ('vibrate' in navigator) {
            if (isCorrect) navigator.vibrate(20);
            else navigator.vibrate([100, 30, 100]);
        }

        if (isCorrect) this.sound.correct();
        else this.sound.wrong();

        setTimeout(() => {
            if (this.model.next()) {
                this.loadQuestion();
                this.#isProcessing = false;
            } else {
                this.showResult();
                this.#isProcessing = false;
            }
        }, this.isQuickMode ? 0 : 1000);
    }

    showResult() {
        const score = this.model.score;
        this.state.score = score;

        // High Score Management
        const storageKey = `high_score_${this.model.diff}`;
        let highScore = parseInt(localStorage.getItem(storageKey) || '0');
        if (score > highScore) {
            highScore = score;
            localStorage.setItem(storageKey, highScore.toString());
        }

        const correctCount = this.model.questions.length - this.model.mistakes.length;
        this.view.showResult(score, this.model.mistakes, this.lang, highScore, correctCount);

        // 全問正解なら花吹雪（confetti）を飛ばす
        if (this.model.mistakes.length === 0 && typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#70D6FF', '#FF70A6', '#FFD670', '#ffffff']
            });
        }

        this.loadRanking();
    }

    // ----------------------------------------------------------
    // ランキング
    // ----------------------------------------------------------
    async submitRanking() {
        const name = this.view.els.playerName.value || 'Anonymous';
        const payload = {
            name,
            score: this.model.score,
            diff: this.model.diff,
            category: this.model.category,
            results: this.model.results
        };

        // Offline Queueing
        if (!navigator.onLine) {
            this.queueOfflineScore(payload);
            this.view.showToast(TRANSLATIONS[this.lang]['offline-msg']);
            this.view.els.rankingForm.style.display = 'none';
            return;
        }

        const btn = document.getElementById('btn-submit-score');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = TRANSLATIONS[this.lang]['submitting'];

        try {
            const res = await RankingService.sendRankingRequest(payload);
            const data = await res.json();
            if (data.rank) {
                localStorage.setItem(`rank_diff_${this.model.diff}`, data.rank);
                this.view.els.yourRankDisplay.textContent = `${TRANSLATIONS[this.lang]['your-rank-label']}: ${data.rank}`;
            }
            this.view.els.rankingForm.style.display = 'none';
            this.loadRanking();
        } catch (e) {
            console.error('Submit failed', e);
            this.view.showToast("Ranking submission failed. Queuing for later.");
            this.queueOfflineScore(payload);
            this.view.els.rankingForm.style.display = 'none';
            this.loadRanking();
        }
    }

    queueOfflineScore(payload) {
        const queue = JSON.parse(localStorage.getItem('quiz_offline_queue') || '[]');
        queue.push(payload);
        localStorage.setItem('quiz_offline_queue', JSON.stringify(queue));
    }

    async processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('quiz_offline_queue') || '[]');
        if (queue.length === 0) return;

        const remaining = [];
        for (const payload of queue) {
            try {
                await RankingService.sendRankingRequest(payload);
            } catch (e) {
                remaining.push(payload);
            }
        }
        localStorage.setItem('quiz_offline_queue', JSON.stringify(remaining));
        if (remaining.length === 0) console.log('Offline queue processed successfully.');
    }

    async loadRanking() {
        try {
            const data = await RankingService.loadRanking(this.model.diff, this.model.category);
            this.view.renderRanking('rankingList', data, this.lang);
            this.view.els.rankingBoard.classList.remove('hidden');
        } catch (e) {
            this.view.renderRanking('rankingList', [], this.lang);
        }
    }

    async openStandaloneRanking() {
        // Set defaults to 'Overall' when opening
        this.view.els.rankingDiffSelect.value = 'all';
        this.view.els.rankingCatSelect.value = 'all';
        this.view.els.rankingModal.showModal();
        this.loadStandaloneRanking();
    }

    async loadStandaloneRanking() {
        const diff = this.view.els.rankingDiffSelect.value;
        const cat = this.view.els.rankingCatSelect.value;
        const savedRank = localStorage.getItem(`rank_diff_${diff}`);
        if (savedRank && cat === 'all') { // Simplified: only show saved rank for 'all' categories of that diff
            this.view.els.standaloneYourRank.classList.remove('hidden');
            this.view.els.myRankVal.textContent = savedRank;
        } else {
            this.view.els.standaloneYourRank.classList.add('hidden');
        }

        try {
            const data = await RankingService.loadRanking(diff, cat);
            this.view.renderRanking('standaloneRankingList', data, this.lang);
        } catch (e) {
            this.view.renderRanking('standaloneRankingList', [], this.lang);
        }
    }

    // ----------------------------------------------------------
    // 多言語（i18n）
    // ----------------------------------------------------------
    applyTranslations() {
        const t = TRANSLATIONS[this.lang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.textContent = t[key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (t[key]) el.placeholder = t[key];
        });
    }
}

// ============================================================
// Bootstrap
// ============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new QuizController());
} else {
    // 既にDOMが読み込み終わっている場合は即座に実行
    new QuizController();
}
