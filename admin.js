// admin.js

import { visibleLectures } from './show.js';
import { lectureNames } from './lectureNames.js';

const GITHUB_USERNAME = 'mahmoudadil2001'; // غيّرها
const REPO_NAME = 'dentistry-JS';             // غيّرها
const BRANCH = 'main';

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

const tokenInput = document.createElement('input');
tokenInput.type = 'password';
tokenInput.placeholder = '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';
tokenInput.style.width = '100%';
tokenInput.style.padding = '10px';
tokenInput.style.marginBottom = '10px';
tokenInput.style.borderRadius = '6px';
tokenInput.style.border = '1px solid #ccc';
document.querySelector('.container').insertBefore(tokenInput, addSection);

addTab.addEventListener('click', () => {
  addTab.classList.add('active');
  editTab.classList.remove('active');
  addSection.classList.remove('hidden');
  editSection.classList.add('hidden');
});

editTab.addEventListener('click', () => {
  editTab.classList.add('active');
  addTab.classList.remove('active');
  editSection.classList.remove('hidden');
  addSection.classList.add('hidden');
});

function b64EncodeUnicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function getFileSha(path, token) {
  const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${token}` }
  });
  if (!res.ok) throw new Error(`فشل جلب SHA للملف ${path}`);
  const data = await res.json();
  return data.sha;
}

async function updateFileOnGitHub(path, content, message, token) {
  try {
    const sha = await getFileSha(path, token);
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${path}`;
    const body = {
      message,
      content: b64EncodeUnicode(content),
      sha,
      branch: BRANCH,
    };
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
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

// --- تعبئة مواد الإضافة والتعديل ---
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

function fillAddVersions() {
  const subject = addSubject.value;
  addVersion.innerHTML = '';
  [1,2,3,4].forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = 'v' + v;
    addVersion.appendChild(opt);
  });
}

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

async function saveAddLecture() {
  const token = tokenInput.value.trim();
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

async function saveEditLecture() {
  const token = tokenInput.value.trim();
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

addSubject.addEventListener('change', fillAddVersions);
editSubject.addEventListener('change', () => {
  fillEditLectures();
  editVersion.innerHTML = '';
  editJsContent.value = '';
  editLectureName.value = '';
});
editLecture.addEventListener('change', () => {
  fillEditVersions();
});
editVersion.addEventListener('change', loadEditLectureData);

fillAddSubjects();
fillAddVersions();
fillEditSubjects();

window.saveAddLecture = saveAddLecture;
window.saveEditLecture = saveEditLecture;
