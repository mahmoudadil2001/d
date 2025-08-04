// main.js
import { visibleLecturesMap } from './show.js';
import { lectureNames } from './lectureNames.js';

const subjects = Object.keys(visibleLecturesMap);

const subjectSelect = document.getElementById('subjectSelect');
const lectureSelect = document.getElementById('lectureSelect');
const versionSelect = document.getElementById('versionSelect');
const startBtn = document.getElementById('startBtn');

const addSubjectSelect = document.getElementById('addSubjectSelect');
const addVersionSelect = document.getElementById('addVersionSelect');
const addLectureName = document.getElementById('addLectureName');
const addLectureContent = document.getElementById('addLectureContent');
const saveNewLecture = document.getElementById('saveNewLecture');

const editSubjectSelect = document.getElementById('editSubjectSelect');
const editLectureSelect = document.getElementById('editLectureSelect');
const editVersionSelect = document.getElementById('editVersionSelect');
const editLectureName = document.getElementById('editLectureName');
const editLectureContent = document.getElementById('editLectureContent');
const saveEditedLecture = document.getElementById('saveEditedLecture');

const addPanel = document.getElementById('addPanel');
const editPanel = document.getElementById('editPanel');

const showAdd = document.getElementById('showAdd');
const showEdit = document.getElementById('showEdit');

function fillSelect(select, options, map = x => x) {
  select.innerHTML = '';
  options.forEach(opt => {
    const op = document.createElement('option');
    op.value = opt;
    op.textContent = map(opt);
    select.appendChild(op);
  });
}

function updateLectureSelect(subject, select, showHidden = false) {
  const lectures = visibleLecturesMap[subject];
  if (!lectures) return;
  const filtered = Object.entries(lectureNames[subject] || {}).filter(([num, name]) => {
    return showHidden || lectures.includes(Number(num));
  });
  fillSelect(select, filtered.map(([n]) => n), l => lectureNames[subject][l] || l);
}

fillSelect(subjectSelect, subjects);
fillSelect(addSubjectSelect, subjects);
fillSelect(editSubjectSelect, subjects);
fillSelect(versionSelect, ['v1','v2','v3','v4']);
fillSelect(addVersionSelect, ['v1','v2','v3','v4']);
fillSelect(editVersionSelect, ['v1','v2','v3','v4']);

subjectSelect.addEventListener('change', () => {
  updateLectureSelect(subjectSelect.value, lectureSelect);
});

addSubjectSelect.addEventListener('change', () => {
  updateLectureSelect(addSubjectSelect.value, addVersionSelect, true);
});

editSubjectSelect.addEventListener('change', () => {
  updateLectureSelect(editSubjectSelect.value, editLectureSelect);
});

showAdd.addEventListener('click', () => {
  addPanel.classList.toggle('hidden');
  editPanel.classList.add('hidden');
});

showEdit.addEventListener('click', () => {
  editPanel.classList.toggle('hidden');
  addPanel.classList.add('hidden');
});

startBtn.addEventListener('click', () => {
  const subject = subjectSelect.value;
  const lecture = lectureSelect.value;
  const version = versionSelect.value;
  const path = `./${subject}/${subject}${lecture}/${subject}${lecture}_${version}.js`;
  import(path).then(mod => {
    alert("عدد الأسئلة: " + mod.questions.length);
  }).catch(err => alert("فشل التحميل: " + err));
});
