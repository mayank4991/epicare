/**
 * Indent Reminder Module
 * Shows a toast message to PHC users on first login each month
 * Requesting them to raise indent from stock management tab
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'epicare_indent_reminder_dismissed';
    
    /**
     * Get current month-year key for tracking dismissals
     * @returns {string} Key like "2024-05" for May 2024
     */
    function getCurrentMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Check if indent reminder has been dismissed this month
     * @returns {boolean} True if already dismissed this month
     */
    function isReminderDismissedThisMonth() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return false;

            const storedMonth = stored.split('|')[0];
            const currentMonth = getCurrentMonthKey();

            return storedMonth === currentMonth;
        } catch (err) {
            console.warn('Failed to check indent reminder state:', err);
            return false;
        }
    }

    /**
     * Mark the indent reminder as dismissed for this month
     */
    function dismissReminderForThisMonth() {
        try {
            const currentMonth = getCurrentMonthKey();
            const timestamp = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, `${currentMonth}|${timestamp}`);
        } catch (err) {
            console.warn('Failed to save indent reminder dismissal:', err);
        }
    }

    /**
     * Show the indent reminder toast with action buttons
     */
    function showIndentReminder() {
        // Don't show if already dismissed this month
        if (isReminderDismissedThisMonth()) {
            console.log('[IndentReminder] Already dismissed this month');
            return;
        }

        // Don't show if user is not PHC
        const role = window.currentUserRole || '';
        if (role.toLowerCase() !== 'phc') {
            console.log('[IndentReminder] Not PHC role, skipping reminder');
            return;
        }

        // Create toast container
        const toastContainer = document.createElement('div');
        toastContainer.id = 'indent-reminder-toast';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            max-width: 420px;
            z-index: 9999;
            animation: slideInUp 0.4s ease-out;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            border-left: 4px solid #ffd700;
        `;

        // Add animation keyframes if not already present
        if (!document.getElementById('indent-reminder-styles')) {
            const style = document.createElement('style');
            style.id = 'indent-reminder-styles';
            style.textContent = `
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
                .indent-reminder-button {
                    padding: 8px 16px;
                    margin-top: 12px;
                    margin-right: 8px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .indent-reminder-button-primary {
                    background: white;
                    color: #667eea;
                    flex: 1;
                }
                .indent-reminder-button-primary:hover {
                    background: #f0f0f0;
                    transform: translateY(-2px);
                }
                .indent-reminder-button-secondary {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                }
                .indent-reminder-button-secondary:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                }
            `;
            document.head.appendChild(style);
        }

        // Toast HTML content
        toastContainer.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="font-size: 24px; margin-top: 2px;">📋</div>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">
                        Raise Monthly Indent
                    </h3>
                    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.5; opacity: 0.95;">
                        Please raise your monthly indent from the <strong>Stock Management</strong> tab for your AAM center. 
                        Have you already submitted your indent?
                    </p>
                    <div style="display: flex; gap: 8px;">
                        <button class="indent-reminder-button indent-reminder-button-primary" id="indent-reminder-filled">
                            ✓ Already Filled
                        </button>
                        <button class="indent-reminder-button indent-reminder-button-secondary" id="indent-reminder-go-stock">
                            → Go to Stock
                        </button>
                    </div>
                </div>
                <button id="indent-reminder-close" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                " title="Close">
                    ✕
                </button>
            </div>
        `;

        document.body.appendChild(toastContainer);

        // Add event listeners
        const alreadyFilledBtn = document.getElementById('indent-reminder-filled');
        const goToStockBtn = document.getElementById('indent-reminder-go-stock');
        const closeBtn = document.getElementById('indent-reminder-close');

        const removeToast = () => {
            toastContainer.style.animation = 'slideInUp 0.3s ease-out reverse';
            setTimeout(() => toastContainer.remove(), 300);
        };

        alreadyFilledBtn.addEventListener('click', () => {
            dismissReminderForThisMonth();
            removeToast();
            showNotification && showNotification('Great! We\'ll remind you next month.', 'success');
        });

        goToStockBtn.addEventListener('click', () => {
            dismissReminderForThisMonth();
            removeToast();
            
            // Switch to stock tab
            // Try using global showTab function first (used by main navigation)
            if (typeof window.showTab === 'function') {
                window.showTab('stock');
            } else if (typeof MultiLevelStockUI !== 'undefined' && typeof MultiLevelStockUI.switchTab === 'function') {
                // Fallback: use stock module's switch function for internal tabs
                MultiLevelStockUI.switchTab('indents');  // Default to indents tab
            } else {
                // Final fallback: try to click the stock tab button directly
                const stockTab = document.getElementById('stockTab') || document.querySelector('[data-tab="stock"]');
                if (stockTab) {
                    stockTab.click();
                }
            }
        });

        closeBtn.addEventListener('click', removeToast);

        // Auto-remove after 10 seconds if user doesn't interact
        setTimeout(() => {
            if (document.body.contains(toastContainer)) {
                removeToast();
            }
        }, 10000);

        console.log('[IndentReminder] Reminder shown to PHC user');
    }

    /**
     * Initialize indent reminder on user login
     */
    function initializeIndentReminder() {
        // Check if user is logged in and is PHC
        const role = window.currentUserRole || '';
        if (role.toLowerCase() !== 'phc') {
            return;
        }

        // Wait a bit for DOM to be ready
        setTimeout(() => {
            showIndentReminder();
        }, 1000);
    }

    /**
     * Auto-reset reminder at the start of each month
     * This is called periodically to ensure the localStorage flag is reset on the 1st
     */
    function checkAndResetMonthlyFlag() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;

            const storedMonth = stored.split('|')[0];
            const currentMonth = getCurrentMonthKey();

            if (storedMonth !== currentMonth) {
                // Month has changed, clear the old flag
                localStorage.removeItem(STORAGE_KEY);
                console.log('[IndentReminder] Monthly flag reset for new month');
            }
        } catch (err) {
            console.warn('Failed to check monthly reset:', err);
        }
    }

    // Expose global API
    window.IndentReminder = {
        show: showIndentReminder,
        initialize: initializeIndentReminder,
        isDissmissedThisMonth: isReminderDismissedThisMonth,
        getCurrentMonthKey: getCurrentMonthKey,
        checkAndResetMonthlyFlag: checkAndResetMonthlyFlag
    };

    // Listen for user login event
    document.addEventListener('userLoggedIn', () => {
        console.log('[IndentReminder] User logged in, initializing reminder');
        initializeIndentReminder();
    });

    // Check monthly reset periodically (every minute)
    setInterval(checkAndResetMonthlyFlag, 60000);

    console.log('[IndentReminder] Module loaded');
})();
