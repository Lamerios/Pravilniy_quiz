class QuizGame {
    constructor() {
        this.questions = [
            {
                question: "Какая столица России?",
                answers: ["Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург"],
                correct: 0
            },
            {
                question: "Сколько планет в Солнечной системе?",
                answers: ["7", "8", "9", "10"],
                correct: 1
            },
            {
                question: "Кто написал роман 'Война и мир'?",
                answers: ["Достоевский", "Толстой", "Чехов", "Тургенев"],
                correct: 1
            },
            {
                question: "Какая формула воды?",
                answers: ["H2O", "CO2", "O2", "H2SO4"],
                correct: 0
            },
            {
                question: "В каком году был основан Санкт-Петербург?",
                answers: ["1700", "1703", "1710", "1720"],
                correct: 1
            }
        ];
        
        this.currentQuestion = 0;
        this.score = 0;
        this.selectedAnswer = null;
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        this.startScreen = document.getElementById('start-screen');
        this.quizScreen = document.getElementById('quiz-screen');
        this.resultScreen = document.getElementById('result-screen');
        
        this.startBtn = document.getElementById('start-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.restartBtn = document.getElementById('restart-btn');
        
        this.questionNumber = document.getElementById('question-number');
        this.scoreElement = document.getElementById('score');
        this.questionText = document.getElementById('question-text');
        this.answersContainer = document.getElementById('answers-container');
        this.finalScore = document.getElementById('final-score');
        this.percentage = document.getElementById('percentage');
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startQuiz());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.restartBtn.addEventListener('click', () => this.restartQuiz());
    }
    
    startQuiz() {
        this.currentQuestion = 0;
        this.score = 0;
        this.showScreen('quiz');
        this.loadQuestion();
    }
    
    showScreen(screenName) {
        this.startScreen.classList.add('hidden');
        this.quizScreen.classList.add('hidden');
        this.resultScreen.classList.add('hidden');
        
        switch(screenName) {
            case 'start':
                this.startScreen.classList.remove('hidden');
                break;
            case 'quiz':
                this.quizScreen.classList.remove('hidden');
                break;
            case 'result':
                this.resultScreen.classList.remove('hidden');
                break;
        }
    }
    
    loadQuestion() {
        const question = this.questions[this.currentQuestion];
        
        this.questionNumber.textContent = `Вопрос ${this.currentQuestion + 1} из ${this.questions.length}`;
        this.scoreElement.textContent = `Счет: ${this.score}`;
        this.questionText.textContent = question.question;
        
        this.answersContainer.innerHTML = '';
        this.selectedAnswer = null;
        this.nextBtn.classList.add('hidden');
        
        question.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.className = 'answer-btn';
            button.textContent = answer;
            button.addEventListener('click', () => this.selectAnswer(index, button));
            this.answersContainer.appendChild(button);
        });
    }
    
    selectAnswer(answerIndex, buttonElement) {
        if (this.selectedAnswer !== null) return;
        
        this.selectedAnswer = answerIndex;
        
        // Убираем выделение с других кнопок
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Выделяем выбранную кнопку
        buttonElement.classList.add('selected');
        
        // Проверяем правильность ответа
        const question = this.questions[this.currentQuestion];
        const isCorrect = answerIndex === question.correct;
        
        if (isCorrect) {
            this.score++;
            buttonElement.classList.add('correct');
        } else {
            buttonElement.classList.add('incorrect');
            // Показываем правильный ответ
            document.querySelectorAll('.answer-btn')[question.correct].classList.add('correct');
        }
        
        // Показываем кнопку "Следующий вопрос"
        this.nextBtn.classList.remove('hidden');
        
        // Обновляем счет
        this.scoreElement.textContent = `Счет: ${this.score}`;
        
        // Блокируем все кнопки ответов
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.disabled = true;
        });
    }
    
    nextQuestion() {
        this.currentQuestion++;
        
        if (this.currentQuestion < this.questions.length) {
            this.loadQuestion();
        } else {
            this.showResults();
        }
    }
    
    showResults() {
        const percentage = Math.round((this.score / this.questions.length) * 100);
        
        this.finalScore.textContent = `Ваш счет: ${this.score} из ${this.questions.length}`;
        this.percentage.textContent = `${percentage}%`;
        
        this.showScreen('result');
    }
    
    restartQuiz() {
        this.showScreen('start');
    }
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new QuizGame();
});
