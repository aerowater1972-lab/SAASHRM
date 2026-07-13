export function parseCSV(text: string, requiredFields: string[] = []): { headers: string[]; rows: Record<string, string>[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [], errors: ['CSV must have a header row and at least one data row'] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const missing = requiredFields.filter(f => !headers.includes(f));
  if (missing.length > 0) return { headers: [], rows: [], errors: [`Missing required columns: ${missing.join(', ')}`] };

  const errors: string[] = [];
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: column count mismatch (expected ${headers.length}, got ${values.length})`);
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  return { headers, rows, errors };
}

export function csvToCreateEmployeeDto(row: Record<string, string>): Record<string, any> {
  const dto: Record<string, any> = {};
  if (row.employeeId) dto.employeeId = row.employeeId;
  if (row.fullName) dto.fullName = row.fullName;
  if (row.email) dto.email = row.email;
  if (row.phone) dto.phone = row.phone;
  if (row.birthDate) dto.birthDate = row.birthDate;
  if (row.birthPlace) dto.birthPlace = row.birthPlace;
  if (row.gender) dto.gender = row.gender.toUpperCase();
  if (row.religion) dto.religion = row.religion;
  if (row.maritalStatus) dto.maritalStatus = row.maritalStatus.toUpperCase();
  if (row.idCardNumber) dto.idCardNumber = row.idCardNumber;
  if (row.taxIdNumber) dto.taxIdNumber = row.taxIdNumber;
  if (row.address) dto.address = row.address;
  if (row.city) dto.city = row.city;
  if (row.province) dto.province = row.province;
  if (row.postalCode) dto.postalCode = row.postalCode;
  if (row.startDate) dto.startDate = row.startDate;
  if (row.notes) dto.notes = row.notes;
  return dto;
}
