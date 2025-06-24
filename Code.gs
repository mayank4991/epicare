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
const PATIENTS_SHEET_NAME = 'Patients';
const USERS_SHEET_NAME = 'Users';
const FOLLOWUPS_SHEET_NAME = 'FollowUps'; // New sheet for detailed follow-up records

function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;

    if (action === 'getPatients') {
      data = getSheetData(PATIENTS_SHEET_NAME);
    } else if (action === 'getUsers') {
      data = getSheetData(USERS_SHEET_NAME);
    } else if (action === 'getFollowUps') {
      data = getSheetData(FOLLOWUPS_SHEET_NAME);
    } else {
      return createJsonResponse({ status: 'error', message: 'Invalid action' });
    }

    return createJsonResponse({ status: 'success', data: data });
  } catch (error) {
    return createJsonResponse({ 
      status: 'error', 
      message: error.message, 
      stack: error.stack 
    });
  }
}

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    
    if (action === 'addPatient') {
      const patientSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
      const newRowData = requestData.data;
      
      // Create row array in column order - Updated to match actual sheet structure
      const row = [
        newRowData.id || '',
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
        new Date().toISOString(), // RegistrationDate
        newRowData.followUpStatus || 'Pending',
        newRowData.adherence || 'N/A',
        newRowData.lastFollowUp || new Date().toLocaleDateString(), // LastFollowUp
        newRowData.addedBy || 'System' // AddedBy
      ];
      patientSheet.appendRow(row);
      return createJsonResponse({ status: 'success', message: 'Patient added successfully' });

    } else if (action === 'addUser') {
      const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
      const newUserData = requestData.data;
      const row = [
        newUserData.username, 
        newUserData.password, 
        newUserData.role
      ];
      userSheet.appendRow(row);
      return createJsonResponse({ status: 'success', message: 'User added successfully' });
      
    } else if (action === 'addFollowUp') {
      const followUpData = requestData.data;
      const patientId = followUpData.patientId;
      
      // Use enhanced follow-up completion function
      const completionResult = completeFollowUp(patientId, followUpData);
      
      // 2. Store detailed follow-up in FollowUps sheet
      const followUpSheet = getOrCreateSheet(FOLLOWUPS_SHEET_NAME, [
        'FollowUpID', 'PatientID', 'CHOName', 'FollowUpDate', 'PhoneCorrect', 'CorrectedPhoneNumber',
        'FeltImprovement', 'SeizureFrequency', 'SeizureTypeChange',
        'SeizureDurationChange', 'SeizureSeverityChange', 'MedicationSource',
        'MissedDose', 'TreatmentAdherence', 'MedicationChanged', 'NewMedications',
        'NewMedicalConditions', 'AdditionalQuestions', 'FollowUpDurationSeconds', 
        'SubmittedBy', 'ReferredToMO', 'DrugDoseVerification', 'SubmissionDate', 'NextFollowUpDate'
      ]);
      
      // Generate unique follow-up ID
      const followUpId = 'FU-' + Date.now().toString().slice(-6);
      
      const newFollowUpRow = [
        followUpId,
        patientId,
        followUpData.choName,
        followUpData.followUpDate,
        followUpData.phoneCorrect,
        followUpData.correctedPhoneNumber || '',
        followUpData.feltImprovement,
        followUpData.seizureFrequency,
        followUpData.seizureTypeChange || '',
        followUpData.seizureDurationChange || '',
        followUpData.seizureSeverityChange || '',
        followUpData.medicationSource || '',
        followUpData.missedDose,
        followUpData.treatmentAdherence,
        followUpData.medicationChanged ? 'Yes' : 'No',
        JSON.stringify(followUpData.newMedications || []),
        followUpData.newMedicalConditions || '',
        followUpData.additionalQuestions || '',
        followUpData.durationInSeconds || 0,
        followUpData.submittedByUsername || 'Unknown',
        followUpData.referToMO ? 'Yes' : 'No',
        followUpData.drugDoseVerification || '', // New field for drug dose verification
        new Date().toISOString(), // SubmissionDate
        completionResult.nextFollowUpDate // NextFollowUpDate
      ];
      followUpSheet.appendRow(newFollowUpRow);
      
      return createJsonResponse({ 
        status: 'success', 
        message: 'Follow-up recorded successfully',
        completionStatus: completionResult.completionStatus,
        nextFollowUpDate: completionResult.nextFollowUpDate
      });
      
    } else if (action === 'resetFollowUps') {
      const resetResult = monthlyFollowUpRenewal();
      return createJsonResponse({ 
        status: 'success', 
        message: 'Follow-ups reset for the month',
        resetCount: resetResult
      });
    } else if (action === 'getFollowUpStatus') {
      const statusInfo = getFollowUpStatusInfo();
      return createJsonResponse({ 
        status: 'success', 
        data: statusInfo 
      });
    } else {
      return createJsonResponse({ status: 'error', message: 'Invalid action' });
    }
  } catch (error) {
    return createJsonResponse({ 
      status: 'error', 
      message: error.message, 
      stack: error.stack 
    });
  }
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
  
  // Start from row 2 (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // Column AA (index 27) for LastFollowUp, Column O (index 14) for PatientStatus, Column Z (index 25) for FollowUpStatus
    const lastFollowUp = row[27] ? new Date(row[27]) : null;
    const status = row[14];
    const followUpStatus = row[25];
    
    if (!lastFollowUp || isNaN(lastFollowUp.getTime())) continue;
    
    // Calculate days since last follow-up
    const daysSinceLastFollowUp = Math.floor((today - lastFollowUp) / (1000 * 60 * 60 * 24));
    
    // Check if active and last follow-up > 30 days ago
    if ((status === 'Active' || status === 'Follow-up') && daysSinceLastFollowUp > 30) {
      // Set FollowUpStatus to 'Pending' in Column Z (index 25, column number 26)
      sheet.getRange(i + 1, 26).setValue('Pending');
      resetCount++;
    }
    
    // Check if follow-up was completed in a previous month and needs reset
    if (followUpStatus && followUpStatus.includes('Completed') && lastFollowUp) {
      const lastFollowUpDate = new Date(lastFollowUp);
      const lastFollowUpMonth = lastFollowUpDate.getMonth();
      const lastFollowUpYear = lastFollowUpDate.getFullYear();
      
      // If last follow-up was in a previous month, reset to pending
      if (lastFollowUpYear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth)) {
        sheet.getRange(i + 1, 26).setValue('Pending');
        resetCount++;
      }
    }
  }
  
  return resetCount;
}

// Enhanced follow-up completion with next follow-up date calculation
function completeFollowUp(patientId, followUpData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Find patient row (ID is in column 0)
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === patientId) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error('Patient not found');
  }
  
  const followUpDate = new Date(followUpData.followUpDate);
  const currentMonth = followUpDate.getMonth();
  const currentYear = followUpDate.getFullYear();
  
  // Calculate next follow-up date (1 month from current follow-up)
  const nextFollowUpDate = new Date(followUpDate);
  nextFollowUpDate.setMonth(nextFollowUpDate.getMonth() + 1);
  
  // Create completion status with month info
  const completionStatus = `Completed for ${followUpDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  
  // Update patient record - corrected column indices
  const lastFollowUpCol = 28; // Column AC (29th column, 0-indexed)
  const followUpStatusCol = 26; // Column AA (27th column, 0-indexed)
  const adherenceCol = 27; // Column AB (28th column, 0-indexed)
  const phoneCol = 6; // Column G (7th column, 0-indexed)
  const medicationsCol = 20; // Column U (21st column, 0-indexed)
  
  sheet.getRange(rowIndex, lastFollowUpCol).setValue(followUpData.followUpDate);
  sheet.getRange(rowIndex, followUpStatusCol).setValue(completionStatus);
  sheet.getRange(rowIndex, adherenceCol).setValue(followUpData.treatmentAdherence);
  
  // Update phone number if corrected
  if (followUpData.phoneCorrect === 'No' && followUpData.correctedPhoneNumber) {
    sheet.getRange(rowIndex, phoneCol).setValue(followUpData.correctedPhoneNumber);
  }
  
  // Update medications if changed
  if (followUpData.medicationChanged && followUpData.newMedications && followUpData.newMedications.length > 0) {
    sheet.getRange(rowIndex, medicationsCol).setValue(JSON.stringify(followUpData.newMedications));
  }
  
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
        if (headers[j] === 'Medications' || headers[j] === 'NewMedications') {
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
  return ContentService
    .createTextOutput(JSON.stringify(data))
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
      'CampLocation', 'ResidenceType', 'Address', 'PHC', 'Diagnosis', 'AgeOfOnset',
      'SeizureFrequency', 'PatientStatus', 'Weight', 'BPSystolic', 'BPDiastolic',
      'BPRemark', 'Medications', 'Addictions', 'InjuryType', 'TreatmentStatus',
      'PreviouslyOnDrug', 'LastFollowUp', 'FollowUpStatus', 'Adherence',
      'RegistrationDate', 'AddedBy'
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
      'SubmissionDate', 'NextFollowUpDate'
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
  
  const statusInfo = [];
  
  // Start from row 2 (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const patientId = row[0];
    const patientName = row[1];
    const phc = row[10];
    const lastFollowUp = row[27] ? new Date(row[27]) : null; // Column AC (index 27)
    const status = row[14];
    const followUpStatus = row[25]; // Column Z (index 25)
    
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