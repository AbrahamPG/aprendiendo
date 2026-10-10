export function getStudentInfo() {
  return {
    id: 123,
    name: 'Abraham',
    university: 'UNMSM',
  };
}

let coursesAttempts = 0;

export function getStudentCourses(studentId: number) {
  coursesAttempts++;

  if (coursesAttempts === 1) {
    throw new Error('Temporary error: database unavailable');
  }

  if (studentId !== 123) {
    return {
      error: 'Student not found',
    };
  }

  return {
    studentId,
    courses: [
      'Backend Development',
      'Artificial Intelligence',
      'Database Systems',
    ],
  };
}