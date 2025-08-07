import { visibleLectures } from "./show.js";
import { lectureNames } from "./lectureNames.js";
import AuthManager from "./auth.js";
import FriendsManager from "./friends.js";

// Initialize Authentication
const authManager = new AuthManager();

// Initialize Friends System
const friendsManager = new FriendsManager(authManager);

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
controlsContainer.parentNode.insertBefore(
  questionNavigatorDiv,
  questionsContainer,
);

let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let answered = false;
let timerEnabled = false;
let timerInterval;
let timeLeft = 43; // زمن 43 ثانية لكل سؤال

// حالة كل سؤال: "unanswered", "correct", "wrong"
let questionStatus = [];

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

// دالة لتشغيل صوت اختيار المادة/المحاضرة/النسخة
function playSubjectSound() {
  subjectSound.currentTime = 0;
  subjectSound.play();
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

  lectures.forEach((lec) => {
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

    versions.forEach((v) => {
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
    updateVersionSelector();
    // إظهار زر الأصدقاء
    setupFriendsSystem();
  } else {
    console.log("User signed out");
    // Reset quiz state when user signs out
    if (questionsContainer) {
      questionsContainer.innerHTML = "";
    }
    // تحديث قائمة النسخة عند تسجيل الخروج
    updateVersionSelector();
    // إخفاء زر الأصدقاء
    hideFriendsSystem();
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
    closeFriendsModal.addEventListener("click", () => {
      friendsModal.style.display = "none";
    });
  }

  // إغلاق النافذة بالضغط خارجها
  friendsModal.addEventListener("click", (e) => {
    if (e.target === friendsModal) {
      friendsModal.style.display = "none";
    }
  });

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
    searchFriendsTab.addEventListener("click", () => {
      switchTab("searchFriends");
      // عرض رسالة بدلاً من تحميل المستخدمين تلقائياً
      const searchResults = document.getElementById("searchResults");
      searchResults.innerHTML =
        '<div class="no-results">💡 ابدأ بكتابة اسم أو إيميل أو مجموعة للبحث</div>';
    });
  }

  // تبويب طلبات الصداقة
  if (friendRequestsTab) {
    friendRequestsTab.addEventListener("click", () => {
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
  friendsModal.style.display = "flex";

  // تحديث عدد طلبات الصداقة
  await updateFriendRequestsBadge();

  // تحديث عدد الأصدقاء المتصلين
  await updateOnlineFriendsBadge();

  // تحميل أصدقائي بشكل افتراضي
  switchTab("myFriends");
  loadMyFriends();
}

// جعل الدالة متاحة عالمياً
window.openFriendsModal = openFriendsModal;

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

  if (!authManager.isSignedIn()) {
    friendsList.innerHTML =
      '<div class="no-results">يرجى تسجيل الدخول أولاً</div>';
    return;
  }

  await friendsManager.loadUserFriends();

  if (friendsManager.friends.length === 0) {
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
          <button class="friend-btn remove-btn" onclick="removeFriend('${friend.uid}')">
            🗑️ حذف
          </button>
        </div>
      </div>
    `;
  });

  friendsList.innerHTML = html;
}

// البحث عن المستخدمين
async function searchUsers(searchTerm) {
  const searchResults = document.getElementById("searchResults");

  if (!authManager.isSignedIn()) {
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

  if (!authManager.isSignedIn()) {
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
  if (!authManager.isSignedIn()) return;

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
  if (!authManager.isSignedIn()) return;

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
    
    // إظهار العناصر المخفية عند إعادة المحاولة
    document.getElementById("questionSelect").parentNode.style.display = "block";
    homeBtn.style.display = "block";
    
    updateQuestionNavigator();
    showQuestion();
  });

  document.getElementById("backToHomeBtn").addEventListener("click", () => {
    // إظهار العناصر المخفية قبل العودة للرئيسية
    document.getElementById("questionSelect").parentNode.style.display =
      "block";
    homeBtn.style.display = "block";
    homeBtn.click();
  });
}

// جعل دالة updateVersionSelector متاحة عالمياً
window.updateVersionSelector = updateVersionSelector;
