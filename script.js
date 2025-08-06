import { visibleLectures } from './show.js';
import { lectureNames } from './lectureNames.js';
import AuthManager from './auth.js';

// Initialize Authentication
const authManager = new AuthManager();

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
    تفعيل المؤقت 43 ثانية لكل سؤال
  </label>
`;
controlsContainer.insertBefore(timerDiv, loadBtn);

// إضافة select خاص بالتنقل بين الأسئلة (سيظهر عند الضغط على ابدأ)
const questionNavigatorDiv = document.createElement("div");
questionNavigatorDiv.style.margin = "15px 0";
questionNavigatorDiv.style.display = "none"; // مخفي بالبداية
questionNavigatorDiv.innerHTML = `
  <select id="questionSelect" style="width: 100%; padding: 10px; font-size: 16px; border-radius: 8px; border: 1.8px solid #007bff; background-color: #e7f1ff; color: #004085; cursor: pointer; box-sizing: border-box;"></select>
  <div id="navigatorTimer" style="color: red; font-size: 16px; font-weight: bold; margin-top: 2px; text-align: center; display: none;"></div>
`;
controlsContainer.parentNode.insertBefore(questionNavigatorDiv, questionsContainer);

let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let answered = false;
let timerEnabled = false;
let timerInterval;
let timeLeft = 43;  // زمن 43 ثانية لكل سؤال

// حالة كل سؤال: "unanswered", "correct", "wrong"
let questionStatus = [];

// تحميل ملفات الصوت
const correctSound = new Audio('./sounds/correct.wav');
const wrongSound = new Audio('./sounds/wrong.wav');
const clickSound = new Audio('./sounds/click.wav');
const uiClickSound = new Audio('./sounds/uiclick.wav');
const subjectSound = new Audio('./sounds/subject.wav');  // صوت اختيار مادة/محاضرة/نسخة
const timeDownSound = new Audio('./sounds/timedown.wav'); // صوت المؤقت عند بداية السؤال

// تشغيل صوت click عند الضغط على أي زر ما عدا خيارات الإجابة
document.addEventListener("click", (e) => {
  const isButton = e.target.tagName === "BUTTON";
  const isOptionBtn = e.target.classList.contains("option-btn");
  if (isButton && !isOptionBtn) {
    clickSound.currentTime = 0;
    clickSound.play();
  }
});

// تشغيل صوت عند فتح select box (عند الضغط فقط)
[subjectSelect, lectureSelect, versionSelect].forEach(select => {
  select.addEventListener("mousedown", () => {
    uiClickSound.currentTime = 0;
    uiClickSound.play();
  });
});

// دالة لتشغيل صوت اختيار المادة/المحاضرة/النسخة
function playSubjectSound() {
  subjectSound.currentTime = 0;
  subjectSound.play();
}

// تعبئة قائمة المواد
const subjects = Object.keys(visibleLectures);
subjects.forEach(subject => {
  const opt = document.createElement("option");
  opt.value = subject;
  opt.textContent = subject;
  subjectSelect.appendChild(opt);
});

// عند تغيير المادة، يتم تحميل المحاضرات + تشغيل صوت الاختيار
subjectSelect.addEventListener("change", () => {
  playSubjectSound();

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

// عند تغيير المحاضرة، يتم تحميل النسخ + تشغيل صوت الاختيار
lectureSelect.addEventListener("change", () => {
  playSubjectSound();

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

// عند تغيير النسخة، تشغيل صوت الاختيار
versionSelect.addEventListener("change", () => {
  playSubjectSound();
});

// دالة بدء المؤقت لكل سؤال
function startTimer() {
  timeLeft = 43;  // وقت 43 ثانية
  updateTimerText();

  // تشغيل صوت بداية السؤال
  timeDownSound.currentTime = 0;
  timeDownSound.play();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerText();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      stopTimeDownSound();
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
        updateQuestionNavigator();

        // عرض زر التالي فقط بدون انتقال تلقائي
        showNextButton();
      }
    }
  }, 1000);
}

function updateTimerText() {
  const navigatorTimer = document.getElementById("navigatorTimer");

  if (timerEnabled && !answered && timeLeft > 0) {
    navigatorTimer.textContent = `الوقت المتبقي: ${timeLeft} ثانية`;
    navigatorTimer.style.display = "block";
    
    // تغيير اللون والنبضات حسب الوقت المتبقي
    navigatorTimer.className = ""; // إزالة الكلاسات السابقة
    
    if (timeLeft > 25) {
      // أكثر من 25 ثانية - أخضر مع نبضات بطيئة
      navigatorTimer.classList.add("timer-safe");
    } else if (timeLeft > 10) {
      // من 10 إلى 25 ثانية - أصفر مع نبضات متوسطة
      navigatorTimer.classList.add("timer-warning");
    } else {
      // أقل من 10 ثواني - أحمر مع نبضات سريعة
      navigatorTimer.classList.add("timer-danger");
    }
  } else {
    navigatorTimer.style.display = "none";
  }
}

function stopTimeDownSound() {
  timeDownSound.pause();
  timeDownSound.currentTime = 0;
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

    opt.textContent = `Q${i + 1}/${currentQuestions.length}${statusText}`;
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

  const navigatorTimer = document.getElementById("navigatorTimer");
  if (!timerEnabled) {
    navigatorTimer.style.display = "none";
  }

  const path = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;

  try {
    const module = await import(path);
    currentQuestions = module.questions;
    currentIndex = 0;
    correctCount = 0;
    questionStatus = new Array(currentQuestions.length).fill("unanswered");

    controlsContainer.style.display = "none";
    questionsContainer.style.display = "block";
    homeBtn.style.display = "block";
    questionNavigatorDiv.style.display = "block";

    // Hide the title when entering quiz mode
    document.querySelector("h1").style.display = "none";
    
    // Hide user info when entering quiz mode
    authManager.updateUserInfoVisibility();

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
  questionNavigatorDiv.style.display = "none";

  // Show the title when returning to home
  document.querySelector("h1").style.display = "block";
  
  // Show user info when returning to home
  authManager.updateUserInfoVisibility();

  currentQuestions = [];
  currentIndex = 0;
  correctCount = 0;
  questionStatus = [];
  questionsContainer.innerHTML = "";
  clearInterval(timerInterval);
  stopTimeDownSound();

  // إخفاء عداد الوقت عند العودة
  document.getElementById("navigatorTimer").style.display = "none";
});

// دالة عرض سؤال واحد فقط مع الخيارات
function showQuestion() {
  answered = false;
  clearInterval(timerInterval);
  stopTimeDownSound();
  questionsContainer.innerHTML = "";

  if (currentIndex >= currentQuestions.length) {
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

  const questionDiv = document.createElement("div");
  questionDiv.innerHTML = `
    <h2>${q.question}</h2>
  `;

  const optionsList = document.createElement("ul");
  optionsList.style.listStyle = "none";
  optionsList.style.padding = "0";

  q.options.forEach((opt, idx) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = opt;
    btn.classList.add("option-btn");
    btn.style.display = "block";
    btn.style.margin = "8px 0";
    btn.style.padding = "8px 12px";
    btn.style.width = "100%";

    if (questionStatus[currentIndex] !== "unanswered") {
      btn.disabled = true;
      if (idx === q.answer && (questionStatus[currentIndex] === "correct" || questionStatus[currentIndex] === "wrong")) {
        btn.style.backgroundColor = "lightgreen";
      }
    } else {
      btn.disabled = false;
    }

    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      clearInterval(timerInterval);
      stopTimeDownSound();

      if (idx === q.answer) {
        correctSound.currentTime = 0;
        correctSound.play();
        btn.style.backgroundColor = "lightgreen";
        correctCount++;
        questionStatus[currentIndex] = "correct";
        updateQuestionNavigator();
        showNextButton();
      } else {
        wrongSound.currentTime = 0;
        wrongSound.play();
        btn.style.backgroundColor = "salmon";

        const correctBtn = optionsList.children[q.answer].querySelector("button");
        correctBtn.style.backgroundColor = "lightgreen";

        questionStatus[currentIndex] = "wrong";
        updateQuestionNavigator();
        showNextButton();
      }

      Array.from(optionsList.children).forEach(li => {
        li.querySelector("button").disabled = true;
      });
    });

    li.appendChild(btn);
    optionsList.appendChild(li);
  });

  questionDiv.appendChild(optionsList);
  questionsContainer.appendChild(questionDiv);

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

// Authentication Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Google Sign-in (Sign In Page)
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', () => {
      authManager.signInWithGoogle();
    });
  }

  // Google Sign-up (Sign Up Page)
  const googleSignUpBtn = document.getElementById('googleSignUpBtn');
  if (googleSignUpBtn) {
    googleSignUpBtn.addEventListener('click', () => {
      authManager.signInWithGoogle();
    });
  }

  // Sign In Form
  const signInForm = document.getElementById('signInForm');
  if (signInForm) {
    signInForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('signInEmailInput').value;
      const password = document.getElementById('signInPasswordInput').value;
      authManager.signInWithEmail(email, password);
    });
  }

  // Sign Up Form
  const signUpForm = document.getElementById('signUpForm');
  if (signUpForm) {
    signUpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('fullNameInput').value;
      const group = document.getElementById('groupInput').value;
      const email = document.getElementById('signUpEmailInput').value;
      const password = document.getElementById('signUpPasswordInput').value;
      const confirmPassword = document.getElementById('confirmPasswordInput').value;
      
      if (!fullName || !group || !email || !password || !confirmPassword) {
        authManager.showError('يرجى ملء جميع الحقول');
        return;
      }
      
      if (password !== confirmPassword) {
        authManager.showError('كلمة المرور وتأكيد كلمة المرور غير متطابقتين');
        return;
      }
      
      authManager.createAccount(email, password, fullName, group);
    });
  }

  // Go to Sign Up Button
  const goToSignUpBtn = document.getElementById('goToSignUpBtn');
  if (goToSignUpBtn) {
    goToSignUpBtn.addEventListener('click', () => {
      authManager.showSignUpPage();
    });
  }

  // Back to Sign In Button
  const backToSignInBtn = document.getElementById('backToSignInBtn');
  if (backToSignInBtn) {
    backToSignInBtn.addEventListener('click', () => {
      authManager.showSignInPage();
    });
  }
});

// Set authentication state change callback
authManager.setAuthChangeCallback((user) => {
  if (user) {
    console.log('User signed in:', user);
    // Initialize quiz when user signs in
    if (subjectSelect) {
      subjectSelect.dispatchEvent(new Event("change"));
    }
  } else {
    console.log('User signed out');
    // Reset quiz state when user signs out
    if (questionsContainer) {
      questionsContainer.innerHTML = "";
    }
  }
});

// تشغيل التهيئة أول مرة (only if user is authenticated)
if (authManager.isSignedIn()) {
  subjectSelect.dispatchEvent(new Event("change"));
}
