// Generate unique patient ID for new patients
function generateUniquePatientId() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const header = values[0];
  const idCol = header.indexOf('ID');
  let highestId = 0;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = row[idCol];
    let num = 0;
    if (!isNaN(Number(id))) {
      num = Number(id);
    } else if (typeof id === 'string' && id.startsWith('PT-')) {
      num = parseInt(id.replace('PT-', ''), 10);
    }
    if (num > highestId) highestId = num;
  }
  const newId = highestId + 1;
  return newId.toString();
}

// Update patient status function
function updatePatientStatus(patientId, newStatus) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    // Find column indices using headers
    const header = values[0];
    const idCol = header.indexOf('ID');
    const statusCol = header.indexOf('PatientStatus');

    // Find patient row
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === patientId) {
        rowIndex = i + 1;
        // +1 because sheet rows are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return { status: 'error', message: 'Patient not found' };
    }

    // Update patient status
    sheet.getRange(rowIndex, statusCol + 1).setValue(newStatus);
    return { status: 'success', message: 'Patient status updated successfully' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}