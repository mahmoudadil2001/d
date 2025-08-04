import { visibleLectures } from './show.js';
import { lectureNames } from './lectureNames.js';

const subjectSelect = document.getElementById("subjectSelect");
const lectureSelect = document.getElementById("lectureSelect");
const versionSelect = document.getElementById("versionSelect");
const loadBtn = document.getElementById("loadBtn");
const questionsContainer = document.getElementById("questionsContainer");
const controlsContainer = document.getElementById("controlsContainer");
const homeBtn = document.getElementById("homeBtn");

// إضافة عنصر checkbox للمؤقت داخل controlsContainer
const timerDiv = document.createElement("div");
timerDiv.style.margin = "10px 0";
timerDiv.innerHTML = `
  <label>
    <input type="checkbox" id="timerToggle" />
    تفعيل المؤقت 55 ثانية لكل سؤال
  </label>
`;
controlsContainer.insertBefore(timerDiv, loadBtn);

let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let answered = false;
let timerEnabled = false;
let timerInterval;
let timeLeft = 55;  // عدلت الوقت هنا إلى 55 ثانية

// تحميل ملفات الصوت
const correctSound = new Audio('./sounds/correct.wav');
const wrongSound = new Audio('./sounds/wrong.wav');
const clickSound = new Audio('./sounds/click.wav');
const uiClickSound = new Audio('./sounds/uiclick.wav');

// تشغيل صوت click عند الضغط على أي زر ما عدا خيارات الإجابة
document.addEventListener("click", (e) => {
  const isButton = e.target.tagName === "BUTTON";
  const isOptionBtn = e.target.classList.contains("option-btn");
  if (isButton && !isOptionBtn) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
});

// تشغيل صوت عند فتح select box
document.querySelectorAll("select").forEach(select => {
  select.addEventListener("mousedown", () => {
    uiClickSound.currentTime = 0;
    uiClickSound.play();
  });
});

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

// دالة بدء المؤقت لكل سؤال
function startTimer() {
  timeLeft = 55;  // وقت 55 ثانية
  updateTimerText();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerText();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!answered) {
        answered = true;
        wrongSound.currentTime = 0;
        wrongSound.play();

        // إبراز الجواب الصحيح
        const options = document.querySelectorAll(".option-btn");
        if (options[currentQuestions[currentIndex].answer]) {
          options[currentQuestions[currentIndex].answer].style.backgroundColor = "lightgreen";
        }

        // تعطيل كل الأزرار بعد انتهاء الوقت
        options.forEach(btn => btn.disabled = true);

        // عرض زر التالي فقط بدون انتقال تلقائي
        showNextButton();
      }
    }
  }, 1000);
}

function updateTimerText() {
  const timerTextElem = document.getElementById("timerText");
  if(timerTextElem){
    timerTextElem.textContent = `الوقت المتبقي: ${timeLeft} ثانية`;
  }
}

// عند الضغط على زر "ابدأ"
loadBtn.addEventListener("click", async () => {
  const subject = subjectSelect.value;
  const lecture = lectureSelect.value;
  const version = versionSelect.value;

  timerEnabled = document.getElementById("timerToggle").checked;

  const path = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;

  try {
    const module = await import(path);
    currentQuestions = module.questions;
    currentIndex = 0;
    correctCount = 0;

    controlsContainer.style.display = "none";
    questionsContainer.style.display = "block";
    homeBtn.style.display = "block";  // إظهار زر العودة

    showQuestion();
  } catch (err) {
    questionsContainer.innerHTML = `<p style="color:red;">فشل تحميل الأسئلة من: ${path}</p>`;
    console.error(err);
  }
});

// عند الضغط على زر العودة
homeBtn.addEventListener("click", () => {
  controlsContainer.style.display = "block";
  questionsContainer.style.display = "none";
  homeBtn.style.display = "none";
  currentQuestions = [];
  currentIndex = 0;
  correctCount = 0;
  questionsContainer.innerHTML = "";
  clearInterval(timerInterval);
});

// دالة عرض سؤال واحد فقط مع الخيارات
function showQuestion() {
  answered = false;
  clearInterval(timerInterval);
  questionsContainer.innerHTML = "";

  if (currentIndex >= currentQuestions.length) {
    // عرض النتيجة النهائية مع زر إعادة المحاولة فقط
    questionsContainer.innerHTML = `
      <h2>انتهت الأسئلة!</h2>
      <p>نتيجتك: ${correctCount} من ${currentQuestions.length} صحيحة.</p>
      <button id="restartBtn">إعادة المحاولة</button>
    `;

    document.getElementById("restartBtn").addEventListener("click", () => {
      currentIndex = 0;
      correctCount = 0;
      showQuestion();
    });

    return;
  }

  const q = currentQuestions[currentIndex];

  // عرض العداد بشكل Q رقم/العدد الكلي + مؤقت
  const progressText = `Q ${currentIndex + 1} / ${currentQuestions.length}`;
  const timerHtml = timerEnabled ? `<div id="timerText" style="color:red; margin-bottom: 10px; font-size: 18px;"></div>` : "";

  const questionDiv = document.createElement("div");
  questionDiv.innerHTML = `
    <h3>${progressText}</h3>
    ${timerHtml}
    <h2>${q.question}</h2>
  `;

  // قائمة خيارات
  const optionsList = document.createElement("ul");
  optionsList.style.listStyle = "none";
  optionsList.style.padding = "0";

  q.options.forEach((opt, idx) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.classList.add("option-btn"); // لتحديدها كزر خيار
    btn.style.display = "block";
    btn.style.margin = "8px 0";
    btn.style.padding = "8px 12px";
    btn.style.width = "100%";
    btn.disabled = false;

    btn.addEventListener("click", () => {
      if (answered) return; // منع الضغط أكثر من مرة
      answered = true;
      clearInterval(timerInterval);

      if (idx === q.answer) {
        correctSound.currentTime = 0;
        correctSound.play(); // تشغيل صوت الصح
        btn.style.backgroundColor = "lightgreen";
        correctCount++;
        showNextButton();
      } else {
        wrongSound.currentTime = 0;
        wrongSound.play(); // تشغيل صوت الخطأ
        btn.style.backgroundColor = "salmon";

        // إبراز الجواب الصحيح
        const correctBtn = optionsList.children[q.answer].querySelector("button");
        correctBtn.style.backgroundColor = "lightgreen";

        showNextButton();
      }

      // تعطيل كل الأزرار بعد الاختيار
      Array.from(optionsList.children).forEach(li => {
        li.querySelector("button").disabled = true;
      });
    });

    li.appendChild(btn);
    optionsList.appendChild(li);
  });

  questionDiv.appendChild(optionsList);
  questionsContainer.appendChild(questionDiv);

  // شغل المؤقت إذا مفعل
  if(timerEnabled) startTimer();
}

// زر التالي
function showNextButton() {
  const nextBtn = document.createElement("button");
  nextBtn.textContent = currentIndex + 1 === currentQuestions.length ? "عرض النتيجة" : "التالي";
  nextBtn.style.marginTop = "20px";
  questionsContainer.appendChild(nextBtn);

  nextBtn.addEventListener("click", () => {
    currentIndex++;
    showQuestion();
  });
}

// تشغيل التهيئة أول مرة
subjectSelect.dispatchEvent(new Event("change"));
