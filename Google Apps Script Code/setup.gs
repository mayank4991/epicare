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
      'LastMedicationChangeBy', 'WeightAgeHistory', 'LastWeightAgeUpdateDate', 'LastWeightAgeUpdateBy', 'AddedBy'
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
      'SubmissionDate', 'NextFollowUpDate', 'ReferralClosed', 'UpdateWeightAge', 'CurrentWeight', 'CurrentAge', 'WeightAgeUpdateReason', 'WeightAgeUpdateNotes'
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
      createSampleUsers();
    }

    // Create/Update PHCs sheet
    createPHCsSheetWithSampleData();
    
    // Create/Update UserActivityLogs sheet
    sheet = spreadsheet.getSheetByName('UserActivityLogs');
    if (!sheet) {
      sheet = spreadsheet.insertSheet('UserActivityLogs');
    }
    
    const activityLogHeaders = [
      'Timestamp', 'Username', 'Action', 'IPAddress', 'UserAgent', 'Details'
    ];
    updateSheetHeaders(sheet, activityLogHeaders);
  } catch (error) {
    console.error('Error creating spreadsheet structure:', error);
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
      totalPHCs: phcsSheet ?
        phcsSheet.getLastRow() - 1 : 0,
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
