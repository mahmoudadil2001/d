import { 
  auth, 
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc
} from './firebase-config.js';

class AdminManager {
  constructor(authManager) {
    this.authManager = authManager;
    this.currentUser = authManager.currentUser || null;
    this.adminEmails = [
      'mahmoudadil2001@gmail.com', // Add your admin emails here
      // Add more admin emails as needed
    ];

    // GitHub integration
    this.githubToken = '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';
    this.githubRepo = 'mahmoudadil2001/d';
    this.githubBranch = 'main';
    this.githubApiBase = 'https://api.github.com';

    // Set up auth callback to update current user
    const originalCallback = this.authManager.authChangeCallback;
    this.authManager.setAuthChangeCallback((user) => {
      this.currentUser = user;
      if (originalCallback) originalCallback(user);
    });
  }

  // Check if current user is admin
  isAdmin() {
    if (!this.currentUser || !this.currentUser.email) return false;
    return this.adminEmails.includes(this.currentUser.email.toLowerCase());
  }

  // Show admin modal
  showAdminModal() {
    if (!this.isAdmin()) {
      this.showError('ليس لديك صلاحيات إدارية');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'adminModal';
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
        backdrop-filter: blur(10px);
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.18);
        width: 90%;
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideIn 0.5s ease-out;
      ">
        <style>
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
        <!-- Header -->
        <div style="
          background: linear-gradient(135deg, #dc3545, #c82333);
          color: white;
          padding: 20px;
          border-radius: 20px 20px 0 0;
          text-align: center;
          position: relative;
        ">
          <h2 style="margin: 0; font-family: 'Tajawal', sans-serif; font-size: 24px; font-weight: 700;">⚙️ لوحة الإدارة</h2>
          <button id="closeAdminModal" style="
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

        <!-- Admin Action Buttons -->
        <div id="adminActionButtons" style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          padding: 20px;
          background: #f8f9fa;
        ">
          <button id="addNewLectureBtn" class="admin-action-btn" style="
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 12px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
          ">📝 إضافة محاضرة جديدة</button>

          <button id="editLectureNamesBtn" class="admin-action-btn" style="
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 12px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
          ">✏️ تعديل أسماء المحاضرات</button>



          <button id="deleteContentBtn" class="admin-action-btn" style="
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 12px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
          ">🗑️ حذف المحاضرات والنسخ</button>

          <button id="githubSyncBtn" class="admin-action-btn" style="
            background: linear-gradient(135deg, #6f42c1, #5a32a3);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 12px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(111, 66, 193, 0.3);
          ">🔄 مزامنة GitHub</button>
        </div>

        <!-- Content Area -->
        <div id="adminContentArea" style="padding: 20px; min-height: 400px;">
          <!-- زر الرجوع -->
          <button id="backToMenuBtn" style="
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
            display: none;
          ">← العودة للقائمة الرئيسية</button>

          <div id="defaultMessage" style="
            text-align: center;
            color: #6c757d;
            padding: 50px 20px;
            font-size: 18px;
          ">
            🛠️ اختر أحد الخيارات أعلاه للبدء
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupAdminEventListeners();
  }

  // Setup event listeners for admin modal
  setupAdminEventListeners() {
    // Close modal
    document.getElementById('closeAdminModal').addEventListener('click', () => {
      this.closeAdminModal();
    });

    // Back to menu button
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
      this.showMainMenu();
    });

    // Add hover effects for action buttons
    document.querySelectorAll('.admin-action-btn').forEach(btn => {
      btn.addEventListener('mouseenter', (e) => {
        e.target.style.transform = 'translateY(-2px)';
      });
      btn.addEventListener('mouseleave', (e) => {
        e.target.style.transform = 'translateY(0)';
      });
    });

    // Action button event listeners
    document.getElementById('addNewLectureBtn').addEventListener('click', () => {
      this.hideButtons();
      this.showAddNewLectureContent();
    });

    document.getElementById('editLectureNamesBtn').addEventListener('click', () => {
      this.hideButtons();
      this.showEditLectureNamesContent();
    });



    document.getElementById('deleteContentBtn').addEventListener('click', () => {
      this.hideButtons();
      this.showDeleteContentContent();
    });

    document.getElementById('githubSyncBtn').addEventListener('click', () => {
      this.hideButtons();
      this.showGithubSyncContent();
    });
  }

  // Hide action buttons and show back button
  hideButtons() {
    const buttonsContainer = document.getElementById('adminActionButtons');
    const backBtn = document.getElementById('backToMenuBtn');
    const defaultMessage = document.getElementById('defaultMessage');

    if (buttonsContainer) {
      buttonsContainer.style.display = 'none';
    }
    if (backBtn) {
      backBtn.style.display = 'block';
    }
    if (defaultMessage) {
      defaultMessage.style.display = 'none';
    }
  }

  // Show main menu (buttons) and hide back button
  showMainMenu() {
    const buttonsContainer = document.getElementById('adminActionButtons');
    const backBtn = document.getElementById('backToMenuBtn');
    const defaultMessage = document.getElementById('defaultMessage');
    const contentArea = document.getElementById('adminContentArea');

    if (buttonsContainer) {
      buttonsContainer.style.display = 'grid';
    }
    if (backBtn) {
      backBtn.style.display = 'none';
    }
    if (defaultMessage) {
      defaultMessage.style.display = 'block';
    }

    // Clear content area except for back button and default message
    if (contentArea) {
      contentArea.innerHTML = `
        <button id="backToMenuBtn" style="
          background: linear-gradient(135deg, #6c757d, #495057);
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 15px;
          transition: all 0.3s ease;
          display: none;
        ">← العودة للقائمة الرئيسية</button>

        <div id="defaultMessage" style="
          text-align: center;
          color: #6c757d;
          padding: 50px 20px;
          font-size: 18px;
        ">
          🛠️ اختر أحد الخيارات أعلاه للبدء
        </div>
      `;

      // Re-attach back button event listener
      document.getElementById('backToMenuBtn').addEventListener('click', () => {
        this.showMainMenu();
      });
    }
  }

  // Show Add New Lecture Content
  showAddNewLectureContent() {
    const contentArea = document.getElementById('adminContentArea');
    contentArea.innerHTML = `
      <button id="backToMenuBtn" style="
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Tajawal', sans-serif;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 15px;
        transition: all 0.3s ease;
        display: block;
      ">← العودة للقائمة الرئيسية</button>

      <div style="animation: fadeIn 0.3s ease-out;">
        <h3 style="color: #28a745; margin-bottom: 20px; font-size: 24px;">📝 إضافة محاضرة أو نسخة جديدة</h3>

        <!-- Step 1: Subject Selection -->
        <div id="subjectSelectionStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px;">
          <h4 style="margin-bottom: 15px; color: #495057;">الخطوة 1: اختيار المادة</h4>
          <select id="newContentSubject" style="
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            width: 100%;
            margin-bottom: 15px;
          ">
            <option value="">اختر المادة</option>
            <option value="endodontics">Endodontics</option>
            <option value="generalsurgery">General Surgery</option>
            <option value="operative">Operative</option>
            <option value="oralpathology">Oral Pathology</option>
            <option value="oralsurgery">Oral Surgery</option>
            <option value="pedodontics">Pedodontics</option>
            <option value="periodontology">Periodontology</option>
          </select>
        </div>

        <!-- Step 2: Operation Selection -->
        <div id="operationSelectionStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; display: none;">
          <h4 style="margin-bottom: 15px; color: #495057;">الخطوة 2: اختيار العملية</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <button id="newLectureBtn" style="
              background: linear-gradient(135deg, #007bff, #0056b3);
              color: white;
              border: none;
              padding: 20px;
              border-radius: 12px;
              cursor: pointer;
              font-family: 'Tajawal', sans-serif;
              font-weight: 600;
              font-size: 16px;
              transition: all 0.3s ease;
            ">📚 محاضرة جديدة</button>
            <button id="newVersionBtn" style="
              background: linear-gradient(135deg, #17a2b8, #138496);
              color: white;
              border: none;
              padding: 20px;
              border-radius: 12px;
              cursor: pointer;
              font-family: 'Tajawal', sans-serif;
              font-weight: 600;
              font-size: 16px;
              transition: all 0.3s ease;
            ">📋 نسخة جديدة</button>
          </div>
        </div>

        <!-- Step 3: Content Forms -->
        <div id="contentFormsStep" style="display: none;">
          <!-- New Lecture Form -->
          <div id="newLectureForm" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; display: none;">
            <h4 style="margin-bottom: 15px; color: #007bff;">📚 إضافة محاضرة جديدة</h4>

            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600;">رقم المحاضرة:</label>
              <input type="number" id="lectureNumber" placeholder="رقم المحاضرة" style="
                width: 100%;
                padding: 12px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-family: 'Tajawal', sans-serif;
                font-size: 16px;
                box-sizing: border-box;
              ">
            </div>

            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600;">رقم النسخة:</label>
              <input type="number" id="lectureVersion" placeholder="رقم النسخة (افتراضي: 1)" value="1" style="
                width: 100%;
                padding: 12px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-family: 'Tajawal', sans-serif;
                font-size: 16px;
                box-sizing: border-box;
              ">
            </div>

            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600;">عنوان المحاضرة:</label>
              <input type="text" id="lectureTitle" placeholder="عنوان المحاضرة" style="
                width: 100%;
                padding: 12px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-family: 'Tajawal', sans-serif;
                font-size: 16px;
                box-sizing: border-box;
              ">
            </div>

            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600;">محتوى المحاضرة (JavaScript):</label>
              <textarea id="lectureContent" style="
                width: 100%;
                height: 300px;
                padding: 12px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
              " placeholder="export const questions = [
  {
    question: &quot;السؤال الأول&quot;,
    options: [
      &quot;الخيار الأول&quot;,
      &quot;الخيار الثاني&quot;,
      &quot;الخيار الثالث&quot;,
      &quot;الخيار الرابع&quot;
    ],
    answer: 0
  }
  // أضف المزيد من الأسئلة...
];"></textarea>
            </div>

            <button id="saveLectureBtn" style="
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
              border: none;
              padding: 15px 25px;
              border-radius: 8px;
              cursor: pointer;
              font-family: 'Tajawal', sans-serif;
              font-weight: 600;
              font-size: 16px;
              width: 100%;
              transition: all 0.3s ease;
            ">💾 حفظ المحاضرة</button>
          </div>

          <!-- New Version Form -->
          <div id="newVersionForm" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; display: none;">
            <h4 style="margin-bottom: 15px; color: #17a2b8;">📋 إضافة نسخة جديدة</h4>
            <div id="existingLecturesForVersion" style="margin-bottom: 15px;"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <select id="existingLectureSelect" style="
                padding: 12px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-family: 'Tajawal', sans-serif;
                font-size: 16px;
              ">
                <option value="">اختر المحاضرة الموجودة</option>
              </select>
              <input type="number" id="versionNumber" placeholder="رقم النسخة الجديدة" style="
                padding: 12px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-family: 'Tajawal', sans-serif;
                font-size: 16px;
              ">
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 600;">محتوى الأسئلة (JavaScript):</label>
              <textarea id="versionContent" style="
                width: 100%;
                height: 300px;
                padding: 12px;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
              " placeholder="export const questions = [
  {
    question: &quot;السؤال الأول&quot;,
    options: [
      &quot;الخيار الأول&quot;,
      &quot;الخيار الثاني&quot;,
      &quot;الخيار الثالث&quot;,
      &quot;الخيار الرابع&quot;
    ],
    answer: 0
  }
  // أضف المزيد من الأسئلة...
];"></textarea>
            </div>
            <button id="saveVersionBtn" style="
              background: linear-gradient(135deg, #17a2b8, #138496);
              color: white;
              border: none;
              padding: 15px 25px;
              border-radius: 8px;
              cursor: pointer;
              font-family: 'Tajawal', sans-serif;
              font-weight: 600;
              font-size: 16px;
              width: 100%;
              transition: all 0.3s ease;
            ">💾 حفظ النسخة</button>
          </div>
        </div>
      </div>
    `;

    this.setupNewContentEventListeners();
  }

  // Setup event listeners for the new content workflow
  setupNewContentEventListeners() {
    // Back button
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
      this.showMainMenu();
    });

    // Subject selection
    document.getElementById('newContentSubject').addEventListener('change', (e) => {
      const operationStep = document.getElementById('operationSelectionStep');
      if (e.target.value) {
        operationStep.style.display = 'block';
        this.selectedSubject = e.target.value;
      } else {
        operationStep.style.display = 'none';
        document.getElementById('contentFormsStep').style.display = 'none';
      }
    });

    // Operation selection buttons
    document.getElementById('newLectureBtn').addEventListener('click', () => {
      this.showNewLectureForm();
    });

    document.getElementById('newVersionBtn').addEventListener('click', () => {
      this.showNewVersionForm();
    });

    // Save buttons
    document.getElementById('saveLectureBtn')?.addEventListener('click', () => {
      this.saveNewLecture();
    });

    document.getElementById('saveVersionBtn')?.addEventListener('click', () => {
      this.saveNewVersion();
    });
  }

  // Show new lecture form
  showNewLectureForm() {
    const contentFormsStep = document.getElementById('contentFormsStep');
    const newLectureForm = document.getElementById('newLectureForm');
    const newVersionForm = document.getElementById('newVersionForm');

    contentFormsStep.style.display = 'block';
    newLectureForm.style.display = 'block';
    newVersionForm.style.display = 'none';

    // Pre-fill with template content
    const lectureContent = document.getElementById('lectureContent');
    lectureContent.value = this.generateLectureTemplate();
  }

  // Show new version form
  async showNewVersionForm() {
    const contentFormsStep = document.getElementById('contentFormsStep');
    const newLectureForm = document.getElementById('newLectureForm');
    const newVersionForm = document.getElementById('newVersionForm');

    contentFormsStep.style.display = 'block';
    newLectureForm.style.display = 'none';
    newVersionForm.style.display = 'block';

    // Load existing lectures for the selected subject
    await this.loadExistingLecturesForVersion();

    // Pre-fill with template content
    const versionContent = document.getElementById('versionContent');
    versionContent.value = this.generateVersionTemplate();
  }

  // Load existing lectures for version creation
  async loadExistingLecturesForVersion() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());
      const { lectureNames } = await import('./lectureNames.js?' + Date.now());

      const existingLectureSelect = document.getElementById('existingLectureSelect');
      existingLectureSelect.innerHTML = '<option value="">اختر المحاضرة الموجودة</option>';

      const lectures = visibleLectures[this.selectedSubject] || {};
      Object.keys(lectures).forEach(lectureNum => {
        const option = document.createElement('option');
        option.value = lectureNum;
        const name = lectureNames[this.selectedSubject]?.[lectureNum] || 'غير محدد';
        option.textContent = `المحاضرة ${lectureNum} - ${name}`;
        existingLectureSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading existing lectures:', error);
    }
  }

  // Generate lecture template
  generateLectureTemplate() {
    return `export const questions = [
  {
    question: "السؤال الأول",
    options: [
      "الخيار الأول",
      "الخيار الثاني",
      "الخيار الثالث",
      "الخيار الرابع"
    ],
    answer: 0
  },
  {
    question: "السؤال الثاني",
    options: [
      "الخيار الأول",
      "الخيار الثاني",
      "الخيار الثالث",
      "الخيار الرابع"
    ],
    answer: 1
  }
  // أضف المزيد من الأسئلة هنا
];`;
  }

  // Generate version template
  generateVersionTemplate() {
    return `export const questions = [
  {
    question: "سؤال النسخة الجديدة",
    options: [
      "الخيار الأول",
      "الخيار الثاني",
      "الخيار الثالث",
      "الخيار الرابع"
    ],
    answer: 0
  }
  // أضف المزيد من الأسئلة هنا
];`;
  }

  // Save new lecture
  async saveNewLecture() {
    const lectureNumber = document.getElementById('lectureNumber').value;
    const lectureVersion = document.getElementById('lectureVersion').value || '1';
    const lectureTitle = document.getElementById('lectureTitle').value;
    const lectureContent = document.getElementById('lectureContent').value;

    if (!this.selectedSubject || !lectureNumber || !lectureTitle || !lectureContent.trim()) {
      this.showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      // Add to show.js (visibleLectures) with specified version
      await this.updateShowFileForNewLectureWithVersion(this.selectedSubject, lectureNumber, lectureVersion);

      // Add to lectureNames.js
      await this.updateLectureNamesFile(this.selectedSubject, lectureNumber, lectureTitle);

      // Create lecture file with custom content and specified version
      await this.createLectureFileWithContentAndVersion(this.selectedSubject, lectureNumber, lectureVersion, lectureContent);

      this.showSuccess('تم إضافة المحاضرة بنجاح');

      // Clear form
      document.getElementById('lectureNumber').value = '';
      document.getElementById('lectureVersion').value = '1';
      document.getElementById('lectureTitle').value = '';
      document.getElementById('lectureContent').value = '';
    } catch (error) {
      console.error('Error saving new lecture:', error);
      this.showError('فشل في حفظ المحاضرة');
    }
  }

  // Save new version
  async saveNewVersion() {
    const existingLecture = document.getElementById('existingLectureSelect').value;
    const versionNumber = document.getElementById('versionNumber').value;
    const versionContent = document.getElementById('versionContent').value;

    if (!this.selectedSubject || !existingLecture || !versionNumber || !versionContent.trim()) {
      this.showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      // Add version to show.js
      await this.addVersionToShowFile(this.selectedSubject, existingLecture, versionNumber);

      // Create version file with custom content
      await this.createVersionFileWithContent(this.selectedSubject, existingLecture, versionNumber, versionContent);

      this.showSuccess('تم إضافة النسخة بنجاح');

      // Clear form
      document.getElementById('versionNumber').value = '';
      document.getElementById('versionContent').value = '';
      document.getElementById('existingLectureSelect').value = '';
    } catch (error) {
      console.error('Error saving new version:', error);
      this.showError('فشل في حفظ النسخة');
    }
  }

  // Update show.js for new lecture
  async updateShowFileForNewLecture(subject, lectureNum) {
    try {
      const showModule = await import('./show.js?' + Date.now());
      const currentVisibleLectures = { ...showModule.visibleLectures };

      if (!currentVisibleLectures[subject]) {
        currentVisibleLectures[subject] = {};
      }
      if (!currentVisibleLectures[subject][lectureNum]) {
        currentVisibleLectures[subject][lectureNum] = [1]; // Start with version 1
      }

      const showContent = `export const visibleLectures = ${JSON.stringify(currentVisibleLectures, null, 2)};`;
      await this.saveFileContent('show.js', showContent);

    } catch (error) {
      console.error('Error updating show.js:', error);
      throw error;
    }
  }

  // Update show.js for new lecture with specified version
  async updateShowFileForNewLectureWithVersion(subject, lectureNum, versionNum) {
    try {
      const showModule = await import('./show.js?' + Date.now());
      const currentVisibleLectures = { ...showModule.visibleLectures };

      if (!currentVisibleLectures[subject]) {
        currentVisibleLectures[subject] = {};
      }
      if (!currentVisibleLectures[subject][lectureNum]) {
        currentVisibleLectures[subject][lectureNum] = [parseInt(versionNum)];
      } else {
        // Add version if it doesn't exist
        if (!currentVisibleLectures[subject][lectureNum].includes(parseInt(versionNum))) {
          currentVisibleLectures[subject][lectureNum].push(parseInt(versionNum));
          currentVisibleLectures[subject][lectureNum].sort((a, b) => a - b);
        }
      }

      const showContent = `export const visibleLectures = ${JSON.stringify(currentVisibleLectures, null, 2)};`;
      await this.saveFileContent('show.js', showContent);

    } catch (error) {
      console.error('Error updating show.js:', error);
      throw error;
    }
  }

  // Create lecture file with custom content
  async createLectureFileWithContent(subject, lectureNum, content) {
    const fileName = `${subject}/${subject}${lectureNum}/${subject}${lectureNum}_v1.js`;
    await this.saveFileContent(fileName, content);
  }

  // Create lecture file with custom content and specified version
  async createLectureFileWithContentAndVersion(subject, lectureNum, versionNum, content) {
    const fileName = `${subject}/${subject}${lectureNum}/${subject}${lectureNum}_v${versionNum}.js`;
    await this.saveFileContent(fileName, content);
  }

  // Create version file with custom content
  async createVersionFileWithContent(subject, lectureNum, versionNum, content) {
    const fileName = `${subject}/${subject}${lectureNum}/${subject}${lectureNum}_v${versionNum}.js`;
    await this.saveFileContent(fileName, content);
  }

  // Show Edit Lecture Names Content
  showEditLectureNamesContent() {
    const contentArea = document.getElementById('adminContentArea');
    contentArea.innerHTML = `
      <button id="backToMenuBtn" style="
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Tajawal', sans-serif;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 15px;
        transition: all 0.3s ease;
        display: block;
      ">← العودة للقائمة الرئيسية</button>

      <div style="animation: fadeIn 0.3s ease-out;">
        <h3 style="color: #007bff; margin-bottom: 20px; font-size: 24px;">✏️ تعديل أسماء المحاضرات</h3>

        <!-- Step 1: Subject Selection -->
        <div id="editSubjectStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px;">
          <h4 style="margin-bottom: 15px; color: #495057;">الخطوة 1: اختيار المادة</h4>
          <select id="editSubject" style="
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            width: 100%;
            margin-bottom: 15px;
          ">
            <option value="">اختر المادة</option>
          </select>
        </div>

        <!-- Step 2: Lecture Selection -->
        <div id="editLectureStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; display: none;">
          <h4 style="margin-bottom: 15px; color: #495057;">الخطوة 2: اختيار المحاضرة</h4>
          <select id="editLecture" style="
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            width: 100%;
            margin-bottom: 15px;
          ">
            <option value="">اختر المحاضرة</option>
          </select>
        </div>

        <!-- Step 3: Version Selection -->
        <div id="editVersionStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; display: none;">
          <h4 style="margin-bottom: 15px; color: #495057;">الخطوة 3: اختيار النسخة</h4>
          <select id="editVersion" style="
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            width: 100%;
            margin-bottom: 15px;
          ">
            <option value="">اختر النسخة</option>
          </select>
        </div>

        <!-- Step 4: Edit Form -->
        <div id="editFormStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; display: none;">
          <h4 style="margin-bottom: 15px; color: #007bff;">الخطوة 4: تعديل المحاضرة</h4>

          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">عنوان المحاضرة:</label>
            <input type="text" id="editLectureTitle" style="
              width: 100%;
              padding: 12px;
              border: 2px solid #e9ecef;
              border-radius: 8px;
              font-family: 'Tajawal', sans-serif;
              font-size: 16px;
              box-sizing: border-box;
            ">
          </div>

          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">محتوى المحاضرة (JavaScript):</label>
            <textarea id="editLectureContent" style="
              width: 100%;
              height: 400px;
              padding: 12px;
              border: 2px solid #e9ecef;
              border-radius: 8px;
              font-family: 'Consolas', 'Monaco', monospace;
              font-size: 14px;
              resize: vertical;
              box-sizing: border-box;
            " placeholder="تحميل محتوى المحاضرة..."></textarea>
          </div>

          <button id="saveEditedLectureBtn" style="
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 16px;
            width: 100%;
            transition: all 0.3s ease;
          ">💾 حفظ التعديلات</button>
        </div>
      </div>
    `;

    this.setupEditLectureEventListeners();
  }



  // Show Delete Content
  showDeleteContentContent() {
    const contentArea = document.getElementById('adminContentArea');
    contentArea.innerHTML = `
      <button id="backToMenuBtn" style="
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Tajawal', sans-serif;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 15px;
        transition: all 0.3s ease;
        display: block;
      ">← العودة للقائمة الرئيسية</button>

      <div style="animation: fadeIn 0.3s ease-out;">
        <h3 style="color: #dc3545; margin-bottom: 20px; font-size: 24px;">🗑️ حذف المحاضرات والنسخ</h3>

        <!-- Step 1: Subject Selection -->
        <div id="deleteSubjectStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px;">
          <h4 style="margin-bottom: 15px; color: #495057;">الخطوة 1: اختيار المادة</h4>
          <select id="deleteSubject" style="
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            width: 100%;
            margin-bottom: 15px;
          ">
            <option value="">اختر المادة</option>
          </select>
        </div>

        <!-- Step 2: Lecture Selection -->
        <div id="deleteLectureStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; display: none;">
          <h4 style="margin-bottom: 15px; color: #495057;">الخطوة 2: اختيار المحاضرة</h4>
          <select id="deleteLecture" style="
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            width: 100%;
            margin-bottom: 15px;
          ">
            <option value="">اختر المحاضرة</option>
          </select>
        </div>

        <!-- Step 3: Version Selection and Delete -->
        <div id="deleteVersionStep" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; display: none;">
          <h4 style="margin-bottom: 15px; color: #495057;">الخطوة 3: اختيار النسخة</h4>
          <select id="deleteVersion" style="
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-family: 'Tajawal', sans-serif;
            font-size: 16px;
            width: 100%;
            margin-bottom: 20px;
          ">
            <option value="">اختر النسخة</option>
          </select>

          <button id="deleteBtn" style="
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 16px;
            width: 100%;
            transition: all 0.3s ease;
          ">🗑️ حذف النسخة المحددة</button>
        </div>
      </div>
    `;

    this.setupDeleteEventListeners();
  }

  // Show GitHub Sync Content
  showGithubSyncContent() {
    const contentArea = document.getElementById('adminContentArea');
    contentArea.innerHTML = `
      <button id="backToMenuBtn" style="
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Tajawal', sans-serif;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 15px;
        transition: all 0.3s ease;
        display: block;
      ">← العودة للقائمة الرئيسية</button>

      <div style="animation: fadeIn 0.3s ease-out;">
        <h3 style="color: #6f42c1; margin-bottom: 20px; font-size: 24px;">🔄 مزامنة مع GitHub</h3>
        <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #6f42c1;">معلومات المستودع</h4>
            <p style="margin: 5px 0; color: #6c757d;">
              <strong>Repository:</strong> ${this.githubRepo}<br>
              <strong>Branch:</strong> ${this.githubBranch}
            </p>
          </div>

          <button id="syncToGithubBtn" style="
            background: linear-gradient(135deg, #6f42c1, #5a32a3);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 16px;
            width: 100%;
            margin-bottom: 15px;
            transition: all 0.3s ease;
          ">⬆️ رفع التغييرات إلى GitHub</button>

          <button id="pullFromGithubBtn" style="
            background: linear-gradient(135deg, #fd7e14, #e36209);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-weight: 600;
            font-size: 16px;
            width: 100%;
            transition: all 0.3s ease;
          ">⬇️ سحب التحديثات من GitHub</button>

          <div id="githubStatus" style="margin-top: 20px;"></div>
        </div>
      </div>
    `;

    // Add event listeners
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
      this.showMainMenu();
    });

    document.getElementById('syncToGithubBtn').addEventListener('click', () => {
      this.syncToGithub();
    });

    document.getElementById('pullFromGithubBtn').addEventListener('click', () => {
      this.pullFromGithub();
    });
  }

  // Setup event listeners for edit lecture workflow
  setupEditLectureEventListeners() {
    // Back button
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
      this.showMainMenu();
    });

    // Subject selection
    document.getElementById('editSubject').addEventListener('change', (e) => {
      const lectureStep = document.getElementById('editLectureStep');
      const versionStep = document.getElementById('editVersionStep');
      const formStep = document.getElementById('editFormStep');

      if (e.target.value) {
        lectureStep.style.display = 'block';
        versionStep.style.display = 'none';
        formStep.style.display = 'none';
        this.selectedEditSubject = e.target.value;
        this.loadEditLectures();
      } else {
        lectureStep.style.display = 'none';
        versionStep.style.display = 'none';
        formStep.style.display = 'none';
      }
    });

    // Lecture selection
    document.getElementById('editLecture').addEventListener('change', (e) => {
      const versionStep = document.getElementById('editVersionStep');
      const formStep = document.getElementById('editFormStep');

      if (e.target.value) {
        versionStep.style.display = 'block';
        formStep.style.display = 'none';
        this.selectedEditLecture = e.target.value;
        this.loadEditVersions();
      } else {
        versionStep.style.display = 'none';
        formStep.style.display = 'none';
      }
    });

    // Version selection
    document.getElementById('editVersion').addEventListener('change', (e) => {
      const formStep = document.getElementById('editFormStep');

      if (e.target.value) {
        formStep.style.display = 'block';
        this.selectedEditVersion = e.target.value;
        this.loadEditForm();
      } else {
        formStep.style.display = 'none';
      }
    });

    // Save button
    document.getElementById('saveEditedLectureBtn')?.addEventListener('click', () => {
      this.saveEditedLecture();
    });

    // Load subjects
    this.loadEditSubjects();
  }

  // Load subjects for editing
  async loadEditSubjects() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());
      const editSubject = document.getElementById('editSubject');

      editSubject.innerHTML = '<option value="">اختر المادة</option>';

      Object.keys(visibleLectures).forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        editSubject.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading subjects for editing:', error);
    }
  }

  // Load lectures for editing
  async loadEditLectures() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());
      const { lectureNames } = await import('./lectureNames.js?' + Date.now());
      const editLecture = document.getElementById('editLecture');

      editLecture.innerHTML = '<option value="">اختر المحاضرة</option>';

      const lectures = visibleLectures[this.selectedEditSubject] || {};
      Object.keys(lectures).forEach(lectureNum => {
        const option = document.createElement('option');
        option.value = lectureNum;
        const name = lectureNames[this.selectedEditSubject]?.[lectureNum] || 'غير محدد';
        option.textContent = `المحاضرة ${lectureNum} - ${name}`;
        editLecture.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading lectures for editing:', error);
    }
  }

  // Load versions for editing
  async loadEditVersions() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());
      const editVersion = document.getElementById('editVersion');

      editVersion.innerHTML = '<option value="">اختر النسخة</option>';

      const versions = visibleLectures[this.selectedEditSubject]?.[this.selectedEditLecture] || [];
      versions.forEach(versionNum => {
        const option = document.createElement('option');
        option.value = versionNum;
        option.textContent = `النسخة ${versionNum}`;
        editVersion.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading versions for editing:', error);
    }
  }

  // Load edit form with current data
  async loadEditForm() {
    try {
      const { lectureNames } = await import('./lectureNames.js?' + Date.now());
      const editTitleInput = document.getElementById('editLectureTitle');
      const editContentTextarea = document.getElementById('editLectureContent');

      // Load lecture title
      const currentTitle = lectureNames[this.selectedEditSubject]?.[this.selectedEditLecture] || '';
      editTitleInput.value = currentTitle;

      // Load lecture content
      const fileName = `${this.selectedEditSubject}/${this.selectedEditSubject}${this.selectedEditLecture}/${this.selectedEditSubject}${this.selectedEditLecture}_v${this.selectedEditVersion}.js`;

      try {
        const response = await fetch(fileName);
        if (response.ok) {
          const content = await response.text();
          editContentTextarea.value = content;
        } else {
          editContentTextarea.value = this.generateVersionFileContent(this.selectedEditSubject, this.selectedEditLecture, this.selectedEditVersion);
        }
      } catch (error) {
        console.error('Error loading lecture content:', error);
        editContentTextarea.value = this.generateVersionFileContent(this.selectedEditSubject, this.selectedEditLecture, this.selectedEditVersion);
      }
    } catch (error) {
      console.error('Error loading edit form:', error);
    }
  }

  // Save edited lecture
  async saveEditedLecture() {
    const title = document.getElementById('editLectureTitle').value.trim();
    const content = document.getElementById('editLectureContent').value.trim();

    if (!title || !content) {
      this.showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      // Update lecture title in lectureNames.js
      await this.updateLectureNamesFile(this.selectedEditSubject, this.selectedEditLecture, title);

      // Update lecture content file
      const fileName = `${this.selectedEditSubject}/${this.selectedEditSubject}${this.selectedEditLecture}/${this.selectedEditSubject}${this.selectedEditLecture}_v${this.selectedEditVersion}.js`;
      await this.saveFileContent(fileName, content);

      this.showSuccess('تم حفظ التعديلات بنجاح');
    } catch (error) {
      console.error('Error saving edited lecture:', error);
      this.showError('فشل في حفظ التعديلات');
    }
  }

  // Load existing lectures for editing (legacy method, kept for compatibility)
  async loadExistingLectures() {
    // This method is no longer used but kept for compatibility
    return;
  }

  // Load version management
  async loadVersionManagement() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());

      const subjectSelect = document.getElementById('versionSubject');
      const deleteSubjectSelect = document.getElementById('deleteSubject');

      // Populate both version and delete dropdowns
      [subjectSelect, deleteSubjectSelect].forEach(select => {
        if (select) {
          select.innerHTML = '<option value="">اختر المادة</option>';

          Object.keys(visibleLectures).forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            select.appendChild(option);
          });
        }
      });
    } catch (error) {
      console.error('Error loading version management:', error);
    }
  }

  // Update version lectures dropdown
  async updateVersionLectures() {
    const subjectSelect = document.getElementById('versionSubject');
    const lectureSelect = document.getElementById('versionLecture');
    const versionsList = document.getElementById('versionsList');

    if (!subjectSelect.value) {
      lectureSelect.innerHTML = '<option value="">اختر المحاضرة</option>';
      versionsList.innerHTML = '';
      return;
    }

    try {
      const { visibleLectures } = await import('./show.js');
      const lectures = visibleLectures[subjectSelect.value] || {};

      lectureSelect.innerHTML = '<option value="">اختر المحاضرة</option>';
      Object.keys(lectures).forEach(lectureNum => {
        const option = document.createElement('option');
        option.value = lectureNum;
        option.textContent = `المحاضرة ${lectureNum}`;
        lectureSelect.appendChild(option);
      });

      // Display all versions for this subject
      let html = '<h4>النسخ الموجودة:</h4>';
      Object.keys(lectures).forEach(lectureNum => {
        const versions = lectures[lectureNum] || [];
        html += `
          <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 8px;">
            <strong>المحاضرة ${lectureNum}:</strong> 
            ${versions.map(v => `Version ${v}`).join(', ') || 'لا توجد نسخ'}
          </div>
        `;
      });
      versionsList.innerHTML = html;
    } catch (error) {
      console.error('Error updating version lectures:', error);
    }
  }

  // Add new lecture
  async addNewLecture() {
    const subject = document.getElementById('newLectureSubject').value;
    const lectureNum = document.getElementById('newLectureNumber').value;
    const lectureName = document.getElementById('newLectureName').value;

    if (!subject || !lectureNum || !lectureName) {
      this.showError('يرجى ملء جميع الحقول');
      return;
    }

    try {
      // Add to show.js (visibleLectures)
      await this.updateShowFile(subject, lectureNum);

      // Add to lectureNames.js
      await this.updateLectureNamesFile(subject, lectureNum, lectureName);

      // Create initial version file
      await this.createInitialVersionFile(subject, lectureNum);

      this.showSuccess('تم إضافة المحاضرة بنجاح');
      this.loadExistingLectures();

      // Clear form
      document.getElementById('newLectureSubject').value = '';
      document.getElementById('newLectureNumber').value = '';
      document.getElementById('newLectureName').value = '';
    } catch (error) {
      console.error('Error adding new lecture:', error);
      this.showError('فشل في إضافة المحاضرة');
    }
  }

  // Add new version
  async addNewVersion() {
    const subject = document.getElementById('versionSubject').value;
    const lectureNum = document.getElementById('versionLecture').value;
    const versionNum = document.getElementById('newVersionNumber').value;

    if (!subject || !lectureNum || !versionNum) {
      this.showError('يرجى ملء جميع الحقول');
      return;
    }

    try {
      // Update show.js to include new version
      await this.addVersionToShowFile(subject, lectureNum, versionNum);

      // Create new version file
      await this.createVersionFile(subject, lectureNum, versionNum);

      this.showSuccess('تم إضافة النسخة بنجاح');
      this.updateVersionLectures();

      // Clear form
      document.getElementById('newVersionNumber').value = '';
    } catch (error) {
      console.error('Error adding new version:', error);
      this.showError('فشل في إضافة النسخة');
    }
  }

  // Update lecture name
  async updateLectureName(subject, lectureNum) {
    const input = document.getElementById(`lectureName_${subject}_${lectureNum}`);
    const newName = input.value.trim();

    if (!newName) {
      this.showError('اسم المحاضرة لا يمكن أن يكون فارغاً');
      return;
    }

    try {
      await this.updateLectureNamesFile(subject, lectureNum, newName);
      this.showSuccess('تم تحديث اسم المحاضرة بنجاح');
    } catch (error) {
      console.error('Error updating lecture name:', error);
      this.showError('فشل في تحديث اسم المحاضرة');
    }
  }

  // GitHub sync methods
  async syncToGithub() {
    const statusDiv = document.getElementById('githubStatus');
    statusDiv.innerHTML = '<p style="color: #007bff;">جاري رفع التغييرات...</p>';

    try {
      // This would require backend implementation
      // For now, show a message about manual sync
      statusDiv.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; color: #856404;">
          <h4>تعليمات المزامنة اليدوية:</h4>
          <p>1. قم بفتح terminal في المشروع</p>
          <p>2. نفذ الأوامر التالية:</p>
          <code style="background: #f8f9fa; padding: 5px; border-radius: 4px; display: block; margin: 5px 0;">
            git add .<br>
            git commit -m "Update lectures and versions"<br>
            git push origin main
          </code>
        </div>
      `;
    } catch (error) {
      statusDiv.innerHTML = '<p style="color: #dc3545;">فشل في رفع التغييرات</p>';
    }
  }

  async pullFromGithub() {
    const statusDiv = document.getElementById('githubStatus');
    statusDiv.innerHTML = '<p style="color: #007bff;">جاري سحب التحديثات...</p>';

    try {
      // This would require backend implementation
      statusDiv.innerHTML = `
        <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; color: #0c5460;">
          <h4>تعليمات سحب التحديثات:</h4>
          <p>1. قم بفتح terminal في المشروع</p>
          <p>2. نفذ الأمر التالي:</p>
          <code style="background: #f8f9fa; padding: 5px; border-radius: 4px; display: block; margin: 5px 0;">
            git pull origin main
          </code>
        </div>
      `;
    } catch (error) {
      statusDiv.innerHTML = '<p style="color: #dc3545;">فشل في سحب التحديثات</p>';
    }
  }

  // File update methods with real functionality
  async updateShowFile(subject, lectureNum) {
    try {
      // Import current show.js
      const showModule = await import('./show.js?' + Date.now());
      const currentVisibleLectures = { ...showModule.visibleLectures };

      // Add new lecture to the structure
      if (!currentVisibleLectures[subject]) {
        currentVisibleLectures[subject] = {};
      }
      if (!currentVisibleLectures[subject][lectureNum]) {
        currentVisibleLectures[subject][lectureNum] = [1]; // Start with version 1
      }

      // Generate new show.js content
      const showContent = `export const visibleLectures = ${JSON.stringify(currentVisibleLectures, null, 2)};`;

      // Save to file (this requires server-side implementation)
      await this.saveFileContent('show.js', showContent);

    } catch (error) {
      console.error('Error updating show.js:', error);
      throw error;
    }
  }

  async updateLectureNamesFile(subject, lectureNum, lectureName) {
    try {
      // Import current lectureNames.js
      const namesModule = await import('./lectureNames.js?' + Date.now());
      const currentLectureNames = { ...namesModule.lectureNames };

      // Update lecture name
      if (!currentLectureNames[subject]) {
        currentLectureNames[subject] = {};
      }
      currentLectureNames[subject][lectureNum] = lectureName;

      // Generate new lectureNames.js content
      const namesContent = `export const lectureNames = ${JSON.stringify(currentLectureNames, null, 2)};`;

      // Save to file
      await this.saveFileContent('lectureNames.js', namesContent);

    } catch (error) {
      console.error('Error updating lectureNames.js:', error);
      throw error;
    }
  }

  async addVersionToShowFile(subject, lectureNum, versionNum) {
    try {
      // Import current show.js
      const showModule = await import('./show.js?' + Date.now());
      const currentVisibleLectures = { ...showModule.visibleLectures };

      // Add version if it doesn't exist
      if (currentVisibleLectures[subject] && currentVisibleLectures[subject][lectureNum]) {
        if (!currentVisibleLectures[subject][lectureNum].includes(parseInt(versionNum))) {
          currentVisibleLectures[subject][lectureNum].push(parseInt(versionNum));
          currentVisibleLectures[subject][lectureNum].sort((a, b) => a - b);
        }
      }

      // Generate new show.js content
      const showContent = `export const visibleLectures = ${JSON.stringify(currentVisibleLectures, null, 2)};`;

      // Save to file
      await this.saveFileContent('show.js', showContent);

    } catch (error) {
      console.error('Error adding version to show.js:', error);
      throw error;
    }
  }

  async createInitialVersionFile(subject, lectureNum) {
    const fileName = `${subject}/${subject}${lectureNum}/${subject}${lectureNum}_v1.js`;
    const content = this.generateVersionFileContent(subject, lectureNum, 1);
    await this.saveFileContent(fileName, content);
  }

  async createVersionFile(subject, lectureNum, versionNum) {
    const fileName = `${subject}/${subject}${lectureNum}/${subject}${lectureNum}_v${versionNum}.js`;
    const content = this.generateVersionFileContent(subject, lectureNum, versionNum);
    await this.saveFileContent(fileName, content);
  }

  // Generate template content for version files
  generateVersionFileContent(subject, lectureNum, versionNum) {
    return `export const questions = [
  {
    question: "سؤال تجريبي لـ ${subject} - المحاضرة ${lectureNum} - النسخة ${versionNum}",
    options: [
      "الخيار الأول",
      "الخيار الثاني", 
      "الخيار الثالث",
      "الخيار الرابع"
    ],
    answer: 0
  }
  // أضف المزيد من الأسئلة هنا
];`;
  }

  // Save file content using server endpoint
  async saveFileContent(filePath, content) {
    try {
      const response = await fetch('/admin/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          content,
          userEmail: this.currentUser?.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save file');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  // Setup event listeners for delete workflow
  setupDeleteEventListeners() {
    // Back button
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
      this.showMainMenu();
    });

    // Subject selection
    document.getElementById('deleteSubject').addEventListener('change', (e) => {
      const lectureStep = document.getElementById('deleteLectureStep');
      const versionStep = document.getElementById('deleteVersionStep');

      if (e.target.value) {
        lectureStep.style.display = 'block';
        versionStep.style.display = 'none';
        this.selectedDeleteSubject = e.target.value;
        this.loadDeleteLectures();
      } else {
        lectureStep.style.display = 'none';
        versionStep.style.display = 'none';
      }
    });

    // Lecture selection
    document.getElementById('deleteLecture').addEventListener('change', (e) => {
      const versionStep = document.getElementById('deleteVersionStep');

      if (e.target.value) {
        versionStep.style.display = 'block';
        this.selectedDeleteLecture = e.target.value;
        this.loadDeleteVersions();
      } else {
        versionStep.style.display = 'none';
      }
    });

    // Delete button
    document.getElementById('deleteBtn').addEventListener('click', () => {
      this.deleteItemWithConfirmation();
    });

    // Load subjects
    this.loadDeleteSubjects();
  }

  // Load subjects for deletion
  async loadDeleteSubjects() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());
      const deleteSubject = document.getElementById('deleteSubject');

      deleteSubject.innerHTML = '<option value="">اختر المادة</option>';

      Object.keys(visibleLectures).forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        deleteSubject.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading subjects for deletion:', error);
    }
  }

  // Load lectures for deletion
  async loadDeleteLectures() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());
      const { lectureNames } = await import('./lectureNames.js?' + Date.now());
      const deleteLecture = document.getElementById('deleteLecture');

      deleteLecture.innerHTML = '<option value="">اختر المحاضرة</option>';

      const lectures = visibleLectures[this.selectedDeleteSubject] || {};
      Object.keys(lectures).forEach(lectureNum => {
        const option = document.createElement('option');
        option.value = lectureNum;
        const name = lectureNames[this.selectedDeleteSubject]?.[lectureNum] || 'غير محدد';
        option.textContent = `المحاضرة ${lectureNum} - ${name}`;
        deleteLecture.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading lectures for deletion:', error);
    }
  }

  // Load versions for deletion
  async loadDeleteVersions() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());
      const deleteVersion = document.getElementById('deleteVersion');

      deleteVersion.innerHTML = '<option value="">اختر النسخة</option>';

      const versions = visibleLectures[this.selectedDeleteSubject]?.[this.selectedDeleteLecture] || [];
      versions.forEach(versionNum => {
        const option = document.createElement('option');
        option.value = versionNum;
        option.textContent = `النسخة ${versionNum}`;
        deleteVersion.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading versions for deletion:', error);
    }
  }

  // Delete with confirmation
  async deleteItemWithConfirmation() {
    const versionSelect = document.getElementById('deleteVersion');
    const selectedVersion = versionSelect.value;

    if (!this.selectedDeleteSubject || !this.selectedDeleteLecture || !selectedVersion) {
      this.showError('يرجى اختيار المادة والمحاضرة والنسخة');
      return;
    }

    const confirmMessage = `هل أنت متأكد من حذف النسخة ${selectedVersion} من المحاضرة ${this.selectedDeleteLecture} في مادة ${this.selectedDeleteSubject}؟\n\nهذه العملية لا يمكن التراجع عنها.`;

    if (!confirm(confirmMessage)) return;

    try {
      await this.deleteVersion(this.selectedDeleteSubject, this.selectedDeleteLecture, selectedVersion);
      this.showSuccess('تم حذف النسخة بنجاح');

      // Reset the form
      this.loadDeleteVersions();

      // If no versions left, reset lecture selection
      const { visibleLectures } = await import('./show.js?' + Date.now());
      const remainingVersions = visibleLectures[this.selectedDeleteSubject]?.[this.selectedDeleteLecture] || [];
      if (remainingVersions.length === 0) {
        document.getElementById('deleteVersionStep').style.display = 'none';
        this.loadDeleteLectures();
      }
    } catch (error) {
      console.error('Delete error:', error);
      this.showError('فشل في حذف النسخة');
    }
  }

  // Delete management methods (legacy methods updated)
  async updateDeleteLectures() {
    // This method is kept for compatibility but functionality moved to loadDeleteLectures
    return this.loadDeleteLectures();
  }

  async updateDeleteVersions() {
    // This method is kept for compatibility but functionality moved to loadDeleteVersions
    return this.loadDeleteVersions();
  }

  async deleteItem() {
    // This method is kept for compatibility but functionality moved to deleteItemWithConfirmation
    return this.deleteItemWithConfirmation();
  }

  async deleteVersion(subject, lectureNum, versionNum) {
    // Delete version file
    const filePath = `${subject}/${subject}${lectureNum}/${subject}${lectureNum}_v${versionNum}.js`;

    const response = await fetch('/admin/delete-file', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        userEmail: this.currentUser?.email
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete version file');
    }

    // Update show.js to remove version
    await this.removeVersionFromShowFile(subject, lectureNum, versionNum);
  }

  async deleteLecture(subject, lectureNum) {
    // Get all versions first
    const { visibleLectures } = await import('./show.js?' + Date.now());
    const versions = visibleLectures[subject]?.[lectureNum] || [];

    // Delete all version files
    for (const version of versions) {
      await this.deleteVersion(subject, lectureNum, version);
    }

    // Remove lecture from show.js and lectureNames.js
    await this.removeLectureFromFiles(subject, lectureNum);
  }

  async deleteSubject(subject) {
    // Get all lectures first
    const { visibleLectures } = await import('./show.js?' + Date.now());
    const lectures = visibleLectures[subject] || {};

    // Delete all lectures
    for (const lectureNum of Object.keys(lectures)) {
      await this.deleteLecture(subject, lectureNum);
    }

    // Remove subject from files
    await this.removeSubjectFromFiles(subject);
  }

  async removeVersionFromShowFile(subject, lectureNum, versionNum) {
    const showModule = await import('./show.js?' + Date.now());
    const currentVisibleLectures = { ...showModule.visibleLectures };

    if (currentVisibleLectures[subject] && currentVisibleLectures[subject][lectureNum]) {
      const versions = currentVisibleLectures[subject][lectureNum];
      const index = versions.indexOf(parseInt(versionNum));
      if (index > -1) {
        versions.splice(index, 1);
      }

      // If no versions left, remove the lecture
      if (versions.length === 0) {
        delete currentVisibleLectures[subject][lectureNum];

        // If no lectures left, remove the subject
        if (Object.keys(currentVisibleLectures[subject]).length === 0) {
          delete currentVisibleLectures[subject];
        }
      }
    }

    const showContent = `export const visibleLectures = ${JSON.stringify(currentVisibleLectures, null, 2)};`;
    await this.saveFileContent('show.js', showContent);
  }

  async removeLectureFromFiles(subject, lectureNum) {
    // Remove from show.js
    const showModule = await import('./show.js?' + Date.now());
    const currentVisibleLectures = { ...showModule.visibleLectures };

    if (currentVisibleLectures[subject]) {
      delete currentVisibleLectures[subject][lectureNum];

      if (Object.keys(currentVisibleLectures[subject]).length === 0) {
        delete currentVisibleLectures[subject];
      }
    }

    const showContent = `export const visibleLectures = ${JSON.stringify(currentVisibleLectures, null, 2)};`;
    await this.saveFileContent('show.js', showContent);

    // Remove from lectureNames.js
    const namesModule = await import('./lectureNames.js?' + Date.now());
    const currentLectureNames = { ...namesModule.lectureNames };

    if (currentLectureNames[subject]) {
      delete currentLectureNames[subject][lectureNum];

      if (Object.keys(currentLectureNames[subject]).length === 0) {
        delete currentLectureNames[subject];
      }
    }

    const namesContent = `export const lectureNames = ${JSON.stringify(currentLectureNames, null, 2)};`;
    await this.saveFileContent('lectureNames.js', namesContent);
  }

  async removeSubjectFromFiles(subject) {
    // Remove from show.js
    const showModule = await import('./show.js?' + Date.now());
    const currentVisibleLectures = { ...showModule.visibleLectures };
    delete currentVisibleLectures[subject];

    const showContent = `export const visibleLectures = ${JSON.stringify(currentVisibleLectures, null, 2)};`;
    await this.saveFileContent('show.js', showContent);

    // Remove from lectureNames.js
    const namesModule = await import('./lectureNames.js?' + Date.now());
    const currentLectureNames = { ...namesModule.lectureNames };
    delete currentLectureNames[subject];

    const namesContent = `export const lectureNames = ${JSON.stringify(currentLectureNames, null, 2)};`;
    await this.saveFileContent('lectureNames.js', namesContent);
  }

  // Load dropdowns for delete functionality
  async loadDeleteDropdowns() {
    try {
      const { visibleLectures } = await import('./show.js?' + Date.now());

      const deleteSubjectSelect = document.getElementById('deleteSubject');
      const versionSubjectSelect = document.getElementById('versionSubject');

      // Update both delete and version management dropdowns
      [deleteSubjectSelect, versionSubjectSelect].forEach(select => {
        if (select) {
          const currentValue = select.value;
          select.innerHTML = '<option value="">اختر المادة</option>';

          Object.keys(visibleLectures).forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            select.appendChild(option);
          });

          if (currentValue && visibleLectures[currentValue]) {
            select.value = currentValue;
          }
        }
      });
    } catch (error) {
      console.error('Error loading delete dropdowns:', error);
    }
  }

  // Close admin modal
  closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
      modal.remove();
    }
  }

  // Show success message
  showSuccess(message) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #28a745;
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
      z-index: 10001;
      font-family: 'Tajawal', sans-serif;
      text-align: center;
      max-width: 300px;
    `;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
      if (document.body.contains(div)) {
        document.body.removeChild(div);
      }
    }, 3000);
  }

  // Show error message
  showError(message) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #dc3545;
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
      z-index: 10001;
      font-family: 'Tajawal', sans-serif;
      text-align: center;
      max-width: 300px;
    `;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
      if (document.body.contains(div)) {
        document.body.removeChild(div);
      }
    }, 4000);
  }
}

export default AdminManager;
