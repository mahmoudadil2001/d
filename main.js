import { visibleLectures } from './show.js';
import { lectureNames } from './lectureNames.js';

// عناصر DOM
const adminBtn = document.getElementById('adminBtn');
const controlPanel = document.querySelector('.container');

const subjectSelect = document.getElementById("subjectSelect");
const lectureSelect = document.getElementById("lectureSelect");
const versionSelect = document.getElementById("versionSelect");
const loadBtn = document.getElementById("loadBtn");
const questionsContainer = document.getElementById("questionsContainer");

const addSubject = document.getElementById('addSubject');
const addVersion = document.getElementById('addVersion');
const addLectureName = document.getElementById('addLectureName');
const addJsContent = document.getElementById('addJsContent');

const editSubject = document.getElementById('editSubject');
const editLecture = document.getElementById('editLecture');
const editVersion = document.getElementById('editVersion');
const editLectureName = document.getElementById('editLectureName');
const editJsContent = document.getElementById('editJsContent');

const addSection = document.getElementById('addSection');
const editSection = document.getElementById('editSection');

const addTab = document.getElementById('addTab');
const editTab = document.getElementById('editTab');

// إخفاء لوحة التحكم بالافتراضي
controlPanel.style.display = 'none';

// زر admin لفتح لوحة التحكم بكلمة مرور
adminBtn.addEventListener('click', () => {
  const pass = prompt('أدخل كلمة المرور للوصول إلى لوحة التحكم:');
  if (pass === '0770') {
    controlPanel.style.display = 'block';
    adminBtn.style.display = 'none';
  } else {
    alert('كلمة مرور خاطئة!');
  }
});

// تبويبات لوحة التحكم
addTab.addEventListener('click', () => {
  addTab.classList.add('active');
  editTab.classList.remove('active');
  addSection.style.display = 'block';
  editSection.style.display = 'none';
});

editTab.addEventListener('click', () => {
  editTab.classList.add('active');
  addTab.classList.remove('active');
  addSection.style.display = 'none';
  editSection.style.display = 'block';
});

// Base64 encoding
function b64EncodeUnicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// GitHub API constants
const GITHUB_USERNAME = 'mahmoudadil2001';
const REPO_NAME = 'dentistry-JS';
const BRANCH = 'main';

async function getFileSha(path, token) {
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`;
  const res = await fetch(url, { headers: { Authorization: `token ${token}` } });
  if (!res.ok) throw new Error(`فشل جلب SHA للملف ${path}`);
  const data = await res.json();
  return data.sha;
}

async function updateFileOnGitHub(path, content, message, token) {
  try {
    const sha = await getFileSha(path, token);
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`;
    const body = { message, content: b64EncodeUnicode(content), sha, branch: BRANCH };
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'فشل التحديث');
    }
    alert(`✅ تم تحديث ${path} بنجاح`);
  } catch (error) {
    alert(`❌ خطأ: ${error.message}`);
  }
}

// --- تعبئة المواد في قوائم الاختيار ---
function fillSubjects() {
  subjectSelect.innerHTML = '';
  Object.keys(visibleLectures).forEach(subject => {
    const opt = document.createElement('option');
    opt.value = subject;
    opt.textContent = subject;
    subjectSelect.appendChild(opt);
  });
  subjectSelect.dispatchEvent(new Event('change'));
}

// عند تغيير المادة يتم تعبئة المحاضرات
subjectSelect.addEventListener('change', () => {
  lectureSelect.innerHTML = '';
  versionSelect.innerHTML = '';

  const selected = subjectSelect.value;
  const lectures = Object.keys(visibleLectures[selected] || {});

  lectures.forEach(lec => {
    const opt = document.createElement('option');
    opt.value = lec;
    const name = lectureNames[selected]?.[lec] || "Unknown";
    opt.textContent = `lec${lec} - ${name}`;
    lectureSelect.appendChild(opt);
  });

  lectureSelect.dispatchEvent(new Event('change'));
});

// عند تغيير المحاضرة يتم تعبئة النسخ
lectureSelect.addEventListener('change', () => {
  versionSelect.innerHTML = '';
  const selectedSubject = subjectSelect.value;
  const selectedLecture = lectureSelect.value;
  const versions = visibleLectures[selectedSubject]?.[selectedLecture] || [];

  versions.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = `Version ${v}`;
    versionSelect.appendChild(opt);
  });
});

// زر "ابدأ" لتحميل الأسئلة وعرضها
loadBtn.addEventListener('click', async () => {
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

// --- تعبئة مواد الإضافة ---
function fillAddSubjects() {
  addSubject.innerHTML = '';
  Object.keys(visibleLectures).forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    addSubject.appendChild(opt);
  });
  addSubject.dispatchEvent(new Event('change'));
}

// تعبئة نسخ الإضافة (1-4)
function fillAddVersions() {
  addVersion.innerHTML = '';
  [1,2,3,4].forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = 'v' + v;
    addVersion.appendChild(opt);
  });
}

// تعبئة مواد التعديل
function fillEditSubjects() {
  editSubject.innerHTML = '';
  Object.keys(visibleLectures).forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    editSubject.appendChild(opt);
  });
  editSubject.dispatchEvent(new Event('change'));
}

// تعبئة المحاضرات في التعديل
function fillEditLectures() {
  const subject = editSubject.value;
  editLecture.innerHTML = '';
  if(!visibleLectures[subject]) return;
  Object.keys(visibleLectures[subject]).forEach(lec => {
    const opt = document.createElement('option');
    opt.value = lec;
    opt.textContent = `lec${lec} - ${lectureNames[subject]?.[lec] || 'Unknown'}`;
    editLecture.appendChild(opt);
  });
  editLecture.dispatchEvent(new Event('change'));
}

// تعبئة النسخ في التعديل
function fillEditVersions() {
  const subject = editSubject.value;
  const lecture = editLecture.value;
  editVersion.innerHTML = '';
  const versions = visibleLectures[subject]?.[lecture] || [];
  versions.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = 'v' + v;
    editVersion.appendChild(opt);
  });
  editVersion.dispatchEvent(new Event('change'));
}

// تحميل بيانات المحاضرة المراد تعديلها
async function loadEditLectureData() {
  const subject = editSubject.value;
  const lecture = editLecture.value;
  const version = editVersion.value;
  if(!subject || !lecture || !version) return;

  editLectureName.value = lectureNames[subject]?.[lecture] || '';

  const path = `${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;
  try {
    const mod = await import(path + `?cacheBust=${Date.now()}`);
    if(mod.questions) {
      editJsContent.value = JSON.stringify(mod.questions, null, 2);
    } else {
      editJsContent.value = '// لا يوجد محتوى أسئلة في هذا الملف';
    }
  } catch(e) {
    editJsContent.value = '// فشل تحميل الملف: ' + path;
  }
}

// حفظ إضافة محاضرة جديدة على GitHub
async function saveAddLecture() {
  const token = prompt('أدخل GitHub Token');
  if(!token) return alert('🛑 أدخل GitHub Token أولاً');
  const subject = addSubject.value;
  const version = addVersion.value;
  const lectureName = addLectureName.value.trim();
  if(!lectureName) return alert('أدخل اسم المحاضرة');
  let questions;
  try {
    questions = JSON.parse(addJsContent.value);
  } catch {
    return alert('محتوى الأسئلة غير صالح JSON');
  }

  // تحديث lectureNames محليًا
  const lectures = lectureNames[subject] || {};
  const newLectureNum = Object.keys(lectures).length + 1;
  lectures[newLectureNum] = lectureName;
  lectureNames[subject] = lectures;

  // تحديث visibleLectures لإظهار النسخة الجديدة
  if(!visibleLectures[subject]) visibleLectures[subject] = {};
  if(!visibleLectures[subject][newLectureNum]) visibleLectures[subject][newLectureNum] = [];
  if(!visibleLectures[subject][newLectureNum].includes(Number(version))) {
    visibleLectures[subject][newLectureNum].push(Number(version));
  }

  // رفع الملفات
  const lectureNamesContent = `export const lectureNames = ${JSON.stringify(lectureNames, null, 2)};`;
  const showContent = `export const visibleLectures = ${JSON.stringify(visibleLectures, null, 2)};`;
  const questionFilePath = `${subject}/${subject}${newLectureNum}/${subject}${newLectureNum}_v${version}.js`;
  const questionFileContent = `export const questions = ${JSON.stringify(questions, null, 2)};`;

  await updateFileOnGitHub('lectureNames.js', lectureNamesContent, `Add lecture ${subject} lec${newLectureNum}`, token);
  await updateFileOnGitHub('show.js', showContent, `Update show.js after adding lecture`, token);
  await updateFileOnGitHub(questionFilePath, questionFileContent, `Add questions for ${subject} lec${newLectureNum} v${version}`, token);

  alert('تم إضافة المحاضرة بنجاح!');
}

// حفظ تعديل محاضرة موجودة على GitHub
async function saveEditLecture() {
  const token = prompt('أدخل GitHub Token');
  if(!token) return alert('🛑 أدخل GitHub Token أولاً');
  const subject = editSubject.value;
  const lecture = editLecture.value;
  const version = editVersion.value;
  const lectureNameNew = editLectureName.value.trim();
  if(!lectureNameNew) return alert('أدخل اسم المحاضرة الجديد');
  let questions;
  try {
    questions = JSON.parse(editJsContent.value);
  } catch {
    return alert('محتوى الأسئلة غير صالح JSON');
  }

  // تحديث الاسم محلياً
  lectureNames[subject][lecture] = lectureNameNew;

  // تحديث محتوى السؤال
  const questionFilePath = `${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;
  const questionFileContent = `export const questions = ${JSON.stringify(questions, null, 2)};`;

  // تحديث ملفات
  const lectureNamesContent = `export const lectureNames = ${JSON.stringify(lectureNames, null, 2)};`;

  await updateFileOnGitHub('lectureNames.js', lectureNamesContent, `Edit lecture name ${subject} lec${lecture}`, token);
  await updateFileOnGitHub(questionFilePath, questionFileContent, `Update questions ${subject} lec${lecture} v${version}`, token);

  alert('تم حفظ التعديلات بنجاح!');
}

// ربط الأحداث في لوحة التحكم
addSubject.addEventListener('change', fillAddVersions);
editSubject.addEventListener('change', () => {
  fillEditLectures();
  editVersion.innerHTML = '';
  editJsContent.value = '';
  editLectureName.value = '';
});
editLecture.addEventListener('change', fillEditVersions);
editVersion.addEventListener('change', loadEditLectureData);

// تشغيل تهيئة أولية
fillSubjects();
fillAddSubjects();
fillAddVersions();
fillEditSubjects();
