/**
 * notifications.js - Handles all push notification functionality for the Epilepsy Management System
 * 
 * This module handles:
 * - Scheduling and sending weekly notifications to CHOs
 * - Tracking follow-up counts per PHC
 * - Managing notification preferences
 */

const NotificationManager = (function() {
    // Private variables
    let notificationInterval;
    const NOTIFICATION_DAY = 1; // Monday (0 = Sunday, 1 = Monday, etc.)
    const NOTIFICATION_HOUR = 9; // 9 AM
    
    // Initialize notification system
    function init() {
        console.log('Initializing notification system...');
        setupScheduledNotifications();
        setupServiceWorker();
    }
    
    // Setup service worker for push notifications
    function setupServiceWorker() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            return navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('[ServiceWorker] Registration successful with scope: ', registration.scope);
                    // Check if we already have permission
                    return Notification.requestPermission()
                        .then(permission => {
                            if (permission === 'granted') {
                                console.log('[ServiceWorker] Notification permission granted');
                                // Subscribe to push notifications
                                return subscribeUserToPush(registration);
                            } else {
                                console.log('[ServiceWorker] Notification permission denied');
                                return null;
                            }
                        });
                })
                .catch(err => {
                    console.error('[ServiceWorker] Registration failed: ', err);
                    throw err;
                });
        }
        return Promise.resolve(null);
    }
    
    // Subscribe user to push notifications
    function subscribeUserToPush(registration) {
        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BHVsowUqMTwIMAYH8ORy1W4pAq-WZgBpYK952GTxppGfo3xss5iaYrRYPQS4M6trnLieltwxh_iiq7d9acw2kxA')
        };
        
        return registration.pushManager.subscribe(subscribeOptions)
            .then(subscription => {
                console.log('[ServiceWorker] Push subscription successful: ', subscription);
                // Here you would typically send the subscription to your server
                // For example: sendSubscriptionToServer(subscription);
                return subscription;
            })
            .catch(err => {
                console.error('[ServiceWorker] Failed to subscribe to push: ', err);
                throw err;
            });
    }
    
    // Helper function to convert VAPID key
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    // Request notification permission from user
    function requestNotificationPermission() {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted');
                }
            });
        }
    }
    
    // Setup scheduled notifications to run weekly
    function setupScheduledNotifications() {
        // Clear any existing interval
        if (notificationInterval) {
            clearInterval(notificationInterval);
        }
        
        // Check every hour if it's time to send the weekly notification
        notificationInterval = setInterval(() => {
            const now = new Date();
            if (now.getDay() === NOTIFICATION_DAY && now.getHours() === NOTIFICATION_HOUR) {
                sendWeeklyFollowupNotifications();
            }
        }, 60 * 60 * 1000); // Check every hour
    }
    
    // Get follow-up count for a specific PHC
    async function getFollowupCountForPHC(phcName) {
        try {
            // This assumes you have an API endpoint to get follow-up counts
            const response = await fetch(`/api/followups/count?phc=${encodeURIComponent(phcName)}`);
            const data = await response.json();
            return data.count || 0;
        } catch (error) {
            console.error('Error fetching follow-up count:', error);
            return 0;
        }
    }
    
    // Send weekly follow-up notifications to CHOs
    async function sendWeeklyFollowupNotifications() {
        if (currentUserRole !== 'phc_admin') return;
        
        const phcName = currentUserPHC;
        if (!phcName) return;
        
        const followupCount = await getFollowupCountForPHC(phcName);
        
        // Create notification content
        const notificationTitle = 'Weekly Follow-up Reminder';
        const notificationOptions = {
            body: `You have ${followupCount} pending follow-up${followupCount !== 1 ? 's' : ''} for ${phcName} this week.`,
            icon: '/images/notification-icon.png',
            badge: '/images/badge.png',
            vibrate: [200, 100, 200],
            data: {
                url: window.location.origin + '/#followups',
                timestamp: Date.now()
            }
        };
        
        // Show notification
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(notificationTitle, notificationOptions);
            });
        }
        
        // Also log to console for debugging
        console.log(`Notification sent: ${notificationTitle} - ${notificationOptions.body}`);
    }
    
    // Public API
    return {
        init: init,
        sendTestNotification: function() {
            // For testing purposes
            sendWeeklyFollowupNotifications();
        }
    };
})();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page that needs notifications
    if (document.getElementById('welcomeMessage')) {
        NotificationManager.init();
    }
});
