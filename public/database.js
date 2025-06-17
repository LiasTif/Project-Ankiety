class QuizDatabase {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
    }

    async createQuiz(quizData) {
        const response = await fetch(`${this.baseUrl}/quizzes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quizData)
        });
        if (!response.ok) throw new Error('Błąd przy tworzeniu quizu');
        return await response.json();
    }

    async getQuiz(id) {
        const response = await fetch(`${this.baseUrl}/quizzes/${id}`);
        if (!response.ok) return null;
        return await response.json();
    }

    async getAllQuizzes() {
        const response = await fetch(`${this.baseUrl}/quizzes`);
        if (!response.ok) return [];
        return await response.json();
    }

    async deleteQuiz(id) {
        const response = await fetch(`${this.baseUrl}/quizzes/${id}`, { method: 'DELETE' });
        if (!response.ok) return false;
        const result = await response.json();
        return result.success;
    }

    async saveResult(resultData) {
        const response = await fetch(`${this.baseUrl}/results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        });
        if (!response.ok) throw new Error('Błąd przy zapisywaniu wyniku');
        return await response.json();
    }

    async getQuizResults(quizId) {
        const response = await fetch(`${this.baseUrl}/results/${quizId}`);
        if (!response.ok) return [];
        return await response.json();
    }

    async getQuizStatistics(quizId) {
        const response = await fetch(`${this.baseUrl}/stats/${quizId}`);
        if (!response.ok) return null;
        return await response.json();
    }

    validateQuizData(quizData) {
        const errors = [];
        
        if (!quizData.title || quizData.title.trim().length < 3) {
            errors.push("Tytuł musi mieć co najmniej 3 znaki");
        }
        
        if (!quizData.questions || quizData.questions.length === 0) {
            errors.push("Quiz musi zawierać co najmniej jedno pytanie");
        }
        
        quizData.questions?.forEach((question, index) => {
            if (!question.text || question.text.trim().length < 5) {
                errors.push(`Pytanie ${index + 1}: Tekst pytania musi mieć co najmniej 5 znaków`);
            }
            
            if (!question.options || question.options.length < 2) {
                errors.push(`Pytanie ${index + 1}: Musi mieć co najmniej 2 opcje odpowiedzi`);
            }
            
            if (!quizData.isAnkieta && (question.correctAnswers === null || question.correctAnswers === undefined)) {
                errors.push(`Pytanie ${index + 1}: Brak wybranej poprawnej odpowiedzi`);
            }
        });
        
        return errors;
    }
}

const quizDB = new QuizDatabase();