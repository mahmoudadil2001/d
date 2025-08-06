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
  updateVersionSelector();
});

// عند تغيير النسخة، تشغيل صوت الاختيار
versionSelect.addEventListener("change", () => {
  playSubjectSound();
});

// دالة لتحديث قائمة النسخ حسب حالة تسجيل الدخول
function updateVersionSelector() {
  const versionSelect = document.getElementById("versionSelect");
  const versionLoginMessage = document.getElementById("versionLoginMessage");

  versionSelect.innerHTML = "";
  const selectedSubject = subjectSelect.value;
  const selectedLecture = lectureSelect.value;
  const versions = visibleLectures[selectedSubject]?.[selectedLecture] || [];

  if (authManager.isSignedIn()) {
    // المستخدم مسجل الدخول - اظهر جميع النسخ
    versionSelect.style.display = "block";
    versionLoginMessage.style.display = "none";

    versions.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = `Version ${v}`;
      versionSelect.appendChild(opt);
    });
  } else {
    // المستخدم غير مسجل - اخفي قائمة النسخة واجعلها تلقائياً Version 1
    versionSelect.style.display = "none";
    versionLoginMessage.style.display = "block";

    // إضافة Version 1 تلقائياً (مخفي)
    if (versions.length > 0) {
      const opt = document.createElement("option");
      opt.value = "1"; // دائماً Version 1
      opt.textContent = "Version 1";
      versionSelect.appendChild(opt);
    }
  }
}

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

  // التأكد من إخفاء العنوان بشكل دائم أثناء وضع الاختبار
  const titleElement = document.querySelector("h1");
  if (titleElement) {
    titleElement.style.display = "none";
  }

  if (currentIndex >= currentQuestions.length) {
    showFinalResults();
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
    // التأكد من إخفاء العنوان عند الانتقال للسؤال التالي
    const titleElement = document.querySelector("h1");
    if (titleElement) {
      titleElement.style.display = "none";
    }
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
    // تحديث قائمة النسخة عند تسجيل الدخول
    updateVersionSelector();
  } else {
    console.log('User signed out');
    // Reset quiz state when user signs out
    if (questionsContainer) {
      questionsContainer.innerHTML = "";
    }
    // تحديث قائمة النسخة عند تسجيل الخروج
    updateVersionSelector();
  }
});

// تشغيل التهيئة أول مرة
subjectSelect.dispatchEvent(new Event("change"));

// دالة عرض النتائج النهائية بتصميم خرافي
function showFinalResults() {
  // إخفاء عداد الوقت وزر العودة للرئيسية عند عرض النتائج
  document.getElementById("navigatorTimer").style.display = "none";
  document.getElementById("questionSelect").parentNode.style.display = "none";
  homeBtn.style.display = "none";
  
  const percentage = Math.round((correctCount / currentQuestions.length) * 100);
  const wrongCount = currentQuestions.length - correctCount;
  
  let gradeText, gradeColor, gradeIcon, motivationalText;
  
  if (percentage >= 90) {
    gradeText = "ممتاز";
    gradeColor = "#28a745";
    gradeIcon = "🏆";
    motivationalText = "أداء استثنائي! أنت طبيب أسنان محترف 👨‍⚕️";
  } else if (percentage >= 80) {
    gradeText = "جيد جداً";
    gradeColor = "#17a2b8";
    gradeIcon = "🥇";
    motivationalText = "أداء رائع! تستحق التقدير 🌟";
  } else if (percentage >= 70) {
    gradeText = "جيد";
    gradeColor = "#ffc107";
    gradeIcon = "🥈";
    motivationalText = "أداء جيد، يمكنك التحسن أكثر 💪";
  } else if (percentage >= 60) {
    gradeText = "مقبول";
    gradeColor = "#fd7e14";
    gradeIcon = "🥉";
    motivationalText = "تحتاج لمزيد من المراجعة 📚";
  } else {
    gradeText = "ضعيف";
    gradeColor = "#dc3545";
    gradeIcon = "❌";
    motivationalText = "";
  }

  questionsContainer.innerHTML = `
    <style>
      @keyframes resultSlideIn {
        from { opacity: 0; transform: translateY(50px) scale(0.9); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      
      @keyframes scoreCountUp {
        from { transform: scale(1); }
        to { transform: scale(1.1); }
      }
      
      @keyframes sparkle {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.9; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
        70% { box-shadow: 0 0 0 20px rgba(40, 167, 69, 0); }
        100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
      }
      
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
      
      .results-container {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.98));
        border-radius: 25px;
        padding: 40px 30px;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15), 0 10px 30px rgba(102, 126, 234, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.3);
        animation: resultSlideIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        position: relative;
        overflow: hidden;
      }
      
      .results-container::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transform: rotate(45deg);
        animation: shimmer 3s infinite;
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
      }
      
      .grade-icon {
        font-size: 80px;
        margin-bottom: 20px;
        animation: float 3s ease-in-out infinite;
      }
      
      .grade-title {
        font-size: 36px;
        font-weight: 700;
        color: ${gradeColor};
        margin-bottom: 15px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        animation: sparkle 2s ease-in-out infinite;
      }
      
      .percentage-circle {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: conic-gradient(${gradeColor} ${percentage * 3.6}deg, #e9ecef 0deg);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 25px auto;
        position: relative;
        animation: pulse 2s infinite;
      }
      
      .percentage-inner {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 700;
        color: ${gradeColor};
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin: 30px 0;
      }
      
      .stat-card {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 249, 250, 0.95));
        border-radius: 16px;
        padding: 20px 15px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.5);
        animation: resultSlideIn 0.8s ease-out;
        animation-delay: 0.2s;
        animation-fill-mode: both;
      }
      
      .stat-number {
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 8px;
        animation: scoreCountUp 0.3s ease-in-out infinite alternate;
      }
      
      .stat-label {
        font-size: 14px;
        color: #6c757d;
        font-weight: 600;
      }
      
      .correct-stat { color: #28a745; }
      .wrong-stat { color: #dc3545; }
      .total-stat { color: #667eea; }
      
      .action-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 30px;
        animation: resultSlideIn 0.8s ease-out;
        animation-delay: 0.6s;
        animation-fill-mode: both;
      }
      
      .action-btn {
        padding: 15px 25px;
        font-size: 16px;
        font-weight: 600;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'Tajawal', sans-serif;
        position: relative;
        overflow: hidden;
      }
      
      .action-btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
        transform: translate(-50%, -50%);
      }
      
      .action-btn:hover::before {
        width: 300px;
        height: 300px;
      }
      
      .restart-btn {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      }
      
      .restart-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
      }
      
      .home-btn {
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
        box-shadow: 0 8px 25px rgba(108, 117, 125, 0.3);
      }
      
      .home-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 35px rgba(108, 117, 125, 0.4);
      }
      
      @media (max-width: 480px) {
        .stats-grid {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .action-buttons {
          flex-direction: column;
        }
        
        .percentage-circle {
          width: 120px;
          height: 120px;
        }
        
        .percentage-inner {
          width: 100px;
          height: 100px;
          font-size: 24px;
        }
        
        .grade-title {
          font-size: 28px;
        }
        
        .grade-icon {
          font-size: 60px;
        }
      }
    </style>
    
    <div class="results-container">
      <div class="grade-icon">${gradeIcon}</div>
      <div class="grade-title">${gradeText}</div>
      
      <div class="percentage-circle">
        <div class="percentage-inner">${percentage}%</div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number correct-stat">${correctCount}</div>
          <div class="stat-label">إجابات صحيحة</div>
        </div>
        <div class="stat-card">
          <div class="stat-number wrong-stat">${wrongCount}</div>
          <div class="stat-label">إجابات خاطئة</div>
        </div>
        <div class="stat-card">
          <div class="stat-number total-stat">${currentQuestions.length}</div>
          <div class="stat-label">إجمالي الأسئلة</div>
        </div>
      </div>
      
      <div class="action-buttons">
        <button id="restartBtn" class="action-btn restart-btn">
          🔄 إعادة المحاولة
        </button>
        <button id="backToHomeBtn" class="action-btn home-btn">
          🏠 العودة للرئيسية
        </button>
      </div>
    </div>
  `;

  // تشغيل الأصوات حسب النتيجة
  setTimeout(() => {
    if (percentage >= 70) {
      correctSound.currentTime = 0;
      correctSound.play();
    } else {
      wrongSound.currentTime = 0;
      wrongSound.play();
    }
  }, 500);

  // إضافة مستمعي الأحداث للأزرار
  document.getElementById("restartBtn").addEventListener("click", () => {
    currentIndex = 0;
    correctCount = 0;
    questionStatus = new Array(currentQuestions.length).fill("unanswered");
    updateQuestionNavigator();
    showQuestion();
  });

  document.getElementById("backToHomeBtn").addEventListener("click", () => {
    // إظهار العناصر المخفية قبل العودة للرئيسية
    document.getElementById("questionSelect").parentNode.style.display = "block";
    homeBtn.style.display = "block";
    homeBtn.click();
  });
}

// جعل دالة updateVersionSelector متاحة عالمياً
window.updateVersionSelector = updateVersionSelector;