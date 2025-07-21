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
const FOLLOWUPS_SHEET_NAME = 'FollowUps';
const PHCS_SHEET_NAME = 'PHCs';
const MEDICINE_STOCK_SHEET_NAME = 'MedicineStock';
const USER_ACTIVITY_SHEET_NAME = 'UserActivityLogs'; // Sheet for tracking user activities

// Cache for PHC names to improve performance
let phcNamesCache = null;
let phcNamesCacheTimestamp = null;
const PHC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

function createSpreadsheetStructure() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Create/Update User Activity Logs sheet
    let activitySheet = spreadsheet.getSheetByName(USER_ACTIVITY_SHEET_NAME);
    if (!activitySheet) {
      activitySheet = spreadsheet.insertSheet(USER_ACTIVITY_SHEET_NAME);
    }
    
    const userActivityHeaders = [
      'Timestamp', 'Username', 'Action', 'Details', 'IP Address', 'User Agent', 'PHC', 'Role'
    ];
    
    updateSheetHeaders(activitySheet, userActivityHeaders);
    
    // Create/Update Patients sheet
    let patientsSheet = spreadsheet.getSheetByName(PATIENTS_SHEET_NAME);
    if (!patientsSheet) {
      patientsSheet = spreadsheet.insertSheet(PATIENTS_SHEET_NAME);
    }
    
    const patientHeaders = [
      'ID', 'PatientName', 'FatherName', 'Age', 'Gender', 'Phone', 'PhoneBelongsTo',
      'CampLocation', 'ResidenceType', 'Address', 'PHC', 'Diagnosis', 'EtiologySyndrome', 'AgeOfOnset',
      'SeizureFrequency', 'PatientStatus', 'Weight', 'BPSystolic', 'BPDiastolic',
      'BPRemark', 'Medications', 'Addictions', 'InjuryType', 'TreatmentStatus',
      'PreviouslyOnDrug', 'RegistrationDate', 'FollowUpStatus', 'Adherence',
      'LastFollowUp', 'NextFollowUpDate', 'MedicationHistory', 'LastMedicationChangeDate', 
      'LastMedicationChangeBy', 'WeightAgeHistory', 'LastWeightAgeUpdateDate', 'LastWeightAgeUpdateBy', 'AddedBy'
    ];
    
    // Update headers if needed
    updateSheetHeaders(patientsSheet, patientHeaders);
    
    // Create/Update FollowUps sheet
    let followUpsSheet = spreadsheet.getSheetByName(FOLLOWUPS_SHEET_NAME);
    if (!followUpsSheet) {
      followUpsSheet = spreadsheet.insertSheet(FOLLOWUPS_SHEET_NAME);
    }
    
    const followUpHeaders = [
      'FollowUpID', 'PatientID', 'CHOName', 'FollowUpDate', 'PhoneCorrect',
      'CorrectedPhoneNumber', 'FeltImprovement', 'SeizureFrequency',
      'SeizureTypeChange', 'SeizureDurationChange', 'SeizureSeverityChange',
      'MedicationSource', 'MissedDose', 'TreatmentAdherence', 'MedicationChanged',
      'NewMedications', 'NewMedicalConditions', 'AdditionalQuestions',
      'FollowUpDurationSeconds', 'SubmittedBy', 'ReferredToMO', 'DrugDoseVerification',
      'SubmissionDate', 'NextFollowUpDate', 'ReferralClosed', 'UpdateWeightAge', 'CurrentWeight', 'CurrentAge', 'WeightAgeUpdateReason', 'WeightAgeUpdateNotes'
    ];
    
    updateSheetHeaders(followUpsSheet, followUpHeaders);
    
    // Create/Update Users sheet
    let usersSheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    if (!usersSheet) {
      usersSheet = spreadsheet.insertSheet(USERS_SHEET_NAME);
    }
    
    const userHeaders = [
      'Username', 'Password', 'Role', 'PHC', 'Name', 'Email', 'Status'
    ];
    
    updateSheetHeaders(usersSheet, userHeaders);
    
    // Add sample users if sheet is empty
    if (usersSheet.getLastRow() === 1) {
      const sampleUserData = [
        ['admin', 'admin123', 'master_admin', '', 'Master Administrator', 'master@epicare.com', 'Active'],
        ['golmuri', 'mo123', 'phc_admin', 'Golmuri PHC', 'Dr. Sharma - MO', 'golmuri.mo@epicare.com', 'Active'],
        ['parsudih', 'mo123', 'phc_admin', 'Parsudih PHC', 'Dr. Kumar - MO', 'parsudih.mo@epicare.com', 'Active'],
        ['golmuri_cho', 'cho123', 'phc', 'Golmuri PHC', 'CHO Golmuri', 'golmuri.cho@epicare.com', 'Active'],
        ['parsudih_cho', 'cho123', 'phc', 'Parsudih PHC', 'CHO Parsudih', 'parsudih.cho@epicare.com', 'Active'],
        ['viewer', 'view123', 'viewer', '', 'Data Viewer', 'viewer@epicare.com', 'Active']
      ];
      
      usersSheet.getRange(2, 1, sampleUserData.length, sampleUserData[0].length).setValues(sampleUserData);
      console.log('Added sample user data to Users sheet.');
    }
    
    // Create/Update PHCs sheet
    let phcsSheet = spreadsheet.getSheetByName(PHCS_SHEET_NAME);
    if (!phcsSheet) {
      phcsSheet = spreadsheet.insertSheet(PHCS_SHEET_NAME);
    }
    
    const phcHeaders = [
      'PHCCode', 'PHCName', 'District', 'Block', 'Address', 'ContactPerson', 'Phone', 'Email', 'Status', 'DateAdded'
    ];
    
    updateSheetHeaders(phcsSheet, phcHeaders);
    
    // Add sample PHC data if sheet is empty
    if (phcsSheet.getLastRow() === 1) {
      const samplePHCData = [
        ['PHC001', 'Golmuri PHC', 'East Singhbhum', 'Golmuri', 'Golmuri, Jamshedpur', 'Dr. Sharma', '9876543210', 'golmuri.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC002', 'Parsudih PHC', 'East Singhbhum', 'Parsudih', 'Parsudih, Jamshedpur', 'Dr. Kumar', '9876543211', 'parsudih.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC003', 'Jugsalai PHC', 'East Singhbhum', 'Jugsalai', 'Jugsalai, Jamshedpur', 'Dr. Singh', '9876543212', 'jugsalai.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC004', 'Kadma PHC', 'East Singhbhum', 'Kadma', 'Kadma, Jamshedpur', 'Dr. Verma', '9876543213', 'kadma.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC005', 'Mango PHC', 'East Singhbhum', 'Mango', 'Mango, Jamshedpur', 'Dr. Gupta', '9876543214', 'mango.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC006', 'Bagbera PHC', 'East Singhbhum', 'Bagbera', 'Bagbera, Jamshedpur', 'Dr. Mishra', '9876543215', 'bagbera.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC007', 'Chas PHC', 'East Singhbhum', 'Chas', 'Chas, Bokaro', 'Dr. Pandey', '9876543216', 'chas.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC008', 'Ghatshila PHC', 'East Singhbhum', 'Ghatshila', 'Ghatshila', 'Dr. Jha', '9876543217', 'ghatshila.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC009', 'Musabani PHC', 'East Singhbhum', 'Musabani', 'Musabani', 'Dr. Rai', '9876543218', 'musabani.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC010', 'Patamda PHC', 'East Singhbhum', 'Patamda', 'Patamda', 'Dr. Sinha', '9876543219', 'patamda.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC011', 'Potka PHC', 'East Singhbhum', 'Potka', 'Potka', 'Dr. Thakur', '9876543220', 'potka.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
        ['PHC012', 'Dhalbhumgarh PHC', 'East Singhbhum', 'Dhalbhumgarh', 'Dhalbhumgarh', 'Dr. Chandra', '9876543221', 'dhalbhumgarh.phc@jharkhand.gov.in', 'Active', new Date().toISOString()]
      ];
      
      phcsSheet.getRange(2, 1, samplePHCData.length, samplePHCData[0].length).setValues(samplePHCData);
      console.log('Added sample PHC data to PHCs sheet.');
    }
    
    // Create/Update MedicineStock sheet
    let medicineStockSheet = spreadsheet.getSheetByName(MEDICINE_STOCK_SHEET_NAME);
    if (!medicineStockSheet) {
      medicineStockSheet = spreadsheet.insertSheet(MEDICINE_STOCK_SHEET_NAME);
    }
    
    const medicineStockHeaders = [
      'Stock ID', 'PHC Name', 'Medicine Name', 'Dosage', 'Quantity', 'Unit',
      'Last Updated', 'Updated By', 'Next Restock Date', 'Minimum Stock Level',
      'Is Available', 'Notes', 'Created At', 'Updated At', 'Created By',
      'Updated By', 'Is Deleted', 'Deleted At', 'Deleted By'
    ];
    
    updateSheetHeaders(medicineStockSheet, medicineStockHeaders);
    
  } catch (error) {
    console.error('Error creating spreadsheet structure:', error);
  }
}

// Helper function to update sheet headers
function updateSheetHeaders(sheet, headers) {
  try {
    // Check if sheet is empty or has no data
    if (sheet.getLastRow() === 0) {
      // Empty sheet, add all headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      return;
    }
    
    // Get existing headers
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) {
      // Sheet exists but has no columns, add all headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      return;
    }
    
    const existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    // Filter out empty headers
    const cleanExistingHeaders = existingHeaders.filter(h => h && h.toString().trim() !== '');
    
    if (cleanExistingHeaders.length === 0) {
      // No valid headers found, add all headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      return;
    }
    
    // Check for missing headers and add them
    const existingHeaderSet = new Set(cleanExistingHeaders);
    const newHeadersToAppend = headers.filter(h => !existingHeaderSet.has(h));
    
    if (newHeadersToAppend.length > 0) {
      const startCol = cleanExistingHeaders.length + 1;
      sheet.getRange(1, startCol, 1, newHeadersToAppend.length).setValues([newHeadersToAppend]);
      sheet.getRange(1, startCol, 1, newHeadersToAppend.length).setFontWeight('bold');
      console.log(`Added ${newHeadersToAppend.length} new headers: ${newHeadersToAppend.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error updating sheet headers:', error);
    // Fallback: try to add all headers
    try {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      console.log('Fallback: Added all headers');
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw error;
    }
  }
}

// Utility function to get system statistics
function getSystemStats() {
  try {
    const patientsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const followUpsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
    const phcsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
    
    const stats = {
      totalPatients: patientsSheet.getLastRow() - 1,
      totalFollowUps: followUpsSheet.getLastRow() - 1,
      totalUsers: usersSheet.getLastRow() - 1,
      totalPHCs: phcsSheet ? phcsSheet.getLastRow() - 1 : 0,
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
    console.log(`updateExistingReferralEntries called for patientId: ${patientId}, type: ${typeof patientId}`);
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
    let totalReferralEntries = 0;
    
    console.log(`Searching for referral entries for patient ${patientId}...`);
    
    // Update all existing referral entries for this patient
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const currentPatientId = row[patientIdCol];
      const isReferred = row[referredToMOCol] === 'Yes';
      const isAlreadyClosed = row[referralClosedCol] === 'Yes';
      
      if (isReferred) {
        totalReferralEntries++;
        console.log(`Found referral entry: PatientID=${currentPatientId}, ReferredToMO=${row[referredToMOCol]}, ReferralClosed=${row[referralClosedCol]}`);
      }
      
      // If this is a referral entry for the same patient that's not already closed
      // Use robust comparison to handle type mismatches
      const currentPatientIdStr = String(currentPatientId).trim();
      const patientIdStr = String(patientId).trim();
      
      if (currentPatientIdStr === patientIdStr && isReferred && !isAlreadyClosed) {
        followUpSheet.getRange(i + 1, referralClosedCol + 1).setValue('Yes');
        updatedCount++;
        console.log(`Updated referral entry for patient ${patientId} at row ${i + 1}`);
      }
      
      // Also update any entry that has ReferralClosed=Yes but ReferredToMO=No (referral closure entry)
      if (currentPatientIdStr === patientIdStr && !isReferred && isAlreadyClosed) {
        // This is a referral closure entry, ensure it's properly marked
        console.log(`Found referral closure entry for patient ${patientId} at row ${i + 1}`);
      }
    }
    
    console.log(`Total referral entries found: ${totalReferralEntries}, Updated: ${updatedCount}`);
    return updatedCount;
    
  } catch (error) {
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
      console.error('Required columns not found in FollowUps sheet');
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

function getUserPHC() {
    if (currentUserRole === 'admin') return null;
    const user = userData.find(u => u.Username === currentUserName && u.Role === currentUserRole);
    return user && user.PHC ? user.PHC : null;
}

/**
 * Logs user activity to the UserActivityLogs sheet
 * @param {string} action - The action performed (e.g., 'LOGIN', 'LOGOUT', 'UPDATE_STOCK')
 * @param {string} details - Additional details about the action
 * @param {string} ipAddress - User's IP address
 * @param {string} userAgent - User's browser/device info
 */
function logUserActivity(action, details = '', ipAddress = '', userAgent = '') {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(USER_ACTIVITY_SHEET_NAME);
    
    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = spreadsheet.insertSheet(USER_ACTIVITY_SHEET_NAME);
      const headers = ['Timestamp', 'Username', 'Action', 'Details', 'IP Address', 'User Agent', 'PHC', 'Role'];
      sheet.appendRow(headers);
    }
    
    const user = userData.find(u => u.Username === currentUserName) || {};
    
    const rowData = [
      new Date(),
      currentUserName || 'system',
      action,
      details,
      ipAddress,
      userAgent,
      user.PHC || 'N/A',
      currentUserRole || 'unknown'
    ];
    
    sheet.appendRow(rowData);
    
    // Auto-resize columns for better readability
    const lastColumn = sheet.getLastColumn();
    for (let i = 1; i <= lastColumn; i++) {
      sheet.autoResizeColumn(i);
    }
    
    return true;
  } catch (error) {
    console.error('Error logging user activity:', error);
    return false;
  }
}

/**
 * Gets the user's login history
 * @param {string} username - Username to get history for (optional, defaults to current user)
 * @param {number} limit - Maximum number of records to return (default: 50)
 * @return {Array} Array of login records
 */
function getUserLoginHistory(username = null, limit = 50) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(USER_ACTIVITY_SHEET_NAME);
    
    if (!sheet) {
      console.error('User Activity Log sheet not found');
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; // No data or just headers
    
    const headers = data[0].map(h => h.toLowerCase());
    const timestampIndex = headers.indexOf('timestamp');
    const usernameIndex = headers.indexOf('username');
    const actionIndex = headers.indexOf('action');
    const ipIndex = headers.indexOf('ip address');
    
    if (timestampIndex === -1 || usernameIndex === -1 || actionIndex === -1) {
      console.error('Required columns not found in UserActivityLogs');
      return [];
    }
    
    const targetUser = username || currentUserName;
    const loginRecords = [];
    
    // Start from 1 to skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[usernameIndex] === targetUser && row[actionIndex] === 'LOGIN') {
        loginRecords.push({
          timestamp: row[timestampIndex],
          ipAddress: ipIndex !== -1 ? row[ipIndex] : '',
          userAgent: headers.includes('user agent') ? row[headers.indexOf('user agent')] : ''
        });
        
        if (loginRecords.length >= limit) break;
      }
    }
    
    return loginRecords;
  } catch (error) {
    console.error('Error getting user login history:', error);
    return [];
  }
}

// Handle GET requests
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'getPHCs':
        return getPHCs();
      case 'getUsers':
        return getUsers();
      case 'getPatients':
        return getPatients();
      case 'getFollowUps':
        return getFollowUps();
      case 'getMedicineStock':
        return getMedicineStock();
      case 'getUserLoginHistory':
        return getUserLoginHistory(e.parameter.username, e.parameter.limit);
      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            status: 'error',
            message: 'Invalid action: ' + action
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Server error: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
// API function to get PHCs
function getPHCs() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(PHCS_SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'PHCs sheet not found'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const phcs = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const phc = {};
      
      for (let j = 0; j < headers.length; j++) {
        phc[headers[j]] = row[j];
      }
      
      // Only include active PHCs
      if (phc.Status === 'Active') {
        phcs.push({
          code: phc.PHCCode,
          name: phc.PHCName,
          district: phc.District,
          block: phc.Block,
          address: phc.Address,
          contactPerson: phc.ContactPerson,
          phone: phc.Phone,
          email: phc.Email
        });
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        phcs: phcs
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting PHCs:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Error fetching PHCs: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// API function to get Users
function getUsers() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Users sheet not found'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const users = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const user = {};
      
      for (let j = 0; j < headers.length; j++) {
        // Don't include password in response
        if (headers[j] !== 'Password') {
          user[headers[j]] = row[j];
        }
      }
      
      if (user.Status === 'Active') {
        users.push(user);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        users: users
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting users:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Error fetching users: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// API function to get Patients
function getPatients() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(PATIENTS_SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Patients sheet not found'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const patients = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const patient = {};
      
      for (let j = 0; j < headers.length; j++) {
        patient[headers[j]] = row[j];
      }
      
      patients.push(patient);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        patients: patients
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting patients:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Error fetching patients: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// API function to get FollowUps
function getFollowUps() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(FOLLOWUPS_SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'FollowUps sheet not found'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const followUps = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const followUp = {};
      
      for (let j = 0; j < headers.length; j++) {
        followUp[headers[j]] = row[j];
      }
      
      followUps.push(followUp);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        followUps: followUps
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting follow-ups:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Error fetching follow-ups: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// API function to get Medicine Stock
function getMedicineStock() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(MEDICINE_STOCK_SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Medicine Stock sheet not found'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const stock = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const stockItem = {};
      
      for (let j = 0; j < headers.length; j++) {
        stockItem[headers[j]] = row[j];
      }
      
      // Only include non-deleted items
      if (!stockItem['Is Deleted'] || stockItem['Is Deleted'] !== 'Yes') {
        stock.push(stockItem);
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        stock: stock
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting medicine stock:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Error fetching medicine stock: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to set up the complete spreadsheet structure
function setupCompleteSystem() {
  try {
    console.log('Starting complete system setup...');
    
    // Create all sheet structures
    createSpreadsheetStructure();
    console.log('✓ Sheet structures created');
    
    // Test connection
    const connectionTest = testConnection();
    console.log('✓ Connection test:', connectionTest);
    
    // Get system stats
    const stats = getSystemStats();
    console.log('✓ System stats:', stats);
    
    console.log('Complete system setup finished successfully!');
    return {
      status: 'success',
      message: 'Complete system setup finished successfully!',
      connectionTest: connectionTest,
      stats: stats
    };
    
  } catch (error) {
    console.error('Error in complete system setup:', error);
    return {
      status: 'error',
      message: 'Error in complete system setup: ' + error.message
    };
  }
}