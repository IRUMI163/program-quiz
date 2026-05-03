import { escapeHTML } from './utils.js';

export class QuizView {
    constructor() {
        this.els = {
            startScreen: document.getElementById('start-screen'),
            quizScreen: document.getElementById('quiz-screen'),
            resultScreen: document.getElementById('result-screen'),
            qText: document.getElementById('question-text'),
            qCount: document.getElementById('question-count'),
            scoreDisplay: document.getElementById('score-display'),
            finalScore: document.getElementById('final-score'),
            correctCount: document.getElementById('correct-count'),
            quizTimer: document.getElementById('quiz-timer'),
            playerName: document.getElementById('player-name'),
            rankingForm: document.getElementById('ranking-form'),
            rankingBoard: document.getElementById('ranking-board'),
            rankingList: document.getElementById('ranking-list'),
            yourRankDisplay: document.getElementById('your-rank-display'),
            reviewList: document.getElementById('review-list'),
            announcer: document.getElementById('announcer'),
            flashOverlay: document.getElementById('flash-overlay'),
            settingsModal: document.getElementById('settings-modal'),
            rankingModal: document.getElementById('standalone-ranking-modal'),
            categorySelect: document.getElementById('category-select'),
            diffSelect: document.getElementById('difficulty-select'),
            langSelect: document.getElementById('lang-select'),
            rankingDiffSelect: document.getElementById('ranking-diff-select'),
            quickModeCheck: document.getElementById('quick-mode-check'),
            muteIconPath: document.querySelector('#icon-mute path'),
            standaloneRankingList: document.getElementById('standalone-ranking-list'),
            standaloneYourRank: document.getElementById('standalone-your-rank'),
            myRankVal: document.getElementById('my-rank-val'),
            highScoreDisplay: document.getElementById('high-score-display'),
            comboDisplay: document.getElementById('combo-display'),
            progressBar: document.getElementById('progress-bar'),
            toastContainer: document.getElementById('toast-container')
        };
    }

    /**
     * Displays a temporary toast notification.
     */
    showToast(message) {
        if (!this.els.toastContainer) return;
        const toast = document.createElement('toast-notification');
        toast.setAttribute('message', message);
        this.els.toastContainer.appendChild(toast);
        
        // Trigger reflow for transition
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    /**
     * Updates the UI based on state changes.
     */
    renderState(prop, value, extra = {}) {
        switch (prop) {
            case 'score':
                this.els.scoreDisplay.textContent = value;
                this.els.finalScore.textContent = value;
                break;
            case 'currentIndex':
                const total = extra.total || 10;
                this.els.qCount.textContent = `Q: ${value + 1}/${total}`;
                if (this.els.progressBar) this.els.progressBar.style.width = `${(value / total) * 100}%`;
                break;
            case 'combo':
                if (this.els.comboDisplay) {
                    if (value > 1) {
                        this.els.comboDisplay.textContent = `${value} COMBO!`;
                        this.els.comboDisplay.classList.remove('hidden');
                    } else {
                        this.els.comboDisplay.classList.add('hidden');
                    }
                }
                break;
            case 'currentQuestion':
                if (value) {
                    this.els.qText.textContent = value.text[extra.lang || 'ja'];
                    this.announce(value.text[extra.lang || 'ja']);
                }
                break;
            case 'timeLeft':
                this.els.quizTimer.setAttribute('value', value);
                break;
        }
    }

    /**
     * Screen switching with View Transitions API support.
     */
    showScreen(name) {
        if (!document.startViewTransition) {
            this._switchScreenDom(name);
            return;
        }
        document.startViewTransition(() => this._switchScreenDom(name));
    }

    _switchScreenDom(name) {
        [this.els.startScreen, this.els.quizScreen, this.els.resultScreen].forEach(s => s.classList.add('hidden'));
        const target = this.els[`${name}Screen`];
        if (target) {
            target.classList.remove('hidden');
            this.announce(name === 'quiz' ? 'Quiz started' : `${name} screen loaded`);
        }
    }

    announce(text, assertive = false) {
        if (!this.els.announcer) return;
        this.els.announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
        this.els.announcer.textContent = text;
    }

    flash(type) {
        if (!this.els.flashOverlay) return;
        this.els.flashOverlay.setAttribute('type', type);
        this.announce(type === 'success' ? 'Correct!' : 'Incorrect!', true);
        setTimeout(() => {
            if (this.els.flashOverlay) this.els.flashOverlay.setAttribute('type', 'none');
        }, 1000);
    }

    showResult(score, mistakes, lang, highScore, correctCount) {
        this.els.finalScore.textContent = score;
        if (this.els.correctCount) this.els.correctCount.textContent = correctCount;
        if (this.els.highScoreDisplay) this.els.highScoreDisplay.textContent = highScore;
        this.els.rankingForm.style.display = 'block';
        this.els.rankingBoard.classList.add('hidden');
        
        this.els.reviewList.innerHTML = mistakes.map(m => `
            <div class="mb-16 border-top" style="padding-top:8px;">
                <strong class="color-sub">× ${escapeHTML(m.text[lang])}</strong><br>
                <small>${escapeHTML(m.exp[lang])}</small>
            </div>
        `).join('');
        this.showScreen('result');
    }

    renderRanking(containerKey, data, lang) {
        const list = this.els[containerKey];
        if (!list) return;
        list.lang = lang;
        list.data = data;
    }

    updateMuteUI(isMuted) {
        if (!this.els.muteIconPath) return;
        const d = isMuted 
            ? "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
            : "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z";
        this.els.muteIconPath.setAttribute('d', d);
    }
}