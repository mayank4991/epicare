/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_PATIENTS = 'Patients';
const SHEET_USERS = 'Users';
const SHEET_FOLLOWUPS = 'FollowUps';
const SHEET_CONFIG = 'Config';
const SCRIPT_URL = ''; // Just use relative URLs, e.g. fetch('?action=getPatients')

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getPatients') {
      return jsonResponse(getSheetData(SHEET_PATIENTS));
    } else if (action === 'getFollowUps') {
      return jsonResponse(getSheetData(SHEET_FOLLOWUPS));
    } else if (action === 'getConfig') {
      return jsonResponse(getConfigData());
    } else {
      return jsonResponse({ status: 'error', message: 'Invalid GET action' });
    }
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    if (action === 'login') {
      return jsonResponse(login(data));
    } else if (action === 'addPatient') {
      return jsonResponse(addPatient(data.data));
    } else if (action === 'addFollowUp') {
      return jsonResponse(addFollowUp(data.data));
    } else if (action === 'updatePatientStatus') {
      return jsonResponse(updatePatientStatus(data.id, data.status));
    } else if (action === 'updatePatientFollowUpStatus') {
      return jsonResponse(updatePatientFollowUpStatus(data.patientId, data.followUpStatus, data.lastFollowUp, data.nextFollowUpDate, data.medications));
    } else {
      return jsonResponse({ status: 'error', message: 'Invalid POST action' });
    }
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function login(data) {
  const { username, password, role } = data;
  const users = getSheetData(SHEET_USERS);
  const user = users.find(u =>
    u.Username === username &&
    u.Password == password &&
    u.Role === role &&
    (u.Status || '').toLowerCase() === 'active'
  );
  if (user) {
    delete user.Password;
    return { status: 'success', userData: user };
  } else {
    return { status: 'error', message: 'Incorrect credentials or inactive user.' };
  }
}

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    let row = {};
    headers.forEach((h, j) => {
      if (h === 'Medications' && data[i][j]) {
        try { row[h] = JSON.parse(data[i][j]); } catch { row[h] = []; }
      } else if (h === 'InjuryType' && data[i][j]) {
        try { row[h] = JSON.parse(data[i][j]); } catch { row[h] = []; }
      } else {
        row[h] = data[i][j];
      }
    });
    rows.push(row);
  }
  return { status: 'success', data: rows };
}

function addPatient(patient) {
  if (!patient.PatientName || !patient.Age || !patient.Gender || !patient.Phone || !patient.PHC) {
    return { status: 'error', message: 'Missing required patient fields.' };
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PATIENTS);
  const headers = sheet.getDataRange().getValues()[0];
  const id = Utilities.getUuid();
  const row = [];
  headers.forEach(h => {
    if (h === 'ID') row.push(id);
    else if (h === 'Medications') row.push(JSON.stringify(patient.Medications || []));
    else if (h === 'InjuryType') row.push(JSON.stringify(patient.InjuryType || []));
    else row.push(patient[h] || '');
  });
  sheet.appendRow(row);
  return { status: 'success', id: id };
}

function addFollowUp(followUp) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_FOLLOWUPS);
  const headers = sheet.getDataRange().getValues()[0];
  const id = Utilities.getUuid();
  const row = [];
  headers.forEach(h => {
    if (h === 'FollowUpID') row.push(id);
    else if (h === 'NewMedications') row.push(JSON.stringify(followUp.newMedications || []));
    else row.push(followUp[h] || '');
  });
  sheet.appendRow(row);
  return { status: 'success', id: id };
}

function getConfigData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  let phcNames = [];
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    phcNames = data.map(row => row[0]).filter(v => v && v !== 'PHC');
  } else {
    phcNames = [
      "Golmuri PHC", "Bistupur PHC", "Sakchi PHC", "Kadma PHC", "Telco PHC",
      "Sonari PHC", "Jugsalai PHC", "Burdwan Colony PHC", "Burma Mines PHC", "Mango PHC",
      "Bagbera PHC", "Adityapur PHC", "Gamharia PHC", "Chandil PHC", "Ghatshila PHC",
      "Potka PHC", "Baharagora PHC", "Dhalbhumgarh PHC", "Musabani PHC", "Patamda PHC"
    ];
  }
  return { status: 'success', data: { phcNames: phcNames } };
}

function updatePatientStatus(id, status) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('ID');
  const idxStatus = headers.indexOf('PatientStatus');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxId] == id) {
      sheet.getRange(i + 1, idxStatus + 1).setValue(status);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Patient not found.' };
}

function updatePatientFollowUpStatus(patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PATIENTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('ID');
  const idxFollowUpStatus = headers.indexOf('FollowUpStatus');
  const idxLastFollowUp = headers.indexOf('LastFollowUp');
  const idxNextFollowUpDate = headers.indexOf('NextFollowUpDate');
  const idxMedications = headers.indexOf('Medications');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxId] == patientId) {
      sheet.getRange(i + 1, idxFollowUpStatus + 1).setValue(followUpStatus);
      sheet.getRange(i + 1, idxLastFollowUp + 1).setValue(lastFollowUp);
      sheet.getRange(i + 1, idxNextFollowUpDate + 1).setValue(nextFollowUpDate);
      if (medications) sheet.getRange(i + 1, idxMedications + 1).setValue(medications);
      return { status: 'success' };
    }
  }
  return { status: 'error', message: 'Patient not found.' };
}

function verifyUserLogin(credentials) {
  const { username, password, role } = credentials;
  const users = getSheetData(SHEET_USERS);
  const user = users.find(u =>
    u.Username === username &&
    u.Password.toString() === password.toString() &&
    u.Role === role &&
    u.Status === 'Active'
  );
  if (user) {
    delete user.Password;
    return { status: 'success', userData: user };
  } else {
    return { status: 'error', message: 'Invalid username, password, or role.' };
  }
}

function handleAddPatient(requestData) {
  const data = requestData.data;
  const validation = validatePatientData(data);
  if (!validation.isValid) return { status: 'error', message: validation.message };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PATIENTS);
  const uniquePatientId = generateUniquePatientId();
  const row = [
    uniquePatientId,
    data.PatientName || '',
    data.FatherName || '',
    data.Age || '',
    data.Gender || '',
    data.Phone || '',
    data.PhoneBelongsTo || '',
    data.CampLocation || '',
    data.ResidenceType || '',
    data.Address || '',
    data.PHC || '',
    data.Diagnosis || 'Epilepsy',
    data.EtiologySyndrome || '',
    data.AgeOfOnset || '',
    data.SeizureFrequency || '',
    data.PatientStatus || 'New',
    data.Weight || '',
    data.BPSystolic || '',
    data.BPDiastolic || '',
    data.BPRemark || '',
    JSON.stringify(data.Medications || []),
    data.Addictions || '',
    data.InjuryType || '',
    data.TreatmentStatus || '',
    data.PreviouslyOnDrug || '',
    new Date().toISOString(), // RegistrationDate
    'Pending', // FollowUpStatus
    'N/A', // Adherence
    new Date().toLocaleDateString(), // LastFollowUp
    '', // NextFollowUpDate
    '[]', // MedicationHistory
    '', // LastMedicationChangeDate
    '', // LastMedicationChangeBy
    data.submittedByUsername || 'System', // AddedBy
  ];
  sheet.appendRow(row);
  return { status: 'success', message: 'Patient added successfully', patientId: uniquePatientId };
}

function handleAddFollowUp(requestData) {
  const data = requestData.data;
  const patientId = data.patientId;
  // 1. Update patient record
  const completionResult = completeFollowUp(patientId, data);
  // 2. Add to FollowUps sheet
  const sheet = getOrCreateSheet(SHEET_FOLLOWUPS);
  const followUpId = 'FU-' + Date.now().toString().slice(-6);
  const row = [
    followUpId,
    patientId,
    data.choName,
    data.followUpDate,
    data.phoneCorrect,
    data.correctedPhoneNumber || '',
    data.feltImprovement,
    data.seizureFrequency,
    data.seizureTypeChange || '',
    data.seizureDurationChange || '',
    data.seizureSeverityChange || '',
    data.medicationSource || '',
    data.missedDose,
    data.treatmentAdherence,
    data.medicationChanged ? 'Yes' : 'No',
    JSON.stringify(data.newMedications || []),
    data.newMedicalConditions || '',
    data.additionalQuestions || '',
    data.durationInSeconds || 0,
    data.submittedByUsername || 'Unknown',
    data.referToMO ? 'Yes' : 'No',
    data.drugDoseVerification || '',
    new Date().toISOString(), // SubmissionDate
    completionResult.nextFollowUpDate,
    data.ReferralClosed || ''
  ];
  sheet.appendRow(row);
  // 3. If referral closed, update past entries
  if (data.ReferralClosed === 'Yes') updateExistingReferralEntries(patientId);
  return {
    status: 'success',
    message: 'Follow-up recorded successfully',
    completionStatus: completionResult.completionStatus,
    nextFollowUpDate: completionResult.nextFollowUpDate
  };
}

function getOrCreateSheet(sheetName, headers = []) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers.length > 0) sheet.appendRow(headers);
  }
  return sheet;
}

function completeFollowUp(patientId, followUpData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PATIENTS);
  const values = sheet.getDataRange().getValues();
  const header = values[0];
  const idCol = header.indexOf('ID');
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  const adherenceCol = header.indexOf('Adherence');
  const phoneCol = header.indexOf('Phone');
  const medicationsCol = header.indexOf('Medications');
  const nextFollowUpDateCol = header.indexOf('NextFollowUpDate');
  const rowIndex = values.findIndex((row, idx) => idx > 0 && row[idCol] === patientId);
  if (rowIndex === -1) throw new Error(`Patient with ID ${patientId} not found.`);
  const sheetRowIndex = rowIndex + 1;
  const followUpDate = new Date(followUpData.followUpDate);
  const nextFollowUpDate = new Date(followUpDate);
  nextFollowUpDate.setMonth(nextFollowUpDate.getMonth() + 1);
  const nextFollowUpDateString = nextFollowUpDate.toISOString().split('T')[0];
  const completionStatus = `Completed for ${followUpDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  sheet.getRange(sheetRowIndex, lastFollowUpCol + 1).setValue(followUpData.followUpDate);
  sheet.getRange(sheetRowIndex, followUpStatusCol + 1).setValue(completionStatus);
  sheet.getRange(sheetRowIndex, adherenceCol + 1).setValue(followUpData.treatmentAdherence);
  if (nextFollowUpDateCol !== -1) sheet.getRange(sheetRowIndex, nextFollowUpDateCol + 1).setValue(nextFollowUpDateString);
  if (followUpData.phoneCorrect === 'No' && followUpData.correctedPhoneNumber) {
    sheet.getRange(sheetRowIndex, phoneCol + 1).setValue(followUpData.correctedPhoneNumber);
  }
  if (followUpData.medicationChanged && followUpData.newMedications && followUpData.newMedications.length > 0) {
    sheet.getRange(sheetRowIndex, medicationsCol + 1).setValue(JSON.stringify(followUpData.newMedications));
  }
  return {
    completionStatus: completionStatus,
    nextFollowUpDate: nextFollowUpDateString
  };
}

function updateExistingReferralEntries(patientId) {
  // Implement as needed for your workflow
}

function validatePatientData(data) {
  const errors = [];
  if (!data.PatientName || data.PatientName.trim() === '') errors.push('Patient Name is required.');
  if (!data.Age || isNaN(Number(data.Age)) || Number(data.Age) <= 0) errors.push('A valid Age is required.');
  if (!data.Gender) errors.push('Gender is required.');
  if (!data.Phone || !/^\d{10}$/.test(data.Phone)) errors.push('A valid 10-digit Phone Number is required.');
  if (!data.PHC) errors.push('PHC location is required.');
  return errors.length > 0 ? { isValid: false, message: errors.join(' ') } : { isValid: true };
}

function generateUniquePatientId() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PATIENTS);
  const idColumn = sheet.getRange("A2:A").getValues().filter(String);
  let highestId = 0;
  idColumn.forEach(cell => {
    const id = parseInt(cell[0], 10);
    if (!isNaN(id) && id > highestId) highestId = id;
  });
  return (highestId + 1).toString();
}

function monthlyFollowUpRenewal() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PATIENTS);
  const values = sheet.getDataRange().getValues();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  let resetCount = 0;
  const header = values[0];
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const followUpStatus = row[followUpStatusCol];
    if (followUpStatus && followUpStatus.includes('Completed')) {
      const lastFollowUp = row[lastFollowUpCol] ? new Date(row[lastFollowUpCol]) : null;
      if (lastFollowUp && !isNaN(lastFollowUp.getTime())) {
        const lastFollowUpMonth = lastFollowUp.getMonth();
        const lastFollowUpYear = lastFollowUp.getFullYear();
        if (lastFollowUpyear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth)) {
          sheet.getRange(i + 1, followUpStatusCol + 1).setValue('Pending');
          resetCount++;
        }
      }
    }
  }
  return { status: 'success', resetCount: resetCount };
}

function resetFollowUpsByPhc(phcName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PATIENTS);
  const values = sheet.getDataRange().getValues();
  const header = values[0];
  const phcCol = header.indexOf('PHC');
  const statusCol = header.indexOf('PatientStatus');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  let resetCount = 0;
  for (let i = 1; i < values.length; i++) {
    const phc = (values[i][phcCol] || '').toString().trim().toLowerCase();
    const status = (values[i][statusCol] || '').toString().trim().toLowerCase();
    if (
      phc === phcName.trim().toLowerCase() &&
      ['active', 'follow-up', 'new'].includes(status)
    ) {
      sheet.getRange(i + 1, followUpStatusCol + 1).setValue('Pending');
      resetCount++;
    }
  }
  return { status: 'success', resetCount };
}

function updatePatientStatus(patientId, newStatus) {
  // Implementation needed
}

function updatePatientFollowUpStatus(patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications) {
  // Implementation needed
}

function login(credentials) {
  const { username, password, role } = credentials;
  google.script.run
    .withSuccessHandler(function(result) {
      // handle result (same as your old result)
    })
    .withFailureHandler(function(error) {
      // handle error
    })
    .login({ username, password, role });
} 