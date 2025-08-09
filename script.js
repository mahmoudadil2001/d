import { visibleLectures } from "./show.js";
import { lectureNames } from "./lectureNames.js";
import AuthManager from "./auth.js";
import FriendsManager from "./friends.js";
import ChatManager from "./chat.js";

// Initialize auth, friends and chat managers
const authManager = new AuthManager();
const friendsManager = new FriendsManager(authManager);
let chatManager = null;

// تهيئة ChatManager بعد تحميل الصفحة بالكامل
document.addEventListener('DOMContentLoaded', () => {
  try {
    chatManager = new ChatManager(authManager, friendsManager);
    console.log('ChatManager initialized successfully');

    // إضافة دالة الدردشة إلى النطاق العام
    window.openChatWithFriend = (friendId, friendName) => {
      if (chatManager && authManager.isSignedIn()) {
        chatManager.openChatWithFriend(friendId, friendName);
      } else {
        alert('يجب تسجيل الدخول أولاً لاستخدام الدردشة');
      }
    };

    // إضافة دالة إغلاق الدردشة إلى النطاق العام
    window.closeChatWindow = () => {
      if (chatManager) {
        chatManager.closeChatWindow();
      }
    };
  } catch (error) {
    console.error('Error initializing ChatManager:', error);
  }
});

const subjectSelect = document.getElementById("subjectSelect");
const lectureSelect = document.getElementById("lectureSelect");
const versionSelect = document.getElementById("versionSelect");
const loadBtn = document.getElementById("loadBtn");
const questionsContainer = document.getElementById("questionsContainer");
const controlsContainer = document.getElementById("controlsContainer");
const homeBtn = document.getElementById("homeBtn");

// إضافة زر "المزيد" للخيارات الإضافية
const moreOptionsDiv = document.createElement("div");
moreOptionsDiv.style.margin = "10px 0";
moreOptionsDiv.innerHTML = `
  <button type="button" id="moreOptionsToggle" style="
    background: linear-gradient(135deg, #6c757d, #495057);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    font-family: 'Tajawal', sans-serif;
    font-weight: 600;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    margin-bottom: 10px;
  ">
    <span id="moreOptionsIcon">▼</span>
    المزيد من الخيارات
  </button>

  <div id="moreOptionsContent" style="
    max-height: 0;
    overflow: hidden;
    transition: all 0.3s ease;
    opacity: 0;
  ">
    <div style="
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 15px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-top: 5px;
    ">
      <div style="margin: 10px 0;">
        <label style="
          color: #ffffff;
          text-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
        ">
          <input type="checkbox" id="timerToggle" />
          تفعيل المؤقت 43 ثانية لكل سؤال
        </label>
      </div>
      
      <div style="margin: 10px 0;">
        <label style="
          color: #ffffff;
          text-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <input type="checkbox" id="shuffleToggle" />
          ترتيب الأسئلة بشكل عشوائي
          <span id="shuffleLoginHint" style="
            color: #ffc107;
            font-size: 12px;
            display: none;
          ">(سجل لتفعيل الميزة)</span>
        </label>
      </div>

      <div style="margin: 10px 0;">
        <label style="
          color: #ffffff;
          text-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <input type="checkbox" id="shuffleAnswersToggle" />
          ترتيب الأجوبة بشكل عشوائي
          <span id="shuffleAnswersLoginHint" style="
            color: #ffc107;
            font-size: 12px;
            display: none;
          ">(سجل لتفعيل الميزة)</span>
        </label>
      </div>
    </div>
  </div>
`;
controlsContainer.insertBefore(moreOptionsDiv, loadBtn);

// إضافة وظيفة توسيع/إخفاء الخيارات
document.getElementById("moreOptionsToggle").addEventListener("click", () => {
  const content = document.getElementById("moreOptionsContent");
  const icon = document.getElementById("moreOptionsIcon");
  const button = document.getElementById("moreOptionsToggle");

  if (content.style.maxHeight === "0px" || content.style.maxHeight === "") {
      // فتح الخيارات
      content.style.maxHeight = "250px";
      content.style.opacity = "1";
      icon.textContent = "▲";
      button.style.background = "linear-gradient(135deg, #28a745, #20c997)";
    } else {
      // إغلاق الخيارات
      content.style.maxHeight = "0px";
      content.style.opacity = "0";
      icon.textContent = "▼";
      button.style.background = "linear-gradient(135deg, #6c757d, #495057)";
    }
});

// إضافة select خاص بالتنقل بين الأسئلة (سيظهر عند الضغط على ابدأ)
const questionNavigatorDiv = document.createElement("div");
questionNavigatorDiv.style.margin = "15px 0";
questionNavigatorDiv.style.display = "none"; // مخفي بالبداية
questionNavigatorDiv.innerHTML = `
  <select id="questionSelect" style="width: 100%; padding: 10px; font-size: 16px; border-radius: 8px; border: 1.8px solid #007bff; background-color: #e7f1ff; color: #004085; cursor: pointer; box-sizing: border-box;"></select>
  <div id="navigatorTimer" style="color: red; font-size: 16px; font-weight: bold; margin-top: 2px; text-align: center; display: none;"></div>
`;
controlsContainer.parentNode.insertBefore(
  questionNavigatorDiv,
  questionsContainer,
);

let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let answered = false;
let timerEnabled = false;
let shuffleEnabled = false;
let shuffleAnswersEnabled = false;
let timerInterval;
let timeLeft = 43; // زمن 43 ثانية لكل سؤال

// حالة كل سؤال: "unanswered", "correct", "wrong"
let questionStatus = [];

// دالة خلط الأسئلة بشكل عشوائي
function shuffleQuestions(questions) {
  const shuffled = [...questions]; // نسخ المصفوفة
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// دالة خلط الأجوبة لسؤال واحد
function shuffleAnswers(question) {
  const shuffledQuestion = { ...question }; // نسخ السؤال
  const options = [...question.options]; // نسخ الأجوبة
  const correctAnswer = question.answer;

  // إنشاء مصفوفة من الأجوبة مع فهارسها الأصلية
  const answersWithIndexes = options.map((option, index) => ({
    text: option,
    originalIndex: index
  }));

  // خلط المصفوفة
  for (let i = answersWithIndexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answersWithIndexes[i], answersWithIndexes[j]] = [answersWithIndexes[j], answersWithIndexes[i]];
  }

  // تحديث الأجوبة والفهرس الصحيح
  shuffledQuestion.options = answersWithIndexes.map(item => item.text);
  shuffledQuestion.answer = answersWithIndexes.findIndex(item => item.originalIndex === correctAnswer);

  return shuffledQuestion;
}

// تحميل ملفات الصوت
const correctSound = new Audio("./sounds/correct.wav");
const wrongSound = new Audio("./sounds/wrong.wav");
const clickSound = new Audio("./sounds/click.wav");
const uiClickSound = new Audio("./sounds/uiclick.wav");
const subjectSound = new Audio("./sounds/subject.wav"); // صوت اختيار مادة/محاضرة/نسخة
const timeDownSound = new Audio("./sounds/timedown.mp3"); // صوت المؤقت عند بداية السؤال

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
[subjectSelect, lectureSelect, versionSelect].forEach((select) => {
  select.addEventListener("mousedown", () => {
    uiClickSound.currentTime = 0;
    uiClickSound.play();
  });
});

// متغير لمنع تشغيل الصوت عند التحميل الأولي
let isInitialLoad = true;

// دالة لتشغيل صوت اختيار المادة/المحاضرة/النسخة
function playSubjectSound() {
  if (!isInitialLoad) {
    subjectSound.currentTime = 0;
    subjectSound.play();
  }
}

// تعبئة قائمة المواد
const subjects = Object.keys(visibleLectures);
subjects.forEach((subject) => {
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

  // تصفية المحاضرات لإظهار الأرقام الموجبة فقط وتجاهل جميع الكلمات والأحرف
  const numericLectures = lectures.filter(lec => {
    // قائمة الكلمات المكتوبة بالأرقام لتجاهلها
    const textNumbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 
                        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
                        'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand'];
    
    // التحقق من عدم وجود كلمات نصية
    const lecLower = lec.toString().toLowerCase();
    const hasTextNumbers = textNumbers.some(textNum => lecLower.includes(textNum));
    if (hasTextNumbers) return false;
    
    // التحقق من عدم وجود أحرف غير رقمية
    if (!/^\d+$/.test(lec)) return false;
    
    // التحقق الثاني: تحويل لرقم والتأكد أنه موجب
    const num = parseInt(lec, 10);
    if (isNaN(num) || num <= 0) return false;
    
    // التحقق الثالث: التأكد أن النتيجة مطابقة تماماً للمدخل
    if (lec !== num.toString()) return false;
    
    return true;
  });

  numericLectures.forEach((lec) => {
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

  if (!versionSelect || !versionLoginMessage) return;

  versionSelect.innerHTML = "";
  const selectedSubject = subjectSelect.value;
  const selectedLecture = lectureSelect.value;
  const versions = visibleLectures[selectedSubject]?.[selectedLecture] || [];

  console.log('updateVersionSelector called, isSignedIn:', authManager.isSignedIn());
  console.log('Available versions:', versions);
  console.log('Current user:', authManager.currentUser);

  // التحقق المحسن من حالة تسجيل الدخول
  const isUserSignedIn = authManager &&
                        authManager.currentUser &&
                        authManager.currentUser.uid &&
                        authManager.isSignedIn();

  if (isUserSignedIn) {
    // المستخدم مسجل الدخول - اظهر جميع النسخ
    versionSelect.style.display = "block";
    versionLoginMessage.style.display = "none";

    versions.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = `Version ${v}`;
      versionSelect.appendChild(opt);
    });

    console.log('Showing all versions for signed-in user');
  } else {
    // المستخدم غير مسجل - اخفي قائمة النسخة واجعلها تلقائياً Version 1
    versionSelect.style.display = "none";
    versionLoginMessage.style.display = "block";

    // إضافة Version 1 تلقائياً (مخفي)
    if (versions.length > 0) {
      const opt = document.createElement("option");
      opt.value = versions[0]; // أول نسخة متاحة بدلاً من رقم 1 ثابت
      opt.textContent = `Version ${versions[0]}`;
      versionSelect.appendChild(opt);
    }

    console.log('Showing only version 1 for non-signed-in user');
  }
}

// دالة بدء المؤقت لكل سؤال
function startTimer() {
  timeLeft = 43; // وقت 43 ثانية
  updateTimerText();

  // تشغيل صوت بداية السؤال مع التأكد من التشغيل
  timeDownSound.currentTime = 0;
  const playPromise = timeDownSound.play();

  // التعامل مع متصفحات تمنع التشغيل التلقائي
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log("Timer sound started successfully");
      })
      .catch((error) => {
        console.log("Timer sound autoplay prevented:", error);
      });
  }

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
          options[currentQuestions[currentIndex].answer].style.backgroundColor =
            "lightgreen";
        }

        // تعطيل كل الأزرار بعد انتهاء الوقت
        options.forEach((btn) => (btn.disabled = true));

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
      statusText = " ✓"; // علامة صح
    } else if (questionStatus[i] === "wrong") {
      statusText = " ✗"; // علامة غلط
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
    // السماح بالتنقل إذا كان السؤال الحالي مجاب عليه أو السؤال المطلوب مجاب عليه
    if (!answered || questionStatus[currentIndex] !== "unanswered" || questionStatus[selected] !== "unanswered") {
      currentIndex = selected;
      showQuestion();
    } else {
      // منع التنقل فقط إذا كان السؤال الحالي قيد الإجابة (timer running)
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
  
  // التحقق من تسجيل الدخول قبل تفعيل ميزات الترتيب العشوائي
  const isUserSignedIn = authManager &&
                        authManager.currentUser &&
                        authManager.currentUser.uid &&
                        authManager.isSignedIn();
  
  shuffleEnabled = isUserSignedIn && document.getElementById("shuffleToggle").checked;
  shuffleAnswersEnabled = isUserSignedIn && document.getElementById("shuffleAnswersToggle").checked;

  const navigatorTimer = document.getElementById("navigatorTimer");
  if (!timerEnabled) {
    navigatorTimer.style.display = "none";
  }

  const path = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;

  try {
    const module = await import(path);
    let questions = module.questions;

    // خلط الأسئلة إذا كان الخيار مفعل
    if (shuffleEnabled) {
      questions = shuffleQuestions(questions);
    }

    // خلط الأجوبة إذا كان الخيار مفعل
    if (shuffleAnswersEnabled) {
      questions = questions.map(question => shuffleAnswers(question));
    }

    currentQuestions = questions;
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

// عند الضغط على زر "العودة"
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
      answered = true; // تعيين السؤال كمجاب عليه إذا كان قد تم الإجابة عليه من قبل
      btn.disabled = true;
      if (
        idx === q.answer &&
        (questionStatus[currentIndex] === "correct" ||
          questionStatus[currentIndex] === "wrong")
      ) {
        btn.style.backgroundColor = "lightgreen";
      }
    } else {
      btn.disabled = false;
    }

    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      clearInterval(timerInterval);
      stopTimeDownSound(); // إيقاف صوت العد التنازلي عند الإجابة

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

        const correctBtn =
          optionsList.children[q.answer].querySelector("button");
        correctBtn.style.backgroundColor = "lightgreen";

        questionStatus[currentIndex] = "wrong";
        updateQuestionNavigator();
        showNextButton();
      }

      Array.from(optionsList.children).forEach((li) => {
        li.querySelector("button").disabled = true;
      });
    });

    li.appendChild(btn);
    optionsList.appendChild(li);
  });

  questionDiv.appendChild(optionsList);
  questionsContainer.appendChild(questionDiv);

  // تشغيل المؤقت فقط إذا كان السؤال لم تتم الإجابة عليه بعد
  if (timerEnabled && questionStatus[currentIndex] === "unanswered") {
    startTimer();
  } else {
    // إخفاء المؤقت للأسئلة المجاب عليها
    const navigatorTimer = document.getElementById("navigatorTimer");
    navigatorTimer.style.display = "none";
  }
}

// زر التالي
function showNextButton() {
  const nextBtn = document.createElement("button");
  nextBtn.textContent =
    currentIndex + 1 === currentQuestions.length ? "عرض النتيجة" : "التالي";
  nextBtn.style.marginTop = "20px";
  nextBtn.style.background = "linear-gradient(135deg, #6c757d, #495057)";
  nextBtn.style.color = "white";
  nextBtn.style.border = "none";
  nextBtn.style.borderRadius = "12px";
  nextBtn.style.padding = "12px 16px";
  nextBtn.style.fontSize = "16px";
  nextBtn.style.cursor = "pointer";
  nextBtn.style.width = "100%";
  nextBtn.style.boxSizing = "border-box";
  nextBtn.style.transition = "all 0.3s ease";
  nextBtn.style.fontWeight = "600";
  nextBtn.style.fontFamily = "'Tajawal', sans-serif";

  nextBtn.addEventListener("mouseenter", () => {
    nextBtn.style.background = "linear-gradient(135deg, #5a6268, #343a40)";
    nextBtn.style.transform = "translateY(-2px)";
    nextBtn.style.boxShadow = "0 8px 25px rgba(108, 117, 125, 0.3)";
  });

  nextBtn.addEventListener("mouseleave", () => {
    nextBtn.style.background = "linear-gradient(135deg, #6c757d, #495057)";
    nextBtn.style.transform = "translateY(0)";
    nextBtn.style.boxShadow = "none";
  });

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
document.addEventListener("DOMContentLoaded", () => {
  // Google Sign-in (Sign In Page)
  const googleSignInBtn = document.getElementById("googleSignInBtn");
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", () => {
      authManager.signInWithGoogle();
    });
  }

  // Google Sign-up (Sign Up Page)
  const googleSignUpBtn = document.getElementById("googleSignUpBtn");
  if (googleSignUpBtn) {
    googleSignUpBtn.addEventListener("click", () => {
      authManager.signInWithGoogle();
    });
  }

  // Sign In Form
  const signInForm = document.getElementById("signInForm");
  if (signInForm) {
    signInForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("signInEmailInput").value;
      const password = document.getElementById("signInPasswordInput").value;
      authManager.signInWithEmail(email, password);
    });
  }

  // Sign Up Form
  const signUpForm = document.getElementById("signUpForm");
  if (signUpForm) {
    signUpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fullName = document.getElementById("fullNameInput").value;
      const group = document.getElementById("groupInput").value;
      const email = document.getElementById("signUpEmailInput").value;
      const password = document.getElementById("signUpPasswordInput").value;
      const confirmPassword = document.getElementById(
        "confirmPasswordInput",
      ).value;

      if (!fullName || !group || !email || !password || !confirmPassword) {
        authManager.showError("يرجى ملء جميع الحقول");
        return;
      }

      if (password !== confirmPassword) {
        authManager.showError("كلمة المرور وتأكيد كلمة المرور غير متطابقتين");
        return;
      }

      authManager.createAccount(email, password, fullName, group);
    });
  }

  // Go to Sign Up Button
  const goToSignUpBtn = document.getElementById("goToSignUpBtn");
  if (goToSignUpBtn) {
    goToSignUpBtn.addEventListener("click", () => {
      authManager.showSignUpPage();
    });
  }

  // Back to Sign In Button
  const backToSignInBtn = document.getElementById("backToSignInBtn");
  if (backToSignInBtn) {
    backToSignInBtn.addEventListener("click", () => {
      authManager.showSignInPage();
    });
  }
});

// إضافة مستمعي أحداث لنافذة مميزات تسجيل الدخول
document.addEventListener('DOMContentLoaded', () => {
  const loginFeaturesInfo = document.getElementById('loginFeaturesInfo');
  const loginFeaturesModal = document.getElementById('loginFeaturesModal');
  const closeLoginFeaturesModal = document.getElementById('closeLoginFeaturesModal');
  const startLoginFromModal = document.getElementById('startLoginFromModal');

  // فتح النافذة عند الضغط على علامة التعجب
  if (loginFeaturesInfo) {
    loginFeaturesInfo.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (loginFeaturesModal) {
        loginFeaturesModal.style.display = 'flex';
      }
    });

    // تأثير hover لعلامة التعجب
    loginFeaturesInfo.addEventListener('mouseenter', () => {
      loginFeaturesInfo.style.background = 'rgba(200, 35, 51, 0.9)';
      loginFeaturesInfo.style.transform = 'scale(1.1)';
    });

    loginFeaturesInfo.addEventListener('mouseleave', () => {
      loginFeaturesInfo.style.background = 'rgba(220, 53, 69, 0.7)';
      loginFeaturesInfo.style.transform = 'scale(1)';
    });
  }

  // إغلاق النافذة
  if (closeLoginFeaturesModal) {
    closeLoginFeaturesModal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (loginFeaturesModal) {
        loginFeaturesModal.style.display = 'none';
      }
    });

    // تأثير hover لزر الإغلاق
    closeLoginFeaturesModal.addEventListener('mouseenter', () => {
      closeLoginFeaturesModal.style.background = 'rgba(255, 255, 255, 0.3)';
      closeLoginFeaturesModal.style.transform = 'scale(1.1)';
    });

    closeLoginFeaturesModal.addEventListener('mouseleave', () => {
      closeLoginFeaturesModal.style.background = 'rgba(255, 255, 255, 0.2)';
      closeLoginFeaturesModal.style.transform = 'scale(1)';
    });
  }

  // إغلاق النافذة بالضغط خارجها
  if (loginFeaturesModal) {
    loginFeaturesModal.addEventListener('click', (e) => {
      if (e.target === loginFeaturesModal) {
        loginFeaturesModal.style.display = 'none';
      }
    });
  }

  // زر البدء من النافذة
  if (startLoginFromModal) {
    startLoginFromModal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // إغلاق النافذة أولاً
      if (loginFeaturesModal) {
        loginFeaturesModal.style.display = 'none';
      }
      
      // فتح صفحة تسجيل الدخول
      if (authManager) {
        authManager.showSignInPage();
      }
    });

    // تأثير hover لزر البدء
    startLoginFromModal.addEventListener('mouseenter', () => {
      startLoginFromModal.style.background = 'linear-gradient(135deg, #218838, #1ba085)';
      startLoginFromModal.style.transform = 'translateY(-2px)';
      startLoginFromModal.style.boxShadow = '0 12px 35px rgba(40, 167, 69, 0.5)';
    });

    startLoginFromModal.addEventListener('mouseleave', () => {
      startLoginFromModal.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
      startLoginFromModal.style.transform = 'translateY(0)';
      startLoginFromModal.style.boxShadow = '0 8px 25px rgba(40, 167, 69, 0.4)';
    });
  }

  // إضافة تأثيرات hover للبطاقات
  const featureCards = document.querySelectorAll('#loginFeaturesModal [style*="rgba(255, 255, 255, 0.15)"]');
  featureCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.background = 'rgba(255, 255, 255, 0.25)';
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.background = 'rgba(255, 255, 255, 0.15)';
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    });
  });
});

// Set authentication state change callback
authManager.setAuthChangeCallback((user) => {
  // تحديث المستخدم الحالي في FriendsManager
  friendsManager.updateCurrentUser(user);

  if (user) {
    console.log("User signed in:", user);
    // Initialize quiz when user signs in
    if (subjectSelect) {
      subjectSelect.dispatchEvent(new Event("change"));
    }
    // تحديث قائمة النسخة عند تسجيل الدخول
    setTimeout(() => {
      updateVersionSelector();
      updateShuffleControls();
    }, 500);
    // إظهار زر الأصدقاء
    setupFriendsSystem();

    // بدء الاستماع للرسائل الجديدة من الأصدقاء
    setTimeout(() => {
      chatManager.startGlobalMessageListener();
    }, 2000);
  } else {
    console.log("User signed out");
    // Reset quiz state when user signs out
    if (questionsContainer) {
      questionsContainer.innerHTML = "";
    }
    // تحديث قائمة النسخة عند تسجيل الخروج
    setTimeout(() => {
      updateVersionSelector();
      updateShuffleControls();
    }, 500);
    // إخفاء زر الأصدقاء
    hideFriendsSystem();

    // إيقاف الاستماع للرسائل
    chatManager.stopGlobalMessageListener();
  }
});

// تهيئة نظام الأصدقاء
function setupFriendsSystem() {
  // إظهار زر الأصدقاء
  const friendsBtn = document.getElementById("friendsBtn");
  if (friendsBtn) {
    friendsBtn.style.display = "flex";
  }

  // تحديث التنبيهات
  updateFriendRequestsBadge();
  updateOnlineFriendsBadge();

  // إعداد أحداث النافذة
  setupFriendsModal();

  // تحديث التنبيهات كل 30 ثانية
  setInterval(() => {
    if (authManager.isSignedIn()) {
      updateOnlineFriendsBadge();
      updateFriendRequestsBadge();
    }
  }, 30000);
}

// إخفاء نظام الأصدقاء
function hideFriendsSystem() {
  const friendsModal = document.getElementById("friendsModal");
  const friendsBtn = document.getElementById("friendsBtn");

  if (friendsModal) {
    friendsModal.style.display = "none";
  }

  if (friendsBtn) {
    friendsBtn.style.display = "none";
  }
}

// إعداد نافذة الأصدقاء
function setupFriendsModal() {
  const friendsModal = document.getElementById("friendsModal");
  const closeFriendsModal = document.getElementById("closeFriendsModal");
  const myFriendsTab = document.getElementById("myFriendsTab");
  const searchFriendsTab = document.getElementById("searchFriendsTab");
  const friendRequestsTab = document.getElementById("friendRequestsTab");
  const friendSearchInput = document.getElementById("friendSearchInput");

  // إغلاق النافذة
  if (closeFriendsModal) {
    closeFriendsModal.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      friendsModal.style.display = "none";
    });
  }

  // إغلاق النافذة بالضغط خارجها
  if (friendsModal) {
    friendsModal.addEventListener("click", (e) => {
      if (e.target === friendsModal) {
        friendsModal.style.display = "none";
      }
    });
  }

  // تبويب أصدقائي
  if (myFriendsTab) {
    myFriendsTab.addEventListener("click", () => {
      switchTab("myFriends");
      loadMyFriends();
    });
  }

  // زر تحديث حالة الأصدقاء
  const refreshFriendsBtn = document.getElementById("refreshFriendsBtn");
  if (refreshFriendsBtn) {
    refreshFriendsBtn.addEventListener("click", () => {
      loadMyFriends();
      // تأثير بصري للزر
      refreshFriendsBtn.style.transform = "rotate(360deg)";
      setTimeout(() => {
        refreshFriendsBtn.style.transform = "rotate(0deg)";
      }, 500);
    });
  }

  // تبويب البحث
  if (searchFriendsTab) {
    searchFriendsTab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!authManager.isSignedIn()) {
        alert('يجب تسجيل الدخول أولاً للبحث عن الأصدقاء');
        return;
      }
      switchTab("searchFriends");
      // عرض رسالة بدلاً من تحميل المستخدمين تلقائياً
      const searchResults = document.getElementById("searchResults");
      searchResults.innerHTML =
        '<div class="no-results">💡 ابدأ بكتابة اسم أو إيميل أو مجموعة للبحث</div>';
    });
  }

  // تبويب طلبات الصداقة
  if (friendRequestsTab) {
    friendRequestsTab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!authManager.isSignedIn()) {
        alert('يجب تسجيل الدخول أولاً لعرض طلبات الصداقة');
        return;
      }
      switchTab("friendRequests");
      loadFriendRequests();
    });
  }

  // البحث
  if (friendSearchInput) {
    let searchTimeout;
    friendSearchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      const searchTerm = e.target.value.trim();

      if (searchTerm.length === 0) {
        // إذا كان حقل البحث فارغ، عرض رسالة
        const searchResults = document.getElementById("searchResults");
        searchResults.innerHTML =
          '<div class="no-results">💡 ابدأ بكتابة اسم أو إيميل أو مجموعة للبحث</div>';
        return;
      }

      // البحث الفوري بدون انتظار
      searchTimeout = setTimeout(() => {
        searchUsers(searchTerm);
      }, 500); // تقليل زمن الانتظار إلى نصف ثانية
    });

    // إضافة مستمع للضغط على Enter للبحث الفوري
    friendSearchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.trim();
        if (searchTerm.length > 0) {
          searchUsers(searchTerm);
        }
      }
    });
  }
}

// فتح نافذة الأصدقاء
async function openFriendsModal() {
  const friendsModal = document.getElementById("friendsModal");

  if (!friendsModal) {
    console.error('Friends modal element not found in DOM');
    alert('نافذة الأصدقاء غير متوفرة. يرجى تحديث الصفحة.');
    return;
  }

  friendsModal.style.display = "flex";

  // تحديث عدد طلبات الصداقة
  await updateFriendRequestsBadge();

  // تحديث عدد الأصدقاء المتصلين
  await updateOnlineFriendsBadge();

  // تحميل أصدقائي بشكل افتراضي
  switchTab("myFriends");
  loadMyFriends();
}

// دالة إعادة تفعيل زر الأصدقاء بعد التحدي
window.reactivateFriendsButton = function() {
  console.log('Reactivating friends button...');

  const friendsBtn = document.getElementById("friendsBtn");
  if (friendsBtn && authManager.isSignedIn()) {
    // إظهار الزر بالقوة
    friendsBtn.style.cssText = `
      background: linear-gradient(135deg, #28a745, #20c997) !important;
      color: white !important;
      border: none !important;
      border-radius: 50% !important;
      width: 50px !important;
      height: 50px !important;
      cursor: pointer !important;
      font-size: 20px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      transition: all 0.3s ease !important;
      box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3) !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    `;

    // استنساخ الزر لإزالة جميع المستمعين السابقين
    const newFriendsBtn = friendsBtn.cloneNode(true);
    friendsBtn.parentNode.replaceChild(newFriendsBtn, friendsBtn);

    // إضافة مستمع جديد مقاوم للأخطاء
    newFriendsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Friends button clicked after reactivation');

      try {
        // محاولة أولى - استخدام الدالة العامة
        if (typeof window.openFriendsModal === 'function') {
          window.openFriendsModal();
          return;
        }

        // محاولة ثانية - فتح مباشر
        const friendsModal = document.getElementById('friendsModal');
        if (friendsModal) {
          friendsModal.style.display = 'flex';

          // التنقل للتبويب الأول وتحميل البيانات
          setTimeout(() => {
            try {
              if (typeof window.switchTab === 'function') {
                window.switchTab('myFriends');
              }
              if (typeof window.loadMyFriends === 'function') {
                window.loadMyFriends();
              }
            } catch (error) {
              console.log('Error loading friends data:', error);
            }
          }, 150);

          return;
        }

        // محاولة ثالثة - إعادة تهيئة النظام
        if (typeof window.setupFriendsSystem === 'function') {
          window.setupFriendsSystem();
          setTimeout(() => {
            if (typeof window.openFriendsModal === 'function') {
              window.openFriendsModal();
            }
          }, 300);
          return;
        }

        // إذا فشل كل شيء
        alert('حدث خطأ في فتح قائمة الأصدقاء. يرجى تحديث الصفحة.');

      } catch (error) {
        console.error('Error in friends button click handler:', error);
        alert('حدث خطأ في فتح قائمة الأصدقاء. يرجى تحديث الصفحة.');
      }
    });

    // تحديث التنبيهات
    setTimeout(() => {
      if (typeof window.updateFriendRequestsBadge === 'function') {
        window.updateFriendRequestsBadge();
      }
      if (typeof window.updateOnlineFriendsBadge === 'function') {
        window.updateOnlineFriendsBadge();
      }
    }, 200);

    console.log('Friends button reactivated successfully with new event handlers');
    return true;
  }

  console.log('Failed to reactivate friends button - button not found or user not signed in');
  return false;
};

// جعل الدوال متاحة عالمياً
window.openFriendsModal = openFriendsModal;
window.closeFriendsModal = function() {
  const friendsModal = document.getElementById('friendsModal');
  if (friendsModal) {
    friendsModal.style.display = 'none';
  }
};

// إعادة تعريف setupFriendsSystem كدالة عالمية
window.setupFriendsSystem = setupFriendsSystem;

// جعل دوال إضافية متاحة عالمياً للاستخدام بعد التحدي
window.switchTab = switchTab;
window.loadMyFriends = loadMyFriends;
window.updateFriendRequestsBadge = updateFriendRequestsBadge;
window.updateOnlineFriendsBadge = updateOnlineFriendsBadge;

// Event Delegation قوي ومحسن لزر الأصدقاء - يعمل في جميع الحالات
document.body.addEventListener('click', (e) => {
  // التحقق من زر الأصدقاء بطريقة شاملة
  const target = e.target;
  const friendsBtn = target.closest('#friendsBtn') ||
                    (target.id === 'friendsBtn' ? target : null) ||
                    (target.parentElement && target.parentElement.id === 'friendsBtn' ? target.parentElement : null);

  if (friendsBtn) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Friends button clicked via enhanced delegation');

    // التأكد من تسجيل الدخول
    if (!authManager || !authManager.isSignedIn()) {
      alert('يجب تسجيل الدخول أولاً للوصول لقائمة الأصدقاء');
      return;
    }

    // تأثير بصري فوري للزر
    friendsBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      friendsBtn.style.transform = 'scale(1)';
    }, 150);

    // محاولة فتح نافذة الأصدقاء بأساليب متعددة مقاومة للأخطاء
    let modalOpened = false;
    let attempts = 0;
    const maxAttempts = 4;

    const attemptOpen = () => {
      attempts++;
      console.log(`Attempting to open friends modal - attempt ${attempts}`);

      try {
        // المحاولة الأولى - الدالة العامة
        if (!modalOpened && typeof window.openFriendsModal === 'function') {
          window.openFriendsModal();
          modalOpened = true;
          console.log('Modal opened via openFriendsModal function');
          return;
        }

        // المحاولة الثانية - فتح مباشر للنافذة
        if (!modalOpened) {
          const friendsModal = document.getElementById('friendsModal');
          if (friendsModal) {
            friendsModal.style.display = 'flex';

            // تحديث البيانات والتنقل
            setTimeout(() => {
              try {
                // تحديث التنبيهات
                if (typeof window.updateFriendRequestsBadge === 'function') {
                  window.updateFriendRequestsBadge();
                }
                if (typeof window.updateOnlineFriendsBadge === 'function') {
                  window.updateOnlineFriendsBadge();
                }

                // التنقل والتحميل
                if (typeof window.switchTab === 'function') {
                  window.switchTab('myFriends');
                }
                if (typeof window.loadMyFriends === 'function') {
                  window.loadMyFriends();
                }
              } catch (updateError) {
                console.log('Error updating friends data:', updateError);
              }
            }, 100);

            modalOpened = true;
            console.log('Modal opened via direct access');
            return;
          }
        }

        // المحاولة الثالثة - إعادة تهيئة النظام
        if (!modalOpened && typeof window.setupFriendsSystem === 'function') {
          console.log('Attempting to reinitialize friends system...');
          window.setupFriendsSystem();

          setTimeout(() => {
            if (!modalOpened && typeof window.openFriendsModal === 'function') {
              try {
                window.openFriendsModal();
                modalOpened = true;
                console.log('Modal opened after system reinitialization');
              } catch (error) {
                console.log('Failed to open modal after reinitialization:', error);
              }
            }
          }, 250);
          return;
        }

        // المحاولة الرابعة - إنشاء النافذة من جديد إذا لزم الأمر
        if (!modalOpened && attempts >= maxAttempts - 1) {
          console.log('Final attempt - checking if modal exists...');
          const friendsModal = document.getElementById('friendsModal');
          if (!friendsModal) {
            console.error('Friends modal not found in DOM!');
            alert('قائمة الأصدقاء غير متوفرة. يرجى تحديث الصفحة.');
          } else {
            // محاولة أخيرة للفتح
            friendsModal.style.display = 'flex';
            friendsModal.style.visibility = 'visible';
            friendsModal.style.opacity = '1';
            modalOpened = true;
            console.log('Modal opened via final attempt');
          }
        }

      } catch (error) {
        console.error(`Error in attempt ${attempts}:`, error);

        // إذا فشلت كل المحاولات
        if (attempts >= maxAttempts) {
          alert('حدث خطأ في فتح قائمة الأصدقاء. يرجى تحديث الصفحة.');
        }
      }

      // إعادة المحاولة إذا لم تنجح ولم نصل للحد الأقصى
      if (!modalOpened && attempts < maxAttempts) {
        setTimeout(attemptOpen, 200 * attempts); // تأخير متزايد
      }
    };

    // بدء المحاولات
    attemptOpen();
  }
});

// تبديل التبويبات
function switchTab(tabName) {
  // إخفاء جميع التبويبات
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.style.display = "none";
  });

  // إزالة الكلاس النشط من جميع الأزرار
  document.querySelectorAll(".friends-tab").forEach((btn) => {
    btn.classList.remove("active");
  });

  // إظهار التبويب المطلوب
  switch (tabName) {
    case "myFriends":
      document.getElementById("myFriendsContent").style.display = "block";
      document.getElementById("myFriendsTab").classList.add("active");
      break;
    case "searchFriends":
      document.getElementById("searchFriendsContent").style.display = "block";
      document.getElementById("searchFriendsTab").classList.add("active");
      break;
    case "friendRequests":
      document.getElementById("friendRequestsContent").style.display = "block";
      document.getElementById("friendRequestsTab").classList.add("active");
      break;
  }
}

// تحميل قائمة أصدقائي
async function loadMyFriends() {
  const friendsList = document.getElementById("friendsList");

  if (!authManager.isSignedIn() || !authManager.currentUser) {
    friendsList.innerHTML =
      '<div class="no-results">يرجى تسجيل الدخول أولاً</div>';
    return;
  }

  // عرض رسالة التحميل
  friendsList.innerHTML =
    '<div class="no-results">🔄 جاري تحميل قائمة الأصدقاء...</div>';

  await friendsManager.loadUserFriends();

  console.log('Friends loaded:', friendsManager.friends);

  if (!friendsManager.friends || friendsManager.friends.length === 0) {
    friendsList.innerHTML =
      '<div class="no-results">لا توجد أصدقاء حتى الآن<br>استخدم البحث لإضافة أصدقاء جدد</div>';
    return;
  }

  // عرض رسالة التحميل
  friendsList.innerHTML =
    '<div class="no-results">🔄 جاري تحميل حالة الأصدقاء...</div>';

  // الحصول على حالة نشاط الأصدقاء
  const friendsStatus = await friendsManager.getFriendsActivityStatus();

  // ترتيب الأصدقاء حسب النشاط (المتصلين أولاً)
  const sortedFriends = [...friendsManager.friends].sort((a, b) => {
    const statusA = friendsStatus[a.uid];
    const statusB = friendsStatus[b.uid];

    if (statusA && statusB) {
      // المتصلين الآن أولاً
      if (statusA.isOnline && !statusB.isOnline) return -1;
      if (!statusA.isOnline && statusB.isOnline) return 1;

      // ترتيب حسب وقت آخر ظهور للمتصلين
      if (statusA.isOnline && statusB.isOnline) {
        return statusA.status.includes("متصل الآن") ? -1 : 1;
      }

      // ثم حسب وقت آخر ظهور
      return statusA.status.localeCompare(statusB.status, "ar");
    }

    return a.name.localeCompare(b.name, "ar");
  });

  // عد الأصدقاء النشطين للتنبيه
  let onlineFriends = 0;
  let recentlyActiveFriends = 0;

  sortedFriends.forEach((friend) => {
    const status = friendsStatus[friend.uid];
    if (status) {
      if (status.status.includes("متصل الآن")) {
        onlineFriends++;
      } else if (status.status.includes("نشط مؤخراً")) {
        recentlyActiveFriends++;
      }
    }
  });

  // إضافة عنوان بالأصدقاء النشطين
  let html = "";
  if (onlineFriends > 0 || recentlyActiveFriends > 0) {
    html += `
      <div style="
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 12px;
        border-radius: 12px;
        text-align: center;
        margin-bottom: 15px;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
      ">
        🔔 ${onlineFriends > 0 ? `${onlineFriends} صديق متصل الآن` : ""}
        ${onlineFriends > 0 && recentlyActiveFriends > 0 ? " • " : ""}
        ${recentlyActiveFriends > 0 ? `${recentlyActiveFriends} نشط مؤخراً` : ""}
      </div>
    `;
  }

  sortedFriends.forEach((friend) => {
    const status = friendsStatus[friend.uid] || {
      status: "غير متاح",
      statusColor: "#6c757d",
      statusIcon: "⚪",
      lastSeen: "غير محدد",
    };

    html += `
      <div class="friend-card">
        <div class="friend-info">
          <div class="friend-name">
            ${status.statusIcon} ${friend.name}
            <span style="
              display: inline-block;
              background: ${status.statusColor};
              color: white;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              margin-right: 8px;
              font-weight: 600;
            ">${status.status}</span>
          </div>
          <div class="friend-details">
            📧 ${friend.email}<br>
            👥 ${friend.group}<br>
            <span style="color: #6c757d; font-size: 12px;">
              🕐 آخر ظهور: ${status.lastSeen}
            </span>
          </div>
        </div>
        <div class="friend-actions">
          <button class="friend-btn challenge-btn" onclick="challengeFriend('${friend.uid}', '${friend.name}')">
            ⚔️ تحدي
          </button>
          <button class="friend-btn remove-btn" onclick="removeFriend('${friend.uid}')">
            🗑️ حذف
          </button>
          <button class="friend-btn chat-friend-btn" data-friend-id="${friend.uid}" data-friend-name="${friend.name}">
            💬 دردشة
          </button>
        </div>
      </div>
    `;
  });

  friendsList.innerHTML = html;

  // إضافة مستمعي أحداث أزرار الدردشة
  document.querySelectorAll('.chat-friend-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const friendId = btn.dataset.friendId;
      const friendName = btn.dataset.friendName;
      chatManager.openChatWithFriend(friendId, friendName);

      // إغلاق نافذة الأصدقاء
      const friendsModal = document.getElementById('friendsModal');
      if (friendsModal) {
        friendsModal.style.display = 'none';
      }
    });
  });
}

// البحث عن المستخدمين
async function searchUsers(searchTerm) {
  const searchResults = document.getElementById("searchResults");

  if (!authManager.isSignedIn() || !authManager.currentUser) {
    searchResults.innerHTML =
      '<div class="no-results">يرجى تسجيل الدخول أولاً</div>';
    return;
  }

  // عرض رسالة التحميل
  searchResults.innerHTML =
    '<div class="no-results">🔍 جاري البحث في قاعدة البيانات...</div>';

  try {
    const results = await friendsManager.searchUsers(searchTerm || "");

    if (results.length === 0) {
      if (searchTerm && searchTerm.length > 0) {
        searchResults.innerHTML =
          '<div class="no-results">❌ لم يتم العثور على نتائج للبحث</div>';
      } else {
        searchResults.innerHTML =
          '<div class="no-results">📭 لا يوجد مستخدمين متاحين للإضافة</div>';
      }
      return;
    }

    let html = `<div style="margin-bottom: 15px; color: #28a745; font-weight: bold; text-align: center;">📊 تم العثور على ${results.length} مستخدم</div>`;

    results.forEach((user) => {
      let buttonHtml = "";
      let statusIcon = "";

      if (user.hasSentRequest) {
        buttonHtml =
          '<button class="friend-btn pending-btn">⏳ تم إرسال الطلب</button>';
        statusIcon = "📤";
      } else if (user.hasReceivedRequest) {
        buttonHtml = `
          <button class="friend-btn accept-btn" onclick="acceptFriendRequest('${user.uid}')">
            ✅ قبول
          </button>
          <button class="friend-btn reject-btn" onclick="rejectFriendRequest('${user.uid}')">
            ❌ رفض
          </button>
        `;
        statusIcon = "📥";
      } else {
        buttonHtml = `
          <button class="friend-btn add-friend-btn" onclick="sendFriendRequest('${user.uid}')">
            ➕ إضافة صديق
          </button>
        `;
        statusIcon = "👤";
      }

      html += `
        <div class="friend-card">
          <div class="friend-info">
            <div class="friend-name">${statusIcon} ${user.name}</div>
            <div class="friend-details">
              📧 ${user.email}<br>
              👥 ${user.group}
            </div>
          </div>
          <div class="friend-actions">
            ${buttonHtml}
          </div>
        </div>
      `;
    });

    searchResults.innerHTML = html;
  } catch (error) {
    console.error("Search error:", error);
    searchResults.innerHTML =
      '<div class="no-results">❌ حدث خطأ في البحث، يرجى المحاولة مرة أخرى</div>';
  }
}

// تحميل طلبات الصداقة
async function loadFriendRequests() {
  const requestsList = document.getElementById("requestsList");

  if (!authManager.isSignedIn() || !authManager.currentUser) {
    requestsList.innerHTML =
      '<div class="no-results">يرجى تسجيل الدخول أولاً</div>';
    return;
  }

  await friendsManager.loadUserFriends();
  const requests = await friendsManager.getFriendRequestsWithDetails();

  if (requests.length === 0) {
    requestsList.innerHTML =
      '<div class="no-results">لا توجد طلبات صداقة</div>';
    return;
  }

  let html = "";
  requests.forEach((user) => {
    html += `
      <div class="friend-card">
        <div class="friend-info">
          <div class="friend-name">${user.name}</div>
          <div class="friend-details">
            📧 ${user.email}<br>
            👥 ${user.group}
          </div>
        </div>
        <div class="friend-actions">
          <button class="friend-btn accept-btn" onclick="acceptFriendRequest('${user.uid}')">
            ✅ قبول
          </button>
          <button class="friend-btn reject-btn" onclick="rejectFriendRequest('${user.uid}')">
            ❌ رفض
          </button>
        </div>
      </div>
    `;
  });

  requestsList.innerHTML = html;
}

// تحديث رقم طلبات الصداقة
async function updateFriendRequestsBadge() {
  if (!authManager.isSignedIn() || !authManager.currentUser) return;

  await friendsManager.loadUserFriends();
  const requestsBadge = document.getElementById("requestsBadge");
  const requestsBadgeBtn = document.getElementById("friendRequestsBadgeBtn");
  const count = friendsManager.friendRequests.length;

  // تحديث الرقم في نافذة الأصدقاء
  if (requestsBadge) {
    if (count > 0) {
      requestsBadge.textContent = count;
      requestsBadge.style.display = "inline";
    } else {
      requestsBadge.style.display = "none";
    }
  }

  // تحديث الرقم على زر الأصدقاء الخارجي
  if (requestsBadgeBtn) {
    if (count > 0) {
      requestsBadgeBtn.textContent = count;
      requestsBadgeBtn.style.display = "flex";
    } else {
      requestsBadgeBtn.style.display = "none";
    }
  }
}

// تحديث عدد الأصدقاء المتصلين
async function updateOnlineFriendsBadge() {
  if (!authManager.isSignedIn() || !authManager.currentUser) return;

  const onlineBadge = document.getElementById("onlineFriendsBadge");
  if (!onlineBadge) return;

  await friendsManager.loadUserFriends();

  if (friendsManager.friends.length === 0) {
    onlineBadge.style.display = "none";
    return;
  }

  const friendsStatus = await friendsManager.getFriendsActivityStatus();
  let onlineCount = 0;

  friendsManager.friends.forEach((friend) => {
    const status = friendsStatus[friend.uid];
    if (status && status.status.includes("متصل الآن")) {
      onlineCount++;
    }
  });

  if (onlineCount > 0) {
    onlineBadge.textContent = onlineCount;
    onlineBadge.style.display = "flex";
  } else {
    onlineBadge.style.display = "none";
  }
}

// الدوال العامة لأزرار الأصدقاء
window.sendFriendRequest = async (userId) => {
  const success = await friendsManager.sendFriendRequest(userId);
  if (success) {
    // إعادة تحميل نتائج البحث
    const searchTerm = document.getElementById("friendSearchInput").value;
    if (searchTerm) {
      searchUsers(searchTerm);
    }
  }
};

window.acceptFriendRequest = async (userId) => {
  const success = await friendsManager.acceptFriendRequest(userId);
  if (success) {
    // إعادة تحميل طلبات الصداقة وتحديث الرقم
    loadFriendRequests();
    updateFriendRequestsBadge();
    updateOnlineFriendsBadge();

    // إعادة تحميل نتائج البحث إذا كانت مفتوحة
    const searchTerm = document.getElementById("friendSearchInput").value;
    if (searchTerm) {
      searchUsers(searchTerm);
    }
  }
};

window.rejectFriendRequest = async (userId) => {
  const success = await friendsManager.rejectFriendRequest(userId);
  if (success) {
    // إعادة تحميل طلبات الصداقة وتحديث الرقم
    loadFriendRequests();
    updateFriendRequestsBadge();

    // إعادة تحميل نتائج البحث إذا كانت مفتوحة
    const searchTerm = document.getElementById("friendSearchInput").value;
    if (searchTerm) {
      searchUsers(searchTerm);
    }
  }
};

window.removeFriend = async (userId) => {
  if (confirm("هل أنت متأكد من حذف هذا الصديق؟")) {
    const success = await friendsManager.removeFriend(userId);
    if (success) {
      // إعادة تحميل قائمة الأصدقاء وتحديث التنبيهات
      loadMyFriends();
      updateOnlineFriendsBadge();
    }
  }
};

// دالة تحدي الأصدقاء
window.challengeFriend = (friendUid, friendName) => {
  if (!authManager.isSignedIn()) {
    alert('يجب تسجيل الدخول أولاً لإرسال التحديات');
    return;
  }

  // استخدام challengeManager من challenge.js
  if (window.challengeManager) {
    window.challengeManager.showChallengeModal(friendUid, friendName);
  } else {
    alert('نظام التحدي غير متاح حالياً');
  }
};

// تشغيل التهيئة أول مرة
subjectSelect.dispatchEvent(new Event("change"));

// تحديث أزرار الترتيب العشوائي عند تحميل الصفحة
setTimeout(() => {
  updateShuffleControls();
}, 1000);

// تعطيل علامة التحميل الأولي بعد انتهاء التهيئة
setTimeout(() => {
  isInitialLoad = false;
}, 1000);

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
        0% { box-shadow: 0 0 0 0 ${gradeColor}70, 0 0 30px ${gradeColor}40; }
        70% { box-shadow: 0 0 0 20px ${gradeColor}00, 0 0 30px ${gradeColor}40; }
        100% { box-shadow: 0 0 0 0 ${gradeColor}00, 0 0 30px ${gradeColor}40; }
      }

      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }

      .results-container {
        background: transparent;
        border-radius: 0;
        padding: 20px 20px 40px 20px;
        text-align: center;
        box-shadow: none;
        border: none;
        animation: resultSlideIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        position: relative;
        overflow: hidden;
        margin-top: 0;
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
        text-shadow: 0 4px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.3);
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
        box-shadow: 0 0 30px ${gradeColor}40;
      }

      .percentage-inner {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${gradeColor}15, ${gradeColor}25);
        backdrop-filter: blur(15px);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 700;
        color: ${gradeColor};
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        border: 3px solid ${gradeColor};
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin: 30px 0;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 20px 15px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.2);
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
        color: #ffffff;
        font-weight: 600;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
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
        .results-container {
          padding: 10px 15px 30px 15px;
        }

        .stats-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 20px 0;
        }

        .stat-card {
          padding: 12px 8px;
        }

        .stat-number {
          font-size: 24px;
        }

        .stat-label {
          font-size: 11px;
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

      /* للشاشات الصغيرة جداً - الحفاظ على الترتيب الأفقي */
      @media (max-width: 320px) {
        .results-container {
          padding: 5px 10px 25px 10px;
        }

        .stats-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
          margin: 15px 0;
        }

        .stat-card {
          padding: 8px 4px;
        }

        .stat-number {
          font-size: 20px;
        }

        .stat-label {
          font-size: 10px;
        }

        .grade-icon {
          font-size: 50px;
          margin-bottom: 10px;
        }

        .grade-title {
          font-size: 24px;
          margin-bottom: 10px;
        }

        .percentage-circle {
          width: 100px;
          height: 100px;
          margin: 15px auto;
        }

        .percentage-inner {
          width: 80px;
          height: 80px;
          font-size: 20px;
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

    // إظهار العناصر المخفية عند إعادة المحاولة
    const questionNavigatorDiv = document.getElementById("questionSelect").parentNode;
    if (questionNavigatorDiv) {
      questionNavigatorDiv.style.display = "block";
    }
    homeBtn.style.display = "block";

    updateQuestionNavigator();
    showQuestion();
  });

  document.getElementById("backToHomeBtn").addEventListener("click", () => {
    // إظهار العناصر المخفية قبل العودة للرئيسية
    const questionNavigatorDiv = document.getElementById("questionSelect").parentNode;
    if (questionNavigatorDiv) {
      questionNavigatorDiv.style.display = "block";
    }

    // العودة للرئيسية مباشرة
    controlsContainer.style.display = "block";
    questionsContainer.style.display = "none";
    homeBtn.style.display = "none";

    const questionNavDiv = document.getElementById("questionSelect").parentNode;
    if (questionNavDiv) {
      questionNavDiv.style.display = "none";
    }

    // إظهار العنوان عند العودة للرئيسية
    const titleElement = document.querySelector("h1");
    if (titleElement) {
      titleElement.style.display = "block";
    }

    // إظهار معلومات المستخدم عند العودة للرئيسية
    authManager.updateUserInfoVisibility();

    // إعادة تعيين المتغيرات
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
}

// دالة لتحديث أزرار الترتيب العشوائي حسب حالة تسجيل الدخول
function updateShuffleControls() {
  const shuffleToggle = document.getElementById("shuffleToggle");
  const shuffleAnswersToggle = document.getElementById("shuffleAnswersToggle");
  const shuffleLoginHint = document.getElementById("shuffleLoginHint");
  const shuffleAnswersLoginHint = document.getElementById("shuffleAnswersLoginHint");

  if (!shuffleToggle || !shuffleAnswersToggle) return;

  const isUserSignedIn = authManager &&
                        authManager.currentUser &&
                        authManager.currentUser.uid &&
                        authManager.isSignedIn();

  if (isUserSignedIn) {
    // المستخدم مسجل - تفعيل الأزرار وإخفاء التنبيهات
    shuffleToggle.disabled = false;
    shuffleAnswersToggle.disabled = false;
    shuffleToggle.style.opacity = "1";
    shuffleAnswersToggle.style.opacity = "1";
    shuffleToggle.style.cursor = "pointer";
    shuffleAnswersToggle.style.cursor = "pointer";
    
    if (shuffleLoginHint) shuffleLoginHint.style.display = "none";
    if (shuffleAnswersLoginHint) shuffleAnswersLoginHint.style.display = "none";
    
    console.log('Shuffle controls enabled for signed-in user');
  } else {
    // المستخدم غير مسجل - تعطيل الأزرار وإظهار التنبيهات
    shuffleToggle.disabled = true;
    shuffleAnswersToggle.disabled = true;
    shuffleToggle.checked = false;
    shuffleAnswersToggle.checked = false;
    shuffleToggle.style.opacity = "0.5";
    shuffleAnswersToggle.style.opacity = "0.5";
    shuffleToggle.style.cursor = "not-allowed";
    shuffleAnswersToggle.style.cursor = "not-allowed";
    
    if (shuffleLoginHint) shuffleLoginHint.style.display = "inline";
    if (shuffleAnswersLoginHint) shuffleAnswersLoginHint.style.display = "inline";
    
    console.log('Shuffle controls disabled for non-signed-in user');
  }
}

// جعل دالة updateVersionSelector متاحة عالمياً
window.updateVersionSelector = updateVersionSelector;
