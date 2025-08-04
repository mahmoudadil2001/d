import { startQuiz } from './quiz.js';

const subjectSelect = document.getElementById("subjectSelect");
const lectureSelect = document.getElementById("lectureSelect");
const versionSelect = document.getElementById("versionSelect");
const loadBtn = document.getElementById("loadBtn");
const questionsContainer = document.getElementById("questionsContainer");

loadBtn.addEventListener("click", async () => {
  const subject = subjectSelect.value;
  const lecture = lectureSelect.value;
  const version = versionSelect.value;

  // بناء المسار حسب اختيار المستخدم
  const path = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;

  try {
    const module = await import(path);
    const questions = module.questions;
    startQuiz(questions);
  } catch (err) {
    questionsContainer.innerHTML = `<p style="color:red;">فشل تحميل الأسئلة من: ${path}</p>`;
    console.error(err);
  }
});
