export function calculateAge(birthDate: string, reference = new Date()): string {
  const birth = new Date(birthDate);
  let years = reference.getFullYear() - birth.getFullYear();
  let months = reference.getMonth() - birth.getMonth();

  if (months < 0 || (months === 0 && reference.getDate() < birth.getDate())) {
    years -= 1;
    months += 12;
  }

  if (reference.getDate() < birth.getDate()) {
    months -= 1;
  }

  if (years <= 0) {
    const totalMonths = Math.max(months, 0);
    return totalMonths === 1 ? "1 mes" : `${totalMonths} meses`;
  }

  if (years === 1) return "1 año";
  return `${years} años`;
}
