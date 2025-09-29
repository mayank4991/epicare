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

// Update patient status function with enhanced validation and referral logic
function updatePatientStatus(patientId, newStatus, referralDetails = null) {
  try {
    // Input validation
    if (!patientId || typeof patientId !== 'string') {
      throw new Error('Invalid patient ID');
    }
    
    const validStatuses = ['Active', 'Inactive', 'Referred to MO', 'Referred to Tertiary'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const header = values[0];
    
    // Find column indices using headers
    const idCol = header.indexOf('ID');
    const statusCol = header.indexOf('PatientStatus');
    const lastUpdatedCol = header.indexOf('LastStatusUpdate');
    const notesCol = header.indexOf('Notes');
    const referredByCol = header.indexOf('ReferredBy');
    const referralNotesCol = header.indexOf('ReferralNotes');
    
    // Find patient row
    let rowIndex = -1;
    let currentStatus = '';
    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === patientId) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        currentStatus = values[i][statusCol] || '';
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Patient not found');
    }
    
    // All status transitions are allowed in this simplified version
    // You can add more specific transition rules later if needed
    
    // Prepare updates
    const updates = [];
    const now = new Date();
    
    // Update status and timestamp
    updates.push({
      range: sheet.getRange(rowIndex, statusCol + 1),
      value: newStatus
    });
    
    if (lastUpdatedCol !== -1) {
      updates.push({
        range: sheet.getRange(rowIndex, lastUpdatedCol + 1),
        value: now
      });
    }
    
    // Handle referral specific logic for both referral statuses
    if ((newStatus === 'Referred to MO' || newStatus === 'Referred to Tertiary') && referralDetails) {
      if (referredByCol !== -1 && referralDetails.referredBy) {
        updates.push({
          range: sheet.getRange(rowIndex, referredByCol + 1),
          value: referralDetails.referredBy
        });
      }
      
      if (referralNotesCol !== -1 && referralDetails.notes) {
        const existingNotes = sheet.getRange(rowIndex, referralNotesCol + 1).getValue() || '';
        const newNote = `[${now.toISOString()}] Referral: ${referralDetails.notes}\n${existingNotes}`;
        updates.push({
          range: sheet.getRange(rowIndex, referralNotesCol + 1),
          value: newNote
        });
      }
    }
    
    // Add status change to notes
    if (notesCol !== -1) {
      const existingNotes = sheet.getRange(rowIndex, notesCol + 1).getValue() || '';
      const statusNote = `[${now.toISOString()}] Status changed from ${currentStatus || 'N/A'} to ${newStatus}`;
      updates.push({
        range: sheet.getRange(rowIndex, notesCol + 1),
        value: `${statusNote}\n${existingNotes}`.trim()
      });
    }
    
    // Apply all updates in a single batch
    updates.forEach(update => update.range.setValue(update.value));
    
    // If this is a referral, you might want to trigger additional actions here
    if (newStatus === 'Referred') {
      // Example: Send email notification, create task, etc.
      // sendReferralNotification(patientId, referralDetails);
    }
    
    return { 
      status: 'success', 
      message: `Patient status updated to ${newStatus} successfully`,
      timestamp: now.toISOString()
    };
    
  } catch (error) {
    console.error('Error updating patient status:', error);
    return { 
      status: 'error', 
      message: error.message || 'Failed to update patient status',
      details: error.stack
    };
  }
}