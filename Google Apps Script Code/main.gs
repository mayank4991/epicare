/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 3.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-1.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Epicare Main Constants and Core Functions
 */

// General constants
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// VAPID Token Cache (Performance: Avoid repeated fetches from PropertiesService)
let vapidCache = {
  privateKey: null,
  publicKey: null,
  tokenGenerators: new Map(),
  cacheTime: 0,
  CACHE_DURATION: 3600000
};

// Logging helper - All logs use Logger for Apps Script visibility
const LOG = {
  info: (msg, data) => Logger.log('[INFO] ' + msg + (data ? ' ' + JSON.stringify(data) : '')),
  warn: (msg, data) => Logger.log('[WARN] ' + msg + (data ? ' ' + JSON.stringify(data) : '')),
  error: (msg, data) => Logger.log('[ERROR] ' + msg + (data ? ' ' + JSON.stringify(data) : '')),
  debug: (msg, data) => Logger.log('[DEBUG] ' + msg + (data ? ' ' + JSON.stringify(data) : ''))
};

/**
 * Extracts client IP address from the event object
 * Works with both direct GET requests and form-encoded POST requests
 * @param {object} e - The event parameter from doGet or doPost
 * @returns {string} The client IP address or 'Unknown'
 */
function getClientIP(e) {
  if (!e) return 'Unknown';
  
  // Method 1: Check clientAddress (works with direct requests)
  if (e.clientAddress) {
    return e.clientAddress;
  }
  
  // Method 2: Check request headers for X-Forwarded-For (proxy/load balancer)
  if (e.parameter) {
    if (e.parameter['X-Forwarded-For']) return e.parameter['X-Forwarded-For'].split(',')[0].trim();
    if (e.parameter.forwardedFor) return e.parameter.forwardedFor;
    if (e.parameter.remoteAddress) return e.parameter.remoteAddress;
  }
  
  // Method 3: Check request headers from the incoming request
  try {
    if (e.contextPath || e.parameter) {
      const headers = e.parameter || {};
      if (headers['CF-Connecting-IP']) return headers['CF-Connecting-IP']; // Cloudflare
      if (headers['x-original-forwarded-for']) return headers['x-original-forwarded-for'];
    }
  } catch (headerErr) {
    // Silently continue if header extraction fails
  }
  
  return 'Unknown';
}

// Sheet name constants
const PATIENTS_SHEET_NAME = 'Patients';
const USERS_SHEET_NAME = 'Users';
const FOLLOWUPS_SHEET_NAME = 'FollowUps';
const PHCS_SHEET_NAME = 'PHCs';
const ADMIN_SETTINGS_SHEET_NAME = 'AdminSettings';
const PUSH_SUBSCRIPTIONS_SHEET_NAME = 'PushSubscriptions';

// CDS-specific constants
const MAIN_CDS_CONFIG_PROPERTY_KEY = 'CDS_CONFIG';  // Renamed to avoid conflict
const MAIN_CDS_KB_PROPERTY_KEY = 'CDS_KNOWLEDGE_BASE'; // Renamed to avoid conflict 
const MAIN_CDS_VERSION = '2.2.0'; // Renamed to avoid conflict
const MAIN_CDS_KB_SHEET_NAME = 'CDS KB'; // Renamed to avoid conflict
const MAIN_CDS_AUDIT_SHEET_NAME = 'CDS Audit'; // Renamed to avoid conflict

// Cache for PHC names to improve performance
let phcNamesCache = null;
let phcNamesCacheTimestamp = null;
const PHC_CACHE_DURATION = 6 * 60 * 1000; // 5 minutes in milliseconds

// Session management configuration
const SESSION_PREFIX = 'SESSION_';
const SESSION_DURATION_MINUTES = 90;
const PUBLIC_ACTIONS = ['login', 'changePassword'];

function getSessionStore() {
  return PropertiesService.getScriptProperties();
}

function cleanupExpiredSessions() {
  try {
    const props = getSessionStore().getProperties();
    const now = Date.now();
    Object.keys(props).forEach(key => {
      if (key.indexOf(SESSION_PREFIX) !== 0) return;
      try {
        const data = JSON.parse(props[key] || '{}');
        if (!data || !data.expiresAt || now > data.expiresAt) {
          getSessionStore().deleteProperty(key);
        }
      } catch (err) {
        getSessionStore().deleteProperty(key);
      }
    });
  } catch (err) {
    console.warn('Session cleanup failed:', err);
  }
}

function createSession(username, role, assignedPHC, email, name) {
  cleanupExpiredSessions();
  const token = Utilities.getUuid().replace(/-/g, '');
  const expiresAt = Date.now() + SESSION_DURATION_MINUTES * 60 * 1000;
  const sessionData = {
    username: username || '',
    role: role || '',
    assignedPHC: assignedPHC || '',
    email: email || '',
    name: name || '',
    expiresAt: expiresAt
  };
  getSessionStore().setProperty(SESSION_PREFIX + token, JSON.stringify(sessionData));
  return { token, expiresAt, sessionData };
}

function refreshSession(token, sessionData) {
  if (!token || !sessionData) return;
  sessionData.expiresAt = Date.now() + SESSION_DURATION_MINUTES * 60 * 1000;
  getSessionStore().setProperty(SESSION_PREFIX + token, JSON.stringify(sessionData));
}

function getSessionData(token) {
  if (!token) return null;
  const raw = getSessionStore().getProperty(SESSION_PREFIX + token);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || !data.expiresAt || Date.now() > data.expiresAt) {
      getSessionStore().deleteProperty(SESSION_PREFIX + token);
      return null;
    }
    refreshSession(token, data);
    return data;
  } catch (err) {
    getSessionStore().deleteProperty(SESSION_PREFIX + token);
    return null;
  }
}

function extractAuthToken(e, body) {
  if (body) {
    if (body.sessionToken) return body.sessionToken;
    if (body.token) return body.token;
    if (body.authToken) return body.authToken;
  }
  if (e && e.parameter) {
    if (e.parameter.sessionToken) return e.parameter.sessionToken;
    if (e.parameter.token) return e.parameter.token;
    if (e.parameter.authToken) return e.parameter.authToken;
  }
  return null;
}

function getAuthContextFromRequest(e, body) {
  const token = extractAuthToken(e, body);
  if (!token) return null;
  const session = getSessionData(token);
  if (!session) return null;
  return {
    token,
    username: session.username || '',
    role: session.role || '',
    assignedPHC: session.assignedPHC || '',
    email: session.email || '',
    name: session.name || ''
  };
}

function throwUnauthorized() {
  const err = new Error('Authentication required');
  err.code = 'unauthorized';
  throw err;
}

function requireAuthContext(e, body) {
  const ctx = getAuthContextFromRequest(e, body);
  if (!ctx) {
    throwUnauthorized();
  }
  return ctx;
}

function isPublicAction(action) {
  return PUBLIC_ACTIONS.indexOf(action) !== -1;
}

/**
 * Format a Date object (or date-parsable string) as DD/MM/YYYY
 * @param {Date|string} d
 * @returns {string} Formatted date
 */
function formatDateDDMMYYYY(d) {
  if (!d) return '';
  // If already a Date, use it directly
  var dt;
  if (d instanceof Date) {
    dt = d;
  } else {
    // CRITICAL: Use parseDateFlexible to correctly interpret DD/MM/YYYY strings
    // Do NOT use new Date(d) as it interprets "06/01/2026" as MM/DD/YYYY (June 1st)
    dt = parseDateFlexible(d);
  }
  if (!dt || isNaN(dt.getTime())) return '';
  var dd = ('0' + dt.getDate()).slice(-2);
  var mm = ('0' + (dt.getMonth() + 1)).slice(-2);
  var yyyy = dt.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

/**
 * Get a Date object for writing to Google Sheets.
 * CRITICAL: Google Sheets auto-interprets string dates like "06/01/2026" using locale settings
 * (often MM/DD/YYYY in US locale), causing "06/01/2026" to be stored as June 1st instead of Jan 6th.
 * 
 * Solution: Write actual JavaScript Date objects to sheets, not formatted strings.
 * Google Sheets will store the correct date value regardless of locale.
 * 
 * @param {Date|string} d - Date object or date string in DD/MM/YYYY or ISO format
 * @returns {Date|string} - Date object for sheet storage, or empty string if invalid
 */
function getDateForSheet(d) {
  if (!d) return '';
  var dt;
  if (d instanceof Date) {
    dt = d;
  } else {
    dt = parseDateFlexible(d);
  }
  if (!dt || isNaN(dt.getTime())) return '';
  // Return actual Date object - Google Sheets will store it correctly
  return dt;
}

/**
 * Parse a flexible date string into a Date object.
 * Accepts ISO (yyyy-mm-dd or full ISO) and dd/mm/yyyy formats.
 * Returns null if parsing fails.
 */
function parseDateFlexible(dateInput) {
  if (!dateInput && dateInput !== 0) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  var s = String(dateInput).trim();
  if (!s) return null;

  // ISO yyyy-mm-dd or full ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    var iso = s.length === 10 ? s + 'T00:00:00' : s;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/yyyy
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    var day = parseInt(m[1], 10);
    var month = parseInt(m[2], 10) - 1;
    var year = parseInt(m[3], 10);
    var d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // dd-mm-yyyy (with dashes instead of slashes)
  var mDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mDash) {
    var day = parseInt(mDash[1], 10);
    var month = parseInt(mDash[2], 10) - 1;
    var year = parseInt(mDash[3], 10);
    var d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Do NOT use native Date parsing as fallback - it interprets ambiguous dates as MM/DD/YYYY
  // which causes "02/01/2026" to be read as February 1st instead of January 2nd
  return null;
}

function getPatientById(patientId) {
  const patients = getSheetData(PATIENTS_SHEET_NAME);
  // Use == for loose comparison to handle potential type differences between sheet and input
  return patients.find(patient => patient.ID == patientId);
}

function doGet(e) {
  let result = null;
  try {
    const action = e && e.parameter ? e.parameter.action : null;
    if (!action) {
      result = { status: 'error', message: 'Invalid or missing action' };
      return createCorsJsonResponse(result);
    }

    const authContext = isPublicAction(action) ? null : requireAuthContext(e, null);
    const actingUser = authContext ? authContext.username : '';
    const actingRole = authContext ? authContext.role : '';
    const actingPHC = authContext ? authContext.assignedPHC : '';

    // Action handlers
    if (action === 'getActivePHCNames') {
      result = { status: 'success', data: getActivePHCNames() };
    } else if (action === 'getUsers') {
      // Return users but strip out any sensitive fields (Password, PasswordHash, PasswordSalt, SessionToken, tokens, secrets)
      try {
        var users = getSheetData(USERS_SHEET_NAME) || [];
        var sensitiveKeys = ['password', 'passwordhash', 'passwordsalt', 'sessiontoken', 'token', 'secret', 'apikey', 'privatekey'];
        var filteredUsers = users.map(function(u) {
          var out = {};
          Object.keys(u||{}).forEach(function(k) {
            var lower = (k || '').toString().toLowerCase();
            var isSensitive = sensitiveKeys.some(function(s) { return lower.indexOf(s) !== -1; });
            if (!isSensitive) {
              out[k] = u[k];
            }
          });
          return out;
        });
        result = { status: 'success', data: filteredUsers };
      } catch (err) {
        result = { status: 'error', message: 'Failed to fetch users: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getPatients') {
      // Read all patients then apply server-side access control to avoid leaking PII
      var allPatients = getSheetData(PATIENTS_SHEET_NAME);
      // Apply role/PHC filtering if username/role params are provided
      try {
        var filtered = filterDataByUserAccess(allPatients, actingUser, actingRole, actingPHC);
        // Normalize patient objects to provide canonical ID strings and PatientStatus values
        try {
          filtered = filtered.map(function(p) { return normalizePatientForClient(p); });
        } catch (normErr) {
          // If normalization fails, proceed with raw filtered data but log error
          console.warn('Patient normalization failed:', normErr);
        }
        // De-identify for viewer role
        if (actingRole === 'viewer') {
          filtered = filtered.map(function(p) {
            return Object.assign({}, p, { PatientName: 'REDACTED', Phone: '', patientAddress: '' });
          });
        }
        result = { status: 'success', data: filtered };
      } catch (err) {
        result = { status: 'error', message: 'Failed to filter patients: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getFollowUps') {
  var allFollowUps = getSheetData(FOLLOWUPS_SHEET_NAME);
      try {
        var filteredFUs = filterFollowUpsByUserAccess(allFollowUps, actingUser, actingRole, actingPHC);
        result = { status: 'success', data: filteredFUs };
      } catch (err) {
        result = { status: 'error', message: 'Failed to filter follow-ups: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getPHCs') {
      result = { status: 'success', data: getSheetData(PHCS_SHEET_NAME) };
    } else if (action === 'getPHCStock') {
      // Get stock levels for a specific PHC
      try {
        var phcName = e.parameter.phcName || '';
        if (!phcName) {
          result = { status: 'error', message: 'PHC name is required' };
        } else {
          var stockData = getPHCStock(phcName);
          result = { status: 'success', data: stockData };
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to get PHC stock: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'updatePHCStock') {
      // Update stock levels for a PHC
      try {
        var stockDataToUpdate = params.data || [];
        if (!stockDataToUpdate || stockDataToUpdate.length === 0) {
          result = { status: 'error', message: 'Stock data is required' };
        } else {
          var updateResult = updatePHCStock(stockDataToUpdate);
          result = updateResult;
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to update PHC stock: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getUserActivityLogs') {
      // Return user activity logs from the UserActivityLogs sheet
      try {
        var limit = parseInt(e.parameter.limit, 10) || 100;
        var logs = getUserActivityLogs(limit);
        result = { status: 'success', data: logs };
      } catch (err) {
        result = { status: 'error', message: 'Failed to get user activity logs: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'logActivity') {
      // Log user activity
      try {
        var username = e.parameter.username || actingUser || 'Unknown';
        var actionName = e.parameter.logAction || e.parameter.action || 'Unknown Action';
        var details = {};
        try {
          details = JSON.parse(e.parameter.details || '{}');
        } catch (jsonErr) {
          details = { raw: e.parameter.details || '' };
        }
        
        // Add role and PHC to details
        details.role = actingRole || 'unknown';
        details.phc = actingPHC || 'Unknown';
        
        logUserActivity(e, username, actionName, details);
        result = { status: 'success', message: 'Activity logged' };
      } catch (err) {
        result = { status: 'error', message: 'Failed to log activity: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getViewerAddPatientToggle') {
      const enabled = getAdminSetting('viewerAddPatientEnabled', false);
      result = { status: 'success', data: { enabled: enabled } };
    } else if (action === 'setViewerAddPatientToggle') {
      // Set viewer add patient toggle - master_admin only
      try {
        const enabled = params.enabled === true || params.enabled === 'true';
        setAdminSetting('viewerAddPatientEnabled', enabled);
        result = { status: 'success', message: 'Viewer toggle updated', data: { enabled: enabled } };
      } catch (err) {
        result = { status: 'error', message: 'Failed to update viewer toggle: ' + (err.message || String(err)) };
      }
    } else if (action === 'getAAMCenters') {
      // API: GET ?action=getAAMCenters
      // Reads AAM sheet and returns centers with phc, name, nin fields
      try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('AAM');
        if (!sheet) {
          result = { status: 'error', message: 'AAM sheet not found. Please create an AAM sheet with columns: PHCName, AAM Name, NIN' };
        } else {
          const values = sheet.getDataRange().getValues();
          if (values.length < 2) {
            result = { status: 'error', message: 'AAM sheet is empty. Please add AAM center data.' };
          } else {
            const headers = values[0];
            
            // Find column indices - try multiple variations
            let phcCol = headers.indexOf('PHCName');
            if (phcCol === -1) phcCol = headers.indexOf('PHC Name');
            if (phcCol === -1) phcCol = headers.indexOf('PHC');
            
            let nameCol = headers.indexOf('AAM Name');
            if (nameCol === -1) nameCol = headers.indexOf('AAMName');
            if (nameCol === -1) nameCol = headers.indexOf('Name');
            
            let ninCol = headers.indexOf('NIN');
            
            if (phcCol === -1 || nameCol === -1) {
              result = { 
                status: 'error', 
                message: 'AAM sheet missing required columns. Expected: PHCName, AAM Name, NIN. Found: ' + headers.join(', ')
              };
            } else {
              const centers = values.slice(1)
                .filter(row => row[nameCol] && row[nameCol].toString().trim()) // Filter out empty rows
                .map(row => ({
                  phc: (row[phcCol] || '').toString().trim(),
                  name: (row[nameCol] || '').toString().trim(),
                  nin: ninCol >= 0 ? (row[ninCol] || '').toString().trim() : ''
                }));
              result = { status: 'success', data: centers };
            }
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to get AAM centers: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'evaluateAddPatientCDS') {
      // CDS evaluation for Add Patient form
      try {
        const patientData = JSON.parse(e.parameter.patientData || '{}');
        const cdsResult = evaluateAddPatientCDS(patientData);
        result = { status: 'success', data: cdsResult };
      } catch (err) {
        result = { status: 'error', message: 'CDS evaluation failed: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'cdsGetConfig') {
      result = cdsGetConfig();
    } else if (action === 'publicCdsEvaluate') {
      // Public evaluation endpoint that accepts full patientContext and calls cdsEvaluatePublic
      try {
        var pc = e.parameter.patientContext || (e.parameter && e.parameter.patientContext);
        if (typeof pc === 'string') {
          try { pc = JSON.parse(pc); } catch (jsonErr) {
            // Try decoding if JSON parse failed
            try {
              pc = JSON.parse(decodeURIComponent(pc));
            } catch (decodeErr) {
              // leave as string
            }
          }
        }
        
        // Pass the patientContext directly - cdsEvaluatePublic can handle v1.2 structured format
        var input = { 
          patientContext: pc,
          username: actingUser || 'anonymous',
          role: actingRole || 'unknown',
          phc: actingPHC || e.parameter.phc || '',
          clientVersion: e.parameter.clientVersion || 'unknown'
        };
        
        result = cdsEvaluatePublic(input);
      } catch (err) {
        result = { status: 'error', message: 'publicCdsEvaluate failed: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getFollowUpPrompts') {
      // Wrapper to return follow-up prompts from CDS
      try {
        result = getFollowUpPrompts(e.parameter);
      } catch (err) {
        result = { status: 'error', message: err && err.message ? err.message : String(err) };
      }
    } else if (action === 'testCDS') {
      try {
        result = testCDS(e.parameter);
      } catch (err) {
        result = { status: 'error', message: err && err.message ? err.message : String(err) };
      }
    } else if (action === 'getSeizureFrequencyAnalytics') {
      try {
        const filters = e.parameter || {};
        result = getSeizureFrequencyAnalytics(filters);
      } catch (err) {
        result = { status: 'error', message: 'Failed to get seizure frequency analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getReferralAnalytics') {
      try {
        const filters = e.parameter || {};
        result = getReferralAnalytics(filters);
      } catch (err) {
        result = { status: 'error', message: 'Failed to get referral analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getPatientOutcomesAnalytics') {
      try {
        const filters = e.parameter || {};
        result = getPatientOutcomesAnalytics(filters);
      } catch (err) {
        result = { status: 'error', message: 'Failed to get patient outcomes analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getMedicationAdherenceAnalytics') {
      try {
        const filters = e.parameter || {};
        result = getMedicationAdherenceAnalytics(filters);
      } catch (err) {
        result = { status: 'error', message: 'Failed to get medication adherence analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getPatientStatusAnalytics') {
      try {
        const filters = e.parameter || {};
        result = getPatientStatusAnalytics(filters);
      } catch (err) {
        result = { status: 'error', message: 'Failed to get patient status analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getFollowUpAudit') {
      try {
        if (typeof getFollowUpAudit === 'function') {
          result = { status: 'success', data: getFollowUpAudit() };
        } else {
          result = { status: 'error', message: 'getFollowUpAudit not implemented on server' };
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to run follow-up audit: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getAgeDistributionAnalytics') {
      try {
        const filters = e.parameter || {};
        result = getAgeDistributionAnalytics(filters);
      } catch (err) {
        result = { status: 'error', message: 'Failed to get age distribution analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getAgeOfOnsetDistributionAnalytics') {
      try {
        const filters = e.parameter || {};
        result = getAgeOfOnsetDistributionAnalytics(filters);
      } catch (err) {
        result = { status: 'error', message: 'Failed to get age of onset distribution analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getTeleconsultationHistory') {
      // Backend handler for getting teleconsultation history
      try {
        var patientId = e.parameter.patientId;
        if (!patientId) {
          result = { status: 'error', message: 'Patient ID is required' };
        } else {
          if (typeof getTeleconsultationHistory === 'function') {
            result = getTeleconsultationHistory(patientId);
          } else {
            result = { status: 'error', message: 'getTeleconsultationHistory function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to get teleconsultation history: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getUpcomingTeleconsultations') {
      // Backend handler for getting upcoming teleconsultations
      try {
        if (typeof getUpcomingTeleconsultations === 'function') {
          result = getUpcomingTeleconsultations();
        } else {
          result = { status: 'error', message: 'getUpcomingTeleconsultations function not available on backend' };
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to get upcoming teleconsultations: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getPatientFollowups') {
      // Backend handler for getting patient follow-ups
      try {
        var patientId = e.parameter.patientId;
        var limit = parseInt(e.parameter.limit || '5', 10);
        if (!patientId) {
          result = { status: 'error', message: 'Patient ID is required' };
        } else {
          if (typeof getPatientFollowups === 'function') {
            result = { 
              status: 'success',
              data: getPatientFollowups(patientId, limit)
            };
          } else {
            result = { status: 'error', message: 'getPatientFollowups function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to get patient followups: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getPatientSeizureVideos') {
      // Backend handler for retrieving patient seizure videos
      try {
        var patientId = e.parameter.patientId;
        if (!patientId) {
          result = { status: 'error', message: 'Patient ID is required' };
        } else {
          if (typeof getPatientSeizureVideos === 'function') {
            result = { 
              status: 'success',
              data: getPatientSeizureVideos(e.parameter) 
            };
          } else {
            result = { status: 'error', message: 'getPatientSeizureVideos function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to get patient seizure videos: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'uploadSeizureVideo') {
      // Backend handler for uploading seizure video (POST recommended)
      try {
        var videoData = e.parameter || {};
        if (!videoData || !videoData.patientId || !videoData.fileData) {
          result = { status: 'error', message: 'Missing required fields: patientId, fileData' };
        } else {
          if (typeof uploadSeizureVideo === 'function') {
            result = uploadSeizureVideo(videoData);
          } else {
            result = { status: 'error', message: 'uploadSeizureVideo function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to upload seizure video: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'deleteSeizureVideo') {
      // Backend handler for deleting seizure video (POST recommended)
      try {
        var videoId = e.parameter.videoId;
        var patientId = e.parameter.patientId;
        if (!videoId || !patientId) {
          result = { status: 'error', message: 'Missing required fields: videoId, patientId' };
        } else {
          if (typeof deleteSeizureVideo === 'function') {
            result = deleteSeizureVideo({ videoId: videoId, patientId: patientId });
          } else {
            result = { status: 'error', message: 'deleteSeizureVideo function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to delete seizure video: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'updatePatientSeizureType') {
      // Backend handler for updating patient seizure classification (POST recommended)
      try {
        var classificationData = e.parameter || {};
        if (!classificationData || !classificationData.patientId || !classificationData.seizureClassification) {
          result = { status: 'error', message: 'Missing required fields: patientId, seizureClassification' };
        } else {
          if (typeof updatePatientSeizureType === 'function') {
            result = updatePatientSeizureType(classificationData);
          } else {
            result = { status: 'error', message: 'updatePatientSeizureType function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to update patient seizure type: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'addPatient') {
      // Backend handler for adding a patient, including completing drafts
      try {
        var patientData = e.parameter;
        var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
        var headers = sheet.getDataRange().getValues()[0];
        var idCol = headers.indexOf('ID');
        
        // Check if this is completing an existing draft (has ID)
        var existingRowIndex = -1;
        if (patientData.ID) {
          var dataRange = sheet.getDataRange();
          var values = dataRange.getValues();
          for (var i = 1; i < values.length; i++) {
            if (values[i][idCol] == patientData.ID) {
              existingRowIndex = i + 1; // +1 because sheet rows are 1-indexed
              break;
            }
          }
        }
        
        // Generate unique ID if not provided
        if (!patientData.ID) {
          // Use generateUniquePatientId from patients.gs if available, else fallback
          if (typeof generateUniquePatientId === 'function') {
            patientData.ID = generateUniquePatientId();
          } else {
            var lastRow = sheet.getLastRow();
            patientData.ID = (lastRow + 1).toString(); // +1 to avoid conflicts
          }
        }
        // Ensure PatientStatus is set (default to 'Active' for completed patients)
        patientData.PatientStatus = patientData.PatientStatus || 'Active';
        // Ensure FollowUpStatus is set (default to 'Pending' for new patients)
        if (!patientData.FollowUpStatus) {
          patientData.FollowUpStatus = 'Pending';
        }
        // Ensure FollowFrequency is set (default to 'Monthly' for new patients)
        if (!patientData.FollowFrequency) {
          patientData.FollowFrequency = 'Monthly';
        }
        // Ensure Adherence is set (default to 'N/A' for new patients)
        if (!patientData.Adherence) {
          patientData.Adherence = 'N/A';
        }
        // Initialize audit trail columns if not set
        if (!patientData.MedicationHistory) {
          patientData.MedicationHistory = '[]';
        }
        if (!patientData.WeightAgeHistory) {
          patientData.WeightAgeHistory = '[]';
        }
        // Ensure RegistrationDate is set if not provided
        if (!patientData.RegistrationDate) {
          patientData.RegistrationDate = new Date();
        } else {
          // Parse existing date string and convert to Date object for proper sheet storage
          var parsedRegDate = parseDateFlexible(patientData.RegistrationDate);
          if (parsedRegDate) patientData.RegistrationDate = parsedRegDate;
        }
        // Ensure AddedBy is set if not provided
        if (!patientData.AddedBy) {
          patientData.AddedBy = actingUser || 'Unknown';
        }
        // Ensure NextFollowUpDate is set if not provided
        if (!patientData.NextFollowUpDate) {
          // Use parseDateFlexible to correctly handle DD/MM/YYYY format
          var regDate = patientData.RegistrationDate instanceof Date ? patientData.RegistrationDate : parseDateFlexible(patientData.RegistrationDate);
          if (!regDate || isNaN(regDate.getTime())) regDate = new Date();
          var nextFollowUp = new Date(regDate);
          nextFollowUp.setMonth(regDate.getMonth() + 1);
          patientData.NextFollowUpDate = nextFollowUp;
        } else {
          // Parse existing date string and convert to Date object
          var parsedNextDate = parseDateFlexible(patientData.NextFollowUpDate);
          if (parsedNextDate) patientData.NextFollowUpDate = parsedNextDate;
        }
        // Build row in header order
        var row = headers.map(function(h) {
          return patientData[h] || '';
        });
        
        if (existingRowIndex > 0) {
          // Update existing row (completing a draft)
          for (var j = 0; j < row.length; j++) {
            sheet.getRange(existingRowIndex, j + 1).setValue(row[j]);
          }
          result = { status: 'success', message: 'Patient completed from draft', patient: patientData };
        } else {
          // Append new row
          sheet.appendRow(row);
          result = { status: 'success', message: 'Patient added', patient: patientData };
        }
      } catch (err) {
        result = { status: 'error', message: err && err.message ? err.message : String(err) };
      }
    } else if (action === 'getDraft') {
      // Backend handler for retrieving a draft patient
      try {
        var draftId = e.parameter.id;
        if (!draftId) {
          result = { status: 'error', message: 'Draft ID is required' };
        } else {
          var patients = getSheetData(PATIENTS_SHEET_NAME);
          var draft = patients.find(function(p) {
            return p.PatientStatus === 'Draft' && p.ID == draftId;
          });
          if (draft) {
            result = { status: 'success', data: draft };
          } else {
            result = { status: 'error', message: 'Draft not found' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: err && err.message ? err.message : String(err) };
      }
    } else if (action === 'saveDraft') {
      // Backend handler for saving a draft patient
      try {
        var draftData = e.parameter;
        var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
        var headers = sheet.getDataRange().getValues()[0];
        var idCol = headers.indexOf('ID');
        
        // Check if this is an existing draft (has ID)
        var existingRowIndex = -1;
        if (draftData.ID) {
          var dataRange = sheet.getDataRange();
          var values = dataRange.getValues();
          for (var i = 1; i < values.length; i++) {
            if (values[i][idCol] == draftData.ID) {
              existingRowIndex = i + 1; // +1 because sheet rows are 1-indexed
              break;
            }
          }
        }
        
        // Generate unique ID if not provided
          if (!draftData.ID) {
          // Use generateUniquePatientId from patients.gs if available, else fallback
          if (typeof generateUniquePatientId === 'function') {
            draftData.ID = generateUniquePatientId();
          } else {
            var lastRow = sheet.getLastRow();
            draftData.ID = (lastRow + 1).toString(); // +1 to avoid conflicts
          }
        }
        
        // Ensure PatientStatus is set to 'Draft'
        draftData.PatientStatus = 'Draft';
        // Ensure FollowUpStatus is set (default to 'Pending' for drafts)
        if (!draftData.FollowUpStatus) {
          draftData.FollowUpStatus = 'Pending';
        }
        // Ensure FollowFrequency is set (default to 'Monthly' for drafts)
        if (!draftData.FollowFrequency) {
          draftData.FollowFrequency = 'Monthly';
        }
        // Ensure Adherence is set (default to 'N/A' for drafts)
        if (!draftData.Adherence) {
          draftData.Adherence = 'N/A';
        }
        // Initialize audit trail columns if not set
        if (!draftData.MedicationHistory) {
          draftData.MedicationHistory = '[]';
        }
        if (!draftData.WeightAgeHistory) {
          draftData.WeightAgeHistory = '[]';
        }
        // Ensure RegistrationDate is set if not provided (store as Date object)
        if (!draftData.RegistrationDate) {
          draftData.RegistrationDate = new Date();
        } else {
          var parsedRegDate = parseDateFlexible(draftData.RegistrationDate);
          if (parsedRegDate) draftData.RegistrationDate = parsedRegDate;
        }
        // Ensure AddedBy is set if not provided
        if (!draftData.AddedBy) {
          draftData.AddedBy = actingUser || 'Unknown';
        }
        // Ensure NextFollowUpDate is set if not provided
        if (!draftData.NextFollowUpDate) {
          // Use parseDateFlexible to correctly handle DD/MM/YYYY format
          var regDate = draftData.RegistrationDate instanceof Date ? draftData.RegistrationDate : parseDateFlexible(draftData.RegistrationDate);
          if (!regDate || isNaN(regDate.getTime())) regDate = new Date();
          var nextFollowUp = new Date(regDate);
          nextFollowUp.setMonth(regDate.getMonth() + 1);
          draftData.NextFollowUpDate = nextFollowUp;
        } else {
          var parsedNextDate = parseDateFlexible(draftData.NextFollowUpDate);
          if (parsedNextDate) draftData.NextFollowUpDate = parsedNextDate;
        }
        
        // Build row in header order
        var row = headers.map(function(h) {
          return draftData[h] || '';
        });
        
        if (existingRowIndex > 0) {
          // Update existing row
          for (var j = 0; j < row.length; j++) {
            sheet.getRange(existingRowIndex, j + 1).setValue(row[j]);
          }
          result = { status: 'success', message: 'Draft updated', draft: draftData };
        } else {
          // Append new row
          sheet.appendRow(row);
          result = { status: 'success', message: 'Draft saved', draft: draftData };
        }
      } catch (err) {
        result = { status: 'error', message: err && err.message ? err.message : String(err) };
      }
    } else {
      result = { status: 'error', message: 'Invalid or missing action: ' + action };
    }
  } catch (error) {
    if (error && error.code === 'unauthorized') {
      result = { status: 'error', code: 'unauthorized', message: error.message || 'Authentication required' };
    } else {
      result = {
        status: 'error',
        message: error.message,
        stack: error.stack
      };
    }
  }
  // Handle response formatting and CORS
  if (e && e.parameter && e.parameter.callback) {
    // JSONP response
    var output = ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
    return output;
  } else {
    // JSON response - return with CORS headers to support cross-origin fetch
    return createCorsJsonResponse(result);
  }
}

/**
 * Accept POST requests and route actions. Attempts to add CORS headers to responses.
 * Note: some browsers send an OPTIONS preflight which Apps Script does not expose a direct handler for; if preflight fails
 * you may need to use a proxy or send POSTs in form-encoded format to avoid triggering preflight.
 */
function doPost(e) {
  var result = null;
  try {
    // Try to parse JSON body first
    var body = {};
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback to URL-encoded parameters
        body = e.parameter || {};
      }
    } else {
      body = e.parameter || {};
    }
    
    // Ensure e.parameter values are available in body for URL-encoded requests
    if (e.parameter) {
      Object.keys(e.parameter).forEach(function(key) {
        if (body[key] === undefined) {
          body[key] = e.parameter[key];
        }
      });
    }

    var action = body.action || (e.parameter && e.parameter.action);
    if (!action) {
      result = { status: 'error', message: 'Invalid or missing action: ' + action };
    }

    if (result) {
      return createCorsJsonResponse(result);
    }

    const authContext = isPublicAction(action) ? null : requireAuthContext(e, body);
    const actingUser = authContext ? authContext.username : '';
    const actingRole = authContext ? authContext.role : '';
    const actingPHC = authContext ? authContext.assignedPHC : '';

    if (action === 'getFollowUpPrompts') {
      result = getFollowUpPrompts(body);
    } else if (action === 'testCDS') {
      result = testCDS(body);
    } else if (action === 'getSeizureFrequencyAnalytics') {
      try {
        const filters = body || {};
        result = { status: 'success', data: getSeizureFrequencyAnalytics(filters) };
      } catch (err) {
        result = { status: 'error', message: 'Failed to get seizure frequency analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getReferralAnalytics') {
      try {
        const filters = body || {};
        result = { status: 'success', data: getReferralAnalytics(filters) };
      } catch (err) {
        result = { status: 'error', message: 'Failed to get referral analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getPatientOutcomesAnalytics') {
      try {
        const filters = body || {};
        result = { status: 'success', data: getPatientOutcomesAnalytics(filters) };
      } catch (err) {
        result = { status: 'error', message: 'Failed to get patient outcomes analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getMedicationAdherenceAnalytics') {
      try {
        const filters = body || {};
        result = { status: 'success', data: getMedicationAdherenceAnalytics(filters) };
      } catch (err) {
        result = { status: 'error', message: 'Failed to get medication adherence analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getPatientStatusAnalytics') {
      try {
        const filters = body || {};
        result = { status: 'success', data: getPatientStatusAnalytics(filters) };
      } catch (err) {
        result = { status: 'error', message: 'Failed to get patient status analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getAgeDistributionAnalytics') {
      try {
        const filters = body || {};
        result = { status: 'success', data: getAgeDistributionAnalytics(filters) };
      } catch (err) {
        result = { status: 'error', message: 'Failed to get age distribution analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'getAgeOfOnsetDistributionAnalytics') {
      try {
        const filters = body || {};
        result = { status: 'success', data: getAgeOfOnsetDistributionAnalytics(filters) };
      } catch (err) {
        result = { status: 'error', message: 'Failed to get age of onset distribution analytics: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'publicCdsEvaluate') {
      // Public evaluation endpoint that accepts full patientContext and calls cdsEvaluatePublic
      try {
        var pc = body.patientContext || (e.parameter && e.parameter.patientContext);
        if (typeof pc === 'string') {
          try { pc = JSON.parse(pc); } catch (jsonErr) {
            // Try decoding if JSON parse failed
            try {
              pc = JSON.parse(decodeURIComponent(pc));
            } catch (decodeErr) {
              // leave as string
            }
          }
        }
        
        // Pass the patientContext directly - cdsEvaluatePublic can handle v1.2 structured format
        var input = { 
          patientContext: pc,
          username: actingUser || 'anonymous',
          role: actingRole || 'unknown',
          phc: actingPHC || body.phc || '',
          clientVersion: body.clientVersion || 'unknown'
        };
        
        result = cdsEvaluatePublic(input);
      } catch (err) {
        result = { status: 'error', message: 'publicCdsEvaluate failed: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'cdsEvaluate') {
      // Allow direct cdsEvaluate POST wrapper
      try {
        var pc = body.patientContext || (e.parameter && e.parameter.patientContext);
        if (typeof pc === 'string') {
          try { pc = JSON.parse(pc); } catch (jsonErr) { /* leave as string if cannot parse */ }
        }
        // If body already contains patientContext as object, use it; otherwise, try body itself
        var evalInput = pc || body;
        result = cdsEvaluate(evalInput);
      } catch (err) {
        result = { status: 'error', message: 'cdsEvaluate failed: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'cdsLogEvents') {
      // Handler for logging CDS audit events
      try {
        var events = body.events || (e.parameter && e.parameter.events);
        if (typeof events === 'string') {
          try { events = JSON.parse(events); } catch (jsonErr) { /* leave as string if cannot parse */ }
        }
        
        if (!events) {
          result = { status: 'error', message: 'Missing events data' };
        } else {
          // Wrap single event in array if needed
          if (!Array.isArray(events)) {
            events = [events];
          }
          // Pass authContext to cdsLogEvents so it can get user info
          result = cdsLogEvents(events, authContext);
        }
      } catch (err) {
        result = { status: 'error', message: 'cdsLogEvents failed: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'updateFollowFrequency') {
          // Backwards-compatible wrapper: client may post action=updateFollowFrequency
          try {
            var patientId = body.patientId || body.patientId || (e.parameter && e.parameter.patientId);
            var newFreq = body.followFrequency || body.followFrequency || (e.parameter && e.parameter.followFrequency);
            var userEmail = authContext ? (authContext.email || authContext.username || 'unknown') : 'unknown';
            if (!patientId || !newFreq) {
              result = { status: 'error', message: 'Missing patientId or followFrequency' };
            } else {
              // Call into followups.gs implementation which performs validation and audit trail
              try {
                var upd = updatePatientFollowFrequency(String(patientId), String(newFreq), String(userEmail));
                result = upd;
              } catch (innerErr) {
                result = { status: 'error', message: 'Failed to update follow frequency: ' + (innerErr && innerErr.message ? innerErr.message : String(innerErr)) };
              }
            }
          } catch (err) {
            result = { status: 'error', message: 'updateFollowFrequency handler failed: ' + (err && err.message ? err.message : String(err)) };
          }
      } else if (action === 'logActivity') {
      // Log user activity
      try {
        var username = body.username || actingUser || 'Unknown';
        var actionName = body.logAction || body.action || 'Unknown Action';
        var details = {};
        try {
          details = JSON.parse(body.details || '{}');
        } catch (jsonErr) {
          details = { raw: body.details || '' };
        }
        
        // Add role and PHC to details
        details.role = actingRole || 'unknown';
        details.phc = actingPHC || 'Unknown';
        
        // Extract IP address using server-side detection (getClientIP function)
        var clientIP = getClientIP(e);
        
        // Extract UserAgent from request parameters
        var userAgent = (body.userAgent || body['User-Agent'] || 'Unknown');
        
        logUserActivity(e, username, actionName, details, clientIP, userAgent);
        result = { status: 'success', message: 'Activity logged' };
      } catch (err) {
        result = { status: 'error', message: 'Failed to log activity: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'addUser') {
      try {
        const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
        const newUserData = body.data || body;
        const row = [
          newUserData.username,
          newUserData.password,
          newUserData.role,
          newUserData.phc || '',
          newUserData.name || '',
          newUserData.email || '',
          newUserData.status || 'Active'
        ];
        userSheet.appendRow(row);
        
        // Log user addition activity
        logUserActivity(e, actingUser || 'System Admin', 'User Added', {
          username: newUserData.username,
          role: newUserData.role,
          phc: newUserData.phc || '',
          name: newUserData.name || ''
        });
        
        result = { status: 'success', message: 'User added successfully' };
      } catch (err) {
        result = { status: 'error', message: 'Failed to add user: ' + err.message };
      }

    } else if (action === 'addPHC') {
      try {
        const phcSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
        const newPHCData = body.data || body;
        const row = [
          newPHCData.phcCode || '',                    // PHCCode
          newPHCData.phcName || '',                    // PHCName
          newPHCData.district || 'East Singhbhum',     // District
          newPHCData.block || '',                      // Block
          newPHCData.address || '',                    // Address
          newPHCData.contactPerson || '',              // ContactPerson
          newPHCData.phone || '',                      // Phone
          newPHCData.email || '',                      // Email
          newPHCData.status || 'Active',               // Status
          new Date().toISOString(),                    // DateAdded
          newPHCData.state || '',                      // State
          newPHCData.contactPhone || newPHCData.phone || ''  // ContactPhone (fallback to phone)
        ];
        phcSheet.appendRow(row);
        
        // Log PHC addition activity
        logUserActivity(e, actingUser || 'System Admin', 'PHC Added', {
          phcCode: newPHCData.phcCode || '',
          phcName: newPHCData.phcName || '',
          district: newPHCData.district || 'East Singhbhum'
        });
        
        // Clear PHC names cache since we added a new PHC
        if (typeof clearPHCNamesCache === 'function') {
            clearPHCNamesCache();
        }
        result = { status: 'success', message: 'PHC added successfully' };
      } catch (err) {
        result = { status: 'error', message: 'Failed to add PHC: ' + err.message };
      }

    } else if (action === 'addPatient') {
        // Backend handler for adding a patient, including completing drafts
        try {
          var patientData = body.patientData || body;
          var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
          var headers = sheet.getDataRange().getValues()[0];
          var idCol = headers.indexOf('ID');
          
          // Check if this is completing an existing draft (has ID)
          var existingRowIndex = -1;
          if (patientData.ID) {
            var dataRange = sheet.getDataRange();
            var values = dataRange.getValues();
            for (var i = 1; i < values.length; i++) {
              if (values[i][idCol] == patientData.ID) {
                existingRowIndex = i + 1; // +1 because sheet rows are 1-indexed
                break;
              }
            }
          }
          
          // Generate unique ID if not provided
          if (!patientData.ID) {
            // Use generateUniquePatientId from patients.gs if available, else fallback
            if (typeof generateUniquePatientId === 'function') {
              patientData.ID = generateUniquePatientId();
            } else {
              var lastRow = sheet.getLastRow();
              patientData.ID = (lastRow + 1).toString(); // +1 to avoid conflicts
            }
          }
          
          // Ensure PatientStatus is set (default to 'Active' for completed patients)
          patientData.PatientStatus = patientData.PatientStatus || 'Active';
          // Ensure FollowUpStatus is set (default to 'Pending' for new patients)
          if (!patientData.FollowUpStatus) {
            patientData.FollowUpStatus = 'Pending';
          }
          // Ensure FollowFrequency is set (default to 'Monthly' for new patients)
          if (!patientData.FollowFrequency) {
            patientData.FollowFrequency = 'Monthly';
          }
          // Ensure RegistrationDate is set if not provided
          if (!patientData.RegistrationDate) {
            patientData.RegistrationDate = new Date();
          } else {
            var parsedRegDate = parseDateFlexible(patientData.RegistrationDate);
            if (parsedRegDate) patientData.RegistrationDate = parsedRegDate;
          }
          // Ensure AddedBy is set if not provided
          if (!patientData.AddedBy) {
            patientData.AddedBy = actingUser || 'Unknown';
          }
          // Ensure NextFollowUpDate is set if not provided
          if (!patientData.NextFollowUpDate) {
            // Use parseDateFlexible to correctly handle DD/MM/YYYY format
            var regDate = patientData.RegistrationDate instanceof Date ? patientData.RegistrationDate : parseDateFlexible(patientData.RegistrationDate);
            if (!regDate || isNaN(regDate.getTime())) regDate = new Date();
            var nextFollowUp = new Date(regDate);
            nextFollowUp.setMonth(regDate.getMonth() + 1);
            patientData.NextFollowUpDate = nextFollowUp;
          } else {
            var parsedNextDate = parseDateFlexible(patientData.NextFollowUpDate);
            if (parsedNextDate) patientData.NextFollowUpDate = parsedNextDate;
          }
          
          // Build row in header order
          var row = headers.map(function(h) {
            return patientData[h] || '';
          });
          
          if (existingRowIndex > 0) {
            // Update existing row (completing a draft)
            for (var j = 0; j < row.length; j++) {
              sheet.getRange(existingRowIndex, j + 1).setValue(row[j]);
            }
            
            // Log patient completion
            logUserActivity(e, actingUser || patientData.AddedBy || 'System', 'Patient Completed (Draft)', {
              patientId: patientData.ID,
              patientName: patientData.PatientName || '',
              phc: patientData.PHC || ''
            });

            result = { status: 'success', message: 'Patient completed from draft', patient: patientData };
          } else {
            // Append new row
            sheet.appendRow(row);
            
            // Log patient addition
            logUserActivity(e, actingUser || patientData.AddedBy || 'System', 'Patient Added', {
              patientId: patientData.ID,
              patientName: patientData.PatientName || '',
              phc: patientData.PHC || ''
            });

            result = { status: 'success', message: 'Patient added', patient: patientData };
          }
        } catch (err) {
          result = { status: 'error', message: err && err.message ? err.message : String(err) };
        }
    } else if (action === 'saveDraft') {
        // Backend handler for saving a draft patient
        try {
          var draftData = body.draftData || body;
          var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
          var headers = sheet.getDataRange().getValues()[0];
          var idCol = headers.indexOf('ID');
          
          // Check if this is an existing draft (has ID)
          var existingRowIndex = -1;
          if (draftData.ID) {
            var dataRange = sheet.getDataRange();
            var values = dataRange.getValues();
            for (var i = 1; i < values.length; i++) {
              if (values[i][idCol] == draftData.ID) {
                existingRowIndex = i + 1; // +1 because sheet rows are 1-indexed
                break;
              }
            }
          }
          
          // Generate unique ID if not provided
            if (!draftData.ID) {
            // Use generateUniquePatientId from patients.gs if available, else fallback
            if (typeof generateUniquePatientId === 'function') {
              draftData.ID = generateUniquePatientId();
            } else {
              var lastRow = sheet.getLastRow();
              draftData.ID = (lastRow + 1).toString(); // +1 to avoid conflicts
            }
          }
          
          // Ensure PatientStatus is set to 'Draft'
          draftData.PatientStatus = 'Draft';
          // Ensure FollowUpStatus is set (default to 'Pending' for drafts)
          if (!draftData.FollowUpStatus) {
            draftData.FollowUpStatus = 'Pending';
          }
          // Ensure FollowFrequency is set (default to 'Monthly' for drafts)
          if (!draftData.FollowFrequency) {
            draftData.FollowFrequency = 'Monthly';
          }
          // Ensure RegistrationDate is set if not provided (store as Date object)
          if (!draftData.RegistrationDate) {
            draftData.RegistrationDate = new Date();
          } else {
            var parsedRegDate = parseDateFlexible(draftData.RegistrationDate);
            if (parsedRegDate) draftData.RegistrationDate = parsedRegDate;
          }
          // Ensure AddedBy is set if not provided
          if (!draftData.AddedBy) {
            draftData.AddedBy = actingUser || 'Unknown';
          }
          // Ensure NextFollowUpDate is set if not provided
          if (!draftData.NextFollowUpDate) {
            // Use parseDateFlexible to correctly handle DD/MM/YYYY format
            var regDate = draftData.RegistrationDate instanceof Date ? draftData.RegistrationDate : parseDateFlexible(draftData.RegistrationDate);
            if (!regDate || isNaN(regDate.getTime())) regDate = new Date();
            var nextFollowUp = new Date(regDate);
            nextFollowUp.setMonth(regDate.getMonth() + 1);
            draftData.NextFollowUpDate = nextFollowUp;
          } else {
            var parsedNextDate = parseDateFlexible(draftData.NextFollowUpDate);
            if (parsedNextDate) draftData.NextFollowUpDate = parsedNextDate;
          }
          
          // Build row in header order
          var row = headers.map(function(h) {
            return draftData[h] || '';
          });
          
          if (existingRowIndex > 0) {
            // Update existing row
            for (var j = 0; j < row.length; j++) {
              sheet.getRange(existingRowIndex, j + 1).setValue(row[j]);
            }
            result = { status: 'success', message: 'Draft updated', draft: draftData };
          } else {
            // Append new row
            sheet.appendRow(row);
            result = { status: 'success', message: 'Draft saved', draft: draftData };
          }
        } catch (err) {
          result = { status: 'error', message: err && err.message ? err.message : String(err) };
        }
    } else if (action === 'getDraft') {
        // Backend handler for retrieving a draft patient
        try {
          var draftId = body.id || (e.parameter && e.parameter.id);
          if (!draftId) {
            result = { status: 'error', message: 'Draft ID is required' };
          } else {
            // Get draft data with original header names (not cleaned)
            var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
            var dataRange = sheet.getDataRange();
            var values = dataRange.getValues();
            if (values.length < 2) {
              result = { status: 'error', message: 'No patient data found' };
            } else {
              var headers = values[0];
              var idCol = headers.indexOf('ID');
              var patientStatusCol = headers.indexOf('PatientStatus');
              
              var draft = null;
              for (var i = 1; i < values.length; i++) {
                var row = values[i];
                if (row[idCol] == draftId && row[patientStatusCol] === 'Draft') {
                  // Create object with original header names as keys
                  draft = {};
                  for (var j = 0; j < headers.length; j++) {
                    draft[headers[j]] = row[j];
                  }
                  break;
                }
              }
              
              if (draft) {
                result = { status: 'success', data: draft };
              } else {
                result = { status: 'error', message: 'Draft not found' };
              }
            }
          }
        } catch (err) {
          result = { status: 'error', message: err && err.message ? err.message : String(err) };
        }
    } else if (action === 'referToTertiary') {
        // Backend handler for referring patient to tertiary center
        try {
          var referralData = body.data || body;
          if (!referralData || !referralData.patientId) {
            result = { status: 'error', message: 'Missing referral data or patient ID' };
          } else {
            // Update patient status to 'Referred to Tertiary'
            const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
            const dataRange = sheet.getDataRange();
            const values = dataRange.getValues();
            const header = values[0];
            const idCol = header.indexOf('ID');
            const patientStatusCol = header.indexOf('PatientStatus');
            
            let rowIndex = -1;
            for (let i = 1; i < values.length; i++) {
              if (values[i][idCol] == referralData.patientId) {
                rowIndex = i + 1;
                break;
              }
            }
            
            if (rowIndex === -1) {
              result = { status: 'error', message: 'Patient not found' };
            } else {
              // Update patient status via centralized updatePatientStatus to ensure consistent behaviour and audit fields
              try {
                if (typeof updatePatientStatus === 'function') {
                  updatePatientStatus(String(referralData.patientId), 'Referred to Tertiary', {
                    referredBy: referralData.referredBy || 'System',
                    notes: referralData.notes || 'Referred to tertiary center'
                  });
                } else {
                  // Fallback - direct sheet update
                  if (patientStatusCol !== -1) {
                    sheet.getRange(rowIndex, patientStatusCol + 1).setValue('Referred to Tertiary');
                  }
                }
              } catch (err) {
                // If updatePatientStatus throws, fallback to direct set and log
                if (patientStatusCol !== -1) {
                  sheet.getRange(rowIndex, patientStatusCol + 1).setValue('Referred to Tertiary');
                }
                Logger.log('referToTertiary: fallback setValue used due to error: ' + (err && err.message ? err.message : String(err)));
              }

              // Add audit trail entry to FollowUps sheet
              const followUpsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
              const followUpHeaders = followUpsSheet.getDataRange().getValues()[0];
              
              const followUpData = {
                PatientID: referralData.patientId,
                FollowUpDate: new Date(),
                Status: 'Referred to Tertiary',
                Notes: referralData.notes || 'Referred to AIIMS for specialist review',
                SubmittedBy: referralData.referredBy || 'System',
                ReferredToMO: 'No',
                ReferralClosed: 'No'
              };
              
              const followUpRow = followUpHeaders.map(h => followUpData[h] || '');
              followUpsSheet.appendRow(followUpRow);
              
              result = { status: 'success', message: 'Patient referred to tertiary center successfully' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to refer to tertiary center: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'completeFollowUp') {
        // Backend handler for completing follow-up data and updating patient status
        try {
          var followUpData = body.data || body;
          // If data was sent as a URL-encoded JSON string, decode and parse it
          if (typeof followUpData === 'string') {
            try {
              followUpData = JSON.parse(decodeURIComponent(followUpData));
            } catch (e) {
              try {
                // Fallback: maybe it was plain JSON without encoding
                followUpData = JSON.parse(followUpData);
              } catch (e2) {
                // Leave as string - will be validated below
              }
            }
          }

          // Support both PascalCase PatientID (sheet header) and legacy patientId
          var patientId = (followUpData && (followUpData.PatientID || followUpData.patientId)) || '';
          if (!followUpData || !patientId) {
            result = { status: 'error', message: 'Missing follow-up data or patient ID' };
          } else {
            // Call the completeFollowUp function from followups.gs
            if (typeof completeFollowUp === 'function') {
              const followUpResult = completeFollowUp(patientId, followUpData);
              
              // Log the follow-up submission
              var submittedBy = followUpData.SubmittedBy || followUpData.submittedBy || actingUser || 'Unknown User';
              var followUpId = followUpData.FollowUpID || followUpData.followUpId || followUpResult.followUpId || 'Unknown';
              
              logUserActivity(e, submittedBy, 'Follow-up Submitted', { 
                patientId: patientId,
                followUpId: followUpId,
                seizureFrequency: followUpData.SeizureFrequency || followUpData.seizureFrequency,
                returnToPhc: followUpData.ReferredToMO || followUpData.referredToMO,
                role: actingRole || 'unknown',
                phc: actingPHC || 'Unknown'
              });
              
              result = { 
                status: 'success', 
                message: 'Follow-up completed successfully',
                data: followUpResult
              };
            } else {
              result = { status: 'error', message: 'completeFollowUp function not available' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to complete follow-up: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'addFollowUp') {
        // Backend handler for adding follow-up data and updating patient status
        try {
          var followUpData = body.data || body;
          // If data was sent as a URL-encoded JSON string, decode and parse it
          if (typeof followUpData === 'string') {
            try {
              followUpData = JSON.parse(decodeURIComponent(followUpData));
            } catch (e) {
              try {
                // Fallback: maybe it was plain JSON without encoding
                followUpData = JSON.parse(followUpData);
              } catch (e2) {
                // Leave as string - will be validated below
              }
            }
          }

          // Support both PascalCase PatientID (sheet header) and legacy patientId
          var patientId = (followUpData && (followUpData.PatientID || followUpData.patientId)) || '';
          if (!followUpData || !patientId) {
            result = { status: 'error', message: 'Missing follow-up data or patient ID' };
          } else {
            // Call the completeFollowUp function from followups.gs
            if (typeof completeFollowUp === 'function') {
              const followUpResult = completeFollowUp(patientId, followUpData);
              
              // Log the follow-up submission
              var submittedBy = followUpData.SubmittedBy || followUpData.submittedBy || actingUser || 'Unknown User';
              var followUpId = followUpData.FollowUpID || followUpData.followUpId || followUpResult.followUpId || 'Unknown';
              
              logUserActivity(e, submittedBy, 'Follow-up Submitted', { 
                patientId: patientId,
                followUpId: followUpId,
                seizureFrequency: followUpData.SeizureFrequency || followUpData.seizureFrequency,
                returnToPhc: followUpData.ReferredToMO || followUpData.referredToMO,
                role: actingRole || 'unknown',
                phc: actingPHC || 'Unknown'
              });
              
              result = { 
                status: 'success', 
                message: 'Follow-up completed successfully',
                data: followUpResult
              };
            } else {
              result = { status: 'error', message: 'completeFollowUp function not available' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to add follow-up: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'updateTertiaryStatus') {
        try {
          var pid = body.patientId || body.id || (e.parameter && (e.parameter.patientId || e.parameter.id));
          var newStatus = body.newStatus || body.status || (e.parameter && (e.parameter.newStatus || e.parameter.status));
          if (!pid || !newStatus) {
            result = { status: 'error', message: 'Missing patientId or newStatus' };
          } else {
            if (typeof updatePatientStatus === 'function') {
              const statusRes = updatePatientStatus(String(pid), String(newStatus), { updatedBy: (body.completedBy || body.updatedBy || actingUser) || 'System', updatedAt: body.completedAt || body.updatedAt || new Date().toISOString() });
              result = { status: 'success', message: 'Tertiary status updated', data: statusRes };
            } else {
              result = { status: 'error', message: 'updatePatientStatus function not available on backend' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'updateTertiaryStatus handler failed: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'updateTertiaryReferralStatus') {
        try {
          var pid = body.patientId || body.id || (e.parameter && (e.parameter.patientId || e.parameter.id));
          var newStatus = body.newStatus || body.status || (e.parameter && (e.parameter.newStatus || e.parameter.status));
          if (!pid || !newStatus) {
            result = { status: 'error', message: 'Missing patientId or newStatus' };
          } else {
            if (typeof updatePatientStatus === 'function') {
              const statusRes = updatePatientStatus(String(pid), String(newStatus), { updatedBy: (body.updatedBy || actingUser) || 'System', updatedAt: body.updatedAt || new Date().toISOString() });
              result = { status: 'success', message: 'Tertiary referral status updated', data: statusRes };
            } else {
              // Fallback: attempt to update a TertiaryReferralStatus column in the Patients sheet
              const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
              const headers = sheet.getDataRange().getValues()[0];
              const idCol = headers.indexOf('ID');
              const tertiaryCol = headers.indexOf('TertiaryReferralStatus');
              if (tertiaryCol === -1) {
                result = { status: 'error', message: 'TertiaryReferralStatus column not found and updatePatientStatus unavailable' };
              } else {
                let rowIdx = -1;
                const allVals = sheet.getDataRange().getValues();
                for (var i = 1; i < allVals.length; i++) { if (allVals[i][idCol] == pid) { rowIdx = i + 1; break; } }
                if (rowIdx === -1) {
                  result = { status: 'error', message: 'Patient not found' };
                } else {
                  sheet.getRange(rowIdx, tertiaryCol + 1).setValue(String(newStatus));
                  result = { status: 'success', message: 'Tertiary referral status updated (fallback)' };
                }
              }
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'updateTertiaryReferralStatus handler failed: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'saveTeleconsultation') {
        // Backend handler for saving teleconsultation
        try {
          var consultationData = body.data || body;
          if (!consultationData || !consultationData.patientId) {
            result = { status: 'error', message: 'Missing teleconsultation data or patient ID' };
          } else {
            // Add scheduled by information from auth context
            consultationData.scheduledBy = actingUser || 'Unknown';
            consultationData.scheduledDate = new Date().toISOString();
            
            if (typeof saveTeleconsultation === 'function') {
              result = saveTeleconsultation(consultationData);
            } else {
              result = { status: 'error', message: 'saveTeleconsultation function not available on backend' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to save teleconsultation: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'getTeleconsultationHistory') {
        // Backend handler for getting teleconsultation history
        try {
          var patientId = body.patientId || (e.parameter && e.parameter.patientId);
          if (!patientId) {
            result = { status: 'error', message: 'Patient ID is required' };
          } else {
            if (typeof getTeleconsultationHistory === 'function') {
              result = getTeleconsultationHistory(patientId);
            } else {
              result = { status: 'error', message: 'getTeleconsultationHistory function not available on backend' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to get teleconsultation history: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'updateTeleconsultationStatus') {
        // Backend handler for updating teleconsultation status
        try {
          var consultationId = body.consultationId || (e.parameter && e.parameter.consultationId);
          var status = body.status || (e.parameter && e.parameter.status);
          var completedDate = body.completedDate || (e.parameter && e.parameter.completedDate);
          var followupNotes = body.followupNotes || (e.parameter && e.parameter.followupNotes);
          
          if (!consultationId || !status) {
            result = { status: 'error', message: 'Missing required fields: consultationId, status' };
          } else {
            if (typeof updateTeleconsultationStatus === 'function') {
              result = updateTeleconsultationStatus(consultationId, status, completedDate, followupNotes);
            } else {
              result = { status: 'error', message: 'updateTeleconsultationStatus function not available on backend' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to update teleconsultation status: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'getPatientFollowups') {
        // Backend handler for getting patient follow-ups
        try {
          var patientId = body.patientId || (e.parameter && e.parameter.patientId);
          var limit = parseInt(body.limit || (e.parameter && e.parameter.limit) || '5', 10);
          
          if (!patientId) {
            result = { status: 'error', message: 'Patient ID is required' };
          } else {
            if (typeof getPatientFollowups === 'function') {
              result = { 
                status: 'success',
                data: getPatientFollowups(patientId, limit)
              };
            } else {
              result = { status: 'error', message: 'getPatientFollowups function not available on backend' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to get patient followups: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'getPatientSeizureVideos') {
        // Backend handler for retrieving patient seizure videos
        try {
          var patientId = body.patientId || (e.parameter && e.parameter.patientId);
          if (!patientId) {
            result = { status: 'error', message: 'Patient ID is required' };
          } else {
            if (typeof getPatientSeizureVideos === 'function') {
              result = { 
                status: 'success',
                data: getPatientSeizureVideos(body) 
              };
            } else {
              result = { status: 'error', message: 'getPatientSeizureVideos function not available on backend' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to get patient seizure videos: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'uploadSeizureVideo') {
        // Backend handler for uploading seizure video
        try {
          Logger.log('uploadSeizureVideo: Starting handler');
          Logger.log('uploadSeizureVideo: e.parameter keys: ' + JSON.stringify(Object.keys(e.parameter || {})));
          Logger.log('uploadSeizureVideo: body keys: ' + JSON.stringify(Object.keys(body || {})));
          
          // Build videoData from available sources, prioritizing body then e.parameter
          var videoData = {};
          
          // Check body first (from JSON or merged parameters)
          if (body && body.patientId) {
            videoData = {
              patientId: body.patientId,
              fileName: body.fileName,
              fileData: body.fileData,
              fileType: body.fileType,
              uploadedBy: body.uploadedBy,
              videoDuration: body.videoDuration,
              uploadDate: body.uploadDate
            };
            Logger.log('uploadSeizureVideo: Using body data');
          } 
          // Fallback to e.parameter
          else if (e.parameter && e.parameter.patientId) {
            videoData = {
              patientId: e.parameter.patientId,
              fileName: e.parameter.fileName,
              fileData: e.parameter.fileData,
              fileType: e.parameter.fileType,
              uploadedBy: e.parameter.uploadedBy,
              videoDuration: e.parameter.videoDuration,
              uploadDate: e.parameter.uploadDate
            };
            Logger.log('uploadSeizureVideo: Using e.parameter data');
          }
          // Check if nested under body.data
          else if (body && body.data && body.data.patientId) {
            videoData = body.data;
            Logger.log('uploadSeizureVideo: Using body.data');
          }
          
          Logger.log('uploadSeizureVideo: patientId=' + (videoData.patientId || 'MISSING'));
          Logger.log('uploadSeizureVideo: fileName=' + (videoData.fileName || 'MISSING'));
          Logger.log('uploadSeizureVideo: fileData length=' + (videoData.fileData ? videoData.fileData.length : 0));
          
          if (!videoData.patientId || !videoData.fileData) {
            result = { 
              status: 'error', 
              message: 'Missing required fields: patientId=' + (videoData.patientId ? 'present' : 'MISSING') + 
                       ', fileData=' + (videoData.fileData ? 'present(' + videoData.fileData.length + ' chars)' : 'MISSING') +
                       '. Body keys: ' + JSON.stringify(Object.keys(body || {})) +
                       '. Param keys: ' + JSON.stringify(Object.keys(e.parameter || {}))
            };
          } else {
            if (typeof uploadSeizureVideo === 'function') {
              result = uploadSeizureVideo(videoData);
            } else {
              result = { status: 'error', message: 'uploadSeizureVideo function not available on backend' };
            }
          }
        } catch (err) {
          Logger.log('uploadSeizureVideo: Error - ' + (err && err.message ? err.message : String(err)));
          result = { status: 'error', message: 'Failed to upload seizure video: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'deleteSeizureVideo') {
        // Backend handler for deleting seizure video
        try {
          var videoId = body.videoId || (e.parameter && e.parameter.videoId);
          var patientId = body.patientId || (e.parameter && e.parameter.patientId);
          if (!videoId || !patientId) {
            result = { status: 'error', message: 'Missing required fields: videoId, patientId' };
          } else {
            if (typeof deleteSeizureVideo === 'function') {
              result = deleteSeizureVideo({ videoId: videoId, patientId: patientId });
            } else {
              result = { status: 'error', message: 'deleteSeizureVideo function not available on backend' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to delete seizure video: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'updatePatientSeizureType') {
        // Backend handler for updating patient seizure classification
        try {
          var classificationData = body.data || body;
          if (!classificationData || !classificationData.patientId || !classificationData.seizureClassification) {
            result = { status: 'error', message: 'Missing required fields: patientId, seizureClassification' };
          } else {
            if (typeof updatePatientSeizureType === 'function') {
              result = updatePatientSeizureType(classificationData);
            } else {
              result = { status: 'error', message: 'updatePatientSeizureType function not available on backend' };
            }
          }
        } catch (err) {
          result = { status: 'error', message: 'Failed to update patient seizure type: ' + (err && err.message ? err.message : String(err)) };
        }
    } else if (action === 'updatePatientStatus') {
      // Backend handler for updating patient status
      try {
        var patientId = body.id || body.patientId || (e.parameter && (e.parameter.id || e.parameter.patientId));
        var newStatus = body.status || body.newStatus || (e.parameter && (e.parameter.status || e.parameter.newStatus));
        var referralDetails = body.referralDetails || body.referral || (e.parameter && e.parameter.referralDetails) || null;
        if (!patientId || !newStatus) {
          result = { status: 'error', message: 'Missing required fields: id (or patientId) and status' };
        } else {
          if (typeof updatePatientStatus === 'function') {
            try {
              // Parse referral details when provided as string
              if (typeof referralDetails === 'string' && referralDetails.trim()) {
                try { referralDetails = JSON.parse(referralDetails); } catch (e) { /* ignore parse error and pass string */ }
              }
              var statusResult = updatePatientStatus(String(patientId), String(newStatus), referralDetails || null);
              result = { status: 'success', message: 'Patient status updated', data: statusResult };
            } catch (innerErr) {
              result = { status: 'error', message: 'Failed to update patient status: ' + (innerErr && innerErr.message ? innerErr.message : String(innerErr)) };
            }
          } else {
            result = { status: 'error', message: 'updatePatientStatus function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'updatePatientStatus handler failed: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'setViewerAddPatientToggle') {
      // Set viewer add patient toggle - master_admin only
      try {
        var enabled = body.enabled === true || body.enabled === 'true';
        setAdminSetting('viewerAddPatientEnabled', enabled);
        result = { status: 'success', message: 'Viewer toggle updated', data: { enabled: enabled } };
      } catch (err) {
        result = { status: 'error', message: 'Failed to update viewer toggle: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'closeReferral') {
      // Backend handler for closing a referral and returning patient to PHC
      try {
        var patientId = body.patientId || body.id || (e.parameter && (e.parameter.patientId || e.parameter.id));
        var updatedBy = body.updatedBy || actingUser || 'System';
        if (!patientId) {
          result = { status: 'error', message: 'Missing required field: patientId' };
        } else {
          if (typeof closeReferral === 'function') {
            var closeResult = closeReferral(String(patientId), { updatedBy: updatedBy });
            result = { status: 'success', message: 'Referral closed successfully', data: closeResult };
          } else {
            result = { status: 'error', message: 'closeReferral function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'closeReferral handler failed: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'updatePHCStock') {
      // Update stock levels for a PHC (POST handler)
      try {
        // Handle data that may be JSON-encoded string or already parsed
        var stockDataToUpdate = body.data || [];
        if (typeof stockDataToUpdate === 'string') {
          try {
            stockDataToUpdate = JSON.parse(stockDataToUpdate);
          } catch (parseErr) {
            stockDataToUpdate = [];
          }
        }
        if (!stockDataToUpdate || !Array.isArray(stockDataToUpdate) || stockDataToUpdate.length === 0) {
          result = { status: 'error', message: 'Stock data is required and must be an array' };
        } else {
          if (typeof updatePHCStock === 'function') {
            var updateResult = updatePHCStock(stockDataToUpdate);
            
            // Log stock level updates
            var medicinesSummary = stockDataToUpdate.map(function(item) {
              return (item.Medicine || item.medicine || 'Unknown') + ': ' + (item.Quantity || item.quantity || '0');
            }).join(', ');
            
            logUserActivity(e, actingUser || 'Unknown User', 'Stock Level Updated', {
              phc: actingPHC || 'Unknown',
              medicinesUpdated: stockDataToUpdate.length,
              details: medicinesSummary,
              role: actingRole || 'unknown'
            });
            
            result = updateResult;
          } else {
            result = { status: 'error', message: 'updatePHCStock function not available on backend' };
          }
        }
      } catch (err) {
        result = { status: 'error', message: 'Failed to update PHC stock: ' + (err && err.message ? err.message : String(err)) };
      }
    } else if (action === 'subscribePush') {
      // Backend handler for saving push subscriptions with validation and deduplication
      try {
        var subData = body.data || body;
        // If data was sent as a URL-encoded JSON string, decode and parse it
        if (typeof subData === 'string') {
          try {
            subData = JSON.parse(subData);
          } catch (e) {
            // Maybe it's already an object or invalid
          }
        }
        
        // Validate subscription data structure
        if (!subData || !subData.subscription || !subData.subscription.endpoint) {
           result = { status: 'error', message: 'Invalid subscription data: missing endpoint' };
        } else {
           // Validate keys structure
           const keys = subData.subscription.keys || {};
           if (!keys.p256dh || !keys.auth) {
             LOG.warn('Invalid subscription keys structure', { hasP256dh: !!keys.p256dh, hasAuth: !!keys.auth });
             result = { status: 'error', message: 'Invalid subscription: missing encryption keys (p256dh, auth)' };
           } else {
             var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PUSH_SUBSCRIPTIONS_SHEET_NAME);
             if (!sheet) {
               // Create sheet if it doesn't exist with enhanced schema including userRole and phcId
               sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(PUSH_SUBSCRIPTIONS_SHEET_NAME);
               sheet.appendRow(['SubscriptionID', 'UserID', 'Username', 'UserRole', 'PHCId', 'Endpoint', 'Keys', 'CreatedDate', 'LastActivated', 'Status', 'FailureCount']);
               LOG.info('Created PushSubscriptions sheet with role and PHC filtering schema');
             }
             
             var endpoint = subData.subscription.endpoint.trim();
             var keysJson = JSON.stringify(keys);
             var userId = subData.phc || subData.phcId || actingUser || 'Unknown';
             var username = subData.username || actingUser || 'Unknown';
             var userRole = subData.userRole || subData.role || 'unknown';
             var phcId = subData.phcId || subData.phc || '';
             var now = new Date();
             
             // Check for duplicates and clean up by endpoint
             var data = sheet.getDataRange().getValues();
             var headers = data[0];
             var endpointCol = headers.indexOf('Endpoint');
             var statusCol = headers.indexOf('Status');
             var lastActivatedCol = headers.indexOf('LastActivated');
             var userIdCol = headers.indexOf('UserID');
             var failureCountCol = headers.indexOf('FailureCount');
             var userRoleCol = headers.indexOf('UserRole');
             var phcIdCol = headers.indexOf('PHCId');
             var usernameCol = headers.indexOf('Username');
             
             var isDuplicate = false;
             var rowToUpdate = -1;
             
             // Find existing subscription by endpoint
             for (var i = 1; i < data.length; i++) {
               if (data[i][endpointCol] === endpoint) {
                 isDuplicate = true;
                 rowToUpdate = i + 1;
                 break;
               }
             }
             
             if (isDuplicate && rowToUpdate > 0) {
               // Update existing subscription
               sheet.getRange(rowToUpdate, userIdCol + 1).setValue(userId);
               if (usernameCol >= 0) sheet.getRange(rowToUpdate, usernameCol + 1).setValue(username);
               if (userRoleCol >= 0) sheet.getRange(rowToUpdate, userRoleCol + 1).setValue(userRole);
               if (phcIdCol >= 0) sheet.getRange(rowToUpdate, phcIdCol + 1).setValue(phcId);
               sheet.getRange(rowToUpdate, lastActivatedCol + 1).setValue(now);
               sheet.getRange(rowToUpdate, statusCol + 1).setValue('Active');
               // Reset failure count on re-activation
               if (failureCountCol >= 0) {
                 sheet.getRange(rowToUpdate, failureCountCol + 1).setValue(0);
               }
               LOG.debug('Updated existing subscription', { endpoint: maskEndpoint(endpoint), username: username, userRole: userRole, phcId: phcId });
             } else {
               // Add new subscription
               var newId = Utilities.getUuid();
               var newRow = [newId, userId, username, userRole, phcId, endpoint, keysJson, now, now, 'Active', 0];
               sheet.appendRow(newRow);
               LOG.debug('Added new subscription', { endpoint: maskEndpoint(endpoint), username: username, userRole: userRole, phcId: phcId });
             }
             
             result = { status: 'success', message: 'Subscription saved successfully', isDuplicate: isDuplicate };
           }
        }
      } catch (err) {
        LOG.error('Failed to save subscription', err);
        result = { status: 'error', message: 'Failed to save subscription: ' + (err && err.message ? err.message : String(err)) };
      }
    } else {
      // Fallback to existing handlers where appropriate
      result = { status: 'error', message: 'Invalid or missing action: ' + action };
    }
        
  } catch (err) {
    if (err && err.code === 'unauthorized') {
      result = { status: 'error', code: 'unauthorized', message: err.message || 'Authentication required' };
    } else {
      result = { status: 'error', message: err && err.message ? err.message : String(err) };
    }
  }
  
  // Add server-side handlers for login and change password
  if (action === 'changePassword') {
    try {
      var uname = (body && body.username) || (e.parameter && e.parameter.username) || '';
      var oldPwd = (body && body.currentPassword) || (e.parameter && e.parameter.currentPassword) || '';
      var newPwd = (body && body.newPassword) || (e.parameter && e.parameter.newPassword) || '';
      if (!uname || !oldPwd || !newPwd) {
        result = { status: 'error', message: 'Missing credentials' };
      } else {
        var usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
        if (!usersSheet) {
          result = { status: 'error', message: 'Users sheet not found' };
        } else {
          var values = usersSheet.getDataRange().getValues();
          var headers = values[0] || [];
          var usernameCol = headers.findIndex(h => /username/i.test(h));
          var passwordCol = headers.findIndex(h => /password/i.test(h));
          var passwordHashCol = headers.findIndex(h => /passwordhash/i.test(h));
          var passwordSaltCol = headers.findIndex(h => /passwordsalt/i.test(h));
          var foundRow = -1;
          var valid = false;
          for (var i = 1; i < values.length; i++) {
            var row = values[i];
            if (!row) continue;
            var sheetUsername = (row[usernameCol] || '').toString();
            var sheetPassword = (row[passwordCol] || '').toString();
            var storedHash = passwordHashCol >= 0 ? (row[passwordHashCol] || '').toString() : '';
            var storedSalt = passwordSaltCol >= 0 ? (row[passwordSaltCol] || '').toString() : '';
            if (sheetUsername === uname) {
              // Validate current password
              if (storedHash && storedSalt) {
                var computed = computePasswordHash(oldPwd, storedSalt);
                if (computed === storedHash) valid = true;
              } else if (sheetPassword === oldPwd) {
                valid = true;
              }
              if (valid) {
                foundRow = i;
                break;
              }
            }
          }
          if (foundRow === -1 || !valid) {
            result = { status: 'error', message: 'Invalid username or current password' };
          } else {
            // Update password: generate new salt/hash, update sheet
            var newSalt = generateSalt();
            var newHash = computePasswordHash(newPwd, newSalt);
            // Add columns if missing
            if (passwordHashCol === -1) {
              passwordHashCol = headers.length;
              usersSheet.getRange(1, passwordHashCol + 1).setValue('PasswordHash');
              headers.push('PasswordHash');
            }
            if (passwordSaltCol === -1) {
              passwordSaltCol = headers.length;
              usersSheet.getRange(1, passwordSaltCol + 1).setValue('PasswordSalt');
              headers.push('PasswordSalt');
            }
            usersSheet.getRange(foundRow + 1, passwordHashCol + 1).setValue(newHash);
            usersSheet.getRange(foundRow + 1, passwordSaltCol + 1).setValue(newSalt);
            // Optionally clear plaintext password
            if (passwordCol >= 0) {
              usersSheet.getRange(foundRow + 1, passwordCol + 1).setValue('');
            }
            result = { status: 'success', message: 'Password updated successfully' };
          }
        }
      }
    } catch (err) {
      result = { status: 'error', message: 'Change password failed: ' + (err && err.message ? err.message : String(err)) };
    }
  } else if (action === 'login') {
    try {
      var uname = (body && body.username) || (e.parameter && e.parameter.username) || '';
      var pwd = (body && body.password) || (e.parameter && e.parameter.password) || '';
      if (!uname || !pwd) {
        result = { status: 'error', message: 'Missing credentials' };
      } else {
        var usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
        if (!usersSheet) {
          result = { status: 'error', message: 'Users sheet not found' };
        } else {
          var values = usersSheet.getDataRange().getValues();
          var headers = values[0] || [];
          var usernameCol = headers.findIndex(h => /username/i.test(h));
          var passwordCol = headers.findIndex(h => /password/i.test(h));
          var roleCol = headers.findIndex(h => /role/i.test(h));
          var phcCol = headers.findIndex(h => /phc/i.test(h));
          var nameCol = headers.findIndex(h => /name/i.test(h));
          var emailCol = headers.findIndex(h => /email/i.test(h));

          if (usernameCol === -1 || passwordCol === -1) {
            result = { status: 'error', message: 'User sheet has invalid headers' };
          } else {
            var found = null;
              for (var i = 1; i < values.length; i++) {
              var row = values[i];
              if (!row) continue;
              var sheetUsername = (row[usernameCol] || '').toString();
                var sheetPassword = (row[passwordCol] || '').toString();
                // Support for migrated salted hashes: PasswordHash and PasswordSalt columns
                var passwordHashCol = headers.findIndex(h => /passwordhash/i.test(h));
                var passwordSaltCol = headers.findIndex(h => /passwordsalt/i.test(h));
                var storedHash = passwordHashCol >= 0 ? (row[passwordHashCol] || '').toString() : '';
                var storedSalt = passwordSaltCol >= 0 ? (row[passwordSaltCol] || '').toString() : '';

                // If a storedHash exists, validate using salted SHA-256
                var valid = false;
                if (storedHash && storedSalt) {
                  var computed = computePasswordHash(pwd, storedSalt);
                  if (computed === storedHash) {
                    valid = true;
                  }
                } else {
                  // Legacy plaintext password - fallback to direct comparison
                  if (sheetUsername === uname && sheetPassword === pwd) {
                    valid = true;
                  }
                }

                if (sheetUsername === uname && valid) {
                found = {
                  Username: sheetUsername,
                  Role: roleCol >= 0 ? (row[roleCol] || '') : '',
                  PHC: phcCol >= 0 ? (row[phcCol] || '') : '',
                  Name: nameCol >= 0 ? (row[nameCol] || '') : '',
                  Email: emailCol >= 0 ? (row[emailCol] || '') : ''
                };
                  // If login succeeded with legacy plaintext and no hash present, migrate this user to hashed password
                  if (!storedHash || !storedSalt) {
                    try {
                      var newSalt = generateSalt();
                      var newHash = computePasswordHash(pwd, newSalt);
                      // Update the sheet row with new columns, adding headers if necessary
                      if (passwordHashCol === -1) {
                        passwordHashCol = headers.length;
                        usersSheet.getRange(1, passwordHashCol + 1).setValue('PasswordHash');
                        headers.push('PasswordHash');
                      }
                      if (passwordSaltCol === -1) {
                        passwordSaltCol = headers.length;
                        usersSheet.getRange(1, passwordSaltCol + 1).setValue('PasswordSalt');
                        headers.push('PasswordSalt');
                      }
                      // Write values back to the sheet (row index is i+1 because header row is 1)
                      usersSheet.getRange(i+1, passwordHashCol + 1).setValue(newHash);
                      usersSheet.getRange(i+1, passwordSaltCol + 1).setValue(newSalt);
                    } catch (mErr) {
                      // Migration failure should not block login
                      console.warn('Password migration failed for user ' + sheetUsername + ': ' + mErr);
                    }
                  }
                break;
              }
            }

            if (found) {
              // Validate requested role membership if client provides a role selection
              var requestedRole = (body.role || (e.parameter && e.parameter.role) || '').toString().toLowerCase();
              var userRole = (found.Role || '').toString().toLowerCase();

              var roleAllowed = true; // default allow if no requested role provided
              if (requestedRole) {
                if (requestedRole === 'admin') {
                  roleAllowed = (userRole === 'master_admin' || userRole === 'phc_admin');
                } else if (requestedRole === 'phc') {
                  roleAllowed = (userRole === 'phc');
                } else if (requestedRole === 'viewer') {
                  roleAllowed = (userRole === 'viewer');
                } else {
                  // Unknown selection - deny by default
                  roleAllowed = false;
                }
                // Additional check: PHC-linked roles require an assigned PHC
                if (roleAllowed && (userRole === 'phc' || userRole === 'phc_admin')) {
                  var userPHC = found.PHC || '';
                  if (!userPHC || userPHC.toString().trim() === '') {
                    roleAllowed = false;
                  }
                }
              }

              if (!roleAllowed) {
                // Do not reveal whether username exists; this error indicates role mismatch only
                result = { status: 'error', code: 'role_not_permitted', message: 'Selected role is not available for this account. Please choose a different role or contact admin.' };
              } else {
                const session = createSession(found.Username, found.Role, found.PHC, found.Email, found.Name);
                const responsePayload = Object.assign({}, found, {
                  sessionToken: session.token,
                  sessionExpiresAt: session.expiresAt
                });
                result = { status: 'success', data: responsePayload };
              }
            } else {
              result = { status: 'error', message: 'Invalid username or password' };
            }
          }
        }
      }
    } catch (err) {
      result = { status: 'error', message: 'Login handler failed: ' + (err && err.message ? err.message : String(err)) };
    }
  }

  // Return JSON with basic CORS headers (may not satisfy preflight OPTIONS)
  // Use createCorsJsonResponse helper to ensure consistent headers
  return createCorsJsonResponse(result);
}

/**
 * Create a JSON TextOutput with CORS headers for POST/Fetch responses
 * @param {Object} obj - Response object to serialize
 * @returns {TextOutput} ContentService text output with CORS headers
 */
function createCorsJsonResponse(obj) {
  try {
    // Note: ContentService.TextOutput does not support setting HTTP headers via setHeader.
    // Attempting to call setHeader causes a runtime error. Return JSON output only.
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    console.error('createCorsJsonResponse error:', e);
    var fallback = ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Response serialization failed' })).setMimeType(ContentService.MimeType.JSON);
    return fallback;
  }
}

// Function to get data from a sheet

function getSheetData(sheetName) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    // Convert to array of objects with headers as keys
    if (values.length === 0) return [];
    const headers = values[0];
    const data = [];
    for (let i = 1; i < values.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        // Clean up header names by removing spaces and special characters
        const cleanHeader = headers[j].toString().replace(/[^a-zA-Z1-9_]/g, '');
        let cellValue = values[i][j];
        
        // CRITICAL: Convert Date objects to DD/MM/YYYY strings
        // This prevents JSON serialization from creating ISO strings that frontend might misparse
        if (cellValue instanceof Date && !isNaN(cellValue.getTime())) {
          cellValue = formatDateDDMMYYYY(cellValue);
        }
        
        row[cleanHeader] = cellValue;
      }
      data.push(row);
    }
    return data;
  } catch (error) {
    console.error('Error getting data from sheet ' + sheetName + ':', error);
    throw new Error('Failed to retrieve data from ' + sheetName + ' sheet');
  }
}



/**
 * Gets a list of active PHC names from the PHCs sheet
 * @return {Array} Array of active PHC names
 */
function getActivePHCNames() {
  try {
    const phcsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
    if (!phcsSheet) { return []; }
    const data = phcsSheet.getDataRange().getValues();
    if (!data || data.length < 2) { return []; }

    // Expect headers on the first row
    const headers = data[0].map(h => h ? h.toString().toLowerCase().trim() : '');

    // Support a few common header name variants for the PHC name column
    const possibleNameHeaders = ['phcname', 'phc name', 'name', 'phc'];
    let nameCol = -1;
    for (const h of possibleNameHeaders) {
      const idx = headers.indexOf(h);
      if (idx !== -1) { nameCol = idx; break; }
    }

    const statusCol = headers.indexOf('status');

    if (nameCol === -1 || statusCol === -1) {
      console.error("Could not find PHC name or status columns in PHCs sheet. Headers:", headers);
      return [];
    }

    const activePHCNames = data.slice(1)
      .filter(row => row && row[statusCol] && row[statusCol].toString().toLowerCase() === 'active')
      .map(row => row[nameCol])
      .filter(name => name && name.toString().trim() !== '')
      .map(name => name.toString().trim());

    return activePHCNames;
  } catch (error) {
    console.error("Error in getActivePHCNames:", error);
    return [];
  }
}

/**
 * AdminSettings helpers (Key/Value persistence)
 */
function getAdminSetting(key, defaultValue) {
  try {
    const sheet = getOrCreateSheet(ADMIN_SETTINGS_SHEET_NAME, ['Key', 'Value']);
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString() === key) {
        return values[i][1];
      }
    }
    return defaultValue;
  } catch (err) {
    console.error('getAdminSetting error:', err);
    return defaultValue;
  }
}

function setAdminSetting(key, value) {
  try {
    const sheet = getOrCreateSheet(ADMIN_SETTINGS_SHEET_NAME, ['Key', 'Value']);
    const range = sheet.getDataRange();
    const values = range.getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString() === key) {
        // Update value in place (i+1 because sheet rows are 1-indexed)
        sheet.getRange(i + 1, 2).setValue(value);
        return true;
      }
    }
    // Append if key not found
    sheet.appendRow([key, value]);
    return true;
  } catch (err) {
    console.error('setAdminSetting error:', err);
    return false;
  }
}

/**
 * Get secure property with caching for VAPID keys (performance optimization)
 * @param {string} key - Property key
 * @returns {string|null} Property value or null if not found
 */
function getSecureProperty(key) {
  try {
    // Special caching for VAPID keys to avoid repeated PropertiesService calls
    if (key === 'VAPID_PRIVATE_KEY') {
      const now = Date.now();
      if (vapidCache.privateKey && (now - vapidCache.cacheTime) < vapidCache.CACHE_DURATION) {
        LOG.debug('Using cached VAPID_PRIVATE_KEY');
        return vapidCache.privateKey;
      }
      const value = PropertiesService.getScriptProperties().getProperty(key);
      if (value) {
        vapidCache.privateKey = value;
        vapidCache.cacheTime = now;
        LOG.debug('Fetched and cached VAPID_PRIVATE_KEY from PropertiesService');
      }
      return value;
    }
    
    return PropertiesService.getScriptProperties().getProperty(key);
  } catch (error) {
    LOG.error('Error retrieving secure property ' + key, error);
    return null;
  }
}

/**
 * Set secure property and invalidate cache
 * @param {string} key - Property key
 * @param {string} value - Property value
 * @returns {boolean} Success status
 */
function setSecureProperty(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
    // Invalidate cache when setting VAPID key
    if (key === 'VAPID_PRIVATE_KEY') {
      vapidCache.privateKey = null;
      vapidCache.cacheTime = 0;
      vapidCache.tokenGenerators.clear();
      LOG.info('VAPID_PRIVATE_KEY cache invalidated');
    }
    return true;
  } catch (error) {
    LOG.error('Error setting secure property ' + key, error);
    return false;
  }
}

/**
 * Initialize secure properties (run once to setup)
 * This function should be run manually to setup secure keys
 */
function initializeSecureProperties() {
  try {
    // Set VAPID private key - replace with your actual key
    const vapidPrivateKey = 'ECFF1Ohr0PNsE-fhGyFY-_C_kDfyITNeRlgTwfz5XT8';
    
    if (setSecureProperty('VAPID_PRIVATE_KEY', vapidPrivateKey)) {
      console.log('VAPID_PRIVATE_KEY has been securely stored in Script Properties');
    } else {
      console.error('Failed to store VAPID_PRIVATE_KEY');
    }
    
    return { status: 'success', message: 'Secure properties initialized' };
  } catch (error) {
    console.error('Error initializing secure properties:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Build a map of latest follow-up dates per patient for quick lookups.
 */
function buildLatestFollowUpDateMap(followUpsData) {
  const map = {};
  if (!Array.isArray(followUpsData)) return map;
  followUpsData.forEach(row => {
    const patientId = row && (row.PatientID || row.patientId || row.PatientId);
    if (!patientId) return;
    const rawDate = row.FollowUpDate || row.followUpDate || row.SubmissionDate || row.submissionDate;
    const parsed = parseDateFlexible(rawDate);
    if (!parsed) return;
    const key = String(patientId).trim();
    const existing = map[key];
    if (!existing || parsed.getTime() > existing.getTime()) {
      map[key] = new Date(parsed.getTime());
    }
  });
  return map;
}

function getPatientLastFollowUpDateForMetrics(patient, latestFollowUpMap) {
  if (!patient) return null;
  const preferredFields = [patient.LastFollowUp, patient.LastFollowUpDate, patient.lastFollowUp];
  for (let i = 0; i < preferredFields.length; i++) {
    const parsed = parseDateFlexible(preferredFields[i]);
    if (parsed) return parsed;
  }

  const patientId = patient.ID || patient.Id || patient.id;
  if (patientId) {
    const key = String(patientId).trim();
    const latest = latestFollowUpMap[key];
    if (latest) return new Date(latest.getTime());
  }

  const registrationFields = [patient.RegistrationDate, patient.registrationDate, patient.DateRegistered];
  for (let i = 0; i < registrationFields.length; i++) {
    const parsed = parseDateFlexible(registrationFields[i]);
    if (parsed) return parsed;
  }
  return null;
}

function computeFollowUpDueMetrics(patients, followUpsData) {
  const metrics = {
    totalOverdue: 0,
    totalDueThisWeek: 0,
    phcStats: {}
  };
  if (!Array.isArray(patients) || patients.length === 0) return metrics;
  const latestMap = buildLatestFollowUpDateMap(followUpsData || []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today.getTime());
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek.getTime());
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  patients.forEach(patient => {
    const phcLabel = (patient.PHC || patient.phc || '').toString().trim();
    const phcKey = normalizeKey(phcLabel);
    if (!phcKey) return;
    const lastFollowUp = getPatientLastFollowUpDateForMetrics(patient, latestMap);
    if (!lastFollowUp) return;

    const nextDueDate = new Date(lastFollowUp.getTime());
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    const notificationStart = new Date(nextDueDate.getTime());
    notificationStart.setDate(notificationStart.getDate() - 5);
    notificationStart.setHours(0, 0, 0, 0);

    const isOverdue = today >= notificationStart;
    const dueThisWeek = nextDueDate >= startOfWeek && nextDueDate <= endOfWeek;
    if (!isOverdue && !dueThisWeek) return;

    if (!metrics.phcStats[phcKey]) {
      metrics.phcStats[phcKey] = {
        label: phcLabel || 'Unknown PHC',
        overdue: 0,
        dueThisWeek: 0
      };
    }
    if (isOverdue) {
      metrics.phcStats[phcKey].overdue++;
      metrics.totalOverdue++;
    }
    if (dueThisWeek) {
      metrics.phcStats[phcKey].dueThisWeek++;
      metrics.totalDueThisWeek++;
    }
  });
  return metrics;
}

/**
 * =================================================================
 * WEB PUSH NOTIFICATION SENDER (Corrected for Google Apps Script)
 * =================================================================
 */

// This function is the main entry point for sending weekly notifications.
function sendWeeklyPushNotifications() {
  const allPatients = getSheetData(PATIENTS_SHEET_NAME);
  const allSubscriptionsData = getSheetData(PUSH_SUBSCRIPTIONS_SHEET_NAME);
  const allUsers = getSheetData(USERS_SHEET_NAME);
  const allFollowUps = getSheetData(FOLLOWUPS_SHEET_NAME);

  if (!allSubscriptionsData || allSubscriptionsData.length === 0) {
    LOG.info('No push subscriptions found. Exiting.');
    return;
  }

  // Identify Master Admins (case-insensitive)
  const masterAdminUsers = allUsers
    .filter(u => u.Role === 'master_admin')
    .map(u => u.Username);
  const masterAdminSet = new Set(masterAdminUsers.map(name => normalizeKey(name)));

  const followUpMetrics = computeFollowUpDueMetrics(allPatients, allFollowUps);
  LOG.debug('Calculated Follow-up Metrics', followUpMetrics);
  
  // Get VAPID keys from secure properties
  const VAPID_PRIVATE_KEY = getSecureProperty('VAPID_PRIVATE_KEY');
  
  if (!VAPID_PRIVATE_KEY) {
    LOG.error('VAPID_PRIVATE_KEY not found in Script Properties. Please configure it.');
    return;
  }
  
  // Build notification queue (prepare all notifications before sending)
  const notificationQueue = [];
  let invalidCount = 0;
  
  allSubscriptionsData.forEach(subData => {
    try {
      // Support both new schema (UserID, Endpoint) and legacy (PHC, Subscription JSON)
      const userIdRaw = subData.UserID || subData.userID || subData.PHC || subData.phc;
      const userKey = normalizeKey(userIdRaw);
      const endpoint = extractEndpoint(subData);
      
      if (!userKey || !endpoint) {
        LOG.warn('Skipping invalid subscription for user ' + (userIdRaw || '(unknown)') + ' (endpoint or user missing)');
        invalidCount++;
        return;
      }

      // Determine message based on role
      let title = 'Weekly Follow-up Reminder';
      let body = '';
      let shouldSend = false;

      if (masterAdminSet.has(userKey)) {
        // Master Admin gets overall status aligned with dashboard metrics
        body = 'Follow-up Status: ' + followUpMetrics.totalOverdue + ' overdue and ' + followUpMetrics.totalDueThisWeek + ' due this week across all PHCs.';
        shouldSend = true;
      } else {
        // PHC User gets PHC-specific status using canonical metrics
        const phcInfo = followUpMetrics.phcStats[userKey];
        if (phcInfo) {
          const parts = [];
          if (phcInfo.overdue > 0) parts.push(phcInfo.overdue + ' overdue');
          if (phcInfo.dueThisWeek > 0) parts.push(phcInfo.dueThisWeek + ' due this week');
          if (parts.length > 0) {
            const summary = parts.join(' and ');
            body = 'You have ' + summary + ' follow-ups for ' + phcInfo.label + '.';
            shouldSend = true;
          }
        }
      }

      if (shouldSend && endpoint && typeof endpoint === 'string') {
        const notificationPayload = JSON.stringify({
          title: title,
          body: body,
          icon: 'images/notification-icon.png',
          badge: 'images/badge.png'
        });
        
        notificationQueue.push({
          endpoint: endpoint,
          payload: notificationPayload,
          userId: userIdRaw
        });
      }

    } catch (e) {
      LOG.error('Failed to process subscription for user ' + (subData.UserID || 'unknown'), e);
      invalidCount++;
    }
  });
  
  // Send notifications in batches with delays to respect quota limits
  // Apps Script: 6 requests/second per user, so batch 5 at a time with 200ms delay between batches
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 200; // 200ms between batches = 5 batches/second = 25 requests/second max
  let sentCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < notificationQueue.length; i += BATCH_SIZE) {
    const batch = notificationQueue.slice(i, i + BATCH_SIZE);
    
    batch.forEach(notification => {
      const result = sendPushNotification(notification.endpoint, notification.payload);
      if (result && result.success) {
        sentCount++;
      } else {
        failureCount++;
      }
    });
    
    // Add delay between batches to prevent quota exhaustion
    if (i + BATCH_SIZE < notificationQueue.length) {
      Utilities.sleep(BATCH_DELAY_MS);
    }
  }
  
  // Record metrics for analytics
  const startTime = Date.now();
  recordPushNotificationMetrics({
    notificationType: 'weekly_followup',
    successCount: sentCount,
    failureCount: failureCount,
    invalidCount: invalidCount,
    queuedCount: notificationQueue.length,
    sendTime: Date.now() - startTime
  });
  
  // Log final metrics
  LOG.info('sendWeeklyPushNotifications completed', {
    sent: sentCount,
    failed: failureCount,
    invalid: invalidCount,
    queued: notificationQueue.length,
    total: allSubscriptionsData.length,
    batchSize: BATCH_SIZE,
    delayMs: BATCH_DELAY_MS
  });
}

/**
 * Generate a random salt for password hashing
 * @returns {string} Hex string salt
 */
function generateSalt() {
  var bytes = Utilities.getUuid().replace(/-/g, '').substr(0, 16);
  return bytes;
}

/**
 * Compute SHA-256 hex digest of password+salt
 * @param {string} password
 * @param {string} salt
 * @returns {string} hex digest
 */
function computePasswordHash(password, salt) {
  var combined = (password || '') + (salt || '');
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined, Utilities.Charset.UTF_8);
  var hex = raw.map(function(b) {
    var v = (b < 0) ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
  return hex;
}

/**
 * Create a weekly time-based trigger to run the high-risk scan and notify PHC leads.
 * Run once to schedule.
 */
function scheduleWeeklyHighRiskScan() {
  // Remove existing triggers of this function to avoid duplication
  const existing = ScriptApp.getProjectTriggers();
  existing.forEach(t => {
    if (t.getHandlerFunction() === 'runWeeklyHighRiskScanAndNotify') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // Create a weekly trigger (every Monday at 07:00)
  ScriptApp.newTrigger('runWeeklyHighRiskScanAndNotify')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .create();
  return { status: 'success', message: 'Weekly high-risk scan scheduled' };
}

/**
 * Create a weekly time-based trigger for general follow-up reminders.
 * Run once to schedule (e.g. Mondays at 09:00).
 */
function scheduleWeeklyReminders() {
  // Remove existing triggers
  const existing = ScriptApp.getProjectTriggers();
  existing.forEach(t => {
    if (t.getHandlerFunction() === 'sendWeeklyPushNotifications') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('sendWeeklyPushNotifications')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();
    
  return { status: 'success', message: 'Weekly follow-up reminders scheduled for Mondays at 09:00' };
}

/**
 * Schedule daily cleanup of expired and invalid subscriptions
 * Run once to schedule
 */
function scheduleSubscriptionCleanup() {
  // Remove existing triggers
  const existing = ScriptApp.getProjectTriggers();
  existing.forEach(t => {
    if (t.getHandlerFunction() === 'cleanupExpiredSubscriptions') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Schedule daily at 2 AM
  ScriptApp.newTrigger('cleanupExpiredSubscriptions')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
    
  return { status: 'success', message: 'Subscription cleanup scheduled daily at 02:00' };
}

/**
 * Clean up expired and invalid subscriptions
 * - Remove subscriptions with >10 consecutive failures
 * - Remove subscriptions inactive for >90 days
 * - Remove duplicate endpoints (keep most recent)
 */
function cleanupExpiredSubscriptions() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PUSH_SUBSCRIPTIONS_SHEET_NAME);
    if (!sheet) {
      LOG.warn('PushSubscriptions sheet not found');
      return { status: 'error', message: 'PushSubscriptions sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      LOG.debug('No subscriptions to clean up');
      return { status: 'success', message: 'No subscriptions found' };
    }
    
    const headers = data[0];
    const endpointCol = headers.indexOf('Endpoint');
    const statusCol = headers.indexOf('Status');
    const lastActivatedCol = headers.indexOf('LastActivated');
    const failureCountCol = headers.indexOf('FailureCount');
    const createdDateCol = headers.indexOf('CreatedDate');
    
    if (endpointCol === -1) {
      LOG.error('Endpoint column not found in PushSubscriptions sheet');
      return { status: 'error', message: 'Invalid sheet schema' };
    }
    
    const now = new Date();
    const INACTIVE_THRESHOLD = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    const MAX_FAILURES = 10;
    
    const rowsToDelete = [];
    const endpointMap = new Map(); // Track endpoints for deduplication
    
    // First pass: identify rows to delete
    for (let i = 1; i < data.length; i++) {
      const endpoint = data[i][endpointCol];
      const status = data[i][statusCol];
      const lastActivated = data[i][lastActivatedCol] ? new Date(data[i][lastActivatedCol]) : null;
      const failureCount = failureCountCol > 0 ? parseInt(data[i][failureCountCol] || 0) : 0;
      
      let shouldDelete = false;
      let reason = '';
      
      // Check for high failure count
      if (failureCount >= MAX_FAILURES) {
        shouldDelete = true;
        reason = 'High failure count (' + failureCount + ')';
      }
      
      // Check for inactive subscription
      if (lastActivated && (now - lastActivated) > INACTIVE_THRESHOLD) {
        shouldDelete = true;
        reason = 'Inactive for >90 days';
      }
      
      // Check for duplicate endpoints (keep most recent)
      if (endpoint && !shouldDelete) {
        if (endpointMap.has(endpoint)) {
          // Already seen this endpoint - compare dates
          const existingRow = endpointMap.get(endpoint);
          const existingDate = new Date(data[existingRow - 1][lastActivatedCol] || data[existingRow - 1][createdDateCol]);
          const currentDate = new Date(data[i][lastActivatedCol] || data[i][createdDateCol]);
          
          // Delete the older one
          if (currentDate > existingDate) {
            // Current is newer - mark existing for deletion
            rowsToDelete.push({ row: existingRow, reason: 'Duplicate endpoint (older)' });
            endpointMap.set(endpoint, i + 1);
          } else {
            // Existing is newer - mark current for deletion
            shouldDelete = true;
            reason = 'Duplicate endpoint (older)';
          }
        } else {
          endpointMap.set(endpoint, i + 1);
        }
      }
      
      if (shouldDelete) {
        rowsToDelete.push({ row: i + 1, reason });
      }
    }
    
    // Delete rows in reverse order to maintain correct row numbers
    let deletedCount = 0;
    rowsToDelete.sort((a, b) => b.row - a.row);
    for (const item of rowsToDelete) {
      sheet.deleteRow(item.row);
      deletedCount++;
      LOG.debug('Deleted subscription row: ' + item.reason);
    }
    
    LOG.info('cleanupExpiredSubscriptions completed', {
      deletedCount,
      remaining: Math.max(0, data.length - 1 - deletedCount)
    });
    
    return { 
      status: 'success', 
      message: 'Cleaned up ' + deletedCount + ' subscriptions',
      deletedCount,
      remaining: Math.max(0, data.length - 1 - deletedCount)
    };
    
  } catch (e) {
    LOG.error('cleanupExpiredSubscriptions failed', e);
    return { status: 'error', message: e.message };
  }
}

/**
 * Runner that executes the high-risk scan and notifies PHC leads via push
 */
function runWeeklyHighRiskScanAndNotify() {
  try {
    const report = scanHighRiskPatients() || [];
    const totalFindings = report.length;
    LOG.debug('runWeeklyHighRiskScanAndNotify findings loaded', { totalFindings });
    if (totalFindings === 0) {
      LOG.info('runWeeklyHighRiskScanAndNotify exiting early: no high-risk patients identified');
      return { status: 'success', message: 'No high-risk cases' };
    }

    // Group by PHC to notify relevant leads (case-insensitive keys)
    const byPhc = {};
    report.forEach(r => {
      const phcRaw = r.phc || 'Unknown';
      const phcKey = normalizeKey(phcRaw);
      if (!byPhc[phcKey]) {
        byPhc[phcKey] = { label: phcRaw, cases: [] };
      }
      byPhc[phcKey].cases.push(r);
    });

    // Prepare push messages per PHC
    const allSubscriptionsData = getSheetData(PUSH_SUBSCRIPTIONS_SHEET_NAME) || [];
    const allUsers = getSheetData(USERS_SHEET_NAME) || [];
    const masterAdminSet = new Set();
    const userPhcMap = new Map();

    allUsers.forEach(u => {
      const roleKey = normalizeKey(u.Role || '');
      const usernameKey = normalizeKey(u.Username || '');
      const emailKey = normalizeKey(u.Email || '');
      const phcKey = normalizeKey(u.PHC || '');

      if (roleKey === 'master_admin') {
        if (usernameKey) masterAdminSet.add(usernameKey);
        if (emailKey) masterAdminSet.add(emailKey);
      }

      if (phcKey) {
        if (usernameKey) userPhcMap.set(usernameKey, phcKey);
        if (emailKey) userPhcMap.set(emailKey, phcKey);
      }
    });

    // Build notification queue instead of sending immediately
    const notificationQueue = [];
    
    // 1. Queue PHC Lead notifications
    for (const phcKey in byPhc) {
      const phcData = byPhc[phcKey];
      const cases = phcData.cases;
      const phcLabel = phcData.label || 'Unknown';
      const message = 'High-risk alert: ' + cases.length + ' patients need review at ' + phcLabel + '.';
      LOG.debug('Preparing PHC notification batch', { phc: phcLabel, caseCount: cases.length });
      
      allSubscriptionsData.forEach(sub => {
        const statusKey = normalizeKey(sub.Status || sub.status || 'active');
        if (statusKey && statusKey !== 'active') return;

        const subUserKey = normalizeKey(sub.UserID || sub.userID || sub.Email || sub.email || '');
        let subPhcKey = normalizeKey(sub.PHC || sub.phc || '');
        if (!subPhcKey && subUserKey && userPhcMap.has(subUserKey)) {
          subPhcKey = userPhcMap.get(subUserKey);
        }
        const isMasterAdmin = subUserKey && masterAdminSet.has(subUserKey);

        // PHC-targeted notifications should match on PHC column (direct or inferred) and skip master admins (they get summary)
        if (subPhcKey && subPhcKey === phcKey && !isMasterAdmin) {
          const endpointUrl = extractEndpoint(sub);
          if (endpointUrl) {
            const payload = JSON.stringify({ 
              title: 'High-Risk Patients', 
              body: message, 
              data: { phc: phcLabel, count: cases.length } 
            });
            notificationQueue.push({
              endpoint: endpointUrl,
              payload: payload,
              type: 'phc',
              phc: phcLabel,
              subscriptionId: sub.SubscriptionID || sub.subscriptionID || 'unknown'
            });
          }
        }
      });
    }

    // 2. Queue Master Admin notifications (Summary)
    const totalHighRisk = report.length;
    if (totalHighRisk > 0) {
      const summaryMessage = 'High-Risk Alert: ' + totalHighRisk + ' total patients need review across all PHCs.';
      allSubscriptionsData.forEach(sub => {
        const statusKey = normalizeKey(sub.Status || sub.status || 'active');
        if (statusKey && statusKey !== 'active') return;

        const subUserKey = normalizeKey(sub.UserID || sub.userID || sub.Email || sub.email || '');
        if (masterAdminSet.has(subUserKey)) {
          const endpointUrl = extractEndpoint(sub);
          if (endpointUrl) {
            const payload = JSON.stringify({ 
              title: 'High-Risk Summary', 
              body: summaryMessage, 
              data: { count: totalHighRisk } 
            });
            notificationQueue.push({
              endpoint: endpointUrl,
              payload: payload,
              type: 'master',
              subscriptionId: sub.SubscriptionID || sub.subscriptionID || 'unknown'
            });
          }
        }
      });
    }

    // Send notifications in batches with delays to prevent quota exhaustion
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 200;
    let phcPushCount = 0;
    let masterPushCount = 0;
    let phcPushErrors = 0;
    let masterPushErrors = 0;
    
    for (let i = 0; i < notificationQueue.length; i += BATCH_SIZE) {
      const batch = notificationQueue.slice(i, i + BATCH_SIZE);
      
      batch.forEach(notification => {
        try {
          LOG.debug('Sending ' + notification.type + ' push notification', {
            type: notification.type,
            subscriptionId: notification.subscriptionId,
            endpoint: maskEndpoint(notification.endpoint)
          });
          
          const result = sendPushNotification(notification.endpoint, notification.payload);
          if (result && result.success) {
            if (notification.type === 'phc') {
              phcPushCount++;
            } else {
              masterPushCount++;
            }
          } else if (result && result.shouldDelete) {
            LOG.info('Marking invalid subscription as inactive (403/410)', { 
              endpoint: maskEndpoint(notification.endpoint) 
            });
            markSubscriptionInactive(notification.endpoint);
            if (notification.type === 'phc') {
              phcPushErrors++;
            } else {
              masterPushErrors++;
            }
          } else {
            if (notification.type === 'phc') {
              phcPushErrors++;
            } else {
              masterPushErrors++;
            }
          }
        } catch (e) {
          LOG.error('Failed to send ' + notification.type + ' push notification', e);
          if (notification.type === 'phc') {
            phcPushErrors++;
          } else {
            masterPushErrors++;
          }
        }
      });
      
      // Add delay between batches to prevent quota exhaustion
      if (i + BATCH_SIZE < notificationQueue.length) {
        Utilities.sleep(BATCH_DELAY_MS);
      }
    }

    // Record metrics for analytics
    const totalSuccessful = phcPushCount + masterPushCount;
    const totalFailed = phcPushErrors + masterPushErrors;
    recordPushNotificationMetrics({
      notificationType: 'high_risk_alert',
      successCount: totalSuccessful,
      failureCount: totalFailed,
      invalidCount: 0,
      queuedCount: notificationQueue.length,
      sendTime: 0
    });

    LOG.info('runWeeklyHighRiskScanAndNotify completed', {
      totalHighRisk,
      phcPushCount,
      phcPushErrors,
      masterPushCount,
      masterPushErrors,
      subscriptionsChecked: allSubscriptionsData.length,
      queuedCount: notificationQueue.length,
      batchSize: BATCH_SIZE,
      delayMs: BATCH_DELAY_MS
    });

    return { 
      status: 'success', 
      message: 'Notifications sent: ' + (phcPushCount + masterPushCount) + ' succeeded, ' + (phcPushErrors + masterPushErrors) + ' failed',
      totalQueued: notificationQueue.length
    };
  } catch (err) {
    LOG.error('runWeeklyHighRiskScanAndNotify failed', err);
    return { status: 'error', message: err.message };
  }
}

/**
 * Helper to send a single push notification
 */
/**
 * Normalize IDs/keys for case-insensitive comparisons
 */
function normalizeKey(value) {
  if (value === null || value === undefined) return '';
  return value.toString().trim().toLowerCase();
}

/**
 * Helper to extract endpoint URL from subscription data
 * Handles both new schema (Endpoint column) and legacy (Subscription JSON)
 */
function extractEndpoint(sub) {
  let endpoint = sub.Endpoint || sub.endpoint;
  
  // Handle legacy JSON subscription if Endpoint is missing
  if (!endpoint && (sub.Subscription || sub.subscription)) {
    try {
      const parsed = JSON.parse(sub.Subscription || sub.subscription);
      endpoint = parsed.endpoint;
    } catch (e) {
      // ignore
    }
  }
  
  // Validate
  if (!endpoint || typeof endpoint !== 'string' || endpoint === 'undefined' || endpoint.trim() === '') {
    return null;
  }
  
  return endpoint;
}

function maskEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') return '';
  const trimmed = endpoint.trim();
  if (trimmed.length <= 20) return trimmed;

  const domainMatch = trimmed.match(/^https?:\/\/([^\/]+)/i);
  if (domainMatch && domainMatch[1]) {
    const domain = domainMatch[1];
    const tail = trimmed.slice(-12);
    return `${domain}/...${tail}`;
  }

  return `${trimmed.slice(0, 12)}...${trimmed.slice(-8)}`;
}

/**
 * =================================================================
 * PUSH NOTIFICATION ANALYTICS AND METRICS (Phase 4)
 * =================================================================
 */

/**
 * Initialize push metrics sheet if it doesn't exist
 * Tracks: Timestamp, NotificationType, SuccessCount, FailureCount, InvalidCount, TotalQueued
 */
function initializePushMetricsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = 'PushNotificationMetrics';
  
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = ['Timestamp', 'NotificationType', 'SuccessCount', 'FailureCount', 'InvalidCount', 'TotalQueued', 'AverageSendTime'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    LOG.info('Created PushNotificationMetrics sheet', { sheetName });
  }
  return sheet;
}

/**
 * Record push notification metrics to analytics sheet
 * @param {Object} metrics - Object with: notificationType, successCount, failureCount, invalidCount, queuedCount, sendTime
 */
function recordPushNotificationMetrics(metrics) {
  try {
    const sheet = initializePushMetricsSheet();
    const row = [
      new Date(),
      metrics.notificationType || 'unknown',
      metrics.successCount || 0,
      metrics.failureCount || 0,
      metrics.invalidCount || 0,
      metrics.queuedCount || 0,
      metrics.sendTime || 0
    ];
    sheet.appendRow(row);
    LOG.debug('Recorded push metrics', metrics);
  } catch (e) {
    LOG.error('Failed to record push metrics', e);
  }
}

/**
 * Get push notification delivery statistics for the past N days
 * @param {number} days - Number of days to analyze (default 7)
 * @returns {Object} Stats including success rate, total sent, failures, invalid
 */
function getPushNotificationStats(days) {
  try {
    days = days || 7;
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('PushNotificationMetrics');
    if (!sheet) {
      return { status: 'error', message: 'Metrics sheet not found', days };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: 'success', message: 'No metrics data', days, totalSent: 0, successRate: 0, stats: {} };
    }
    
    const headers = data[0];
    const timestampCol = headers.indexOf('Timestamp');
    const typeCol = headers.indexOf('NotificationType');
    const successCol = headers.indexOf('SuccessCount');
    const failureCol = headers.indexOf('FailureCount');
    const invalidCol = headers.indexOf('InvalidCount');
    const queuedCol = headers.indexOf('TotalQueued');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let totalSuccess = 0;
    let totalFailure = 0;
    let totalInvalid = 0;
    let totalQueued = 0;
    const statsByType = {};
    
    for (let i = 1; i < data.length; i++) {
      const timestamp = new Date(data[i][timestampCol]);
      if (timestamp < cutoffDate) continue;
      
      const type = data[i][typeCol] || 'unknown';
      const success = parseInt(data[i][successCol] || 0);
      const failure = parseInt(data[i][failureCol] || 0);
      const invalid = parseInt(data[i][invalidCol] || 0);
      const queued = parseInt(data[i][queuedCol] || 0);
      
      totalSuccess += success;
      totalFailure += failure;
      totalInvalid += invalid;
      totalQueued += queued;
      
      if (!statsByType[type]) {
        statsByType[type] = { success: 0, failure: 0, invalid: 0, queued: 0, count: 0 };
      }
      statsByType[type].success += success;
      statsByType[type].failure += failure;
      statsByType[type].invalid += invalid;
      statsByType[type].queued += queued;
      statsByType[type].count++;
    }
    
    const totalSent = totalSuccess + totalFailure;
    const successRate = totalSent > 0 ? (totalSuccess / totalSent * 100).toFixed(2) : 0;
    
    return {
      status: 'success',
      days: days,
      totalSent: totalSent,
      totalSuccess: totalSuccess,
      totalFailure: totalFailure,
      totalInvalid: totalInvalid,
      totalQueued: totalQueued,
      successRate: parseFloat(successRate),
      failureRate: totalSent > 0 ? (totalFailure / totalSent * 100).toFixed(2) : 0,
      statsByType: statsByType
    };
  } catch (e) {
    LOG.error('Failed to get push notification stats', e);
    return { status: 'error', message: e.message, days };
  }
}

/**
 * Get subscription health summary
 * @returns {Object} Summary of active subscriptions, failures, inactivity
 */
function getSubscriptionHealthSummary() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PUSH_SUBSCRIPTIONS_SHEET_NAME);
    if (!sheet) {
      return { status: 'error', message: 'PushSubscriptions sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { status: 'success', totalSubscriptions: 0, activeSubscriptions: 0, inactiveSubscriptions: 0, highFailureCount: 0 };
    }
    
    const headers = data[0];
    const statusCol = headers.indexOf('Status');
    const failureCountCol = headers.indexOf('FailureCount');
    const lastActivatedCol = headers.indexOf('LastActivated');
    
    let totalSubscriptions = 0;
    let activeSubscriptions = 0;
    let inactiveSubscriptions = 0;
    let highFailureCount = 0; // >= 5 failures (auto-delete at 10)
    let inactive90Days = 0;
    
    const now = new Date();
    const INACTIVE_THRESHOLD = 90 * 24 * 60 * 60 * 1000;
    const HIGH_FAILURE_THRESHOLD = 5;
    
    for (let i = 1; i < data.length; i++) {
      totalSubscriptions++;
      const status = (data[i][statusCol] || 'active').toString().toLowerCase();
      const failureCount = parseInt(data[i][failureCountCol] || 0);
      const lastActivated = data[i][lastActivatedCol] ? new Date(data[i][lastActivatedCol]) : null;
      
      if (status === 'active') {
        activeSubscriptions++;
      } else {
        inactiveSubscriptions++;
      }
      
      if (failureCount >= HIGH_FAILURE_THRESHOLD) {
        highFailureCount++;
      }
      
      if (lastActivated && (now - lastActivated) > INACTIVE_THRESHOLD) {
        inactive90Days++;
      }
    }
    
    return {
      status: 'success',
      totalSubscriptions: totalSubscriptions,
      activeSubscriptions: activeSubscriptions,
      inactiveSubscriptions: inactiveSubscriptions,
      highFailureCount: highFailureCount,
      inactive90Days: inactive90Days,
      health: highFailureCount === 0 && inactive90Days === 0 ? 'good' : 'needs_attention'
    };
  } catch (e) {
    LOG.error('Failed to get subscription health summary', e);
    return { status: 'error', message: e.message };
  }
}

/**
 * Get detailed subscription analytics including trends
 * @returns {Object} Detailed subscription analytics
 */
function getSubscriptionAnalytics() {
  try {
    const subscriptionHealth = getSubscriptionHealthSummary();
    const pushStats = getPushNotificationStats(7);
    
    // Calculate trends
    const weekAgoStats = getPushNotificationStats(14);
    const successRateChange = parseFloat(pushStats.successRate) - parseFloat(weekAgoStats.successRate);
    const trend = successRateChange > 0 ? 'improving' : successRateChange < 0 ? 'declining' : 'stable';
    
    return {
      status: 'success',
      timestamp: new Date(),
      subscriptionHealth: subscriptionHealth,
      pushStats: pushStats,
      trends: {
        successRateTrend: successRateChange.toFixed(2),
        trend: trend
      }
    };
  } catch (e) {
    LOG.error('Failed to get subscription analytics', e);
    return { status: 'error', message: e.message };
  }
}

/**
 * Report endpoint for getting comprehensive push notification dashboard
 * @returns {Object} Dashboard data for monitoring
 */
function getPushNotificationDashboard() {
  try {
    const analytics = getSubscriptionAnalytics();
    const healthSummary = getSubscriptionHealthSummary();
    
    // Add alerts if issues detected
    const alerts = [];
    if (healthSummary.highFailureCount > healthSummary.totalSubscriptions * 0.1) {
      alerts.push('High number of subscriptions with failures (' + healthSummary.highFailureCount + '/' + healthSummary.totalSubscriptions + ')');
    }
    if (healthSummary.inactive90Days > healthSummary.totalSubscriptions * 0.2) {
      alerts.push('Many subscriptions inactive >90 days (' + healthSummary.inactive90Days + '/' + healthSummary.totalSubscriptions + ')');
    }
    if (parseFloat(analytics.pushStats.successRate) < 90) {
      alerts.push('Push success rate below 90%: ' + analytics.pushStats.successRate + '%');
    }
    
    return {
      status: 'success',
      timestamp: new Date(),
      summary: {
        totalSubscriptions: healthSummary.totalSubscriptions,
        activeSubscriptions: healthSummary.activeSubscriptions,
        systemHealth: healthSummary.health,
        pushSuccessRate: analytics.pushStats.successRate + '%',
        trend: analytics.trends.trend
      },
      metrics: analytics.pushStats,
      subscriptionHealth: healthSummary,
      alerts: alerts,
      lastUpdated: new Date()
    };
  } catch (e) {
    LOG.error('Failed to get push notification dashboard', e);
    return { status: 'error', message: e.message };
  }
}

/**
 * Helper to send a single push notification with proper error handling
 * @param {string} endpoint - Push service endpoint URL
 * @param {string} payload - JSON stringified notification payload
 * @returns {Object} Result object with success status and optional shouldDelete flag
 */
function sendPushNotification(endpoint, payload) {
    if (!endpoint || typeof endpoint !== 'string') {
        LOG.error('Invalid endpoint passed to sendPushNotification', { endpoint });
        return { success: false, shouldDelete: false, error: 'Invalid endpoint' };
    }

    const VAPID_PUBLIC_KEY = getSecureProperty('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = getSecureProperty('VAPID_PRIVATE_KEY');
    
    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) { 
        LOG.error('VAPID keys missing from Script Properties');
        return { success: false, shouldDelete: false, error: 'VAPID keys not configured' };
    }
    
    const audience = (endpoint.match(/^https?:\/\/[^\/]+/)||[])[0] || endpoint;
    const tokenGenerator = new VapidTokenGenerator(VAPID_PRIVATE_KEY);
    const vapidToken = tokenGenerator.generate(audience);
    
    const options = { 
        method: 'POST', 
        headers: { 'TTL': '86401', 'Authorization': 'vapid t=' + vapidToken + ', k=' + VAPID_PUBLIC_KEY }, 
        payload: payload, 
        muteHttpExceptions: true 
    };
    
    try {
      const response = UrlFetchApp.fetch(endpoint, options);
      const status = response.getResponseCode();
      
      if (status === 201 || status === 202) {
        LOG.debug('Push delivered successfully', { status, endpoint: maskEndpoint(endpoint) });
        // Reset failure count on success
        incrementSubscriptionFailureCount(endpoint, 0, true);
        return { success: true, status: status };
      } else if (status === 410 || status === 404) {
        LOG.warn('Subscription expired/not found (410/404)', { status, endpoint: maskEndpoint(endpoint) });
        // Increment failure count to eventually auto-delete
        incrementSubscriptionFailureCount(endpoint, 1);
        return { success: false, shouldDelete: true, status: status, endpoint: endpoint };
      } else if (status === 403) {
        const responseText = safeGetContentText(response);
        LOG.error('Push delivery failed (403 - Invalid VAPID credentials)', {
          status: status,
          endpoint: maskEndpoint(endpoint),
          response: responseText
        });
        // 403 means VAPID key mismatch - this subscription should be removed
        incrementSubscriptionFailureCount(endpoint, 1);
        return { success: false, shouldDelete: true, status: status, endpoint: endpoint };
      } else {
        const responseText = safeGetContentText(response);
        LOG.error('Push delivery failed with unexpected status', {
          status: status,
          endpoint: maskEndpoint(endpoint),
          response: responseText
        });
        // Increment failure count
        incrementSubscriptionFailureCount(endpoint, 1);
        return { success: false, shouldDelete: false, status: status };
      }
    } catch (e) {
      LOG.error('Error sending push notification', { endpoint: maskEndpoint(endpoint), error: e.message });
      // Increment failure count on network errors
      incrementSubscriptionFailureCount(endpoint, 1);
      return { success: false, shouldDelete: false, error: e.message };
    }
}

/**
 * Helper to increment subscription failure count or reset on success
 * @param {string} endpoint - The endpoint to update
 * @param {number} increment - Amount to increment (0 = reset on success)
 * @param {boolean} resetOnSuccess - If true, set count to 0
 */
function incrementSubscriptionFailureCount(endpoint, increment, resetOnSuccess) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PUSH_SUBSCRIPTIONS_SHEET_NAME);
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const endpointCol = headers.indexOf('Endpoint');
    const failureCountCol = headers.indexOf('FailureCount');
    
    if (endpointCol === -1 || failureCountCol === -1) return;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][endpointCol] === endpoint) {
        const currentCount = parseInt(data[i][failureCountCol] || 0);
        const newCount = resetOnSuccess ? 0 : (currentCount + increment);
        sheet.getRange(i + 1, failureCountCol + 1).setValue(newCount);
        if (increment > 0) {
          LOG.debug('Updated subscription failure count', { endpoint: maskEndpoint(endpoint), count: newCount });
        }
        break;
      }
    }
  } catch (e) {
    LOG.error('Failed to update subscription failure count', e);
  }
}

  function safeGetContentText(response) {
    try {
      return response.getContentText();
    } catch (err) {
      return '[unavailable]';
    }
  }

/**
 * Helper to mark invalid subscriptions as inactive
 */
function markSubscriptionInactive(endpoint) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PUSH_SUBSCRIPTIONS_SHEET_NAME);
    if (!sheet) {
      LOG.warn('PushSubscriptions sheet not found');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const endpointCol = headers.indexOf('Endpoint');
    const statusCol = headers.indexOf('Status');
    
    if (endpointCol === -1 || statusCol === -1) {
      LOG.warn('Required columns not found in PushSubscriptions sheet', { endpointCol, statusCol });
      return;
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][endpointCol] === endpoint) {
        sheet.getRange(i + 1, statusCol + 1).setValue('Inactive');
        LOG.info('Marked subscription as inactive', { endpoint: maskEndpoint(endpoint) });
        break;
      }
    }
  } catch (e) {
    LOG.error('Failed to mark subscription inactive', e);
  }
}

/**
 * Normalize patient object fields for client consumption.
 * - Ensure ID is a trimmed string
 * - Canonicalize PatientStatus to a known set of values
 * - Format NextFollowUpDate as DD/MM/YYYY when possible
 * - Trim FollowUpStatus
 * - Try to parse Medications if stored as JSON string
 */
function normalizePatientForClient(patient) {
  if (!patient || typeof patient !== 'object') return patient;
  var out = Object.assign({}, patient);

  // Normalize ID to string
  try {
    out.ID = (out.ID === null || out.ID === undefined) ? '' : String(out.ID).trim();
  } catch (e) {
    out.ID = String(out.ID || '').trim();
  }

  // Canonical PatientStatus mapping
  try {
    var s = (out.PatientStatus || out.patientStatus || '').toString().trim();
    var key = s.toLowerCase();
    var statusMap = {
      'draft': 'Draft',
      'new': 'New',
      'active': 'Active',
      'pending': 'Pending',
      'follow-up': 'Follow-up',
      'followup': 'Follow-up',
      'follow up': 'Follow-up',
      'follow up required': 'Follow-up',
      'referred to mo': 'Referred to MO',
      'referred to m o': 'Referred to MO',
      'referred to moh': 'Referred to MO',
      'referred to tertiary': 'Referred for Tertiary Care',
      'referred for tertiary care': 'Referred for Tertiary Care',
      'tertiary consultation complete': 'Tertiary Consultation Complete',
      'deceased': 'Deceased',
      'inactive': 'Inactive',
      'referred to tertiary care': 'Referred for Tertiary Care',
      'referred to mo (phc)': 'Referred to MO'
    };
    out.PatientStatus = statusMap.hasOwnProperty(key) ? statusMap[key] : (s || '');
  } catch (e) {
    out.PatientStatus = out.PatientStatus || '';
  }

  // Normalize FollowUpStatus text
  try { out.FollowUpStatus = (out.FollowUpStatus || out.followUpStatus || '').toString().trim(); } catch (e) { out.FollowUpStatus = out.FollowUpStatus || ''; }

  // Normalize NextFollowUpDate to DD/MM/YYYY when parseable
  try {
    var nfd = out.NextFollowUpDate || out.nextFollowUpDate || '';
    if (nfd && nfd.toString().trim() !== '') {
      var parsed = parseDateFlexible(nfd);
      if (parsed) out.NextFollowUpDate = formatDateDDMMYYYY(parsed);
      else out.NextFollowUpDate = String(nfd).trim();
    } else {
      out.NextFollowUpDate = '';
    }
  } catch (e) { out.NextFollowUpDate = out.NextFollowUpDate || ''; }

  // Try to parse Medications field if it's a JSON string
  try {
    if (out.Medications && typeof out.Medications === 'string') {
      var t = out.Medications.trim();
      if ((t.charAt(0) === '[') || (t.charAt(0) === '{')) {
        try { out.Medications = JSON.parse(t); } catch (pe) { /* leave as string if parse fails */ }
      }
    }
  } catch (e) { /* ignore */ }

  // Normalize NearestAAMCenter to ensure it's present with correct casing
  try {
    if (!out.NearestAAMCenter) {
      out.NearestAAMCenter = out.nearestAAMCenter || out.nearestAamCenter || out.AAMCenter || '';
    }
  } catch (e) { /* ignore */ }

  return out;
}

/**
 * Utility to manually send a test push notification to the first valid subscription
 * Optionally pass a username/PHC to target a specific subscription.
 */
function sendTestPushNotification(targetUserId) {
  const allSubscriptionsData = getSheetData(PUSH_SUBSCRIPTIONS_SHEET_NAME) || [];
  if (!allSubscriptionsData.length) {
    console.log('sendTestPushNotification: No subscriptions saved.');
    return;
  }

  const desiredKey = normalizeKey(targetUserId);
  let targetSub = null;
  if (desiredKey) {
    targetSub = allSubscriptionsData.find(sub => {
      const subUser = sub.UserID || sub.userID || sub.PHC || sub.phc || '';
      return normalizeKey(subUser) === desiredKey;
    });
  }
  if (!targetSub) {
    targetSub = allSubscriptionsData.find(sub => extractEndpoint(sub));
  }

  if (!targetSub) {
    console.log('sendTestPushNotification: No valid subscription with endpoint found.');
    return;
  }

  const endpoint = extractEndpoint(targetSub);
  if (!endpoint) {
    console.log('sendTestPushNotification: Selected subscription missing endpoint.');
    return;
  }

  const testPayload = JSON.stringify({
    title: 'Epicare Push Test',
    body: `This is a test push sent at ${new Date().toLocaleString()}`
  });

  console.log('sendTestPushNotification: Sending test push to', targetSub.UserID || targetSub.PHC || 'unknown');
  sendPushNotification(endpoint, testPayload);
}

/**
 * MIGRATION FUNCTION: Fix existing dates in Patients and FollowUps sheets.
 * 
 * Problem: Google Sheets has been storing dates incorrectly because:
 * 1. We wrote strings like "06/01/2026" to sheets
 * 2. Google Sheets auto-interpreted these as MM/DD/YYYY (US locale) = June 1st
 * 3. But we intended DD/MM/YYYY = January 6th
 * 
 * This function finds all dates that look wrong and fixes them by:
 * - Reading the raw value from the sheet
 * - If it's a Date object that shows wrong month, swap day/month
 * - Write back the corrected Date object
 * 
 * Run this manually from Apps Script editor: Run > fixAllDatesInSheets
 */
function fixAllDatesInSheets() {
  const results = {
    patientsFixed: 0,
    followUpsFixed: 0,
    errors: []
  };
  
  try {
    results.patientsFixed = fixDatesInSheet(PATIENTS_SHEET_NAME, ['RegistrationDate', 'LastFollowUp', 'NextFollowUpDate', 'DOB', 'DateOfBirth', 'LastMedicationChangeDate', 'LastWeightAgeUpdateDate']);
  } catch (e) {
    results.errors.push('Patients: ' + e.message);
  }
  
  try {
    results.followUpsFixed = fixDatesInSheet(FOLLOWUPS_SHEET_NAME, ['FollowUpDate', 'SubmissionDate', 'NextFollowUpDate', 'NDDIEScreeningDate', 'DateOfDeath']);
  } catch (e) {
    results.errors.push('FollowUps: ' + e.message);
  }
  
  console.log('Date fix results:', JSON.stringify(results));
  return results;
}

/**
 * Fix dates in a specific sheet by detecting and correcting swapped month/day values.
 */
function fixDatesInSheet(sheetName, dateColumnNames) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    console.log('Sheet not found: ' + sheetName);
    return 0;
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;
  
  const header = data[0];
  const dateColIndices = {};
  dateColumnNames.forEach(function(colName) {
    var idx = header.indexOf(colName);
    if (idx !== -1) dateColIndices[colName] = idx;
  });
  
  console.log(sheetName + ' - Date columns found:', Object.keys(dateColIndices).join(', '));
  
  let fixedCount = 0;
  const today = new Date();
  
  for (var rowIdx = 1; rowIdx < data.length; rowIdx++) {
    var row = data[rowIdx];
    
    for (var colName in dateColIndices) {
      var colIdx = dateColIndices[colName];
      var cellValue = row[colIdx];
      
      if (!cellValue) continue;
      
      // If it's already a Date object, check if the date looks wrong
      if (cellValue instanceof Date && !isNaN(cellValue.getTime())) {
        var day = cellValue.getDate();
        var month = cellValue.getMonth() + 1; // 1-12
        var year = cellValue.getFullYear();
        
        // Heuristic: For dates in 2026 that show month=6 (June) but day <= 12,
        // they might have been intended as day=6, month=1 (January)
        // 
        // Key insight: Today is January 6, 2026. 
        // A LastFollowUp or FollowUpDate showing June 2026 is impossible (future).
        // A RegistrationDate showing June 2026 is impossible (future).
        // These were likely meant to be January 6, 2026.
        
        var shouldSwap = false;
        
        // If the date is in the future (month > current month for 2026), it's likely swapped
        if (year === 2026) {
          // For past-oriented dates (LastFollowUp, FollowUpDate, RegistrationDate, SubmissionDate)
          if (colName === 'LastFollowUp' || colName === 'FollowUpDate' || colName === 'RegistrationDate' || colName === 'SubmissionDate') {
            // These should not be in the future
            if (cellValue > today && day <= 12) {
              // Try swapping - would it make the date in the past?
              var swappedDate = new Date(year, day - 1, month);
              if (swappedDate <= today) {
                shouldSwap = true;
              }
            }
          }
          // For NextFollowUpDate, it can be in future, but if month is way off, check
          if (colName === 'NextFollowUpDate') {
            // If showing as June but we're in January, and day is small, likely swapped
            if (month >= 6 && day <= 6 && today.getMonth() === 0) {
              shouldSwap = true;
            }
          }
        }
        
        if (shouldSwap && day <= 12 && month <= 12) {
          // Swap day and month
          var correctedDate = new Date(year, day - 1, month);
          sheet.getRange(rowIdx + 1, colIdx + 1).setValue(correctedDate);
          fixedCount++;
          console.log(sheetName + ' row ' + (rowIdx + 1) + ', ' + colName + ': Swapped ' + 
            (month + '/' + day + '/' + year) + ' to ' + (day + '/' + month + '/' + year));
        }
      }
    }
  }
  
  console.log(sheetName + ': Fixed ' + fixedCount + ' date cells');
  return fixedCount;
}