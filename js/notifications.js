/**
 * notifications.js - Handles all push notification functionality for the Epilepsy Management System
 * * This module handles:
 * - Registering the service worker
 * - Requesting user permission for notifications
 * - Subscribing the user to push notifications
 * - Sending the subscription to the Google Apps Script backend
 */

const NotificationManager = (function() {
    // Private variables
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwasUVlZQiq7JUQDzFZZHoT2YB7AkwpFvmGfvsouA0fROnlIff6kQYsuuAFj-7y0_ct/exec';
    const VAPID_PUBLIC_KEY = 'BHVsowUqMTwIMAYH8ORy1W4pAq-WZgBpYK952GTxppGfo3xss5iaYrRYPQS4M6trnLieltwxh_iiq7d9acw2kxA';

    // Initialize notification system
    async function init() {
        console.log('Initializing notification system...');
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[ServiceWorker] Registration successful with scope: ', registration.scope);
                await requestAndSubscribe(registration);
            } catch (err) {
                console.error('[ServiceWorker] Registration failed: ', err);
            }
        } else {
            console.warn('Push messaging is not supported');
        }
    }

    // Request permission and subscribe the user
    async function requestAndSubscribe(registration) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('[Notifications] Permission granted.');
            await subscribeUserToPush(registration);
        } else {
            console.log('[Notifications] Permission denied.');
        }
    }

    // Subscribe user to push notifications and send to server
    async function subscribeUserToPush(registration) {
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('[ServiceWorker] Push subscription successful: ', subscription);
            await sendSubscriptionToServer(subscription);
        } catch (err) {
            // This can happen if the user denies permission after initially granting it
            // or if there's an issue with the VAPID key.
            if (Notification.permission === 'denied') {
                console.warn('Permission for notifications was denied');
            } else {
                console.error('[ServiceWorker] Failed to subscribe to push: ', err);
            }
        }
    }

    /**
     * **NEW FUNCTION**
     * Sends the push subscription to the Google Apps Script backend.
     * @param {PushSubscription} subscription The subscription object from the PushManager.
     */
    async function sendSubscriptionToServer(subscription) {
        // Ensure we have the current user's PHC information before sending
        if (!window.currentUserPHC) {
            console.error("Cannot send subscription to server: currentUserPHC not set.");
            // Optionally, you could store the subscription in localStorage and send it later
            // once currentUserPHC is available after login.
            return;
        }

        console.log("Sending subscription to server for PHC:", window.currentUserPHC);

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'subscribePush', // This matches the action in your main.gs
                    data: {
                        phc: window.currentUserPHC, // Send the user's assigned PHC
                        subscription: subscription // The subscription object
                    }
                })
            });

            // Note: Because Google Apps Script uses a redirect for the response,
            // we can't read the response body directly. A successful POST is our
            // primary indicator of success here.
            console.log('Subscription data sent to server.');
            showNotification('You are now subscribed to weekly follow-up reminders!', 'success');

        } catch (error) {
            console.error('Error sending subscription to server:', error);
            showNotification('Could not subscribe to notifications. Please try again.', 'error');
        }
    }

    // Helper function to convert the VAPID public key
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Public API
    return {
        init: init
    };
})();

// Initialize when DOM is loaded, after a user has logged in
document.addEventListener('DOMContentLoaded', () => {
    // We delay initialization until a user is logged in to ensure `currentUserPHC` is set.
    // A simple way is to listen for a custom event dispatched after successful login.
    document.addEventListener('userLoggedIn', () => {
        console.log("User has logged in. Initializing Notification Manager...");
        NotificationManager.init();
    });
});
