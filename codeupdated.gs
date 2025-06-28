/**
 * Enhanced Google Apps Script Backend for Epilepsy Management System
 * Improvements: Error handling, logging, defensive coding, and cleanup
 * Complete version with all utility functions
 */
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const PATIENTS_SHEET_NAME = 'Patients';
const USERS_SHEET_NAME = 'Users';
const FOLLOWUPS_SHEET_NAME = 'FollowUps';

function doGet(e) {
  try {
    console.log('doGet parameters:', JSON.stringify(e && e.parameter ? e.parameter : {}));
    const action = e && e.parameter ? e.parameter.action : undefined;
    let data;
    if (action === 'getPatients') {
      data = getSheetData(PATIENTS_SHEET_NAME);
    } else if (action === 'getUsers') {
      data = getSheetData(USERS_SHEET_NAME);
    } else if (action === 'getFollowUps') {
      data = getSheetData(FOLLOWUPS_SHEET_NAME);
    } else if (action === 'resetFollowUpsByPhc') {
      const phc = e.parameter.phc;
      return createJsonResponse(resetFollowUpsByPhc(phc));
    } else if (action === 'addFollowUp') {
      console.log('Handling addFollowUp via GET request');
      if (!e.parameter.data) {
        console.log('No data parameter received for addFollowUp');
        return createJsonResponse({ status: 'error', message: 'No data parameter received for addFollowUp' });
      }
      let followUpData;
      try {
        followUpData = JSON.parse(e.parameter.data);
      } catch (parseError) {
        console.log('Error parsing followUpData:', parseError);
        return createJsonResponse({ status: 'error', message: 'Invalid data JSON for addFollowUp' });
      }
      return handleAddFollowUp(followUpData);
    } else if (action === 'updatePatientFollowUpStatus') {
      console.log('Handling updatePatientFollowUpStatus via GET request');
      const { patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications } = e.parameter;
      const updateResult = updatePatientFollowUpStatus(patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications);
      return createJsonResponse(updateResult);
    } else if (action === 'fixReferralEntries') {
      const fixResult = fixExistingReferralEntries();
      return createJsonResponse(fixResult);
    } else if (action === 'migrateLegacyPatientIds') {
      const migrateResult = migrateLegacyPatientIds();
      return createJsonResponse(migrateResult);
    } else if (action === 'checkLegacyPatientIds') {
      const checkResult = checkLegacyPatientIds();
      return createJsonResponse(checkResult);
    } else if (action === 'debugPatientLookup') {
      const debugResult = debugPatientLookup();
      return createJsonResponse(debugResult);
    } else if (action === 'testBackend') {
      return createJsonResponse({ 
        status: 'success', 
        message: 'Backend is working', 
        timestamp: new Date().toISOString(),
        version: 'Enhanced ID matching v2.0'
      });
    } else {
      console.log('Invalid action received:', action);
      return createJsonResponse({ status: 'error', message: 'Invalid action' });
    }
    return createJsonResponse({ status: 'success', data: data });
  } catch (error) {
    console.log('Error in doGet:', error.message, error.stack);
    return createJsonResponse({ status: 'error', message: error.message, stack: error.stack });
  }
}

function doPost(e) {
  try {
    console.log('doPost called with data:', e.postData ? e.postData.contents : 'No post data');
    console.log('Post data type:', e.postData ? e.postData.type : 'No post data type');
    
    let requestData;
    let action;
    
    // Handle both JSON and form data
    if (e.postData.type === 'application/json') {
      requestData = JSON.parse(e.postData.contents);
      action = requestData.action;
    } else {
      // Handle form data
      const formData = e.parameter;
      action = formData.action;
      if (formData.data) {
        try {
          requestData = JSON.parse(formData.data);
        } catch (parseError) {
          console.error('Error parsing form data:', parseError);
          return createJsonResponse({ status: 'error', message: 'Invalid data format' });
        }
      } else {
        requestData = formData;
      }
    }
    
    console.log('Parsed request data:', JSON.stringify(requestData));
    console.log('Action requested:', action);
    
    if (action === 'addPatient') {
      return handleAddPatient(requestData.data || requestData);
    } else if (action === 'addUser') {
      return handleAddUser(requestData.data || requestData);
    } else if (action === 'addFollowUp') {
      console.log('Handling addFollowUp action');
      return handleAddFollowUp(requestData.data || requestData);
    } else if (action === 'resetFollowUps') {
      const resetResult = monthlyFollowUpRenewal();
      return createJsonResponse({ status: 'success', message: 'Follow-ups reset for the month', resetCount: resetResult });
    } else if (action === 'getFollowUpStatus') {
      const statusInfo = getFollowUpStatusInfo();
      return createJsonResponse({ status: 'success', data: statusInfo });
    } else if (action === 'updatePatientStatus') {
      const { id, status } = requestData;
      const updateResult = updatePatientStatus(id, status);
      return createJsonResponse(updateResult);
    } else if (action === 'updatePatientFollowUpStatus') {
      const { patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications } = requestData;
      const updateResult = updatePatientFollowUpStatus(patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications);
      return createJsonResponse(updateResult);
    } else if (action === 'fixReferralEntries') {
      const fixResult = fixExistingReferralEntries();
      return createJsonResponse(fixResult);
    } else if (action === 'migrateLegacyPatientIds') {
      const migrateResult = migrateLegacyPatientIds();
      return createJsonResponse(migrateResult);
    } else if (action === 'checkLegacyPatientIds') {
      const checkResult = checkLegacyPatientIds();
      return createJsonResponse(checkResult);
    } else if (action === 'debugPatientLookup') {
      const debugResult = debugPatientLookup();
      return createJsonResponse(debugResult);
    } else {
      console.log('Invalid action requested:', action);
      return createJsonResponse({ status: 'error', message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error in doPost:', error.message, error.stack);
    return createJsonResponse({ status: 'error', message: error.message, stack: error.stack });
  }
}

function handleAddPatient(newRowData) {
  try {
    const patientSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const uniquePatientId = generateUniquePatientId();
    const row = [
      uniquePatientId,
      newRowData.name || '',
      newRowData.fatherName || '',
      newRowData.age || '',
      newRowData.gender || '',
      newRowData.phone || '',
      newRowData.phoneBelongsTo || '',
      newRowData.campLocation || '',
      newRowData.residenceType || '',
      newRowData.address || '',
      newRowData.phc || '',
      newRowData.diagnosis || 'Epilepsy',
      newRowData.etiologySyndrome || '',
      newRowData.ageOfOnset || '',
      newRowData.seizureFrequency || '',
      newRowData.status || 'New',
      newRowData.weight || '',
      newRowData.bpSystolic || '',
      newRowData.bpDiastolic || '',
      newRowData.bpRemark || '',
      JSON.stringify(newRowData.medications) || '[]',
      newRowData.addictions || '',
      newRowData.injuryType || '',
      newRowData.treatmentStatus || '',
      newRowData.previouslyOnDrug || '',
      new Date().toISOString(),
      newRowData.followUpStatus || 'Pending',
      newRowData.adherence || 'N/A',
      newRowData.lastFollowUp || new Date().toLocaleDateString(),
      newRowData.addedBy || 'System'
    ];
    patientSheet.appendRow(row);
    return createJsonResponse({ status: 'success', message: 'Patient added successfully', patientId: uniquePatientId });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.message, stack: error.stack });
  }
}

function handleAddUser(newUserData) {
  try {
    const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
    const row = [
      newUserData.username, 
      newUserData.password, 
      newUserData.role
    ];
    userSheet.appendRow(row);
    return createJsonResponse({ status: 'success', message: 'User added successfully' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.message, stack: error.stack });
  }
}

function handleAddFollowUp(followUpData) {
  const patientId = followUpData.patientId;
  console.log('Received addFollowUp:', JSON.stringify(followUpData));
  let completionResult;
  try {
    completionResult = completeFollowUp(patientId, followUpData);
  } catch (err) {
    console.error('Error in completeFollowUp:', err.message, err.stack);
    return createJsonResponse({ status: 'error', message: 'Failed to update patient record: ' + err.message, stack: err.stack });
  }
  const followUpSheet = getOrCreateSheet(FOLLOWUPS_SHEET_NAME, [
    'FollowUpID', 'PatientID', 'CHOName', 'FollowUpDate', 'PhoneCorrect', 'CorrectedPhoneNumber',
    'FeltImprovement', 'SeizureFrequency', 'SeizureTypeChange', 'SeizureDurationChange', 'SeizureSeverityChange',
    'MedicationSource', 'MissedDose', 'TreatmentAdherence', 'MedicationChanged', 'NewMedications',
    'NewMedicalConditions', 'AdditionalQuestions', 'FollowUpDurationSeconds', 'SubmittedBy', 'ReferredToMO',
    'DrugDoseVerification', 'SubmissionDate', 'NextFollowUpDate', 'ReferralClosed'
  ]);
  const followUpId = 'FU-' + Date.now().toString().slice(-6);
  const newFollowUpRow = [
    followUpId,
    patientId,
    followUpData.choName || '',
    followUpData.followUpDate || '',
    followUpData.phoneCorrect || '',
    followUpData.correctedPhoneNumber || '',
    followUpData.feltImprovement || '',
    followUpData.seizureFrequency || '',
    followUpData.seizureTypeChange || '',
    followUpData.seizureDurationChange || '',
    followUpData.seizureSeverityChange || '',
    followUpData.medicationSource || '',
    followUpData.missedDose || '',
    followUpData.treatmentAdherence || '',
    followUpData.medicationChanged ? 'Yes' : 'No',
    JSON.stringify(followUpData.newMedications || []),
    followUpData.newMedicalConditions || '',
    followUpData.additionalQuestions || '',
    followUpData.durationInSeconds || 0,
    followUpData.submittedByUsername || 'Unknown',
    followUpData.referToMO ? 'Yes' : 'No',
    followUpData.drugDoseVerification || '',
    new Date().toISOString(),
    completionResult ? completionResult.nextFollowUpDate : '',
    followUpData.ReferralClosed || ''
  ];
  try {
    followUpSheet.appendRow(newFollowUpRow);
  } catch (err) {
    console.error('Error appending follow-up row:', err.message, err.stack);
    return createJsonResponse({ status: 'error', message: 'Failed to record follow-up: ' + err.message, stack: err.stack });
  }
  if (followUpData.ReferralClosed === 'Yes') {
    updateExistingReferralEntries(patientId);
  }
  return createJsonResponse({ status: 'success', message: 'Follow-up recorded successfully', completionStatus: completionResult ? completionResult.completionStatus : '', nextFollowUpDate: completionResult ? completionResult.nextFollowUpDate : '' });
}

// Automatic monthly follow-up renewal
function monthlyFollowUpRenewal() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  let resetCount = 0;
  
  // Find column indices using headers
  const header = values[0];
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const statusCol = header.indexOf('PatientStatus');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  
  // Start from row 2 (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const lastFollowUp = row[lastFollowUpCol] ? new Date(row[lastFollowUpCol]) : null;
    const status = row[statusCol];
    const followUpStatus = row[followUpStatusCol];
    
    if (!lastFollowUp || isNaN(lastFollowUp.getTime())) continue;
    
    // Calculate days since last follow-up
    const daysSinceLastFollowUp = Math.floor((today - lastFollowUp) / (1000 * 60 * 60 * 24));
    
    // Check if active/follow-up/new and last follow-up > 30 days ago
    const statusNorm = (status || '').trim().toLowerCase();
    if (['active', 'follow-up', 'new'].includes(statusNorm) && daysSinceLastFollowUp > 30) {
      // Set FollowUpStatus to 'Pending'
      sheet.getRange(i + 1, followUpStatusCol + 1).setValue('Pending');
      resetCount++;
    }
    
    // Check if follow-up was completed in a previous month and needs reset
    if (followUpStatus && followUpStatus.includes('Completed') && lastFollowUp) {
      const lastFollowUpDate = new Date(lastFollowUp);
      const lastFollowUpMonth = lastFollowUpDate.getMonth();
      const lastFollowUpYear = lastFollowUpDate.getFullYear();
      
      // If last follow-up was in a previous month, reset to pending
      if (lastFollowUpYear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth)) {
        sheet.getRange(i + 1, followUpStatusCol + 1).setValue('Pending');
        resetCount++;
      }
    }
  }
  
  return resetCount;
}

// Enhanced follow-up completion with next follow-up date calculation
function completeFollowUp(patientId, followUpData) {
  console.log('=== COMPLETE FOLLOW-UP DEBUG START ===');
  console.log('Received patientId:', patientId, 'Type:', typeof patientId);
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  console.log('Total rows in sheet:', values.length);
  console.log('Sheet headers:', values[0]);
  
  // Find column indices using headers
  const header = values[0];
  const idCol = header.indexOf('ID');
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  const adherenceCol = header.indexOf('Adherence');
  const phoneCol = header.indexOf('Phone');
  const medicationsCol = header.indexOf('Medications');
  
  console.log('ID column index:', idCol);
  console.log('Looking for patient with ID:', patientId);
  console.log('Available patient IDs:', values.slice(1).map(row => row[idCol]));
  console.log('Available patient ID types:', values.slice(1).map(row => typeof row[idCol]));
  
  // Find patient row with flexible ID matching
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    const currentId = values[i][idCol];
    console.log(`Row ${i}: Comparing "${currentId}" (${typeof currentId}) with "${patientId}" (${typeof patientId})`);
    
    // Try exact match first
    if (currentId === patientId) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      console.log('Found patient with exact ID match at row:', rowIndex);
      break;
    }
    // Try string comparison for legacy IDs
    if (currentId && currentId.toString() === patientId.toString()) {
      rowIndex = i + 1;
      console.log('Found patient with string ID match at row:', rowIndex);
      break;
    }
    // Try loose comparison for edge cases
    if (currentId == patientId) {
      rowIndex = i + 1;
      console.log('Found patient with loose ID match at row:', rowIndex);
      break;
    }
  }
  
  if (rowIndex === -1) {
    console.error('Patient not found. Searched for ID:', patientId);
    console.error('Available IDs:', values.slice(1).map(row => row[idCol]));
    console.error('Available ID types:', values.slice(1).map(row => typeof row[idCol]));
    console.error('=== COMPLETE FOLLOW-UP DEBUG END ===');
    throw new Error(`Patient not found with ID: ${patientId}`);
  }
  
  console.log('Found patient at row:', rowIndex);
  console.log('=== COMPLETE FOLLOW-UP DEBUG END ===');
  
  const followUpDate = new Date(followUpData.followUpDate);
  const currentMonth = followUpDate.getMonth();
  const currentYear = followUpDate.getFullYear();
  
  // Calculate next follow-up date (1 month from current follow-up)
  const nextFollowUpDate = new Date(followUpDate);
  nextFollowUpDate.setMonth(nextFollowUpDate.getMonth() + 1);
  
  // Create completion status with month info
  const completionStatus = `Completed for ${followUpDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  
  // Update patient record using header-based column indices
  sheet.getRange(rowIndex, lastFollowUpCol + 1).setValue(followUpData.followUpDate);
  sheet.getRange(rowIndex, followUpStatusCol + 1).setValue(completionStatus);
  sheet.getRange(rowIndex, adherenceCol + 1).setValue(followUpData.treatmentAdherence);
  
  // Update phone number if corrected
  if (followUpData.phoneCorrect === 'No' && followUpData.correctedPhoneNumber) {
    sheet.getRange(rowIndex, phoneCol + 1).setValue(followUpData.correctedPhoneNumber);
  }
  
  // Update medications if changed
  if (followUpData.medicationChanged && followUpData.newMedications && followUpData.newMedications.length > 0) {
    const currentMedications = values[rowIndex - 1][medicationsCol];
    let currentMedicationArray = [];
    
    try {
      currentMedicationArray = JSON.parse(currentMedications || '[]');
    } catch (e) {
      currentMedicationArray = [];
    }
    
    // Update current medications
    sheet.getRange(rowIndex, medicationsCol + 1).setValue(JSON.stringify(followUpData.newMedications));
    
    // Create medication history entry if MedicationHistory column exists
    const medicationHistoryCol = header.indexOf('MedicationHistory');
    const lastMedicationChangeDateCol = header.indexOf('LastMedicationChangeDate');
    const lastMedicationChangeByCol = header.indexOf('LastMedicationChangeBy');
    
    if (medicationHistoryCol !== -1) {
      const medicationHistoryEntry = {
        date: new Date().toISOString(),
        changedBy: followUpData.submittedByUsername || 'CHO',
        previousMedications: currentMedicationArray,
        newMedications: followUpData.newMedications,
        changeReason: 'Regular follow-up medication change'
      };
      
      let existingHistory = [];
      try {
        existingHistory = JSON.parse(values[rowIndex - 1][medicationHistoryCol] || '[]');
      } catch (e) {
        existingHistory = [];
      }
      
      existingHistory.push(medicationHistoryEntry);
      sheet.getRange(rowIndex, medicationHistoryCol + 1).setValue(JSON.stringify(existingHistory));
    }
    
    // Update last medication change tracking
    if (lastMedicationChangeDateCol !== -1) {
      sheet.getRange(rowIndex, lastMedicationChangeDateCol + 1).setValue(new Date().toISOString());
    }
    
    if (lastMedicationChangeByCol !== -1) {
      sheet.getRange(rowIndex, lastMedicationChangeByCol + 1).setValue(followUpData.submittedByUsername || 'CHO');
    }
  }
  
  console.log('Successfully updated patient record for ID:', patientId);
  
  return {
    completionStatus: completionStatus,
    nextFollowUpDate: nextFollowUpDate.toISOString().split('T')[0]
  };
}

// Helper to get or create sheet with headers
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  } 
  // Ensure headers exist
  else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  // Check if headers match, if not, add missing headers without clearing data.
  else {
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (existingHeaders.join(',') !== headers.join(',')) {
      const existingHeaderSet = new Set(existingHeaders);
      const newHeadersToAppend = headers.filter(h => !existingHeaderSet.has(h));
      if (newHeadersToAppend.length > 0) {
        sheet.getRange(1, existingHeaders.length + 1, 1, newHeadersToAppend.length).setValues([newHeadersToAppend]);
      }
    }
  }
  
  return sheet;
}

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  if (values.length < 2) {
    return [];
  }

  const headers = values[0];
  const data = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const entry = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) { // Only process if header is not empty
        // Parse medications field as JSON
        if (headers[j] === 'Medications' || headers[j] === 'NewMedications' || headers[j] === 'MedicationHistory') {
          try {
            entry[headers[j]] = JSON.parse(row[j] || '[]');
          } catch (e) {
            entry[headers[j]] = [];
          }
        } else {
          entry[headers[j]] = row[j];
        }
      }
    }
    data.push(entry);
  }
  
  return data;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Utility function to create/update spreadsheet structure
function createSpreadsheetStructure() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Create/Update Patients sheet
    let sheet = spreadsheet.getSheetByName(PATIENTS_SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(PATIENTS_SHEET_NAME);
    }
    
    const patientHeaders = [
      'ID', 'PatientName', 'FatherName', 'Age', 'Gender', 'Phone', 'PhoneBelongsTo',
      'CampLocation', 'ResidenceType', 'Address', 'PHC', 'Diagnosis', 'EtiologySyndrome', 'AgeOfOnset',
      'SeizureFrequency', 'PatientStatus', 'Weight', 'BPSystolic', 'BPDiastolic',
      'BPRemark', 'Medications', 'Addictions', 'InjuryType', 'TreatmentStatus',
      'PreviouslyOnDrug', 'RegistrationDate', 'FollowUpStatus', 'Adherence',
      'LastFollowUp', 'NextFollowUpDate', 'MedicationHistory', 'LastMedicationChangeDate', 
      'LastMedicationChangeBy', 'AddedBy'
    ];
    
    // Update headers if needed
    updateSheetHeaders(sheet, patientHeaders);
    
    // Create/Update FollowUps sheet
    sheet = spreadsheet.getSheetByName(FOLLOWUPS_SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(FOLLOWUPS_SHEET_NAME);
    }
    
    const followUpHeaders = [
      'FollowUpID', 'PatientID', 'CHOName', 'FollowUpDate', 'PhoneCorrect',
      'CorrectedPhoneNumber', 'FeltImprovement', 'SeizureFrequency',
      'SeizureTypeChange', 'SeizureDurationChange', 'SeizureSeverityChange',
      'MedicationSource', 'MissedDose', 'TreatmentAdherence', 'MedicationChanged',
      'NewMedications', 'NewMedicalConditions', 'AdditionalQuestions',
      'FollowUpDurationSeconds', 'SubmittedBy', 'ReferredToMO', 'DrugDoseVerification',
      'SubmissionDate', 'NextFollowUpDate', 'ReferralClosed'
    ];
    
    updateSheetHeaders(sheet, followUpHeaders);
    
    // Create/Update Users sheet
    sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(USERS_SHEET_NAME);
    }
    
    const userHeaders = [
      'Username', 'Password', 'Role', 'PHC', 'Name', 'Email', 'Status'
    ];
    
    updateSheetHeaders(sheet, userHeaders);
    
    // Add sample users if sheet is empty
    if (sheet.getLastRow() === 1) {
      const sampleUsers = [
        ['admin', 'admin123', 'admin', 'All PHCs', 'System Administrator', 'admin@epilepsy.com', 'Active'],
        ['phc1', 'phc123', 'phc', 'Golmuri PHC', 'PHC Staff 1', 'phc1@epilepsy.com', 'Active'],
        ['viewer', 'view123', 'viewer', 'All PHCs', 'Data Viewer', 'viewer@epilepsy.com', 'Active']
      ];
      sheet.getRange(2, 1, sampleUsers.length, userHeaders.length).setValues(sampleUsers);
    }
    
    console.log('Spreadsheet structure updated successfully');
    
  } catch (error) {
    console.error('Error creating spreadsheet structure:', error);
  }
}

// Helper function to update sheet headers
function updateSheetHeaders(sheet, headers) {
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (existingHeaders.length === 0 || existingHeaders[0] === '') {
    // Empty sheet, add all headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else {
    // Check for missing headers and add them
    const existingHeaderSet = new Set(existingHeaders);
    const newHeadersToAppend = headers.filter(h => !existingHeaderSet.has(h));
    
    if (newHeadersToAppend.length > 0) {
      const startCol = existingHeaders.length + 1;
      sheet.getRange(1, startCol, 1, newHeadersToAppend.length).setValues([newHeadersToAppend]);
      sheet.getRange(1, startCol, 1, newHeadersToAppend.length).setFontWeight('bold');
    }
  }
}

// Utility function to get system statistics
function getSystemStats() {
  try {
    const patientsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const followUpsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
    
    const stats = {
      totalPatients: patientsSheet.getLastRow() - 1,
      totalFollowUps: followUpsSheet.getLastRow() - 1,
      totalUsers: usersSheet.getLastRow() - 1,
      lastBackup: 'Live Save to Cloud',
      systemStatus: 'Operational'
    };
    
    return stats;
    
  } catch (error) {
    console.error('Error getting system stats:', error);
    return { error: error.message };
  }
}

// Test function to verify setup
function testConnection() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = spreadsheet.getSheets();
    
    console.log('Connection successful');
    console.log('Available sheets:', sheets.map(s => s.getName()));
    
    return {
      status: 'success',
      message: 'Connection successful',
      sheets: sheets.map(s => s.getName())
    };
    
  } catch (error) {
    console.error('Connection failed:', error);
    return {
      status: 'error',
      message: 'Connection failed: ' + error.message
    };
  }
}

// Get follow-up status information for patients
function getFollowUpStatusInfo() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Find column indices using headers
  const header = values[0];
  const idCol = header.indexOf('ID');
  const nameCol = header.indexOf('PatientName');
  const phcCol = header.indexOf('PHC');
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const statusCol = header.indexOf('PatientStatus');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  
  const statusInfo = [];
  
  // Start from row 2 (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const patientId = row[idCol];
    const patientName = row[nameCol];
    const phc = row[phcCol];
    const lastFollowUp = row[lastFollowUpCol] ? new Date(row[lastFollowUpCol]) : null;
    const status = row[statusCol];
    const followUpStatus = row[followUpStatusCol];
    
    if (!patientId || !patientName) continue;
    
    let isCompleted = false;
    let completionMonth = null;
    let nextFollowUpDate = null;
    let needsReset = false;
    
    if (followUpStatus && followUpStatus.includes('Completed')) {
      isCompleted = true;
      
      // Extract month from completion status
      const monthMatch = followUpStatus.match(/Completed for (.+)/);
      if (monthMatch) {
        completionMonth = monthMatch[1];
      }
      
      // Calculate next follow-up date
      if (lastFollowUp) {
        const nextDate = new Date(lastFollowUp);
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextFollowUpDate = nextDate.toISOString().split('T')[0];
        
        // Check if needs reset
        const lastFollowUpMonth = lastFollowUp.getMonth();
        const lastFollowUpYear = lastFollowUp.getFullYear();
        needsReset = lastFollowUpYear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth);
      }
    }
    
    statusInfo.push({
      patientId: patientId,
      patientName: patientName,
      phc: phc,
      status: status,
      followUpStatus: followUpStatus,
      lastFollowUp: lastFollowUp ? lastFollowUp.toISOString().split('T')[0] : null,
      isCompleted: isCompleted,
      completionMonth: completionMonth,
      nextFollowUpDate: nextFollowUpDate,
      needsReset: needsReset
    });
  }
  
  return statusInfo;
}

// PHC-specific follow-up reset function
function resetFollowUpsByPhc(phc) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  let resetCount = 0;

  // Find column indices using headers
  const header = values[0];
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const phcCol = header.indexOf('PHC');
  const statusCol = header.indexOf('PatientStatus');

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const phcMatch = row[phcCol] && row[phcCol].trim().toLowerCase() === phc.trim().toLowerCase();
    if (!phcMatch) continue;
    
    const lastFollowUp = row[lastFollowUpCol] ? new Date(row[lastFollowUpCol]) : null;
    const status = row[statusCol];
    const followUpStatus = row[followUpStatusCol];
    
    if (!lastFollowUp || isNaN(lastFollowUp.getTime())) continue;
    
    // Only reset for active/follow-up/new patients
    const statusNorm = (status || '').trim().toLowerCase();
    if (!['active', 'follow-up', 'new'].includes(statusNorm)) continue;
    
    // Check if follow-up was completed in a previous month and needs reset
    if (followUpStatus && followUpStatus.includes('Completed') && lastFollowUp) {
      const lastFollowUpMonth = lastFollowUp.getMonth();
      const lastFollowUpYear = lastFollowUp.getFullYear();
      if (lastFollowUpYear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth)) {
        sheet.getRange(i + 1, followUpStatusCol + 1).setValue('Pending');
        resetCount++;
      }
    }
  }
  return { status: 'success', resetCount: resetCount };
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
    
    console.log('Looking for patient with ID:', patientId);
    console.log('Available patient IDs:', values.slice(1).map(row => row[idCol]));
    
    // Find patient row with flexible ID matching
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      const currentId = values[i][idCol];
      // Try exact match first
      if (currentId === patientId) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        console.log('Found patient with exact ID match at row:', rowIndex);
        break;
      }
      // Try string comparison for legacy IDs
      if (currentId && currentId.toString() === patientId.toString()) {
        rowIndex = i + 1;
        console.log('Found patient with string ID match at row:', rowIndex);
        break;
      }
    }
    
    if (rowIndex === -1) {
      console.error('Patient not found. Searched for ID:', patientId);
      console.error('Available IDs:', values.slice(1).map(row => row[idCol]));
      return { status: 'error', message: `Patient not found with ID: ${patientId}` };
    }
    
    // Update patient status
    sheet.getRange(rowIndex, statusCol + 1).setValue(newStatus);
    
    console.log('Successfully updated patient status for ID:', patientId);
    return { status: 'success', message: 'Patient status updated successfully' };
    
  } catch (error) {
    console.error('Error updating patient status:', error);
    return { status: 'error', message: error.message };
  }
}

// Update patient follow-up status function
function updatePatientFollowUpStatus(patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const header = values[0];
    const idCol = header.indexOf('ID');
    const followUpStatusCol = header.indexOf('FollowUpStatus');
    const lastFollowUpCol = header.indexOf('LastFollowUp');
    const nextFollowUpDateCol = header.indexOf('NextFollowUpDate');
    const medicationsCol = header.indexOf('Medications');
    const medicationHistoryCol = header.indexOf('MedicationHistory');
    const lastMedicationChangeDateCol = header.indexOf('LastMedicationChangeDate');
    const lastMedicationChangeByCol = header.indexOf('LastMedicationChangeBy');

    console.log('Looking for patient with ID:', patientId);
    console.log('Available patient IDs:', values.slice(1).map(row => row[idCol]));

    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      const currentId = values[i][idCol];
      // Try exact match first
      if (currentId === patientId) {
        rowIndex = i + 1;
        console.log('Found patient with exact ID match at row:', rowIndex);
        break;
      }
      // Try string comparison for legacy IDs
      if (currentId && currentId.toString() === patientId.toString()) {
        rowIndex = i + 1;
        console.log('Found patient with string ID match at row:', rowIndex);
        break;
      }
    }
    
    if (rowIndex === -1) {
      console.error('Patient not found. Searched for ID:', patientId);
      console.error('Available IDs:', values.slice(1).map(row => row[idCol]));
      return { status: 'error', message: `Patient not found with ID: ${patientId}` };
    }

    // Update follow-up status
    if (followUpStatusCol !== -1) {
      sheet.getRange(rowIndex, followUpStatusCol + 1).setValue(followUpStatus);
    }
    
    // Update last follow-up date
    if (lastFollowUpCol !== -1) {
      sheet.getRange(rowIndex, lastFollowUpCol + 1).setValue(lastFollowUp);
    }
    
    // Update next follow-up date (important for patients returned from referral)
    if (nextFollowUpDateCol !== -1 && nextFollowUpDate) {
      sheet.getRange(rowIndex, nextFollowUpDateCol + 1).setValue(nextFollowUpDate);
    }

    // Handle medication updates with audit trail
    if (medications && medicationsCol !== -1) {
      const currentMedications = values[rowIndex - 1][medicationsCol];
      let currentMedicationArray = [];
      
      try {
        currentMedicationArray = JSON.parse(currentMedications || '[]');
      } catch (e) {
        currentMedicationArray = [];
      }
      
      // Update current medications
      sheet.getRange(rowIndex, medicationsCol + 1).setValue(JSON.stringify(medications));
      
      // Create medication history entry
      const medicationHistoryEntry = {
        date: new Date().toISOString(),
        changedBy: 'Medical Officer', // or get from context
        previousMedications: currentMedicationArray,
        newMedications: medications,
        changeReason: 'Referral follow-up completion'
      };
      
      // Update medication history
      if (medicationHistoryCol !== -1) {
        let existingHistory = [];
        try {
          existingHistory = JSON.parse(values[rowIndex - 1][medicationHistoryCol] || '[]');
        } catch (e) {
          existingHistory = [];
        }
        
        existingHistory.push(medicationHistoryEntry);
        sheet.getRange(rowIndex, medicationHistoryCol + 1).setValue(JSON.stringify(existingHistory));
      }
      
      // Update last medication change tracking
      if (lastMedicationChangeDateCol !== -1) {
        sheet.getRange(rowIndex, lastMedicationChangeDateCol + 1).setValue(new Date().toISOString());
      }
      
      if (lastMedicationChangeByCol !== -1) {
        sheet.getRange(rowIndex, lastMedicationChangeByCol + 1).setValue('Medical Officer');
      }
    }

    console.log('Successfully updated patient follow-up status for ID:', patientId);
    return { status: 'success', message: 'Patient follow-up status updated for next month' };
  } catch (error) {
    console.error('Error updating patient follow-up status:', error);
    return { status: 'error', message: error.message };
  }
}

// Generate unique patient ID for new patients
function generateUniquePatientId() {
  // Generate a unique patient ID: 'P-' + timestamp + 4 random digits
  const timestamp = Date.now();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `P-${timestamp}${randomDigits}`;
}

// Utility function to migrate legacy patient IDs to new format
function migrateLegacyPatientIds() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return { status: 'success', message: 'No patients to migrate', migratedCount: 0 };
    }
    
    const header = values[0];
    const idCol = header.indexOf('ID');
    
    if (idCol === -1) {
      return { status: 'error', message: 'ID column not found' };
    }
    
    let migratedCount = 0;
    
    // Check each patient ID and migrate if it's a legacy format
    for (let i = 1; i < values.length; i++) {
      const currentId = values[i][idCol];
      
      // Check if it's a legacy ID (simple number or doesn't start with 'P-')
      if (currentId && !currentId.toString().startsWith('P-')) {
        const newId = generateUniquePatientId();
        sheet.getRange(i + 1, idCol + 1).setValue(newId);
        migratedCount++;
        console.log(`Migrated patient ID from ${currentId} to ${newId}`);
      }
    }
    
    return { 
      status: 'success', 
      message: `Successfully migrated ${migratedCount} legacy patient IDs to new format`,
      migratedCount: migratedCount 
    };
    
  } catch (error) {
    console.error('Error migrating legacy patient IDs:', error);
    return { status: 'error', message: error.message };
  }
}

// Utility function to check for legacy patient IDs
function checkLegacyPatientIds() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return { status: 'success', message: 'No patients found', legacyCount: 0 };
    }
    
    const header = values[0];
    const idCol = header.indexOf('ID');
    
    if (idCol === -1) {
      return { status: 'error', message: 'ID column not found' };
    }
    
    let legacyCount = 0;
    const legacyIds = [];
    
    // Check each patient ID
    for (let i = 1; i < values.length; i++) {
      const currentId = values[i][idCol];
      
      // Check if it's a legacy ID (simple number or doesn't start with 'P-')
      if (currentId && !currentId.toString().startsWith('P-')) {
        legacyCount++;
        legacyIds.push(currentId);
      }
    }
    
    return { 
      status: 'success', 
      message: `Found ${legacyCount} legacy patient IDs`,
      legacyCount: legacyCount,
      legacyIds: legacyIds
    };
    
  } catch (error) {
    console.error('Error checking legacy patient IDs:', error);
    return { status: 'error', message: error.message };
  }
}

// Update existing referral entries when a referral is closed
function updateExistingReferralEntries(patientId) {
  try {
    const followUpSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
    const dataRange = followUpSheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return 0; // No data to update
    }
    
    const header = values[0];
    const patientIdCol = header.indexOf('PatientID');
    const referredToMOCol = header.indexOf('ReferredToMO');
    const referralClosedCol = header.indexOf('ReferralClosed');
    
    if (patientIdCol === -1 || referredToMOCol === -1 || referralClosedCol === -1) {
      console.error('Required columns not found in FollowUps sheet');
      return 0;
    }
    
    let updatedCount = 0;
    
    // Update all existing referral entries for this patient
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const currentPatientId = row[patientIdCol];
      const isReferred = row[referredToMOCol] === 'Yes';
      const isAlreadyClosed = row[referralClosedCol] === 'Yes';
      
      // If this is a referral entry for the same patient that's not already closed
      if (currentPatientId === patientId && isReferred && !isAlreadyClosed) {
        followUpSheet.getRange(i + 1, referralClosedCol + 1).setValue('Yes');
        updatedCount++;
      }
    }
    
    console.log(`Updated ${updatedCount} referral entries for patient ${patientId}`);
    return updatedCount;
    
  } catch (error) {
    console.error('Error updating existing referral entries:', error);
    return 0;
  }
}

// Utility function to fix existing referral entries (can be called manually if needed)
function fixExistingReferralEntries() {
  try {
    const followUpSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
    const dataRange = followUpSheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return { status: 'success', message: 'No referral entries to fix', fixedCount: 0 };
    }
    
    const header = values[0];
    const patientIdCol = header.indexOf('PatientID');
    const referredToMOCol = header.indexOf('ReferredToMO');
    const referralClosedCol = header.indexOf('ReferralClosed');
    
    if (patientIdCol === -1 || referredToMOCol === -1 || referralClosedCol === -1) {
      return { status: 'error', message: 'Required columns not found in FollowUps sheet' };
    }
    
    let fixedCount = 0;
    const patientsWithClosedReferrals = new Set();
    
    // First pass: identify patients who have any closed referral
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const patientId = row[patientIdCol];
      const isReferred = row[referredToMOCol] === 'Yes';
      const isClosed = row[referralClosedCol] === 'Yes';
      
      if (patientId && isReferred && isClosed) {
        patientsWithClosedReferrals.add(patientId);
      }
    }
    
    // Second pass: update all referral entries for patients with closed referrals
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const patientId = row[patientIdCol];
      const isReferred = row[referredToMOCol] === 'Yes';
      const isAlreadyClosed = row[referralClosedCol] === 'Yes';
      
      if (patientId && isReferred && !isAlreadyClosed && patientsWithClosedReferrals.has(patientId)) {
        followUpSheet.getRange(i + 1, referralClosedCol + 1).setValue('Yes');
        fixedCount++;
      }
    }
    
    return { 
      status: 'success', 
      message: `Fixed ${fixedCount} referral entries for ${patientsWithClosedReferrals.size} patients`,
      fixedCount: fixedCount,
      patientsFixed: patientsWithClosedReferrals.size
    };
    
  } catch (error) {
    console.error('Error fixing existing referral entries:', error);
    return { status: 'error', message: error.message };
  }
}

// Debug function to test patient ID lookup
function debugPatientLookup() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return { status: 'success', message: 'No patient data found', data: [] };
    }
    
    const header = values[0];
    const idCol = header.indexOf('ID');
    
    if (idCol === -1) {
      return { status: 'error', message: 'ID column not found in sheet' };
    }
    
    const patientData = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const patientId = row[idCol];
      const patientName = row[header.indexOf('PatientName')] || 'Unknown';
      
      patientData.push({
        row: i + 1,
        id: patientId,
        idType: typeof patientId,
        name: patientName,
        idString: patientId ? patientId.toString() : 'null'
      });
    }
    
    return { 
      status: 'success', 
      message: `Found ${patientData.length} patients`,
      data: patientData,
      headers: header
    };
    
  } catch (error) {
    console.error('Error in debugPatientLookup:', error);
    return { status: 'error', message: error.message };
  }
} 