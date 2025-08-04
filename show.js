// show.js

export const visibleLectures = {
  endodontics: {
    1: ['v1', 'v2', 'v3'],   // محاضرة 1 فيها نسخ v1 و v2 و v3 تظهر للاختبار
    2: ['v1'],               // محاضرة 2 فيها نسخة واحدة v1
    3: ['v1', 'v4'],
    10: ['v2'],
  },
  generalmedicine: {
    1: ['v1', 'v3'],
    5: ['v2'],
    12: ['v1', 'v2', 'v4'],
  },
  generalsurgery: {
    1: ['v1'],
    2: ['v2', 'v3'],
    7: ['v1'],
  },
  operative: {
    1: ['v1', 'v2'],
    3: ['v3'],
  },
  oralpathology: {
    1: ['v1', 'v4'],
    8: ['v2'],
  },
  oralsurgery: {
    2: ['v1', 'v2', 'v3', 'v4'],
  },
  orthodontics: {
    1: ['v1'],
    10: ['v2', 'v3'],
  },
  pedodontics: {
    4: ['v1'],
  },
  periodontology: {
    1: ['v1', 'v3'],
  },
  prosthodontics: {
    5: ['v2', 'v3'],
  },
};
