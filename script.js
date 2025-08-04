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

// **إضافة زر تحديث بدون كاش**
let cacheBuster = ""; // متغير للتحكم في الكاش

const cacheBtn = document.createElement("button");
cacheBtn.textContent = "تحديث بدون كاش";
cacheBtn.style.marginLeft = "10px";
cacheBtn.style.padding = "5px 10px";
cacheBtn.style.fontSize = "14px";
cacheBtn.style.cursor = "pointer";

controlsContainer.appendChild(cacheBtn);

cacheBtn.addEventListener("click", () => {
  cacheBuster = Date.now();  // رقم جديد كل مرة (timestamp)
  alert("تم تفعيل تحديث بدون كاش. اضغط زر ابدأ لتحميل المحاضرة الجديدة.");
});

// إضافة select خاص بالتنقل بين الأسئلة (سيظهر عند الضغط على ابدأ)
const questionNavigatorDiv = document.createElement("div");
questionNavigatorDiv.style.margin = "15px 0";
questionNavigatorDiv.style.display = "none"; // مخفي بالبداية
questionNavigatorDiv.innerHTML = `
  <label for="questionSelect">اختر السؤال:</label>
  <select id="questionSelect" style="width: 100%; padding: 10px; font-size: 16px; border-radius: 8px; border: 1.8px solid #007bff; background-color: #e7f1ff; color: #004085; cursor: pointer; box-sizing: border-box;"></select>
`;
controlsContainer.parentNode.insertBefore(questionNavigatorDiv, questionsContainer);

let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let answered = false;
let timerEnabled = false;
let timerInterval;
let timeLeft = 55;  // وقت 55 ثانية

// حالة كل سؤال: "unanswered", "correct", "wrong"
let questionStatus = [];

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

        // تحديث حالة السؤال إلى خاطئ
        questionStatus[currentIndex] = "wrong";
        updateQuestionNavigator(currentIndex);

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

// تحديث قائمة التنقل بين الأسئلة مع عرض حالة كل سؤال
function updateQuestionNavigator() {
  const questionSelect = document.getElementById("questionSelect");
  questionSelect.innerHTML = "";

  currentQuestions.forEach((q, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    let statusText = "";
    if (questionStatus[i] === "correct") {
      statusText = " ✓";  // علامة صح
    } else if (questionStatus[i] === "wrong") {
      statusText = " ✗";  // علامة غلط
    }
    opt.textContent = `Q${i + 1}${statusText}`;
    // لا يمكن تغيير الإجابة، لكن يمكن التنقل بين الأسئلة
    questionSelect.appendChild(opt);
  });

  // تعيين القيمة للعرض الحالي
  questionSelect.value = currentIndex;
}

// عند تغيير السؤال من خلال select
document.addEventListener("change", (e) => {
  if (e.target.id === "questionSelect") {
    const selected = parseInt(e.target.value, 10);
    if (!answered) { // لمنع تغيير السؤال أثناء الإجابة على سؤال مفتوح
      currentIndex = selected;
      showQuestion();
    } else {
      // لا يسمح بتغيير السؤال بعد الإجابة، نرجع الاختيار للسؤال الحالي
      e.target.value = currentIndex;
    }
  }
});

// عند الضغط على زر "ابدأ"
loadBtn.addEventListener("click", async () => {
  const subject = subjectSelect.value;
  const lecture = lectureSelect.value;
  const version = versionSelect.value;

  timerEnabled = document.getElementById("timerToggle").checked;

  let path = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;

  // إذا cacheBuster موجود نضيفه كـ query param
  if (cacheBuster) {
    path += `?v=${cacheBuster}`;
  }

  try {
    const module = await import(path);
    currentQuestions = module.questions;
    currentIndex = 0;
    correctCount = 0;
    questionStatus = new Array(currentQuestions.length).fill("unanswered");

    controlsContainer.style.display = "none";
    questionsContainer.style.display = "block";
    homeBtn.style.display = "block";  // إظهار زر العودة
    questionNavigatorDiv.style.display = "block"; // إظهار select التنقل

    updateQuestionNavigator();
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
  questionNavigatorDiv.style.display = "none"; // إخفاء select التنقل
  currentQuestions = [];
  currentIndex = 0;
  correctCount = 0;
  questionStatus = [];
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
      questionStatus = new Array(currentQuestions.length).fill("unanswered");
      updateQuestionNavigator();
      showQuestion();
    });

    return;
  }

  updateQuestionNavigator();

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

    // تعطيل الأزرار إذا تم الإجابة سابقًا على هذا السؤال
    if (questionStatus[currentIndex] !== "unanswered") {
      btn.disabled = true;
      // تلوين الإجابة حسب الحالة
      if (idx === q.answer && questionStatus[currentIndex] === "correct") {
        btn.style.backgroundColor = "lightgreen";
      } else if (idx === q.answer && questionStatus[currentIndex] === "wrong") {
        btn.style.backgroundColor = "lightgreen";
      }
    } else {
      btn.disabled = false;
    }

    btn.addEventListener("click", () => {
      if (answered) return; // منع الضغط أكثر من مرة
      answered = true;
      clearInterval(timerInterval);

      if (idx === q.answer) {
        correctSound.currentTime = 0;
        correctSound.play(); // تشغيل صوت الصح
        btn.style.backgroundColor = "lightgreen";
        correctCount++;
        questionStatus[currentIndex] = "correct";
        updateQuestionNavigator();
        showNextButton();
      } else {
        wrongSound.currentTime = 0;
        wrongSound.play(); // تشغيل صوت الخطأ
        btn.style.backgroundColor = "salmon";

        // إبراز الجواب الصحيح
        const correctBtn = optionsList.children[q.answer].querySelector("button");
        correctBtn.style.backgroundColor = "lightgreen";

        questionStatus[currentIndex] = "wrong";
        updateQuestionNavigator();
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
