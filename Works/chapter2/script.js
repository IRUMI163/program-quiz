const questions = document.getElementById('question');
const resultElem = document.getElementById('result');
const btnTrue = document.getElementById('btnTrue');
const btnFalse = document.getElementById('btnFalse');
const scoreDisplay = document.getElementById('score-display');
const questionNumberElem = document.getElementById('question-number');
let currentQuestion = 0;
let score = 0;

const quizData = [
    { question: "JavaScriptでWebページに動きをつけられる。", answer: true },
    { question: "<h1>は最も小さな見出しである。", answer: false },
    { question: "CSSはプログラミング言語である。", answer: false },
    { question: "Webページの見た目はHTML・CSS・JavaScriptで構成される。", answer: true }
];

function updateQuestionNumber() {
    if (currentQuestion < quizData.length) {
        questionNumberElem.textContent = `第${currentQuestion + 1}問`;
    } else {
        questionNumberElem.textContent = 'クイズ終了！';
    }
}

function showQuiz() {
    updateQuestionNumber();
    
    if (currentQuestion < quizData.length) {
        questions.textContent = quizData[currentQuestion].question;
        resultElem.textContent = '結果がここに表示されます';
        btnTrue.disabled = false;
        btnFalse.disabled = false;
    } else {
        questions.textContent = `あなたの成績: ${quizData.length}問中 ${score}問 正解✅`;
        resultElem.textContent = '';
        btnTrue.disabled = true;
        btnFalse.disabled = true;
    }
}

function checkAnswer(userAnswer) {
    if (quizData[currentQuestion].answer === userAnswer) {
        score++;
        resultElem.textContent = '正解！';
    } else {
        resultElem.textContent = '不正解...';
    }
    
    currentQuestion++;
    scoreDisplay.textContent = `正解数: ${score}`;
    btnTrue.disabled = true;
    btnFalse.disabled = true;
    
    setTimeout(showQuiz, 1000);
}

btnTrue.addEventListener('click', function() {
    checkAnswer(true);
});

btnFalse.addEventListener('click', function() {
    checkAnswer(false);
});

showQuiz();