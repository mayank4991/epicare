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

/**
 * Creates a JSON response with proper headers for CORS
 * @param {object} data - The data to send in the response
 * @return {object} The response object
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '3600'
    });
}
/**
 * Logs user activity to the UserActivityLogs sheet.
 * @param {object} e - The event parameter from doGet or doPost.
 * @param {string} username - The username performing the action.
 * @param {string} action - A description of the action (e.g., 'User Login').
 * @param {object} details - Any additional details to log.
 */
/**
 * Logs user activity to the UserActivityLogs sheet.
 * @param {object} e - The event parameter from doGet or doPost.
 * @param {string} username - The username performing the action.
 * @param {string} action - A description of the action (e.g., 'User Login Success').
 * @param {object} details - Any additional details to log.
 */
function logUserActivity(e, username, action, details = {}) {
  try {
    const logsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('UserActivityLogs');
    if (!logsSheet) return; // Fail silently if sheet doesn't exist

    let ipAddress = 'Unknown';
    let userAgent = 'Unknown';

    // This logic attempts to get the user's IP address and browser info.
    if (e && e.parameter) {
        ipAddress = e.parameter.remoteAddress || e.parameter.forwardedFor || e.parameter['X-Forwarded-For'] || 'Unknown';
        userAgent = e.parameter.userAgent || e.parameter['User-Agent'] || 'Unknown';
    }

    const timestamp = new Date();
    const rowData = [
      timestamp,
      username,
      action,
      ipAddress,
      userAgent,
      JSON.stringify(details)
    ];
    logsSheet.appendRow(rowData);
  } catch (error) {
    console.error("Failed to log user activity:", error);
  }
}