/**
 * PHC Admin Guidance Module
 * Shows educational messages for PHC Admin users about stock management workflow
 * Shows max 4 times per user
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'epicare_phc_admin_guidance_count';
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
     * Get how many times the guidance has been shown for this PHC Admin
     * @returns {number} Count of times shown
     */
    function getShowCount() {
        try {
            const adminId = getPHCAdminIdentifier();
            const stored = localStorage.getItem(`${STORAGE_KEY}_${adminId}`);
            return stored ? parseInt(stored, 10) : 0;
        } catch (err) {
            console.warn('Failed to get guidance show count:', err);
            return 0;
        }
    }

    /**
     * Check if guidance should still be shown for this PHC Admin
     * @returns {boolean} True if guidance can still be shown
     */
    function canShowGuidance() {
        return getShowCount() < MAX_SHOWS;
    }

    /**
     * Increment the show count
     */
    function incrementShowCount() {
        try {
            const adminId = getPHCAdminIdentifier();
            const currentCount = getShowCount();
            localStorage.setItem(`${STORAGE_KEY}_${adminId}`, String(currentCount + 1));
            console.log(`[PHCAdminGuidance] Show count incremented to ${currentCount + 1}/${MAX_SHOWS}`);
        } catch (err) {
            console.warn('Failed to increment guidance show count:', err);
        }
    }

    /**
     * Show PHC Admin guidance messages
     */
    function showPHCAdminGuidance() {
        // Check if user is PHC Admin
        const role = (window.currentUserRole || '').toLowerCase();
        if (role !== 'phc_admin') {
            console.log('[PHCAdminGuidance] Not PHC Admin role, skipping');
            return;
        }

        // Check if can still show
        if (!canShowGuidance()) {
            console.log('[PHCAdminGuidance] Max shows reached for this PHC Admin');
            return;
        }

        // Create overlay backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'phc-admin-guidance-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            z-index: 9997;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        `;

        // Create guidance card
        const card = document.createElement('div');
        card.id = 'phc-admin-guidance-card';
        card.style.cssText = `
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 24px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideInUp 0.4s ease-out;
            z-index: 9998;
        `;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0; font-size: 1.2rem; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-lightbulb" style="color: #f59e0b;"></i>
                        Stock Management Workflow
                    </h3>
                </div>
                <button id="phc-guidance-close" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #64748b;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    transition: background 0.2s;
                " title="Close">
                    ✕
                </button>
            </div>

            <div style="display: grid; gap: 16px; margin-bottom: 20px;">
                <!-- Step 1 Message -->
                <div style="
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    padding: 16px;
                    border-radius: 8px;
                    border-left: 4px solid #1e40af;
                ">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                            font-weight: bold;
                            font-size: 1.1rem;
                        ">1</div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; font-weight: 600;">Submit to District</h4>
                            <p style="margin: 0; font-size: 0.85rem; opacity: 0.95; line-height: 1.4;">
                                Please send your consolidated indent request to district first. Gather all CHO requests and compile them.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Step 2 Message -->
                <div style="
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 16px;
                    border-radius: 8px;
                    border-left: 4px solid #065f46;
                ">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="
                            background: rgba(255, 255, 255, 0.2);
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                            font-weight: bold;
                            font-size: 1.1rem;
                        ">2</div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; font-weight: 600;">CHO Requests & Dispatch</h4>
                            <p style="margin: 0; font-size: 0.85rem; opacity: 0.95; line-height: 1.4;">
                                Once you receive medicines from district, review CHO indent requests. Dispatch medicines to their AAM centers.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div style="
                background: #fef3c7;
                border: 1px solid #fcd34d;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 20px;
                font-size: 0.85rem;
                color: #92400e;
                display: flex;
                gap: 8px;
                align-items: flex-start;
            ">
                <i class="fas fa-info-circle" style="margin-top: 2px; flex-shrink: 0;"></i>
                <span>This message will show ${MAX_SHOWS - getShowCount()} more time(s) for you.</span>
            </div>

            <button id="phc-guidance-ok" style="
                width: 100%;
                padding: 12px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                font-size: 0.95rem;
                transition: transform 0.2s;
            ">
                <i class="fas fa-check"></i> Okay, Got It
            </button>
        `;

        // Add styles for animation
        if (!document.getElementById('phc-admin-guidance-styles')) {
            const style = document.createElement('style');
            style.id = 'phc-admin-guidance-styles';
            style.textContent = `
                @keyframes slideInUp {
                    from {
                        transform: translateY(50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                #phc-admin-guidance-close:hover {
                    background: #e2e8f0;
                }
                #phc-admin-guidance-ok:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                @media (max-width: 640px) {
                    #phc-admin-guidance-card {
                        padding: 16px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(backdrop);

        // Event handlers
        const okBtn = document.getElementById('phc-guidance-ok');
        const closeBtn = document.getElementById('phc-guidance-close');

        const removeGuidance = () => {
            backdrop.style.animation = 'slideInUp 0.3s ease-out reverse';
            setTimeout(() => backdrop.remove(), 300);
        };

        okBtn.addEventListener('click', () => {
            removeGuidance();
        });

        closeBtn.addEventListener('click', removeGuidance);

        // Increment counter
        incrementShowCount();

        console.log(`[PHCAdminGuidance] Guidance shown to PHC Admin user (${getShowCount()}/${MAX_SHOWS})`);
    }

    // Expose API
    window.PHCAdminGuidance = {
        show: showPHCAdminGuidance,
        canShow: canShowGuidance,
        getCount: getShowCount
    };

    // Show guidance when stock section is viewed
    document.addEventListener('DOMContentLoaded', () => {
        // Listen for tab switch to stock
        const observer = new MutationObserver(() => {
            const stockSection = document.getElementById('stock');
            if (stockSection && stockSection.offsetParent !== null) {
                // Stock tab is visible
                setTimeout(() => {
                    window.PHCAdminGuidance.show();
                }, 500);
            }
        });

        // Start observing when DOM is ready
        const mainContent = document.querySelector('main.tab-content');
        if (mainContent) {
            observer.observe(mainContent, {
                attributes: true,
                style: true,
                subtree: true
            });
        }
    });

    console.log('[PHCAdminGuidance] Module loaded');
})();