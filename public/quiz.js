class QuizManager {
    constructor() {
        this.currentQuiz = null;
        this.currentQuestion = 0;
        this.userAnswers = [];
        this.participantInfo = {};
    }

    async createQuiz(formData) {
        const quizData = {
            title: formData.title,
            description: formData.description,
            isAnkieta: formData.isAnkieta,
            questions: formData.questions
        };

        const errors = quizDB.validateQuizData(quizData);
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }

        return await quizDB.createQuiz(quizData);
    }

    async startQuiz(quizId) {
        this.currentQuiz = await quizDB.getQuiz(quizId);
        if (!this.currentQuiz) {
            throw new Error('Quiz nie został znaleziony');
        }
        
        if (!this.currentQuiz.questions) {
            this.currentQuiz.questions = [];
        }
        
        this.currentQuestion = 0;
        this.userAnswers = new Array(this.currentQuiz.questions.length).fill(null);
        this.participantInfo = {};
        
        return this.currentQuiz;
    }

    setParticipantInfo(name, email = '') {
        this.participantInfo = {
            name: name.trim(),
            email: email.trim()
        };
    }

    getCurrentQuestion() {
        if (!this.currentQuiz || !this.currentQuiz.questions || this.currentQuestion >= this.currentQuiz.questions.length) {
            return null;
        }
        
        return {
            question: this.currentQuiz.questions[this.currentQuestion],
            questionNumber: this.currentQuestion + 1,
            totalQuestions: this.currentQuiz.questions.length,
            isLast: this.currentQuestion === this.currentQuiz.questions.length - 1
        };
    }

    answerQuestion(answer) {
        if (!this.currentQuiz || !this.currentQuiz.questions || this.currentQuestion >= this.currentQuiz.questions.length) {
            throw new Error('Brak aktywnego pytania');
        }

        this.userAnswers[this.currentQuestion] = answer;
    }

    nextQuestion() {
        if (!this.currentQuiz || !this.currentQuiz.questions) {
            throw new Error('Brak aktywnego quizu');
        }
        
        if (this.currentQuestion < this.currentQuiz.questions.length - 1) {
            this.currentQuestion++;
            return true;
        }
        return false;
    }

    previousQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            return true;
        }
        return false;
    }

    calculateScore() {
        if (!this.currentQuiz || !this.currentQuiz.questions || this.currentQuiz.isAnkieta) {
            return 0;
        }

        let score = 0;
        
        this.currentQuiz.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            const correctAnswer = question.correctAnswers;
            
            if (question.type === 'single') {
                if (userAnswer === correctAnswer) {
                    score++;
                }
            } else if (question.type === 'multiple') {
                if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
                    const userSet = new Set(userAnswer);
                    const correctSet = new Set(correctAnswer);
                    
                    if (userSet.size === correctSet.size && 
                        [...userSet].every(answer => correctSet.has(answer))) {
                        score++;
                    }
                }
            }
        });
        
        return score;
    }

    async submitQuiz() {
        if (!this.currentQuiz) {
            throw new Error('Brak aktywnego quizu');
        }
        
        if (!this.participantInfo.name) {
            throw new Error('Brak informacji o uczestniku');
        }

        if (!this.currentQuiz.questions) {
            this.currentQuiz.questions = [];
        }

        const unansweredQuestions = this.userAnswers.some(answer => answer === null);
        if (unansweredQuestions) {
            throw new Error('Wszystkie pytania muszą być odpowiedziane');
        }

        const score = this.calculateScore();
        
        const result = await quizDB.saveResult({
            quizId: this.currentQuiz.id,
            participantName: this.participantInfo.name,
            participantEmail: this.participantInfo.email,
            answers: this.userAnswers,
            score: score,
            totalQuestions: this.currentQuiz.questions.length
        });

        this.currentQuiz = null;
        this.currentQuestion = 0;
        this.userAnswers = [];
        this.participantInfo = {};

        return result;
    }

    getUserAnswer(questionIndex) {
        return this.userAnswers[questionIndex];
    }
}

const quizManager = new QuizManager();