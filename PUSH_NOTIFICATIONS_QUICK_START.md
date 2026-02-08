# Push Notification System - Quick Start Deployment Guide

## ⚡ 5-Minute Setup

### Step 1: Generate VAPID Keys (2 minutes)

```bash
# If you have npm installed:
npm install -g web-push
web-push generate-vapid-keys

# Or use online generator: https://tools.reactpwa.com/generate-keys

# Output will be:
# Public Key: BAA...xyz
# Private Key: xxx...
```

### Step 2: Configure Keys in Script Properties (1 minute)

In Google Apps Script editor, paste this into the console and run:

```javascript
function configureVAPIDKeys() {
  const PUBLIC_KEY = 'BAA...xyz'; // Replace with your public key
  const PRIVATE_KEY = 'xxx...';   // Replace with your private key
  
  setSecureProperty('VAPID_PUBLIC_KEY', PUBLIC_KEY);
  setSecureProperty('VAPID_PRIVATE_KEY', PRIVATE_KEY);
  
  Logger.log('✅ VAPID keys configured successfully');
}

configureVAPIDKeys();
```

### Step 3: Initialize Sheets & Triggers (1 minute)

```javascript
function initializeSystem() {
  // Create metrics sheet
  initializePushMetricsSheet();
  
  // Setup automatic triggers
  scheduleSubscriptionCleanup();
  
  // You may also need to run these if not already scheduled:
  // scheduleWeeklyReminders();
  // scheduleWeeklyHighRiskScan();
  
  Logger.log('✅ System initialized');
}

initializeSystem();
```

### Step 4: Verify Setup (1 minute)

```javascript
function verifySetup() {
  // Test the dashboard
  const dashboard = getPushNotificationDashboard();
  Logger.log(JSON.stringify(dashboard, null, 2));
  
  // Expected output:
  // - totalSubscriptions: X
  // - systemHealth: 'good' or 'needs_attention'
  // - pushSuccessRate: 'X%'
}

verifySetup();
```

---

## 🎯 What's Now Running

After setup, these run **automatically**:

1. **Daily at 2 AM** - Cleanup of dead subscriptions
   - Removes subscriptions with 10+ failures
   - Removes subscriptions inactive >90 days
   - Removes duplicate endpoints

2. **Weekly** - Follow-up reminder notifications (time configured)
   - PHC users get PHC-specific reminders
   - Master admins get overall summary
   - Sent in batches with 200ms delays (safe quota usage)

3. **Weekly** - High-risk patient alerts (time configured)
   - Automatic scan for high-risk patients
   - Targeted alerts to relevant PHC teams
   - Summary to master admins

---

## 📊 Monitor System Health

### Daily Health Check
```javascript
function dailyHealthCheck() {
  const dashboard = getPushNotificationDashboard();
  
  // Check for alerts
  if (dashboard.alerts.length > 0) {
    Logger.log('⚠️  System Alerts:');
    dashboard.alerts.forEach(alert => Logger.log('  - ' + alert));
  } else {
    Logger.log('✅ System Healthy');
  }
}
```

### Weekly Statistics
```javascript
function weeklyReport() {
  const stats = getPushNotificationStats(7);
  const health = getSubscriptionHealthSummary();
  
  Logger.log('📊 Weekly Report:');
  Logger.log('  Success Rate: ' + stats.successRate + '%');
  Logger.log('  Total Sent: ' + stats.totalSent);
  Logger.log('  Failed: ' + stats.totalFailure);
  Logger.log('  Active Subscriptions: ' + health.activeSubscriptions);
  Logger.log('  High Failures: ' + health.highFailureCount);
}
```

---

## 🔧 Configuration Options

### Batch Size (Advanced)
To change batch size, modify in both functions:
```javascript
const BATCH_SIZE = 5;        // Change to 10 for faster (but higher quota usage)
const BATCH_DELAY_MS = 200;  // Change to 100 for faster (but approach quota limit)
```

### Cleanup Thresholds (Advanced)
To change cleanup criteria, modify `cleanupExpiredSubscriptions()`:
```javascript
const MAX_FAILURES = 10;                    // Delete if >= X failures
const INACTIVE_THRESHOLD = 90 * 24 * 60 * 60 * 1000; // 90 days in ms
```

### Cache Duration (Advanced)
To change VAPID key cache duration, modify `vapidCache`:
```javascript
vapidCache.CACHE_DURATION = 3600000; // 1 hour in milliseconds
```

---

## 🐛 Troubleshooting

### Issue: "VAPID keys not configured"
**Solution**: Run configureVAPIDKeys() function with your keys

### Issue: "PushSubscriptions sheet not found"
**Solution**: 
1. Create a sheet named "PushSubscriptions"
2. Add headers: SubscriptionID, UserID, Endpoint, Keys, CreatedDate, LastActivated, Status, FailureCount

### Issue: "Success rate dropping below 90%"
**Solution**:
1. Check push service status (Firebase Cloud Messaging, Apple Push, etc.)
2. Review LOG statements for specific errors
3. Run manual cleanup: `cleanupExpiredSubscriptions()`

### Issue: "Quota exhaustion errors"
**Solution**: This should not happen with batch sending enabled
- Verify BATCH_SIZE = 5 and BATCH_DELAY_MS = 200
- Check execution logs for timeout errors
- May need to reduce batch size to 3 if still hitting limits

### Issue: "Duplicate notifications"
**Solution**:
1. Check for multiple subscriptions per user
2. Run cleanupExpiredSubscriptions() to remove duplicates
3. Verify subscribePush handler is working (should prevent new duplicates)

---

## 📈 Expected Performance

### Metrics to Track
- **Success Rate**: Should be ≥95% (target)
- **Failure Count**: Should be <5% of subscriptions
- **Inactivity**: <10% inactive >90 days
- **Processing Time**: <15 seconds for 100+ subscriptions

### Dashboard Interpretation
```javascript
dashboard = getPushNotificationDashboard();

// Green light ✅
{
  systemHealth: 'good',
  pushSuccessRate: '96.0%',
  trend: 'stable',
  alerts: []
}

// Yellow light ⚠️
{
  systemHealth: 'needs_attention',
  pushSuccessRate: '85.0%',
  trend: 'declining',
  alerts: [
    'Push success rate below 90%: 85%'
  ]
}
```

---

## 🚀 Next Steps

1. **Complete the 5-minute setup above**
2. **Monitor the dashboard daily** for the first week
3. **Review weekly statistics** to establish baseline
4. **Set up alerts** if you use Slack/email monitoring
5. **Train team** on viewing metrics and alerts

---

## 📚 Further Reading

- [Full Implementation Summary](PUSH_NOTIFICATION_FIX_SUMMARY.md)
- [Implementation Verification](PUSH_NOTIFICATION_IMPLEMENTATION_VERIFICATION.md)
- [Code Documentation](Google Apps Script Code/main.gs) - Search for "PUSH NOTIFICATION" comments

---

## ✅ Checklist - Ready for Production

- [ ] VAPID keys generated and configured
- [ ] Sheets initialized (PushSubscriptions, PushNotificationMetrics)
- [ ] Triggers scheduled (cleanupExpiredSubscriptions)
- [ ] Verification test passed
- [ ] Team notified of new system
- [ ] Monitoring dashboard bookmarked

---

**You're ready! Your push notification system is now production-grade.** 🎉

For questions, refer to the full documentation or review the LOG statements in Apps Script execution logs.

