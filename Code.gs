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
    } else if (action === 'getFollowUps') {
      data = getSheetData(FOLLOWUPS_SHEET_NAME);
    } else if (action === 'getConfig') {
      data = getConfigData();
    } else if (action === 'resetFollowUpsByPhc') {
      const phc = e.parameter.phc;
      return createJsonResponse(resetFollowUpsByPhc(phc));
    } else {
      return createJsonResponse({ status: 'error', message: 'Invalid GET action' });
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
  let requestData = {};
  try {
    if (e.postData && e.postData.type === 'application/json') {
      requestData = JSON.parse(e.postData.contents);
    } else {
      requestData = e.parameter;
    }
    const action = requestData.action;
    
    if (action === 'login') {
      return createJsonResponse(verifyUserLogin(requestData));
    } else if (action === 'addPatient') {
      const newRowData = requestData.data;
      
      // VALIDATE THE DATA FIRST
      const validation = validatePatientData(newRowData);
      if (!validation.isValid) {
        // If validation fails, return an error and do not proceed
        return createJsonResponse({ status: 'error', message: validation.message });
      }
      
      const patientSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
      
      // Generate unique patient ID for new patients
      const uniquePatientId = generateUniquePatientId();
      
      // Create row array in column order - Updated to match actual sheet structure
      const row = [
        uniquePatientId, // Use the generated unique ID
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
        new Date().toISOString(), // RegistrationDate
        newRowData.followUpStatus || 'Pending',
        newRowData.adherence || 'N/A',
        newRowData.lastFollowUp || new Date().toLocaleDateString(), // LastFollowUp
        newRowData.addedBy || 'System' // AddedBy
      ];
      patientSheet.appendRow(row);
      return createJsonResponse({ 
        status: 'success', 
        message: 'Patient added successfully',
        patientId: uniquePatientId
      });

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
      // Debug logging
      try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
        const dataRange = sheet.getDataRange();
        const values = dataRange.getValues();
        const header = values[0];
        const idCol = header.indexOf('ID');
        const allIds = values.slice(1).map(row => row[idCol]);
        console.log('[addFollowUp] Incoming patientId:', patientId);
        console.log('[addFollowUp] All patient IDs in sheet:', allIds);
      } catch (logErr) {
        console.error('[addFollowUp] Error logging patient IDs:', logErr);
      }
      try {
        // Use enhanced follow-up completion function
        const completionResult = completeFollowUp(patientId, followUpData);
        // 2. Store detailed follow-up in FollowUps sheet
        const followUpSheet = getOrCreateSheet(FOLLOWUPS_SHEET_NAME, [
          'FollowUpID', 'PatientID', 'CHOName', 'FollowUpDate', 'PhoneCorrect', 'CorrectedPhoneNumber',
          'FeltImprovement', 'SeizureFrequency', 'SeizureTypeChange',
          'SeizureDurationChange', 'SeizureSeverityChange', 'MedicationSource',
          'MissedDose', 'TreatmentAdherence', 'MedicationChanged', 'NewMedications',
          'NewMedicalConditions', 'AdditionalQuestions', 'FollowUpDurationSeconds', 
          'SubmittedBy', 'ReferredToMO', 'DrugDoseVerification', 'SubmissionDate', 'NextFollowUpDate',
          'ReferralClosed'
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
          completionResult.nextFollowUpDate, // NextFollowUpDate
          followUpData.ReferralClosed || '' // ReferralClosed
        ];
        followUpSheet.appendRow(newFollowUpRow);
        // If this is a referral follow-up that closes the referral, update existing referral entries
        if (followUpData.ReferralClosed === 'Yes') {
          updateExistingReferralEntries(patientId);
        }
        return createJsonResponse({ 
          status: 'success', 
          message: 'Follow-up recorded successfully',
          completionStatus: completionResult.completionStatus,
          nextFollowUpDate: completionResult.nextFollowUpDate
        });
      } catch (error) {
        console.error('[addFollowUp] Error:', error);
        return createJsonResponse({ 
          status: 'error', 
          message: error.message, 
          stack: error.stack 
        });
      }
      
    } else if (action === 'resetFollowUps') {
      const resetResult = monthlyFollowUpRenewal();
      return createJsonResponse({ 
        status: 'success', 
        message: 'Follow-ups reset for the month',
        resetCount: resetResult.resetCount
      });
    } else {
      return createJsonResponse({ status: 'error', message: 'Invalid POST action' });
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
  
  return { status: 'success', resetCount: resetCount };
}

// Enhanced follow-up completion with next follow-up date calculation
function completeFollowUp(patientId, followUpData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Find column indices using headers
  const header = values[0];
  const idCol = header.indexOf('ID');
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  const adherenceCol = header.indexOf('Adherence');
  const phoneCol = header.indexOf('Phone');
  const medicationsCol = header.indexOf('Medications');
  
  // Find patient row
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][idCol] === patientId) {
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
  
  // Update patient record using header-based column indices
  sheet.getRange(rowIndex, lastFollowUpCol + 1).setValue(followUpData.followUpDate);
  sheet.getRange(rowIndex, followUpStatusCol + 1).setValue(completionStatus);
  sheet.getRange(rowIndex, adherenceCol + 1).setValue(followUpData.treatmentAdherence);
  // Update NextFollowUpDate column
  const nextFollowUpDateCol = header.indexOf('NextFollowUpDate');
  if (nextFollowUpDateCol !== -1) {
    sheet.getRange(rowIndex, nextFollowUpDateCol + 1).setValue(nextFollowUpDate.toISOString().split('T')[0]);
  }
  
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
    
    // Find patient row
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === patientId) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
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

    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === patientId) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) {
      return { status: 'error', message: 'Patient not found' };
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

    return { status: 'success', message: 'Patient follow-up status updated for next month' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

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

async function handleLoginSuccess(username, role) {
    // ... existing code ...
    // After setting currentUserRole, currentUserName, and userData:
    const user = userData.find(u => u.Username === username && u.Role === role);
    const userPhc = user && user.PHC ? user.PHC : null;
    const phcDropdownContainer = document.getElementById('phcFollowUpSelectContainer');
    const phcDropdown = document.getElementById('phcFollowUpSelect');

    if (role === 'phc' && userPhc) {
        // Hide dropdown, auto-render for assigned PHC
        phcDropdownContainer.style.display = 'none';
        renderFollowUpPatientList(userPhc);
    } else if (role === 'phc') {
        // Show dropdown for multi-PHC user
        phcDropdownContainer.style.display = '';
        phcDropdown.value = '';
        renderFollowUpPatientList('');
    }
    // ... rest of your code ...
}

function getUserPHC() {
    if (currentUserRole === 'admin') return null;
    const user = userData.find(u => u.Username === currentUserName && u.Role === currentUserRole);
    return user && user.PHC ? user.PHC : null;
}

// Add this new function to your Google Apps Script
function verifyUserLogin(credentials) {
  const { username, password, role } = credentials;
  const usersData = getSheetData(USERS_SHEET_NAME);
  
  const validUser = usersData.find(user => 
    user.Username === username &&
    user.Password.toString() === password.toString() &&
    user.Role === role &&
    user.Status === 'Active' // Added a check for active status
  );

  if (validUser) {
    // IMPORTANT: Never send the password back to the client.
    delete validUser.Password; 
    return { status: 'success', userData: validUser };
  } else {
    return { status: 'error', message: 'Invalid username, password, or role.' };
  }
}

// Add validation function for patient data
function validatePatientData(data) {
  const errors = [];
  if (!data.name || data.name.trim() === '') {
    errors.push('Patient Name is required.');
  }
  if (!data.age || isNaN(Number(data.age)) || Number(data.age) <= 0) {
    errors.push('A valid Age is required.');
  }
  if (!data.gender) {
    errors.push('Gender is required.');
  }
  if (!data.phone || !/^\d{10}$/.test(data.phone)) {
    errors.push('A valid 10-digit Phone Number is required.');
  }
  if (!data.phc) {
    errors.push('PHC location is required.');
  }
  
  // You can add more checks for every field

  if (errors.length > 0) {
    // If there are errors, return them.
    return { isValid: false, message: errors.join(' ') };
  }
  
  return { isValid: true };
}

// Function to get configuration data from Config sheet
function getConfigData() {
  try {
    const configSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Config');
    if (!configSheet) {
      // If Config sheet doesn't exist, return default configuration
      return {
        phcNames: [
          "Golmuri PHC", "Bistupur PHC", "Sakchi PHC", "Kadma PHC", "Telco PHC",
          "Sonari PHC", "Jugsalai PHC", "Burdwan Colony PHC", "Burma Mines PHC", "Mango PHC",
          "Bagbera PHC", "Adityapur PHC", "Gamharia PHC", "Chandil PHC", "Ghatshila PHC",
          "Potka PHC", "Baharagora PHC", "Dhalbhumgarh PHC", "Musabani PHC", "Patamda PHC"
        ]
      };
    }
    
    const dataRange = configSheet.getDataRange();
    const values = dataRange.getValues();
    const header = values[0];
    
    const config = {};
    
    // Process each column in the Config sheet
    for (let i = 0; i < header.length; i++) {
      const columnName = header[i];
      const columnData = values.slice(1).map(row => row[i]).filter(cell => cell !== '' && cell !== null);
      
      if (columnName === 'PHCNames') {
        config.phcNames = columnData;
      } else {
        // For any other configuration columns
        config[columnName] = columnData;
      }
    }
    
    return config;
  } catch (error) {
    console.error('Error getting config data:', error);
    // Return default configuration if there's an error
    return {
      phcNames: [
        "Golmuri PHC", "Bistupur PHC", "Sakchi PHC", "Kadma PHC", "Telco PHC",
        "Sonari PHC", "Jugsalai PHC", "Burdwan Colony PHC", "Burma Mines PHC", "Mango PHC",
        "Bagbera PHC", "Adityapur PHC", "Gamharia PHC", "Chandil PHC", "Ghatshila PHC",
        "Potka PHC", "Baharagora PHC", "Dhalbhumgarh PHC", "Musabani PHC", "Patamda PHC"
      ]
    };
  }
} 