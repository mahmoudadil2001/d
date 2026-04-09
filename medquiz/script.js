import { lectureNames } from '../lectureNames.js';

const SUBJECTS = [
    "Endodontics", "General medicine", "General surgery", "Operative", 
    "Oral Pathology", "Oral surgery", "Orthodontics", "Pedodontics", 
    "Periodontology", "Prosthodontics"
];

// App State
let state = {
    selectedSubject: null,
    selectedLectures: new Set(),
    totalQuestions: 10,
    questions: [],
    currentIndex: 0,
    answers: {}, // index: chosenOption
    timer: null,
    secondsLeft: 0,
    startTime: null,
    isFinished: false
};

// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    quiz: document.getElementById('quiz-screen'),
    results: document.getElementById('results-screen')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initSetup();
    setupEventListeners();
});

function initSetup() {
    // Render Subjects in Dropdown
    const dropdown = document.getElementById('subject-dropdown');
    SUBJECTS.forEach(subject => {
        const opt = document.createElement('option');
        opt.value = subject;
        opt.textContent = subject;
        dropdown.appendChild(opt);
    });

    dropdown.onchange = (e) => selectSubject(e.target.value);

    // Initial message for lectures
    renderLectures();
}

function renderLectures() {
    const lectureGrid = document.getElementById('lecture-grid');
    const seekBar = document.getElementById('lecture-seek');
    const seekContainer = seekBar.closest('.lecture-seek-bar');
    lectureGrid.innerHTML = '';
    
    if (!state.selectedSubject) {
        lectureGrid.innerHTML = '<p class="placeholder-text">Please select a subject first</p>';
        seekContainer.classList.add('hidden');
        return;
    }

    const path = state.selectedSubject.toLowerCase().replace(/ /g, '');
    const names = lectureNames[path] || {};

    let lectureCount = 0;
    for (let i = 1; i <= 30; i++) {
        const name = names[i] || `Lecture ${i}`;
        
        // Skip unknown lectures entirely
        if (name.toLowerCase().trim() === 'unknown') continue;

        lectureCount++;
        const div = document.createElement('div');
        div.className = 'lecture-item';
        div.setAttribute('data-id', i);
        if (state.selectedLectures.has(i)) div.classList.add('selected');
        
        div.innerHTML = `
            <div class="lec-num">${i}</div>
            <div class="lec-name">${name}</div>
        `;
        
        div.onclick = () => toggleLecture(i, div);
        lectureGrid.appendChild(div);
    }

    // Show seek bar, set max to lecture count, and reset
    seekContainer.classList.remove('hidden');
    seekBar.max = lectureCount;
    seekBar.value = 0;
    lectureGrid.scrollTop = 0;
}


function setupEventListeners() {
    const qInput = document.getElementById('question-count');

    qInput.oninput = (e) => {
        state.totalQuestions = parseInt(e.target.value) || 0;
        validateReady();
    };

    qInput.onblur = (e) => {
        if (state.selectedLectures.size > 0) {
            const minRequired = state.selectedLectures.size * 2;
            if (state.totalQuestions < minRequired) {
                state.totalQuestions = minRequired;
                e.target.value = minRequired;
            }
        }
        validateReady();
    };

    document.getElementById('select-all-lecs').onclick = () => {
        document.querySelectorAll('.lecture-item').forEach(el => {
            const id = parseInt(el.getAttribute('data-id'));
            state.selectedLectures.add(id);
            el.classList.add('selected');
        });
        validateReady();
    };

    document.getElementById('deselect-all-lecs').onclick = () => {
        state.selectedLectures.clear();
        document.querySelectorAll('.lecture-item').forEach(el => el.classList.remove('selected'));
        validateReady();
    };

    // Seek Bar controls lecture grid scroll
    const seekBar = document.getElementById('lecture-seek');
    const lectureGrid = document.getElementById('lecture-grid');
    
    seekBar.oninput = () => {
        const scrollMax = lectureGrid.scrollHeight - lectureGrid.clientHeight;
        lectureGrid.scrollTop = (seekBar.value / seekBar.max) * scrollMax;
    };

    document.getElementById('start-btn').onclick = startQuiz;
    document.getElementById('finish-btn').onclick = finishQuiz;
    document.getElementById('quit-btn').onclick = () => location.reload();
    document.getElementById('restart-btn').onclick = () => location.reload();

    // View Toggles
    document.getElementById('show-paper').onclick = () => switchView('paper');
    document.getElementById('show-bubbles').onclick = () => switchView('bubbles');
}

function switchView(view) {
    const paper = document.getElementById('paper-view');
    const bubbles = document.getElementById('bubble-sheet-exam');
    const resultsView = document.getElementById('results-view');
    const paperBtn = document.getElementById('show-paper');
    const bubbleBtn = document.getElementById('show-bubbles');

    const alternativeContainer = state.isFinished ? resultsView : bubbles;

    if ((view === 'paper' && !paper.classList.contains('hidden')) || 
        (view === 'bubbles' && !alternativeContainer.classList.contains('hidden'))) {
        return; 
    }

    // 1. Identify which question is currently visible near the top
    const isPaperActive = !paper.classList.contains('hidden');
    const currentNodes = isPaperActive ? paper.querySelectorAll('.paper-q-block') : alternativeContainer.querySelectorAll('.exam-row');
    
    let targetIndex = 0;
    let minDistance = Infinity;
    const headerOffset = 180;

    currentNodes.forEach((node, idx) => {
        const rect = node.getBoundingClientRect();
        const distance = Math.abs(rect.top - headerOffset);
        if (distance < minDistance) {
            minDistance = distance;
            targetIndex = idx;
        }
    });

    // 2. Switch the UI
    if (view === 'paper') {
        paper.classList.remove('hidden');
        bubbles.classList.add('hidden');
        resultsView.classList.add('hidden');
        paperBtn.classList.add('active');
        bubbleBtn.classList.remove('active');
    } else {
        paper.classList.add('hidden');
        if (state.isFinished) {
            resultsView.classList.remove('hidden');
            bubbles.classList.add('hidden');
        } else {
            bubbles.classList.remove('hidden');
            resultsView.classList.add('hidden');
        }
        paperBtn.classList.remove('active');
        bubbleBtn.classList.add('active');
    }

    // 3. Resync scroll position instantly to the new matching element
    const targetNodes = view === 'paper' ? paper.querySelectorAll('.paper-q-block') : bubbles.querySelectorAll('.exam-row');
    
    // Only attempt to scroll if target nodes exist (doesn't apply to results view)
    if (targetNodes[targetIndex] && ((view === 'bubbles' && !state.isFinished) || view === 'paper')) {
        setTimeout(() => {
            const rect = targetNodes[targetIndex].getBoundingClientRect();
            window.scrollBy({ top: rect.top - headerOffset, behavior: 'instant' });
        }, 0);
    } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

function selectSubject(subject) {
    state.selectedSubject = subject;
    state.selectedLectures.clear();
    
    renderLectures();
    validateReady();
}

function toggleLecture(id, el) {
    if (state.selectedLectures.has(id)) {
        state.selectedLectures.delete(id);
        el.classList.remove('selected');
    } else {
        state.selectedLectures.add(id);
        el.classList.add('selected');
    }
    validateReady();
}

function validateReady() {
    const startBtn = document.getElementById('start-btn');
    const qCountInput = document.getElementById('question-count');

    // Dynamic Limits: Max 120 total, Max 20 per lecture
    const maxPossible = Math.min(120, state.selectedLectures.size * 20);
    qCountInput.max = maxPossible;

    // Clamp to max only (min is enforced on blur, not during typing)
    if (state.selectedLectures.size > 0 && state.totalQuestions > maxPossible) {
        state.totalQuestions = maxPossible;
        qCountInput.value = maxPossible;
    }

    const minRequired = state.selectedLectures.size > 0 ? state.selectedLectures.size * 2 : 1;
    const isReady = state.selectedSubject &&
                    state.selectedLectures.size > 0 &&
                    state.totalQuestions >= minRequired &&
                    state.totalQuestions <= maxPossible;
    startBtn.disabled = !isReady;
}

async function startQuiz() {
    const startBtn = document.getElementById('start-btn');
    
    // Quick user alert/notification
    startBtn.classList.add('btn-finish'); // Make it change style to emphasize countdown
    startBtn.disabled = true;

    // 3 Second UI Countdown
    for (let i = 3; i > 0; i--) {
        startBtn.textContent = `Starting in ${i} ...`;
        await new Promise(res => setTimeout(res, 1000));
    }
    
    startBtn.textContent = "Loading Exams...";
    
    try {
        await loadAllSelectedQuestions();
        
        // 2. Generate and Download PDF
        generateExamPDF(false); // False = without answers

        screens.setup.classList.add('hidden');
        screens.quiz.classList.remove('hidden');
        
        state.answers = {};
        state.isFinished = false;
        state.secondsLeft = state.totalQuestions * 75;
        
        // Reset UI Elements for new Quiz
        document.getElementById('finish-btn').classList.remove('hidden');
        document.getElementById('timer-display').classList.remove('hidden');
        document.getElementById('show-paper').textContent = 'Question Paper';
        document.getElementById('show-bubbles').textContent = 'Bubble Sheet';
        
        window.scrollTo(0, 0);
        
        renderFullBubbleSheet();
        renderPaperView(false);
        startTimer();
        
        document.getElementById('active-subject-header').textContent = state.selectedSubject;
        document.getElementById('active-info-sub').textContent = 
            `Lec: ${Array.from(state.selectedLectures).sort((a,b)=>a-b).join(', ')} • ${state.totalQuestions} Questions`;

    } catch (error) {
        console.error("Failed to load questions:", error);
        alert("Make sure you are running this through a local server (like Live Server).");
        document.getElementById('start-btn').textContent = "Start Quiz";
    }
}

function generateExamPDF(withAnswers = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Page Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(withAnswers ? "EXAM ANSWER KEY" : "OFFICIAL MEDICAL EXAM", margin, y);
    y += 10;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Subject: ${state.selectedSubject}`, margin, y);
    y += 6;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
    y += 6;
    doc.text(`Total Questions: ${state.totalQuestions}`, margin, y);
    y += 15;

    doc.setTextColor(0);
    
    state.questions.forEach((q, idx) => {
        const questionText = `${idx + 1}. ${q.question}`;
        const lines = doc.splitTextToSize(questionText, 170);
        
        if (y + (lines.length * 8) + 40 > 280) { 
            doc.addPage();
            y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.text(lines, margin, y);
        y += (lines.length * 6) + 4;

        doc.setFont("helvetica", "normal");
        q.options.forEach((opt, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const isCorrect = withAnswers && optIdx === q.answer;
            const chosen = withAnswers && state.answers[idx] === optIdx;
            
            if (isCorrect) {
                doc.setTextColor(0, 150, 0); 
                doc.setFont("helvetica", "bold");
            } else if (chosen && !isCorrect) {
                doc.setTextColor(200, 0, 0); // Red for wrong choice
                doc.setFont("helvetica", "bold");
            } else {
                doc.setTextColor(0);
                doc.setFont("helvetica", "normal");
            }

            doc.text(`${letter}) ${opt}${isCorrect ? " [CORRECT]" : ""}${chosen && !isCorrect ? " [YOUR CHOICE]" : ""}`, margin + 5, y);
            y += 6;
        });

        doc.setTextColor(0);
        y += 6; 
    });

    // New: Mistakes Summary Section at the End
    if (withAnswers) {
        doc.addPage();
        y = 30;
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("EXAM MISTAKES SUMMARY", margin, y);
        y += 15;
        doc.setFontSize(12);

        let mistakesCount = 0;
        state.questions.forEach((q, idx) => {
            const chosen = state.answers[idx];
            if (chosen !== q.answer) {
                mistakesCount++;
                const mistakeLines = doc.splitTextToSize(`Q${idx+1}: ${q.question}`, 170);
                if (y + 30 > 280) { doc.addPage(); y = 20; }
                
                doc.setFont("helvetica", "bold");
                doc.setTextColor(200, 0, 0);
                doc.text(mistakeLines, margin, y);
                y += (mistakeLines.length * 6) + 2;
                
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 150, 0);
                doc.text(`Correct: ${String.fromCharCode(65+q.answer)}) ${q.options[q.answer]}`, margin + 5, y);
                y += 7;
                
                doc.setTextColor(100);
                const userChoice = chosen !== undefined ? `${String.fromCharCode(65+chosen)}) ${q.options[chosen]}` : "No Answer";
                doc.text(`Your Answer: ${userChoice}`, margin + 5, y);
                y += 10;
            }
        });

        if (mistakesCount === 0) {
            doc.setTextColor(0, 150, 0);
            doc.text("Perfect Score! No mistakes to show.", margin, y);
        }
    }

    const filename = withAnswers ? `Answers_${state.selectedSubject}.pdf` : `Exam_${state.selectedSubject}.pdf`;
    doc.save(filename);
}

async function loadAllSelectedQuestions() {
    const pool = [];
    const lecs = Array.from(state.selectedLectures);
    const subjectPathPart = state.selectedSubject.toLowerCase().replace(/ /g, '');

    for (let lecNum of lecs) {
        const version = Math.floor(Math.random() * 4) + 1;
        const filePath = `../${subjectPathPart}/${subjectPathPart}${lecNum}/${subjectPathPart}${lecNum}_v${version}.js`;
        
        try {
            const module = await import(filePath);
            if (module.questions) {
                const lecRealName = lectureNames[subjectPathPart]?.[lecNum] || `Lecture ${lecNum}`;
                
                // Exclude specific question texts
                const validQuestions = module.questions.filter(q => {
                    if (!q.question) return false;
                    const text = q.question.toLowerCase();
                    return !text.includes("according to the text") && !text.includes("according to the lecture");
                });

                const annotated = validQuestions.map(q => ({
                    ...q,
                    _source: `${lecRealName} • V${version}`
                }));
                pool.push(...annotated);
            }
        } catch (e) {
            console.warn(`Could not load ${filePath}`, e);
        }
    }

    if (pool.length === 0) throw new Error("No questions found in selected lectures");

    // Shuffle and pick N questions
    const shuffled = pool.sort(() => Math.random() - 0.5);
    state.questions = shuffled.slice(0, state.totalQuestions).map(q => {
        // Shuffle options and update correct answer index
        const originalOptions = [...q.options];
        const correctAnswer = originalOptions[q.answer];
        const shuffledOptions = originalOptions.sort(() => Math.random() - 0.5);
        const newAnswerIndex = shuffledOptions.indexOf(correctAnswer);
        
        return {
            ...q,
            options: shuffledOptions,
            answer: newAnswerIndex
        };
    });
}

function renderPaperView(showAnswers = false) {
    const container = document.getElementById('paper-view');
    
    if (showAnswers) {
        container.classList.add('show-answers');
    } else {
        container.classList.remove('show-answers');
    }

    container.innerHTML = `
        <div class="exam-paper-header">
            <h1>${showAnswers ? 'EXAM ANSWER KEY' : 'OFFICIAL EXAMINATION'}</h1>
            <div class="exam-paper-info">
                <span>Subject: ${state.selectedSubject}</span>
                <span>Total Questions: ${state.totalQuestions}</span>
            </div>
        </div>
    `;

    state.questions.forEach((q, idx) => {
        const block = document.createElement('div');
        block.className = 'paper-q-block';
        
        let optionsHtml = '';
        q.options.forEach((opt, optIdx) => {
            let stylingClass = '';
            let label = '';
            
            if (showAnswers) {
                if (optIdx === q.answer) {
                    stylingClass = 'correct';
                    label = ' ✓';
                } else if (state.answers[idx] === optIdx) {
                    stylingClass = 'mistake';
                    label = ' ✗';
                }
            }

            optionsHtml += `
                <li class="paper-opt-item ${stylingClass}">
                    <span class="paper-opt-letter">${String.fromCharCode(65 + optIdx)})</span>
                    <span class="paper-opt-text">${opt}${label}</span>
                </li>
            `;
        });

        block.innerHTML = `
            <div class="paper-q-text">${idx + 1}. ${q.question}</div>
            <ul class="paper-options">
                ${optionsHtml}
            </ul>
        `;
        container.appendChild(block);
    });
}

function renderFullBubbleSheet() {
    const sheet = document.getElementById('bubble-sheet-exam');
    sheet.innerHTML = '';

    state.questions.forEach((q, idx) => {
        const row = document.createElement('div');
        row.className = 'exam-row';
        
        const num = document.createElement('div');
        num.className = 'exam-num';
        num.textContent = idx + 1;

        const opts = document.createElement('div');
        opts.className = 'exam-options';

        q.options.forEach((_, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const btn = document.createElement('div');
            btn.className = 'bubble-option';
            if (state.answers[idx] === optIdx) btn.classList.add('selected');

            btn.innerHTML = `<span class="option-letter">${letter}</span>`;

            btn.onclick = () => {
                state.answers[idx] = optIdx;
                const siblings = opts.querySelectorAll('.bubble-option');
                siblings.forEach(s => s.classList.remove('selected'));
                btn.classList.add('selected');
            };
            opts.appendChild(btn);
        });

        row.appendChild(num);
        row.appendChild(opts);
        sheet.appendChild(row);
    });
}

function startTimer() {
    if (state.timer) clearInterval(state.timer);
    
    const timerDisplay = document.getElementById('time-left');
    
    state.timer = setInterval(() => {
        state.secondsLeft--;
        
        if (state.secondsLeft <= 0) {
            clearInterval(state.timer);
            finishQuiz();
            return;
        }

        const mins = Math.floor(state.secondsLeft / 60);
        const secs = state.secondsLeft % 60;
        timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (state.secondsLeft < 60) {
            document.getElementById('timer-display').style.color = 'var(--error)';
        }
    }, 1000);
}

function finishQuiz() {
    clearInterval(state.timer);
    
    try {
        generateExamPDF(true); 
    } catch (e) {
        console.error("PDF Generation failed but finishing quiz locally:", e);
    }

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    
    state.questions.forEach((q, idx) => {
        const ans = state.answers[idx];
        if (ans === undefined) {
            unanswered++;
        } else if (ans === q.answer) {
            correct++;
        } else {
            incorrect++;
        }
    });

    const total = state.questions.length;
    const scoreOutOf20 = ((correct / total) * 20).toFixed(1);
    const percent = Math.round((correct / total) * 100);

    // Update state to finished
    state.isFinished = true;

    // Render results
    document.getElementById('result-score-raw').textContent = `${scoreOutOf20}/20`;
    document.getElementById('result-score-percent').textContent = `${percent}%`;
    document.getElementById('stat-correct').textContent = correct;
    document.getElementById('stat-incorrect').textContent = incorrect;
    document.getElementById('stat-unanswered').textContent = unanswered;

    // Transform UI for Review Mode
    document.getElementById('finish-btn').classList.add('hidden');
    document.getElementById('timer-display').classList.add('hidden');
    document.getElementById('show-paper').textContent = 'Review Answers';
    document.getElementById('show-bubbles').textContent = 'Score Report';
    
    // Regenerate Paper View with Answers
    renderPaperView(true);
    
    // Force instant UI transition to Score Report
    document.getElementById('paper-view').classList.add('hidden');
    document.getElementById('bubble-sheet-exam').classList.add('hidden');
    document.getElementById('results-view').classList.remove('hidden');
    document.getElementById('show-paper').classList.remove('active');
    document.getElementById('show-bubbles').classList.add('active');
    
    window.scrollTo(0, 0);
}
