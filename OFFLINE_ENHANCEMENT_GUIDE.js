/**
 * OFFLINE FUNCTIONALITY INTEGRATION GUIDE
 * 
 * This document explains the enhanced offline features and how to use them
 * Date: February 8, 2026
 */

// =====================================================
// OVERVIEW
// =====================================================

/**
 * The Epilepsy Management System now includes comprehensive offline functionality:
 * 
 * 1. OFFLINE PATIENT CACHING
 *    - Patients cached on login (daily refresh)
 *    - Role-based access (PHC staff: assigned PHC patients only; Master admin: limited data)
 *    - Automatic cache expiration after 24 hours
 *    
 * 2. SYNC QUEUE PRIORITIZATION  
 *    - New patient creation: Priority 1 (CRITICAL)
 *    - Patient updates: Priority 2 (HIGH)
 *    - Follow-ups & seizure events: Priority 3 (MEDIUM)
 *    - Other actions: Priority 4 (LOW)
 *    - Syncs in priority order when online
 *    
 * 3. CONFLICT RESOLUTION
 *    - Auto-merge simple fields (Notes, Comments, Phone, Email, etc.)
 *    - Show diff UI for complex fields (Status, Dosage, Code, etc.)
 *    - Last-write-wins with version tracking
 *    
 * 4. VERSION TRACKING
 *    - Every offline edit creates a version record
 *    - Tracks: versionId, timestamp, action, data, sync status
 *    - Enables conflict detection when sync occurs
 *    
 * 5. OFFLINE AUDIT LOGGING
 *    - All offline actions logged (completeFollowUp, createPatient, etc.)
 *    - Role-based audit records (PHC staff: full detail; Master admin: PII stripped)
 *    - Sync status tracking: pending/synced
 *    
 * 6. ENHANCED RETRY LOGIC
 *    - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
 *    - Jitter added to prevent thundering herd
 *    - Max retries per action type:
 *      * createPatient: 3 retries
 *      * updatePatient: 5 retries
 *      * completeFollowUp: 5 retries
 *      * createSeizureEvent: 5 retries
 *    
 * 7. SYNC QUEUE MANAGEMENT UI
 *    - View all queued items with status and retry count
 *    - Manual retry individual items
 *    - Delete unwanted items
 *    - View audit log of offline activities
 *    - Accessible via "☁️" button in header (when items queued)
 *    
 * 8. DATA ENCRYPTION
 *    - Patient data encrypted in IndexedDB (optional, client-side obfuscation)
 *    - Encryption key derived from session token + device fingerprint
 *    - Key cleared on logout
 *    
 * 9. OFFLINE CDS FALLBACK
 *    - Dosage validation (e.g., Phenytoin: 200-600mg/day)
 *    - Seizure classification (generalized vs focal)
 *    - Drug interaction checking (e.g., Phenytoin + Valproic Acid)
 *    - Clearly marked as "OFFLINE MODE" in UI
 */

// =====================================================
// USAGE EXAMPLES
// =====================================================

/**
 * EXAMPLE 1: Check if data is cached for offline access
 */

async function checkCachedPatient(patientId) {
  const cached = await window.OfflinePatientCacheManager.getCachedPatient(patientId);
  
  if (cached) {
    console.log('Patient loaded from offline cache:', cached);
    // Display freshness indicator
    const cacheAge = Date.now() - cached._cacheTime;
    const hours = Math.floor(cacheAge / (1000 * 60 * 60));
    console.log(`Patient data from ${hours} hours ago`);
  } else {
    console.log('Patient not in cache - will fetch online');
  }
}

/**
 * EXAMPLE 2: Log offline action to audit trail
 */

async function logOfflineAction(actionType, data) {
  try {
    const auditId = await window.OfflineAuditLogger.logOfflineAction(
      actionType,           // e.g., 'completeFollowUp'
      'FollowUp',           // entityType
      data.patientId,       // entityId
      data,                 // full data
      window.currentUserRole,
      window.currentUserName
    );
    
    console.log('Action logged with audit ID:', auditId);
  } catch (err) {
    console.error('Failed to log offline action:', err);
  }
}

/**
 * EXAMPLE 3: Get offline CDS assessment
 */

async function getOfflineAssessment(patient, seizureInfo, medications) {
  const assessment = window.OfflineCDSFallback.getOfflineAssessment(
    patient,
    seizureInfo,
    medications
  );
  
  console.log('Offline CDS Assessment:');
  console.log('- Seizure Classification:', assessment.components.seizureClassification);
  console.log('- Dosage Validation:', assessment.components.dosageValidation);
  console.log('- Drug Interactions:', assessment.components.drugInteractions);
  console.log('- Disclaimer:', assessment.disclaimer);
  
  return assessment;
}

/**
 * EXAMPLE 4: Encrypt sensitive patient data
 */

async function encryptPatientData(patient) {
  const encrypted = await window.OfflineDataEncryption.encryptData(patient);
  
  // Store encrypted data
  await window.OfflineDataEncryption.storeEncryptedPatient(patient);
  
  console.log('Patient data encrypted and stored');
}

/**
 * EXAMPLE 5: Manually trigger sync
 */

async function manualSync() {
  if (!navigator.onLine) {
    console.warn('Cannot sync while offline');
    return;
  }
  
  // Message service worker to process sync queue
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'MANUAL_SYNC'
    });
    
    console.log('Manual sync triggered');
  }
}

/**
 * EXAMPLE 6: Show sync queue UI
 */

async function showSyncQueueUI() {
  await window.OfflineSyncQueueUI.showSyncQueueModal();
  // User can now see queued items, retry, or delete
}

/**
 * EXAMPLE 7: Get version history of entity
 */

async function getEntityVersionHistory(patientId) {
  const history = await window.OfflineVersionTracker.getVersionHistory('FollowUp', patientId);
  
  console.log('Version history:');
  history.forEach(version => {
    console.log(`- ${version.action} at ${new Date(version.timestamp).toLocaleString()}`);
    console.log(`  Status: ${version.synced ? 'Synced' : 'Pending'}`);
  });
  
  return history;
}

/**
 * EXAMPLE 8: Detect and resolve conflicts
 */

async function handleConflict(offlineVersion, serverVersion) {
  const conflict = window.OfflineConflictResolver.detectConflict(
    offlineVersion,
    serverVersion
  );
  
  if (!conflict) {
    console.log('No conflicts detected');
    return serverVersion;
  }
  
  console.log('Conflicts detected in fields:', conflict.conflictedFields);
  
  // Auto-merge simple fields
  if (conflict.autoMergeableFields.length > 0) {
    const merged = window.OfflineConflictResolver.autoMerge(
      offlineVersion,
      serverVersion,
      conflict
    );
    console.log('Auto-merged:', conflict.autoMergeableFields.map(f => f.field));
    return merged;
  }
  
  // Show diff for complex fields that need review
  if (conflict.requiresUserReview.length > 0) {
    const diff = window.OfflineConflictResolver.createDiffView(conflict);
    // Display diff UI to user
    return diff;
  }
}

/**
 * EXAMPLE 9: Get audit log
 */

async function getAuditLog() {
  const logs = await window.OfflineAuditLogger.getAuditLog({
    username: window.currentUserName,
    synced: false
  });
  
  console.log('Pending offline actions:');
  logs.forEach(log => {
    console.log(`- ${log.action} on ${log.entityType}:`);
    console.log(`  Timestamp: ${new Date(log.timestamp).toLocaleString()}`);
    console.log(`  Role: ${log.userRole}`);
  });
  
  return logs;
}

// =====================================================
// ROLE-BASED OFFLINE CAPABILITIES
// =====================================================

/**
 * PHC STAFF (phc, phc_admin)
 * ✅ Extended Offline:
 *    - Cache assigned PHC patients (full data)
 *    - Submit follow-ups offline
 *    - Log seizure events offline
 *    - Can sync all cached patient data
 * ❌ Restricted:
 *    - Cannot create new patients offline
 *    - Cannot access other PHC patients offline
 * 
 * MASTER ADMIN
 * ✅ Limited Offline:
 *    - Cache all patient list (reduced data - no PII)
 *    - View patient reference data
 *    - Cannot create new patients offline
 * ❌ Offline:
 *    - Cannot view sensitive patient data
 *    - Cannot submit follow-ups
 * 
 * VIEWER
 * ✅ Limited:
 *    - Cache recently viewed patients (last 20)
 *    - Submit follow-ups (if permitted)
 * ❌ Offline:
 *    - Cannot access other patients' data
 *    - Cannot modify patient records
 */

// =====================================================
// OFFLINE SYNC QUEUE STATUS API
// =====================================================

/**
 * Methods available on all offline manager classes:
 * 
 * OfflinePatientCacheManager:
 *   - getCachedPatientList()
 *   - getCachedPatient(patientId)
 *   - cachePatientDetail(patient)
 *   - cachePatientListOnLogin(patients, role, phc)
 * 
 * OfflineAuditLogger:
 *   - logOfflineAction(action, entityType, entityId, data, role, username)
 *   - getAuditLog(filters)
 *   - markAuditSynced(auditId, syncResult)
 * 
 * OfflineVersionTracker:
 *   - trackEntityVersion(entityType, entityId, data, action)
 *   - getVersionHistory(entityType, entityId)
 *   - markVersionSynced(versionId, serverData)
 * 
 * OfflineConflictResolver:
 *   - detectConflict(offlineVersion, serverVersion)
 *   - autoMerge(offlineVersion, serverVersion, conflictData)
 *   - createDiffView(conflictData)
 * 
 * EnhancedSyncRetryManager:
 *   - calculateNextRetryDelay(action, retryCount)
 *   - shouldRetry(action, retryCount)
 *   - scheduleRetry(item, delay)
 * 
 * OfflineDataEncryption:
 *   - encryptData(data, key)
 *   - decryptData(encryptedObj, key)
 *   - storeEncryptedPatient(patient)
 *   - getEncryptedPatient(patientId)
 *   - clearEncryptionKey()
 *   - clearEncryptedData()
 * 
 * OfflineCDSFallback:
 *   - validateDosageOffline(drugName, dose, frequency)
 *   - classifySeizureOffline(seizureDescription)
 *   - checkDrugInteractionsOffline(drugs)
 *   - getOfflineAssessment(patient, seizureInfo, medications)
 *   - cacheOfflineRules(rules)
 *   - loadCachedRules()
 * 
 * OfflineSyncQueueUI:
 *   - showSyncQueueModal()
 *   - refreshQueueDisplay()
 *   - triggerManualSync()
 */

// =====================================================
// INTEGRATION WITH EXISTING CODE
// =====================================================

/**
 * The offline modules integrate seamlessly:
 * 
 * 1. On Login:
 *    - handleLoginSuccess() automatically caches patient list
 *    - startPeriodicSessionValidation() continues to run
 * 
 * 2. On Follow-up Submission:
 *    - 202 response (offline) automatically logs audit trail
 *    - Offline action tracked with version info
 * 
 * 3. Service Worker Sync Queue:
 *    - Prioritizes by action type (new patients first)
 *    - Retries with exponential backoff
 *    - Notifies client of success/failure
 * 
 * 4. On Logout:
 *    - stopPeriodicSessionValidation()
 *    - Encryption key cleared
 *    - Session audit logged
 * 
 * 5. Offline.html:
 *    - Shows cached patient list if available
 *    - Displays sync queue status
 *    - "Try Again" button triggers sync
 */

// =====================================================
// CONFIGURATION & CUSTOMIZATION
// =====================================================

/**
 * To customize offline behavior, edit constants in offline-enhanced.js:
 * 
 * OfflinePatientCacheManager:
 *   - CACHE_DURATION: 24 hours (change to 7 days, etc.)
 *   - MAX_CACHE_SIZE: 50MB (increase for more patients)
 * 
 * EnhancedSyncRetryManager:
 *   - RETRY_CONFIG: Adjust max retries per action type
 *   - Base delays and maximum retry times
 * 
 * OfflineCDSFallback:
 *   - OFFLINE_RULES: Add more drugs, interactions, classifications
 * 
 * Example: Increase cache duration to 7 days
 * OfflinePatientCacheManager.CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
 */

// =====================================================
// TESTING OFFLINE MODE
// =====================================================

/**
 * To test offline functionality:
 * 
 * 1. In Chrome DevTools:
 *    - Open Application > Service Workers
 *    - Check "Offline" to simulate offline mode
 *    - App will show offline banner and cache data
 * 
 * 2. Test sync queue:
 *    - Go offline
 *    - Submit follow-up (shows "queued offline" toast)
 *    - Check sync queue button (shows count)
 *    - Go back online
 *    - Sync triggers automatically or click "Sync Now"
 * 
 * 3. View audit log:
 *    - Click sync queue button (⚠️ icon in header)
 *    - See "Offline Activity Audit Log" section
 *    - Shows all offline actions and sync status
 * 
 * 4. Test encryption:
 *    - Open DevTools > Application > IndexedDB
 *    - View EpicareOfflineDB > encryptedData store
 *    - Patient data is encrypted/obfuscated
 * 
 * 5. Test CDS fallback:
 *    - Go offline
 *    - Open CDS evaluation (cached rules used)
 *    - See "OFFLINE MODE" banner
 *    - Dosage validation works with local rules
 */

console.log('Offline Enhanced Implementation Guide loaded');
