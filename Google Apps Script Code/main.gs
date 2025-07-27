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

// Cache for PHC names to improve performance
let phcNamesCache = null;
let phcNamesCacheTimestamp = null;
const PHC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;

    if (action === 'getPatients') {
      data = getSheetData(PATIENTS_SHEET_NAME);
      // Apply user access filtering if user info is provided
      if (e.parameter.username && e.parameter.role && e.parameter.assignedPHC) {
        data = filterDataByUserAccess(data, e.parameter.username, e.parameter.role, e.parameter.assignedPHC);
      }
    } else if (action === 'getUsers') {
      data = getSheetData(USERS_SHEET_NAME);
    } else if (action === 'getFollowUps') {
      data = getSheetData(FOLLOWUPS_SHEET_NAME);
      // Apply user access filtering if user info is provided
      if (e.parameter.username && e.parameter.role && e.parameter.assignedPHC) {
        data = filterFollowUpsByUserAccess(data, e.parameter.username, e.parameter.role, e.parameter.assignedPHC);
      }
    } else if (action === 'getPHCs') {
      data = getSheetData(PHCS_SHEET_NAME);
    } else if (action === 'getActivePHCNames') {
      // New clean API for active PHC names only
      data = getActivePHCNames();
    } else if (action === 'resetFollowUpsByPhc') {
      const phc = e.parameter.phc;
      return createJsonResponse(resetFollowUpsByPhc(phc));
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
      // Generate unique patient ID for new patients
      const uniquePatientId = generateUniquePatientId();
      // Create row array in column order - Updated to match actual sheet structure
      const row = [
        uniquePatientId, // Use the generated unique ID
        newRowData.PatientName ||
      newRowData.name || '',
        newRowData.fatherName ||
      '',
        newRowData.age || '',
        newRowData.gender ||
      '',
        newRowData.phone || '',
        newRowData.phoneBelongsTo ||
      '',
        newRowData.campLocation || '',
        newRowData.residenceType ||
      '',
        newRowData.address || '',
        newRowData.phc ||
      '',
        newRowData.diagnosis || 'Epilepsy',
        newRowData.etiologySyndrome ||
      '',
        newRowData.ageOfOnset || '',
        newRowData.seizureFrequency ||
      '',
        newRowData.status || 'New',
        newRowData.weight ||
      '',
        newRowData.bpSystolic || '',
        newRowData.bpDiastolic ||
      '',
        newRowData.bpRemark || '',
        JSON.stringify(newRowData.medications) ||
      '[]',
        newRowData.addictions || '',
        newRowData.injuryType ||
      '',
        newRowData.treatmentStatus || '',
        newRowData.previouslyOnDrug ||
      '',
        new Date().toISOString(), // RegistrationDate
        newRowData.followUpStatus ||
      'Pending',
        newRowData.adherence || 'N/A',
        newRowData.lastFollowUp ||
      new Date().toLocaleDateString(), // LastFollowUp
        newRowData.addedBy ||
      'System' // AddedBy
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
        newUserData.role,
        newUserData.phc ||
      '',
        newUserData.name || '',
        newUserData.email ||
      '',
        newUserData.status || 'Active'
      ];
      userSheet.appendRow(row);
      return createJsonResponse({ status: 'success', message: 'User added successfully' });

    } else if (action === 'addPHC') {
      const phcSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
      const newPHCData = requestData.data;
      const row = [
        newPHCData.phcCode ||
      '',
        newPHCData.phcName || '',
        newPHCData.district ||
      'East Singhbhum',
        newPHCData.block ||
      '',
        newPHCData.address || '',
        newPHCData.contactPerson ||
      '',
        newPHCData.phone || '',
        newPHCData.email ||
      '',
        newPHCData.status ||
      'Active',
        new Date().toISOString() // DateAdded
      ];
      phcSheet.appendRow(row);
      // Clear PHC names cache since we added a new PHC
      clearPHCNamesCache();
      return createJsonResponse({ status: 'success', message: 'PHC added successfully' });

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
        'SubmittedBy', 'ReferredToMO', 'DrugDoseVerification', 'SubmissionDate', 'NextFollowUpDate',
        'ReferralClosed', 'UpdateWeightAge', 'CurrentWeight', 'CurrentAge', 'WeightAgeUpdateReason', 'WeightAgeUpdateNotes'

      ]);

      // Generate unique follow-up ID
      const followUpId = 'FU-' + Date.now().toString().slice(-6);
      const newFollowUpRow = [
        followUpId,
        patientId,
        followUpData.choName,
        followUpData.followUpDate,
        followUpData.phoneCorrect,
        followUpData.correctedPhoneNumber ||
      '',
        followUpData.feltImprovement,
        followUpData.seizureFrequency,
        followUpData.seizureTypeChange ||
      '',
        followUpData.seizureDurationChange || '',
        followUpData.seizureSeverityChange ||
      '',
        followUpData.medicationSource ||
      '',
        followUpData.missedDose,
        followUpData.treatmentAdherence,
        followUpData.medicationChanged ?
      'Yes' : 'No',
        JSON.stringify(followUpData.newMedications || []),
        followUpData.newMedicalConditions ||
      '',
        followUpData.additionalQuestions || '',
        followUpData.durationInSeconds ||
      0,
        followUpData.submittedByUsername || 'Unknown',
        followUpData.referToMO ?
      'Yes' : 'No',
        followUpData.drugDoseVerification ||
      '', // New field for drug dose verification
        new Date().toISOString(), // SubmissionDate
        completionResult.nextFollowUpDate, // NextFollowUpDate
        followUpData.ReferralClosed ||
      '', // ReferralClosed
        followUpData.updateWeightAge ||
      '',
        followUpData.currentWeight || '',
        followUpData.currentAge ||
      '',
        followUpData.weightAgeUpdateReason || '',
        followUpData.weightAgeUpdateNotes ||
      ''
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
    } else if (action === 'updatePatientStatus') {
      const patientId = requestData.id;
      const newStatus = requestData.status;
      const updateResult = updatePatientStatus(patientId, newStatus);
      return createJsonResponse(updateResult);
    } else if (action === 'updatePatientFollowUpStatus') {
      const patientId = requestData.patientId;
      const followUpStatus = requestData.followUpStatus;
      const lastFollowUp = requestData.lastFollowUp;
      const nextFollowUpDate = requestData.nextFollowUpDate;
      const medications = requestData.medications;
      const updateResult = updatePatientFollowUpStatus(patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications);
      return createJsonResponse(updateResult);
    } else if (action === 'fixReferralEntries') {
      const fixResult = fixExistingReferralEntries();
      return createJsonResponse(fixResult);
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