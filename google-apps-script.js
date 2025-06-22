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
      // Create row array in column order
      const row = [
        newRowData.id || '',
        newRowData.name || '',
        newRowData.fatherName || '',
        newRowData.age || '',
        newRowData.gender || '',
        newRowData.phone || '',
        newRowData.phoneBelongsTo || '',
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
        newRowData.injuries || '',
        newRowData.addictions || '',
        newRowData.treatmentStatus || '',
        newRowData.previouslyOnDrug || '',
        newRowData.lastFollowUp || new Date().toLocaleDateString(),
        newRowData.followUpStatus || 'Pending',
        newRowData.adherence || '100%'
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
      // 1. Update patient record
      const patientSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
      const dataRange = patientSheet.getDataRange();
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
        return createJsonResponse({ status: 'error', message: 'Patient not found' });
      }
      
      // Update patient record
      patientSheet.getRange(rowIndex, 23).setValue(followUpData.followUpDate); // LastFollowUp
      patientSheet.getRange(rowIndex, 24).setValue("Completed"); // FollowUpStatus
      patientSheet.getRange(rowIndex, 25).setValue(followUpData.treatmentAdherence); // Adherence
      
      // Update phone number if corrected
      if (followUpData.phoneCorrect === 'No' && followUpData.correctedPhoneNumber) {
        patientSheet.getRange(rowIndex, 6).setValue(followUpData.correctedPhoneNumber); // Phone column
      }
      
      // 2. Store detailed follow-up in FollowUps sheet
      const followUpSheet = getOrCreateSheet(FOLLOWUPS_SHEET_NAME, [
        'PatientID', 'CHOName', 'FollowUpDate', 'PhoneCorrect', 'CorrectedPhoneNumber',
        'FeltImprovement', 'SeizureFrequency', 'SeizureTypeChange',
        'SeizureDurationChange', 'SeizureSeverityChange', 'MedicationSource',
        'MissedDose', 'TreatmentAdherence', 'NewMedicalConditions', 
        'AdditionalQuestions', 'FollowUpDurationSeconds', 'SubmittedBy', 'ResolutionStatus', 'ReferredToMO'
      ]);
      
      const resolutionStatus = followUpData.phoneCorrect === 'No' && !followUpData.correctedPhoneNumber ? 'Number Wrong - Unresolved' : 'Completed';

      const newFollowUpRow = [
        patientId,
        followUpData.choName,
        followUpData.followUpDate,
        followUpData.phoneCorrect,
        followUpData.correctedPhoneNumber || '',
        followUpData.feltImprovement,
        followUpData.seizureFrequencySinceLastVisit,
        followUpData.seizureTypeChange,
        followUpData.seizureDurationChange,
        followUpData.seizureSeverityChange,
        followUpData.medicationSource,
        followUpData.missedDose,
        followUpData.treatmentAdherence,
        followUpData.newMedicalConditions,
        followUpData.additionalQuestions,
        followUpData.durationInSeconds || -1,
        followUpData.submittedByUsername || 'Unknown',
        resolutionStatus,
        followUpData.referToMO ? 'Yes' : 'No'
      ];
      followUpSheet.appendRow(newFollowUpRow);
      
      return createJsonResponse({ status: 'success', message: 'Follow-up recorded successfully' });
    } else if (action === 'resetFollowUps') {
      monthlyFollowUpRenewal();
      return createJsonResponse({ status: 'success', message: 'Follow-ups reset for the month' });
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
  
  // Start from row 2 (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const lastFollowUp = row[22] ? new Date(row[22]) : null; // LastFollowUp date (column W)
    const status = row[12]; // PatientStatus (column M)
    
    if (!lastFollowUp || isNaN(lastFollowUp.getTime())) continue;
    // Calculate days since last follow-up
    const daysSinceLastFollowUp = Math.floor((today - lastFollowUp) / (1000 * 60 * 60 * 24));
    // Check if active and last follow-up > 30 days ago
    if ((status === 'Active' || status === 'Follow-up') && daysSinceLastFollowUp > 30) {
      // Set to pending (column X = index 23)
      sheet.getRange(i + 1, 24).setValue('Pending');
    }
  }
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
        if (headers[j] === 'Medications') {
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