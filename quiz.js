const questionsContainer = document.getElementById("questionsContainer");

let currentQuestions = [];
let currentIndex = 0;
let score = 0;

// تُستدعى من script.js بعد تحميل الأسئلة
export function startQuiz(questions) {
  currentQuestions = questions;
  currentIndex = 0;
  score = 0;
  showQuestion();
}

function showQuestion() {
  const q = currentQuestions[currentIndex];
  questionsContainer.innerHTML = `
    <div class="question-text">سؤال ${currentIndex + 1}: ${q.question}</div>
    <ul class="options-list">
      ${q.options.map((opt, i) => `
        <li>
          <label>
            <input type="radio" name="option" value="${i}" />
            ${opt}
          </label>
        </li>`).join("")}
    </ul>
    <div id="feedback" class="feedback"></div>
    <button id="nextBtn" disabled>التالي</button>
  `;

  const nextBtn = document.getElementById("nextBtn");
  const options = document.getElementsByName("option");
  const feedback = document.getElementById("feedback");

  options.forEach(opt => {
    opt.addEventListener("change", () => {
      const selected = Number(document.querySelector('input[name="option"]:checked').value);

      if (selected === q.answer) {
        feedback.textContent = "إجابة صحيحة ✅";
        feedback.className = "feedback correct";
        score++;
      } else {
        feedback.textContent = `إجابة خاطئة ❌، الإجابة الصحيحة: ${q.options[q.answer]}`;
        feedback.className = "feedback incorrect";
      }
      nextBtn.disabled = false;
    });
  });

  nextBtn.onclick = () => {
    currentIndex++;
    if (currentIndex < currentQuestions.length) {
      showQuestion();
    } else {
      showResult();
    }
  };
}

function showResult() {
  questionsContainer.innerHTML = `
    <h2>انتهى الاختبار!</h2>
    <p>درجتك: ${score} من ${currentQuestions.length}</p>
    <button id="restartBtn">إعادة الاختبار</button>
  `;

  document.getElementById("restartBtn").onclick = () => {
    currentIndex = 0;
    score = 0;
    showQuestion();
  };
}
