import { visibleLectures } from "./show.js";
import { lectureNames } from "./lectureNames.js";
import AuthManager from "./auth.js";
import FriendsManager from "./friends.js";
import ChatManager from "./chat.js";

// Initialize auth, friends and chat managers
const authManager = new AuthManager();
const friendsManager = new FriendsManager(authManager);
let chatManager = null;

// جعل authManager متاحاً عالمياً
window.authManager = authManager;

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




// إضافة واجهة الوضع الترفيهي
const funModeContainer = document.createElement('div');
funModeContainer.id = 'funModeContainer';
funModeContainer.style.display = 'none'; // مخفي بالبداية
funModeContainer.innerHTML = `
      <!-- أزرار القائمة والأصدقاء - نفس التصميم -->
      <div style="
        display: flex;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 20px;
        align-items: center;
      ">
        <div id="directAuthButtonsFun" style="display: none;"></div>
        <div id="userButtonsFun" style="
          display: none;
          flex-direction: row;
          gap: 15px;
          align-items: center;
          justify-content: flex-end;
        ">
          <button id="friendsBtnFun" onclick="openFriendsModal()" style="
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            position: relative;
            order: 2;
          ">👥</button>
          <button id="authMenuBtnFun" style="
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            order: 1;
          ">☰</button>
        </div>
      </div>

      <label style="
        display: block;
        margin: 18px 0 8px 0;
        font-weight: 600;
        color: #ffffff;
        font-size: 16px;
        text-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
      ">🎮 اختر نوع الأسئلة الترفيهية:</label>
      <select id="funCategorySelect" style="
        width: 100%;
        padding: 15px 18px;
        font-size: 16px;
        border: none;
        background: #ffffff;
        color: #495057;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        font-family: 'Tajawal', sans-serif;
        border-radius: 12px;
        margin-bottom: 10px;
      "></select>

      <!-- خيارات إضافية للوضع الترفيهي -->
      <div style="margin: 10px 0;">
        <button type="button" id="moreOptionsFunToggle" style="
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
          <span id="moreOptionsFunIcon">▼</span>
          المزيد من الخيارات
        </button>

        <div id="moreOptionsFunContent" style="
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
                <input type="checkbox" id="timerFunToggle" />
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
                <input type="checkbox" id="shuffleFunToggle" />
                ترتيب الأسئلة بشكل عشوائي
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
                <input type="checkbox" id="shuffleAnswersFunToggle" />
                ترتيب الأجوبة بشكل عشوائي
              </label>
            </div>
          </div>
        </div>
      </div>

      <button id="loadFunBtn" style="
        width: 100%;
        margin-top: 25px;
        background: linear-gradient(135deg, #ff6b35, #f7931e);
        color: white;
        font-weight: 600;
        border: none;
        font-size: 18px;
        padding: 16px 20px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: 'Tajawal', sans-serif;
      ">ابدأ</button>

      <!-- زر التبديل للوضع الأكاديمي -->
      <div style="text-align: center; margin: 20px 0;">
        <button id="toggleModeBackBtn" style="
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 20px;
          font-size: 16px;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Tajawal', sans-serif;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        ">
          📚 العودة للوضع الأكاديمي
        </button>
      </div>
`;
controlsContainer.parentNode.insertBefore(funModeContainer, controlsContainer);

// إضافة زر "المزيد" للخيارات الإضافية
const moreOptionsDiv = document.createElement("div");
moreOptionsDiv.style.margin = "10px 0";
moreOptionsDiv.innerHTML = `
  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;">
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
    ">
      <span id="moreOptionsIcon">▼</span>
      المزيد من الخيارات
    </button>

    <button type="button" id="downloadPdfBtn" style="
      background: linear-gradient(135deg, #e74c3c, #c0392b);
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
    ">
      📄 تحميل PDF
    </button>
    <audio id="instructionAudio4" src="instructions/voice4.m4a" preload="none"></audio>
    <span style="
      color: #ff3b30;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      user-select: none;
      text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      margin-right: 2px;
    " onclick="
      var myAudio4 = document.getElementById('instructionAudio4');
      if (!myAudio4.paused) {
        myAudio4.pause();
        myAudio4.currentTime = 0;
      } else {
        myAudio4.play();
      }
    " title="استمع للتعليمات">؟</span>
  </div>

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

// إضافة زر التبديل بين الأوضاع بعد زر ابدأ
const toggleModeBtn = document.createElement('div');
toggleModeBtn.innerHTML = `
      <!-- زر التبديل بين الوضع الأكاديمي والترفيهي -->
      <div style="text-align: center; margin: 20px 0;">
        <button id="toggleModeBtn" style="
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 20px;
          font-size: 16px;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Tajawal', sans-serif;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
        ">
          🎮 التبديل للوضع الترفيهي
        </button>
      </div>
`;
controlsContainer.appendChild(toggleModeBtn);

// إضافة وظيفة توسيع/إخفاء الخيارات مع انزلاق محسن
document.getElementById("moreOptionsToggle").addEventListener("click", () => {
  const content = document.getElementById("moreOptionsContent");
  const icon = document.getElementById("moreOptionsIcon");
  const button = document.getElementById("moreOptionsToggle");

  if (content.style.maxHeight === "0px" || content.style.maxHeight === "") {
    // فتح الخيارات مع انزلاق بطيء وناعم
    content.style.transition = "all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    content.style.maxHeight = "280px";
    content.style.opacity = "1";
    icon.textContent = "▲";
    button.style.background = "linear-gradient(135deg, #28a745, #20c997)";
  } else {
    // إغلاق الخيارات مع انزلاق بطيء وناعم
    content.style.transition = "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    content.style.maxHeight = "0px";
    content.style.opacity = "0";
    icon.textContent = "▼";
    button.style.background = "linear-gradient(135deg, #6c757d, #495057)";
  }
});

// إضافة وظيفة توسيع/إخفاء الخيارات للوضع الترفيهي مع انزلاق محسن
document.getElementById("moreOptionsFunToggle").addEventListener("click", () => {
  const content = document.getElementById("moreOptionsFunContent");
  const icon = document.getElementById("moreOptionsFunIcon");
  const button = document.getElementById("moreOptionsFunToggle");

  if (content.style.maxHeight === "0px" || content.style.maxHeight === "") {
    // فتح الخيارات مع انزلاق بطيء وناعم
    content.style.transition = "all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    content.style.maxHeight = "280px";
    content.style.opacity = "1";
    icon.textContent = "▲";
    button.style.background = "linear-gradient(135deg, #28a745, #20c997)";
  } else {
    // إغلاق الخيارات مع انزلاق بطيء وناعم
    content.style.transition = "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    content.style.maxHeight = "0px";
    content.style.opacity = "0";
    icon.textContent = "▼";
    button.style.background = "linear-gradient(135deg, #6c757d, #495057)";
  }
});

// دالة تحميل الأسئلة كملف PDF مع ترتيب عشوائي للأجوبة وتنسيق احترافي
document.getElementById("downloadPdfBtn").addEventListener("click", async () => {
  const subject = subjectSelect.value;
  const lecture = lectureSelect.value;
  const version = versionSelect.value;

  if (!subject || !lecture || !version) {
    alert("يرجى اختيار المادة والمحاضرة والنسخة أولاً");
    return;
  }

  const btn = document.getElementById("downloadPdfBtn");
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ جاري التحميل...";
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";

  try {
    const path = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;
    const module = await import(path);
    let questions = module.questions;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error("لا توجد أسئلة في هذه النسخة");
    }

    // خلط ترتيب الأجوبة بشكل عشوائي لكل سؤال
    const shuffledQuestions = questions.map((q) => {
      const opts = [...q.options];
      const correctText = opts[q.answer];

      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }

      const newCorrectIndex = opts.indexOf(correctText);

      return {
        question: q.question,
        options: opts,
        answer: newCorrectIndex,
      };
    });

    // ألوان التصميم
    const colors = {
      primary: [102, 126, 234],      // أزرق بنفسجي
      primaryDark: [90, 111, 216],    // أزرق بنفسجي داكن
      secondary: [118, 75, 162],      // بنفسجي
      success: [40, 167, 69],         // أخضر
      successLight: [212, 237, 218],  // أخضر فاتح
      successBg: [232, 245, 233],     // أخضر فاتح جداً
      danger: [220, 53, 69],          // أحمر
      dark: [33, 37, 41],             // أسود تقريباً
      gray: [108, 117, 125],          // رمادي
      lightGray: [233, 236, 239],     // رمادي فاتح
      white: [255, 255, 255],         // أبيض
      headerGreen: [32, 201, 151],    // أخضر فيروزي
      questionBg: [248, 249, 250],    // خلفية السؤال
    };

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;
    const optionLetters = ["A", "B", "C", "D", "E", "F"];
    const lectureName = lectureNames[subject]?.[lecture] || "Unknown";
    let pageNum = 1;

    // === دالة رسم الهيدر في كل صفحة ===
    function drawHeader() {
      // شريط علوي أخضر متدرج
      doc.setFillColor(...colors.success);
      doc.rect(0, 0, pageWidth, 28, "F");

      // شريط سفلي للهيدر بلون أغمق
      doc.setFillColor(...colors.primaryDark);
      doc.rect(0, 28, pageWidth, 2, "F");

      // اسم الموقع - Dentistology
      doc.setTextColor(...colors.white);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Dentistology", pageWidth / 2, 12, { align: "center" });
      doc.link(pageWidth / 2 - 30, 4, 60, 10, { url: 'https://www.dentisitlogy.com' });

      // روابط الموقع والتليجرام
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Website: www.dentisitlogy.com", 10, 10);
      doc.link(10, 6, 45, 6, { url: 'https://www.dentisitlogy.com' });

      doc.text("Telegram: t.me/dentisitlogy", pageWidth - 10, 10, { align: "right" });
      doc.link(pageWidth - 50, 6, 45, 6, { url: 'https://t.me/dentisitlogy' });

      // عنوان فرعي
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Dental Exam Questions Bank", pageWidth / 2, 18, { align: "center" });

      // معلومات المادة على اليسار
      doc.setFontSize(7);
      doc.text(`${subject.charAt(0).toUpperCase() + subject.slice(1)} | Lec ${lecture} | V${version}`, pageWidth / 2, 24, { align: "center" });

      // إعادة لون النص للأسود
      doc.setTextColor(...colors.dark);

      y = 36;
    }

    // === دالة رسم الفوتر ===
    function drawFooter() {
      // خط فاصل
      doc.setDrawColor(...colors.lightGray);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      // رقم الصفحة
      doc.setFontSize(8);
      doc.setTextColor(...colors.gray);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 7, { align: "center" });

      // اسم الموقع في الفوتر
      doc.text("Dentistology - dentistology.com", margin, pageHeight - 7);

      // التاريخ
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      doc.text(today, pageWidth - margin, pageHeight - 7, { align: "right" });

      doc.setTextColor(...colors.dark);
    }

    // === دالة إضافة صفحة جديدة ===
    function addNewPage() {
      drawFooter();
      doc.addPage();
      pageNum++;
      drawHeader();
    }

    // === الصفحة الأولى ===
    drawHeader();

    // عنوان المادة والمحاضرة
    doc.setFillColor(...colors.questionBg);
    doc.roundedRect(margin, y, contentWidth, 18, 3, 3, "F");
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 18, 3, 3, "S");

    // خط ملون على اليسار
    doc.setFillColor(...colors.primary);
    doc.rect(margin, y, 3, 18, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.primaryDark);
    const subjectTitle = subject.charAt(0).toUpperCase() + subject.slice(1);
    doc.text(`${subjectTitle} - Lecture ${lecture}`, margin + 8, y + 7);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.gray);
    doc.text(`${lectureName} | Version ${version} | ${shuffledQuestions.length} Questions`, margin + 8, y + 14);

    doc.setTextColor(...colors.dark);
    y += 24;

    // مصفوفة الإجابات
    const answerKey = [];

    // === كتابة الأسئلة ===
    shuffledQuestions.forEach((q, idx) => {
      const estimatedHeight = 16 + q.options.length * 7 + 10;
      if (y + estimatedHeight > pageHeight - 20) {
        addNewPage();
      }

      // خلفية السؤال
      const qBoxHeight = 8 + q.options.length * 6.5 + 4;
      doc.setFillColor(252, 252, 253);
      doc.roundedRect(margin, y - 2, contentWidth, qBoxHeight, 2, 2, "F");

      // شريط رقم السؤال
      doc.setFillColor(...colors.primary);
      doc.roundedRect(margin, y - 2, 22, 7, 2, 2, "F");
      doc.setTextColor(...colors.white);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Q ${idx + 1}`, margin + 11, y + 3, { align: "center" });

      // نص السؤال
      doc.setTextColor(...colors.dark);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      const splitQuestion = doc.splitTextToSize(q.question, contentWidth - 28);
      doc.text(splitQuestion, margin + 25, y + 3);
      y += splitQuestion.length * 5 + 4;

      // الخيارات
      doc.setFontSize(9.5);
      q.options.forEach((opt, optIdx) => {
        if (y + 7 > pageHeight - 20) {
          addNewPage();
        }

        const letter = optionLetters[optIdx] || String(optIdx + 1);
        const isCorrect = optIdx === q.answer;

        if (isCorrect) {
          // خلفية خضراء للجواب الصحيح
          doc.setFillColor(...colors.successBg);
          doc.roundedRect(margin + 4, y - 3.5, contentWidth - 8, 6.5, 1.5, 1.5, "F");

          // حدود خضراء
          doc.setDrawColor(...colors.success);
          doc.setLineWidth(0.4);
          doc.roundedRect(margin + 4, y - 3.5, contentWidth - 8, 6.5, 1.5, 1.5, "S");

          // دائرة الحرف خضراء
          doc.setFillColor(...colors.success);
          doc.circle(margin + 10, y - 0.5, 2.5, "F");
          doc.setTextColor(...colors.white);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(letter, margin + 10, y + 0.5, { align: "center" });

          // علامة صح ✓
          doc.setTextColor(...colors.success);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("*", pageWidth - margin - 8, y + 0.5);

          // نص الخيار أخضر
          doc.setTextColor(30, 130, 55);
          doc.setFontSize(9.5);
          doc.setFont("helvetica", "bold");
          doc.text(opt, margin + 15, y);
        } else {
          // دائرة الحرف رمادية
          doc.setFillColor(...colors.lightGray);
          doc.circle(margin + 10, y - 0.5, 2.5, "F");
          doc.setTextColor(...colors.dark);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(letter, margin + 10, y + 0.5, { align: "center" });

          // نص الخيار عادي
          doc.setTextColor(...colors.dark);
          doc.setFontSize(9.5);
          doc.setFont("helvetica", "normal");
          doc.text(opt, margin + 15, y);
        }

        y += 6.5;
      });

      // حفظ الجواب الصحيح
      answerKey.push({
        num: idx + 1,
        letter: optionLetters[q.answer] || String(q.answer + 1),
      });

      // خط فاصل ديكوري بين الأسئلة
      if (idx < shuffledQuestions.length - 1) {
        y += 2;
        doc.setDrawColor(...colors.lightGray);
        doc.setLineWidth(0.2);
        const dashLen = 2;
        const gapLen = 2;
        for (let dx = margin + 10; dx < pageWidth - margin - 10; dx += dashLen + gapLen) {
          doc.line(dx, y, Math.min(dx + dashLen, pageWidth - margin - 10), y);
        }
        y += 5;
      } else {
        y += 4;
      }
    });

    // === صفحة مفتاح الإجابات ===
    drawFooter();
    doc.addPage();
    pageNum++;

    // هيدر صفحة الإجابات - أخضر
    doc.setFillColor(...colors.success);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setFillColor(...colors.headerGreen);
    doc.rect(0, 28, pageWidth, 2, "F");

    doc.setTextColor(...colors.white);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Dentistology", pageWidth / 2, 12, { align: "center" });
    doc.link(pageWidth / 2 - 30, 4, 60, 10, { url: 'https://www.dentisitlogy.com' });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Website: www.dentisitlogy.com", 10, 10);
    doc.link(10, 6, 45, 6, { url: 'https://www.dentisitlogy.com' });
    
    doc.text("Telegram: t.me/dentisitlogy", pageWidth - 10, 10, { align: "right" });
    doc.link(pageWidth - 50, 6, 45, 6, { url: 'https://t.me/dentisitlogy' });

    doc.text("Answer Key", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(7);
    doc.text(`${subject.charAt(0).toUpperCase() + subject.slice(1)} | Lec ${lecture} | V${version}`, pageWidth / 2, 24, { align: "center" });

    y = 36;

    // بطاقة عنوان مفتاح الإجابات
    doc.setFillColor(...colors.successBg);
    doc.roundedRect(margin, y, contentWidth, 14, 3, 3, "F");
    doc.setDrawColor(...colors.success);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 14, 3, 3, "S");

    doc.setFillColor(...colors.success);
    doc.rect(margin, y, 3, 14, "F");

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.success);
    doc.text("Answer Key", margin + 8, y + 6);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.gray);
    doc.text(`${lectureName} | ${answerKey.length} Questions`, margin + 8, y + 11);

    y += 20;
    doc.setTextColor(...colors.dark);

    // عرض الإجابات في شبكة 5 أعمدة
    const cols = 5;
    const cellW = contentWidth / cols;
    const cellH = 10;
    let col = 0;
    let rowY = y;

    // رسم هيدر الجدول
    doc.setFillColor(...colors.primary);
    for (let c = 0; c < cols; c++) {
      const cellX = margin + c * cellW;
      doc.rect(cellX, rowY, cellW, 7, "F");
    }
    doc.setTextColor(...colors.white);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    for (let c = 0; c < cols; c++) {
      const cellX = margin + c * cellW;
      doc.text("Q#", cellX + 4, rowY + 4.5);
      doc.text("Ans", cellX + cellW - 10, rowY + 4.5);
    }
    rowY += 8;

    doc.setTextColor(...colors.dark);

    answerKey.forEach((ans, idx) => {
      if (rowY + cellH > pageHeight - 20) {
        drawFooter();
        doc.addPage();
        pageNum++;
        // هيدر بسيط
        doc.setFillColor(...colors.success);
        doc.rect(0, 0, pageWidth, 12, "F");
        doc.setTextColor(...colors.white);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Dentistology - Answer Key (continued)", pageWidth / 2, 8, { align: "center" });
        doc.link(pageWidth / 2 - 40, 2, 80, 8, { url: 'https://www.dentisitlogy.com' });
        doc.setTextColor(...colors.dark);
        rowY = 18;
        col = 0;
      }

      const cellX = margin + col * cellW;

      // خلفية متناوبة
      if (Math.floor(idx / cols) % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(...colors.white);
      }
      doc.rect(cellX, rowY, cellW, cellH, "F");

      // حدود خفيفة
      doc.setDrawColor(...colors.lightGray);
      doc.setLineWidth(0.2);
      doc.rect(cellX, rowY, cellW, cellH, "S");

      // رقم السؤال
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.primary);
      doc.text(`Q${ans.num}`, cellX + 4, rowY + 6.5);

      // دائرة الجواب خضراء
      doc.setFillColor(...colors.success);
      doc.circle(cellX + cellW - 8, rowY + 5, 3, "F");
      doc.setTextColor(...colors.white);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(ans.letter, cellX + cellW - 8, rowY + 6.2, { align: "center" });

      doc.setTextColor(...colors.dark);

      col++;
      if (col >= cols) {
        col = 0;
        rowY += cellH;
      }
    });

    // فوتر الصفحة الأخيرة
    drawFooter();

    // تحميل الملف
    const fileName = `Dentistology_${subject}_lec${lecture}_v${version}.pdf`;
    doc.save(fileName);

  } catch (err) {
    console.error("خطأ في تحميل PDF:", err);
    alert("فشل تحميل الأسئلة: " + err.message);
  } finally {
    btn.innerHTML = originalText;
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
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
  const isSelect = e.target.tagName === "SELECT";

  // تجنب التداخل مع العناصر الأساسية
  if (isButton && !isOptionBtn && !isSelect) {
    playSound(clickSound);
  }
});

// تشغيل صوت عند فتح select box (عند الضغط فقط)
document.addEventListener('DOMContentLoaded', () => {
  const selects = [subjectSelect, lectureSelect, versionSelect];
  selects.forEach((select) => {
    if (select) {
      select.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        playSound(uiClickSound);
      });
    }
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

// Wait for DOM to be ready before adding event listeners
document.addEventListener('DOMContentLoaded', () => {
  // عند تغيير المادة، يتم تحميل المحاضرات + تشغيل صوت الاختيار
  if (subjectSelect) {
    subjectSelect.addEventListener("change", (e) => {
      e.stopPropagation();
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
  }

  // عند تغيير المحاضرة، يتم تحميل النسخ + تشغيل صوت الاختيار
  if (lectureSelect) {
    lectureSelect.addEventListener("change", (e) => {
      e.stopPropagation();
      playSubjectSound();
      updateVersionSelector();
    });
  }

  // عند تغيير النسخة، تشغيل صوت الاختيار
  if (versionSelect) {
    versionSelect.addEventListener("change", (e) => {
      e.stopPropagation();
      playSubjectSound();
    });
  }
});

// دالة للتحقق من أن المحاضرة الحالية هي من أول محاضرتين
function isFirstTwoLectures(subject, lecture) {
  if (!subject || !lecture) return false;

  // تحويل رقم المحاضرة إلى عدد صحيح
  const lectureNum = parseInt(lecture, 10);

  // التحقق من أن رقم المحاضرة صحيح وأنه 1 أو 2
  if (!isNaN(lectureNum) && (lectureNum === 1 || lectureNum === 2)) {
    return true;
  }

  return false;
}

// دالة لتحديث قائمة النسخ حسب حالة تسجيل الدخول و VIP
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
  console.log('VIP mode:', vipMode);
  console.log('Free trial active:', freeTrialActive);

  // التحقق من أن المحاضرة الحالية هي من أول محاضرتين
  const isFreeLecture = isFirstTwoLectures(selectedSubject, selectedLecture);

  // التحقق المحسن من حالة تسجيل الدخول
  const isUserSignedIn = authManager &&
    authManager.currentUser &&
    authManager.currentUser.uid &&
    authManager.isSignedIn();

  // Check if user has access (signed in with VIP OR free trial active OR first 2 lectures)
  const hasAccess = (isUserSignedIn && vipMode) || freeTrialActive || isFreeLecture;

  // Check if it's first 2 lectures - always show all versions
  if (isFreeLecture) {
    versionSelect.style.display = "block";
    versionLoginMessage.style.display = "none";

    versions.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = `Version ${v}`;
      versionSelect.appendChild(opt);
    });

    console.log('First 2 lectures - showing all versions for free');
    return;
  }

  // Check login status first, then VIP mode or free trial
  if (!isUserSignedIn && !freeTrialActive) {
    // User is NOT logged in and no free trial - show login message
    versionSelect.style.display = "none";
    versionLoginMessage.style.display = "block";
    versionLoginMessage.innerHTML = `
      <a href="#" id="directSignInBtn" style="
        background: none;
        border: none;
        color: #dc3545;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        font-family: 'Tajawal', sans-serif;
        transition: all 0.3s ease;
        text-decoration: underline;
        text-underline-offset: 2px;
        display: inline;
        padding: 0;
        margin: 0;
      ">تسجيل الدخول</a> لتحصل على أكثر من نسخة أسئلة لنفس المحاضرة

      <button id="loginFeaturesInfo" style="
        background: rgba(220, 53, 69, 0.7);
        color: white;
        border: none;
        border-radius: 3px;
        width: 16px;
        height: 16px;
        font-size: 9px;
        font-weight: bold;
        cursor: pointer;
        margin-right: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        vertical-align: middle;
        backdrop-filter: blur(5px);
        flex-shrink: 0;
        min-width: 16px;
        min-height: 16px;
      " title="مميزات تسجيل الدخول">!</button>
    `;

    // Add event listeners for the dynamically created elements
    setTimeout(() => {
      const directSignInBtn = document.getElementById('directSignInBtn');
      const loginFeaturesInfo = document.getElementById('loginFeaturesInfo');

      if (directSignInBtn) {
        // إزالة أي مستمعين سابقين
        directSignInBtn.onclick = null;

        directSignInBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Direct sign in button clicked');

          // التأكد من وجود authManager
          if (window.authManager && typeof window.authManager.showSignInPage === 'function') {
            console.log('Calling showSignInPage');
            window.authManager.showSignInPage();
          } else if (authManager && typeof authManager.showSignInPage === 'function') {
            console.log('Calling authManager.showSignInPage');
            authManager.showSignInPage();
          } else {
            console.error('AuthManager not found or showSignInPage method not available');
            alert('حدث خطأ. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
          }
        });

        // إضافة onclick كحل احتياطي
        directSignInBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.authManager && typeof window.authManager.showSignInPage === 'function') {
            window.authManager.showSignInPage();
          } else if (authManager && typeof authManager.showSignInPage === 'function') {
            authManager.showSignInPage();
          }
        };
      }

      if (loginFeaturesInfo) {
        loginFeaturesInfo.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const loginFeaturesModal = document.getElementById('loginFeaturesModal');
          if (loginFeaturesModal) {
            loginFeaturesModal.style.display = 'flex';
          }
        });

        // Add hover effects
        loginFeaturesInfo.addEventListener('mouseenter', () => {
          loginFeaturesInfo.style.background = 'rgba(200, 35, 51, 0.9)';
          loginFeaturesInfo.style.transform = 'scale(1.1)';
        });

        loginFeaturesInfo.addEventListener('mouseleave', () => {
          loginFeaturesInfo.style.background = 'rgba(220, 53, 69, 0.7)';
          loginFeaturesInfo.style.transform = 'scale(1)';
        });
      }
    }, 200);

    // Add only version 1 (hidden)
    if (versions.length > 0) {
      const opt = document.createElement("option");
      opt.value = versions[0];
      opt.textContent = `Version ${versions[0]}`;
      versionSelect.appendChild(opt);
    }

    console.log('User NOT signed in - showing login message');
    return;
  }

  // User IS logged in - check VIP mode or free trial
  if (!vipMode && !freeTrialActive) {
    // User is logged in but VIP is OFF and no free trial - show VIP message
    versionSelect.style.display = "none";
    versionLoginMessage.style.display = "block";
    versionLoginMessage.innerHTML = `
      <span style="color: #dc3545; font-weight: bold;">🔒 VIP مطفأ - النسخة الوحيدة المتاحة هي النسخة 1</span>
    `;

    // Add only version 1
    if (versions.length > 0) {
      const opt = document.createElement("option");
      opt.value = versions[0];
      opt.textContent = `Version ${versions[0]}`;
      versionSelect.appendChild(opt);
    }

    console.log('User signed in but VIP OFF and no free trial - showing VIP message');
    return;
  }

  // User has access (VIP OR free trial) - show all versions
  versionSelect.style.display = "block";
  versionLoginMessage.style.display = "none";

  versions.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = `Version ${v}`;
    versionSelect.appendChild(opt);
  });

  if (freeTrialActive) {
    console.log('Free trial active - showing all versions');
  } else {
    console.log('User signed in and VIP ON - showing all versions');
  }
}

// دالة بدء المؤقت لكل سؤال
function startTimer() {
  timeLeft = 43; // وقت 43 ثانية
  updateTimerText();

  // تشغيل صوت بداية السؤال مع التأكد من التشغيل والتحقق من إعدادات الصوت
  if (soundEnabled) {
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
  }

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerText();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      stopTimeDownSound();
      if (!answered) {
        answered = true;
        playSoundIfEnabled(wrongSound);

        // إبراز الجواب الصحيح عند انتهاء الوقت
        const options = document.querySelectorAll(".option-btn");
        if (options[currentQuestions[currentIndex].answer]) {
          const correctBtn = options[currentQuestions[currentIndex].answer];
          correctBtn.style.setProperty('background', '#28a745', 'important');
          correctBtn.style.setProperty('background-color', '#28a745', 'important');
          correctBtn.style.setProperty('border', '2px solid #1e7e34', 'important');
          correctBtn.style.setProperty('color', '#ffffff', 'important');
          correctBtn.style.setProperty('text-shadow', '0 1px 3px rgba(0,0,0,0.5)', 'important');
          correctBtn.style.setProperty('font-weight', '700', 'important');
          correctBtn.style.setProperty('box-shadow', '0 4px 15px rgba(40, 167, 69, 0.4)', 'important');
          correctBtn.classList.add("correct-answer");
          correctBtn.setAttribute("data-answer-state", "correct");
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

// إعداد الشريط العلوي
function setupTopHeader() {
  const topHeader = document.getElementById('topHeader'); // الحصول على عنصر الشريط العلوي
  if (!topHeader) return;

  // إضافة فئة لاخفاء الشريط عند التمرير أو في وضع الاختبار
  topHeader.classList.add('dynamic-header');

  // إضافة مستمع حدث للتمرير مع تأثيرات تدريجية محسنة
  let lastScrollY = window.scrollY;
  let ticking = false;

  function updateHeaderOnScroll() {
    const currentScrollY = window.scrollY;
    const isQuizMode = document.body.classList.contains('quiz-mode');

    if (isQuizMode) {
      // إخفاء الشريط في وضع الاختبار فقط
      topHeader.style.transform = 'translateY(-100%)';
      topHeader.style.opacity = '0';
      topHeader.style.visibility = 'hidden';
    } else {
      // إدارة ظهور/إخفاء الشريط مع تأثيرات تدريجية محسنة للجميع
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // التمرير للأسفل - إخفاء تدريجي
        topHeader.style.transform = 'translateY(-100%)';
        topHeader.style.opacity = '0';
        topHeader.style.visibility = 'hidden';
      } else if (currentScrollY < lastScrollY || currentScrollY <= 80) {
        // التمرير للأعلى أو في بداية الصفحة - إظهار تدريجي
        topHeader.style.visibility = 'visible';
        topHeader.style.transform = 'translateY(0)';
        topHeader.style.opacity = '1';
      }
    }

    lastScrollY = currentScrollY;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateHeaderOnScroll);
      ticking = true;
    }
  });
}


// تحديث عرض الشريط العلوي حسب حالة المستخدم
function updateTopHeaderDisplay() {
  const topHeader = document.getElementById('topHeader');

  if (!topHeader) return;

  // إظهار الشريط للجميع (مسجلين وغير مسجلين)
  topHeader.style.display = 'flex';
  topHeader.style.visibility = 'visible';
  topHeader.style.opacity = '1';
  topHeader.style.transform = 'translateY(0)';

  // إضافة مستمع حدث للتمرير إذا لم يكن موجوداً
  if (!window.scrollListenerAdded) {
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateHeader() {
      const currentScrollY = window.scrollY;
      const isQuizMode = document.body.classList.contains('quiz-mode');

      if (isQuizMode) {
        // إخفاء الشريط في وضع الاختبار فقط
        topHeader.style.transform = 'translateY(-100%)';
        topHeader.style.opacity = '0';
        topHeader.style.visibility = 'hidden';
      } else {
        // إدارة الإظهار/الإخفاء بناءً على التمرير للجميع
        if (currentScrollY > lastScrollY && currentScrollY > 80) {
          // التمرير للأسفل - إخفاء تدريجي
          topHeader.style.transform = 'translateY(-100%)';
          topHeader.style.opacity = '0';
          topHeader.style.visibility = 'hidden';
        } else if (currentScrollY < lastScrollY || currentScrollY <= 80) {
          // التمرير للأعلى - إظهار تدريجي
          topHeader.style.visibility = 'visible';
          topHeader.style.transform = 'translateY(0)';
          topHeader.style.opacity = '1';
        }
      }
      lastScrollY = currentScrollY;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    });
    window.scrollListenerAdded = true;
  }
}


// تحديث رقم طلبات الصداقة في الشريط العلوي
async function updateHeaderFriendRequestsBadge() {
  if (!authManager.isSignedIn() || !authManager.currentUser) return;

  await friendsManager.loadUserFriends();
  const headerBadge = document.getElementById("headerFriendRequestsBadge");
  const count = friendsManager.friendRequests.length;

  if (headerBadge) {
    if (count > 0) {
      headerBadge.textContent = count;
      headerBadge.style.display = "flex";
    } else {
      headerBadge.style.display = "none";
    }
  }
}

// إخفاء/إظهار الشريط العلوي والروابط في وضع الاختبار
function toggleQuizMode(isQuizMode) {
  const body = document.body;
  const topHeader = document.getElementById('topHeader');
  const footerLinks = document.getElementById('footerLinks');
  const freeTrialBadge = document.getElementById('freeTrialBadge');

  if (isQuizMode) {
    body.classList.add('quiz-mode');

    // إخفاء الشريط العلوي
    if (topHeader) {
      topHeader.style.transform = 'translateY(-100%)';
      topHeader.style.opacity = '0';
      topHeader.style.visibility = 'hidden';
    }

    // إخفاء روابط الفوتر في وضع التحدي والاختبار
    if (footerLinks) {
      footerLinks.style.display = 'none';
    }

    // إخفاء شارة التجربة المجانية في وضع الاختبار
    if (freeTrialBadge) {
      freeTrialBadge.style.display = 'none';
    }
  } else {
    body.classList.remove('quiz-mode');

    // إظهار الشريط للجميع عند الخروج من وضع الاختبار
    if (topHeader) {
      topHeader.style.visibility = 'visible';
      topHeader.style.transform = 'translateY(0)';
      topHeader.style.opacity = '1';
    }

    // إظهار روابط الفوتر عند الخروج من وضع التحدي والاختبار
    if (footerLinks) {
      footerLinks.style.display = 'flex';
    }

    // إظهار شارة التجربة المجانية عند الخروج من وضع الاختبار (إذا كانت نشطة)
    if (freeTrialBadge && freeTrialActive && freeTrialTimeLeft > 0) {
      freeTrialBadge.style.display = 'block';
    }
  }
}

// عند الضغط على زر "ابدأ"
document.addEventListener('DOMContentLoaded', () => {
  if (loadBtn) {
    loadBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const subject = subjectSelect.value;
      const lecture = lectureSelect.value;
      const version = versionSelect.value;

      timerEnabled = document.getElementById("timerToggle").checked;

      // التحقق من تسجيل الدخول والاشتراك أو التجربة المجانية أو أول محاضرتين قبل تفعيل ميزات الترتيب العشوائي
      const isUserSignedIn = authManager &&
        authManager.currentUser &&
        authManager.currentUser.uid &&
        authManager.isSignedIn();

      // التحقق من أن المحاضرة الحالية هي من أول محاضرتين
      const isFreeLecture = isFirstTwoLectures(subject, lecture);

      // Shuffle features available for VIP, free trial users, or first 2 lectures
      const hasShuffleAccess = (isUserSignedIn && vipMode) || freeTrialActive || isFreeLecture;

      shuffleEnabled = hasShuffleAccess && document.getElementById("shuffleToggle").checked;
      shuffleAnswersEnabled = hasShuffleAccess && document.getElementById("shuffleAnswersToggle").checked;

      const navigatorTimer = document.getElementById("navigatorTimer");
      if (!timerEnabled) {
        navigatorTimer.style.display = "none";
      }

      const path = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;

      try {
        const module = await import(path);
        let questions = module.questions;

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
          throw new Error('No valid questions found in the module');
        }

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
        isFunMode = false;

        controlsContainer.style.display = "none";
        questionsContainer.style.display = "block";
        homeBtn.style.display = "block";
        questionNavigatorDiv.style.display = "block";

        // Hide the title when entering quiz mode
        document.querySelector("h1").style.display = "none";

        // Hide user info when entering quiz mode
        authManager.updateUserInfoVisibility();

        // إخفاء مؤقت التجربة المجانية عند دخول وضع الاختبار
        hideFreeTrialBadge();

        // تفعيل وضع الاختبار (إخفاء الشريط العلوي)
        toggleQuizMode(true);

        updateQuestionNavigator();
        showQuestion();
      } catch (err) {
        questionsContainer.innerHTML = `<p style="color:red;">فشل تحميل الأسئلة من: ${path}</p>`;
        console.error(err);
      }
    });
  }
});

// تحميل فئات الأسئلة الترفيهية
async function loadFunCategories() {
  try {
    const { funCategories } = await import('./forfun/funCategories.js');
    const funCategorySelect = document.getElementById("funCategorySelect");

    // مسح الخيارات الموجودة
    funCategorySelect.innerHTML = '<option value="">اختر نوع الأسئلة</option>';

    // إضافة الفئات
    Object.entries(funCategories).forEach(([displayName, fileName]) => {
      const option = document.createElement('option');
      option.value = fileName;
      option.textContent = displayName;
      funCategorySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading fun categories:', error);
  }
}

// إضافة مستمع الأحداث لزر التبديل للوضع الترفيهي
document.getElementById("toggleModeBtn").addEventListener("click", () => {
  // إخفاء الواجهة الأكاديمية وإظهار الواجهة الترفيهية
  controlsContainer.style.display = "none";
  funModeContainer.style.display = "block";
  isFunMode = true;

  // تحميل فئات الأسئلة الترفيهية
  loadFunCategories();
});

// عند الضغط على زر "ابدأ الوضع الترفيهي"
document.getElementById("loadFunBtn").addEventListener("click", async () => {
  const selectedCategory = document.getElementById("funCategorySelect").value;
  if (!selectedCategory) {
    alert("يرجى اختيار فئة أسئلة ترفيهية أولاً.");
    return;
  }

  const timerEnabledFun = document.getElementById("timerFunToggle").checked;
  const shuffleEnabledFun = document.getElementById("shuffleFunToggle").checked;
  const shuffleAnswersEnabledFun = document.getElementById("shuffleAnswersFunToggle").checked;

  const path = `./forfun/${selectedCategory}.js`; // افتراض أن الملفات في مجلد forfun

  try {
    const module = await import(path);
    let questions = module.questions;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('No valid questions found in the module');
    }

    // خلط الأسئلة إذا كان الخيار مفعل
    if (shuffleEnabledFun) {
      questions = shuffleQuestions(questions);
    }

    // خلط الأجوبة إذا كان الخيار مفعل
    if (shuffleAnswersEnabledFun) {
      questions = questions.map(question => shuffleAnswers(question));
    }

    currentQuestions = questions;
    currentIndex = 0;
    correctCount = 0;
    questionStatus = new Array(currentQuestions.length).fill("unanswered");
    isFunMode = true;

    // تعيين إعدادات المؤقت للوضع الترفيهي
    timerEnabled = timerEnabledFun;

    // إخفاء أدوات الوضع الأكاديمي وإظهار أدوات الوضع الترفيهي
    controlsContainer.style.display = "none";
    questionNavigatorDiv.style.display = "block"; // يمكن إظهارها في الوضع الترفيهي أيضاً
    funModeContainer.style.display = "none"; // إخفاء واجهة الوضع الترفيهي
    questionsContainer.style.display = "block";
    homeBtn.style.display = "block";

    // Hide the title when entering quiz mode
    document.querySelector("h1").style.display = "none";

    // Hide user info when entering quiz mode
    authManager.updateUserInfoVisibility();

    // إخفاء مؤقت التجربة المجانية عند دخول وضع الاختبار
    hideFreeTrialBadge();

    // تفعيل وضع الاختبار (إخفاء الشريط العلوي)
    toggleQuizMode(true);

    updateQuestionNavigator();
    showQuestion();
  } catch (err) {
    questionsContainer.innerHTML = `<p style="color:red;">فشل تحميل الأسئلة الترفيهية من: ${path}</p>`;
    console.error(err);
  }
});

// متغير لتتبع الوضع الحالي
let isFunMode = false;

// عند الضغط على زر "العودة"
homeBtn.addEventListener("click", () => {
  if (isFunMode) {
    // في الوضع الترفيهي - العودة لواجهة الوضع الترفيهي
    funModeContainer.style.display = "block";
    controlsContainer.style.display = "none";
  } else {
    // في الوضع الأكاديمي - العودة للواجهة الرئيسية
    controlsContainer.style.display = "block";
    funModeContainer.style.display = "none";
  }

  questionsContainer.style.display = "none";
  homeBtn.style.display = "none";
  questionNavigatorDiv.style.display = "none";

  // Show the title when returning to home
  document.querySelector("h1").style.display = "block";

  // Show user info when returning to home
  authManager.updateUserInfoVisibility();

  // إظهار مؤقت التجربة المجانية عند العودة للرئيسية إذا كان نشطاً
  if (freeTrialActive && freeTrialTimeLeft > 0) {
    updateFreeTrialBadge();
  }

  // إلغاء وضع الاختبار (إظهار الشريط العلوي)
  toggleQuizMode(false);

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

// عند الضغط على زر "العودة للوضع الأكاديمي"
document.getElementById("toggleModeBackBtn").addEventListener("click", () => {
  // إظهار أدوات الوضع الأكاديمي وإخفاء أدوات الوضع الترفيهي
  controlsContainer.style.display = "block";
  funModeContainer.style.display = "none";
  questionsContainer.style.display = "none";
  homeBtn.style.display = "none";
  questionNavigatorDiv.style.display = "none";
  isFunMode = false;

  // إظهار العنوان عند العودة للرئيسية
  document.querySelector("h1").style.display = "block";

  // إظهار معلومات المستخدم عند العودة للرئيسية
  authManager.updateUserInfoVisibility();

  // إظهار مؤقت التجربة المجانية عند العودة للرئيسية إذا كان نشطاً
  if (freeTrialActive && freeTrialTimeLeft > 0) {
    updateFreeTrialBadge();
  }

  // إلغاء وضع الاختبار (إظهار الشريط العلوي)
  toggleQuizMode(false);

  // إعادة تعيين المتغيرات
  currentQuestions = [];
  currentIndex = 0;
  correctCount = 0;
  questionStatus = [];
  questionsContainer.innerHTML = "";
  clearInterval(timerInterval);
  stopTimeDownSound();
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
        btn.style.setProperty('background', '#28a745', 'important');
        btn.style.setProperty('background-color', '#28a745', 'important');
        btn.style.setProperty('border', '2px solid #1e7e34', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('text-shadow', '0 1px 3px rgba(0,0,0,0.5)', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('box-shadow', '0 4px 15px rgba(40, 167, 69, 0.4)', 'important');
        btn.classList.add("correct-answer");
        btn.setAttribute("data-answer-state", "correct");
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
        playSoundIfEnabled(correctSound);
        // تطبيق لون الإجابة الصحيحة فوراً
        btn.style.setProperty('background', '#28a745', 'important');
        btn.style.setProperty('background-color', '#28a745', 'important');
        btn.style.setProperty('border', '2px solid #1e7e34', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('text-shadow', '0 1px 3px rgba(0,0,0,0.5)', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('box-shadow', '0 4px 15px rgba(40, 167, 69, 0.4)', 'important');
        btn.classList.add("correct-answer");
        btn.setAttribute("data-answer-state", "correct");
        correctCount++;
        questionStatus[currentIndex] = "correct";
        updateQuestionNavigator();
        showNextButton();
      } else {
        playSoundIfEnabled(wrongSound);
        // تطبيق لون الإجابة الخاطئة فوراً
        btn.style.setProperty('background', '#dc3545', 'important');
        btn.style.setProperty('background-color', '#dc3545', 'important');
        btn.style.setProperty('border', '2px solid #c82333', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('text-shadow', '0 1px 3px rgba(0,0,0,0.5)', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('box-shadow', '0 4px 15px rgba(220, 53, 69, 0.4)', 'important');
        btn.classList.add("wrong-answer");
        btn.setAttribute("data-answer-state", "wrong");

        const correctBtn = optionsList.children[q.answer].querySelector("button");
        correctBtn.style.setProperty('background', '#28a745', 'important');
        correctBtn.style.setProperty('background-color', '#28a745', 'important');
        correctBtn.style.setProperty('border', '2px solid #1e7e34', 'important');
        correctBtn.style.setProperty('color', '#ffffff', 'important');
        correctBtn.style.setProperty('text-shadow', '0 1px 3px rgba(0,0,0,0.5)', 'important');
        correctBtn.style.setProperty('font-weight', '700', 'important');
        correctBtn.style.setProperty('box-shadow', '0 4px 15px rgba(40, 167, 69, 0.4)', 'important');
        correctBtn.classList.add("correct-answer");
        correctBtn.setAttribute("data-answer-state", "correct");

        questionStatus[currentIndex] = "wrong";
        updateQuestionNavigator();
        showNextButton();
      }

      Array.from(optionsList.children).forEach((li) => {
        li.querySelector("button").disabled = true;
      });

      // فرض تطبيق الألوان مرة أخرى بعد قليل
      setTimeout(() => {
        forceApplyAnswerColors();
      }, 100);
    });

    li.appendChild(btn);
    optionsList.appendChild(li);
  });

  questionDiv.appendChild(optionsList);
  questionsContainer.appendChild(questionDiv);

  // Apply current theme to the newly created question elements
  applyTheme(currentTheme);

  // تطبيق ألوان الإجابات إذا كانت موجودة
  setTimeout(() => {
    forceApplyAnswerColors();
  }, 100);

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
  const loginFeaturesModal = document.getElementById('loginFeaturesModal');
  const closeLoginFeaturesModal = document.getElementById('closeLoginFeaturesModal');
  const startLoginFromModal = document.getElementById('startLoginFromModal');

  // Note: loginFeaturesInfo button is now handled dynamically in updateVersionSelector()

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
authManager.setAuthChangeCallback(async (user) => {
  // تحديث المستخدم الحالي في FriendsManager
  friendsManager.updateCurrentUser(user);

  if (user) {
    console.log("User signed in:", user);

    // إذا كان المستخدم حقيقي (ليس ضيف)
    if (!user.isGuest) {
      // إخفاء شارة التجربة المجانية إذا كانت موجودة
      if (typeof hideFreeTrialBadge === 'function') {
        hideFreeTrialBadge();
      }

      // Load settings (including VIP status) after sign in
      await loadSettings();

      // Start listening for VIP status changes
      startVipStatusListener(user.uid);

      // Initialize quiz when user signs in - ensure event listeners are ready
      setTimeout(() => {
        if (subjectSelect) {
          subjectSelect.dispatchEvent(new Event("change"));
        }
      }, 100);

      // تحديث فوري للواجهة عند تسجيل الدخول
      updateVersionSelector();
      updateShuffleControls();
      updateVipButtonVisibility();
      updateTopHeaderDisplay();

      // إظهار زر الأصدقاء
      setupFriendsSystem();

      // بدء الاستماع للرسائل الجديدة من الأصدقاء
      setTimeout(() => {
        if (chatManager) {
          chatManager.startGlobalMessageListener();
        }
      }, 1000);

      console.log('Real user signed in - UI updated immediately');
    } else {
      // مستخدم ضيف - تحديث أساسي فقط
      await loadSettings();
      updateVersionSelector();
      updateShuffleControls();
      updateVipButtonVisibility();
      updateTopHeaderDisplay();

      console.log('Guest user active');
    }
  } else {
    console.log("User signed out");
    // Stop listening for VIP status changes
    stopVipStatusListener();

    // Reset VIP status and load settings
    await loadSettings();

    // Hide VIP badge when user signs out
    hideVipBadge();

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
    if (chatManager) {
      chatManager.stopGlobalMessageListener();
    }

    // تحديث عرض الشريط العلوي
    updateTopHeaderDisplay();

    // Hide VIP button for non-signed users
    updateVipButtonVisibility();
  }
});

// تهيئة نظام الأصدقاء مع تحديث تلقائي محسن
function setupFriendsSystem() {
  // إظهار زر الأصدقاء
  const friendsBtn = document.getElementById("friendsBtn");
  if (friendsBtn) {
    friendsBtn.style.display = "flex";
  }

  // تحديث فوري للتنبيهات
  updateFriendRequestsBadge();
  updateOnlineFriendsBadge();

  // إعداد أحداث النافذة
  setupFriendsModal();

  // تحديث التنبيهات كل 10 ثوانٍ بدلاً من 30 ثانية
  if (window.friendsUpdateInterval) {
    clearInterval(window.friendsUpdateInterval);
  }

  window.friendsUpdateInterval = setInterval(() => {
    if (authManager.isSignedIn()) {
      updateOnlineFriendsBadge();
      updateFriendRequestsBadge();
    }
  }, 10000);

  // تحديث فوري عند العودة للتبويب
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && authManager.isSignedIn()) {
      setTimeout(() => {
        updateOnlineFriendsBadge();
        updateFriendRequestsBadge();
      }, 1000);
    }
  });

  // تحديث عند تحديد النافذة
  window.addEventListener('focus', () => {
    if (authManager.isSignedIn()) {
      setTimeout(() => {
        updateOnlineFriendsBadge();
        updateFriendRequestsBadge();
      }, 500);
    }
  });
}

// إخفاء نظام الأصدقاء مع تنظيف الموارد
function hideFriendsSystem() {
  const friendsModal = document.getElementById("friendsModal");
  const friendsBtn = document.getElementById("friendsBtn");

  if (friendsModal) {
    friendsModal.style.display = "none";
  }

  if (friendsBtn) {
    friendsBtn.style.display = "none";
  }

  // تنظيف المؤقتات
  if (window.friendsUpdateInterval) {
    clearInterval(window.friendsUpdateInterval);
    window.friendsUpdateInterval = null;
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

// فتح نافذة الأصدقاء مع تحديث فوري
async function openFriendsModal() {
  // للضيوف - إظهار نافذة تسجيل الدخول المنسقة
  if (authManager && authManager.guestUser && !authManager.currentUser) {
    showGuestFriendsModal();
    return;
  }

  const friendsModal = document.getElementById("friendsModal");

  if (!friendsModal) {
    console.error('Friends modal element not found in DOM');
    alert('نافذة الأصدقاء غير متوفرة. يرجى تحديث الصفحة.');
    return;
  }

  friendsModal.style.display = "flex";

  // إظهار مؤشر تحميل سريع
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'friendsLoadingIndicator';
  loadingIndicator.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #ffffff;
    font-size: 14px;
    z-index: 10001;
  `;
  loadingIndicator.textContent = '🔄 جاري تحديث حالة الأصدقاء...';
  friendsModal.appendChild(loadingIndicator);

  try {
    // تحديث متوازي للسرعة
    const [friendsData, requestsCount, onlineCount] = await Promise.all([
      friendsManager.loadUserFriends(),
      updateFriendRequestsBadge(),
      updateOnlineFriendsBadge()
    ]);

    // إزالة مؤشر التحميل
    if (loadingIndicator.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }

    // تحميل أصدقائي بشكل افتراضي مع البيانات الجديدة
    switchTab("myFriends");
    loadMyFriends();

  } catch (error) {
    console.error('Error loading friends data:', error);
    // إزالة مؤشر التحميل حتى في حالة الخطأ
    if (loadingIndicator.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }

    // المتابعة مع البيانات المتاحة
    switchTab("myFriends");
    loadMyFriends();
  }
}

// دالة إعادة تفعيل زر الأصدقاء بعد التحدي
window.reactivateFriendsButton = function () {
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
    newFriendsBtn.addEventListener('click', function (e) {
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

// Settings Management
let soundEnabled = true;
let currentTheme = 'dark';
let vipMode = false; // VIP mode disabled by default, controlled by admin
let freeTrialActive = false;
let freeTrialTimeLeft = 0;
let freeTrialTimer = null;

// Admin email
const ADMIN_EMAIL = 'mahmod.adil2001@gmail.com';

// Check if current user is admin
function isAdmin() {
  return authManager &&
    authManager.isSignedIn() &&
    authManager.currentUser &&
    authManager.currentUser.email === ADMIN_EMAIL;
}

// Load settings from localStorage
async function loadSettings() {
  soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  currentTheme = localStorage.getItem('currentTheme') || 'dark';

  // Load VIP status from Firebase for signed-in users, otherwise false
  if (authManager && authManager.isSignedIn() && authManager.currentUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', authManager.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        vipMode = userData.vipStatus === true;
      } else {
        vipMode = false;
      }
    } catch (error) {
      console.error('Error loading VIP status:', error);
      vipMode = false;
    }
  } else {
    // Check for free trial for non-signed users with 3 second delay
    setTimeout(() => {
      initializeFreeTrial();
    }, 3000);
  }

  // Force dark theme if VIP is off and current theme is light
  if (!vipMode && currentTheme === 'light') {
    currentTheme = 'dark';
  }

  // Apply sound setting
  const voiceToggle = document.getElementById('voiceToggle');
  if (voiceToggle) {
    voiceToggle.checked = soundEnabled;
    updateVoiceToggleUI();
  }

  // Apply VIP setting
  const vipToggle = document.getElementById('vipToggle');
  if (vipToggle) {
    vipToggle.checked = vipMode;
    updateVipToggleUI();
  }

  // Show/hide VIP Users button for admin
  const vipUsersBtn = document.getElementById('vipUsersBtn');
  if (vipUsersBtn) {
    if (isAdmin()) {
      vipUsersBtn.style.display = 'block';
    } else {
      vipUsersBtn.style.display = 'none';
    }
  }

  // Apply theme
  applyTheme(currentTheme);
  updateThemeButtons();

  // Show/hide VIP badge based on VIP status
  if (vipMode && authManager && authManager.isSignedIn()) {
    showVipBadge();
  } else {
    hideVipBadge();
  }
}

// Save settings to localStorage
function saveSettings() {
  localStorage.setItem('soundEnabled', soundEnabled);
  localStorage.setItem('currentTheme', currentTheme);
  // VIP mode is now controlled by admin through Firebase, not saved locally
}

// Initialize free trial for new users
function initializeFreeTrial() {
  const trialStartTime = localStorage.getItem('freeTrialStartTime');
  const trialUsed = localStorage.getItem('freeTrialUsed');

  // If trial was never used before
  if (!trialStartTime && !trialUsed) {
    startFreeTrial();
  } else if (trialStartTime && !trialUsed) {
    // Check if trial is still active
    const startTime = parseInt(trialStartTime);
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTime) / 1000; // in seconds

    if (elapsedTime < 30) { // 30 seconds
      // Continue existing trial
      freeTrialActive = true;
      freeTrialTimeLeft = Math.ceil(30 - elapsedTime);
      startFreeTrialTimer();
    } else {
      // Trial expired
      endFreeTrial();
    }
  }
}

// Start free trial
function startFreeTrial() {
  freeTrialActive = true;
  freeTrialTimeLeft = 30; // 30 seconds
  localStorage.setItem('freeTrialStartTime', Date.now().toString());
  startFreeTrialTimer();
  showFreeTrialNotification();

  // تفعيل المزيد من الخيارات تلقائياً مع تأثير ديناميكي
  setTimeout(() => {
    activateTrialFeatures();
  }, 2000);
}

// Start free trial timer
function startFreeTrialTimer() {
  if (freeTrialTimer) {
    clearInterval(freeTrialTimer);
  }

  freeTrialTimer = setInterval(() => {
    freeTrialTimeLeft--;
    updateFreeTrialBadge();

    if (freeTrialTimeLeft <= 0) {
      endFreeTrial();
    }
  }, 1000);

  updateFreeTrialBadge();
}

// End free trial
function endFreeTrial() {
  freeTrialActive = false;
  freeTrialTimeLeft = 0;
  localStorage.setItem('freeTrialUsed', 'true');
  localStorage.removeItem('freeTrialStartTime');

  if (freeTrialTimer) {
    clearInterval(freeTrialTimer);
    freeTrialTimer = null;
  }

  hideFreeTrialBadge();

  // تنظيف أي إشعارات سابقة أولاً
  const existingNotifications = document.querySelectorAll('[id*="trialExpiredNotification"]');
  existingNotifications.forEach(el => {
    if (el.manualCleanup) {
      el.manualCleanup();
    } else if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  // تأخير قصير للتأكد من تحديث الحالة
  setTimeout(() => {
    try {
      updateVersionSelector();
      updateShuffleControls();
      updateVipButtonVisibility();

      // تأخير إضافي قبل إظهار الإشعار للتأكد من استقرار الواجهة
      setTimeout(() => {
        showTrialExpiredNotification();
      }, 200);
    } catch (error) {
      console.error('Error updating UI after trial end:', error);
    }
  }, 100);
}

// Show free trial notification
function showFreeTrialNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    color: #28a745;
    font-family: 'Tajawal', sans-serif;
    font-weight: 600;
    font-size: 16px;
    text-align: center;
    z-index: 999;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    animation: fadeIn 0.5s ease-out;
  `;
  notification.innerHTML = `
    
  `;

  document.body.appendChild(notification);

  // Auto remove after 4 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 4000);
}

// تفعيل ميزات التجربة المجانية مع تأثيرات بصرية محسنة
function activateTrialFeatures() {
  // تحديث إعدادات النسخة أولاً
  updateVersionSelector();
  updateShuffleControls();

  // فتح المزيد من الخيارات مع تأثير بصري محسن
  const moreOptionsToggle = document.getElementById("moreOptionsToggle");
  const moreOptionsContent = document.getElementById("moreOptionsContent");
  const moreOptionsIcon = document.getElementById("moreOptionsIcon");

  if (moreOptionsToggle && moreOptionsContent && moreOptionsIcon) {
    // إضافة تأثير مضيء للزر
    moreOptionsToggle.style.cssText += `
      animation: trialGlow 2s ease-in-out 4;
      box-shadow: 0 0 20px rgba(40, 167, 69, 0.6) !important;
    `;

    // فتح المحتوى مع تأثير انزلاق بطيء وناعم
    setTimeout(() => {
      // تحسين انتقال الانزلاق
      moreOptionsContent.style.transition = "all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      moreOptionsContent.style.maxHeight = "280px";
      moreOptionsContent.style.opacity = "1";
      moreOptionsIcon.textContent = "▲";
      moreOptionsToggle.style.background = "linear-gradient(135deg, #28a745, #20c997)";

      // تفعيل الخيارات العشوائية واحدة تلو الأخرى
      setTimeout(() => {
        activateShuffleOptionsSequentially();
      }, 800);
    }, 1200);
  }

  // إضافة تأثير للأزرار المفعلة حديثاً
  setTimeout(() => {
    addTrialActivationEffects();
  }, 2500);
}

// تفعيل خيارات الترتيب العشوائي بشكل متسلسل مع تأثيرات محسنة
function activateShuffleOptionsSequentially() {
  const shuffleToggle = document.getElementById("shuffleToggle");
  const shuffleAnswersToggle = document.getElementById("shuffleAnswersToggle");

  // تفعيل الخيار الأول (ترتيب الأسئلة عشوائياً)
  if (shuffleToggle) {
    setTimeout(() => {
      shuffleToggle.checked = true;
      shuffleToggle.disabled = false;

      // تأثير تفعيل محسن
      const shuffleLabel = shuffleToggle.closest('label');
      if (shuffleLabel) {
        shuffleLabel.style.animation = 'trialActivateEnhanced 1.2s ease-out';
        shuffleLabel.style.color = '#28a745';
        shuffleLabel.style.fontWeight = '700';
        shuffleLabel.style.textShadow = '0 0 10px rgba(40, 167, 69, 0.5)';

        // إضافة أيقونة تفعيل مؤقتة
        const activationIcon = document.createElement('span');
        activationIcon.style.cssText = `
          margin-left: 8px;
          animation: sparkleIcon 1.5s ease-out;
          font-size: 16px;
        `;
        activationIcon.textContent = '✨';
        shuffleLabel.appendChild(activationIcon);

        // إزالة الأيقونة بعد انتهاء التأثير
        setTimeout(() => {
          if (shuffleLabel.contains(activationIcon)) {
            shuffleLabel.removeChild(activationIcon);
          }
        }, 1500);
      }
    }, 300);
  }

  // تفعيل الخيار الثاني (ترتيب الأجوبة عشوائياً) بعد فترة
  if (shuffleAnswersToggle) {
    setTimeout(() => {
      shuffleAnswersToggle.checked = true;
      shuffleAnswersToggle.disabled = false;

      // تأثير تفعيل محسن
      const shuffleAnswersLabel = shuffleAnswersToggle.closest('label');
      if (shuffleAnswersLabel) {
        shuffleAnswersLabel.style.animation = 'trialActivateEnhanced 1.2s ease-out';
        shuffleAnswersLabel.style.color = '#28a745';
        shuffleAnswersLabel.style.fontWeight = '700';
        shuffleAnswersLabel.style.textShadow = '0 0 10px rgba(40, 167, 69, 0.5)';

        // إضافة أيقونة تفعيل مؤقتة
        const activationIcon = document.createElement('span');
        activationIcon.style.cssText = `
          margin-left: 8px;
          animation: sparkleIcon 1.5s ease-out;
          font-size: 16px;
        `;
        activationIcon.textContent = '✨';
        shuffleAnswersLabel.appendChild(activationIcon);

        // إزالة الأيقونة بعد انتهاء التأثير
        setTimeout(() => {
          if (shuffleAnswersLabel.contains(activationIcon)) {
            shuffleAnswersLabel.removeChild(activationIcon);
          }
        }, 1500);
      }
    }, 900);
  }
}

// دالة تفعيل خيارات الترتيب العشوائي مع تأثيرات (للاستخدام العادي)
function activateShuffleOptions() {
  const shuffleToggle = document.getElementById("shuffleToggle");
  const shuffleAnswersToggle = document.getElementById("shuffleAnswersToggle");

  if (shuffleToggle) {
    shuffleToggle.checked = true;
    shuffleToggle.disabled = false;

    // تأثير تفعيل
    const shuffleLabel = shuffleToggle.closest('label');
    if (shuffleLabel) {
      shuffleLabel.style.animation = 'trialActivate 0.8s ease-out';
      shuffleLabel.style.color = '#28a745';
      shuffleLabel.style.fontWeight = '700';
    }
  }

  if (shuffleAnswersToggle) {
    shuffleAnswersToggle.checked = true;
    shuffleAnswersToggle.disabled = false;

    // تأثير تفعيل
    const shuffleAnswersLabel = shuffleAnswersToggle.closest('label');
    if (shuffleAnswersLabel) {
      shuffleAnswersLabel.style.animation = 'trialActivate 0.8s ease-out';
      shuffleAnswersLabel.style.color = '#28a745';
      shuffleAnswersLabel.style.fontWeight = '700';
    }
  }
}

// إضافة تأثيرات التفعيل
function addTrialActivationEffects() {
  // إضافة تأثير لزر "ابدأ"
  const loadBtn = document.getElementById("loadBtn");
  if (loadBtn) {
    loadBtn.style.animation = 'trialPulse 1.5s ease-in-out 2';
    loadBtn.style.boxShadow = '0 0 25px rgba(102, 126, 234, 0.7)';

    // إضافة نص ديناميكي
    const originalText = loadBtn.textContent;
    loadBtn.innerHTML = `
      <span style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        ✨ ${originalText} ✨
      </span>
    `;

    // إزالة التأثير بعد 5 ثوان
    setTimeout(() => {
      loadBtn.style.animation = '';
      loadBtn.style.boxShadow = '';
      loadBtn.textContent = originalText;
    }, 5000);
  }

  // إضافة نمط CSS للتأثيرات المحسنة
  if (!document.getElementById('trialEffectsStyle')) {
    const style = document.createElement('style');
    style.id = 'trialEffectsStyle';
    style.textContent = `
      @keyframes trialGlow {
        0% { box-shadow: 0 0 5px rgba(40, 167, 69, 0.3); }
        50% { box-shadow: 0 0 25px rgba(40, 167, 69, 0.8), 0 0 35px rgba(40, 167, 69, 0.4); }
        100% { box-shadow: 0 0 5px rgba(40, 167, 69, 0.3); }
      }
      
      @keyframes trialActivate {
        0% { transform: scale(1); color: inherit; }
        50% { transform: scale(1.05); color: #28a745; text-shadow: 0 0 10px rgba(40, 167, 69, 0.5); }
        100% { transform: scale(1); color: #28a745; }
      }
      
      @keyframes trialActivateEnhanced {
        0% { 
          transform: scale(1) translateX(0); 
          color: inherit; 
          background: transparent;
        }
        25% { 
          transform: scale(1.03) translateX(3px); 
          color: #20c997; 
          background: rgba(40, 167, 69, 0.1);
        }
        50% { 
          transform: scale(1.08) translateX(-2px); 
          color: #28a745; 
          text-shadow: 0 0 15px rgba(40, 167, 69, 0.7);
          background: rgba(40, 167, 69, 0.15);
        }
        75% { 
          transform: scale(1.02) translateX(1px); 
          color: #28a745; 
          background: rgba(40, 167, 69, 0.1);
        }
        100% { 
          transform: scale(1) translateX(0); 
          color: #28a745;
          background: transparent;
        }
      }
      
      @keyframes sparkleIcon {
        0% { 
          opacity: 0; 
          transform: scale(0.5) rotate(0deg); 
        }
        50% { 
          opacity: 1; 
          transform: scale(1.2) rotate(180deg); 
        }
        100% { 
          opacity: 0; 
          transform: scale(0.5) rotate(360deg); 
        }
      }
      
      @keyframes trialPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(102, 126, 234, 0.8); }
        100% { transform: scale(1); }
      }
      
      @keyframes sparkle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      /* تحسين انتقالات المزيد من الخيارات */
      #moreOptionsContent {
        transition: all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
      }
      
      #moreOptionsFunContent {
        transition: all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // عرض رسالة تأكيد جميلة
  showTrialActivationMessage();
}

// عرض رسالة تفعيل التجربة المجانية
function showTrialActivationMessage() {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
    padding: 25px 35px;
    border-radius: 20px;
    box-shadow: 0 15px 40px rgba(40, 167, 69, 0.4);
    z-index: 10001;
    font-family: 'Tajawal', sans-serif;
    text-align: center;
    animation: slideInFromTop 0.8s ease-out;
    max-width: 400px;
  `;

  message.innerHTML = `
    <div style="font-size: 50px; margin-bottom: 15px; animation: sparkle 2s infinite;">🎁</div>
    <h3 style="margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">
   
    </h3>
    <div style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
      <div style="margin: 8px 0;">طلاب الاسراء نورتوا يابة</div>
      <div style="margin: 8px 0;"></div>
      <div style="margin: 8px 0;"></div>
    </div>
    <div style="font-size: 14px; opacity: 0.9; font-weight: 600;">
     تونسوا بالاسئلة  ان شاء الله يعجبكم 
    </div>
  `;

  // إضافة تأثير CSS للرسالة
  const messageStyle = document.createElement('style');
  messageStyle.textContent = `
    @keyframes slideInFromTop {
      0% { 
        opacity: 0; 
        transform: translate(-50%, -150%); 
        scale: 0.8;
      }
      50% { 
        opacity: 1; 
        transform: translate(-50%, -50%); 
        scale: 1.05;
      }
      100% { 
        opacity: 1; 
        transform: translate(-50%, -50%); 
        scale: 1;
      }
    }
  `;
  document.head.appendChild(messageStyle);

  document.body.appendChild(message);

  // إزالة الرسالة بعد 4 ثوان مع تأثير انزلاق
  setTimeout(() => {
    message.style.animation = 'slideInFromTop 0.5s ease-out reverse';
    setTimeout(() => {
      if (document.body.contains(message)) {
        document.body.removeChild(message);
      }
      if (document.head.contains(messageStyle)) {
        document.head.removeChild(messageStyle);
      }
    }, 500);
  }, 4000);
}

// Show trial expired notification
function showTrialExpiredNotification() {
  // إزالة أي إشعارات سابقة لتجنب التداخل
  const existingNotifications = document.querySelectorAll('[id*="trialExpiredNotification"]');
  existingNotifications.forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  const notification = document.createElement('div');
  notification.id = 'trialExpiredNotification_' + Date.now();
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ffc107, #f39c12);
    color: #212529;
    padding: 25px 30px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(255, 193, 7, 0.4);
    z-index: 10002;
    font-family: 'Tajawal', sans-serif;
    font-weight: 600;
    font-size: 16px;
    text-align: center;
    max-width: 350px;
    width: 90%;
    animation: bounceIn 0.6s ease-out;
    box-sizing: border-box;
    overflow: hidden;
  `;

  notification.innerHTML = `
    <div style="font-size: 40px; margin-bottom: 12px;">⏰</div>
    <div style="margin-bottom: 15px; font-size: 18px; font-weight: 700;"> سويلك حساب عالسريع </div>
    <div style="font-size: 14px; opacity: 0.9; line-height: 1.4; margin-bottom: 18px;">
      علمود تحصل كل الميزات
    </div>
    <button class="trial-expired-signin-btn" style="
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 15px;
      cursor: pointer;
      font-weight: 600;
      font-family: 'Tajawal', sans-serif;
      transition: all 0.3s ease;
      width: 100%;
      box-sizing: border-box;
    ">تسجيل الدخول</button>
  `;

  // إضافة النمط المطلوب للتأثيرات إذا لم يكن موجوداً
  if (!document.getElementById('trialExpiredStyles')) {
    const style = document.createElement('style');
    style.id = 'trialExpiredStyles';
    style.textContent = `
      @keyframes bounceIn {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        70% { transform: translate(-50%, -50%) scale(0.9); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
      .trial-expired-signin-btn:hover {
        background: linear-gradient(135deg, #218838, #1ba085) !important;
        transform: translateY(-1px);
      }
      @media (max-width: 480px) {
        #trialExpiredNotification_${Date.now()} {
          padding: 20px 15px !important;
          font-size: 14px !important;
          max-width: 300px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // إضافة مستمع الأحداث مع حماية من الأخطاء
  const signInBtn = notification.querySelector('.trial-expired-signin-btn');
  if (signInBtn) {
    signInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        // إزالة الإشعار فوراً
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }

        // فتح صفحة تسجيل الدخول
        setTimeout(() => {
          if (window.authManager && typeof window.authManager.showSignInPage === 'function') {
            window.authManager.showSignInPage();
          } else if (authManager && typeof authManager.showSignInPage === 'function') {
            authManager.showSignInPage();
          } else {
            console.error('AuthManager not found');
            alert('حدث خطأ. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
          }
        }, 100);

      } catch (error) {
        console.error('Error in trial expired sign in:', error);
        alert('حدث خطأ. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
      }
    });
  }

  // إزالة تلقائية بعد 6 ثوانٍ مع تنظيف آمن
  const autoRemoveTimeout = setTimeout(() => {
    try {
      if (notification && notification.parentNode) {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
          if (notification && notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error removing trial expired notification:', error);
    }
  }, 6000);

  // إضافة خاصية للتنظيف اليدوي
  notification.manualCleanup = () => {
    clearTimeout(autoRemoveTimeout);
    if (notification && notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  };
}

// Update free trial badge
function updateFreeTrialBadge() {
  let badge = document.getElementById('freeTrialBadge');

  if (freeTrialActive && freeTrialTimeLeft > 0) {
    // التحقق من وضع الاختبار - إخفاء الشارة في وضع الاختبار
    const isQuizMode = document.body.classList.contains('quiz-mode');

    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'freeTrialBadge';
      badge.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        color: #28a745;
        font-family: 'Tajawal', sans-serif;
        font-weight: 600;
        font-size: 16px;
        text-align: center;
        z-index: 999;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.5s ease-out;
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        box-shadow: none !important;
        display: none;
      `;

      // إضافة زر التخطي الصغير تحت المؤقت
      const skipButton = document.createElement('button');
      skipButton.id = 'skipTrialButton';
      skipButton.style.cssText = `
        display: block;
        margin: 8px auto 0 auto;
        background: rgba(108, 117, 125, 0.8) !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 11px;
        cursor: pointer;
        font-family: 'Tajawal', sans-serif;
        font-weight: 500;
        transition: all 0.3s ease;
        opacity: 0.7;
        box-shadow: none !important;
      `;
      skipButton.textContent = 'تخطي التجربة';
      skipButton.addEventListener('click', () => {
        endFreeTrial();
      });

      skipButton.addEventListener('mouseenter', () => {
        skipButton.style.opacity = '1';
        skipButton.style.background = 'rgba(108, 117, 125, 0.9) !important';
        skipButton.style.transform = 'scale(1.05)';
      });

      skipButton.addEventListener('mouseleave', () => {
        skipButton.style.opacity = '0.7';
        skipButton.style.background = 'rgba(108, 117, 125, 0.8) !important';
        skipButton.style.transform = 'scale(1)';
      });

      badge.appendChild(skipButton);
      document.body.appendChild(badge);
    }

    // إخفاء الشارة دائماً
    badge.style.display = 'none';

    const minutes = Math.floor(freeTrialTimeLeft / 60);
    const seconds = freeTrialTimeLeft % 60;

    // تحديث النص فقط إذا كانت الشارة مرئية
    if (!isQuizMode) {
      if (badge.querySelector('#skipTrialButton')) {
        badge.childNodes[0].textContent = `تجربة مجانية: ${minutes}:${seconds.toString().padStart(2, '0')}`;
      } else {
        badge.innerHTML = `
          تجربة مجانية: ${minutes}:${seconds.toString().padStart(2, '0')}
        `;
      }

      // Change color when time is running out
      if (freeTrialTimeLeft <= 10) {
        badge.style.color = '#dc3545';
      } else if (freeTrialTimeLeft <= 30) {
        badge.style.color = '#ffc107';
      } else {
        badge.style.color = '#28a745';
      }
    }
  }
}

// Hide free trial badge
function hideFreeTrialBadge() {
  const badge = document.getElementById('freeTrialBadge');
  if (badge) {
    badge.style.display = 'none';
    badge.remove();
  }

  // إزالة زر التخطي إذا كان موجوداً بشكل منفصل
  const skipButton = document.getElementById('skipTrialButton');
  if (skipButton) {
    skipButton.remove();
  }
}

// Show VIP subscription modal for non-admin users
function showVipSubscriptionModal() {
  const modal = document.createElement('div');
  modal.id = 'vipSubscriptionModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #ffc107, #f39c12);
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(255, 193, 7, 0.4);
      width: 90%;
      max-width: 550px;
      max-height: 85vh;
      overflow-y: auto;
      animation: slideIn 0.5s ease-out;
      position: relative;
      color: #212529;
    ">
      <!-- Header -->
      <div style="
        background: rgba(255, 255, 255, 0.15);
        padding: 25px;
        border-radius: 20px 20px 0 0;
        text-align: center;
        position: relative;
        border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      ">
        <div style="font-size: 50px; margin-bottom: 10px;"></div>
        <h2 style="margin: 0; font-family: 'Tajawal', sans-serif; font-size: 28px; font-weight: 700; color: #212529;">
         
        </h2>
        <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 16px;">
          
        </p>
        <button onclick="closeVipSubscriptionModal()" style="
          position: absolute;
          top: 20px;
          left: 25px;
          background: rgba(255, 255, 255, 0.25);
          border: none;
          color: #212529;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-weight: bold;
        ">×</button>
      </div>

      <!-- Content -->
      <div style="padding: 30px;">
        <!-- Features List -->
        <div style="margin-bottom: 30px;">
          <h3 class="vip-header" style="margin: 0 0 20px 0; font-size: 22px; font-weight: 700; color: #212529; text-align: center; cursor: pointer;">
            🌟 مميزات اشتراك VIP <span class="expand-indicator" style="font-size:18px; opacity:0.6;">▼</span>
          </h3>

          <div class="vip-features" style="
            display: grid;
            grid-gap: 15px;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transition: max-height 0.6s ease, opacity 1.2s ease;
          ">
            
            <!-- بطاقة المظهر الفاتح -->
            <div class="vip-feature" style="background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 12px; border-left: 4px solid #fff; cursor: pointer; transition: all 0.3s ease;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="font-size: 24px;">🎨</span>
                <strong style="font-size: 18px;">المظهر الفاتح الحصري</strong>
              </div>
              <p class="feature-desc" style="margin: 0; line-height: 1.5; opacity: 0.9; display: none;">
                استمتع بالمظهر الفاتح الأنيق والمريح للعينين
              </p>
            </div>

            <!-- بطاقة جميع النسخ -->
            <div class="vip-feature" style="background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 12px; border-left: 4px solid #fff; cursor: pointer; transition: all 0.3s ease;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="font-size: 24px;">📚</span>
                <strong style="font-size: 18px;">جميع نسخ الأسئلة</strong>
              </div>
              <p class="feature-desc" style="margin: 0; line-height: 1.5; opacity: 0.9; display: none;">
                الوصول لجميع نسخ الأسئلة المختلفة لكل محاضرة
              </p>
            </div>

            <!-- بطاقة الترتيب العشوائي -->
            <div class="vip-feature" style="background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 12px; border-left: 4px solid #fff; cursor: pointer; transition: all 0.3s ease;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="font-size: 24px;">🔀</span>
                <strong style="font-size: 18px;">الترتيب العشوائي</strong>
              </div>
              <p class="feature-desc" style="margin: 0; line-height: 1.5; opacity: 0.9; display: none;">
                إمكانية ترتيب الأسئلة والأجوبة عشوائياً لتجربة متنوعة
              </p>
            </div>

            <!-- بطاقة الأولوية في الدعم -->
            <div class="vip-feature" style="background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 12px; border-left: 4px solid #fff; cursor: pointer; transition: all 0.3s ease;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="font-size: 24px;">⚡</span>
                <strong style="font-size: 18px;">الأولوية في الدعم</strong>
              </div>
              <p class="feature-desc" style="margin: 0; line-height: 1.5; opacity: 0.9; display: none;">
                دعم مميز وسريع لحل أي مشاكل أو استفسارات
              </p>
            </div>

          </div>
        </div>

        <!-- Subscription Info -->
        <div style="
          background: rgba(255, 255, 255, 0.25);
          padding: 25px;
          border-radius: 15px;
          text-align: center;
          margin-bottom: 25px;
          border: 2px solid rgba(255, 255, 255, 0.3);
        ">
          <h3 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 700; color: #212529;">
            💰 سعر الاشتراك
          </h3>
          <div style="font-size: 36px; font-weight: 800; margin-bottom: 10px; color: #d4851b;">
            10,000 دينار عراقي فقط
          </div>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">
           اشتراك سنوي  
          </p>
        </div>

        <!-- Payment Methods -->
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #212529; text-align: center;">
            💳 طرق الدفع
          </h3>
          <div style="display: grid; gap: 15px;">
            <div style="
              background: rgba(255, 255, 255, 0.2);
              padding: 18px;
              border-radius: 12px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              cursor: pointer;
              transition: all 0.3s ease;
            " onclick="copyToClipboard('7137393513', this)">
              <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 28px;">💳</span>
                <div>
                  <strong style="font-size: 18px; display: block;">بطاقة فيزا</strong>
                  <span style="font-size: 20px; font-weight: 700; color: #d4851b;">7137393513</span>
                  <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">انقر للنسخ</div>
                </div>
              </div>
            </div>

            <div style="
              background: rgba(255, 255, 255, 0.2);
              padding: 18px;
              border-radius: 12px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              cursor: pointer;
              transition: all 0.3s ease;
            " onclick="copyToClipboard('07733940374', this)">
              <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 28px;">📱</span>
                <div>
                  <strong style="font-size: 18px; display: block;">زين كاش</strong>
                  <span style="font-size: 20px; font-weight: 700; color: #d4851b;">07733940374</span>
                  <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">انقر للنسخ</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div style="
          background: rgba(40, 167, 69, 0.2);
          padding: 20px;
          border-radius: 12px;
          border-left: 4px solid #28a745;
          margin-bottom: 20px;
        ">
          <h4 style="margin: 0 0 15px 0; color: #155724; font-size: 18px; font-weight: 700;">
            📋 خطوات التفعيل
          </h4>
          <ol style="margin: 0; padding-right: 20px; color: #155724; line-height: 1.6;">
            <li>انسخ رقم الحساب المناسب لك</li>
            <li>قم بتحويل 10,000 دينار عراقي</li>
            <li>احفظ صورة أو لقطة شاشة للحوالة</li>
            <li>أرسل صورة الحوالة مع اسمك ومعرف حسابك للمطور</li>
            <li>سيتم تفعيل VIP خلال 24 ساعة</li>
          </ol>
        </div>

        <!-- Contact Button -->
        <div style="text-align: center;">
          <button onclick="contactDeveloper()" style="
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 40px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
            text-transform: none;
          ">
            📞 تواصل مع المطور للتفعيل
          </button>
        </div>
      </div>
    </div>
  `;

  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-50px) scale(0.9); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    #vipSubscriptionModal [style*="cursor: pointer"]:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2) !important;
      background: rgba(255, 255, 255, 0.35) !important;
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(modal);

  // Add interactive functionality for VIP features
  setTimeout(() => {
    const vipHeader = modal.querySelector('.vip-header');
    const vipFeatures = modal.querySelector('.vip-features');
    const expandIndicator = modal.querySelector('.expand-indicator');

    // Function to toggle the features section with smooth animations
    function toggleFeatures() {
      if (vipFeatures.classList.contains('show')) {
        vipFeatures.classList.remove('show');
        vipFeatures.style.maxHeight = '0';
        vipFeatures.style.opacity = '0';
        expandIndicator.textContent = '▼';
      } else {
        vipFeatures.classList.add('show');
        vipFeatures.style.maxHeight = '1000px';
        vipFeatures.style.opacity = '1';
        expandIndicator.textContent = '▲';
      }
    }

    // Initial automatic popup for 2.5 seconds with smooth animation
    setTimeout(() => {
      vipFeatures.classList.add('show');
      vipFeatures.style.maxHeight = '1000px';
      vipFeatures.style.opacity = '1';
      expandIndicator.textContent = '▲';

      // Auto-hide after 2.5 seconds
      setTimeout(() => {
        vipFeatures.classList.remove('show');
        vipFeatures.style.maxHeight = '0';
        vipFeatures.style.opacity = '0';
        expandIndicator.textContent = '▼';
      }, 2500);
    }, 200);

    // Toggle on header click
    if (vipHeader) {
      vipHeader.addEventListener('click', toggleFeatures);
    }

    // Toggle individual feature descriptions on hover and click
    modal.querySelectorAll('.vip-feature').forEach(feature => {
      // Show description on hover
      feature.addEventListener('mouseenter', () => {
        const desc = feature.querySelector('.feature-desc');
        if (desc) {
          desc.style.display = 'block';
        }
      });

      // Hide description when mouse leaves
      feature.addEventListener('mouseleave', () => {
        const desc = feature.querySelector('.feature-desc');
        if (desc) {
          desc.style.display = 'none';
        }
      });

      // Toggle description on click
      feature.addEventListener('click', () => {
        const desc = feature.querySelector('.feature-desc');
        if (desc) {
          if (desc.style.display === 'none' || desc.style.display === '') {
            desc.style.display = 'block';
          } else {
            desc.style.display = 'none';
          }
        }
      });
    });


  }, 100);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeVipSubscriptionModal();
    }
  });
}

// Close VIP subscription modal
function closeVipSubscriptionModal() {
  const modal = document.getElementById('vipSubscriptionModal');
  if (modal) {
    modal.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Copy to clipboard function
function copyToClipboard(text, element) {
  navigator.clipboard.writeText(text).then(() => {
    // Visual feedback
    element.style.background = 'rgba(40, 167, 69, 0.3)';
    element.style.transform = 'scale(1.02)';

    const originalText = element.querySelector('div div:last-child');
    const originalContent = originalText.textContent;
    originalText.textContent = '✅ تم النسخ!';
    originalText.style.color = '#155724';
    originalText.style.fontWeight = 'bold';

    setTimeout(() => {
      element.style.background = 'rgba(255, 255, 255, 0.2)';
      element.style.transform = 'scale(1)';
      originalText.textContent = originalContent;
      originalText.style.color = '';
      originalText.style.fontWeight = '';
    }, 2000);
  }).catch(() => {
    alert('تم نسخ الرقم: ' + text);
  });
}

// Contact developer function
function contactDeveloper() {
  closeVipSubscriptionModal();
  // Show contact modal
  showContactUsModal();
}

// Open settings modal
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'flex';

    // Show/hide sections based on login status
    const passwordSection = document.getElementById('passwordChangeForm');
    const passwordNotSignedIn = document.getElementById('passwordNotSignedIn');
    const userInfoSection = document.getElementById('userInfoSection');

    if (authManager && authManager.currentUser && !authManager.guestUser) {
      // مستخدم حقيقي مسجل
      passwordSection.style.display = 'block';
      passwordNotSignedIn.style.display = 'none';
      if (userInfoSection) {
        userInfoSection.style.display = 'block';
      }
    } else {
      // ضيف أو غير مسجل
      passwordSection.style.display = 'none';
      if (userInfoSection) {
        userInfoSection.style.display = 'none';
      }

      if (authManager && authManager.guestUser && !authManager.currentUser) {
        // للضيوف - إظهار رسالة مخصصة
        passwordNotSignedIn.style.display = 'block';
        passwordNotSignedIn.innerHTML = `
          <div style="
            background: rgba(255, 193, 7, 0.1);
            border: 2px solid rgba(255, 193, 7, 0.3);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
          ">
            <div style="font-size: 40px; margin-bottom: 15px;">⚡</div>
            <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 18px; font-weight: 700;">
              أنت في وضع الضيف المؤقت
            </h3>
            <p style="margin: 0 0 15px 0; color: #856404; line-height: 1.5;">
              للوصول إلى جميع الإعدادات وحفظ تقدمك، يرجى إنشاء حساب أو تسجيل الدخول
            </p>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button id="guestSettingsSignUpBtn" style="
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 600;
                font-family: 'Tajawal', sans-serif;
                transition: all 0.3s ease;
                flex: 1;
                min-width: 120px;
              ">إنشاء حساب</button>
              <button id="guestSettingsSignInBtn" style="
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 600;
                font-family: 'Tajawal', sans-serif;
                transition: all 0.3s ease;
                flex: 1;
                min-width: 120px;
              ">تسجيل الدخول</button>
            </div>
          </div>
        `;

        // إضافة مستمعي الأحداث للأزرار
        setTimeout(() => {
          const signUpBtn = document.getElementById('guestSettingsSignUpBtn');
          const signInBtn = document.getElementById('guestSettingsSignInBtn');

          if (signUpBtn) {
            signUpBtn.addEventListener('click', () => {
              closeSettingsModal();
              if (authManager) {
                authManager.showSignUpPage();
              }
            });
          }

          if (signInBtn) {
            signInBtn.addEventListener('click', () => {
              closeSettingsModal();
              if (authManager) {
                authManager.showSignInPage();
              }
            });
          }
        }, 100);
      } else {
        // غير مسجل تماماً
        passwordNotSignedIn.style.display = 'block';
      }
    }
  }
}

// Close settings modal
function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Change password function
async function changePassword() {
  if (!authManager || !authManager.isSignedIn()) {
    alert('يجب تسجيل الدخول أولاً');
    return;
  }

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    alert('يرجى ملء جميع الحقول');
    return;
  }

  if (newPassword !== confirmNewPassword) {
    alert('كلمة المرور الجديدة وتأكيدها غير متطابقتين');
    return;
  }

  if (newPassword.length < 6) {
    alert('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    return;
  }

  try {
    const success = await authManager.changePassword(currentPassword, newPassword);
    if (success) {
      alert('تم تغيير كلمة المرور بنجاح');
      // Clear form
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmNewPassword').value = '';
    }
  } catch (error) {
    console.error('Error changing password:', error);
  }
}

// Toggle voice on/off
function toggleVoice() {
  soundEnabled = !soundEnabled;
  updateVoiceToggleUI();
  saveSettings();
}

// Toggle VIP mode on/off
function toggleVip() {
  if (isAdmin()) {
    // Admin cannot toggle their own VIP status from here
    showVipUsersModal();
  } else {
    // Non-admin users see subscription modal
    showVipSubscriptionModal();
  }
}

// Update voice toggle UI
function updateVoiceToggleUI() {
  const toggle = document.getElementById('voiceToggle');
  const slider = document.getElementById('voiceToggleSlider');

  if (toggle && slider) {
    toggle.checked = soundEnabled;
    if (soundEnabled) {
      toggle.style.background = '#28a745';
      toggle.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.4)';
      slider.style.transform = 'translateX(0)';
      slider.style.background = '#ffffff';
    } else {
      toggle.style.background = '#6c757d';
      toggle.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.3)';
      slider.style.transform = 'translateX(-25px)';
      slider.style.background = '#ffffff';
    }

    // Add hover effects
    toggle.addEventListener('mouseenter', () => {
      if (soundEnabled) {
        toggle.style.background = '#218838';
      } else {
        toggle.style.background = '#5a6268';
      }
    });

    toggle.addEventListener('mouseleave', () => {
      if (soundEnabled) {
        toggle.style.background = '#28a745';
      } else {
        toggle.style.background = '#6c757d';
      }
    });
  }
}

// Show VIP badge for VIP users
function showVipBadge() {
  // Remove existing badge if any
  const existingBadge = document.getElementById('vipBadge');
  if (existingBadge) {
    existingBadge.remove();
  }

  // Show VIP badge only for real signed-in users (not guests) with VIP mode active
  if (vipMode && authManager && authManager.isSignedIn() && authManager.currentUser && !authManager.currentUser.isGuest) {
    const vipBadge = document.createElement('div');
    vipBadge.id = 'vipBadge';
    vipBadge.style.cssText = `
    position: fixed;
    top: 10px; /* أقرب للأعلى */
    right: 10px; /* أقرب لليمين */
    background: linear-gradient(135deg, #ffd700, #ffb347);
    color: #8b4513;
    padding: 4px 10px; /* تصغير الحواف */
    border-radius: 20px;
    font-family: 'Tajawal', sans-serif;
    font-weight: 700;
    font-size: 12px; /* تصغير النص */
    z-index: 9998;
    box-shadow: 0 2px 10px rgba(255, 215, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(8px);
    animation: vipPulse 2s infinite ease-in-out;
    cursor: pointer;
    transition: all 0.3s ease;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 4px; /* تقليل المسافة بين الايموجي والنص */
    `;

    vipBadge.innerHTML = `
    <span style="font-size: 14px;">👑</span> <!-- تصغير الايموجي -->
    <span>VIP</span>
    `;

    // Add hover effects
    vipBadge.addEventListener('mouseenter', () => {
      vipBadge.style.transform = 'scale(1.1)';
      vipBadge.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.6)';
    });

    vipBadge.addEventListener('mouseleave', () => {
      vipBadge.style.transform = 'scale(1)';
      vipBadge.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)';
    });

    // Add click effect
    vipBadge.addEventListener('click', () => {
      vipBadge.style.animation = 'vipClick 0.3s ease';
      setTimeout(() => {
        vipBadge.style.animation = 'vipPulse 2s infinite ease-in-out';
      }, 300);
    });

    document.body.appendChild(vipBadge);

    // Add CSS animations if not already added
    if (!document.getElementById('vipBadgeStyles')) {
      const style = document.createElement('style');
      style.id = 'vipBadgeStyles';
      style.textContent = `
        @keyframes vipPulse {
          0% { 
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4), 0 0 0 0 rgba(255, 215, 0, 0.7);
          }
          50% { 
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4), 0 0 0 8px rgba(255, 215, 0, 0);
          }
          100% { 
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4), 0 0 0 0 rgba(255, 215, 0, 0);
          }
        }

        @keyframes vipClick {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        @media (max-width: 768px) {
          #vipBadge {
            top: 15px !important;
            right: 15px !important;
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
          
          #vipBadge span:first-child {
            font-size: 14px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Hide VIP badge
function hideVipBadge() {
  const existingBadge = document.getElementById('vipBadge');
  if (existingBadge) {
    existingBadge.remove();
  }
}

// Update VIP toggle UI
function updateVipToggleUI() {
  const toggle = document.getElementById('vipToggle');
  const slider = document.getElementById('vipToggleSlider');
  const lightThemeBtn = document.getElementById('lightThemeBtn');

  if (toggle && slider) {
    toggle.checked = vipMode;

    if (vipMode) {
      toggle.style.background = '#ffc107';
      toggle.style.boxShadow = '0 2px 8px rgba(255, 193, 7, 0.4)';
      slider.style.transform = 'translateX(0)';
      slider.style.background = '#ffffff';

      // Enable light theme button
      if (lightThemeBtn) {
        lightThemeBtn.disabled = false;
        lightThemeBtn.style.opacity = '1';
        lightThemeBtn.style.cursor = 'pointer';
        lightThemeBtn.title = '';
      }

      // Show VIP badge only for real signed-in users
      if (authManager && authManager.currentUser && !authManager.currentUser.isGuest) {
        showVipBadge();
      }
    } else {
      toggle.style.background = '#6c757d';
      toggle.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.3)';
      slider.style.transform = 'translateX(-25px)';
      slider.style.background = '#ffffff';

      // Disable light theme button and force dark theme
      if (lightThemeBtn) {
        lightThemeBtn.disabled = true;
        lightThemeBtn.style.opacity = '0.5';
        lightThemeBtn.style.cursor = 'not-allowed';
        lightThemeBtn.title = 'VIP مطلوب لاستخدام المظهر الفاتح';
      }

      // Force dark theme when VIP is off
      if (currentTheme === 'light') {
        currentTheme = 'dark';
        applyTheme('dark');
        updateThemeButtons();
        saveSettings();
      }

      // Hide VIP badge
      hideVipBadge();
    }

    // Set toggle to read-only for non-admin users
    if (isAdmin()) {
      toggle.style.cursor = 'pointer';
      toggle.title = 'إدارة مستخدمي VIP';
    } else {
      toggle.style.cursor = 'pointer';
      toggle.title = vipMode ? 'VIP مفعل بواسطة الإدارة' : 'اشترك في VIP';
    }

    // Different hover effects for admin vs regular users
    toggle.addEventListener('mouseenter', () => {
      if (isAdmin()) {
        toggle.style.background = '#28a745'; // Green for admin panel
      } else {
        // For non-admin users, always show subscription color
        toggle.style.background = '#28a745';
      }
    });

    toggle.addEventListener('mouseleave', () => {
      if (vipMode) {
        toggle.style.background = '#ffc107';
      } else {
        toggle.style.background = '#6c757d';
      }
    });
  }

  // Update VIP button visibility whenever toggle UI updates
  updateVipButtonVisibility();
}

// Update VIP button visibility based on user login, VIP status, and free trial
function updateVipButtonVisibility() {
  const vipSubscribeBtn = document.getElementById('vipSubscribeBtn');

  if (vipSubscribeBtn) {
    // Show button only if user is signed in, VIP is not active, and no free trial
    if (authManager && authManager.isSignedIn() && !vipMode && !freeTrialActive) {
      vipSubscribeBtn.style.display = 'flex';
    } else {
      vipSubscribeBtn.style.display = 'none';
    }
  }
}

// Set theme
function setTheme(theme) {
  // Prevent switching to light theme when VIP mode is off
  if (theme === 'light' && !vipMode) {
    // Show a more appropriate notification
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #ffc107, #f39c12);
      color: #212529;
      padding: 25px 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(255, 193, 7, 0.4);
      z-index: 10000;
      font-family: 'Tajawal', sans-serif;
      text-align: center;
      max-width: 350px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      animation: bounceIn 0.6s ease-out;
    `;
    alertDiv.innerHTML = `
      <div style="font-size: 40px; margin-bottom: 15px;">👑</div>
      <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #212529;">
        🚫 وضع VIP مطفأ
      </h3>
      <p style="margin: 0 0 20px 0; line-height: 1.5; color: #495057;">
        المظهر الفاتح متاح فقط مع وضع VIP. يجب عليك تشغيل زر VIP من الإعدادات لاستخدام هذه الميزة
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
          background: linear-gradient(135deg, #6c757d, #495057);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Tajawal', sans-serif;
          transition: all 0.3s ease;
        ">حسناً</button>
        <button onclick="openSettingsModal(); this.parentElement.parentElement.parentElement.remove();" style="
          background: linear-gradient(135deg, #ffc107, #f39c12);
          color: #212529;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Tajawal', sans-serif;
          transition: all 0.3s ease;
        ">فتح الإعدادات</button>
      </div>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounceIn {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        70% { transform: translate(-50%, -50%) scale(0.9); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(alertDiv);

    // Auto remove after 8 seconds
    setTimeout(() => {
      if (document.body.contains(alertDiv)) {
        alertDiv.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
          if (document.body.contains(alertDiv)) {
            document.body.removeChild(alertDiv);
          }
        }, 300);
      }
    }, 8000);

    return;
  }

  currentTheme = theme;
  applyTheme(theme);
  updateThemeButtons();
  saveSettings();
}

// Apply theme to the page
function applyTheme(theme) {
  const body = document.body;

  // تطبيق ألوان الإجابات عند تغيير الثيم
  setTimeout(() => {
    forceApplyAnswerColors();
  }, 200);

  if (theme === 'light') {
    // Light theme styling
    body.style.background = 'linear-gradient(135deg, #f8f9fa, #e9ecef)';
    body.style.color = '#212529';

    // Update ring background for light theme
    const ringBackground = document.querySelector('.ring-background');
    if (ringBackground) {
      ringBackground.style.opacity = '0.08';
    }

    // Update text colors for light theme
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      label.style.color = '#495057';
      label.style.textShadow = 'none';
      label.style.fontWeight = '600';
    });

    const h1 = document.querySelector('h1');
    if (h1) {
      h1.style.color = '#343a40';
      h1.style.textShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
      h1.style.fontWeight = '700';
    }

    // Update questions and answers text for light theme - إصلاح شامل
    const questionElements = document.querySelectorAll('#questionsContainer, #questionsContainer *, #questionsContainer h2, #questionsContainer p, #questionsContainer div, .question-title, .question-text, .question-box h2, .question-box p, .question-box div, .question-box *, #challengeQuestionContainer, #challengeQuestionContainer *, #challengeQuestionContainer h2, #challengeQuestionContainer p, #challengeQuestionContainer div');
    questionElements.forEach(element => {
      element.style.setProperty('color', '#212529', 'important');
      element.style.setProperty('text-shadow', 'none', 'important');
      // إضافة تباين أفضل للنصوص
      if (element.tagName === 'H2') {
        element.style.setProperty('color', '#343a40', 'important');
        element.style.setProperty('font-weight', '700', 'important');
      }
    });

    // Update option buttons for light theme - تحسين شامل
    const optionButtons = document.querySelectorAll('li button, .option-btn, #challengeQuestionContainer button, #questionsContainer button');
    optionButtons.forEach(button => {
      // Only update if it's not a correct/wrong answer
      if (!button.style.backgroundColor ||
        (button.style.backgroundColor !== 'lightgreen' &&
          button.style.backgroundColor !== 'salmon' &&
          !button.style.backgroundColor.includes('rgb(144, 238, 144)') &&
          !button.style.backgroundColor.includes('rgb(250, 128, 114)'))) {
        button.style.setProperty('color', '#212529', 'important');
        button.style.setProperty('text-shadow', 'none', 'important');
        button.style.setProperty('background', 'linear-gradient(135deg, #ffffff, #f8f9fa)', 'important');
        button.style.setProperty('border', '2px solid #dee2e6', 'important');
        button.style.setProperty('box-shadow', '0 2px 8px rgba(0, 0, 0, 0.1)', 'important');
        // تحسين الخط والوضوح
        button.style.setProperty('font-weight', '600', 'important');
        button.style.setProperty('font-size', '16px', 'important');
      }
    });

    // Update settings modal cards for light theme
    const settingsCards = document.querySelectorAll('#soundSettingsCard, #themeSettingsCard');
    settingsCards.forEach(card => {
      if (card.id === 'soundSettingsCard') {
        card.style.background = 'rgba(40, 167, 69, 0.08)';
        card.style.border = '2px solid rgba(40, 167, 69, 0.2)';
      } else if (card.id === 'themeSettingsCard') {
        card.style.background = 'rgba(255, 193, 7, 0.08)';
        card.style.border = '2px solid rgba(255, 193, 7, 0.2)';
      }
    });

    // Update settings modal headers
    const settingsHeaders = document.querySelectorAll('#soundSettingsCard h3, #themeSettingsCard h3, #passwordSection h3');
    settingsHeaders.forEach(header => {
      header.style.color = '#343a40';
    });

    // Fix voice toggle for light theme
    const voiceToggle = document.getElementById('voiceToggle');
    const voiceSlider = document.getElementById('voiceToggleSlider');
    if (voiceToggle && voiceSlider) {
      updateVoiceToggleUI();
    }

    // Add light theme class to body for CSS targeting
    body.classList.add('light-theme');
    body.classList.remove('dark-theme');

    console.log('Light theme applied successfully');

  } else {
    // Dark theme (default)
    body.style.background = '#111';
    body.style.color = '#2c3e50';

    const ringBackground = document.querySelector('.ring-background');
    if (ringBackground) {
      ringBackground.style.opacity = '0.4';
    }

    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      label.style.color = '#ffffff';
      label.style.textShadow = '0 1px 5px rgba(0, 0, 0, 0.7)';
      label.style.fontWeight = '600';
    });

    const h1 = document.querySelector('h1');
    if (h1) {
      h1.style.color = '#ffffff';
      h1.style.textShadow = '0 2px 10px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 255, 255, 0.3)';
    }

    // Reset questions and answers text for dark theme
    const questionElements = document.querySelectorAll('#questionsContainer, #questionsContainer *, #questionsContainer h2, #questionsContainer p, #questionsContainer div, .question-title, .question-text, .question-box h2, .question-box p, .question-box div, .question-box *');
    questionElements.forEach(element => {
      // Only apply white if motion-off is not active
      if (!document.body.classList.contains('motion-off')) {
        element.style.setProperty('color', '#ffffff', 'important');
        element.style.setProperty('text-shadow', '0 1px 5px rgba(0, 0, 0, 0.7)', 'important');
      }
    });

    // Reset option buttons for dark theme
    const optionButtons = document.querySelectorAll('li button, .option-btn');
    optionButtons.forEach(button => {
      // Only reset if it's not a correct/wrong answer
      if (!button.style.backgroundColor ||
        (button.style.backgroundColor !== 'lightgreen' &&
          button.style.backgroundColor !== 'salmon' &&
          !button.style.backgroundColor.includes('rgb(144, 238, 144)') &&
          !button.style.backgroundColor.includes('rgb(250, 128, 114)'))) {
        button.style.color = '#ffffff !important';
        button.style.textShadow = '0 1px 5px rgba(0, 0, 0, 0.7) !important';
        button.style.background = 'rgba(255, 255, 255, 0.1) !important';
        button.style.border = '2px solid rgba(255, 255, 255, 0.3) !important';
        button.style.boxShadow = 'none !important';
      }
    });

    // Reset settings modal cards for dark theme
    const settingsCards = document.querySelectorAll('#soundSettingsCard, #themeSettingsCard');
    settingsCards.forEach(card => {
      if (card.id === 'soundSettingsCard') {
        card.style.background = 'rgba(40, 167, 69, 0.1)';
        card.style.border = '2px solid rgba(40, 167, 69, 0.2)';
      } else if (card.id === 'themeSettingsCard') {
        card.style.background = 'rgba(255, 193, 7, 0.1)';
        card.style.border = '2px solid rgba(255, 193, 7, 0.2)';
      }
    });

    // Reset settings modal headers
    const settingsHeaders = document.querySelectorAll('#soundSettingsCard h3, #themeSettingsCard h3, #passwordSection h3');
    settingsHeaders.forEach(header => {
      header.style.color = '#2c3e50';
    });

    // Add dark theme class to body for CSS targeting
    body.classList.add('dark-theme');
    body.classList.remove('light-theme');

    console.log('Dark theme applied successfully');
  }

  // Force correct/wrong colors to be visible in both themes
  setTimeout(() => {
    // معالجة الأزرار الصحيحة بطرق متعددة
    const correctSelectors = [
      'button[style*="lightgreen"]',
      'li button[style*="lightgreen"]',
      '.correct-answer',
      '.option-btn.correct-answer',
      '[data-answer-state="correct"]'
    ];

    correctSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(btn => {
        if (currentTheme === 'light') {
          btn.style.setProperty('background', 'linear-gradient(135deg, #d4edda, #c3e6cb)', 'important');
          btn.style.setProperty('border-color', '#28a745', 'important');
          btn.style.setProperty('color', '#155724', 'important');
          btn.style.setProperty('text-shadow', 'none', 'important');
          btn.style.setProperty('font-weight', '700', 'important');
        } else {
          btn.style.setProperty('background', 'linear-gradient(135deg, #d4edda, #c3e6cb)', 'important');
          btn.style.setProperty('border-color', '#28a745', 'important');
          btn.style.setProperty('color', '#155724', 'important');
          btn.style.setProperty('text-shadow', 'none', 'important');
          btn.style.setProperty('font-weight', '700', 'important');
        }
      });
    });

    // معالجة الأزرار الخاطئة بطرق متعددة
    const wrongSelectors = [
      'button[style*="salmon"]',
      'li button[style*="salmon"]',
      '.wrong-answer',
      '.option-btn.wrong-answer',
      '[data-answer-state="wrong"]'
    ];

    wrongSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(btn => {
        if (currentTheme === 'light') {
          btn.style.setProperty('background', 'linear-gradient(135deg, #f8d7da, #f5c6cb)', 'important');
          btn.style.setProperty('border-color', '#dc3545', 'important');
          btn.style.setProperty('color', '#721c24', 'important');
          btn.style.setProperty('text-shadow', 'none', 'important');
          btn.style.setProperty('font-weight', '700', 'important');
        } else {
          btn.style.setProperty('background', 'linear-gradient(135deg, #f8d7da, #f5c6cb)', 'important');
          btn.style.setProperty('border-color', '#dc3545', 'important');
          btn.style.setProperty('color', '#721c24', 'important');
          btn.style.setProperty('text-shadow', 'none', 'important');
          btn.style.setProperty('font-weight', '700', 'important');
        }
      });
    });
  }, 100);
}

// Update theme buttons appearance
function updateThemeButtons() {
  const darkBtn = document.getElementById('darkThemeBtn');
  const lightBtn = document.getElementById('lightThemeBtn');

  if (darkBtn && lightBtn) {
    // Reset both buttons
    darkBtn.style.border = '2px solid transparent';
    lightBtn.style.border = '2px solid transparent';

    // Highlight active theme
    if (currentTheme === 'dark') {
      darkBtn.style.border = '2px solid #667eea';
      darkBtn.style.boxShadow = '0 0 10px rgba(102, 126, 234, 0.5)';
      lightBtn.style.boxShadow = 'none';
    } else {
      lightBtn.style.border = '2px solid #ffc107';
      lightBtn.style.boxShadow = '0 0 10px rgba(255, 193, 7, 0.5)';
      darkBtn.style.boxShadow = 'none';
    }
  }
}

// Override sound playing functions to respect sound setting
function playSound(sound) {
  if (soundEnabled && sound) {
    sound.currentTime = 0;
    sound.play().catch(error => {
      console.log('Sound play prevented:', error);
    });
  }
}

// دالة مساعدة لضمان تطبيق ألوان الإجابات بشكل صحيح
function forceApplyAnswerColors() {
  // البحث عن جميع الأزرار بطرق مختلفة
  const selectors = [
    'button',
    '.option-btn',
    'li button',
    '#questionsContainer button',
    '#challengeQuestionContainer button'
  ];

  selectors.forEach(selector => {
    const buttons = document.querySelectorAll(selector);

    buttons.forEach(btn => {
      // تحديد ما إذا كان الزر إجابة صحيحة
      const isCorrect = btn.style.backgroundColor === 'lightgreen' ||
        btn.style.backgroundColor.includes('rgb(144, 238, 144)') ||
        btn.classList.contains('correct-answer') ||
        btn.getAttribute('data-answer-state') === 'correct' ||
        btn.style.backgroundColor.includes('lightgreen');

      // تحديد ما إذا كان الزر إجابة خاطئة  
      const isWrong = btn.style.backgroundColor === 'salmon' ||
        btn.style.backgroundColor.includes('rgb(250, 128, 114)') ||
        btn.classList.contains('wrong-answer') ||
        btn.getAttribute('data-answer-state') === 'wrong' ||
        btn.style.backgroundColor.includes('salmon');

      if (isCorrect) {
        // تطبيق لون الإجابة الصحيحة
        btn.style.setProperty('background', '#28a745', 'important');
        btn.style.setProperty('background-color', '#28a745', 'important');
        btn.style.setProperty('border', '2px solid #1e7e34', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('text-shadow', '0 1px 3px rgba(0,0,0,0.5)', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('box-shadow', '0 4px 15px rgba(40, 167, 69, 0.4)', 'important');
      }

      if (isWrong) {
        // تطبيق لون الإجابة الخاطئة
        btn.style.setProperty('background', '#dc3545', 'important');
        btn.style.setProperty('background-color', '#dc3545', 'important');
        btn.style.setProperty('border', '2px solid #c82333', 'important');
        btn.style.setProperty('color', '#ffffff', 'important');
        btn.style.setProperty('text-shadow', '0 1px 3px rgba(0,0,0,0.5)', 'important');
        btn.style.setProperty('font-weight', '700', 'important');
        btn.style.setProperty('box-shadow', '0 4px 15px rgba(220, 53, 69, 0.4)', 'important');
      }
    });
  });

  // إضافة MutationObserver لمراقبة التغييرات
  if (!window.answerColorsObserver) {
    window.answerColorsObserver = new MutationObserver(() => {
      setTimeout(forceApplyAnswerColors, 50);
    });

    const container = document.getElementById('questionsContainer');
    if (container) {
      window.answerColorsObserver.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  }
}

// Helper function to check sound setting before playing any audio
function playSoundIfEnabled(sound) {
  if (soundEnabled && sound) {
    sound.currentTime = 0;
    sound.play().catch(error => {
      console.log('Sound play prevented:', error);
    });
  }
}

// Show VIP Users management modal for admin
function showVipUsersModal() {
  if (!isAdmin()) {
    alert('غير مصرح لك بالوصول لهذه الصفحة');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'vipUsersModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #28a745, #20c997);
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(40, 167, 69, 0.4);
      width: 90%;
      max-width: 700px;
      max-height: 85vh;
      overflow-y: auto;
      animation: slideIn 0.5s ease-out;
      position: relative;
      color: white;
    ">
      <!-- Header -->
      <div style="
        background: rgba(255, 255, 255, 0.15);
        padding: 25px;
        border-radius: 20px 20px 0 0;
        text-align: center;
        position: relative;
        border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      ">
        <div style="font-size: 50px; margin-bottom: 10px;">👑</div>
        <h2 style="margin: 0; font-family: 'Tajawal', sans-serif; font-size: 28px; font-weight: 700; color: white;">
          إدارة مستخدمي VIP
        </h2>
        <p style="margin: 10px 0 0 0; opacity: 0.8; font-size: 16px;">
          تحكم في صلاحيات VIP لجميع المستخدمين
        </p>
        <button onclick="closeVipUsersModal()" style="
          position: absolute;
          top: 20px;
          left: 25px;
          background: rgba(255, 255, 255, 0.25);
          border: none;
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-weight: bold;
        ">×</button>
      </div>

      <!-- Content -->
      <div style="padding: 30px;">
        <div style="margin-bottom: 20px;">
          <input type="text" id="userSearchInput" placeholder="🔍 البحث عن مستخدم (الاسم أو الإيميل)" style="
            width: 100%;
            padding: 12px 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            box-sizing: border-box;
            transition: all 0.3s ease;
          ">
        </div>
        
        <div id="vipUsersList" style="
          max-height: 400px;
          overflow-y: auto;
          margin-top: 20px;
        "></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeVipUsersModal();
    }
  });

  // Search functionality
  const searchInput = document.getElementById('userSearchInput');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const searchTerm = e.target.value.trim();

      searchTimeout = setTimeout(() => {
        loadVipUsersList(searchTerm);
      }, 300);
    });
  }

  // Load initial users list
  loadVipUsersList();
}

// Close VIP Users modal
function closeVipUsersModal() {
  const modal = document.getElementById('vipUsersModal');
  if (modal) {
    modal.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Load VIP users list
async function loadVipUsersList(searchTerm = '') {
  const usersList = document.getElementById('vipUsersList');
  if (!usersList) return;

  usersList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.8); padding: 20px;">🔄 جاري التحميل...</div>';

  try {
    // Check if user is admin first
    if (!isAdmin()) {
      usersList.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">❌ غير مصرح لك بالوصول لهذه الصفحة</div>';
      return;
    }

    // Import Firebase functions with error handling
    const { collection, getDocs, db } = await import('./firebase-config.js');

    console.log('Loading VIP users list...');

    const usersQuery = collection(db, 'users');
    const querySnapshot = await getDocs(usersQuery);

    console.log('Query executed, processing results...');
    const allUsers = [];

    if (querySnapshot.empty) {
      usersList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.8); padding: 20px;">📭 لا يوجد مستخدمين مسجلين حالياً</div>';
      return;
    }

    querySnapshot.forEach((doc) => {
      try {
        const userData = doc.data();
        allUsers.push({
          uid: doc.id,
          email: userData["الايميل"] || userData.email || 'غير متوفر',
          name: userData["الاسم الكامل"] || userData.fullName || userData.name || 'غير متوفر',
          group: userData["الجروب"] || userData.group || 'غير متوفر',
          vipStatus: userData.vipStatus === true
        });
      } catch (docError) {
        console.error('Error processing document:', doc.id, docError);
      }
    });

    console.log(`Loaded ${allUsers.length} users`);

    // Filter users based on search term
    let filteredUsers = allUsers;
    if (searchTerm && searchTerm.length > 0) {
      filteredUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filteredUsers.length === 0) {
      if (searchTerm) {
        usersList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.8); padding: 20px;">🔍 لم يتم العثور على مستخدمين يطابقون البحث</div>';
      } else {
        usersList.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.8); padding: 20px;">📭 لا يوجد مستخدمين</div>';
      }
      return;
    }

    let html = '';
    filteredUsers.forEach(user => {
      html += `
        <div style="
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 10px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="flex: 1;">
              <div style="font-weight: 700; font-size: 16px; margin-bottom: 5px;">
                ${user.vipStatus ? '👑' : '👤'} ${user.name}
              </div>
              <div style="font-size: 14px; opacity: 0.9; word-break: break-word;">
                📧 ${user.email}<br>
                👥 ${user.group}
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end; min-width: 140px;">
              <span style="
                background: ${user.vipStatus ? '#ffc107' : '#6c757d'};
                color: ${user.vipStatus ? '#212529' : 'white'};
                padding: 4px 8px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 700;
                white-space: nowrap;
                margin-bottom: 5px;
              ">${user.vipStatus ? 'VIP مفعل' : 'VIP مطفأ'}</span>
              <button onclick="toggleUserVipStatus('${user.uid}', ${!user.vipStatus})" style="
                background: ${user.vipStatus ? '#dc3545' : '#28a745'};
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                font-weight: 600;
                font-family: 'Tajawal', sans-serif;
                transition: all 0.3s ease;
                white-space: nowrap;
                width: 100%;
                margin-bottom: 5px;
              ">
                ${user.vipStatus ? '🚫 إلغاء VIP' : '✅ تفعيل VIP'}
              </button>
              ${user.vipStatus ? `
              <button onclick="showAdminUserSettings('${user.uid}', ${user.hideFromPublicVip}, ${user.extraThanksPoints || 0}, '${user.name.replace(/'/g, '\\\'')}')" style="
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                font-weight: 600;
                font-family: 'Tajawal', sans-serif;
                transition: all 0.3s ease;
                white-space: nowrap;
                width: 100%;
                margin-bottom: 5px;
              ">
                ⚙️ إعدادات الشكر والظهور
              </button>` : ''}
              <button onclick="deleteUser('${user.uid}', '${user.name.replace(/'/g, '\\\'')}', '${user.email.replace(/'/g, '\\\'')}')" style="
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                font-weight: 600;
                font-family: 'Tajawal', sans-serif;
                transition: all 0.3s ease;
                white-space: nowrap;
                width: 100%;
              ">
                🗑️ حذف المستخدم
              </button>
            </div>
          </div>
        </div>
      `;
    });

    usersList.innerHTML = html;
    console.log('VIP users list rendered successfully');

  } catch (error) {
    console.error('Error loading users list:', error);

    let errorMessage = 'حدث خطأ في تحميل قائمة المستخدمين';

    if (error.code === 'permission-denied') {
      errorMessage = 'ليس لديك صلاحية للوصول لقاعدة البيانات';
    } else if (error.code === 'unavailable') {
      errorMessage = 'قاعدة البيانات غير متاحة حالياً';
    } else if (error.message) {
      errorMessage += ': ' + error.message;
    }

    usersList.innerHTML = `
      <div style="
        text-align: center; 
        color: #dc3545; 
        padding: 20px;
        background: rgba(220, 53, 69, 0.1);
        border-radius: 12px;
        border: 1px solid rgba(220, 53, 69, 0.3);
      ">
        <div style="font-size: 18px; margin-bottom: 10px;">❌</div>
        <div style="font-weight: 600; margin-bottom: 8px;">${errorMessage}</div>
        <button onclick="loadVipUsersList('${searchTerm}')" style="
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Tajawal', sans-serif;
          margin-top: 10px;
        ">🔄 إعادة المحاولة</button>
      </div>
    `;
  }
}

// Toggle VIP status for a user
async function toggleUserVipStatus(userId, newVipStatus) {
  if (!isAdmin()) {
    alert('غير مصرح لك بتنفيذ هذا الإجراء');
    return;
  }

  try {
    const { updateDoc, doc } = await import('./firebase-config.js');
    const { db } = await import('./firebase-config.js');

    const updateData = {
      vipStatus: newVipStatus,
      vipUpdatedAt: new Date().toISOString(),
      vipUpdatedBy: authManager.currentUser.email
    };

    // Add notification flag for VIP activation
    if (newVipStatus) {
      updateData.vipActivationNotificationId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    await updateDoc(doc(db, 'users', userId), updateData);

    // Check if this user is currently signed in and update their VIP status
    if (authManager && authManager.isSignedIn() && authManager.currentUser.uid === userId) {
      // Update the global VIP mode for the current user
      vipMode = newVipStatus;

      // Update the VIP toggle UI
      updateVipToggleUI();

      // Update version selector to reflect new VIP status
      updateVersionSelector();

      // Update shuffle controls
      updateShuffleControls();

      // Show notification to the user only for activation
      if (newVipStatus) {
        // Store the notification ID to prevent showing it again on page refresh
        localStorage.setItem('vipNotificationShown', updateData.vipActivationNotificationId);

        const userNotification = document.createElement('div');
        userNotification.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #ffc107, #f39c12);
          color: #212529;
          padding: 30px 40px;
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
          z-index: 10002;
          font-family: 'Tajawal', sans-serif;
          font-weight: 700;
          font-size: 18px;
          text-align: center;
          max-width: 400px;
          animation: bounceIn 0.6s ease-out;
        `;
        userNotification.innerHTML = `
          <div style="font-size: 50px; margin-bottom: 15px;">👑</div>
          <div style="margin-bottom: 20px;">🎉 تم تفعيل VIP لحسابك! يمكنك الآن الاستمتاع بجميع المميزات الحصرية</div>
          <div style="font-size: 14px; opacity: 0.9; line-height: 1.5;">
            🎨 المظهر الفاتح الحصري<br>
            📚 جميع نسخ الأسئلة<br>
            🔀 الترتيب العشوائي<br>
            ⚡ الأولوية في الدعم
          </div>
        `;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
          @keyframes bounceIn {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
            70% { transform: translate(-50%, -50%) scale(0.9); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `;
        document.head.appendChild(style);

        document.body.appendChild(userNotification);

        // Auto remove after 5 seconds
        setTimeout(() => {
          if (document.body.contains(userNotification)) {
            userNotification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
              if (document.body.contains(userNotification)) {
                document.body.removeChild(userNotification);
              }
            }, 300);
          }
        }, 5000);
      }

      // Save settings to reflect the change
      saveSettings();
    }

    // Reload the list
    const searchTerm = document.getElementById('userSearchInput')?.value || '';
    loadVipUsersList(searchTerm);

    // Show success message for admin
    const message = newVipStatus ? 'تم تفعيل VIP للمستخدم بنجاح' : 'تم إلغاء VIP للمستخدم بنجاح';
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
      z-index: 10001;
      font-family: 'Tajawal', sans-serif;
      font-weight: 600;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 3000);

  } catch (error) {
    console.error('Error updating VIP status:', error);
    alert('حدث خطأ في تحديث حالة VIP');
  }
}

// VIP Status Listener
let vipStatusListener = null;

// Start listening for VIP status changes
async function startVipStatusListener(userId) {
  if (vipStatusListener) {
    vipStatusListener(); // Unsubscribe previous listener
  }

  try {
    const { onSnapshot, doc } = await import('./firebase-config.js');
    const { db } = await import('./firebase-config.js');

    vipStatusListener = onSnapshot(doc(db, 'users', userId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        const newVipStatus = userData.vipStatus === true;

        // Only update if VIP status actually changed
        if (newVipStatus !== vipMode) {
          const previousVipMode = vipMode;
          vipMode = newVipStatus;

          // Update UI elements
          updateVipToggleUI();
          updateVersionSelector();
          updateShuffleControls();
          saveSettings();

          // Update VIP badge display
          if (newVipStatus) {
            showVipBadge();
          } else {
            hideVipBadge();
          }

          // Update VIP button visibility
          updateVipButtonVisibility();

          // Show notification only if this is a change (not initial load) and hasn't been shown before
          if (previousVipMode !== undefined) {
            if (newVipStatus && userData.vipActivationNotificationId) {
              // Check if we already showed this notification
              const lastShownNotificationId = localStorage.getItem('vipNotificationShown');

              if (lastShownNotificationId !== userData.vipActivationNotificationId) {
                // Store the notification ID to prevent showing it again
                localStorage.setItem('vipNotificationShown', userData.vipActivationNotificationId);

                const userNotification = document.createElement('div');
                userNotification.style.cssText = `
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  background: linear-gradient(135deg, #ffc107, #f39c12);
                  color: #212529;
                  padding: 30px 40px;
                  border-radius: 20px;
                  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
                  z-index: 10002;
                  font-family: 'Tajawal', sans-serif;
                  font-weight: 700;
                  font-size: 18px;
                  text-align: center;
                  max-width: 400px;
                  animation: bounceIn 0.6s ease-out;
                `;
                userNotification.innerHTML = `
                  <div style="font-size: 50px; margin-bottom: 15px;">👑</div>
                  <div style="margin-bottom: 20px;">🎉 تم تفعيل VIP لحسابك! يمكنك الآن الاستمتاع بجميع المميزات الحصرية</div>
                  <div style="font-size: 14px; opacity: 0.9; line-height: 1.5;">
                    🎨 المظهر الفاتح الحصري<br>
                    📚 جميع نسخ الأسئلة<br>
                    🔀 الترتيب العشوائي<br>
                    ⚡ الأولوية في الدعم
                  </div>
                `;

                document.body.appendChild(userNotification);

                // Auto remove after 5 seconds
                setTimeout(() => {
                  if (document.body.contains(userNotification)) {
                    userNotification.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => {
                      if (document.body.contains(userNotification)) {
                        document.body.removeChild(userNotification);
                      }
                    }, 300);
                  }
                }, 5000);

                console.log(`VIP activation notification shown for notification ID: ${userData.vipActivationNotificationId}`);
              } else {
                console.log('VIP notification already shown for this activation');
              }
            } else if (!newVipStatus) {
              // Show deactivation notification (this can be shown every time)
              const userNotification = document.createElement('div');
              userNotification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #dc3545, #c82333);
                color: white;
                padding: 30px 40px;
                border-radius: 20px;
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
                z-index: 10002;
                font-family: 'Tajawal', sans-serif;
                font-weight: 700;
                font-size: 18px;
                text-align: center;
                max-width: 400px;
                animation: bounceIn 0.6s ease-out;
              `;
              userNotification.innerHTML = `
                <div style="font-size: 50px; margin-bottom: 15px;">❌</div>
                <div style="margin-bottom: 20px;">❌ تم إلغاء VIP من حسابك</div>
              `;

              document.body.appendChild(userNotification);

              // Auto remove after 5 seconds
              setTimeout(() => {
                if (document.body.contains(userNotification)) {
                  userNotification.style.animation = 'fadeOut 0.3s ease-out';
                  setTimeout(() => {
                    if (document.body.contains(userNotification)) {
                      document.body.removeChild(userNotification);
                    }
                  }, 300);
                }
              }, 5000);
            }

            console.log(`VIP status updated in real-time: ${newVipStatus}`);
          }
        }
      }
    });

    console.log('VIP status listener started for user:', userId);
  } catch (error) {
    console.error('Error setting up VIP status listener:', error);
  }
}

// Stop listening for VIP status changes
function stopVipStatusListener() {
  if (vipStatusListener) {
    vipStatusListener();
    vipStatusListener = null;
    console.log('VIP status listener stopped');
  }
}

// Delete user function for admin
async function deleteUser(userId, userName, userEmail) {
  if (!isAdmin()) {
    alert('غير مصرح لك بتنفيذ هذا الإجراء');
    return;
  }

  // Confirmation dialog
  const confirmed = confirm(
    `هل أنت متأكد من حذف المستخدم؟\n\n` +
    `الاسم: ${userName}\n` +
    `الإيميل: ${userEmail}\n\n` +
    `تحذير: سيتم حذف المستخدم من Firebase Auth وقاعدة البيانات نهائياً!`
  );

  if (!confirmed) return;

  // Double confirmation for safety
  const doubleConfirmed = confirm('هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد تماماً؟');
  if (!doubleConfirmed) return;

  try {
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 12px;
      z-index: 10003;
      font-family: 'Tajawal', sans-serif;
      text-align: center;
    `;
    loadingDiv.textContent = '🗑️ جاري حذف المستخدم...';
    document.body.appendChild(loadingDiv);

    // Import Firebase functions
    const { deleteDoc, doc } = await import('./firebase-config.js');
    const { db } = await import('./firebase-config.js');

    // Delete user document from Firestore
    await deleteDoc(doc(db, 'users', userId));

    // Remove loading indicator
    if (document.body.contains(loadingDiv)) {
      document.body.removeChild(loadingDiv);
    }

    // Show success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
      z-index: 10001;
      font-family: 'Tajawal', sans-serif;
      font-weight: 600;
    `;
    successDiv.innerHTML = `
      <div style="margin-bottom: 5px;">✅ تم حذف المستخدم بنجاح</div>
      <div style="font-size: 12px; opacity: 0.9;">تم حذف البيانات من قاعدة البيانات</div>
    `;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 5000);

    // If the deleted user is currently signed in, sign them out
    if (authManager && authManager.isSignedIn() && authManager.currentUser.uid === userId) {
      await authManager.signOutUser();

      // Show notification to the deleted user
      const userNotification = document.createElement('div');
      userNotification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        padding: 30px 40px;
        border-radius: 20px;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
        z-index: 10002;
        font-family: 'Tajawal', sans-serif;
        font-weight: 700;
        font-size: 18px;
        text-align: center;
        max-width: 400px;
      `;
      userNotification.innerHTML = `
        <div style="font-size: 50px; margin-bottom: 15px;">🚫</div>
        <div style="margin-bottom: 20px;">تم حذف حسابك من قبل الإدارة</div>
        <div style="font-size: 14px; opacity: 0.9;">سيتم إعادة تحويلك للصفحة الرئيسية</div>
      `;

      document.body.appendChild(userNotification);

      setTimeout(() => {
        if (document.body.contains(userNotification)) {
          document.body.removeChild(userNotification);
        }
      }, 5000);
    }

    // Reload the users list
    const searchTerm = document.getElementById('userSearchInput')?.value || '';
    loadVipUsersList(searchTerm);

  } catch (error) {
    // Remove loading indicator on error
    const loadingDiv = document.querySelector('div[style*="🗑️ جاري حذف المستخدم"]');
    if (loadingDiv && document.body.contains(loadingDiv)) {
      document.body.removeChild(loadingDiv);
    }

    console.error('Error deleting user:', error);

    let errorMessage = 'حدث خطأ في حذف المستخدم';
    if (error.code === 'permission-denied') {
      errorMessage = 'ليس لديك صلاحية لحذف هذا المستخدم';
    } else if (error.code === 'not-found') {
      errorMessage = 'المستخدم غير موجود في قاعدة البيانات';
    }

    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 15px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
      z-index: 10001;
      font-family: 'Tajawal', sans-serif;
      font-weight: 600;
    `;
    errorDiv.textContent = errorMessage;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      if (document.body.contains(errorDiv)) {
        document.body.removeChild(errorDiv);
      }
    }, 5000);
  }
}

// دالة إظهار نافذة تسجيل الدخول للضيوف عند الضغط على زر الأصدقاء
function showGuestFriendsModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;

  modal.innerHTML = `
    <div style="
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(15px);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      width: 90%;
      max-width: 500px;
      animation: slideIn 0.5s ease-out;
    ">
      <!-- رأس النافذة -->
      <div style="
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 20px;
        border-radius: 20px 20px 0 0;
        text-align: center;
        position: relative;
      ">
        <h2 style="margin: 0; font-family: 'Tajawal', sans-serif; font-size: 24px; font-weight: 700;">👥 الأصدقاء</h2>
        <button onclick="closeGuestFriendsModal()" style="
          position: absolute;
          top: 15px;
          left: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        ">✕</button>
      </div>

      <!-- محتوى النافذة -->
      <div style="padding: 30px; text-align: center; color: #2c3e50;">
        <div style="font-size: 60px; margin-bottom: 20px;">🔐</div>
        
        <h3 style="
          margin: 0 0 15px 0;
          font-family: 'Tajawal', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #2c3e50;
        ">تسجيل الدخول مطلوب</h3>
        
        <p style="
          margin: 0 0 25px 0;
          font-family: 'Tajawal', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #6c757d;
        ">للوصول إلى ميزات الأصدقاء والدردشة والتحديات، يرجى تسجيل الدخول أو إنشاء حساب جديد</p>

        <!-- قائمة المميزات -->
        <div style="
          background: rgba(40, 167, 69, 0.1);
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 25px;
          text-align: right;
        ">
          <div style="color: #28a745; font-weight: 700; margin-bottom: 10px; text-align: center;">
            🌟 مميزات نظام الأصدقاء
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: #495057;">
            <div>👥 إضافة أصدقاء والتواصل معهم</div>
            <div>💬 دردشة فورية مع الأصدقاء</div>
            <div>⚔️ تحديات الأسئلة والمنافسة</div>
            <div>📊 متابعة نشاط الأصدقاء</div>
          </div>
        </div>

        
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // إضافة تأثيرات hover للأزرار
  const buttons = modal.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = button.style.boxShadow.replace('0 8px 25px', '0 4px 15px');
    });
  });

  // إغلاق النافذة عند الضغط خارجها
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeGuestFriendsModal();
    }
  });
}

// إغلاق نافذة تسجيل الدخول للضيوف
function closeGuestFriendsModal() {
  const modal = document.querySelector('div[style*="backdrop-filter: blur(5px)"]');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 300);
  }
}

// الانتقال لصفحة تسجيل الدخول من نافذة الأصدقاء
function goToSignInFromFriends() {
  closeGuestFriendsModal();
  if (authManager) {
    authManager.showSignInPage();
  }
}

// الانتقال لصفحة إنشاء حساب من نافذة الأصدقاء
function goToSignUpFromFriends() {
  closeGuestFriendsModal();
  if (authManager) {
    authManager.showSignUpPage();
  }
}

// جعل الدوال متاحة عالمياً
window.openFriendsModal = openFriendsModal;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.changePassword = changePassword;
window.setTheme = setTheme;

// --- Background Motion Logic ---
const motionToggle = document.getElementById('motionToggle');
const motionToggleSlider = document.getElementById('motionToggleSlider');
const ringBackground = document.querySelector('.ring-background');

function updateMotionState(enabled, save = true) {
  if (!motionToggle || !motionToggleSlider || !ringBackground) return;

  if (enabled) {
    ringBackground.style.display = 'flex';
    document.body.classList.remove('motion-off');
    // Reset body background to default if needed, though CSS classes handle most of it
    document.body.style.background = '';
    motionToggle.checked = true;
    motionToggle.style.background = '#667eea';
    motionToggleSlider.style.transform = 'translateX(0)';
  } else {
    ringBackground.style.display = 'none';
    document.body.classList.add('motion-off');
    document.body.style.background = '#f8f9fa';
    motionToggle.checked = false;
    motionToggle.style.background = '#ccc';
    motionToggleSlider.style.transform = 'translateX(-22px)';
  }

  if (save) {
    localStorage.setItem('motionEnabled', enabled);
  }
}

if (motionToggle) {
  motionToggle.addEventListener('change', () => {
    updateMotionState(motionToggle.checked);
  });

  // Initial Load from Cache
  const savedMotion = localStorage.getItem('motionEnabled');
  if (savedMotion !== null) {
    updateMotionState(savedMotion === 'true', false);
  }
}
// --- End Background Motion Logic ---

// Show Public VIP members list
function showPublicVipMembersModal() {
  const modal = document.createElement('div');
  modal.id = 'publicVipMembersModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #f6d365, #fda085);
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(253, 160, 133, 0.4);
      width: 90%;
      max-width: 600px;
      max-height: 85vh;
      overflow-y: auto;
      animation: slideIn 0.5s ease-out;
      position: relative;
      color: white;
    ">
      <!-- Header -->
      <div style="
        background: rgba(255, 255, 255, 0.15);
        padding: 25px;
        border-radius: 20px 20px 0 0;
        text-align: center;
        position: relative;
        border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      ">
        <div style="font-size: 50px; margin-bottom: 10px;">👑</div>
        <h2 style="margin: 0; font-family: 'Tajawal', sans-serif; font-size: 18px; font-weight: 700; color: white;">
          شركاء النجاح (مشتركي VIP)
        </h2>

        <!-- صندوق الصوت voice8.m4a -->
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.2);
          padding: 6px 15px;
          border-radius: 10px;
          margin: 12px auto;
          border: 1px solid rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        " onclick="
          var vipVoice = document.getElementById('vipThanksVoice');
          if (vipVoice.paused) {
            vipVoice.play();
          } else {
            vipVoice.pause();
            vipVoice.currentTime = 0;
          }
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          <audio id="vipThanksVoice" src="instructions/voice8.m4a"></audio>
          <span style="font-size: 14px; font-weight: 600; color: white;">تفاصيل الاشتراك (صوت)</span>
        </div>
        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; font-weight: 600;">
          شكراً لدعمكم المستمر للمنصة! ❤️
        </p>
        <button onclick="closePublicVipMembersModal()" style="
          position: absolute;
          top: 20px;
          left: 25px;
          background: rgba(255, 255, 255, 0.25);
          border: none;
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-weight: bold;
        ">×</button>
      </div>

      <!-- Content -->
      <div style="padding: 30px;">
        <div id="publicVipList" style="
          max-height: 400px;
          overflow-y: auto;
          margin-top: 10px;
          display: grid;
          gap: 10px;
        "></div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closePublicVipMembersModal();
    }
  });

  // Load public VIP users list
  loadPublicVipMembers();
}

function closePublicVipMembersModal() {
  const modal = document.getElementById('publicVipMembersModal');
  if (modal) {
    modal.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

async function loadPublicVipMembers() {
  const usersList = document.getElementById('publicVipList');
  if (!usersList) return;

  usersList.innerHTML = '<div style="text-align: center; color: white; padding: 20px; font-weight: 600;">🔄 جاري تحميل قائمة الداعمين...</div>';

  try {
    const { collection, getDocs, db } = await import('./firebase-config.js');

    const usersQuery = collection(db, 'users');
    const querySnapshot = await getDocs(usersQuery);

    const vipUsers = [];

    querySnapshot.forEach((doc) => {
      try {
        const userData = doc.data();

        // Hide "محمود عادل جوهر" or ADMIN email by default unless expressly allowed
        const isOwner = userData.email === 'mahmod.adil2001@gmail.com' ||
          userData["الايميل"] === 'mahmod.adil2001@gmail.com' ||
          userData.name === 'محمود عادل جوهر' ||
          userData["الاسم الكامل"] === 'محمود عادل جوهر' ||
          userData.fullName === 'محمود عادل جوهر';

        if (userData.vipStatus === true && userData.hideFromPublicVip !== true && !isOwner) {
          vipUsers.push({
            name: userData["الاسم الكامل"] || userData.fullName || userData.name || 'داعم مجهول',
            group: userData["الجروب"] || userData.group || '',
            extraThanksPoints: parseInt(userData.extraThanksPoints || 0)
          });
        }
      } catch (docError) {
        console.error('Error processing document:', doc.id, docError);
      }
    });

    if (vipUsers.length === 0) {
      usersList.innerHTML = '<div style="text-align: center; color: white; padding: 20px; font-weight: 600;">📭 لا يوجد داعمين حالياً. كن أنت الأول!</div>';
      return;
    }

    // Sort users by max thanks points first
    vipUsers.sort((a, b) => b.extraThanksPoints - a.extraThanksPoints);

    let html = '';
    vipUsers.forEach(user => {
      let starsHtml = '';
      if (user.extraThanksPoints > 0) {
        starsHtml = `<div style="background: rgba(0,0,0,0.4); padding: 4px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; margin-top: 5px; color: #ffd700; border: 1px solid rgba(255,215,0,0.5);">
          💎 داعم خاص: ${user.extraThanksPoints.toLocaleString()} extra IQD
        </div>`;
      }

      html += `
        <div style="
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 15px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 15px;
        ">
          <div style="font-size: 32px;">👑</div>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 18px; color: white; margin-bottom: 3px;">
              ${user.name}
            </div>
            ${user.group ? `<div style="font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 600;">👥 ${user.group}</div>` : ''}
            ${starsHtml}
          </div>
        </div>
      `;
    });

    usersList.innerHTML = html;

  } catch (error) {
    console.error('Error loading public VIP users list:', error);
    usersList.innerHTML = '<div style="text-align: center; color: white; padding: 20px; font-weight: 600;">❌ حدث خطأ أثناء تحميل البيانات</div>';
  }
}

// Admin User Settings for VIP public list
function showAdminUserSettings(uid, isHidden, currentPoints, userName) {
  if (!isAdmin()) return;

  const modal = document.createElement('div');
  modal.id = 'adminUserSettingsModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #2c3e50, #34495e);
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      width: 90%;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
      position: relative;
      color: white;
      padding: 30px;
      font-family: 'Tajawal', sans-serif;
    ">
      <h3 style="margin: 0 0 20px 0; font-size: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 15px;">
        ⚙️ إعدادات: ${userName}
      </h3>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">إخفاء من قائمة الداعمين للعامة:</label>
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" id="adminHideUserCheckbox" ${isHidden ? 'checked' : ''} style="
            width: 20px; height: 20px; cursor: pointer;
          ">
          <span style="font-size: 14px; opacity: 0.9;">نعم، أخفِ هذا المستخدم</span>
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600;">مبلغ الدعم الإضافي (extra IQD):</label>
        <input type="number" id="adminExtraPointsInput" value="${currentPoints}" min="0" step="1000" style="
          width: 100%;
          padding: 10px 15px;
          border-radius: 8px;
          border: none;
          font-family: 'Tajawal', sans-serif;
          font-size: 16px;
          box-sizing: border-box;
          text-align: center;
          color: black;
        ">
      </div>

      <div style="display: flex; gap: 10px;">
        <button onclick="updateVipUserSettings('${uid}')" style="
          flex: 1;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
          transition: background 0.3s;
        ">💾 حفظ</button>
        <button onclick="closeAdminUserSettingsModal()" style="
          flex: 1;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
          transition: background 0.3s;
        ">❌ إلغاء</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeAdminUserSettingsModal() {
  const modal = document.getElementById('adminUserSettingsModal');
  if (modal) modal.remove();
}

async function updateVipUserSettings(uid) {
  if (!isAdmin()) return;
  const isHidden = document.getElementById('adminHideUserCheckbox').checked;
  const points = parseInt(document.getElementById('adminExtraPointsInput').value) || 0;

  try {
    const { updateDoc, doc } = await import('./firebase-config.js');
    const { db } = await import('./firebase-config.js');

    await updateDoc(doc(db, 'users', uid), {
      hideFromPublicVip: isHidden,
      extraThanksPoints: points
    });

    closeAdminUserSettingsModal();

    // Show success message
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed; top:20px; right:20px; background:#28a745; color:white; padding:15px; border-radius:8px; z-index:10002;';
    div.textContent = 'تم حفظ الإعدادات بنجاح!';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);

    // Refresh the list
    const searchTerm = document.getElementById('userSearchInput')?.value || '';
    loadVipUsersList(searchTerm);
  } catch (err) {
    console.error('Error updating user settings:', err);
    alert('حدث خطأ أثناء حفظ الإعدادات.');
  }
}

// Show the public VIP members button easily after 3-4 seconds
window.addEventListener('load', () => {
  setTimeout(() => {
    const btn = document.getElementById('publicVipMembersBtn');
    if (btn) {
      btn.style.display = 'flex';
      btn.style.animation = 'fadeIn 0.5s ease-out';
    }
    
    // إظهار علامة الاستفهام للصوت voice7.m4a
    const voice7 = document.getElementById('voice7Span');
    if (voice7) {
      voice7.style.display = 'flex';
      voice7.style.animation = 'fadeIn 0.5s ease-out';
    }
  }, 3500); // 3.5 seconds
});

window.toggleVip = toggleVip;
window.showAdminUserSettings = showAdminUserSettings;
window.closeAdminUserSettingsModal = closeAdminUserSettingsModal;
window.updateVipUserSettings = updateVipUserSettings;
window.showPublicVipMembersModal = showPublicVipMembersModal;
window.closePublicVipMembersModal = closePublicVipMembersModal;
window.showVipSubscriptionModal = showVipSubscriptionModal;
window.closeVipSubscriptionModal = closeVipSubscriptionModal;
window.copyToClipboard = copyToClipboard;
window.contactDeveloper = contactDeveloper;
window.showVipUsersModal = showVipUsersModal;
window.closeVipUsersModal = closeVipUsersModal;
window.toggleUserVipStatus = toggleUserVipStatus;
window.deleteUser = deleteUser;
window.closeGuestFriendsModal = closeGuestFriendsModal;
window.goToSignInFromFriends = goToSignInFromFriends;
window.goToSignUpFromFriends = goToSignUpFromFriends;
window.closeFriendsModal = function () {
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

// Event Delegation - محسن للتوافق مع العناصر الأساسية
document.body.addEventListener('click', (e) => {
  const target = e.target;

  // فقط معالجة الأحداث المحددة وتجنب التداخل مع العناصر الأساسية
  if (target.id === 'directSignInBtn' || target.closest('#directSignInBtn')) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Login link clicked via delegation');
    if (authManager) {
      authManager.showSignInPage();
    }
    return;
  }

  if (target.id === 'loginFeaturesInfo' || target.closest('#loginFeaturesInfo')) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Login features info button clicked via delegation');
    const loginFeaturesModal = document.getElementById('loginFeaturesModal');
    if (loginFeaturesModal) {
      loginFeaturesModal.style.display = 'flex';
    }
    return;
  }

  // معالجة زر الأصدقاء فقط إذا تم النقر عليه مباشرة
  if (target.id === 'friendsBtn' || target.closest('#friendsBtn')) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Friends button clicked via enhanced delegation');

    if (!authManager || !authManager.isSignedIn()) {
      alert('يجب تسجيل الدخول أولاً للوصول لقائمة الأصدقاء');
      return;
    }

    if (typeof window.openFriendsModal === 'function') {
      window.openFriendsModal();
    }
    return;
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

  // عد الأصدقاء النشطين بدقة - إصلاح المنطق
  let reallyOnlineFriends = 0;
  let recentlyActiveFriends = 0;

  sortedFriends.forEach((friend) => {
    const status = friendsStatus[friend.uid];
    if (status) {
      // عد المتصلين حقاً فقط
      if (status.isReallyOnline === true) {
        reallyOnlineFriends++;
      }
      // عد النشطين مؤخراً (بدون المتصلين حقاً لتجنب التكرار)
      else if (status.status.includes("نشط مؤخراً")) {
        recentlyActiveFriends++;
      }
    }
  });

  console.log(`Friends count: reallyOnline=${reallyOnlineFriends}, recentlyActive=${recentlyActiveFriends}`);


  // إضافة عنوان بالأصدقاء النشطين - عرض صحيح
  let html = "";
  if (reallyOnlineFriends > 0 || recentlyActiveFriends > 0) {
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
        🔔 ${reallyOnlineFriends > 0 ? `${reallyOnlineFriends} صديق متصل الآن` : ""}
        ${reallyOnlineFriends > 0 && recentlyActiveFriends > 0 ? " • " : ""}
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
  const headerBadge = document.getElementById("headerFriendRequestsBadge");
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

  // تحديث الرقم في الشريط العلوي
  if (headerBadge) {
    if (count > 0) {
      headerBadge.textContent = count;
      headerBadge.style.display = "flex";
    } else {
      headerBadge.style.display = "none";
    }
  }
}

// تحديث عدد الأصدقاء المتصلين - إصلاح شامل مع منطق دقيق
async function updateOnlineFriendsBadge() {
  if (!authManager.isSignedIn() || !authManager.currentUser) {
    console.log('User not signed in - hiding online badge');
    const onlineBadge = document.getElementById("onlineFriendsBadge");
    if (onlineBadge) {
      onlineBadge.style.display = "none";
    }
    return;
  }

  const onlineBadge = document.getElementById("onlineFriendsBadge");
  if (!onlineBadge) {
    console.log('Online badge element not found');
    return;
  }

  try {
    // تحميل بيانات الأصدقاء إذا لم تكن محملة
    if (!friendsManager.friends || friendsManager.friends.length === 0) {
      console.log('Loading friends data...');
      await friendsManager.loadUserFriends();
    }

    if (!friendsManager.friends || friendsManager.friends.length === 0) {
      console.log('No friends found - hiding badge');
      onlineBadge.style.display = "none";
      return;
    }

    console.log(`Checking activity status for ${friendsManager.friends.length} friends`);
    const friendsStatus = await friendsManager.getFriendsActivityStatus();

    // عدد دقيق للمتصلين حقاً
    let reallyOnlineCount = 0;
    let recentlyActiveCount = 0;
    let totalChecked = 0;

    friendsManager.friends.forEach((friend) => {
      const status = friendsStatus[friend.uid];
      totalChecked++;

      if (status) {
        console.log(`Friend ${friend.name}: ${status.status}, isReallyOnline: ${status.isReallyOnline}`);

        // عد المتصلين حقاً فقط
        if (status.isReallyOnline === true) {
          reallyOnlineCount++;
        }

        // عد النشطين مؤخراً (بدون المتصلين حقاً لتجنب التكرار)
        if (status.status.includes('نشط مؤخراً') && !status.isReallyOnline) {
          recentlyActiveCount++;
        }
      } else {
        console.log(`Friend ${friend.name}: No status data`);
      }
    });

    console.log(`Online count results: reallyOnline=${reallyOnlineCount}, recentlyActive=${recentlyActiveCount}, totalChecked=${totalChecked}`);

    // إظهار العدد الصحيح
    const displayCount = reallyOnlineCount; // فقط المتصلين حقاً

    if (displayCount > 0) {
      onlineBadge.textContent = displayCount;
      onlineBadge.style.display = "flex";

      // لون أخضر للمتصلين حقاً
      onlineBadge.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
      console.log(`Showing ${displayCount} really online friends`);
    } else {
      console.log('No really online friends - hiding badge');
      onlineBadge.style.display = "none";
    }

  } catch (error) {
    console.error('Error updating online friends badge:', error);
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

// Add voice and VIP toggle event listeners
document.addEventListener('DOMContentLoaded', async () => {
  const voiceToggle = document.getElementById('voiceToggle');
  if (voiceToggle) {
    voiceToggle.addEventListener('change', toggleVoice);
  }

  const vipToggle = document.getElementById('vipToggle');
  if (vipToggle) {
    vipToggle.addEventListener('change', toggleVip);
  }

  // Load settings on page load
  await loadSettings();

  // Initialize free trial check for all users on first load
  if (!authManager || !authManager.isSignedIn()) {
    initializeFreeTrial();
  }
});

// تشغيل التهيئة أول مرة - ensure DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // تأكد من أن جميع العناصر محملة قبل تشغيل الحدث
  setTimeout(() => {
    if (subjectSelect) {
      subjectSelect.dispatchEvent(new Event("change"));
    }
  }, 200);
});

// تحميل فئات الأسئلة الترفيهية عند بداية التطبيق
loadFunCategories();

// تحديث أزرار الترتيب العشوائي عند تحميل الصفحة
setTimeout(() => {
  updateShuffleControls();
}, 1000);

// تهيئة الشريط العلوي
document.addEventListener('DOMContentLoaded', () => {
  setupTopHeader();
  updateTopHeaderDisplay();
});

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
      playSoundIfEnabled(correctSound);
    } else {
      playSoundIfEnabled(wrongSound);
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

    // العودة حسب الوضع الحالي
    if (isFunMode) {
      // في الوضع الترفيهي - العودة لواجهة الوضع الترفيهي
      funModeContainer.style.display = "block";
      controlsContainer.style.display = "none";
    } else {
      // في الوضع الأكاديمي - العودة للواجهة الرئيسية
      controlsContainer.style.display = "block";
      funModeContainer.style.display = "none";
    }

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

    // إلغاء وضع الاختبار (إظهار الشريط العلوي)
    toggleQuizMode(false);

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

// دالة لتحديث أزرار الترتيب العشوائي حسب حالة تسجيل الدخول ووضع VIP والتجربة المجانية
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

  // التحقق من أن المحاضرة الحالية هي من أول محاضرتين
  const selectedSubject = subjectSelect ? subjectSelect.value : '';
  const selectedLecture = lectureSelect ? lectureSelect.value : '';
  const isFreeLecture = isFirstTwoLectures(selectedSubject, selectedLecture);

  // Check if user has access (VIP OR free trial OR first 2 lectures with all 4 versions)
  const hasShuffleAccess = (isUserSignedIn && vipMode) || freeTrialActive || isFreeLecture;

  if (hasShuffleAccess) {
    // المستخدم لديه وصول (VIP أو تجربة مجانية أو أول محاضرتين) - تفعيل الأزرار وإخفاء التنبيهات
    shuffleToggle.disabled = false;
    shuffleAnswersToggle.disabled = false;
    shuffleToggle.style.opacity = "1";
    shuffleAnswersToggle.style.opacity = "1";
    shuffleToggle.style.cursor = "pointer";
    shuffleAnswersToggle.style.cursor = "pointer";

    if (shuffleLoginHint) shuffleLoginHint.style.display = "none";
    if (shuffleAnswersLoginHint) shuffleAnswersLoginHint.style.display = "none";

    if (isFreeLecture) {
      console.log('Shuffle controls enabled for first 2 lectures (free)');
    } else if (freeTrialActive) {
      console.log('Shuffle controls enabled for free trial user');
    } else {
      console.log('Shuffle controls enabled for signed-in user with VIP mode');
    }
  } else {
    // المستخدم ليس لديه وصول - تعطيل الأزرار وإظهار التنبيهات
    shuffleToggle.disabled = true;
    shuffleAnswersToggle.disabled = true;
    shuffleToggle.checked = false;
    shuffleAnswersToggle.checked = false;
    shuffleToggle.style.opacity = "0.5";
    shuffleAnswersToggle.style.opacity = "0.5";
    shuffleToggle.style.cursor = "not-allowed";
    shuffleAnswersToggle.style.cursor = "not-allowed";

    // Update hint messages based on the specific reason
    if (!isUserSignedIn && !freeTrialActive && !isFreeLecture) {
      if (shuffleLoginHint) shuffleLoginHint.style.display = "inline";
      if (shuffleAnswersLoginHint) shuffleAnswersLoginHint.style.display = "inline";
      console.log('Shuffle controls disabled for non-signed-in user without free trial (not first 2 lectures)');
    } else if (isUserSignedIn && !vipMode && !isFreeLecture) {
      // User is signed in but VIP is off and no free trial and not first 2 lectures
      if (shuffleLoginHint) {
        shuffleLoginHint.style.display = "inline";
        shuffleLoginHint.textContent = "(فعّل VIP لاستخدام الميزة)";
      }
      if (shuffleAnswersLoginHint) {
        shuffleAnswersLoginHint.style.display = "inline";
        shuffleAnswersLoginHint.textContent = "(فعّل VIP لاستخدام الميزة)";
      }
      console.log('Shuffle controls disabled - VIP mode is off and no free trial and not first 2 lectures');
    }
  }
}

// جعل دالة updateVersionSelector متاحة عالمياً
window.updateVersionSelector = updateVersionSelector;


// مستمع حدث تغيير التبويبات
document.querySelectorAll('.friends-tab').forEach(tab => {
  tab.addEventListener('click', function () {
    const tabName = this.id.replace('Tab', '').replace('my', 'my').replace('search', 'search').replace('friend', 'friend');
    if (tabName === 'myFriends') {
      switchTab('myFriends');
    } else if (tabName === 'searchFriends') {
      switchTab('searchFriends');
    } else if (tabName === 'friendRequests') {
      switchTab('friendRequests');
    }
  });
});

// مستمعي الأحداث لروابط الفوتر
document.addEventListener('DOMContentLoaded', function () {
  const aboutUsLink = document.getElementById('aboutUsLink');
  const contactUsLink = document.getElementById('contactUsLink');

  if (aboutUsLink) {
    aboutUsLink.addEventListener('click', function (e) {
      e.preventDefault();
      showAboutUsModal();
    });
  }

  if (contactUsLink) {
    contactUsLink.addEventListener('click', function (e) {
      e.preventDefault();
      showContactUsModal();
    });
  }
});

// دالة إظهار نافذة من نحن
function showAboutUsModal() {
  const modal = document.createElement('div');
  modal.id = 'aboutUsModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideIn 0.5s ease-out;
      position: relative;
    ">
      <div style="
        background: rgba(255, 255, 255, 0.1);
        color: white;
        padding: 20px;
        border-radius: 20px 20px 0 0;
        text-align: center;
        position: relative;
        border-bottom: 2px solid rgba(255, 255, 255, 0.2);
      ">
        <h2 style="margin: 0; font-family: 'Tajawal', sans-serif; font-size: 24px; font-weight: 700;">🩺 من نحن؟</h2>
        <button onclick="closeAboutUsModal()" style="
          position: absolute;
          top: 15px;
          left: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        ">✕</button>
      </div>
      <div style="padding: 25px; color: white; font-family: 'Tajawal', sans-serif; line-height: 1.6;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          🎓 نحن منصة تعليمية متخصصة في طب الأسنان، نهدف إلى مساعدة طلاب طب الأسنان على التفوق في دراستهم من خلال:
        </p>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 15px 0; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
            📚 مجموعة شاملة من الأسئلة التفاعلية لجميع التخصصات
          </li>
          <li style="margin: 15px 0; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
            🔄 نسخ متعددة من الاختبارات لضمان التنوع
          </li>
          <li style="margin: 15px 0; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
            👥 نظام أصدقاء للدراسة الجماعية
          </li>
          <li style="margin: 15px 0; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">
            ⚔️ تحديات تنافسية لتحفيز التعلم
          </li>
        </ul>
        <p style="font-size: 14px; margin-top: 20px; text-align: center; opacity: 0.9;">
          🌟 رؤيتنا: بناء جيل متميز من أطباء الأسنان المتفوقين
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}



// دوال إغلاق النوافذ
window.closeAboutUsModal = function () {
  const modal = document.getElementById('aboutUsModal');
  if (modal) {
    modal.remove();
  }
};





// إغلاق النوافذ عند النقر خارجها
document.addEventListener('click', function (e) {
  if (e.target.id === 'aboutUsModal') {
    closeAboutUsModal();
  }

});
