export function calculateAge(birthDate: string, reference = new Date()): string {
  if (!birthDate) return "Edad no registrada";
  const birth = new Date(`${birthDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return "Edad no registrada";
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
