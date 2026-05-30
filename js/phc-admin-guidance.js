/**
 * PHC Admin Guidance Module - Toast Notifications
 * Shows educational toast messages for PHC Admin users about stock management workflow
 * Step 1: Submit to District - Blue toast
 * Step 2: Review & Dispatch - Green toast
 * Each shows max 4 times per user
 * 
 * Displays as floating toasts above page, not integrated into layout
 */

(function() {
    'use strict';

    const STEP1_STORAGE_KEY = 'epicare_phc_admin_guidance_step1_count';
    const STEP2_STORAGE_KEY = 'epicare_phc_admin_guidance_step2_count';
    const MAX_SHOWS = 4;
    const TOAST_CONTAINER_ID = 'phc-guidance-toast-container';

    /**
     * Ensure toast container exists and return it
     * @returns {HTMLElement} Toast container element
     */
    function getToastContainer() {
        let container = document.getElementById(TOAST_CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = TOAST_CONTAINER_ID;
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 420px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
            
            // Add CSS for toasts
            if (!document.getElementById('phc-toast-styles')) {
                const style = document.createElement('style');
                style.id = 'phc-toast-styles';
                style.textContent = `
                    .phc-guidance-toast {
                        pointer-events: auto;
                        border-radius: 8px;
                        padding: 14px 16px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                        animation: toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    
                    @keyframes toastSlideIn {
                        from {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    @keyframes toastSlideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                    }
                    
                    .phc-guidance-toast.dismissing {
                        animation: toastSlideOut 0.3s ease-in;
                    }
                    
                    .phc-toast-content {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        flex: 1;
                    }
                    
                    .phc-toast-badge {
                        background: rgba(255, 255, 255, 0.25);
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        font-weight: bold;
                        font-size: 1.3rem;
                    }
                    
                    .phc-toast-text h4 {
                        margin: 0 0 4px 0;
                        font-size: 0.95rem;
                        font-weight: 700;
                        line-height: 1.2;
                    }
                    
                    .phc-toast-text p {
                        margin: 0;
                        font-size: 0.8rem;
                        opacity: 0.95;
                        line-height: 1.3;
                    }
                    
                    .phc-toast-dismiss {
                        background: rgba(255, 255, 255, 0.25);
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.75rem;
                        white-space: nowrap;
                        flex-shrink: 0;
                        transition: background 0.2s;
                    }
                    
                    .phc-toast-dismiss:hover {
                        background: rgba(255, 255, 255, 0.35);
                    }
                    
                    @media (max-width: 480px) {
                        #${TOAST_CONTAINER_ID} {
                            right: 10px !important;
                            left: 10px !important;
                            top: 10px !important;
                            max-width: none !important;
                        }
                        
                        .phc-guidance-toast {
                            flex-direction: column;
                            align-items: flex-start;
                        }
                        
                        .phc-toast-dismiss {
                            align-self: flex-end;
                            margin-top: 8px;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        return container;
    }

    /**
     * Get PHC Admin identifier from current user
     * @returns {string} Username or identifier for localStorage key
     */
    function getPHCAdminIdentifier() {
        const username = window.currentUserName || '';
        const phc = window.currentUserAssignedPHC || '';
        return `${username}-${phc}`.replace(/\s+/g, '_').toLowerCase();
    }

    /**
     * Get show count for a specific step
     * @param {number} step - 1 or 2
     * @returns {number} Count of times shown
     */
    function getStepShowCount(step) {
        try {
            const adminId = getPHCAdminIdentifier();
            const storageKey = step === 1 ? STEP1_STORAGE_KEY : STEP2_STORAGE_KEY;
            const stored = localStorage.getItem(`${storageKey}_${adminId}`);
            return stored ? parseInt(stored, 10) : 0;
        } catch (err) {
            console.warn(`[PHCAdminGuidance] Failed to get step ${step} show count:`, err);
            return 0;
        }
    }

    /**
     * Check if step guidance should still be shown
     * @param {number} step - 1 or 2
     * @returns {boolean} True if guidance can still be shown
     */
    function canShowStep(step) {
        return getStepShowCount(step) < MAX_SHOWS;
    }

    /**
     * Increment show count for a step
     * @param {number} step - 1 or 2
     */
    function incrementStepShowCount(step) {
        try {
            const adminId = getPHCAdminIdentifier();
            const storageKey = step === 1 ? STEP1_STORAGE_KEY : STEP2_STORAGE_KEY;
            const currentCount = getStepShowCount(step);
            localStorage.setItem(`${storageKey}_${adminId}`, String(currentCount + 1));
            console.log(`[PHCAdminGuidance] Step ${step} count incremented to ${currentCount + 1}/${MAX_SHOWS}`);
        } catch (err) {
            console.warn(`[PHCAdminGuidance] Failed to increment step ${step} count:`, err);
        }
    }

    /**
     * Show Step 1 guidance as a toast notification
     */
    function showStep1Guidance() {
        const role = (window.currentUserRole || '').toLowerCase();
        console.log(`[PHCAdminGuidance] Step 1 called - Role: ${role}`);
        
        if (role !== 'phc_admin') {
            console.log(`[PHCAdminGuidance] Step 1: Not PHC Admin role, skipping`);
            return;
        }

        if (!canShowStep(1)) {
            console.log('[PHCAdminGuidance] Step 1: Max shows reached');
            return;
        }

        // Check if toast already exists
        if (document.getElementById('phc-step1-toast')) {
            console.log('[PHCAdminGuidance] Step 1: Toast already shown');
            return;
        }

        console.log('[PHCAdminGuidance] Step 1: Creating toast notification...');

        const container = getToastContainer();
        
        const toast = document.createElement('div');
        toast.id = 'phc-step1-toast';
        toast.className = 'phc-guidance-toast';
        toast.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        toast.style.color = 'white';

        toast.innerHTML = `
            <div class="phc-toast-content">
                <div class="phc-toast-badge">1</div>
                <div class="phc-toast-text">
                    <h4>Step 1: Submit to District</h4>
                    <p>Please send your consolidated indent request to the district first. Gather all CHO requests and compile them.</p>
                </div>
            </div>
            <button class="phc-toast-dismiss" aria-label="Dismiss notification">Okay</button>
        `;

        container.appendChild(toast);

        // Dismiss button handler
        const dismissBtn = toast.querySelector('.phc-toast-dismiss');
        dismissBtn.addEventListener('click', () => {
            console.log('[PHCAdminGuidance] Step 1: Dismissed');
            toast.classList.add('dismissing');
            setTimeout(() => toast.remove(), 300);
        });

        incrementStepShowCount(1);
        console.log(`[PHCAdminGuidance] Step 1 shown (${getStepShowCount(1)}/${MAX_SHOWS})`);
    }

    /**
     * Show Step 2 guidance as a toast notification
     */
    function showStep2Guidance() {
        const role = (window.currentUserRole || '').toLowerCase();
        console.log(`[PHCAdminGuidance] Step 2 called - Role: ${role}`);
        
        if (role !== 'phc_admin') {
            console.log(`[PHCAdminGuidance] Step 2: Not PHC Admin role, skipping`);
            return;
        }

        if (!canShowStep(2)) {
            console.log('[PHCAdminGuidance] Step 2: Max shows reached');
            return;
        }

        // Check if toast already exists
        if (document.getElementById('phc-step2-toast')) {
            console.log('[PHCAdminGuidance] Step 2: Toast already shown');
            return;
        }

        console.log('[PHCAdminGuidance] Step 2: Creating toast notification...');

        const container = getToastContainer();
        
        const toast = document.createElement('div');
        toast.id = 'phc-step2-toast';
        toast.className = 'phc-guidance-toast';
        toast.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        toast.style.color = 'white';

        toast.innerHTML = `
            <div class="phc-toast-content">
                <div class="phc-toast-badge">2</div>
                <div class="phc-toast-text">
                    <h4>Step 2: Review & Dispatch</h4>
                    <p>Once you receive medicines from the district, review CHO indent requests and dispatch medicines to their AAM centers.</p>
                </div>
            </div>
            <button class="phc-toast-dismiss" aria-label="Dismiss notification">Okay</button>
        `;

        container.appendChild(toast);

        // Dismiss button handler
        const dismissBtn = toast.querySelector('.phc-toast-dismiss');
        dismissBtn.addEventListener('click', () => {
            console.log('[PHCAdminGuidance] Step 2: Dismissed');
            toast.classList.add('dismissing');
            setTimeout(() => toast.remove(), 300);
        });

        incrementStepShowCount(2);
        console.log(`[PHCAdminGuidance] Step 2 shown (${getStepShowCount(2)}/${MAX_SHOWS})`);
    }

    // Show guidance when stock section is viewed
    let hasShownOnce = false;

    // Install interceptors once DOM is ready
    function installInterceptors() {
        console.log('[PHCAdminGuidance] Installing interceptors...');
        
        // Intercept MultiLevelStockUI.switchTab if available
        if (typeof window.MultiLevelStockUI !== 'undefined' && window.MultiLevelStockUI.switchTab) {
            const originalSwitchTab = window.MultiLevelStockUI.switchTab;
            window.MultiLevelStockUI.switchTab = function(tabName) {
                console.log(`[PHCAdminGuidance] switchTab called with: ${tabName}`);
                const result = originalSwitchTab.call(this, tabName);
                
                // Show guidance for stock-related tabs
                if (tabName === 'phc-requests' && !hasShownOnce) {
                    setTimeout(() => {
                        console.log('[PHCAdminGuidance] Showing both step messages');
                        window.PHCAdminGuidance.showStep1();
                        window.PHCAdminGuidance.showStep2();
                        hasShownOnce = true;
                    }, 500);
                }
                return result;
            };
            console.log('[PHCAdminGuidance] Intercepted MultiLevelStockUI.switchTab');
        } else {
            console.log('[PHCAdminGuidance] MultiLevelStockUI.switchTab not yet available, will retry');
            setTimeout(installInterceptors, 500);
            return;
        }

        // Also intercept showTab if available
        if (typeof window.showTab === 'function') {
            const originalShowTab = window.showTab;
            window.showTab = function(tabName) {
                console.log(`[PHCAdminGuidance] showTab called with: ${tabName}`);
                const result = originalShowTab.call(this, tabName);
                
                if (tabName === 'stock' && !hasShownOnce) {
                    setTimeout(() => {
                        console.log('[PHCAdminGuidance] Showing both step messages from showTab');
                        window.PHCAdminGuidance.showStep1();
                        window.PHCAdminGuidance.showStep2();
                        hasShownOnce = true;
                    }, 500);
                }
                return result;
            };
            console.log('[PHCAdminGuidance] Intercepted showTab');
        }
    }

    // Start trying to install interceptors
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installInterceptors);
    } else {
        setTimeout(installInterceptors, 100);
    }

    // Expose API
    window.PHCAdminGuidance = {
        showStep1: showStep1Guidance,
        showStep2: showStep2Guidance,
        canShowStep1: () => canShowStep(1),
        canShowStep2: () => canShowStep(2),
        getStep1Count: () => getStepShowCount(1),
        getStep2Count: () => getStepShowCount(2)
    };

    console.log('[PHCAdminGuidance] Module loaded');
})();