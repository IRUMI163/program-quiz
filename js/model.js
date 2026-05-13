export class QuizModel {
    #questions;
    #diff;
    #category;
    #currentIndex = 0;
    #score = 0;
    #combo = 0;
    #mistakes = [];
    #results = [];

    constructor(questions, diff, category) {
        this.#questions = questions;
        this.#diff = diff;
        this.#category = category;
    }

    get currentIndex() { return this.#currentIndex; }
    get score() { return this.#score; }
    get combo() { return this.#combo; }
    get questions() { return this.#questions; }
    get mistakes() { return this.#mistakes; }
    get diff() { return this.#diff; }
    get category() { return this.#category; }
    get results() { return this.#results; }

    getCurrentQuestion() {
        return this.#questions[this.#currentIndex];
    }

    submitAnswer(ans, timeLeft) {
        const q = this.getCurrentQuestion();
        const isCorrect = (ans === q.answer);
        
        this.#results.push({
            index: q.originalIndex,
            answer: ans,
            timeLeft: timeLeft
        });

        if (isCorrect) {
            this.#combo++;
            const multipliers = { 1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0, 5: 3.0 };
            const m = multipliers[this.#diff] || 1.0;
            const points = Math.floor((100 + timeLeft * 10 + (this.#combo > 1 ? this.#combo * 10 : 0)) * m);
            this.#score += points;
        } else {
            this.#combo = 0;
            this.#mistakes.push(q);
        }
        return isCorrect;
    }

    next() {
        this.#currentIndex++;
        return this.#currentIndex < this.#questions.length;
    }
}

export class TimerModel {
    #duration;
    #timeLeft;
    #onTick;
    #onComplete;
    #startTime = 0;
    #rafId = null;
    #isRunning = false;

    constructor(duration, onTick, onComplete) {
        this.#duration = duration;
        this.#timeLeft = duration;
        this.#onTick = onTick;
        this.#onComplete = onComplete;
    }

    get timeLeft() { return this.#timeLeft; }
    get isRunning() { return this.#isRunning; }

    start() {
        this.stop();
        this.#isRunning = true;
        this.#startTime = performance.now();
        this.loop();
    }

    loop() {
        if (!this.#isRunning) return;

        const now = performance.now();
        const elapsed = (now - this.#startTime) / 1000;
        this.#timeLeft = Math.max(0, this.#duration - elapsed);

        this.#onTick(this.#timeLeft);

        if (this.#timeLeft <= 0) {
            this.#isRunning = false;
            this.#onComplete();
        } else {
            this.#rafId = requestAnimationFrame(() => this.loop());
        }
    }

    stop() {
        this.#isRunning = false;
        if (this.#rafId) {
            cancelAnimationFrame(this.#rafId);
            this.#rafId = null;
        }
    }
}
