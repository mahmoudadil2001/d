import { visibleLectures } from './show.js';
import { lectureNames } from './lectureNames.js';

const subjectSelect = document.getElementById("subjectSelect");
const lectureSelect = document.getElementById("lectureSelect");
const versionSelect = document.getElementById("versionSelect");
const loadBtn = document.getElementById("loadBtn");
const questionsContainer = document.getElementById("questionsContainer");

// تعبئة قائمة المواد
const subjects = Object.keys(visibleLectures);
subjects.forEach(subject => {
  const opt = document.createElement("option");
  opt.value = subject;
  opt.textContent = subject;
  subjectSelect.appendChild(opt);
});

// عند تغيير المادة، يتم تحميل المحاضرات
subjectSelect.addEventListener("change", () => {
  lectureSelect.innerHTML = "";
  versionSelect.innerHTML = "";

  const selected = subjectSelect.value;
  const lectures = Object.keys(visibleLectures[selected] || {});

  lectures.forEach(lec => {
    const opt = document.createElement("option");
    opt.value = lec;
    const name = lectureNames[selected]?.[lec] || "Unknown";
    opt.textContent = `lec${lec} - ${name}`;
    lectureSelect.appendChild(opt);
  });

  lectureSelect.dispatchEvent(new Event("change"));
});

// عند تغيير المحاضرة، يتم تحميل النسخ
lectureSelect.addEventListener("change", () => {
  versionSelect.innerHTML = "";
  const selectedSubject = subjectSelect.value;
  const selectedLecture = lectureSelect.value;
  const versions = visibleLectures[selectedSubject]?.[selectedLecture] || [];

  versions.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = `Version ${v}`;
    versionSelect.appendChild(opt);
  });
});

// عند الضغط على زر "ابدأ"
loadBtn.addEventListener("click", async () => {
  const subject = subjectSelect.value;
  const lecture = lectureSelect.value;
  const version = versionSelect.value;

  const path = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;

  try {
    const module = await import(path);
    const questions = module.questions;
    showQuestions(questions);
  } catch (err) {
    questionsContainer.innerHTML = `<p style="color:red;">فشل تحميل الأسئلة من: ${path}</p>`;
    console.error(err);
  }
});

// عرض الأسئلة
function showQuestions(questions) {
  questionsContainer.innerHTML = "";
  questions.forEach((q, idx) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>سؤال ${idx + 1}: ${q.question}</h3>
      <ul>
        ${q.options.map(opt => `<li>${opt}</li>`).join("")}
      </ul>
    `;
    questionsContainer.appendChild(div);
  });
}

// تشغيل التهيئة أول مرة
subjectSelect.dispatchEvent(new Event("change"));
