/**
 * PHC Admin Guidance Module
 * Shows educational messages for PHC Admin users about stock management workflow
 * Step 1: Above "Submit to District" button
 * Step 2: Above "CHO Requests" button
 * Each shows max 4 times per user
 */

(function() {
    'use strict';

    const STEP1_STORAGE_KEY = 'epicare_phc_admin_guidance_step1_count';
    const STEP2_STORAGE_KEY = 'epicare_phc_admin_guidance_step2_count';
    const MAX_SHOWS = 4;

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
     * Show Step 1 guidance above Submit to District button
     */
    function showStep1Guidance() {
        const role = (window.currentUserRole || '').toLowerCase();
        console.log(`[PHCAdminGuidance] Step 1 show() called - Role: ${role}`);
        
        if (role !== 'phc_admin') {
            console.log(`[PHCAdminGuidance] Step 1: Not PHC Admin role, skipping`);
            return;
        }

        if (!canShowStep(1)) {
            console.log('[PHCAdminGuidance] Step 1: Max shows reached');
            return;
        }

        // Find the Submit to District button
        const districtButton = document.querySelector('[onclick*="phc-district-indent"]');
        if (!districtButton) {
            console.log('[PHCAdminGuidance] Step 1: Submit to District button not found');
            return;
        }

        // Check if alert already exists
        if (document.getElementById('phc-step1-guidance-alert')) {
            console.log('[PHCAdminGuidance] Step 1: Alert already shown');
            return;
        }

        console.log('[PHCAdminGuidance] Step 1: Creating guidance alert...');

        const alert = document.createElement('div');
        alert.id = 'phc-step1-guidance-alert';
        alert.style.cssText = `
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 14px 16px;
            border-radius: 8px;
            border-left: 5px solid #1e40af;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            animation: slideDown 0.3s ease-out;
        `;

        alert.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div style="
                    background: rgba(255, 255, 255, 0.2);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-weight: bold;
                    font-size: 1.2rem;
                ">1</div>
                <div>
                    <h4 style="margin: 0 0 3px 0; font-size: 0.95rem; font-weight: 700;">Step 1: Submit to District</h4>
                    <p style="margin: 0; font-size: 0.8rem; opacity: 0.9;">Please send your consolidated indent request to the district first. Gather all CHO requests and compile them.</p>
                </div>
            </div>
            <button id="phc-step1-dismiss" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                padding: 6px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.8rem;
                white-space: nowrap;
                transition: background 0.2s;
            ">Okay</button>
        `;

        // Insert before the button
        districtButton.parentNode.insertBefore(alert, districtButton);

        // Add styles for animation
        if (!document.getElementById('phc-guidance-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'phc-guidance-animation-styles';
            style.textContent = `
                @keyframes slideDown {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                #phc-step1-dismiss:hover,
                #phc-step2-dismiss:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `;
            document.head.appendChild(style);
        }

        // Dismiss button handler
        const dismissBtn = alert.querySelector('#phc-step1-dismiss');
        dismissBtn.addEventListener('click', () => {
            console.log('[PHCAdminGuidance] Step 1: Dismissed');
            alert.style.animation = 'slideDown 0.3s ease-out reverse';
            setTimeout(() => alert.remove(), 300);
        });

        incrementStepShowCount(1);
        console.log(`[PHCAdminGuidance] Step 1 guidance shown (${getStepShowCount(1)}/${MAX_SHOWS})`);
    }

    /**
     * Show Step 2 guidance above CHO Requests button
     */
    function showStep2Guidance() {
        const role = (window.currentUserRole || '').toLowerCase();
        console.log(`[PHCAdminGuidance] Step 2 show() called - Role: ${role}`);
        
        if (role !== 'phc_admin') {
            console.log(`[PHCAdminGuidance] Step 2: Not PHC Admin role, skipping`);
            return;
        }

        if (!canShowStep(2)) {
            console.log('[PHCAdminGuidance] Step 2: Max shows reached');
            return;
        }

        // Find the CHO Requests button
        const choButton = document.querySelector('[onclick*="phc-requests"]');
        if (!choButton) {
            console.log('[PHCAdminGuidance] Step 2: CHO Requests button not found');
            return;
        }

        // Check if alert already exists
        if (document.getElementById('phc-step2-guidance-alert')) {
            console.log('[PHCAdminGuidance] Step 2: Alert already shown');
            return;
        }

        console.log('[PHCAdminGuidance] Step 2: Creating guidance alert...');

        const alert = document.createElement('div');
        alert.id = 'phc-step2-guidance-alert';
        alert.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 14px 16px;
            border-radius: 8px;
            border-left: 5px solid #065f46;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            animation: slideDown 0.3s ease-out;
        `;

        alert.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div style="
                    background: rgba(255, 255, 255, 0.2);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-weight: bold;
                    font-size: 1.2rem;
                ">2</div>
                <div>
                    <h4 style="margin: 0 0 3px 0; font-size: 0.95rem; font-weight: 700;">Step 2: Review & Dispatch</h4>
                    <p style="margin: 0; font-size: 0.8rem; opacity: 0.9;">Once you receive medicines from the district, review CHO indent requests and dispatch medicines to their AAM centers.</p>
                </div>
            </div>
            <button id="phc-step2-dismiss" style="
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                padding: 6px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.8rem;
                white-space: nowrap;
                transition: background 0.2s;
            ">Okay</button>
        `;

        // Insert before the button
        choButton.parentNode.insertBefore(alert, choButton);

        // Add styles for animation
        if (!document.getElementById('phc-guidance-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'phc-guidance-animation-styles';
            style.textContent = `
                @keyframes slideDown {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                #phc-step1-dismiss:hover,
                #phc-step2-dismiss:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `;
            document.head.appendChild(style);
        }

        // Dismiss button handler
        const dismissBtn = alert.querySelector('#phc-step2-dismiss');
        dismissBtn.addEventListener('click', () => {
            console.log('[PHCAdminGuidance] Step 2: Dismissed');
            alert.style.animation = 'slideDown 0.3s ease-out reverse';
            setTimeout(() => alert.remove(), 300);
        });

        incrementStepShowCount(2);
        console.log(`[PHCAdminGuidance] Step 2 guidance shown (${getStepShowCount(2)}/${MAX_SHOWS})`);
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