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

                // If a new service worker is installed, let the user know and offer to refresh
                if (registration.waiting) {
                    // A waiting worker means there's an update ready
                    promptUserToRefresh(registration);
                }

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New update available
                                promptUserToRefresh(registration);
                            }
                        }
                    });
                });

                // When the new service worker activates, reload the page so the user gets the latest content
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[ServiceWorker] controllerchange - reloading to get new version');
                    window.location.reload();
                });

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

// Show a non-blocking prompt to the user to refresh and update to the newest version
function promptUserToRefresh(registration) {
    // Create a subtle banner at the top right. If your UI has a global notification area, integrate with it instead.
    const existing = document.getElementById('updateAvailableBanner');
    if (existing) return; // already shown

    const banner = document.createElement('div');
    banner.id = 'updateAvailableBanner';
    banner.style.position = 'fixed';
    banner.style.right = '16px';
    banner.style.top = '16px';
    banner.style.zIndex = 9999;
    banner.style.background = '#fff';
    banner.style.border = '1px solid #ccc';
    banner.style.padding = '10px 14px';
    banner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    banner.style.borderRadius = '6px';
    banner.innerHTML = `A new version is available. <button id="refreshNowBtn">Refresh</button> <button id="dismissUpdateBtn">Dismiss</button>`;

    document.body.appendChild(banner);

    document.getElementById('refreshNowBtn').addEventListener('click', () => {
        // Tell the waiting worker to skip waiting and activate
        if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    });

    document.getElementById('dismissUpdateBtn').addEventListener('click', () => {
        banner.remove();
    });
}

// Initialize when DOM is loaded, after a user has logged in
document.addEventListener('DOMContentLoaded', () => {
    // We delay initialization until a user is logged in to ensure `currentUserPHC` is set.
    // A simple way is to listen for a custom event dispatched after successful login.
    document.addEventListener('userLoggedIn', () => {
        console.log("User has logged in. Initializing Notification Manager...");
        NotificationManager.init();
    });
});

// Periodically check for service worker updates. Useful on GitHub Pages where server headers
// can't be changed and users keep the app open for long periods.
function checkForServiceWorkerUpdate() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
            reg.update().then(() => console.log('[ServiceWorker] update() called')); 
        }
    }).catch(err => console.error('Error checking for SW update', err));
}

// Run every 30 minutes
setInterval(checkForServiceWorkerUpdate, 30 * 60 * 1000);

// Expose manual check for debugging or via a UI button
window.checkForUpdate = checkForServiceWorkerUpdate;

// Optionally insert a small 'Check for updates' button in the UI if not present
function ensureUpdateButton() {
    if (document.getElementById('checkUpdateBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'checkUpdateBtn';
    btn.textContent = 'Check for updates';
    btn.style.position = 'fixed';
    btn.style.bottom = '16px';
    btn.style.right = '16px';
    btn.style.zIndex = 9999;
    btn.addEventListener('click', () => {
        btn.textContent = 'Checking...';
        checkForServiceWorkerUpdate();
        setTimeout(() => btn.textContent = 'Check for updates', 1500);
    });
    document.body.appendChild(btn);
}

// Add the button a bit after load so it doesn't interfere with auth flows
window.addEventListener('load', () => setTimeout(ensureUpdateButton, 2000));
