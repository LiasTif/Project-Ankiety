const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('quiz.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        isAnkieta INTEGER DEFAULT 0,
        questions TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        totalParticipants INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quizId INTEGER NOT NULL,
        participantName TEXT NOT NULL,
        participantEmail TEXT,
        answers TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        totalQuestions INTEGER DEFAULT 0,
        completedAt TEXT NOT NULL,
        FOREIGN KEY(quizId) REFERENCES quizzes(id)
    )`);
});

app.get('/api/quizzes', (req, res) => {
    db.all("SELECT * FROM quizzes ORDER BY createdAt DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const quizzes = rows.map(row => ({
            ...row,
            questions: JSON.parse(row.questions),
            isAnkieta: Boolean(row.isAnkieta)
        }));
        res.json(quizzes);
    });
});

app.get('/api/quizzes/:id', (req, res) => {
    db.get("SELECT * FROM quizzes WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Quiz nie znaleziony' });
        res.json({
            ...row,
            questions: JSON.parse(row.questions),
            isAnkieta: Boolean(row.isAnkieta)
        });
    });
});

app.post('/api/quizzes', (req, res) => {
    const { title, description, isAnkieta, questions } = req.body;
    const questionsJson = JSON.stringify(questions);
    const createdAt = new Date().toISOString();
    
    db.run("INSERT INTO quizzes (title, description, isAnkieta, questions, createdAt) VALUES (?, ?, ?, ?, ?)",
        [title, description, isAnkieta ? 1 : 0, questionsJson, createdAt],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, title, description, isAnkieta, questions, createdAt, totalParticipants: 0 });
        });
});

app.delete('/api/quizzes/:id', (req, res) => {
    db.run("DELETE FROM results WHERE quizId = ?", [req.params.id]);
    db.run("DELETE FROM quizzes WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: this.changes > 0 });
    });
});

app.post('/api/results', (req, res) => {
    const { quizId, participantName, participantEmail, answers, score, totalQuestions } = req.body;
    const answersJson = JSON.stringify(answers);
    const completedAt = new Date().toISOString();
    
    db.run("INSERT INTO results (quizId, participantName, participantEmail, answers, score, totalQuestions, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [quizId, participantName, participantEmail, answersJson, score, totalQuestions, completedAt],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            db.run("UPDATE quizzes SET totalParticipants = totalParticipants + 1 WHERE id = ?", [quizId]);
            res.json({ id: this.lastID, quizId, participantName, participantEmail, answers, score, totalQuestions, completedAt });
        });
});

app.get('/api/results/:quizId', (req, res) => {
    db.all("SELECT * FROM results WHERE quizId = ? ORDER BY completedAt DESC", [req.params.quizId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const results = rows.map(row => ({
            ...row,
            answers: JSON.parse(row.answers)
        }));
        res.json(results);
    });
});

app.get('/api/stats/:quizId', (req, res) => {
    const quizId = req.params.quizId;
    
    db.get("SELECT * FROM quizzes WHERE id = ?", [quizId], (err, quiz) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!quiz) return res.status(404).json({ error: 'Quiz nie znaleziony' });
        
        db.all("SELECT * FROM results WHERE quizId = ?", [quizId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const parsedQuiz = {
                ...quiz,
                questions: JSON.parse(quiz.questions),
                isAnkieta: Boolean(quiz.isAnkieta)
            };
            
            const parsedResults = results.map(row => ({
                ...row,
                answers: JSON.parse(row.answers)
            }));
            
            if (parsedResults.length === 0) {
                return res.json({
                    quiz: parsedQuiz,
                    totalParticipants: 0,
                    averageScore: 0,
                    averagePercentage: 0,
                    questionStats: [],
                    participantList: []
                });
            }
            
            const totalScore = parsedResults.reduce((sum, result) => sum + result.score, 0);
            const averageScore = parsedQuiz.isAnkieta ? 0 : (totalScore / parsedResults.length);
            
            const questionStats = parsedQuiz.questions.map((question, index) => {
                const questionResults = parsedResults.map(result => result.answers[index]);
                const answerCounts = {};
                
                question.options.forEach((option, optIndex) => {
                    answerCounts[option] = questionResults.filter(answer => 
                        Array.isArray(answer) ? answer.includes(optIndex) : answer === optIndex
                    ).length;
                });
                
                let correctPercentage = 0;
                if (!parsedQuiz.isAnkieta && question.correctAnswers !== null) {
                    const correctCount = questionResults.filter(answer => {
                        if (Array.isArray(question.correctAnswers)) {
                            return Array.isArray(answer) && 
                                   question.correctAnswers.every(correct => answer.includes(correct)) &&
                                   answer.every(ans => question.correctAnswers.includes(ans));
                        } else {
                            return answer === question.correctAnswers;
                        }
                    }).length;
                    correctPercentage = (correctCount / parsedResults.length) * 100;
                }
                
                return {
                    question: question.text,
                    answerCounts,
                    correctPercentage,
                    totalResponses: parsedResults.length
                };
            });
            
            const participantList = parsedResults.map(result => ({
                name: result.participantName,
                email: result.participantEmail,
                score: result.score,
                totalQuestions: result.totalQuestions,
                percentage: parsedQuiz.isAnkieta ? 0 : Math.round((result.score / result.totalQuestions) * 100),
                completedAt: result.completedAt
            })).sort((a, b) => b.score - a.score);
            
            res.json({
                quiz: parsedQuiz,
                totalParticipants: parsedResults.length,
                averageScore: Math.round(averageScore * 100) / 100,
                averagePercentage: parsedQuiz.isAnkieta ? 0 : Math.round((averageScore / parsedQuiz.questions.length) * 100),
                questionStats,
                participantList
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});