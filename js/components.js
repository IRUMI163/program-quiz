import { escapeHTML } from './utils.js';

class QuizTimer extends HTMLElement {
    static get observedAttributes() { return ['value', 'duration']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._isRendered = false;
    }

    attributeChangedCallback() {
        if (!this._isRendered) return;
        this.updateValue();
    }

    connectedCallback() {
        this.render();
        this._isRendered = true;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; position: relative; width: 60px; height: 60px; }
                svg { width: 100%; height: 100%; }
                .bg { fill: none; stroke: rgba(112, 214, 255, 0.1); stroke-width: 6; }
                .progress { 
                    fill: none; stroke: #70D6FF; stroke-width: 6; 
                    stroke-dasharray: 283; 
                    transform: rotate(-90deg); transform-origin: 50% 50%; 
                }
                .text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: 900; font-family: inherit; font-size: 1.2rem; color: var(--text, #334155); }
            </style>
            <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" class="bg" />
                <circle cx="50" cy="50" r="45" class="progress" id="progress-circle" />
            </svg>
            <span class="text" id="timer-text"></span>
        `;
        this.progressCircle = this.shadowRoot.getElementById('progress-circle');
        this.timerText = this.shadowRoot.getElementById('timer-text');
        this.updateValue();
    }

    updateValue() {
        const val = parseFloat(this.getAttribute('value') || 10);
        const dur = parseFloat(this.getAttribute('duration') || 10);
        const offset = 283 - (val / dur) * 283;
        if (this.progressCircle) this.progressCircle.style.strokeDashoffset = offset;
        if (this.timerText) this.timerText.textContent = Math.ceil(val);
    }
}
customElements.define('quiz-timer', QuizTimer);

class RankingList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._data = [];
        this._lang = 'ja';
    }

    set data(val) {
        this._data = val;
        this.render();
    }

    set lang(val) {
        this._lang = val;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const msg = this._data && this._data.length > 0 ? '' : (this._lang === 'ja' ? 'データがありません' : 'No ranking data');
        
        this.shadowRoot.innerHTML = `
            <style>
                :host { 
                    display: block; 
                    width: 100%; 
                    box-sizing: border-box;
                    overflow-x: hidden;
                    color: var(--text, #334155);
                }
                *, *::before, *::after {
                    box-sizing: border-box;
                }
                ul { list-style: none; padding: 0; margin: 0; width: 100%; color: inherit; }
                .ranking-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid rgba(112, 214, 255, 0.1);
                    animation: slideIn 0.3s ease-out forwards;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .flex { display: flex; align-items: center; }
                .gap-8 { gap: 0.5rem; }
                .font-black { font-weight: 900; }
                .text-center { text-align: center; }
                .empty-msg { text-align: center; padding: 1rem; color: #94a3b8; }
            </style>
            <ul>
                ${msg ? `<li class="empty-msg">${msg}</li>` : this._data.map((r, i) => {
                    const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
                    return `
                        <li class="ranking-item">
                            <span class="flex gap-8">
                                <span style="width:25px;" class="font-black text-center">${rankLabel}</span>
                                <div style="display:flex; flex-direction:column;">
                                    <span>${escapeHTML(r.player_name)}</span>
                                    <small style="font-size:0.65rem; opacity:0.6;">${r.category ? r.category.toUpperCase() : ''} / Lv.${r.difficulty || '-'}</small>
                                </div>
                            </span>
                            <span class="font-black" style="color:var(--primary, #70D6FF);">${r.score} <small style="font-size:0.6rem; opacity:0.8;">pts</small></span>
                        </li>
                    `;
                }).join('')}
            </ul>
        `;
    }
}
customElements.define('ranking-list', RankingList);

class AnswerFeedback extends HTMLElement {
    static get observedAttributes() { return ['type']; }

    constructor() {
        super();
        this.className = 'flash-overlay';
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (newVal === 'success') this.classList.add('success');
        else if (newVal === 'error') this.classList.add('error');
        else {
            this.classList.remove('success');
            this.classList.remove('error');
        }
    }
}
customElements.define('answer-feedback', AnswerFeedback);

class ToastNotification extends HTMLElement {
    static get observedAttributes() { return ['message']; }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const msg = this.getAttribute('message') || '';
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%) translateY(100px);
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    color: #f8fafc;
                    padding: 12px 24px;
                    border-radius: 999px;
                    font-size: 0.9rem;
                    font-weight: bold;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    opacity: 0;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    z-index: 9999;
                    pointer-events: none;
                }
                :host(.show) {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            </style>
            ${escapeHTML(msg)}
        `;
    }
}
customElements.define('toast-notification', ToastNotification);
