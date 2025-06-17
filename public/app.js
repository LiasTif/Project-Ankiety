class QuizPlatformApp {
    constructor() {
        this.currentPage = 'home';
        this.currentQuestionIndex = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadHomePage();
    }

    bindEvents() {
        document.getElementById('homeBtn').addEventListener('click', () => this.showPage('home'));
        document.getElementById('createBtn').addEventListener('click', () => this.showPage('create'));
        document.getElementById('statsBtn').addEventListener('click', () => this.showPage('stats'));
        document.getElementById('addQuestionBtn').addEventListener('click', () => this.addQuestion());
        document.getElementById('quizForm').addEventListener('submit', (e) => this.handleQuizSubmit(e));
        document.getElementById('isAnkieta').addEventListener('change', (e) => this.toggleSurveyMode(e));
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(pageId + 'Page').classList.add('active');
        document.getElementById(pageId + 'Btn').classList.add('active');
        this.currentPage = pageId;

        switch(pageId) {
            case 'home': this.loadHomePage(); break;
            case 'create': this.loadCreatePage(); break;
            case 'stats': this.loadStatsPage(); break;
        }
    }

    async loadHomePage() {
        const container = document.getElementById('quizListContainer');
        try {
            const quizzes = await quizDB.getAllQuizzes();
            
            if (quizzes.length === 0) {
                container.innerHTML = '<p class="no-quizzes">Brak dostępnych quizów. Utwórz pierwszy quiz!</p>';
                return;
            }

            let html = '';
            quizzes.forEach(quiz => {
                const typeLabel = quiz.isAnkieta ? 'Ankieta' : 'Quiz';
                const questionCount = quiz.questions.length;
                
                html += `
                    <div class="quiz-card">
                        <h4>${quiz.title}</h4>
                        <p>${quiz.description || 'Brak opisu'}</p>
                        <div class="quiz-meta">
                            <span>Typ: ${typeLabel}</span>
                            <span>Pytania: ${questionCount}</span>
                            <span>Uczestnicy: ${quiz.totalParticipants}</span>
                        </div>
                        <div class="quiz-actions">
                            <button class="btn-primary" onclick="app.startQuiz(${quiz.id})">
                                ${quiz.isAnkieta ? 'Wypełnij Ankietę' : 'Rozpocznij Quiz'}
                            </button>
                            <button class="btn-secondary" onclick="app.viewStats(${quiz.id})">Statystyki</button>
                            <button class="btn-danger" onclick="app.deleteQuiz(${quiz.id})">Usuń</button>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p class="no-quizzes">Błąd przy ładowaniu quizów</p>';
        }
    }

    loadCreatePage() {
        document.getElementById('quizForm').reset();
        document.getElementById('questionsContainer').innerHTML = '<h3>Pytania</h3>';
        this.currentQuestionIndex = 0;
        this.addQuestion();
    }

    async loadStatsPage() {
        const container = document.getElementById('statsContainer');
        try {
            const quizzes = await quizDB.getAllQuizzes();
            
            if (quizzes.length === 0) {
                container.innerHTML = '<p class="no-quizzes">Brak quizów do wyświetlenia statystyk.</p>';
                return;
            }

            let html = '<h3>Wybierz quiz do wyświetlenia statystyk:</h3>';
            quizzes.forEach(quiz => {
                html += `
                    <div class="quiz-card">
                        <h4>${quiz.title}</h4>
                        <div class="quiz-meta">
                            <span>Uczestnicy: ${quiz.totalParticipants}</span>
                            <span>Utworzony: ${new Date(quiz.createdAt).toLocaleDateString('pl-PL')}</span>
                        </div>
                        <button class="btn-primary" onclick="app.showDetailedStats(${quiz.id})">
                            Pokaż Szczegóły
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p class="no-quizzes">Błąd przy ładowaniu statystyk</p>';
        }
    }

    addQuestion() {
        const container = document.getElementById('questionsContainer');
        const questionNumber = this.currentQuestionIndex + 1;
        const isAnkieta = document.getElementById('isAnkieta').checked;
        
        const questionHtml = `
            <div class="question-item" data-question-index="${this.currentQuestionIndex}">
                <div class="question-header">
                    <span class="question-number">Pytanie ${questionNumber}</span>
                    <button type="button" class="btn-danger" onclick="app.removeQuestion(${this.currentQuestionIndex})">
                        Usuń
                    </button>
                </div>
                
                <div class="form-group">
                    <label>Treść pytania:</label>
                    <input type="text" class="question-text" required placeholder="Wprowadź pytanie">
                </div>
                
                <div class="form-group">
                    <label>Typ pytania:</label>
                    <select class="question-type" onchange="app.updateQuestionType(${this.currentQuestionIndex}, this.value)">
                        <option value="single">Pojedynczy wybór</option>
                        <option value="multiple">Wielokrotny wybór</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Opcje odpowiedzi:</label>
                    <div class="answer-options">
                        <div class="answer-option">
                            <input type="radio" name="correct_${this.currentQuestionIndex}" value="0" ${isAnkieta ? 'style="display:none"' : ''} style="width: 20px; height: 20px; margin-right: 0.5rem; flex-shrink: 0;">
                            <input type="text" class="option-text" placeholder="Opcja 1" required style="flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem;">
                        </div>
                        <div class="answer-option">
                            <input type="radio" name="correct_${this.currentQuestionIndex}" value="1" ${isAnkieta ? 'style="display:none"' : ''} style="width: 20px; height: 20px; margin-right: 0.5rem; flex-shrink: 0;">
                            <input type="text" class="option-text" placeholder="Opcja 2" required style="flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem;">
                        </div>
                    </div>
                    <button type="button" class="btn-secondary" onclick="app.addOption(${this.currentQuestionIndex})">
                        + Dodaj Opcję
                    </button>
                    ${!isAnkieta ? '<p><small>Zaznacz poprawną odpowiedź</small></p>' : ''}
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', questionHtml);
        this.currentQuestionIndex++;
    }

    removeQuestion(questionIndex) {
        const questionElement = document.querySelector(`[data-question-index="${questionIndex}"]`);
        if (questionElement) {
            questionElement.remove();
        }
    }

    addOption(questionIndex) {
        const questionElement = document.querySelector(`[data-question-index="${questionIndex}"]`);
        const optionsContainer = questionElement.querySelector('.answer-options');
        const optionCount = optionsContainer.children.length;
        const isAnkieta = document.getElementById('isAnkieta').checked;
        const questionType = questionElement.querySelector('.question-type').value;
        
        const inputType = questionType === 'multiple' ? 'checkbox' : 'radio';
        const inputName = questionType === 'multiple' ? `correct_${questionIndex}_${optionCount}` : `correct_${questionIndex}`;
        
        const optionHtml = `
            <div class="answer-option">
                <input type="${inputType}" name="${inputName}" value="${optionCount}" ${isAnkieta ? 'style="display:none"' : ''} style="width: 20px; height: 20px; margin-right: 0.5rem; flex-shrink: 0;">
                <input type="text" class="option-text" placeholder="Opcja ${optionCount + 1}" required style="flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 0.5rem;">
                <button type="button" class="btn-danger" onclick="this.parentElement.remove()">Usuń</button>
            </div>
        `;
        
        optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
    }

    updateQuestionType(questionIndex, type) {
        const questionElement = document.querySelector(`[data-question-index="${questionIndex}"]`);
        const optionsContainer = questionElement.querySelector('.answer-options');
        const isAnkieta = document.getElementById('isAnkieta').checked;
        
        optionsContainer.querySelectorAll('.answer-option').forEach((option, index) => {
            const input = option.querySelector('input[type="radio"], input[type="checkbox"]');
            if (input && !isAnkieta) {
                const newInput = document.createElement('input');
                newInput.type = type === 'multiple' ? 'checkbox' : 'radio';
                newInput.name = type === 'multiple' ? `correct_${questionIndex}_${index}` : `correct_${questionIndex}`;
                newInput.value = index;
                newInput.style.width = '20px';
                newInput.style.height = '20px';
                newInput.style.marginRight = '0.5rem';
                newInput.style.flexShrink = '0';
                input.parentNode.replaceChild(newInput, input);
            }
        });
    }

    toggleSurveyMode(event) {
        const isAnkieta = event.target.checked;
        const correctAnswerInputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        const helpTexts = document.querySelectorAll('p small');
        
        correctAnswerInputs.forEach(input => {
            if (input.name.startsWith('correct_')) {
                input.style.display = isAnkieta ? 'none' : 'inline';
            }
        });
        
        helpTexts.forEach(text => {
            if (text.textContent.includes('poprawną odpowiedź')) {
                text.style.display = isAnkieta ? 'none' : 'block';
            }
        });
    }

    async handleQuizSubmit(event) {
        event.preventDefault();
        
        try {
            const formData = this.collectQuizData();
            await quizManager.createQuiz(formData);
            
            
            this.showPage('home');
        } catch (error) {
            alert('Błąd przy tworzeniu quizu: ' + error.message);
        }
    }

    collectQuizData() {
        const title = document.getElementById('quizTitle').value.trim();
        const description = document.getElementById('quizDescription').value.trim();
        const isAnkieta = document.getElementById('isAnkieta').checked;
        const questions = [];
        
        document.querySelectorAll('.question-item').forEach((questionElement, index) => {
            const questionText = questionElement.querySelector('.question-text').value.trim();
            const questionType = questionElement.querySelector('.question-type').value;
            const options = [];
            const correctAnswers = [];
            
            questionElement.querySelectorAll('.option-text').forEach(optionInput => {
                const optionText = optionInput.value.trim();
                if (optionText) {
                    options.push(optionText);
                }
            });
            
            if (!isAnkieta) {
                if (questionType === 'single') {
                    const checkedRadio = questionElement.querySelector('input[type="radio"]:checked');
                    if (checkedRadio) {
                        correctAnswers.push(parseInt(checkedRadio.value));
                    }
                } else {
                    const checkedBoxes = questionElement.querySelectorAll('input[type="checkbox"]:checked');
                    checkedBoxes.forEach(checkbox => {
                        correctAnswers.push(parseInt(checkbox.value));
                    });
                }
            }
            
            questions.push({
                text: questionText,
                type: questionType,
                options: options,
                correctAnswers: isAnkieta ? null : (questionType === 'single' ? correctAnswers[0] : correctAnswers)
            });
        });
        
        return { title, description, isAnkieta, questions };
    }

    async startQuiz(quizId) {
        try {
            await quizManager.startQuiz(quizId);
            this.showQuizTaking();
        } catch (error) {
            
        }
    }

    showQuizTaking() {
        const content = document.getElementById('quizContent');
        const quiz = quizManager.currentQuiz;
        
        if (!quiz) {
            content.innerHTML = '<p>Błąd: Brak aktywnego quizu</p>';
            return;
        }

        if (!quizManager.participantInfo.name) {
            content.innerHTML = `
                <div class="quiz-taking">
                    <div class="quiz-header">
                        <h2>${quiz.title}</h2>
                        <p>${quiz.description}</p>
                        <p><strong>${quiz.isAnkieta ? 'Ankieta' : 'Quiz'}</strong> - ${quiz.questions.length} pytań</p>
                    </div>
                    
                    <div class="user-form">
                        <h3>Dane uczestnika</h3>
                        <form id="participantForm">
                            <div class="form-group">
                                <label for="participantName">Imię i nazwisko *:</label>
                                <input type="text" id="participantName" required>
                            </div>
                            <div class="form-group">
                                <label for="participantEmail">Email (opcjonalnie):</label>
                                <input type="email" id="participantEmail">
                            </div>
                            <button type="submit" class="btn-primary">Rozpocznij ${quiz.isAnkieta ? 'Ankietę' : 'Quiz'}</button>
                        </form>
                    </div>
                </div>
            `;
            
            document.getElementById('participantForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('participantName').value.trim();
                const email = document.getElementById('participantEmail').value.trim();
                
                if (name) {
                    quizManager.setParticipantInfo(name, email);
                    this.showQuestionPage();
                }
            });
        } else {
            this.showQuestionPage();
        }
        
        this.showPage('take');
    }

    showQuestionPage() {
        const content = document.getElementById('quizContent');
        const questionData = quizManager.getCurrentQuestion();
        
        if (!questionData) {
            this.showQuizResults();
            return;
        }
        
        const { question, questionNumber, totalQuestions, isLast } = questionData;
        const progress = ((questionNumber - 1) / totalQuestions) * 100;
        const currentAnswer = quizManager.getUserAnswer(questionNumber - 1);
        
        let optionsHtml = '';
        question.options.forEach((option, index) => {
            const isSelected = Array.isArray(currentAnswer) ? 
                currentAnswer.includes(index) : 
                currentAnswer === index;
            
            if (question.type === 'single') {
                optionsHtml += `
                    <label class="answer-choice ${isSelected ? 'selected' : ''}">
                        <input type="radio" name="answer" value="${index}" ${isSelected ? 'checked' : ''}>
                        ${option}
                    </label>
                `;
            } else {
                optionsHtml += `
                    <label class="answer-choice ${isSelected ? 'selected' : ''}">
                        <input type="checkbox" name="answer" value="${index}" ${isSelected ? 'checked' : ''}>
                        ${option}
                    </label>
                `;
            }
        });
        
        content.innerHTML = `
            <div class="quiz-taking">
                <div class="quiz-header">
                    <h3>Pytanie ${questionNumber} z ${totalQuestions}</h3>
                    <div class="quiz-progress">
                        <div class="quiz-progress-bar" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <div class="question-card">
                    <h3 class="question-title">${question.text}</h3>
                    <div id="answerOptions">
                        ${optionsHtml}
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between;">
                    <button class="btn-secondary" onclick="app.previousQuizQuestion()" 
                            ${questionNumber === 1 ? 'disabled' : ''}>
                        ← Poprzednie
                    </button>
                    <button class="btn-primary" onclick="app.nextQuizQuestion()">
                        ${isLast ? 'Zakończ' : 'Następne →'}
                    </button>
                </div>
            </div>
        `;
        
        document.querySelectorAll('input[name="answer"]').forEach(input => {
            input.addEventListener('change', () => {
                this.updateAnswerSelection();
            });
        });
    }

    updateAnswerSelection() {
        const questionData = quizManager.getCurrentQuestion();
        if (!questionData) return;
        
        const { question } = questionData;
        let answer;
        
        if (question.type === 'single') {
            const selected = document.querySelector('input[name="answer"]:checked');
            answer = selected ? parseInt(selected.value) : null;
        } else {
            const selected = document.querySelectorAll('input[name="answer"]:checked');
            answer = Array.from(selected).map(input => parseInt(input.value));
        }
        
        if (answer !== null && (Array.isArray(answer) ? answer.length > 0 : true)) {
            quizManager.answerQuestion(answer);
        }
        
        document.querySelectorAll('.answer-choice').forEach((choice, index) => {
            const input = choice.querySelector('input');
            if (input.checked) {
                choice.classList.add('selected');
            } else {
                choice.classList.remove('selected');
            }
        });
    }

    nextQuizQuestion() {
        const hasNext = quizManager.nextQuestion();
        if (hasNext) {
            this.showQuestionPage();
        } else {
            this.finishQuiz();
        }
    }

    previousQuizQuestion() {
        quizManager.previousQuestion();
        this.showQuestionPage();
    }

    async finishQuiz() {
        try {
            const result = await quizManager.submitQuiz();
            this.showQuizResults(result);
        } catch (error) {
            alert('Błąd przy kończeniu quizu: ' + error.message);
        }
    }

    async showQuizResults(result = null) {
        const content = document.getElementById('quizContent');
        
        if (!result) {
            content.innerHTML = '<p>Błąd: Brak wyników do wyświetlenia</p>';
            return;
        }
        
        const quiz = await quizDB.getQuiz(result.quizId);
        const isAnkieta = quiz.isAnkieta;
        
        let resultsHtml = `
            <div class="quiz-taking">
                <div class="quiz-results">
                    <h2>${isAnkieta ? 'Dziękujemy za wypełnienie ankiety!' : 'Wyniki Quizu'}</h2>
        `;
        
        if (!isAnkieta) {
            const percentage = Math.round((result.score / result.totalQuestions) * 100);
            resultsHtml += `
                <div class="score-display">${result.score}/${result.totalQuestions}</div>
                <p>Twój wynik: <strong>${percentage}%</strong></p>
            `;
        } else {
            resultsHtml += `<p>Twoje odpowiedzi zostały zapisane.</p>`;
        }
        
        resultsHtml += `
                    <p>Uczestnik: <strong>${result.participantName}</strong></p>
                    <p>Data: <strong>${new Date(result.completedAt).toLocaleDateString('pl-PL')}</strong></p>
                </div>
                
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn-primary" onclick="app.showPage('home')">Powrót do strony głównej</button>
                    <button class="btn-secondary" onclick="app.viewStats(${result.quizId})">Zobacz statystyki</button>
                </div>
            </div>
        `;
        
        content.innerHTML = resultsHtml;
    }

    async deleteQuiz(quizId) {
        if (confirm('Czy na pewno chcesz usunąć ten quiz? Ta operacja jest nieodwracalna.')) {
            try {
                const success = await quizDB.deleteQuiz(quizId);
                if (success) {
                    alert('Quiz został usunięty.');
                    this.loadHomePage();
                } else {
                    alert('Błąd przy usuwaniu quizu.');
                }
            } catch (error) {
                alert('Błąd przy usuwaniu quizu.');
            }
        }
    }

    viewStats(quizId) {
        this.showDetailedStats(quizId);
        this.showPage('stats');
    }

    async showDetailedStats(quizId) {
        const container = document.getElementById('statsContainer');
        try {
            const stats = await quizDB.getQuizStatistics(quizId);
            
            if (!stats.quiz) {
                container.innerHTML = '<p>Błąd: Quiz nie został znaleziony.</p>';
                return;
            }
            
            const isAnkieta = stats.quiz.isAnkieta;
            
            let html = `
                <div class="stats-card">
                    <h2>${stats.quiz.title}</h2>
                    <p>${stats.quiz.description}</p>
                    <div class="quiz-meta">
                        <span>Typ: ${isAnkieta ? 'Ankieta' : 'Quiz'}</span>
                        <span>Utworzony: ${new Date(stats.quiz.createdAt).toLocaleDateString('pl-PL')}</span>
                    </div>
                </div>
                
                <div class="stats-container">
                    <div class="stats-card">
                        <h3>Ogólne Statystyki</h3>
                        <div class="stat-item">
                            <span>Liczba uczestników:</span>
                            <span><strong>${stats.totalParticipants}</strong></span>
                        </div>
            `;
            
            if (!isAnkieta) {
                html += `
                        <div class="stat-item">
                            <span>Średni wynik:</span>
                            <span><strong>${stats.averageScore}/${stats.quiz.questions.length} (${stats.averagePercentage}%)</strong></span>
                        </div>
                `;
            }
            
            html += `
                    </div>
                    
                    <div class="stats-card">
                        <h3>Lista Uczestników</h3>
                        <div class="participant-list">
            `;
            
            if (stats.participantList.length === 0) {
                html += '<p class="no-quizzes">Brak uczestników.</p>';
            } else {
                stats.participantList.forEach((participant, index) => {
                    html += `
                        <div class="participant-item">
                            <div>
                                <strong>${participant.name}</strong>
                                ${participant.email ? `<br><small>${participant.email}</small>` : ''}
                                <br><small>${new Date(participant.completedAt).toLocaleDateString('pl-PL')}</small>
                            </div>
                            <div class="participant-score">
                                ${!isAnkieta ? `${participant.score}/${participant.totalQuestions} (${participant.percentage}%)` : 'Ukończono'}
                            </div>
                        </div>
                    `;
                });
            }
            
            html += `
                        </div>
                    </div>
                </div>
                
                <div class="stats-container">
            `;
            
            stats.questionStats.forEach((questionStat, index) => {
                html += `
                    <div class="stats-card">
                        <h4>Pytanie ${index + 1}</h4>
                        <p><strong>${questionStat.question}</strong></p>
                        ${!isAnkieta ? `<p>Poprawnych odpowiedzi: <strong>${questionStat.correctPercentage.toFixed(1)}%</strong></p>` : ''}
                        
                        <h5>Rozkład odpowiedzi:</h5>
                `;
                
                Object.entries(questionStat.answerCounts).forEach(([option, count]) => {
                    const percentage = questionStat.totalResponses > 0 ? 
                        ((count / questionStat.totalResponses) * 100).toFixed(1) : 0;
                    
                    html += `
                        <div class="stat-item">
                            <span>${option}</span>
                            <span><strong>${count} (${percentage}%)</strong></span>
                        </div>
                    `;
                });
                
                html += '</div>';
            });
            
            html += `
                </div>
                
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn-secondary" onclick="app.loadStatsPage()">← Powrót do listy quizów</button>
                    <button class="btn-primary" onclick="app.showPage('home')">Strona główna</button>
                </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p>Błąd przy ładowaniu statystyk</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuizPlatformApp();
});