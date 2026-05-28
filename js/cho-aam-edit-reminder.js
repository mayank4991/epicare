/**
 * CHO Follow-up AAM Edit Reminder Module
 * Shows a toast when CHO opens follow-up form, informing them they can edit AAM center
 * Shows max 3 times per CHO user
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'epicare_cho_aam_edit_reminder_count';
    const MAX_SHOWS = 3;

    /**
     * Get CHO identifier from current user
     * @returns {string} Username or identifier for localStorage key
     */
    function getCHOIdentifier() {
        const username = window.currentUserName || '';
        const phc = window.currentUserAssignedPHC || '';
        return `${username}-${phc}`.replace(/\s+/g, '_').toLowerCase();
    }

    /**
     * Get how many times the reminder has been shown for this CHO
     * @returns {number} Count of times shown
     */
    function getShowCount() {
        try {
            const choId = getCHOIdentifier();
            const stored = localStorage.getItem(`${STORAGE_KEY}_${choId}`);
            return stored ? parseInt(stored, 10) : 0;
        } catch (err) {
            console.warn('Failed to get show count:', err);
            return 0;
        }
    }

    /**
     * Check if reminder should still be shown for this CHO
     * @returns {boolean} True if reminder can still be shown
     */
    function canShowReminder() {
        return getShowCount() < MAX_SHOWS;
    }

    /**
     * Increment the show count
     */
    function incrementShowCount() {
        try {
            const choId = getCHOIdentifier();
            const currentCount = getShowCount();
            localStorage.setItem(`${STORAGE_KEY}_${choId}`, String(currentCount + 1));
            console.log(`[CHOAAMReminder] Show count incremented to ${currentCount + 1}/${MAX_SHOWS}`);
        } catch (err) {
            console.warn('Failed to increment show count:', err);
        }
    }

    /**
     * Highlight the Edit Details button
     */
    function highlightEditDetailsButton() {
        const editBtn = document.querySelector('[data-tab="editDetails"]');
        if (!editBtn) return;

        editBtn.style.animation = 'pulseHighlight 2s ease-in-out infinite';
        
        // Add pulse animation if not already in document
        if (!document.getElementById('cho-aam-reminder-styles')) {
            const style = document.createElement('style');
            style.id = 'cho-aam-reminder-styles';
            style.textContent = `
                @keyframes pulseHighlight {
                    0% {
                        background-color: rgba(255, 215, 0, 0);
                        transform: scale(1);
                    }
                    50% {
                        background-color: rgba(255, 215, 0, 0.3);
                        transform: scale(1.02);
                    }
                    100% {
                        background-color: rgba(255, 215, 0, 0);
                        transform: scale(1);
                    }
                }
                @keyframes slideInUp {
                    from {
                        transform: translateY(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .cho-aam-reminder-toast {
                    animation: slideInUp 0.4s ease-out;
                }
                .cho-aam-reminder-button {
                    padding: 10px 20px;
                    margin-top: 12px;
                    border: none;
                    border-radius: 6px;
                    background: white;
                    color: #667eea;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .cho-aam-reminder-button:hover {
                    background: #f0f0f0;
                    transform: translateY(-2px);
                }
            `;
            document.head.appendChild(style);
        }

        // Remove highlight after 10 seconds
        setTimeout(() => {
            if (editBtn) {
                editBtn.style.animation = 'none';
            }
        }, 10000);
    }

    /**
     * Show the CHO AAM edit reminder toast
     */
    function showCHOAAMReminder() {
        // Check permissions
        const role = (window.currentUserRole || '').toLowerCase();
        if (role !== 'cho' && role !== 'phc' && role !== 'aam') {
            console.log('[CHOAAMReminder] Not CHO/AAM role, skipping');
            return;
        }

        // Check if can still show
        if (!canShowReminder()) {
            console.log('[CHOAAMReminder] Max shows reached for this CHO');
            return;
        }

        // Highlight button
        highlightEditDetailsButton();

        // Create toast
        const toastContainer = document.createElement('div');
        toastContainer.className = 'cho-aam-reminder-toast';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            max-width: 500px;
            z-index: 9998;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            border-left: 4px solid #ffd700;
        `;

        toastContainer.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="font-size: 24px; margin-top: 2px;">🎯</div>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">
                        Update AAM Center
                    </h3>
                    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; opacity: 0.95;">
                        You can now edit or change the <strong>AAM center</strong> for this patient using the 
                        <strong style="background: rgba(255, 215, 0, 0.2); padding: 2px 6px; border-radius: 3px;">Edit Details</strong> 
                        button above. This helps keep your patient records accurate.
                    </p>
                    <button class="cho-aam-reminder-button" id="cho-aam-reminder-ok">
                        Okay, Got It
                    </button>
                </div>
                <button id="cho-aam-reminder-close" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                    margin-top: -8px;
                " title="Close">
                    ✕
                </button>
            </div>
        `;

        document.body.appendChild(toastContainer);

        // Event handlers
        const okayBtn = document.getElementById('cho-aam-reminder-ok');
        const closeBtn = document.getElementById('cho-aam-reminder-close');

        const removeToast = () => {
            toastContainer.style.animation = 'slideInUp 0.3s ease-out reverse';
            setTimeout(() => toastContainer.remove(), 300);
        };

        okayBtn.addEventListener('click', () => {
            removeToast();
        });

        closeBtn.addEventListener('click', removeToast);

        // Increment counter
        incrementShowCount();

        console.log(`[CHOAAMReminder] Reminder shown to CHO user (${getShowCount()}/${MAX_SHOWS})`);
    }

    /**
     * Check if follow-up form just opened and show reminder
     */
    function checkAndShowReminder() {
        // Check if we're in follow-up modal
        const followUpModal = document.getElementById('followUpModal');
        if (!followUpModal) return;

        // Check if Edit Details button exists
        const editDetailsBtn = document.querySelector('[data-tab="editDetails"]');
        if (!editDetailsBtn) return;

        // Show reminder
        setTimeout(showCHOAAMReminder, 500);
    }

    // Expose API
    window.CHOAAMReminder = {
        show: showCHOAAMReminder,
        check: checkAndShowReminder,
        canShow: canShowReminder,
        getCount: getShowCount,
        _monkeyPatchInstalled: false
    };

    /**
     * Install monkey patch when openFollowUpModal is available
     */
    function installMonkeyPatch() {
        if (window.CHOAAMReminder._monkeyPatchInstalled) return;
        
        if (typeof window.openFollowUpModal !== 'function') {
            // Try again in 500ms
            setTimeout(installMonkeyPatch, 500);
            return;
        }

        const originalOpenFollowUpModal = window.openFollowUpModal;
        window.openFollowUpModal = function(...args) {
            const result = originalOpenFollowUpModal.apply(this, args);
            
            // Check and show reminder after modal opens
            setTimeout(() => {
                window.CHOAAMReminder.check();
            }, 500);
            
            return result;
        };

        window.CHOAAMReminder._monkeyPatchInstalled = true;
        console.log('[CHOAAMReminder] Monkey patch installed');
    }

    // Try to install monkey patch immediately
    installMonkeyPatch();

    // Also listen for modal visibility changes as backup
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Check if follow-up modal became visible
            const followUpModal = document.getElementById('followUpModal');
            if (followUpModal && followUpModal.style.display !== 'none' && followUpModal.offsetParent !== null) {
                // Modal is visible, check if we should show reminder
                setTimeout(() => {
                    window.CHOAAMReminder.check();
                }, 300);
            }
        });
    });

    // Start observing when DOM is ready
    function startObserver() {
        const followUpModal = document.getElementById('followUpModal');
        if (followUpModal) {
            observer.observe(followUpModal, {
                attributes: true,
                style: true,
                attributeFilter: ['style', 'class']
            });
        } else {
            // Retry if modal doesn't exist yet
            setTimeout(startObserver, 1000);
        }
    }

    // Start observer immediately or on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserver);
    } else {
        startObserver();
    }

    console.log('[CHOAAMReminder] Module loaded');
})();
