// main.js

let githubToken = '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';
let githubUsername = 'mahmoudadil2001';
let repoName = 'dentistru-JS';
let questions = [];
let currentIndex = 0;
let score = 0;

// تحميل بيانات GitHub
function loadGithubCredentials() {
  githubToken = localStorage.getItem('githubToken') || '';
  githubUsername = localStorage.getItem('githubUsername') || '';
  repoName = localStorage.getItem('repoName') || '';

  if (!githubToken || !githubUsername || !repoName) {
    alert("⚠️ الرجاء إدخال بيانات GitHub من لوحة التحكم أولاً");
    window.location.href = "admin.html";
  }
}

// تحميل ملف الأسئلة من GitHub
async function fetchQuestions(subject, lectureNumber, version) {
  const path = `${subject}/${subject}${lectureNumber}/${subject}${lectureNumber}_${version}.js`;
  const url = `https://api.github.com/repos/${githubUsername}/${repoName}/contents/${path}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3.raw'
    }
  });

  if (!res.ok) {
    alert("❌ فشل في تحميل الملف");
    return;
  }

  const jsText = await res.text();
  eval(jsText); // يجلب questions من export const questions

  if (!Array.isArray(questions) || questions.length === 0) {
    alert("⚠️ لا توجد أسئلة صالحة في الملف");
    return;
  }

  startQuiz();
}

// بدء الاختبار
function startQuiz() {
  currentIndex = 0;
  score = 0;
  showQuestion();
}

// عرض سؤال واحد
function showQuestion() {
  const container = document.getElementById("quizContainer");
  container.innerHTML = '';

  if (currentIndex >= questions.length) {
    container.innerHTML = `<h3>✅ انتهى الاختبار</h3><p>النتيجة: ${score} من ${questions.length}</p>`;
    return;
  }

  const q = questions[currentIndex];

  const questionText = document.createElement('h3');
  questionText.textContent = q.question;
  container.appendChild(questionText);

  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.style.display = 'block';
    btn.style.margin = '10px auto';
    btn.onclick = () => handleAnswer(index);
    container.appendChild(btn);
  });
}

// التحقق من الإجابة والانتقال
function handleAnswer(selectedIndex) {
  if (selectedIndex === questions[currentIndex].answer) {
    score++;
  }
  currentIndex++;
  showQuestion();
}

// ربط الزر
document.getElementById("startBtn").onclick = () => {
  const subject = document.getElementById("subjectSelect").value;
  const lecture = document.getElementById("lectureSelect").value;
  const version = document.getElementById("versionSelect").value;

  if (!subject || !lecture || !version) {
    alert("⚠️ الرجاء اختيار المادة والمحاضرة والنسخة");
    return;
  }

  loadGithubCredentials();
  fetchQuestions(subject, lecture, version);
};
