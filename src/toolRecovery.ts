export function searchStudentPrimary(name: string) {
  throw new Error(
    'Primary student search is temporarily unavailable',
  );
}

export function searchStudentBackup(name: string) {
  if (name.toLowerCase() !== 'cody') {
    return {
      found: false,
      message: 'Student not found',
    };
  }

  return {
    found: true,
    id: 456,
    name: 'Cody',
    email: 'cody@cody.com',
  };
}