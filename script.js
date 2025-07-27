// --- CONFIGURATION ---
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_8pn4iqpFwazOi82ViPZzF_I9CqUcn7wCoVFZTyehhoq1zsPTRbJamfNldHkmGPXF/exec';
        // PHC names are now fetched dynamically from the backend via fetchPHCNames()

        // --- GLOBAL STATE ---
        let currentUserRole = "";
        let currentUserName = "";
        let patientData = [];
        let userData = [];
        let followUpsData = [];
        let charts = {}; // To hold chart instances
        let followUpStartTime = null; // For monitoring follow-up duration

        // Injury map variables
        let selectedInjuries = [];
        let currentBodyPart = null;

        // --- DOM ELEMENTS ---
        const loadingIndicator = document.getElementById('loadingIndicator');
        const loadingText = document.getElementById('loadingText');

        // Setup diagnosis-based form control function
        function setupDiagnosisBasedFormControl() {
            const diagnosisField = document.getElementById('diagnosis');
            const etiologyGroup = document.getElementById('etiologySyndromeGroup');
            const etiologyInput = document.getElementById('etiologySyndrome');
            
            if (diagnosisField && etiologyGroup && etiologyInput) {
                function toggleEtiologyField() {
                    if (diagnosisField.value === 'Epilepsy') {
                        etiologyGroup.style.display = '';
                    } else {
                        etiologyGroup.style.display = 'none';
                        etiologyInput.value = '';
                    }
                }
                
                diagnosisField.addEventListener('change', toggleEtiologyField);
                // Run on load in case of autofill
                toggleEtiologyField();
            }
        }

        // Update welcome message based on user role and PHC assignment
        function updateWelcomeMessage() {
            const welcomeElement = document.getElementById('welcomeMessage');
            if (!welcomeElement) return;
            
            let welcomeText = '';
            
            switch (currentUserRole) {
                case 'master_admin':
                    welcomeText = `Welcome, ${currentUserName}! You have full system access as Master Administrator.`;
                    break;
                case 'phc_admin':
                    welcomeText = `Welcome, ${currentUserName}! You are managing ${currentUserPHC || 'your assigned PHC'}.`;
                    break;
                case 'phc':
                    welcomeText = `Welcome, ${currentUserName}! You are working with ${currentUserPHC || 'your assigned PHC'} patients.`;
                    break;
                case 'viewer':
                    welcomeText = `Welcome, ${currentUserName}! You have read-only access to de-identified data.`;
                    break;
                default:
                    welcomeText = `Welcome, ${currentUserName}!`;
            }
            
            welcomeElement.textContent = welcomeText;
        }

        // --- INITIALIZATION ---
        document.addEventListener('DOMContentLoaded', () => {
            // Load stored toggle state
            allowAddPatientForViewer = getStoredToggleState();
            
            // Listen for changes to localStorage from other tabs/windows
            window.addEventListener('storage', function(e) {
                if (e.key === 'allowAddPatientForViewer') {
                    allowAddPatientForViewer = e.newValue === 'true';
                    updateTabVisibility();
                }
            });
            
            // Fetch PHC names dynamically from backend
            fetchPHCNames();
            
            // Initialize seizure frequency selectors
            initializeSeizureFrequencySelectors();
            
            // Initialize injury map
            initializeInjuryMap();
            
            // Setup diagnosis-based form control
            setupDiagnosisBasedFormControl();
            
            // Run initial diagnosis check in case of pre-selected values
            const diagnosisSelect = document.getElementById('diagnosis');
            if (diagnosisSelect && diagnosisSelect.value) {
                diagnosisSelect.dispatchEvent(new Event('change'));
            }
            
            // Phone number correction handler
            document.getElementById('phoneCorrect').addEventListener('change', function() {
                const showCorrection = this.value === 'No';
                document.getElementById('correctedPhoneContainer').style.display = showCorrection ? 'block' : 'none';
                if (showCorrection) {
                    document.getElementById('correctedPhoneNumber').required = true;
                } else {
                    document.getElementById('correctedPhoneNumber').required = false;
                }
            });
            
            // Improvement status handler
            document.getElementById('feltImprovement').addEventListener('change', function() {
                const noQuestionsDiv = document.getElementById('noImprovementQuestions');
                const yesQuestionsDiv = document.getElementById('yesImprovementQuestions');
                
                noQuestionsDiv.style.display = 'none';
                yesQuestionsDiv.style.display = 'none';
                
                if (this.value === 'No') {
                    noQuestionsDiv.style.display = 'grid';
                } else if (this.value === 'Yes') {
                    yesQuestionsDiv.style.display = 'block';
                }
            });

            // Medication changed handler
            document.getElementById('medicationChanged').addEventListener('change', function() {
                const medicationChangeSection = document.getElementById('medicationChangeSection');
                medicationChangeSection.style.display = this.checked ? 'block' : 'none';
            });

            // Setup Breakthrough Seizure Decision Support Tool
            setupBreakthroughChecklist();

            // Age validation
            document.getElementById('patientAge').addEventListener('input', validateAgeOnset);
            document.getElementById('ageOfOnset').addEventListener('input', validateAgeOnset);

            // Procurement filter handler
            document.getElementById('procurementPhcFilter').addEventListener('change', renderProcurementForecast);
            document.getElementById('followUpTrendPhcFilter').addEventListener('change', renderFollowUpTrendChart);
            
            // PHC reset select handler
            document.getElementById('phcResetSelect').addEventListener('change', function() {
                document.getElementById('phcResetBtn').disabled = !this.value;
            });

            // BP Remark auto-fill
            function autoFillBpRemark() {
                const sys = parseInt(document.getElementById('bpSystolic').value);
                const dia = parseInt(document.getElementById('bpDiastolic').value);
                const remarkInput = document.getElementById('bpRemark');
                if (!isNaN(sys) && !isNaN(dia)) {
                    if (sys > 140 || dia > 90) {
                        remarkInput.value = 'High BP';
                    } else if (sys > 120 || dia > 80) {
                        remarkInput.value = 'Monitor BP';
                    } else {
                        remarkInput.value = '';
                    }
                }
            }
            document.getElementById('bpSystolic').addEventListener('input', autoFillBpRemark);
            document.getElementById('bpDiastolic').addEventListener('input', autoFillBpRemark);

            // Add event listener for dashboard PHC filter (populated by fetchPHCNames)
            const dashboardPhcFilter = document.getElementById('dashboardPhcFilter');
            if (dashboardPhcFilter) {
                dashboardPhcFilter.addEventListener('change', renderStats);
            }

            // Add event listeners for medication info buttons in follow-up modal
            document.querySelectorAll('.info-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const drugName = this.getAttribute('data-drug');
                    if (drugName) {
                        showDrugInfoModal(drugName);
                    }
                });
            });

            // Add event listeners for medication info buttons in referral modal
            document.querySelectorAll('#referralFollowUpModal .info-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const drugName = this.getAttribute('data-drug');
                    if (drugName) {
                        showDrugInfoModal(drugName);
                    }
                });
            });

            // Use event delegation for info buttons (handles dynamically added buttons)
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('info-btn')) {
                    e.preventDefault();
                    const drugName = e.target.getAttribute('data-drug');
                    if (drugName) {
                        showDrugInfoModal(drugName);
                    }
                }
            });

            // Age/Weight update checkbox handlers
            document.getElementById('updateWeightAgeCheckbox').addEventListener('change', function() {
                const fields = document.getElementById('updateWeightAgeFields');
                fields.style.display = this.checked ? 'block' : 'none';
                
                // Pre-fill with current values when checked
                if (this.checked) {
                    const patientId = document.getElementById('followUpPatientId').value;
                    const patient = patientData.find(p => (p.ID || '').toString() === patientId);
                    if (patient) {
                        if (patient.Age) document.getElementById('updateAge').value = patient.Age;
                        if (patient.Weight) document.getElementById('updateWeight').value = patient.Weight;
                    }
                }
            });

            document.getElementById('referralUpdateWeightAgeCheckbox').addEventListener('change', function() {
                const fields = document.getElementById('referralUpdateWeightAgeFields');
                fields.style.display = this.checked ? 'block' : 'none';
                
                // Pre-fill with current values when checked
                if (this.checked) {
                    const patientId = document.getElementById('referralFollowUpPatientId').value;
                    const patient = patientData.find(p => (p.ID || '').toString() === patientId);
                    if (patient) {
                        if (patient.Age) document.getElementById('referralUpdateAge').value = patient.Age;
                        if (patient.Weight) document.getElementById('referralUpdateWeight').value = patient.Weight;
                    }
                }
            });

            // Medication combination warning function
            function checkValproateCarbamazepineCombination() {
                // Check follow-up modal
                const followUpCbz = document.getElementById('newCbzDosage');
                const followUpValproate = document.getElementById('newValproateDosage');
                
                // Check referral modal
                const referralCbz = document.getElementById('referralNewCbzDosage');
                const referralValproate = document.getElementById('referralNewValproateDosage');
                
                let hasCbz = false;
                let hasValproate = false;
                
                // Check follow-up modal
                if (followUpCbz && followUpCbz.value && followUpCbz.value.trim() !== '') {
                    hasCbz = true;
                }
                if (followUpValproate && followUpValproate.value && followUpValproate.value.trim() !== '') {
                    hasValproate = true;
                }
                
                // Check referral modal
                if (referralCbz && referralCbz.value && referralCbz.value.trim() !== '') {
                    hasCbz = true;
                }
                if (referralValproate && referralValproate.value && referralValproate.value.trim() !== '') {
                    hasValproate = true;
                }
                
                // Show warning if both are selected
                if (hasCbz && hasValproate) {
                    // Check if warning was already shown to avoid spam
                    if (!window.valproateCbzWarningShown) {
                        window.valproateCbzWarningShown = true;
                        setTimeout(() => {
                            window.valproateCbzWarningShown = false;
                        }, 5000); // Reset after 5 seconds
                        
                        alert('⚠️ You are prescribing both Valproate and Carbamazepine.\n\nConsider if both are needed for focal and generalized epilepsy. Please confirm epilepsy type from clinical history.');
                    }
                }
            }

            // Add event listeners for medication dosage dropdowns
            const medicationDropdowns = [
                'newCbzDosage', 'newValproateDosage',
                'referralNewCbzDosage', 'referralNewValproateDosage'
            ];

            // Toggle button for allowing viewer to access Add Patient tab
            document.getElementById('toggleVisitorAddPatientBtn').addEventListener('click', function() {
                allowAddPatientForViewer = !allowAddPatientForViewer;
                setStoredToggleState(allowAddPatientForViewer);
                updateTabVisibility();
                
                // Update button text and style
                if (allowAddPatientForViewer) {
                    this.innerHTML = '<i class="fas fa-user-times"></i> Disable Add Patient tab for Viewer Login';
                    this.className = 'btn btn-danger';
                    showNotification('Add Patient tab is now enabled for Viewer login', 'success');
                } else {
                    this.innerHTML = '<i class="fas fa-user"></i> Allow Add Patient tab for Viewer Login';
                    this.className = 'btn btn-secondary';
                    showNotification('Add Patient tab is now disabled for Viewer login', 'info');
                }
            });
            
            medicationDropdowns.forEach(dropdownId => {
                const dropdown = document.getElementById(dropdownId);
                if (dropdown) {
                    dropdown.addEventListener('change', checkValproateCarbamazepineCombination);
                }
            });

        });

        function validateAgeOnset() {
            const age = parseInt(document.getElementById('patientAge').value);
            const ageOfOnset = parseInt(document.getElementById('ageOfOnset').value);
            
            if (age && ageOfOnset && ageOfOnset > age) {
                alert('Age of onset cannot be greater than current age');
                document.getElementById('ageOfOnset').value = '';
            }
        }

        function initializeSeizureFrequencySelectors() {
            // Add patient form seizure frequency selector
            const addPatientOptions = document.querySelectorAll('#seizureFrequencyOptions .seizure-frequency-option');
            addPatientOptions.forEach(option => {
                option.addEventListener('click', function() {
                    addPatientOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    document.getElementById('seizureFrequency').value = this.dataset.value;
                });
            });

            // Follow-up form seizure frequency selector
            const followUpOptions = document.querySelectorAll('#followUpSeizureFrequencyOptions .seizure-frequency-option');
            followUpOptions.forEach(option => {
                option.addEventListener('click', function() {
                    followUpOptions.forEach(opt => opt.classList.remove('selected'));
                    this.classList.add('selected');
                    document.getElementById('followUpSeizureFrequency').value = this.dataset.value;
                });
            });
        }
        
        // Progressive Disclosure Workflow for Follow-up Form
        const drugDoseVerification = document.getElementById('drugDoseVerification');
        const followUpForm = document.getElementById('followUpForm');
        const feltImprovement = document.getElementById('feltImprovement');
        const noImprovementQuestions = document.getElementById('noImprovementQuestions');
        const yesImprovementQuestions = document.getElementById('yesImprovementQuestions');

        // Show/hide follow-up form based on drug dose verification
        if (drugDoseVerification) {
            drugDoseVerification.addEventListener('change', function() {
                followUpForm.style.display = 'grid';
            });
        }

        // Show/hide improvement-related questions based on feltImprovement selection
        if (feltImprovement) {
            feltImprovement.addEventListener('change', function() {
                if (noImprovementQuestions && yesImprovementQuestions) {
                    if (this.value === 'No') {
                        noImprovementQuestions.style.display = 'block';
                        yesImprovementQuestions.style.display = 'none';
                    } else if (this.value === 'Yes') {
                        yesImprovementQuestions.style.display = 'block';
                        noImprovementQuestions.style.display = 'none';
                    } else {
                        noImprovementQuestions.style.display = 'none';
                        yesImprovementQuestions.style.display = 'none';
                    }
                }
            });
        }
        
        // --- HELPER FUNCTIONS ---
        const showLoader = (text = 'Loading...') => {
            loadingText.textContent = text;
            loadingIndicator.style.display = 'flex';
        };

        const hideLoader = () => {
            loadingIndicator.style.display = 'none';
        };

        // --- ROLE SELECTION & LOGIN ---
        document.querySelectorAll('.role-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.role-option').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
            });
            option.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && this.click());
        });
        
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoader('Verifying credentials...');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const selectedRole = document.querySelector('.role-option.active').dataset.role;

            try {
                const response = await fetch(`${SCRIPT_URL}?action=getUsers`);
                const result = await response.json();

                if (result.status === 'success') {
                    userData = result.data;
                    let validUser = null;
                    let actualRole = selectedRole;
                    if (selectedRole === 'admin') {
                        // Accept both master_admin and phc_admin for Administrator button
                        validUser = userData.find(user =>
                            user.Username === username &&
                            user.Password.toString() === password.toString() &&
                            (user.Role === 'master_admin' || user.Role === 'phc_admin')
                        );
                        if (validUser) actualRole = validUser.Role;
                    } else {
                        validUser = userData.find(user =>
                            user.Username === username &&
                            user.Password.toString() === password.toString() &&
                            user.Role === selectedRole
                        );
                    }

                    if (validUser) {
                        await handleLoginSuccess(username, actualRole);
                    } else {
                        handleLoginFailure();
                    }
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Login Error:', error);
                alert('An error occurred during login. Please check your connection and try again.');
                handleLoginFailure();
            }
        });

        async function handleLoginSuccess(username, role) {
            currentUserRole = role;
            currentUserName = username;
            
            // Get user's assigned PHC
            const user = userData.find(u => u.Username === username && u.Role === role);
            currentUserPHC = user && user.PHC ? user.PHC : null;
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('dashboardScreen').style.display = 'block';

            document.getElementById('currentUserName').textContent = currentUserName;
            document.getElementById('currentUserRole').textContent = role;
            
            // Update personalized welcome message
            updateWelcomeMessage();
            
            updateTabVisibility();
            showTab('dashboard', document.querySelector('.nav-tab'));
            await initializeDashboard();

            const phcDropdownContainer = document.getElementById('phcFollowUpSelectContainer');
            const phcDropdown = document.getElementById('phcFollowUpSelect');

            if ((role === 'phc' || role === 'phc_admin') && currentUserPHC) {
                // Hide dropdown, auto-render for assigned PHC
                phcDropdownContainer.style.display = 'none';
                renderFollowUpPatientList(getUserPHC());
            } else if (role === 'phc') {
                // Show dropdown for multi-PHC user
                phcDropdownContainer.style.display = '';
                phcDropdown.value = '';
                renderFollowUpPatientList('');
            } else {
                // For master_admin/viewer, show dropdown
                phcDropdownContainer.style.display = '';
                phcDropdown.value = '';
                renderFollowUpPatientList('');
            }
        }

        function handleLoginFailure() {
            hideLoader();
            const form = document.getElementById('loginForm');
            form.classList.add('error-shake');
            setTimeout(() => form.classList.remove('error-shake'), 400);
            
            document.getElementById('username').classList.add('error');
            document.getElementById('password').classList.add('error');
            document.getElementById('passwordError').style.display = 'block';
        }

        function logout() {
            // Reset the viewer add patient toggle state
            allowAddPatientForViewer = false;
            setStoredToggleState(false);
            location.reload();
        }

        // --- DASHBOARD & DATA HANDLING ---
        async function initializeDashboard() {
            showLoader('Fetching all system data...');
            try {
                // Build query parameters for user access filtering
                const userParams = new URLSearchParams({
                    username: currentUserName,
                    role: currentUserRole,
                    assignedPHC: currentUserPHC || ''
                });

                const [patientResponse, followUpResponse] = await Promise.all([
                    fetch(`${SCRIPT_URL}?action=getPatients&${userParams}`),
                    fetch(`${SCRIPT_URL}?action=getFollowUps&${userParams}`)
                ]);

                const patientResult = await patientResponse.json();
                const followUpResult = await followUpResponse.json();

                if (patientResult.status === 'success' && followUpResult.status === 'success') {
                    patientData = patientResult.data.map(normalizePatientFields);
                    // Make patientData globally available for debugging
                    window.patientData = patientData;
                    console.log('initializeDashboard: Loaded', patientData.length, 'patients');
                    console.log('Sample patient data:', patientData[0]);
                    followUpsData = followUpResult.data;
                    
                    // Check if any follow-ups need to be reset for the new month (only master admin)
                    if (currentUserRole === 'master_admin') {
                        await checkAndResetFollowUps();
                    }
                    
                    // Check and mark patients as inactive based on diagnosis (only master admin)
                    if (currentUserRole === 'master_admin') {
                        await checkAndMarkInactiveByDiagnosis();
                    }
                    
                    renderAllComponents();
                } else {
                    throw new Error('Failed to fetch data from backend.');
                }
            } catch (error) {
                showNotification('Could not load system data. Please check your connection or the backend script.', 'error');
            } finally {
                hideLoader();
            }
        }
        
        async function checkAndResetFollowUps() {
            if (currentUserRole !== 'master_admin') return;
            
            try {
                const response = await fetch(`${SCRIPT_URL}?action=resetFollowUps`);
                const result = await response.json();
                
                if (result.status === 'success' && result.resetCount > 0) {
                    // Show notification to admin
                    showNotification(`Monthly follow-up reset completed: ${result.resetCount} patients reset to pending status.`, 'info');
                    
                    // Refresh patient data to get updated follow-up statuses
                    const patientResponse = await fetch(`${SCRIPT_URL}?action=getPatients`);
                    const patientResult = await patientResponse.json();
                    if (patientResult.status === 'success') {
                        patientData = patientResult.data.map(normalizePatientFields);
                    }
                }
            } catch (error) {
                showNotification('Error checking follow-up resets: ' + error.message, 'error');
            }
        }
        
        async function manualResetFollowUps() {
            if (currentUserRole !== 'master_admin') {
                showNotification('Only master administrators can reset follow-ups.', 'error');
                return;
            }
            
            if (!confirm('This will reset all completed follow-ups from previous months to pending status. Continue?')) {
                return;
            }
            
            showLoader('Resetting follow-ups...');
            try {
                const response = await fetch(`${SCRIPT_URL}?action=resetFollowUps`);
                const result = await response.json();
                
                if (result.status === 'success') {
                    showNotification(`Successfully reset ${result.resetCount || 0} follow-ups for the new month.`, 'success');
                    await refreshData();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showNotification('Error resetting follow-ups: ' + error.message, 'error');
            } finally {
                hideLoader();
            }
        }
        
        async function manualResetFollowUpsByPhc() {
            if (currentUserRole !== 'master_admin') {
                showNotification('Only master administrators can reset follow-ups.', 'error');
                return;
            }
            
            const selectedPhc = document.getElementById('phcResetSelect').value;
            if (!selectedPhc) {
                showNotification('Please select a PHC first.', 'warning');
                return;
            }
            
            if (!confirm(`This will reset all completed follow-ups from previous months to pending status for ${selectedPhc} only. Continue?`)) {
                return;
            }
            
            showLoader(`Resetting follow-ups for ${selectedPhc}...`);
            try {
                const response = await fetch(`${SCRIPT_URL}?action=resetFollowUpsByPhc&phc=${encodeURIComponent(selectedPhc)}`);
                const result = await response.json();
                
                if (result.status === 'success') {
                    showNotification(`Successfully reset ${result.resetCount || 0} follow-ups for ${selectedPhc} for the new month.`, 'success');
                    await refreshData();
                    // Reset the dropdown
                    document.getElementById('phcResetSelect').value = '';
                    document.getElementById('phcResetBtn').disabled = true;
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showNotification('Error resetting PHC follow-ups: ' + error.message, 'error');
            } finally {
                hideLoader();
            }
        }
        
        async function refreshPatientDataOnly() {
            try {
                // Build query parameters for user access filtering
                const userParams = new URLSearchParams({
                    username: currentUserName,
                    role: currentUserRole,
                    assignedPHC: currentUserPHC || ''
                });

                // Fetch only patient data from backend
                const patientResponse = await fetch(`${SCRIPT_URL}?action=getPatients&${userParams}`);
                const patientResult = await patientResponse.json();
                
                if (patientResult.status === 'success') {
                    patientData = patientResult.data.map(normalizePatientFields);
                }
                
            } catch (error) {
                console.error('Error refreshing patient data:', error);
            }
        }
        
        async function refreshFollowUpDataOnly() {
            try {
                // Build query parameters for user access filtering
                const userParams = new URLSearchParams({
                    username: currentUserName,
                    role: currentUserRole,
                    assignedPHC: currentUserPHC || ''
                });

                // Fetch only follow-up data from backend
                const followUpResponse = await fetch(`${SCRIPT_URL}?action=getFollowUps&${userParams}`);
                const followUpResult = await followUpResponse.json();
                
                if (followUpResult.status === 'success') {
                    followUpsData = followUpResult.data;
                    console.log('Follow-up data refreshed:', followUpsData.length, 'records');
                    console.log('Referrals found:', followUpsData.filter(f => f.ReferredToMO === 'Yes').length);
                }
                
            } catch (error) {
                console.error('Error refreshing follow-up data:', error);
            }
        }
        
        async function refreshData() {
            showLoader('Refreshing data...');
            try {
                // Build query parameters for user access filtering
                const userParams = new URLSearchParams({
                    username: currentUserName,
                    role: currentUserRole,
                    assignedPHC: currentUserPHC || ''
                });

                // Fetch from backend
                const [patientResponse, followUpResponse] = await Promise.all([
                    fetch(`${SCRIPT_URL}?action=getPatients&${userParams}`),
                    fetch(`${SCRIPT_URL}?action=getFollowUps&${userParams}`)
                ]);
                
                const patientResult = await patientResponse.json();
                const followUpResult = await followUpResponse.json();
                
                if (patientResult.status === 'success') {
                    patientData = patientResult.data.map(normalizePatientFields);
                }
                
                if (followUpResult.status === 'success') {
                    followUpsData = followUpResult.data;
                }
                
                // Re-render all components
                renderAllComponents();
                showNotification('Data refreshed successfully!', 'success');
                
            } catch (error) {
                showNotification('Error refreshing data. Please try again.', 'error');
            } finally {
                hideLoader();
            }
        }
        
        function renderAllComponents() {
            renderStats();
            if (currentUserRole !== 'viewer') {
                renderRecentActivities();
            }
            renderPatientList();
            initializeAllCharts();
            if (currentUserRole === 'master_admin') {
                renderProcurementForecast();
                renderReferralMetrics();
            }
            // Render referred patients list for admins
            if (currentUserRole === 'master_admin' || currentUserRole === 'phc_admin') {
                renderReferredPatientList();
            }
        }

        // Global variable to track if viewer can access Add Patient tab
        let allowAddPatientForViewer = false;

        // Function to get the stored toggle state
        function getStoredToggleState() {
            const stored = localStorage.getItem('allowAddPatientForViewer');
            return stored === 'true';
        }

        // Function to set the stored toggle state
        function setStoredToggleState(value) {
            localStorage.setItem('allowAddPatientForViewer', value.toString());
        }

        // Function to update the toggle button state
        function updateToggleButtonState() {
            const toggleBtn = document.getElementById('toggleVisitorAddPatientBtn');
            if (toggleBtn) {
                // Load current state from localStorage
                allowAddPatientForViewer = getStoredToggleState();
                
                if (allowAddPatientForViewer) {
                    toggleBtn.innerHTML = '<i class="fas fa-user-times"></i> Disable Add Patient tab for Viewer Login';
                    toggleBtn.className = 'btn btn-danger';
                } else {
                    toggleBtn.innerHTML = '<i class="fas fa-user"></i> Allow Add Patient tab for Viewer Login';
                    toggleBtn.className = 'btn btn-secondary';
                }
            }
        }

        // --- UI RENDERING & TABS ---
        function updateTabVisibility() {
            // Load current toggle state from localStorage
            allowAddPatientForViewer = getStoredToggleState();
            
            const isViewer = currentUserRole === 'viewer';
            const isMasterAdmin = currentUserRole === 'master_admin';
            const isPhcAdmin = currentUserRole === 'phc_admin';
            const isPhc = currentUserRole === 'phc';
            const isPhcOrAdmin = isPhc || isMasterAdmin || isPhcAdmin;
            const isAnyAdmin = isMasterAdmin || isPhcAdmin;

            document.getElementById('patientsTab').style.display = isPhcOrAdmin ? 'flex' : 'none';
            document.getElementById('reportsTab').style.display = 'flex'; // Reports for all
            // Add Patient tab: visible for PHC/admin, or for viewer if toggle is ON
            const addPatientShouldShow = isPhcOrAdmin || (isViewer && allowAddPatientForViewer);
            document.getElementById('addPatientTab').style.display = addPatientShouldShow ? 'flex' : 'none';
            
            // Follow-up tab: hidden for viewer, visible for PHC/admin
            document.getElementById('followUpTab').style.display = isPhcOrAdmin ? 'flex' : 'none';
            
            // Management tab only for master admin
            document.getElementById('managementTab').style.display = isMasterAdmin ? 'flex' : 'none';
            document.getElementById('exportContainer').style.display = isMasterAdmin ? 'flex' : 'none';
            document.getElementById('recentActivitiesContainer').style.display = isPhcOrAdmin ? 'block' : 'none';
            document.getElementById('procurementReportContainer').style.display = isMasterAdmin ? 'block' : 'none';
            document.getElementById('referredTab').style.display = isAnyAdmin ? 'flex' : 'none';
        }

        function showTab(tabName, element) {
            // Hide all tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
            
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            });
            
            // Show selected tab pane
            const selectedPane = document.getElementById(tabName);
            if (selectedPane) {
                selectedPane.style.display = 'block';
            }
            
            // Add active class to clicked tab
            if (element) {
                element.classList.add('active');
                element.setAttribute('aria-selected', 'true');
            }
            
            // Update welcome message when showing dashboard
            if (tabName === 'dashboard') {
                updateWelcomeMessage();
            }
            
            // Initialize charts when reports tab is shown
            if (tabName === 'reports') initializeAllCharts(); // Re-render charts when tab is shown
            
            // Render referred patients when referred tab is shown
            if (tabName === 'referred' && (currentUserRole === 'master_admin' || currentUserRole === 'phc_admin')) {
                renderReferredPatientList();
            }
            
            // Render referred patients when follow-up tab is shown (for admins to see new referrals)
            if (tabName === 'followUp' && (currentUserRole === 'master_admin' || currentUserRole === 'phc_admin')) {
                renderReferredPatientList();
            }
            
            // Update toggle button state when management tab is shown
            if (tabName === 'management' && currentUserRole === 'master_admin') {
                updateToggleButtonState();
            }
        }

        function renderStats() {
            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = '';
            const selectedPhc = document.getElementById('dashboardPhcFilter') ? document.getElementById('dashboardPhcFilter').value : 'All';
            
            // Use getActivePatients for consistent filtering logic
            let filteredPatients = getActivePatients();
            if (selectedPhc && selectedPhc !== 'All') {
                filteredPatients = filteredPatients.filter(p => p.PHC && p.PHC.trim().toLowerCase() === selectedPhc.trim().toLowerCase());
            }
            
            // Get all patients for this PHC (including inactive) for stats
            let allPatientsForPhc = patientData;
            if (selectedPhc && selectedPhc !== 'All') {
                allPatientsForPhc = patientData.filter(p => p.PHC && p.PHC.trim().toLowerCase() === selectedPhc.trim().toLowerCase());
            }
            
            const totalPatients = filteredPatients.length;
            const activePatients = filteredPatients.length; // All patients from getActivePatients are active
            const inactivePatients = allPatientsForPhc.filter(p => p.PatientStatus === 'Inactive').length;
            const pendingFollowUps = filteredPatients.filter(p => p.FollowUpStatus === 'Pending').length;
            const referredPatients = followUpsData.filter(f => {
                if (selectedPhc && selectedPhc !== 'All') {
                    const patient = patientData.find(p => p.ID === f.PatientID);
                    return f.ReferredToMO === 'Yes' && patient && patient.PHC && patient.PHC.trim().toLowerCase() === selectedPhc.trim().toLowerCase();
                }
                return f.ReferredToMO === 'Yes';
            }).length;
            // Get follow-up streak from localStorage
            const streakData = JSON.parse(localStorage.getItem('followUpStreakData')) || { count: 0, lastDate: null };
            
            const stats = [
                { number: streakData.count, label: "Follow-Up Streak (Days)" },
                { number: totalPatients, label: "Active Patients" },
                { number: inactivePatients, label: "Inactive Patients" },
                { number: referredPatients, label: "Referred Patients" },
                { number: pendingFollowUps, label: "Pending Follow-ups" },
                { number: userData.length, label: "System Users" }
            ];
            stats.forEach(stat => {
                const statCard = document.createElement('div');
                statCard.className = `stat-card ${currentUserRole === 'viewer' ? 'viewer' : ''}`;
                
                // Add special styling for inactive patients count
                if (stat.label === "Inactive Patients") {
                    statCard.style.borderLeft = '4px solid #e74c3c';
                    statCard.style.backgroundColor = '#fdf2f2';
                }
                
                statCard.innerHTML = `<div class="stat-number">${stat.number}</div><div class="stat-label">${stat.label}</div>`;
                statsGrid.appendChild(statCard);
            });
            if (currentUserRole === 'master_admin') {
                document.getElementById('totalUsers').textContent = userData.length;
                document.getElementById('totalPatientsManagement').textContent = totalPatients + inactivePatients; // Total including inactive
            }
        }

        // Function to update the follow-up streak
        function updateFollowUpStreak() {
            // Get current streak data from localStorage
            let streakData = JSON.parse(localStorage.getItem('followUpStreakData')) || { count: 0, lastDate: null };
            
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day
            
            // If there's no previous date, start a new streak
            if (!streakData.lastDate) {
                streakData.count = 1;
                streakData.lastDate = today.toISOString();
            } else {
                const lastDate = new Date(streakData.lastDate);
                lastDate.setHours(0, 0, 0, 0); // Normalize to start of day
                
                const diffTime = today - lastDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    // Consecutive day - increment streak
                    streakData.count += 1;
                    streakData.lastDate = today.toISOString();
                } else if (diffDays > 1) {
                    // Gap in streak - reset to 1
                    streakData.count = 1;
                    streakData.lastDate = today.toISOString();
                }
                // If diffDays === 0, it's the same day, so do nothing
            }
            
            // Save updated streak data
            localStorage.setItem('followUpStreakData', JSON.stringify(streakData));
            
            // Update the streak display in the dashboard
            renderStats();
        }

        function renderRecentActivities() {
            const container = document.getElementById('recentActivities');
            const recentFollowUps = [...followUpsData]
                .sort((a,b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate))
                .slice(0, 5);
            
            let tableHTML = `<div style="overflow-x: auto;"><table class="report-table">
                <thead><tr>
                    <th>Patient ID</th><th>PHC</th><th>Follow-up Date</th><th>Submitted By</th><th>Duration (s)</th>`;
            if (currentUserRole === 'master_admin') {
                tableHTML += `<th>Medications Changed</th>`;
            }
            tableHTML += `</tr></thead><tbody>`;
            
            if (recentFollowUps.length === 0) {
                tableHTML += `<tr><td colspan="${currentUserRole === 'master_admin' ? 6 : 5}">No recent follow-up activities.</td></tr>`;
            } else {
                recentFollowUps.forEach(f => {
                    const patient = patientData.find(p => p.ID === f.PatientID);
                    tableHTML += `<tr>
                            <td>${f.PatientID}</td>
                            <td>${patient ? patient.PHC : 'N/A'}</td>
                            <td>${new Date(f.FollowUpDate).toLocaleDateString()}</td>
                            <td>${f.SubmittedBy}</td>
                            <td>${f.FollowUpDurationSeconds || 'N/A'}</td>`;
                    if (currentUserRole === 'master_admin') {
                        let medChanged = 'No';
                        if (f.MedicationChanged === 'Yes' || f.MedicationChanged === true || f.medicationChanged === true) {
                            medChanged = 'Yes';
                        } else if (f.MedicationChanged === undefined && f.medicationChanged) {
                            medChanged = f.medicationChanged ? 'Yes' : 'No';
                        }
                        tableHTML += `<td>${medChanged}</td>`;
                    }
                    tableHTML += `</tr>`;
                });
            }
            
            container.innerHTML = tableHTML + '</tbody></table></div>';
        }
        
        document.getElementById('patientSearch').addEventListener('input', (e) => renderPatientList(e.target.value));

        function renderPatientList(searchTerm = '') {
            const container = document.getElementById('patientList');
            container.innerHTML = '';

            const lowerCaseSearch = searchTerm.toLowerCase();
            const showInactive = document.getElementById('showInactivePatients') ? document.getElementById('showInactivePatients').checked : false;
            
            // Get all patients or only active patients based on filter
            let allPatients = showInactive ? patientData : getActivePatients();
            
            const filteredPatients = allPatients.filter(p => 
                (p.PatientName && p.PatientName.toLowerCase().includes(lowerCaseSearch)) ||
                (p.PHC && p.PHC.toLowerCase().includes(lowerCaseSearch)) ||
                (p.ID && p.ID.toLowerCase().includes(lowerCaseSearch))
            );
            
            if (filteredPatients.length === 0) {
                container.innerHTML = '<p>No patients found.</p>';
                return;
            }

            filteredPatients.forEach(p => {
                const patientCard = document.createElement('div');
                patientCard.className = 'patient-card';
                
                // Add styling for inactive patients
                const isInactive = p.PatientStatus === 'Inactive';
                if (isInactive) {
                    patientCard.style.opacity = '0.7';
                    patientCard.style.borderLeft = '4px solid #e74c3c';
                    patientCard.style.backgroundColor = '#fdf2f2';
                }
                
                let medsHtml = 'Not specified';
                if (Array.isArray(p.Medications) && p.Medications.length > 0) {
                    medsHtml = p.Medications.map(med => `<div style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px;"><div style="font-weight: 600; color: #2196F3;">${med.name} ${med.dosage}</div></div>`).join('');
                }
                
                let statusControl = '';
                if (currentUserRole === 'master_admin') {
                    // Improved status detection: default to Active if no status or if status is empty/null
                    const patientStatus = p.PatientStatus || '';
                    const isActive = !patientStatus || patientStatus.trim().toLowerCase() === 'active';
                    const isInactive = patientStatus.trim().toLowerCase() === 'inactive';
                    
                    statusControl = `<div style='margin-top:10px;'><label style='font-size:0.95rem;font-weight:600;'>Status: </label>
                        <select onchange="updatePatientStatus('${p.ID}', this.value)" style='margin-left:8px;padding:3px 8px;border-radius:6px;'>
                            <option value='Active' ${isActive ? 'selected' : ''}>Active</option>
                            <option value='Inactive' ${isInactive ? 'selected' : ''}>Inactive</option>
                        </select></div>`;
                }
                
                // Add inactive indicator
                const inactiveIndicator = isInactive ? '<div style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 10px; display: inline-block;"><i class="fas fa-user-times"></i> Inactive</div>' : '';
                
                patientCard.innerHTML = `
                    ${inactiveIndicator}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #f8f9fa;">
                        <div style="font-size: 1.3rem; font-weight: 700; color: #2196F3;">${p.PatientName} <span style="font-size:0.8rem; color:#7f8c8d;">(${p.ID})</span></div>
                        <div style="background: #e3f2fd; padding: 4px 10px; border-radius: 15px; font-size: 0.9rem;">${p.PHC}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div><div style="font-size: 0.8rem; color: #6c757d; font-weight: 600;">Age</div><div style="font-size: 1rem; color: #333; margin-top: 5px;">${p.Age}</div></div>
                        <div><div style="font-size: 0.8rem; color: #6c757d; font-weight: 600;">Gender</div><div style="font-size: 1rem; color: #333; margin-top: 5px;">${p.Gender}</div></div>
                        <div><div style="font-size: 0.8rem; color: #6c757d; font-weight: 600;">Phone</div><div style="font-size: 1rem; color: #333; margin-top: 5px;"><a href="tel:${p.Phone}" class="dial-link">${p.Phone}</a></div></div>
                        <div><div style="font-size: 0.8rem; color: #6c757d; font-weight: 600;">Status</div><div style="font-size: 1rem; color: #333; margin-top: 5px;">${p.PatientStatus || 'Active'}</div></div>
                        <div><div style="font-size: 0.8rem; color: #6c757d; font-weight: 600;">Diagnosis</div><div style="font-size: 1rem; color: #333; margin-top: 5px;">${p.Diagnosis || 'Not specified'}</div></div>
                    </div>
                    <div style="margin-top: 20px;"><div style="font-weight: 600; margin-bottom: 10px;">Medications</div><div style="display: flex; gap: 10px; flex-wrap: wrap;">${medsHtml}</div></div>
                    ${statusControl}`;
                container.appendChild(patientCard);
            });
        }
        
        // --- CHARTING & REPORTS ---
        function initializeAllCharts() {
            Object.values(charts).forEach(chart => chart.destroy());
            
            // Use getActivePatients for consistent filtering
            const activePatients = getActivePatients();

            // Render each chart with a robust function
            renderPieChart('phcChart', 'PHC Distribution', activePatients.map(p => p.PHC));
            renderBarChart('areaChart', 'PHC Patient Distribution', activePatients.map(p => p.PHC));
            renderPolarAreaChart('medicationChart', 'Medication Usage', activePatients.flatMap(p => Array.isArray(p.Medications) ? p.Medications.map(m => m.name.split('(')[0].trim()) : []));
            renderPieChart('residenceChart', 'Residence Type', activePatients.map(p => p.ResidenceType));
            
            // These are your more complex, custom-built chart functions which are already robust
            renderFollowUpTrendChart();
            renderSeizureTrendChart();
            renderTreatmentCohortChart();
            renderAdherenceTrendChart();
            renderTreatmentSummaryTable();

            // Adherence and Medication Source Charts (now using the robust renderer)
            renderPieChart('adherenceChart', 'Treatment Adherence', followUpsData.map(f => (f.TreatmentAdherence || '').trim()));
            renderDoughnutChart('medSourceChart', 'Medication Source', followUpsData.map(f => (f.MedicationSource || '').trim()));
        }

        // ADD these new generic, robust chart rendering functions to script.js
        function renderPieChart(canvasId, title, dataArray) {
            const chartColors = ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#34495e', '#1abc9c'];
            const counts = dataArray.reduce((acc, val) => { if(val) acc[val] = (acc[val] || 0) + 1; return acc; }, {});
            
            if (charts[canvasId]) charts[canvasId].destroy();
            const chartElement = document.getElementById(canvasId);
            
            if (Object.keys(counts).length === 0) {
                chartElement.parentElement.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--medium-text);"><h4>No Data Available for ${title}</h4></div>`;
                return;
            }

            charts[canvasId] = new Chart(canvasId, {
                type: 'pie',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{ data: Object.values(counts), backgroundColor: chartColors }]
                },
                options: { responsive: true, plugins: { legend: { position: 'right' } } }
            });
        }

        function renderDoughnutChart(canvasId, title, dataArray) {
            // This is similar to Pie, but you might want different styling in the future
            const chartColors = ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#34495e', '#1abc9c'];
            const counts = dataArray.reduce((acc, val) => { if(val) acc[val] = (acc[val] || 0) + 1; return acc; }, {});
            
            if (charts[canvasId]) charts[canvasId].destroy();
            const chartElement = document.getElementById(canvasId);

            if (Object.keys(counts).length === 0) {
                chartElement.parentElement.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--medium-text);"><h4>No Data Available for ${title}</h4></div>`;
                return;
            }

            charts[canvasId] = new Chart(canvasId, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{ data: Object.values(counts), backgroundColor: chartColors }]
                },
                options: { responsive: true, plugins: { legend: { position: 'right' } } }
            });
        }

        function renderBarChart(canvasId, title, dataArray) {
            const counts = dataArray.reduce((acc, val) => { if(val) acc[val] = (acc[val] || 0) + 1; return acc; }, {});
            
            if (charts[canvasId]) charts[canvasId].destroy();
            const chartElement = document.getElementById(canvasId);

            if (Object.keys(counts).length === 0) {
                chartElement.parentElement.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--medium-text);"><h4>No Data Available for ${title}</h4></div>`;
                return;
            }
            
            const sortedData = Object.entries(counts).sort(([,a],[,b]) => b-a);

            charts[canvasId] = new Chart(canvasId, {
                type: 'bar',
                data: {
                    labels: sortedData.map(item => item[0]),
                    datasets: [{ 
                        label: 'Count', 
                        data: sortedData.map(item => item[1]), 
                        backgroundColor: 'rgba(52, 152, 219, 0.7)'
                    }]
                },
                options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
        }

        function renderPolarAreaChart(canvasId, title, dataArray) {
            const chartColors = ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#34495e', '#1abc9c'];
            const counts = dataArray.reduce((acc, val) => { if(val) acc[val] = (acc[val] || 0) + 1; return acc; }, {});
            
            if (charts[canvasId]) charts[canvasId].destroy();
            const chartElement = document.getElementById(canvasId);

            if (Object.keys(counts).length === 0) {
                chartElement.parentElement.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--medium-text);"><h4>No Data Available for ${title}</h4></div>`;
                return;
            }
            
            charts[canvasId] = new Chart(canvasId, {
                type: 'polarArea',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{ data: Object.values(counts), backgroundColor: chartColors }]
                },
                options: { responsive: true }
            });
        }

        function renderFollowUpTrendChart() {
            const phcFilterElement = document.getElementById('followUpTrendPhcFilter');
            if (!phcFilterElement) {
                console.warn('followUpTrendPhcFilter element not found, using "All" as default');
                return;
            }
            const selectedPhc = phcFilterElement.value;
            
            const filteredFollowUps = followUpsData.filter(f => {
                if (selectedPhc === 'All') return true;
                const patient = patientData.find(p => p.ID === f.PatientID);
                return patient && patient.PHC === selectedPhc;
            });

            // Group by month
            const monthlyFollowUps = filteredFollowUps.reduce((acc, f) => {
                const month = new Date(f.FollowUpDate).toISOString().slice(0, 7); // YYYY-MM
                if (!acc[month]) acc[month] = 0;
                acc[month]++;
                return acc;
            }, {});

            const sortedMonths = Object.keys(monthlyFollowUps).sort();
            const chartLabels = sortedMonths.map(month => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            const chartData = sortedMonths.map(month => monthlyFollowUps[month]);

            if (charts.trendChart) charts.trendChart.destroy();
            charts.trendChart = new Chart('trendChart', { 
                type: 'line', 
                data: { 
                    labels: chartLabels, 
                    datasets: [{ 
                        label: `Follow-ups (${selectedPhc})`, 
                        data: chartData, 
                        borderColor: '#3498db', 
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.3, 
                        fill: true 
                    }] 
                },
                options: { 
                    responsive: true,
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        } 
                    } 
                }
            });
        }

        function renderSeizureTrendChart() {
            const phcFilterElement = document.getElementById('seizureTrendPhcFilter');
            if (!phcFilterElement) {
                console.warn('seizureTrendPhcFilter element not found, using "All" as default');
                return;
            }
            const selectedPhc = phcFilterElement.value;
            
            const frequencyScore = { 'Daily': 30, 'Weekly': 4, 'Monthly': 1, 'Yearly': 0.1, 'Less than yearly': 0.05, 'No seizures': 0 };
            
            const filteredFollowUps = followUpsData.filter(f => {
                if (selectedPhc === 'All') return true;
                const patient = patientData.find(p => p.ID === f.PatientID);
                return patient && patient.PHC === selectedPhc;
            });

            console.log('renderSeizureTrendChart: Total follow-ups:', followUpsData.length);
            console.log('renderSeizureTrendChart: Filtered follow-ups:', filteredFollowUps.length);
            console.log('renderSeizureTrendChart: Sample follow-up record:', filteredFollowUps[0]);
            
            // Check if we have any follow-up records at all
            if (filteredFollowUps.length === 0) {
                const chartElement = document.getElementById('seizureChart');
                if (chartElement && chartElement.parentElement) {
                    chartElement.parentElement.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                            <h4>No Follow-up Records Available</h4>
                            <p>No follow-up records found for ${selectedPhc}.</p>
                            <p>Follow-up records need to be completed to generate seizure frequency trends.</p>
                        </div>
                    `;
                }
                return;
            }

            // Group by month
            const monthlyAverages = filteredFollowUps.reduce((acc, f) => {
                const month = new Date(f.FollowUpDate).toISOString().slice(0, 7); // YYYY-MM
                // Use the correct field name from backend
                const seizureFreq = f.SeizureFrequency || '';
                const score = frequencyScore[seizureFreq] ?? 0;
                
                console.log('renderSeizureTrendChart: Processing follow-up:', f.ID, 'SeizureFrequency:', seizureFreq, 'Score:', score);
                
                if (!acc[month]) acc[month] = { totalScore: 0, count: 0 };
                acc[month].totalScore += score;
                acc[month].count++;
                return acc;
            }, {});

            console.log('renderSeizureTrendChart: Monthly averages:', monthlyAverages);

            const sortedMonths = Object.keys(monthlyAverages).sort();
            const chartLabels = sortedMonths.map(month => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
            const chartData = sortedMonths.map(month => monthlyAverages[month].totalScore / monthlyAverages[month].count);

            console.log('renderSeizureTrendChart: Chart labels:', chartLabels);
            console.log('renderSeizureTrendChart: Chart data:', chartData);

            if (charts.seizureChart) charts.seizureChart.destroy();
            
            // Check if we have data to display
            if (chartLabels.length === 0 || chartData.length === 0) {
                const chartElement = document.getElementById('seizureChart');
                if (chartElement && chartElement.parentElement) {
                    chartElement.parentElement.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                            <h4>No Seizure Frequency Data Available</h4>
                            <p>No follow-up records with seizure frequency data found for ${selectedPhc}.</p>
                            <p>Follow-up records need to be completed with seizure frequency information to generate this chart.</p>
                        </div>
                    `;
                }
                return;
            }
            
            charts.seizureChart = new Chart('seizureChart', { 
                type: 'line', 
                data: { 
                    labels: chartLabels, 
                    datasets: [{ 
                        label: `Avg. Seizures/Month (${selectedPhc})`, 
                        data: chartData, 
                        borderColor: '#e74c3c', 
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.3, 
                        fill: true 
                    }] 
                },
                options: { 
                    responsive: true,
                    scales: { y: { beginAtZero: true } } 
                }
            });
        }
        
        function renderProcurementForecast() {
            try {
                console.log('renderProcurementForecast: Starting...');
                const phcFilterElement = document.getElementById('procurementPhcFilter');
                if (!phcFilterElement) {
                    console.warn('procurementPhcFilter element not found, using "All" as default');
                    return;
                }
                
                let selectedPhc = phcFilterElement.value;
                // Handle case where value is empty string (happens with 'All PHCs' option)
                if (selectedPhc === '' && phcFilterElement.options[phcFilterElement.selectedIndex].text === 'All PHCs') {
                    selectedPhc = 'All';
                }
                console.log('renderProcurementForecast: Selected PHC:', selectedPhc);
                
                // Initialize forecast data structure
                const forecast = {}; // { phc: { medName: { dosage: count } } }
                
                // Get all patients based on user role and PHC selection
                let patients = [];
                
                // First, verify patientData is available
                if (!window.patientData || !Array.isArray(window.patientData)) {
                    console.error('patientData is not available or not an array');
                    throw new Error('Patient data not available. Please refresh the page and try again.');
                }
                
                console.log('renderProcurementForecast: Total patients in system:', window.patientData.length);
                
                if (selectedPhc === 'All') {
                    // For "All PHCs", use all patients from patientData
                    console.log('Debug - All PHCs selected, filtering patients...');
                    console.log('Debug - First few patients:', window.patientData.slice(0, 3).map(p => ({
                        id: p.ID,
                        phc: p.PHC,
                        status: p.PatientStatus,
                        hasMeds: Array.isArray(p.Medications) && p.Medications.length > 0
                    })));
                    
                    patients = window.patientData.filter(p => {
                        const isActive = !p.PatientStatus || 
                                      (p.PatientStatus && p.PatientStatus.toLowerCase() !== 'inactive');
                        return isActive;
                    });
                    
                    console.log('renderProcurementForecast: Found', patients.length, 'active patients out of', window.patientData.length, 'total patients');
                    console.log('Debug - Sample active patients:', patients.slice(0, 3).map(p => ({
                        id: p.ID,
                        phc: p.PHC,
                        meds: p.Medications ? p.Medications.length : 0
                    })));
                } else {
                    // For specific PHC, filter by that PHC
                    patients = window.patientData.filter(p => {
                        const phcMatch = p.PHC && p.PHC.trim().toLowerCase() === selectedPhc.trim().toLowerCase();
                        const isActive = !p.PatientStatus || 
                                      (p.PatientStatus && p.PatientStatus.toLowerCase() !== 'inactive');
                        return phcMatch && isActive;
                    });
                    console.log('renderProcurementForecast: Filtered patients for PHC:', selectedPhc, 'Found', patients.length, 'patients');
                }
                
                if (!patients || patients.length === 0) {
                    console.warn('renderProcurementForecast: No patients found for the selected PHC');
                    document.getElementById('procurementReport').innerHTML = `
                        <div style="padding: 20px; text-align: center; color: #666;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2em; margin-bottom: 10px; color: #f39c12;"></i>
                            <h4>No Patient Data Available</h4>
                            <p>No patient records found for ${selectedPhc === 'All' ? 'any PHC' : 'the selected PHC'}.</p>
                        </div>
                    `;
                    return;
                }
                
                // Process each patient's medications
                patients.forEach(patient => {
                    if (!patient || !patient.PHC) {
                        console.log('renderProcurementForecast: Skipping patient - missing PHC data');
                        return;
                    }
                    
                    const phcName = patient.PHC.trim() || 'Unknown PHC';
                    
                    // Skip if no medications
                    if (!Array.isArray(patient.Medications) || patient.Medications.length === 0) {
                        console.log('renderProcurementForecast: Patient', patient.ID, 'has no medications');
                        return;
                    }
                    
                    // Initialize PHC in forecast if not exists
                    if (!forecast[phcName]) {
                        forecast[phcName] = {};
                    }
                    
                    // Process each medication
                    patient.Medications.forEach(med => {
                        if (!med || !med.name) return;
                        
                        const medName = med.name.split('(')[0].trim();
                        let dosage = 0;  // Default to 0 if no valid dosage found
                        if (med.dosage) {
                            const match = med.dosage.match(/\d+/);
                            if (match) {
                                dosage = parseInt(match[0], 10);
                            }
                        }
                        
                        if (!forecast[phcName][medName]) {
                            forecast[phcName][medName] = {};
                        }
                        
                        if (typeof forecast[phcName][medName][dosage] === 'undefined') {
                            forecast[phcName][medName][dosage] = 0;
                        }
                        
                        forecast[phcName][medName][dosage]++;
                    });
                });
                
                console.log('renderProcurementForecast: Processed forecast data:', forecast);
                
                // Generate HTML table
                let tableHTML = `
                    <div style="overflow-x: auto; margin-top: 15px;">
                        <table class="report-table" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">PHC</th>
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Medication</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Dosage (mg)</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Patients</th>
                                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Monthly Tablets</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                let hasData = false;
                
                // Sort PHCs alphabetically
                const sortedPHCs = Object.keys(forecast).sort();
                
                for (const phc of sortedPHCs) {
                    const medications = forecast[phc];
                    
                    // Sort medications alphabetically
                    const sortedMeds = Object.keys(medications).sort();
                    
                    for (const med of sortedMeds) {
                        const dosages = medications[med];
                        
                        // Sort dosages numerically
                        const sortedDosages = Object.keys(dosages).sort((a, b) => parseInt(a) - parseInt(b));
                        
                        for (const dosage of sortedDosages) {
                            const patients = dosages[dosage];
                            if (patients > 0) {
                                hasData = true;
                                const monthlyTablets = patients * 2 * 30; // Assuming 2 doses per day, 30 days
                                
                                tableHTML += `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 10px 12px; vertical-align: top;">${phc}</td>
                                        <td style="padding: 10px 12px; vertical-align: top;">${med}</td>
                                        <td style="padding: 10px 12px; text-align: right; vertical-align: top;">${dosage || 'N/A'}</td>
                                        <td style="padding: 10px 12px; text-align: right; vertical-align: top;">${patients}</td>
                                        <td style="padding: 10px 12px; text-align: right; vertical-align: top; font-weight: 500;">${monthlyTablets.toLocaleString()}</td>
                                    </tr>
                                `;
                            }
                        }
                    }
                }
                
                if (!hasData) {
                    tableHTML += `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 30px; color: #666;">
                                <i class="fas fa-pills" style="font-size: 2em; display: block; margin-bottom: 10px; color: #95a5a6;"></i>
                                <h4>No Medication Data Available</h4>
                                <p>No medication data found for ${selectedPhc === 'All' ? 'any PHC' : 'the selected PHC'}.</p>
                            </td>
                        </tr>
                    `;
                }
                
                tableHTML += `
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top: 15px; font-size: 0.9em; color: #7f8c8d; text-align: right;">
                        <i class="fas fa-info-circle"></i> Based on 2 doses per day, 30 days per month
                    </div>
                `;
                
                document.getElementById('procurementReport').innerHTML = tableHTML;
                
            } catch (error) {
                console.error('Error in renderProcurementForecast:', error);
                document.getElementById('procurementReport').innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #e74c3c;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2em; margin-bottom: 10px;"></i>
                        <h4>Error Loading Data</h4>
                        <p>An error occurred while generating the procurement forecast. Please try again later.</p>
                        <p style="font-size: 0.9em; margin-top: 10px; color: #7f8c8d;">${error.message || 'Unknown error'}</p>
                    </div>
                `;
            }
        }

        function renderReferralMetrics() {
            console.log('renderReferralMetrics: Total follow-ups:', followUpsData.length);
            console.log('renderReferralMetrics: Sample follow-up:', followUpsData[0]);
            
            const totalFollowUps = followUpsData.length;
            const referrals = followUpsData.filter(f => f.ReferredToMO === 'Yes').length;
            const referralPercentage = totalFollowUps > 0 ? ((referrals / totalFollowUps) * 100).toFixed(1) : 0;
            
            console.log('renderReferralMetrics: Referrals found:', referrals);
            console.log('renderReferralMetrics: Referral percentage:', referralPercentage);

            if (totalFollowUps === 0) {
                const metricsHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                        <h4>No Follow-up Data Available</h4>
                        <p>No follow-up records found to calculate referral metrics.</p>
                        <p>Follow-up records need to be completed to generate referral and escalation metrics.</p>
                    </div>
                `;
                document.getElementById('referralMetrics').innerHTML = metricsHTML;
            } else {
                const metricsHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div class="detail-item">
                            <h4>Total Follow-ups</h4>
                            <p>${totalFollowUps}</p>
                        </div>
                        <div class="detail-item">
                            <h4>Referrals to MO</h4>
                            <p>${referrals}</p>
                        </div>
                        <div class="detail-item">
                            <h4>Referral Rate</h4>
                            <p>${referralPercentage}%</p>
                        </div>
                    </div>
                    <div style="margin-top: 1rem; padding: 1rem; background: #e8f4fd; border-radius: var(--border-radius);">
                        <p style="color: var(--medium-text); margin: 0;">
                            This metric tracks the percentage of follow-ups where CHOs flagged cases for specialist referral, 
                            helping monitor care escalation patterns and ensure timely specialist intervention.
                        </p>
                    </div>
                `;
                document.getElementById('referralMetrics').innerHTML = metricsHTML;
            }
        }

        function renderResidenceTypeChart() {
            const residenceTypes = ['Urban', 'Rural', 'Tribal'];
            const activePatients = getActivePatients();
            const counts = residenceTypes.map(type => activePatients.filter(p => p.ResidenceType === type).length);
            if (charts.residenceTypeChart) charts.residenceTypeChart.destroy();
            charts.residenceTypeChart = new Chart('residenceChart', {
                type: 'pie',
                data: {
                    labels: residenceTypes,
                    datasets: [{
                        data: counts,
                        backgroundColor: ['#3498db', '#2ecc71', '#9b59b6']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }

        // --- FOLLOW-UP FUNCTIONS ---
        document.getElementById('phcFollowUpSelect').addEventListener('change', (e) => {
            renderFollowUpPatientList(e.target.value);
        });

        function renderFollowUpPatientList(phc) {
            const userPhc = getUserPHC();
            if (userPhc) phc = userPhc;
            const container = document.getElementById('followUpPatientListContainer');
            if (!phc) {
                container.innerHTML = '<p>Please select a PHC to see the list of patients requiring follow-up.</p>';
                return;
            }
            
            // Robust filter: ignore case and whitespace - using correct field names
            const patientsForFollowUp = getActivePatients().filter(p => {
                const phcMatch = p.PHC && p.PHC.trim().toLowerCase() === phc.trim().toLowerCase();
                const statusMatch = p.PatientStatus && ['active', 'follow-up', 'new'].includes((p.PatientStatus + '').trim().toLowerCase());
                return phcMatch && statusMatch;
            });
            
            if (patientsForFollowUp.length === 0) {
                container.innerHTML = `<p>No patients currently require follow-up in ${phc}.</p>`;
                return;
            }
            
            let listHtml = '<div class="patient-list">';
            patientsForFollowUp.forEach(p => {
                const isCompleted = p.FollowUpStatus && p.FollowUpStatus.includes('Completed');
                const needsReset = checkIfFollowUpNeedsReset(p);
                const isPending = p.FollowUpStatus === 'Pending';
                const canStartFollowUp = !isCompleted || needsReset || isPending;
                
                // Check if this is a patient returned from referral (pending for current month)
                const isReturnedFromReferral = isPending && p.LastFollowUp && p.NextFollowUpDate;
                const isDueForCurrentMonth = isReturnedFromReferral ? checkIfDueForCurrentMonth(p) : false;
                
                // Check if patient was referred to MO (look for latest follow-up with ReferredToMO = 'Yes')
                const latestFollowUp = followUpsData
                    .filter(f => f.PatientID === p.ID)
                    .sort((a, b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate))[0];
                const isReferredToMO = latestFollowUp && latestFollowUp.ReferredToMO === 'Yes' && latestFollowUp.ReferralClosed !== 'Yes';
                
                // Extract completion month and next follow-up date
                let completionMonth = null;
                let nextFollowUpDate = null;
                
                if (isCompleted && p.FollowUpStatus) {
                    const monthMatch = p.FollowUpStatus.match(/Completed for (.+)/);
                    if (monthMatch && monthMatch[1]) {
                        completionMonth = monthMatch[1];
                    } else {
                        completionMonth = null;
                    }
                    // Calculate next follow-up date
                    if (p.LastFollowUp) {
                        const nextDate = new Date(p.LastFollowUp);
                        if (!isNaN(nextDate.getTime())) {
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            nextFollowUpDate = nextDate.toISOString().split('T')[0];
                        } else {
                            nextFollowUpDate = null;
                        }
                    }
                }
                
                const cardBackground = isCompleted && !needsReset ? '#f0fff0' : 'white';
                const buttonClass = isCompleted && !needsReset ? 'btn-success' : 'btn-primary';
                const buttonText = isCompleted && !needsReset ? 'Completed' : 'Start';
                const buttonIcon = isCompleted && !needsReset ? 'fa-check' : 'fa-play';
                
                // Show medication updates if this is a returned referral patient
                let medicationInfo = '';
                if (isReturnedFromReferral && Array.isArray(p.Medications) && p.Medications.length > 0) {
                    medicationInfo = `
                        <div style="margin-top:10px; padding: 10px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                            <div style="font-weight:bold; color:var(--primary-color); margin-bottom: 5px;">
                                <i class="fas fa-pills"></i> Updated Medications (from Medical Officer)
                            </div>
                            <div style="font-size: 0.9rem; color: #666;">
                                ${p.Medications.map(med => `${med.name} ${med.dosage}`).join(', ')}
                            </div>
                        </div>
                    `;
                }
                
                listHtml += `
                    <div class="patient-card" style="cursor: default; background: ${cardBackground}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--secondary-color);">${p.PatientName}</div>
                            <button class="btn ${buttonClass}" onclick="openFollowUpModal('${p.ID}')" ${!canStartFollowUp ? 'disabled' : ''}>
                                <i class="fas ${buttonIcon}"></i> ${buttonText}
                            </button>
                        </div>
                        <div><strong>ID:</strong> ${p.ID}</div>
                        <div><strong>Phone:</strong> <a href="tel:${p.Phone}" class="dial-link">${p.Phone}</a></div>
                        <div><strong>Status:</strong> ${p.PatientStatus}</div>
                        <div><strong>Last Follow-up:</strong> ${p.LastFollowUp ? new Date(p.LastFollowUp).toLocaleDateString() : 'N/A'}</div>
                        ${isCompleted && !needsReset ? `
                            <div style="margin-top:10px; padding: 10px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid var(--success-color);">
                                <div style="font-weight:bold; color:var(--success-color); margin-bottom: 5px;">
                                    <i class="fas fa-check-circle"></i> Follow-up completed${completionMonth ? ` for ${completionMonth}` : ''}
                                </div>
                                <div style="font-size: 0.9rem; color: #666;">
                                    Next follow-up date: ${nextFollowUpDate ? new Date(nextFollowUpDate).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        ` : ''}
                        ${needsReset ? `
                            <div style="margin-top:10px; padding: 10px; background: #fff3cd; border-radius: 8px; border-left: 4px solid var(--warning-color);">
                                <div style="font-weight:bold; color:var(--warning-color);">
                                    <i class="fas fa-exclamation-triangle"></i> Follow-up due for new month
                                </div>
                            </div>
                        ` : ''}
                        ${isReturnedFromReferral && isDueForCurrentMonth ? `
                            <div style="margin-top:10px; padding: 10px; background: #e8f4fd; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                                <div style="font-weight:bold; color:var(--primary-color);">
                                    <i class="fas fa-user-md"></i> Returned from Medical Officer - Due for follow-up
                                </div>
                            </div>
                        ` : ''}
                        ${isReferredToMO ? `
                            <div style="margin-top:10px; padding: 10px; background: #fff3cd; border-radius: 8px; border-left: 4px solid var(--warning-color);">
                                <div style="font-weight:bold; color:var(--warning-color);">
                                    <i class="fas fa-user-md"></i> Patient referred to Medical Officer
                                </div>
                                <div style="font-size: 0.9rem; color: #666; margin-top: 5px;">
                                    Referral date: ${latestFollowUp.FollowUpDate ? new Date(latestFollowUp.FollowUpDate).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        ` : ''}
                        ${medicationInfo}
                    </div>
                `;
            });
            listHtml += '</div>';
            container.innerHTML = listHtml;
        }

        function checkIfFollowUpNeedsReset(patient) {
            if (!patient.FollowUpStatus || !patient.FollowUpStatus.includes('Completed') || !patient.LastFollowUp) {
                return false;
            }
            
            const today = new Date();
            const lastFollowUp = new Date(patient.LastFollowUp);
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const lastFollowUpMonth = lastFollowUp.getMonth();
            const lastFollowUpYear = lastFollowUp.getFullYear();
            
            return lastFollowUpYear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth);
        }

        function checkIfDueForCurrentMonth(patient) {
            if (!patient.NextFollowUpDate) return false;
            
            const today = new Date();
            const nextFollowUp = new Date(patient.NextFollowUpDate);
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const followUpMonth = nextFollowUp.getMonth();
            const followUpYear = nextFollowUp.getFullYear();
            
            return followUpYear === currentYear && followUpMonth === currentMonth;
        }

        // Generate and display patient education content based on patient diagnosis and medications
        function generateAndShowEducation(patientId) {
            // Always use string comparison for IDs
            patientId = patientId.toString();
            const patient = patientData.find(p => (p.ID || '').toString() === patientId);
            
            // Find the education center container
            const educationCenter = document.getElementById('patientEducationCenter');
            if (!educationCenter) {
                console.warn('Education center element not found');
                return;
            }
            
            // Clear previous content
            educationCenter.innerHTML = '';
            
            if (!patient) {
                educationCenter.innerHTML = '<p>Unable to load patient education information.</p>';
                return;
            }
            
            // Generate education content based on diagnosis
            let educationHtml = '';
            
            if (patient.Diagnosis === 'Epilepsy') {
                educationHtml += `
                    <h4>General Information About Epilepsy <span class="hindi-translation">मिर्गी के बारे में सामान्य जानकारी</span></h4>
                    <ul>
                        <li>
                            Epilepsy is a neurological condition characterized by recurrent seizures
                            <span class="hindi-translation">मिर्गी एक न्यूरोलॉजिकल स्थिति है जिसमें बार-बार दौरे पड़ते हैं</span>
                        </li>
                        <li>
                            With proper treatment, most people with epilepsy can live normal lives
                            <span class="hindi-translation">उचित इलाज से, अधिकांश मिर्गी के रोगी सामान्य जीवन जी सकते हैं</span>
                        </li>
                        <li>
                            It's important to take medication regularly as prescribed
                            <span class="hindi-translation">दवा को डॉक्टर के अनुसार नियमित रूप से लेना बहुत जरूरी है</span>
                        </li>
                        <li>
                            Regular follow-ups help monitor treatment effectiveness
                            <span class="hindi-translation">नियमित फॉलो-अप से इलाज की प्रभावशीलता की निगरानी होती है</span>
                        </li>
                    </ul>
                `;
                
                // Add medication-specific education
                if (Array.isArray(patient.Medications) && patient.Medications.length > 0) {
                    educationHtml += '<h4>Medication Information <span class="hindi-translation">दवा संबंधी जानकारी</span></h4>';
                    patient.Medications.forEach(med => {
                        educationHtml += `
                            <div class="medication-info">
                                <h5>${med.name}</h5>
                                <p><strong>Dosage:</strong> ${med.dosage}</p>
                                <ul>
                                    <li>
                                        Take exactly as prescribed
                                        <span class="hindi-translation">डॉक्टर के अनुसार ही दवा लें</span>
                                    </li>
                                    <li>
                                        Do not stop suddenly without consulting your doctor
                                        <span class="hindi-translation">डॉक्टर से बिना पूछे दवा अचानक बंद न करें</span>
                                    </li>
                                    <li>
                                        Report any side effects to your healthcare provider
                                        <span class="hindi-translation">कोई साइड इफेक्ट हो तो अपने डॉक्टर को बताएं</span>
                                    </li>
                                </ul>
                            </div>
                        `;
                    });
                }
                
                // General epilepsy management tips
                educationHtml += `
                    <h4>Seizure Management Tips <span class="hindi-translation">दौरे प्रबंधन के सुझाव</span></h4>
                    <ul>
                        <li>
                            Maintain regular sleep schedule
                            <span class="hindi-translation">नियमित नींद का समय बनाए रखें</span>
                        </li>
                        <li>
                            Avoid known seizure triggers
                            <span class="hindi-translation">दौरे के ज्ञात कारणों से बचें</span>
                        </li>
                        <li>
                            Wear a medical alert bracelet
                            <span class="hindi-translation">मेडिकल अलर्ट ब्रेसलेट पहनें</span>
                        </li>
                        <li>
                            Inform family and friends about seizure first aid
                            <span class="hindi-translation">परिवार और दोस्तों को दौरे की प्राथमिक चिकित्सा के बारे में बताएं</span>
                        </li>
                        <li>
                            Carry emergency contact information
                            <span class="hindi-translation">आपातकालीन संपर्क जानकारी रखें</span>
                        </li>
                    </ul>
                `;
            } else {
                // Default education content for other diagnoses
                educationHtml = `
                    <h4>Patient Education</h4>
                    <p>Please follow your prescribed treatment plan and attend regular follow-up appointments.</p>
                    <p>If you have any questions or concerns about your medication, please discuss them with your healthcare provider.</p>
                `;
            }
            
            educationCenter.innerHTML = educationHtml;
        }

        function openFollowUpModal(patientId) {
            // Always use string comparison for IDs
            patientId = patientId.toString();
            const patient = patientData.find(p => (p.ID || '').toString() === patientId);
            if (!patient) {
                showNotification('Patient not found!', 'error');
                return;
            }

            followUpStartTime = new Date(); // Start timer
            document.getElementById('followUpForm').reset();
            document.getElementById('noImprovementQuestions').style.display = 'none';
            document.getElementById('yesImprovementQuestions').style.display = 'none';
            document.getElementById('correctedPhoneContainer').style.display = 'none';
            document.getElementById('medicationChangeSection').style.display = 'none';
            document.getElementById('followUpSuccessMessage').style.display = 'none';
            
            // Reset progressive disclosure sections
            document.getElementById('drugDoseVerificationSection').style.display = 'block';
            document.getElementById('drugDoseVerification').value = '';
            document.getElementById('followUpForm').style.display = 'none';
            
            // Helper function to safely set element value
            const setElementValue = (id, value) => {
                const element = document.getElementById(id);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                } else {
                    console.warn(`Element with id '${id}' not found when trying to set value: ${value}`);
                }
            };

            const setElementText = (id, text) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = text;
                } else {
                    console.warn(`Element with id '${id}' not found when trying to set text: ${text}`);
                }
            };

            // Reset seizure frequency selection
            document.querySelectorAll('#followUpSeizureFrequencyOptions .seizure-frequency-option').forEach(opt => opt.classList.remove('selected'));
            setElementValue('followUpSeizureFrequency', '');
            
            // Reset drug dose verification
            setElementValue('drugDoseVerification', '');
            
            // Reset age/weight update section
            setElementValue('updateWeightAgeCheckbox', false);
            const updateWeightAgeFields = document.getElementById('updateWeightAgeFields');
            if (updateWeightAgeFields) updateWeightAgeFields.style.display = 'none';
            setElementValue('updateWeight', '');
            setElementValue('updateAge', '');
            setElementValue('weightAgeUpdateReason', '');
            setElementValue('weightAgeUpdateNotes', '');
            
            setElementText('followUpModalTitle', `Follow-up for: ${patient.PatientName} (${patient.ID}) - Phone: ${patient.Phone}`);
            setElementValue('followUpPatientId', patientId);
            setElementValue('followUpDate', new Date().toISOString().split('T')[0]);

            // Display current patient age and weight
            setElementText('currentAgeDisplay', patient.Age ? `${patient.Age} years` : 'Not recorded');
            setElementText('currentWeightDisplay', patient.Weight ? `${patient.Weight} kg` : 'Not recorded');
            
            // Display prescribed drugs
            displayPrescribedDrugs(patient);
            
            // Generate patient education content
            generateAndShowEducation(patientId);
            
            document.getElementById('followUpModal').style.display = 'flex';
        }

        function displayPrescribedDrugs(patient) {
            const drugsList = document.getElementById('prescribedDrugsList');
            drugsList.innerHTML = '';

            if (Array.isArray(patient.Medications) && patient.Medications.length > 0) {
                patient.Medications.forEach(med => {
                    const drugItem = document.createElement('div');
                    drugItem.className = 'drug-item';
                    drugItem.textContent = `${med.name} ${med.dosage}`;
                    drugsList.appendChild(drugItem);
                });
            } else {
                drugsList.innerHTML = '<div class="drug-item">No medications prescribed</div>';
            }
        }

        function closeFollowUpModal() {
            document.getElementById('followUpModal').style.display = 'none';
        }

        // Handle "Other" adverse effect text field visibility for regular follow-up
        document.addEventListener('change', function(e) {
            if (e.target.classList.contains('adverse-effect') && e.target.value === 'Other') {
                const otherInput = document.getElementById('adverseEffectOther');
                if (otherInput) {
                    otherInput.style.display = e.target.checked ? 'block' : 'none';
                }
            }
        });

        document.getElementById('followUpForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!this.checkValidity()) {
                this.reportValidity();
                return;
            }
            
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            showLoader('Saving Follow-up...');
            const durationInSeconds = Math.round((new Date() - followUpStartTime) / 1000);
            
            // Collect new medications if changed
            let newMedications = [];
            if (document.getElementById('medicationChanged').checked) {
                const medications = [
                    { name: "Carbamazepine CR", dosage: (document.getElementById('cbzDosage') && document.getElementById('cbzDosage').value) || '' },
                    { name: "Valproate", dosage: (document.getElementById('valproateDosage') && document.getElementById('valproateDosage').value) || '' },
                    { name: "Levetiracetam", dosage: (document.getElementById('levetiracetamDosage') && document.getElementById('levetiracetamDosage').value) || '' },
                    { name: "Phenytoin", dosage: (document.getElementById('phenytoinDosage') && document.getElementById('phenytoinDosage').value) || '' },
                    { name: "Clobazam", dosage: (document.getElementById('clobazamDosage') && document.getElementById('clobazamDosage').value) || '' },
                    { name: "Other Drugs", dosage: (document.getElementById('otherDrugs') && document.getElementById('otherDrugs').value) || '' }
                ].filter(med => med.dosage && med.dosage.trim() !== '').map(med => ({...med, dosage: med.dosage + (med.name === 'Other Drugs' ? '' : '')}));
                
                newMedications = medications;
            }
            
            // Helper function to safely get element value
            const getElementValue = (id, defaultValue = '') => {
                const element = document.getElementById(id);
                if (!element) {
                    console.warn(`Element with id '${id}' not found, using default value: ${defaultValue}`);
                    return defaultValue;
                }
                return element.type === 'checkbox' ? element.checked : element.value;
            };

            // Collect adverse effects
            const adverseEffectsCheckboxes = document.querySelectorAll('#adverseEffectsCheckboxes input[type="checkbox"]:checked');
            const adverseEffects = Array.from(adverseEffectsCheckboxes).map(cb => cb.value);
            let adverseEffectsString = adverseEffects.filter(effect => effect !== 'Other').join(', ');
            
            // Handle "Other" adverse effect
            if (adverseEffects.includes('Other')) {
                const otherEffect = getElementValue('adverseEffectOther');
                if (otherEffect) {
                    adverseEffectsString += (adverseEffectsString ? ', ' : '') + otherEffect;
                }
            }
            
            const followUpData = {
                patientId: getElementValue('followUpPatientId'),
                choName: getElementValue('choName'),
                followUpDate: getElementValue('followUpDate'),
                phoneCorrect: getElementValue('phoneCorrect'),
                correctedPhoneNumber: getElementValue('correctedPhoneNumber'),
                feltImprovement: getElementValue('feltImprovement'),
                seizureFrequency: getElementValue('followUpSeizureFrequency'),
                seizureTypeChange: getElementValue('seizureTypeChange'),
                seizureDurationChange: getElementValue('seizureDurationChange'),
                seizureSeverityChange: getElementValue('seizureSeverityChange'),
                medicationSource: getElementValue('medicationSource'),
                missedDose: getElementValue('missedDose'),
                treatmentAdherence: getElementValue('treatmentAdherence'),
                medicationChanged: getElementValue('medicationChanged', false),
                newMedications: newMedications,
                newMedicalConditions: getElementValue('newMedicalConditions'),
                additionalQuestions: getElementValue('additionalQuestions'),
                adverseEffects: adverseEffectsString, // Add adverse effects to the data
                durationInSeconds: durationInSeconds,
                submittedByUsername: currentUserName,
                referToMO: getElementValue('referToMO', false),
                drugDoseVerification: getElementValue('drugDoseVerification')
            };

            // Weight/Age update logic
            const updateWeightAgeChecked = getElementValue('updateWeightAgeCheckbox', false);
            const updateWeight = parseFloat(getElementValue('updateWeight') || '0');
            const updateAge = parseFloat(getElementValue('updateAge') || '0');
            const updateReason = getElementValue('weightAgeUpdateReason');
            const updateNotes = getElementValue('weightAgeUpdateNotes');
            let updateWeightAge = false;
            let prevWeight = null, prevAge = null;
            const patient = patientData.find(p => (p.ID || '').toString() === followUpData.patientId);
            if (patient) {
                prevWeight = parseFloat(patient.Weight);
                prevAge = parseFloat(patient.Age);
            }
            
            if (updateWeightAgeChecked && (updateWeight || updateAge)) {
                // Validity checks
                if (updateWeight && prevWeight && updateWeight > prevWeight * 1.2) {
                    if (!confirm('Weight has increased by more than 20%. Are you sure?')) return;
                }
                if (updateAge && prevAge && updateAge < prevAge) {
                    if (!confirm('Age is less than previous value. Are you sure?')) return;
                }
                if (!updateReason) {
                    showNotification('Please provide a reason for updating weight/age.', 'warning');
                    return;
                }
                updateWeightAge = true;
                followUpData.updateWeightAge = true;
                followUpData.currentWeight = updateWeight || prevWeight;
                followUpData.currentAge = updateAge || prevAge;
                followUpData.weightAgeUpdateReason = updateReason;
                followUpData.weightAgeUpdateNotes = updateNotes;
            }

            // Optimistic UI Update
            const patientIndex = patientData.findIndex(p => p.ID === followUpData.patientId);
            if (patientIndex !== -1) {
                patientData[patientIndex].FollowUpStatus = "Completed";
                patientData[patientIndex].LastFollowUp = new Date(followUpData.followUpDate).toLocaleDateString();
                patientData[patientIndex].Adherence = followUpData.treatmentAdherence;
                
                // Update medications if changed
                if (followUpData.medicationChanged && newMedications.length > 0) {
                    patientData[patientIndex].Medications = newMedications;
                }
            }
            
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'addFollowUp', data: followUpData })
                });
                
                // Show success message with enhanced information
                const successMessage = document.getElementById('followUpSuccessMessage');
                if (successMessage) {
                    successMessage.innerHTML = `
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <div>Follow-up submitted successfully!</div>
                            <div style="font-size: 0.9rem; margin-top: 5px; color: #fff;">
                                Next follow-up date: ${new Date(followUpData.followUpDate).getMonth() + 1}/${new Date(followUpData.followUpDate).getFullYear()}
                            </div>
                        </div>
                    `;
                    successMessage.style.display = 'flex';
                }
                
                // Add the new follow-up to local data immediately for optimistic UI
                const newFollowUp = {
                    ...followUpData,
                    FollowUpDate: followUpData.followUpDate,
                    PatientID: followUpData.patientId,
                    SubmittedBy: followUpData.submittedByUsername,
                    ReferredToMO: followUpData.referToMO ? 'Yes' : 'No',
                    ReferralClosed: followUpData.referToMO ? 'No' : '' // Only set to 'No' if referred, otherwise empty
                };
                followUpsData.push(newFollowUp);
                // Update the follow-up streak
                updateFollowUpStreak();
                
                console.log('New follow-up added:', newFollowUp);
                console.log('Referral status:', { referToMO: followUpData.referToMO, ReferredToMO: newFollowUp.ReferredToMO, ReferralClosed: newFollowUp.ReferralClosed });
                console.log('Follow-up data referToMO value:', followUpData.referToMO);
                console.log('Follow-up data referToMO type:', typeof followUpData.referToMO);
                
                // If patient was referred, update the referred patients list immediately
                if (followUpData.referToMO) {
                    console.log('Patient was referred, updating referred patients list immediately');
                    renderReferredPatientList();
                    renderStats(); // Update dashboard stats
                }
                
                // Update the follow-up list
                const selectedPhc = getElementValue('phcFollowUpSelect', 'All');
                
                // Only refresh patient data, not follow-up data to preserve referral status
                await refreshPatientDataOnly();
                renderFollowUpPatientList(selectedPhc);
                
                // Re-render referred patients list after data refresh to ensure it persists
                if (followUpData.referToMO) {
                    console.log('Re-rendering referred patients list after data refresh');
                    renderReferredPatientList();
                }
                
                // Auto-close modal after 2 seconds
                setTimeout(() => {
                    closeFollowUpModal();
                    submitBtn.innerHTML = originalBtnHtml;
                    submitBtn.disabled = false;
                }, 2000);
                
                if (followUpData.referToMO) {
                    showNotification('You are referring this patient to the PHC Medical Officer for follow-up.', 'info');
                }
                
            } catch (error) {
                console.error('Error sending follow-up data to backend:', error);
                showNotification("There was an error sending data to the server, but your changes are shown locally. Please refresh data later.", 'error');
                submitBtn.innerHTML = originalBtnHtml;
                submitBtn.disabled = false;
            } finally {
                hideLoader();
            }
        });

        // --- DATA EXPORT & ACTIONS ---
        function exportToCSV() {
            if (currentUserRole !== 'master_admin') {
                showNotification('Only master administrators can export data.', 'error');
                return;
            }

            // Transform data to include separate medication columns and frequency columns
            const exportData = getActivePatients().map(patient => {
                const baseData = { ...patient };
                delete baseData.Medications;
                const medications = patient.Medications || [];
                medications.forEach((med, index) => {
                    baseData[`Medicine${index + 1}_Name`] = med.name;
                    // Split dosage into amount and frequency (e.g., '200 mg BD')
                    let [amount, freq] = med.dosage ? med.dosage.split(/\s+(?=BD|OD)/) : ["", ""];
                    baseData[`Medicine${index + 1}_Dosage`] = amount || '';
                    baseData[`Medicine${index + 1}_Frequency`] = freq || '';
                    baseData[`Medicine${index + 1}_Strength`] = med.strength || '';
                });
                return baseData;
            });

            let csvContent = "data:text/csv;charset=utf-8," + Papa.unparse(exportData);
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `epilepsy_patients_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // --- PATIENT FORM SUBMISSION ---
        let isPatientFormSubmitting = false; // Flag to prevent double submissions
        
        document.getElementById('patientForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Prevent double submission
            if (isPatientFormSubmitting) {
                console.log('Patient form submission already in progress, ignoring duplicate submission');
                return;
            }
            
            // Basic form validation
            const requiredFields = [
              'patientName',
              'fatherName',
              'patientAge',
              'patientGender',
              'patientPhone',
              'patientLocation',
              'residenceType',
              'patientAddress',
              'diagnosis',
              'ageOfOnset',
              'seizureFrequency',
              'patientWeight',
              'treatmentStatus',
              'patientStatus'
            ];
            const missingFields = requiredFields.filter(fieldId => {
                const field = document.getElementById(fieldId);
                return !field || !field.value.trim();
            });
            
            if (missingFields.length > 0) {
                showNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
                return;
            }
            
            // Clinical safety validation
            const patientAge = parseInt(getElementValue('patientAge'));
            const patientGender = getElementValue('patientGender');
            
            // Check for Valproate prescription in females of reproductive age
            const valproateDosage = getElementValue('valproateDosage');
            if (valproateDosage && valproateDosage.trim() !== '' && patientGender === 'Female' && patientAge >= 15 && patientAge <= 49) {
                // Check if folic acid is prescribed
                const folicAcidDosage = getElementValue('folicAcidDosage');
                if (!folicAcidDosage || folicAcidDosage.trim() === '') {
                    if (!confirm('Valproate is prescribed for a female of reproductive age without folic acid supplementation.\n\nAre you sure you want to proceed without adding folic acid (5 mg daily) for pregnancy prevention?')) {
                        return;
                    }
                }
            }
            
            // Check for Carbamazepine + Valproate combination
            const cbzDosage = getElementValue('cbzDosage');
            if (cbzDosage && cbzDosage.trim() !== '' && valproateDosage && valproateDosage.trim() !== '') {
                if (!confirm('You are prescribing both Valproate and Carbamazepine.\n\nConsider if both are needed for focal and generalized epilepsy. Please confirm epilepsy type from clinical history.\n\nDo you want to proceed with this combination?')) {
                    return;
                }
            }

            // Auto-prescribe folic acid for females of reproductive age (15-49) prescribed Valproate
            if (valproateDosage && valproateDosage.trim() !== '' && patientGender === 'Female' && patientAge >= 15 && patientAge <= 49) {
                const folicAcidDosage = getElementValue('folicAcidDosage');
                if (!folicAcidDosage || folicAcidDosage.trim() === '') {
                    // Auto-select folic acid 5mg OD
                    const folicAcidSelect = document.getElementById('folicAcidDosage');
                    if (folicAcidSelect) {
                        folicAcidSelect.value = '5 OD';
                    }
                }
            }
            
            // Set submission flag and disable submit button
            isPatientFormSubmitting = true;
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            showLoader('Saving patient...');

            try {
                // Helper function to safely get element value (reuse the one from follow-up)
                const getElementValue = (id, defaultValue = '') => {
                    const element = document.getElementById(id);
                    if (!element) {
                        console.warn(`Element with id '${id}' not found, using default value: ${defaultValue}`);
                        return defaultValue;
                    }
                    return element.type === 'checkbox' ? element.checked : element.value;
                };

                const medications = [
                    { name: "Carbamazepine CR", dosage: getElementValue('cbzDosage') },
                    { name: "Valproate", dosage: getElementValue('valproateDosage') },
                    { name: "Levetiracetam", dosage: getElementValue('levetiracetamDosage') },
                    { name: "Phenytoin", dosage: getElementValue('phenytoinDosage') },
                    { name: "Clobazam", dosage: getElementValue('clobazamDosage') },
                    { name: "Other Drugs", dosage: getElementValue('otherDrugs') }
                ].filter(med => med.dosage && med.dosage.trim() !== '').map(med => ({...med, dosage: med.dosage + (med.name === 'Other Drugs' ? '' : '')}));

                const newPatient = {
                    PatientName: getElementValue('patientName'), // <-- Capitalized key
                    fatherName: getElementValue('fatherName'),
                    age: getElementValue('patientAge'),
                    gender: getElementValue('patientGender'),
                    phone: getElementValue('patientPhone'),
                    phoneBelongsTo: getElementValue('phoneBelongsTo'),
                    campLocation: getElementValue('campLocation'),
                    residenceType: getElementValue('residenceType'),
                    address: getElementValue('patientAddress'),
                    phc: getElementValue('patientLocation'),
                    diagnosis: getElementValue('diagnosis'),
                    etiologySyndrome: getElementValue('etiologySyndrome'),
                    ageOfOnset: getElementValue('ageOfOnset'),
                    seizureFrequency: getElementValue('seizureFrequency'),
                    status: getElementValue('patientStatus'),
                    weight: getElementValue('patientWeight'),
                    bpSystolic: getElementValue('bpSystolic'),
                    bpDiastolic: getElementValue('bpDiastolic'),
                    bpRemark: getElementValue('bpRemark'),
                    medications: medications,
                    addictions: getElementValue('addictions'),
                    injuryType: JSON.stringify(selectedInjuries),
                    treatmentStatus: getElementValue('treatmentStatus'),
                    previouslyOnDrug: getElementValue('previouslyOnDrug'),
                    lastFollowUp: new Date().toLocaleDateString(),
                    followUpStatus: "Pending",
                    adherence: "N/A"
                };

                // Check if diagnosis should mark patient as inactive
                const nonEpilepsyDiagnoses = [
                    'fds', 'functional disorder', 'functional neurological disorder',
                    'uncertain', 'unknown', 'other', 'not epilepsy', 'non-epileptic',
                    'psychogenic', 'conversion disorder', 'anxiety', 'depression',
                    'syncope', 'vasovagal', 'cardiac', 'migraine', 'headache',
                    'behavioral', 'attention seeking', 'malingering'
                ];
                
                const diagnosis = (newPatient.diagnosis || '').toLowerCase().trim();
                const hasNonEpilepsyDiagnosis = nonEpilepsyDiagnoses.some(nonEp => 
                    diagnosis.includes(nonEp.toLowerCase())
                );
                
                if (hasNonEpilepsyDiagnosis) {
                    newPatient.status = 'Inactive';
                    showNotification('Patient marked as inactive due to non-epilepsy diagnosis.', 'warning');
                }

                showNotification('Sending patient data to server...', 'info');
                
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'addPatient', data: newPatient })
                });

                showNotification('Patient added successfully! The patient will now appear in the follow-up tab for their respective PHC.', 'success');
                
                // Reset form
                this.reset();
                
                // Reset injury map
                resetInjuryMap();
                
                // Refresh data and switch to patients tab
                await refreshData();
                
                // Switch to patients tab
                const patientsTab = document.querySelector('.nav-tab[onclick*="patients"]');
                if (patientsTab) {
                    showTab('patients', patientsTab);
                }

            } catch (error) {
                console.error('Error adding patient:', error);
                showNotification('An error occurred while saving the patient. Please try again.', 'error');
            } finally {
                // Reset submission flag and re-enable submit button
                isPatientFormSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                hideLoader();
            }
        });

        // --- INJURY MAP LOGIC ---
        function initializeInjuryMap() {
            const modal = document.getElementById('injury-modal');
            const bodyMap = document.getElementById('body-map');
            if (!bodyMap) return;
            
            // Click on body part
            bodyMap.querySelectorAll('path, rect, ellipse, polygon').forEach(part => {
                part.addEventListener('click', () => {
                    if (selectedInjuries.some(injury => injury.part === part.dataset.name)) {
                        alert(`${part.dataset.name} has already been selected. Please remove it first to change the injury type.`);
                        return;
                    }
                    currentBodyPart = part;
                    document.getElementById('injury-modal-title').textContent = `Select Injury for ${part.dataset.name}`;
                    modal.style.display = 'flex';
                });
            });
            
            // Injury type selection
            document.querySelectorAll('.injury-type-options .btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    if (e.target.id === 'cancel-injury-selection') {
                        modal.style.display = 'none';
                        currentBodyPart = null;
                        return;
                    }
                    if (!currentBodyPart) return;
                    const injuryType = e.target.dataset.type;
                    selectedInjuries.push({
                        part: currentBodyPart.dataset.name,
                        type: injuryType
                    });
                    currentBodyPart.classList.add('selected');
                    updateSelectedInjuriesList();
                    modal.style.display = 'none';
                    currentBodyPart = null;
                });
            });
        }

        function closeInjuryModal() {
            document.getElementById('injury-modal').style.display = 'none';
            currentBodyPart = null;
        }

        function updateSelectedInjuriesList() {
            const list = document.getElementById('selected-injuries-list');
            const hiddenInput = document.getElementById('injuriesData');
            list.innerHTML = '';
            
            if (selectedInjuries.length === 0) {
                list.innerHTML = '<li id="no-injuries-li">No injuries selected.</li>';
            } else {
                selectedInjuries.forEach((injury, index) => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span><strong>${injury.part}:</strong> ${injury.type}</span> <button type="button" class="remove-injury" data-index="${index}">&times;</button>`;
                    list.appendChild(li);
                });
            }
            
            document.querySelectorAll('.remove-injury').forEach(button => {
                button.addEventListener('click', (e) => {
                    const indexToRemove = parseInt(e.target.dataset.index);
                    const removedInjury = selectedInjuries.splice(indexToRemove, 1)[0];
                    const partElement = document.querySelector(`#body-map [data-name="${removedInjury.part}"]`);
                    if (partElement) {
                        partElement.classList.remove('selected');
                    }
                    updateSelectedInjuriesList();
                });
            });
            
            if (hiddenInput) hiddenInput.value = JSON.stringify(selectedInjuries);
        }

        function resetInjuryMap() {
            selectedInjuries = [];
            document.querySelectorAll('#body-map path, #body-map rect').forEach(part => part.classList.remove('selected'));
            updateSelectedInjuriesList();
        }

        function normalizePatientFields(patient) {
            // Parse medications from JSON string to array
            let medications = [];
            try {
                if (patient.Medications || patient.medications) {
                    const medData = patient.Medications || patient.medications;
                    console.log('normalizePatientFields: Raw medication data for patient', patient.ID, ':', medData, 'Type:', typeof medData);
                    
                    if (typeof medData === 'string') {
                        medications = JSON.parse(medData);
                        console.log('normalizePatientFields: Parsed medications from string:', medications);
                    } else if (Array.isArray(medData)) {
                        medications = medData;
                        console.log('normalizePatientFields: Medications already an array:', medications);
                    }
                } else {
                    console.log('normalizePatientFields: No medication data found for patient', patient.ID);
                }
            } catch (e) {
                console.warn('Error parsing medications for patient:', patient.ID, e);
                medications = [];
            }

            return {
                ID: (patient.ID || patient.id || '').toString(),
                PatientName: patient.PatientName || patient.name,
                FatherName: patient.FatherName || patient.fatherName,
                Age: patient.Age || patient.age,
                Gender: patient.Gender || patient.gender,
                Phone: patient.Phone || patient.phone,
                PhoneBelongsTo: patient.PhoneBelongsTo || patient.phoneBelongsTo,
                CampLocation: patient.CampLocation || patient.campLocation,
                ResidenceType: patient.ResidenceType || patient.residenceType,
                Address: patient.Address || patient.address,
                PHC: patient.PHC || patient.phc,
                Diagnosis: patient.Diagnosis || patient.diagnosis,
                EtiologySyndrome: patient.EtiologySyndrome || patient.etiologySyndrome,
                AgeOfOnset: patient.AgeOfOnset || patient.ageOfOnset,
                SeizureFrequency: patient.SeizureFrequency || patient.seizureFrequency,
                PatientStatus: patient.PatientStatus || patient.status,
                Weight: patient.Weight || patient.weight,
                BPSystolic: patient.BPSystolic || patient.bpSystolic,
                BPDiastolic: patient.BPDiastolic || patient.bpDiastolic,
                BPRemark: patient.BPRemark || patient.bpRemark,
                Medications: medications,
                Addictions: patient.Addictions || patient.addictions,
                InjuryType: patient.InjuryType || patient.injuryType,
                TreatmentStatus: patient.TreatmentStatus || patient.treatmentStatus,
                PreviouslyOnDrug: patient.PreviouslyOnDrug || patient.previouslyOnDrug,
                LastFollowUp: patient.LastFollowUp || patient.lastFollowUp,
                FollowUpStatus: patient.FollowUpStatus || patient.followUpStatus,
                Adherence: patient.Adherence || patient.adherence,
                RegistrationDate: patient.RegistrationDate || patient.registrationDate,
                AddedBy: patient.AddedBy || patient.addedBy
            };
        }

        function showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideInRight 0.3s ease-out;
            `;
            
            // Set background color based on type
            switch(type) {
                case 'success':
                    notification.style.backgroundColor = 'var(--success-color)';
                    break;
                case 'warning':
                    notification.style.backgroundColor = 'var(--warning-color)';
                    break;
                case 'error':
                    notification.style.backgroundColor = 'var(--danger-color)';
                    break;
                default:
                    notification.style.backgroundColor = 'var(--primary-color)';
            }
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 5000);
        }

        // Update patient status (admin only)
        async function updatePatientStatus(patientId, newStatus) {
            showLoader('Updating patient status...');
            try {
                // Update locally
                const idx = patientData.findIndex(p => p.ID === patientId);
                if (idx !== -1) {
                    patientData[idx].PatientStatus = newStatus;
                }
                // Update in backend
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'updatePatientStatus', id: patientId, status: newStatus })
                });
                // Refresh UI
                renderAllComponents();
                showNotification('Patient status updated!', 'success');
            } catch (e) {
                alert('Error updating status. Please try again.');
            } finally {
                hideLoader();
            }
        }

        // Filter out inactive patients everywhere
        function getActivePatients() {
            const phc = getUserPHC();
            
            // Define non-epilepsy diagnoses that should be marked inactive
            const nonEpilepsyDiagnoses = [
                'fds', 'functional disorder', 'functional neurological disorder',
                'uncertain', 'unknown', 'other', 'not epilepsy', 'non-epileptic',
                'psychogenic', 'conversion disorder', 'anxiety', 'depression',
                'syncope', 'vasovagal', 'cardiac', 'migraine', 'headache',
                'behavioral', 'attention seeking', 'malingering'
            ];
            
            let patients = patientData.filter(p => {
                // Check patient status first
                const statusActive = !p.PatientStatus || 
                    ['active', 'follow-up', 'new'].includes((p.PatientStatus + '').trim().toLowerCase());
                
                // Check diagnosis - exclude non-epilepsy diagnoses
                const diagnosis = (p.Diagnosis || '').toLowerCase().trim();
                const isEpilepsyDiagnosis = !nonEpilepsyDiagnoses.some(nonEp => 
                    diagnosis.includes(nonEp.toLowerCase())
                );
                
                return statusActive && isEpilepsyDiagnosis;
            });
            
            if (phc) {
                patients = patients.filter(p => p.PHC && p.PHC.trim().toLowerCase() === phc.trim().toLowerCase());
            }
            return patients;
        }
        
        // Get all active patients regardless of user PHC (for reports when "All PHCs" is selected)
        function getAllActivePatients() {
            // Define non-epilepsy diagnoses that should be marked inactive
            const nonEpilepsyDiagnoses = [
                'fds', 'functional disorder', 'functional neurological disorder',
                'uncertain', 'unknown', 'other', 'not epilepsy', 'non-epileptic',
                'psychogenic', 'conversion disorder', 'anxiety', 'depression',
                'syncope', 'vasovagal', 'cardiac', 'migraine', 'headache',
                'behavioral', 'attention seeking', 'malingering'
            ];
            
            return patientData.filter(p => {
                // Check patient status first
                const statusActive = !p.PatientStatus || 
                    ['active', 'follow-up', 'new'].includes((p.PatientStatus + '').trim().toLowerCase());
                
                // Check diagnosis - exclude non-epilepsy diagnoses
                const diagnosis = (p.Diagnosis || '').toLowerCase().trim();
                const isEpilepsyDiagnosis = !nonEpilepsyDiagnoses.some(nonEp => 
                    diagnosis.includes(nonEp.toLowerCase())
                );
                
                return statusActive && isEpilepsyDiagnosis;
            });
        }

        // Function to automatically mark patients as inactive based on diagnosis
        function markPatientsInactiveByDiagnosis() {
            const nonEpilepsyDiagnoses = [
                'fds', 'functional disorder', 'functional neurological disorder',
                'uncertain', 'unknown', 'other', 'not epilepsy', 'non-epileptic',
                'psychogenic', 'conversion disorder', 'anxiety', 'depression',
                'syncope', 'vasovagal', 'cardiac', 'migraine', 'headache',
                'behavioral', 'attention seeking', 'malingering'
            ];
            
            let markedCount = 0;
            
            patientData.forEach(p => {
                const diagnosis = (p.Diagnosis || '').toLowerCase().trim();
                const hasNonEpilepsyDiagnosis = nonEpilepsyDiagnoses.some(nonEp => 
                    diagnosis.includes(nonEp.toLowerCase())
                );
                
                // If patient has non-epilepsy diagnosis and is currently active, mark as inactive
                if (hasNonEpilepsyDiagnosis && 
                    (!p.PatientStatus || ['active', 'follow-up', 'new'].includes((p.PatientStatus + '').trim().toLowerCase()))) {
                    p.PatientStatus = 'Inactive';
                    markedCount++;
                }
            });
            
            return markedCount;
        }

        // Function to check and mark patients as inactive based on diagnosis
        async function checkAndMarkInactiveByDiagnosis() {
            if (currentUserRole !== 'master_admin') return;
            
            const markedCount = markPatientsInactiveByDiagnosis();
            
            if (markedCount > 0) {
                showNotification(`${markedCount} patients marked as inactive due to non-epilepsy diagnosis.`, 'info');
                
                // Update backend for marked patients
                try {
                    const inactivePatients = patientData.filter(p => p.PatientStatus === 'Inactive');
                    for (const patient of inactivePatients) {
                        await fetch(SCRIPT_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                action: 'updatePatientStatus', 
                                id: patient.ID, 
                                status: 'Inactive' 
                            })
                        });
                    }
                } catch (error) {
                    showNotification('Error updating patient statuses in backend.', 'error');
                }
                
                // Refresh UI
                renderAllComponents();
            }
        }

        // Use getActivePatients() in all stats, follow-up, and chart calculations

        // Get PHC for current user (if not master admin)
        function getUserPHC() {
            if (currentUserRole === 'master_admin') return null;
            const user = userData.find(u => u.Username === currentUserName && u.Role === currentUserRole);
            return user && user.PHC ? user.PHC : null;
        }
        // Note: getActivePatients() function is defined earlier in the file (line 5022)
        // This duplicate definition has been removed to avoid conflicts

        // --- DEBOUNCED SEARCH FOR PATIENT LIST ---
        let patientSearchTimeout = null;
        document.getElementById('patientSearch').addEventListener('input', (e) => {
            if (patientSearchTimeout) clearTimeout(patientSearchTimeout);
            patientSearchTimeout = setTimeout(() => {
                renderPatientList(e.target.value);
            }, 300);
        });
        // --- END DEBOUNCED SEARCH FOR PATIENT LIST ---

        // --- RENDER REFERRED PATIENT LIST ---
        function renderReferredPatientList() {
            const container = document.getElementById('referredPatientList');
            container.innerHTML = '';
            
            console.log('Rendering referred patients list...');
            
            // Find patients with an open referral (latest follow-up with ReferredToMO === 'Yes' and not ReferralClosed)
            const referredMap = {};
            followUpsData.forEach(f => {
                if (f.ReferredToMO === 'Yes') {
                    console.log(`Found referral for patient ${f.PatientID}: ReferredToMO=${f.ReferredToMO}, ReferralClosed=${f.ReferralClosed}`);
                    if (!referredMap[f.PatientID] || new Date(f.FollowUpDate) > new Date(referredMap[f.PatientID].FollowUpDate)) {
                        referredMap[f.PatientID] = f;
                    }
                }
            });
            
            // Check if any patient has a referral closure entry (ReferralClosed=Yes) and remove them from referred list
            const patientsWithClosedReferrals = new Set();
            followUpsData.forEach(f => {
                if (f.ReferralClosed === 'Yes') {
                    patientsWithClosedReferrals.add(f.PatientID);
                    console.log(`Patient ${f.PatientID} has a closed referral entry`);
                }
            });
            
            console.log('Referred map:', referredMap);
            
            // Only include if not closed - improved filtering logic
            const referredPatients = Object.values(referredMap).filter(f => {
                // Check if ReferralClosed is explicitly 'Yes' - if so, exclude
                const isClosed = f.ReferralClosed === 'Yes';
                // Also check if patient has any closed referral entry
                const hasClosedReferral = patientsWithClosedReferrals.has(f.PatientID);
                console.log(`Patient ${f.PatientID}: ReferralClosed=${f.ReferralClosed}, isClosed=${isClosed}, hasClosedReferral=${hasClosedReferral}`);
                return !isClosed && !hasClosedReferral;
            });
            
            console.log('Final referred patients:', referredPatients.length);
            
            if (referredPatients.length === 0) {
                container.innerHTML = '<p>No patients currently under specialist referral follow-up.</p>';
                return;
            }
            
            let listHtml = '<div class="patient-list">';
            referredPatients.forEach(f => {
                // Try multiple ways to find the patient (handle type mismatches)
                let p = patientData.find(p => p.ID === f.PatientID);
                if (!p) {
                    // Try string comparison
                    p = patientData.find(p => String(p.ID) === String(f.PatientID));
                }
                if (!p) {
                    // Try number comparison
                    p = patientData.find(p => Number(p.ID) === Number(f.PatientID));
                }
                if (!p) {
                    console.warn('Patient not found for ID:', f.PatientID);
                    return;
                }
                listHtml += `
                    <div class="patient-card">
                        <div style="font-size: 1.2rem; font-weight: 700; color: #c0392b;">${p.PatientName} <span style="font-size:0.8rem; color:#7f8c8d;">(${p.ID})</span></div>
                        <div><strong>PHC:</strong> ${p.PHC}</div>
                        <div><strong>Last Referral Date:</strong> ${f.FollowUpDate ? new Date(f.FollowUpDate).toLocaleDateString() : 'N/A'}</div>
                        <div><strong>Referral Notes:</strong> ${f.AdditionalQuestions || ''}</div>
                        <button class="btn btn-primary" onclick="openReferralFollowUpModal('${p.ID}')"><i class="fas fa-notes-medical"></i> Record Referral Follow-up</button>
                    </div>
                `;
            });
            listHtml += '</div>';
            container.innerHTML = listHtml;
        }

        function openReferralFollowUpModal(patientId) {
            document.getElementById('referralFollowUpForm').reset();
            document.getElementById('referralDrugDoseVerification').value = '';
            document.getElementById('referralFollowUpPatientId').value = patientId;
            // Use robust patient lookup with type handling
            let p = patientData.find(p => p.ID === patientId);
            if (!p) {
                // Try string comparison
                p = patientData.find(p => String(p.ID) === String(patientId));
            }
            if (!p) {
                // Try number comparison
                p = patientData.find(p => Number(p.ID) === Number(patientId));
            }
            document.getElementById('referralFollowUpModalTitle').textContent = `Referral follow-up for: ${p ? p.PatientName : patientId}`;
            displayReferralPrescribedDrugs(p);
            
            // Reset medication change section
            document.getElementById('referralMedicationChangeSection').style.display = 'none';
            document.getElementById('referralMedicationChanged').checked = false;
            
            // Reset age/weight update section
            document.getElementById('referralUpdateWeightAgeCheckbox').checked = false;
            document.getElementById('referralUpdateWeightAgeFields').style.display = 'none';
            document.getElementById('referralUpdateWeight').value = '';
            document.getElementById('referralUpdateAge').value = '';
            document.getElementById('referralWeightAgeUpdateReason').value = '';
            document.getElementById('referralWeightAgeUpdateNotes').value = '';
            
            // Display current patient age and weight
            document.getElementById('referralCurrentAgeDisplay').textContent = p.Age ? `${p.Age} years` : 'Not recorded';
            document.getElementById('referralCurrentWeightDisplay').textContent = p.Weight ? `${p.Weight} kg` : 'Not recorded';
            
            // Hide the "Refer to Medical Officer" checkbox
            const referToMOGroup = document.querySelector('#referralFollowUpModal .form-group:has(#referralReferToMO)');
            if (referToMOGroup) {
                referToMOGroup.style.display = 'none';
            }

            // Add info notification at the top of the modal
        }

function openReferralFollowUpModal(patientId) {
    document.getElementById('referralFollowUpForm').reset();
    document.getElementById('referralDrugDoseVerification').value = '';
    document.getElementById('referralFollowUpPatientId').value = patientId;
    // Use robust patient lookup with type handling
    let p = patientData.find(p => p.ID === patientId);
    if (!p) {
        // Try string comparison
        p = patientData.find(p => String(p.ID) === String(patientId));
    }
    if (!p) {
        // Try number comparison
        p = patientData.find(p => Number(p.ID) === Number(patientId));
    }
    document.getElementById('referralFollowUpModalTitle').textContent = `Referral follow-up for: ${p ? p.PatientName : patientId}`;
    displayReferralPrescribedDrugs(p);
            
    // Reset medication change section
    document.getElementById('referralMedicationChangeSection').style.display = 'none';
    document.getElementById('referralMedicationChanged').checked = false;
            
    // Reset age/weight update section
    document.getElementById('referralUpdateWeightAgeCheckbox').checked = false;
    document.getElementById('referralUpdateWeightAgeFields').style.display = 'none';
    document.getElementById('referralUpdateWeight').value = '';
    document.getElementById('referralUpdateAge').value = '';
    document.getElementById('referralWeightAgeUpdateReason').value = '';
    document.getElementById('referralWeightAgeUpdateNotes').value = '';
            
    // Display current patient age and weight
    document.getElementById('referralCurrentAgeDisplay').textContent = p.Age ? `${p.Age} years` : 'Not recorded';
    document.getElementById('referralCurrentWeightDisplay').textContent = p.Weight ? `${p.Weight} kg` : 'Not recorded';
            
    // Hide the "Refer to Medical Officer" checkbox
    const referToMOGroup = document.querySelector('#referralFollowUpModal .form-group:has(#referralReferToMO)');
    if (referToMOGroup) {
        referToMOGroup.style.display = 'none';
    }

    // Add info notification at the top of the modal
    const modalContent = document.querySelector('#referralFollowUpModal .modal-content');
    if (modalContent && !modalContent.querySelector('.info-message')) {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'info-message';
        notificationDiv.style = 'background: #e8f4fd; color: #1e3a8a; padding: 10px 15px; border-radius: 8px; margin-bottom: 10px; font-size: 1rem;';
        notificationDiv.innerHTML = '<i class="fas fa-info-circle"></i> Thank you for following up this patient. Please mark <b>Return to PHC</b> so the patient returns to the CHO for next month\'s follow-up.';
        modalContent.insertBefore(notificationDiv, modalContent.firstChild);
    }

    // Generate patient education content
    generateAndShowEducation(patientId);
                if (updateWeight && prevWeight && updateWeight > prevWeight * 1.2) {
                    if (!confirm('Weight has increased by more than 20%. Are you sure?')) return;
                }
                if (updateAge && prevAge && updateAge < prevAge) {
                    if (!confirm('Age is less than previous value. Are you sure?')) return;
                }
                if (!updateReason) {
                    showNotification('Please provide a reason for updating weight/age.', 'warning');
                    return;
                }
                updateWeightAge = true;
                referralFollowUpData.updateWeightAge = true;
                referralFollowUpData.currentWeight = updateWeight || prevWeight;
                referralFollowUpData.currentAge = updateAge || prevAge;
                referralFollowUpData.weightAgeUpdateReason = updateReason;
                referralFollowUpData.weightAgeUpdateNotes = updateNotes;
            }

            // Form submission is now handled by the event listener attached to the referralFollowUpForm
            // This code has been moved to the proper async function in the DOMContentLoaded event handler

        // Display prescribed drugs in referral modal
        function displayReferralPrescribedDrugs(patient) {
            const drugsList = document.getElementById('referralPrescribedDrugsList');
            drugsList.innerHTML = '';
            if (Array.isArray(patient.Medications) && patient.Medications.length > 0) {
                patient.Medications.forEach(med => {
                    const drugItem = document.createElement('div');
                    drugItem.className = 'drug-item';
                    drugItem.textContent = `${med.name} ${med.dosage}`;
                    drugsList.appendChild(drugItem);
                });
            } else {
                drugsList.innerHTML = '<div class="drug-item">No medications prescribed</div>';
        }

        // Add event handlers for referral follow-up form
        document.addEventListener('DOMContentLoaded', function() {
            // Referral medication changed handler
            document.getElementById('referralMedicationChanged').addEventListener('change', function() {
                const medicationChangeSection = document.getElementById('referralMedicationChangeSection');
                medicationChangeSection.style.display = this.checked ? 'block' : 'none';
            });

            // Referral phone correct handler
            document.getElementById('referralPhoneCorrect').addEventListener('change', function() {
                const showCorrection = this.value === 'No';
                document.getElementById('referralCorrectedPhoneContainer').style.display = showCorrection ? 'block' : 'none';
                if (showCorrection) {
                    document.getElementById('referralCorrectedPhoneNumber').required = true;
                } else {
                    document.getElementById('referralCorrectedPhoneNumber').required = false;
                }
            });

            // Referral improvement status handler
            document.getElementById('referralFeltImprovement').addEventListener('change', function() {
                const noQuestionsDiv = document.getElementById('referralNoImprovementQuestions');
                const yesQuestionsDiv = document.getElementById('referralYesImprovementQuestions');
                
                noQuestionsDiv.style.display = 'none';
                yesQuestionsDiv.style.display = 'none';
                
                if (this.value === 'No') {
                    noQuestionsDiv.style.display = 'grid';
                } else if (this.value === 'Yes') {
                    yesQuestionsDiv.style.display = 'block';
                }
            });

            // Referral follow-up form submission handler
            document.getElementById('referralFollowUpForm').addEventListener('submit', async function(event) {
                event.preventDefault();
                
                // Get form elements
                const form = event.target;
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalBtnHtml = submitBtn.innerHTML;
                
                // Show loading state
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                submitBtn.disabled = true;
                showLoader('Saving referral follow-up...');
                
                try {
                    // Collect form data
                    const patientId = document.getElementById('referralFollowUpPatientId').value;
                    const referralFollowUpData = {
                        patientId: patientId,
                        followUpDate: document.getElementById('referralFollowUpDate').value,
                        submittedByUsername: currentUserName,
                        submittedByRole: currentUserRole,
                        drugDoseVerification: document.getElementById('referralDrugDoseVerification').value,
                        choName: document.getElementById('referralChoName').value,
                        phoneCorrect: document.getElementById('referralPhoneCorrect').value,
                        correctedPhoneNumber: document.getElementById('referralCorrectedPhoneNumber').value,
                        feltImprovement: document.getElementById('referralFeltImprovement').value,
                        seizureFrequency: document.getElementById('referralFollowUpSeizureFrequency').value,
                        seizureTypeChange: document.getElementById('referralSeizureTypeChange').value,
                        seizureDurationChange: document.getElementById('referralSeizureDurationChange').value,
                        seizureSeverityChange: document.getElementById('referralSeizureSeverityChange').value,
                        medicationSource: document.getElementById('referralMedicationSource').value,
                        treatmentAdherence: document.getElementById('referralTreatmentAdherence').value,
                        newMedications: [],
                        newMedicalConditions: document.getElementById('referralNewMedicalConditions').value,
                        referToMO: document.getElementById('referralReferToMO').checked ? 'Yes' : 'No',
                        ReferralClosed: document.getElementById('referralClosed').checked ? 'Yes' : 'No',
                        additionalQuestions: document.getElementById('referralAdditionalQuestions').value
                    };
                    
                    // Handle medication changes
                    if (document.getElementById('referralMedicationChanged').checked) {
                        referralFollowUpData.medicationChanged = true;
                        referralFollowUpData.medicationChangeReason = document.getElementById('referralMedicationChangeReason').value;
                        referralFollowUpData.medicationChangeNotes = document.getElementById('referralMedicationChangeNotes').value;
                        
                        // Collect new medications
                        const newDrugName = document.getElementById('referralNewDrugName').value;
                        const newDrugDosage = document.getElementById('referralNewDrugDosage').value;
                        const newOtherDrugs = document.getElementById('referralNewOtherDrugs').value;
                        
                        if (newDrugName && newDrugDosage) {
                            referralFollowUpData.newMedications.push({
                                name: newDrugName,
                                dosage: newDrugDosage
                            });
                        }
                        
                        if (newOtherDrugs) {
                            referralFollowUpData.newMedications.push({
                                name: 'Other',
                                dosage: newOtherDrugs
                            });
                        }
                    }
                    
                    // Handle age/weight updates
                    if (document.getElementById('referralUpdateWeightAgeCheckbox').checked) {
                        const updateWeight = parseFloat(document.getElementById('referralUpdateWeight').value);
                        const updateAge = parseInt(document.getElementById('referralUpdateAge').value);
                        const updateReason = document.getElementById('referralWeightAgeUpdateReason').value;
                        const updateNotes = document.getElementById('referralWeightAgeUpdateNotes').value;
                        
                        const prevWeight = parseFloat(document.getElementById('referralCurrentWeightDisplay').textContent);
                        const prevAge = parseInt(document.getElementById('referralCurrentAgeDisplay').textContent);
                        
                        if (updateWeight && prevWeight && updateWeight > prevWeight * 1.2) {
                            if (!confirm('Weight has increased by more than 20%. Are you sure?')) return;
                        }
                        if (updateAge && prevAge && updateAge < prevAge) {
                            if (!confirm('Age is less than previous value. Are you sure?')) return;
                        }
                        if (!updateReason) {
                            showNotification('Please provide a reason for updating weight/age.', 'warning');
                            return;
                        }
                        
                        referralFollowUpData.updateWeightAge = true;
                        referralFollowUpData.currentWeight = updateWeight || prevWeight;
                        referralFollowUpData.currentAge = updateAge || prevAge;
                        referralFollowUpData.weightAgeUpdateReason = updateReason;
                        referralFollowUpData.weightAgeUpdateNotes = updateNotes;
                    }
                    
                    // Handle adverse effects
                    const adverseEffects = [];
                    document.querySelectorAll('.referral-adverse-effect:checked').forEach(checkbox => {
                        adverseEffects.push(checkbox.value);
                    });
                    if (adverseEffects.includes('Other')) {
                        const otherEffect = document.getElementById('referralAdverseEffectOther').value;
                        if (otherEffect) {
                            adverseEffects[adverseEffects.indexOf('Other')] = `Other: ${otherEffect}`;
                        }
                    }
                    referralFollowUpData.adverseEffects = adverseEffects.join(', ');
                    
                    // Validate required fields
                    if (!referralFollowUpData.followUpDate || !referralFollowUpData.choName || 
                        !referralFollowUpData.drugDoseVerification || !referralFollowUpData.phoneCorrect ||
                        !referralFollowUpData.feltImprovement || !referralFollowUpData.seizureFrequency ||
                        !referralFollowUpData.treatmentAdherence) {
                        showNotification('Please fill in all required fields.', 'warning');
                        return;
                    }
                    
                    // Validate phone number if correction is needed
                    if (referralFollowUpData.phoneCorrect === 'No' && referralFollowUpData.correctedPhoneNumber) {
                        const phoneRegex = /^\d{10}$/;
                        if (!phoneRegex.test(referralFollowUpData.correctedPhoneNumber)) {
                            showNotification('Please enter a valid 10-digit phone number.', 'warning');
                            return;
                        }
                    }
                    
                    // Send data to backend
                    const response = await fetch(SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'addFollowUp', data: referralFollowUpData })
                    });
                    
                    // If patient is being returned to PHC, also update their follow-up status in the backend
                    if (referralFollowUpData.ReferralClosed === 'Yes') {
                        try {
                            // Calculate next month's date for follow-up
                            const nextMonth = new Date();
                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                            const nextMonthString = nextMonth.toLocaleDateString();
                            
                            await fetch(SCRIPT_URL, {
                                method: 'POST',
                                mode: 'no-cors',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    action: 'updatePatientFollowUpStatus', 
                                    patientId: referralFollowUpData.patientId,
                                    followUpStatus: 'Pending',
                                    lastFollowUp: nextMonthString,
                                    nextFollowUpDate: nextMonthString,
                                    medications: JSON.stringify(referralFollowUpData.newMedications || [])
                                })
                            });
                            console.log('Patient follow-up status updated in backend for next month');
                        } catch (updateError) {
                            console.error('Error updating patient follow-up status in backend:', updateError);
                        }
                    }
                    
                    // Immediately update local data for optimistic UI
                    const newFollowUp = {
                        ...referralFollowUpData,
                        FollowUpDate: referralFollowUpData.followUpDate,
                        PatientID: referralFollowUpData.patientId,
                        SubmittedBy: referralFollowUpData.submittedByUsername,
                        ReferredToMO: 'Yes', // This is a referral follow-up
                        ReferralClosed: referralFollowUpData.ReferralClosed
                    };
                    
                    // Add to local followUpsData
                    followUpsData.push(newFollowUp);
                    
                    // If patient is being returned to PHC, also update any existing referral entries
                    if (referralFollowUpData.ReferralClosed === 'Yes') {
                        // Find and update ALL existing referral entries for this patient
                        let updatedCount = 0;
                        followUpsData.forEach(f => {
                            if (f.PatientID === referralFollowUpData.patientId && f.ReferredToMO === 'Yes') {
                                f.ReferralClosed = 'Yes';
                                updatedCount++;
                            }
                        });
                        console.log(`Updated ${updatedCount} referral entries for patient ${referralFollowUpData.patientId}`);
                        
                        // Re-render the referred patients list
                        renderReferredPatientList();
                        
                        const patientIndex = patientData.findIndex(p => p.ID === referralFollowUpData.patientId);
                        if (patientIndex !== -1) {
                            // Calculate next month's date
                            const nextMonth = new Date();
                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                            const nextMonthString = nextMonth.toLocaleDateString();
                            
                            // Update patient data
                            patientData[patientIndex].FollowUpStatus = 'Pending';
                            patientData[patientIndex].LastFollowUp = nextMonthString;
                            patientData[patientIndex].NextFollowUpDate = nextMonthString;
                            
                            // Update medications if the medical officer prescribed new ones
                            if (referralFollowUpData.medicationChanged && referralFollowUpData.newMedications && referralFollowUpData.newMedications.length > 0) {
                                patientData[patientIndex].Medications = referralFollowUpData.newMedications;
                            }
                            
                            console.log(`Patient ${referralFollowUpData.patientId} marked as returned to PHC, follow-up scheduled for next month (${nextMonthString})`);
                        }
                    }
                    
                    // Show success message
                    if (referralFollowUpData.ReferralClosed === 'Yes') {
                        const nextMonth = new Date();
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        const nextMonthName = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        
                        let message = `Referral follow-up saved and patient returned to PHC successfully! Patient will appear in ${nextMonthName} follow-up list.`;
                        
                        if (referralFollowUpData.medicationChanged && referralFollowUpData.newMedications && referralFollowUpData.newMedications.length > 0) {
                            message += ' Updated medications have been applied.';
                        }
                        
                        showNotification(message, 'success');
                    } else {
                        showNotification('Referral follow-up saved successfully!', 'success');
                    }
                    
                    // Don't refresh data immediately to preserve local referral closure updates
                    // The local followUpsData already has the correct ReferralClosed status
                    
                    // Re-render referred patient list with current local data
                    renderReferredPatientList();
                    
                    // Add a small delay to ensure UI updates are visible
                    setTimeout(() => {
                        closeReferralFollowUpModal();
                        // Refresh dashboard stats to reflect the changes
                        renderStats();
                        // Refresh charts to ensure consistency
                        if (document.getElementById('reports').style.display !== 'none') {
                            initializeAllCharts();
                        }
                    }, 1500);
                    
                } catch (error) {
                    showNotification('Error saving referral follow-up. Please try again.', 'error');
                } finally {
                    submitBtn.innerHTML = originalBtnHtml;
                    submitBtn.disabled = false;
                    hideLoader();
                }
            });
        });
          const headers = data[0];
          const phcCol = headers.indexOf('PHC');
          const statusCol = headers.indexOf('PatientStatus');
          const followUpStatusCol = headers.indexOf('FollowUpStatus');
          let resetCount = 0;

          for (let i = 1; i < data.length; i++) {
            const phc = (data[i][phcCol] || '').toString().trim().toLowerCase();
            const status = (data[i][statusCol] || '').toString().trim().toLowerCase();
            if (
              phc === phcName.trim().toLowerCase() &&
              ['active', 'follow-up', 'new'].includes(status)
            ) {
              data[i][followUpStatusCol] = 'Pending';
              resetCount++;
            }
          }
          // Write back only if something changed
          if (resetCount > 0) {
            sheet.getRange(2, 1, data.length - 1, data[0].length).setValues(data.slice(1));
          }
          return ContentService.createTextOutput(
            JSON.stringify({ status: 'success', resetCount })
          ).setMimeType(ContentService.MimeType.JSON);
        }

        function hideReferToMO() {
            const referToMOCheckbox = document.getElementById('referralReferToMO');
            if (referToMOCheckbox) {
                const parentFormGroup = referToMOCheckbox.closest('.form-group');
                if (parentFormGroup) {
                    parentFormGroup.style.display = 'none';
                }
            }
        }

        async function fixReferralEntries() {
            if (!confirm('This will fix any referral entries that might have missing ReferralClosed values. Continue?')) {
                return;
            }
            
            showLoader('Fixing referral entries...');
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fixReferralEntries' })
                });
                
                // Since we can't read the response due to CORS, we'll assume success
                // and refresh the data to see the changes
                await refreshData();
                showNotification('Referral entries fixed successfully!', 'success');
                
                // Re-render the referred patients list after fixing
                renderReferredPatientList();
                
            } catch (error) {
                console.error('Error fixing referral entries:', error);
                showNotification('Error fixing referral entries. Please try again.', 'error');
            } finally {
                hideLoader();
            }
        }

        async function debugReferralData() {
            if (currentUserRole !== 'master_admin') {
                showNotification('Only master administrators can debug referral data.', 'error');
                return;
            }
            
            showLoader('Debugging referral data...');
            try {
                const response = await fetch(`${SCRIPT_URL}?action=debugReferralData`);
                const result = await response.json();
                
                if (result.status === 'success') {
                    console.log('Referral data debug result:', result);
                    showNotification(`Debug complete: ${result.message}`, 'success');
                    
                    // Log detailed data to console for debugging
                    if (result.data && result.data.length > 0) {
                        console.log('Referral entries found:');
                        result.data.forEach(entry => {
                            console.log(`Patient ${entry.patientId}: ReferredToMO=${entry.referredToMO}, ReferralClosed=${entry.referralClosed}, Date=${entry.followUpDate}`);
                        });
                    }
                } else {
                    showNotification(`Debug failed: ${result.message}`, 'error');
                }
                
            } catch (error) {
                console.error('Error debugging referral data:', error);
                showNotification('Error debugging referral data. Please try again.', 'error');
            } finally {
                hideLoader();
            }
        }

        async function fixReferralData() {
            if (currentUserRole !== 'master_admin') {
                showNotification('Only master administrators can fix referral data.', 'error');
                return;
            }
            
            if (!confirm('This will fix any referral data inconsistencies. Continue?')) {
                return;
            }
            
            showLoader('Fixing referral data...');
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fixReferralData' })
                });
                
                // Since we can't read the response due to CORS, we'll assume success
                // and refresh the data to see the changes
                await refreshData();
                showNotification('Referral data fixed successfully!', 'success');
                
            } catch (error) {
                console.error('Error fixing referral data:', error);
                showNotification('Error fixing referral data. Please try again.', 'error');
            } finally {
                hideLoader();
            }
        }

        async function fixPatientIds() {
            if (!confirm('This will fix any duplicate patient IDs to ensure uniqueness. Continue?')) {
                return;
            }
            
            showLoader('Fixing patient IDs...');
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fixPatientIds' })
                });
                
                // Since we can't read the response due to CORS, we'll assume success
                // and refresh the data to see the changes
                await refreshData();
                showNotification('Patient IDs fixed successfully!', 'success');
                
            } catch (error) {
                showNotification('Error fixing patient IDs. Please try again.', 'error');
            } finally {
                hideLoader();
            }
        }

        async function checkDiagnosisAndMarkInactive() {
            if (currentUserRole !== 'master_admin') {
                showNotification('Only master administrators can perform this action.', 'error');
                return;
            }
            
            if (!confirm('This will check all patients and mark those with non-epilepsy diagnoses as inactive. Continue?')) {
                return;
            }
            
            showLoader('Checking patient diagnoses...');
            try {
                const markedCount = markPatientsInactiveByDiagnosis();
                
                if (markedCount > 0) {
                    showNotification(`${markedCount} patients marked as inactive due to non-epilepsy diagnosis.`, 'success');
                    
                    // Update backend for marked patients
                    const inactivePatients = patientData.filter(p => p.PatientStatus === 'Inactive');
                    for (const patient of inactivePatients) {
                        await fetch(SCRIPT_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                action: 'updatePatientStatus', 
                                id: patient.ID, 
                                status: 'Inactive' 
                            })
                        });
                    }
                    
                    // Refresh UI
                    renderAllComponents();
                } else {
                    showNotification('No patients found with non-epilepsy diagnoses.', 'info');
                }
                
            } catch (error) {
                showNotification('Error checking patient diagnoses. Please try again.', 'error');
            } finally {
                hideLoader();
            }
        }

        // --- DRUG INFO DATA ---
        const drugInfoData = {
            "Carbamazepine": [
                { age: "<6 years", initial: "5 mg/kg/day (BID-QID)", target: "20–35 mg/kg/day", max: "35 mg/kg/day", side: "SJS/TEN rash (HLA-B*1502 screen in Asians), hyponatremia, dizziness, leukopenia. Monitor LFTs, CBC, sodium." },
                { age: "6–12 years", initial: "10 mg/kg/day (BID-QID)", target: "20–35 mg/kg/day", max: "1,000 mg", side: "" },
                { age: ">12 years & adults", initial: "200 mg BID", target: "800–1,200 mg/day", max: "1,600 mg (adults)", side: "" }
            ],
            "Phenytoin": [
                { age: "Neonates", initial: "5 mg/kg/day (BID)", target: "5–8 mg/kg/day", max: "300 mg", side: "Narrow therapeutic index (10–20 µg/mL), nystagmus, ataxia, gingival hyperplasia, osteoporosis. Monitor free levels in renal/hepatic impairment." },
                { age: "6m–4 years", initial: "5 mg/kg/day (BID-TID)", target: "8–10 mg/kg/day", max: "300 mg", side: "" },
                { age: "4–7 years", initial: "5 mg/kg/day (BID-TID)", target: "7.5–9 mg/kg/day", max: "300 mg", side: "" },
                { age: "Adults", initial: "100 mg TID", target: "300–400 mg/day", max: "600 mg", side: "" }
            ],
            "Levetiracetam": [
                { age: "1–6 months", initial: "14 mg/kg/day (BID)", target: "21 mg/kg/day (BID)", max: "42 mg/kg/day", side: "Behavioral changes (agitation, psychosis), sedation, infection. No routine TDM needed. Renal dose adjustment required." },
                { age: "6m–4 years", initial: "20 mg/kg/day (BID)", target: "25 mg/kg/day (BID)", max: "50 mg/kg/day", side: "" },
                { age: "4–16 years", initial: "20 mg/kg/day (BID)", target: "30 mg/kg/day (BID)", max: "60 mg/kg/day", side: "" },
                { age: "Adults", initial: "500 mg BID", target: "1,500 mg BID", max: "3,000 mg", side: "" }
            ],
            "Valproate": [
                { age: "2–11 years", initial: "10–15 mg/kg/day", target: "12.5–15 mg/kg/day BID", max: "60 mg/kg/day", side: "Hepatotoxicity (avoid in <2 years), pancreatitis, thrombocytopenia, tremor, teratogenicity. Monitor LFTs, platelets, ammonia." },
                { age: "≥12 years & adults", initial: "500–600 mg/day", target: "500–1,000 mg BID", max: "2,500 mg (adults)", side: "" }
            ],
            "Clobazam": [
                { age: "≤30 kg body weight", initial: "5 mg/day", target: "10–20 mg/day", max: "20 mg/day", side: "Sedation, drooling, ataxia, dependence. Avoid abrupt withdrawal. Risk of respiratory depression with opioids." },
                { age: ">30 kg body weight", initial: "10 mg/day", target: "20–40 mg/day", max: "40 mg/day", side: "" }
            ]
        };

        // --- ENHANCED DRUG INFO POPUP LOGIC ---
        function showDrugInfoModal(drugName) {
            const modal = document.getElementById('drugInfoModal');
            const title = document.getElementById('drugInfoTitle');
            const content = document.getElementById('drugInfoContent');
            const info = drugInfoData[drugName];
            if (!info) return;
            title.textContent = drugName;

            // Try to get patient age/weight/gender from current form values
            let patientAge = null, patientWeight = null, patientGender = null, source = '';
            let currentPatient = null;
            
            // Check follow-up modal first
            if (document.getElementById('followUpModal') && document.getElementById('followUpModal').style.display === 'flex') {
                // Get from main form's update fields if available
                patientAge = parseFloat(document.getElementById('updateAge')?.value || '');
                patientWeight = parseFloat(document.getElementById('updateWeight')?.value || '');
                // If not available, get from patient data
                if (!patientAge || !patientWeight) {
                    const patientId = document.getElementById('followUpPatientId').value;
                    currentPatient = patientData.find(p => (p.ID || '').toString() === patientId);
                    if (currentPatient) {
                        patientAge = parseFloat(currentPatient.Age || '');
                        patientWeight = parseFloat(currentPatient.Weight || '');
                        patientGender = currentPatient.Gender || currentPatient.gender;
                    }
                } else {
                    // Get gender from patient data even if age/weight are updated
                    const patientId = document.getElementById('followUpPatientId').value;
                    currentPatient = patientData.find(p => (p.ID || '').toString() === patientId);
                    if (currentPatient) {
                        patientGender = currentPatient.Gender || currentPatient.gender;
                    }
                }
                source = 'followUp';
            }
            // Check referral modal
            else if (document.getElementById('referralFollowUpModal') && document.getElementById('referralFollowUpModal').style.display === 'flex') {
                // Get from main form's update fields if available
                patientAge = parseFloat(document.getElementById('referralUpdateAge')?.value || '');
                patientWeight = parseFloat(document.getElementById('referralUpdateWeight')?.value || '');
                // If not available, get from patient data
                if (!patientAge || !patientWeight) {
                    const patientId = document.getElementById('referralFollowUpPatientId').value;
                    currentPatient = patientData.find(p => (p.ID || '').toString() === patientId);
                    if (currentPatient) {
                        patientAge = parseFloat(currentPatient.Age || '');
                        patientWeight = parseFloat(currentPatient.Weight || '');
                        patientGender = currentPatient.Gender || currentPatient.gender;
                    }
                } else {
                    // Get gender from patient data even if age/weight are updated
                    const patientId = document.getElementById('referralFollowUpPatientId').value;
                    currentPatient = patientData.find(p => (p.ID || '').toString() === patientId);
                    if (currentPatient) {
                        patientGender = currentPatient.Gender || currentPatient.gender;
                    }
                }
                source = 'referral';
            }

            // Check for Valproate warnings
            let valproateWarnings = '';
            if (drugName.toLowerCase().includes('valproate')) {
                // Warning: Female reproductive age (14-55 years)
                if (patientGender === 'Female' && patientAge >= 14 && patientAge <= 55) {
                    valproateWarnings += `<div style='background:#fff3cd; border-left:4px solid #f39c12; padding:12px; margin-bottom:16px; border-radius:8px;'>
                        <b>⚠️ Caution:</b> Valproate should be avoided in females of reproductive age (14–55 years). Please choose a more appropriate drug if possible.
                    </div>`;
                }
            }

            let html = '';
            if (isNaN(patientAge) || isNaN(patientWeight) || patientAge <= 0 || patientWeight <= 0) {
                // Show warnings first if any
                if (valproateWarnings) {
                    html += valproateWarnings;
                }
                
                // Only show the static table with a message
                html += `<div style='background:#fff3cd; border-left:4px solid #f39c12; padding:12px; margin-bottom:16px; border-radius:8px;'>
                    <b>Patient-specific suggestion unavailable:</b> Please enter valid age and weight in the form above to see a personalized dose recommendation.</div>`;
                html += `<table class="report-table" style="margin-bottom:1rem;">
                    <thead><tr><th>Age Group</th><th>Initial Dose</th><th>Target Maintenance Dose</th><th>Maximum Daily Dose</th><th>Critical Side Effects & Monitoring</th></tr></thead><tbody>`;
                info.forEach(row => {
                    html += `<tr><td>${row.age}</td><td>${row.initial}</td><td>${row.target}</td><td>${row.max}</td><td>${row.side}</td></tr>`;
                });
                html += '</tbody></table>';
            } else {
                // Show warnings first if any
                if (valproateWarnings) {
                    html += valproateWarnings;
                }
                
                // Only show the blue patient-specific suggestion
                let match = null;
                for (const row of info) {
                    const ageText = row.age.toLowerCase();
                    if (ageText.includes('<6 years') && patientAge < 6) match = row;
                    else if (ageText.includes('6–12 years') && patientAge >= 6 && patientAge <= 12) match = row;
                    else if (ageText.includes('>12 years') && patientAge > 12) match = row;
                    else if (ageText.includes('adult') && patientAge >= 18) match = row;
                    else if (ageText.includes('neonates') && patientAge < 1) match = row;
                    else if (ageText.includes('6m–4 years') && patientAge >= 0.5 && patientAge < 4) match = row;
                    else if (ageText.includes('4–7 years') && patientAge >= 4 && patientAge < 7) match = row;
                    else if (ageText.includes('1–6 months') && patientAge >= 0.08 && patientAge < 0.5) match = row;
                    else if (ageText.includes('6m–4 years') && patientAge >= 0.5 && patientAge < 4) match = row;
                    else if (ageText.includes('4–16 years') && patientAge >= 4 && patientAge <= 16) match = row;
                    else if (ageText.includes('2–11 years') && patientAge >= 2 && patientAge <= 11) match = row;
                    else if (ageText.includes('≥12 years') && patientAge >= 12) match = row;
                    else if (ageText.includes('≤30 kg') && patientWeight <= 30) match = row;
                    else if (ageText.includes('>30 kg') && patientWeight > 30) match = row;
                }
                if (match) {
                    // Use the side effects from the matched row, or find any available side effects
                    let side = (match.side || '').trim();
                    if (!side) {
                        // If the matched row doesn't have side effects, find any row with side effects
                        const rowWithSideEffects = info.find(row => row.side && row.side.trim());
                        side = rowWithSideEffects ? rowWithSideEffects.side.trim() : 'Side effects not specified';
                    }
                    html += `<div style='background:#e8f4fd; border-left:4px solid #3498db; padding:12px; margin-bottom:16px; border-radius:8px;'>
                        <b>Patient-specific suggestion for ${patientAge} years, ${patientWeight} kg:</b><br>
                        <b>Initial Dose:</b> ${match.initial}<br>
                        <b>Target Maintenance Dose:</b> ${match.target}<br>
                        <b>Maximum Daily Dose:</b> ${match.max}<br>
                        <b>Critical Side Effects & Monitoring:</b> ${side}
                        ${(drugName.toLowerCase().includes('carbamazepine')) ? `<div style='margin-top:10px;'><span style='color:#d32f2f;font-weight:bold;'><i class='fas fa-exclamation-triangle'></i> DRUG RASH</span><br><span style='color:#333;'>Please gradually increase doses, preferable in weekly increments.</span></div>` : ''}
                    </div>`;
                } else {
                    html += `<div style='background:#fff3cd; border-left:4px solid #f39c12; padding:12px; margin-bottom:16px; border-radius:8px;'>
                        <b>No exact match for ${patientAge} years, ${patientWeight} kg.</b> Please refer to the table below for the closest age/weight group.</div>`;
                    html += `<table class="report-table" style="margin-bottom:1rem;">
                        <thead><tr><th>Age Group</th><th>Initial Dose</th><th>Target Maintenance Dose</th><th>Maximum Daily Dose</th><th>Critical Side Effects & Monitoring</th></tr></thead><tbody>`;
                    info.forEach(row => {
                        html += `<tr><td>${row.age}</td><td>${row.initial}</td><td>${row.target}</td><td>${row.max}</td><td>${row.side}</td></tr>`;
                    });
                    html += '</tbody></table>';
                }
            }
            content.innerHTML = html;
            modal.style.display = 'flex';
            setTimeout(() => { modal.querySelector('.modal-close')?.focus(); }, 100);
        }
        // Modal close logic: close on click outside or Esc
        (function() {
            const modal = document.getElementById('drugInfoModal');
            if (!modal) return;
            // Click outside
            modal.addEventListener('mousedown', function(e) {
                if (e.target === modal) closeDrugInfoModal();
            });
            // Esc key
            document.addEventListener('keydown', function(e) {
                if (modal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) closeDrugInfoModal();
            });
        })();
        function closeDrugInfoModal() {
            document.getElementById('drugInfoModal').style.display = 'none';
        }
        // --- Make prescribed drugs clickable in follow-up and referral modals ---
        function displayPrescribedDrugs(patient) {
            const drugsList = document.getElementById('prescribedDrugsList');
            drugsList.innerHTML = '';
            if (Array.isArray(patient.Medications) && patient.Medications.length > 0) {
                patient.Medications.forEach(med => {
                    const drugItem = document.createElement('div');
                    drugItem.className = 'drug-item';
                    drugItem.textContent = `${med.name} ${med.dosage}`;
                    // Make clickable if info available
                    const baseName = med.name.split('(')[0].trim();
                    if (drugInfoData[baseName]) {
                        drugItem.style.cursor = 'pointer';
                        drugItem.title = 'Click for drug info';
                        drugItem.addEventListener('click', () => showDrugInfoModal(baseName));
                    }
                    drugsList.appendChild(drugItem);
                });
            } else {
                drugsList.innerHTML = '<div class="drug-item">No medications prescribed</div>';
            }
        }
        function displayReferralPrescribedDrugs(patient) {
            const drugsList = document.getElementById('referralPrescribedDrugsList');
            drugsList.innerHTML = '';
            if (Array.isArray(patient.Medications) && patient.Medications.length > 0) {
                patient.Medications.forEach(med => {
                    const drugItem = document.createElement('div');
                    drugItem.className = 'drug-item';
                    drugItem.textContent = `${med.name} ${med.dosage}`;
                    // Make clickable if info available
                    const baseName = med.name.split('(')[0].trim();
                    if (drugInfoData[baseName]) {
                        drugItem.style.cursor = 'pointer';
                        drugItem.title = 'Click for drug info';
                        drugItem.addEventListener('click', () => showDrugInfoModal(baseName));
                    }
                    drugsList.appendChild(drugItem);
                });
            } else {
                drugsList.innerHTML = '<div class="drug-item">No medications prescribed</div>';
            }
        }

        // --- PHC DROPDOWN IDs - defined globally for consistent access ---
        const PHC_DROPDOWN_IDS = [
            'patientLocation',
            'phcFollowUpSelect', 
            'seizureTrendPhcFilter',
            'procurementPhcFilter',
            'followUpTrendPhcFilter',
            'phcResetSelect',
            'dashboardPhcFilter',
            'treatmentCohortPhcFilter',
            'adherenceTrendPhcFilter',
            'treatmentSummaryPhcFilter'
        ];

        // --- Fetch PHC names from backend ---
        async function fetchPHCNames() {
            try {
                // Show loading state for PHC dropdowns
                PHC_DROPDOWN_IDS.forEach(dropdownId => {
                    const dropdown = document.getElementById(dropdownId);
                    if (dropdown) {
                        dropdown.innerHTML = '<option value="">Loading PHCs...</option>';
                    }
                });

                // Check cache first
                const cachedPHCs = localStorage.getItem('phcNames');
                const cacheTimestamp = localStorage.getItem('phcNamesTimestamp');
                const cacheDuration = 5 * 60 * 1000; // 5 minutes
                
                console.log('fetchPHCNames: Cache check - cachedPHCs:', cachedPHCs ? 'exists' : 'none', 'timestamp:', cacheTimestamp);
                
                if (cachedPHCs && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < cacheDuration) {
                    console.log('fetchPHCNames: Using cached PHC names');
                    const phcNames = JSON.parse(cachedPHCs);
                    populatePHCDropdowns(phcNames);
                    return;
                }

                console.log('fetchPHCNames: Fetching from backend...');
                // Fetch from backend using existing getPHCs endpoint
                const response = await fetch(`${SCRIPT_URL}?action=getPHCs`);
                console.log('fetchPHCNames: Response status:', response.status);
                
                const result = await response.json();
                console.log('fetchPHCNames: Response data:', result);
                
                if (result.status === 'success' && Array.isArray(result.data)) {
                    // Filter for active PHCs on the frontend
                    const activePHCNames = result.data
                        .filter(phc => phc.Status && phc.Status.toLowerCase() === 'active')
                        .map(phc => phc.PHCName)
                        .filter(name => name); // Remove any empty names
                    
                    console.log('fetchPHCNames: Successfully got active PHC names:', activePHCNames);
                    
                    // Cache the result
                    localStorage.setItem('phcNames', JSON.stringify(activePHCNames));
                    localStorage.setItem('phcNamesTimestamp', Date.now().toString());
                    
                    populatePHCDropdowns(activePHCNames);
                } else {
                    throw new Error(result.message || 'Failed to fetch PHC names');
                }
            } catch (error) {
                console.error('Error fetching PHC names:', error);
                
                // Show error state in dropdowns
                PHC_DROPDOWN_IDS.forEach(dropdownId => {
                    const dropdown = document.getElementById(dropdownId);
                    if (dropdown) {
                        dropdown.innerHTML = '<option value="">Error loading PHCs</option>';
                    }
                });
            }
        }

        // --- Function to check dropdown states ---
        function checkDropdownStates() {
            console.log('=== DROPDOWN STATE CHECK ===');
            PHC_DROPDOWN_IDS.forEach(dropdownId => {
                const dropdown = document.getElementById(dropdownId);
                if (dropdown) {
                    const optionCount = dropdown.options.length;
                    const firstOptionText = dropdown.options[0] ? dropdown.options[0].text : 'none';
                    console.log(`${dropdownId}: ${optionCount} options, first option: "${firstOptionText}"`);
                } else {
                    console.log(`${dropdownId}: NOT FOUND`);
                }
            });
            console.log('=== END DROPDOWN STATE CHECK ===');
        }

        // --- Populate all PHC dropdowns ---
        function populatePHCDropdowns(phcNames) {
            console.log('populatePHCDropdowns: Starting to populate dropdowns with:', phcNames);
            
            PHC_DROPDOWN_IDS.forEach(dropdownId => {
                const dropdown = document.getElementById(dropdownId);
                console.log('populatePHCDropdowns: Processing dropdown ID:', dropdownId, 'found:', !!dropdown);
                
                if (dropdown) {
                    // Clear all existing options completely
                    dropdown.innerHTML = '';
                    
                    // Add the appropriate first option based on dropdown type
                    let firstOptionText = 'Select Location';
                    if (dropdownId === 'phcFollowUpSelect') {
                        firstOptionText = '-- Select a PHC --';
                    } else if (dropdownId === 'seizureTrendPhcFilter' || dropdownId === 'procurementPhcFilter' || 
                               dropdownId === 'followUpTrendPhcFilter' || dropdownId === 'dashboardPhcFilter') {
                        firstOptionText = 'All PHCs';
                    } else if (dropdownId === 'phcResetSelect') {
                        firstOptionText = 'Select PHC';
                    }
                    
                    const firstOption = new Option(firstOptionText, '');
                    dropdown.appendChild(firstOption);
                    
                    // Add PHC options
                    phcNames.forEach(phcName => {
                        const option = new Option(phcName, phcName);
                        dropdown.appendChild(option);
                    });
                    
                    console.log('populatePHCDropdowns: Added', phcNames.length, 'options to', dropdownId);
                    console.log('populatePHCDropdowns: Dropdown content after population:', dropdown.innerHTML.substring(0, 100) + '...');
                }
            });
            
            console.log('populatePHCDropdowns: Finished populating all dropdowns');
            
            // Check dropdown states immediately after population
            checkDropdownStates();
            
            // Check dropdown content after a short delay to see if it's being reset
            setTimeout(() => {
                console.log('populatePHCDropdowns: Checking dropdowns after 1 second...');
                checkDropdownStates();
            }, 1000);
            
            // Check again after 3 seconds
            setTimeout(() => {
                console.log('populatePHCDropdowns: Checking dropdowns after 3 seconds...');
                checkDropdownStates();
            }, 3000);
        }

        // --- Function to refresh PHC names (force fresh fetch) ---
        async function refreshPHCNames() {
            clearPHCCache();
            await fetchPHCNames();
        }

        // --- Function to clear PHC cache (useful for testing or manual refresh) ---
        function clearPHCCache() {
            localStorage.removeItem('phcNames');
            localStorage.removeItem('phcNamesTimestamp');
        }

        // --- Utility function for consistent PHC name matching ---
        function normalizePHCName(phcName) {
            return phcName ? phcName.toString().trim().toLowerCase() : '';
        }

        // --- Enhanced PHC name comparison function ---
        function comparePHCNames(phc1, phc2) {
            if (!phc1 || !phc2) return false;
            return normalizePHCName(phc1) === normalizePHCName(phc2);
        }

        // --- TREATMENT STATUS COHORT ANALYSIS FUNCTIONS ---
        
        // Function to render treatment status cohort analysis chart
        function renderTreatmentCohortChart() {
            const phcFilterElement = document.getElementById('treatmentCohortPhcFilter');
            if (!phcFilterElement) {
                console.warn('treatmentCohortPhcFilter element not found, using "All" as default');
                return;
            }
            const selectedPhc = phcFilterElement.value || 'All';
            const allActivePatients = getActivePatients();
            const filteredPatients = selectedPhc === 'All' ? allActivePatients : allActivePatients.filter(p => p.PHC === selectedPhc);
            
            console.log('renderTreatmentCohortChart: Selected PHC:', selectedPhc);
            console.log('renderTreatmentCohortChart: All active patients:', allActivePatients.length);
            console.log('renderTreatmentCohortChart: Filtered patients:', filteredPatients.length);
            console.log('renderTreatmentCohortChart: Sample patient:', filteredPatients[0]);
            
            // Group patients by initial treatment status
            const initialStatusCounts = {};
            const currentStatusCounts = {};
            const adherenceCounts = {};
            
            filteredPatients.forEach(patient => {
                // Initial treatment status (from enrollment)
                const initialStatus = patient.TreatmentStatus || 'Unknown';
                initialStatusCounts[initialStatus] = (initialStatusCounts[initialStatus] || 0) + 1;
                
                // Current status (from latest follow-up or initial)
                const currentStatus = patient.Adherence || patient.TreatmentStatus || 'Unknown';
                currentStatusCounts[currentStatus] = (currentStatusCounts[currentStatus] || 0) + 1;
                
                // Adherence pattern from follow-ups
                if (patient.Adherence && patient.Adherence !== 'N/A') {
                    adherenceCounts[patient.Adherence] = (adherenceCounts[patient.Adherence] || 0) + 1;
                }
            });
            
            console.log('renderTreatmentCohortChart: Initial status counts:', initialStatusCounts);
            console.log('renderTreatmentCohortChart: Current status counts:', currentStatusCounts);
            console.log('renderTreatmentCohortChart: Adherence counts:', adherenceCounts);
            
            // Create stacked bar chart data
            const labels = Object.keys(initialStatusCounts);
            const initialData = labels.map(label => initialStatusCounts[label] || 0);
            const currentData = labels.map(label => currentStatusCounts[label] || 0);
            
            if (charts.treatmentCohortChart) charts.treatmentCohortChart.destroy();
            
            // Check if we have data to display
            if (filteredPatients.length === 0) {
                const chartElement = document.getElementById('treatmentCohortChart');
                if (chartElement && chartElement.parentElement) {
                    chartElement.parentElement.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                            <h4>No Patient Data Available</h4>
                            <p>No active patients found for ${selectedPhc}.</p>
                            <p>Patient data is required to generate treatment status cohort analysis.</p>
                        </div>
                    `;
                }
                return;
            }
            
            if (labels.length === 0) {
                const chartElement = document.getElementById('treatmentCohortChart');
                if (chartElement && chartElement.parentElement) {
                    chartElement.parentElement.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                            <h4>No Treatment Status Data Available</h4>
                            <p>No treatment status data found for ${selectedPhc}.</p>
                            <p>Patients need to have treatment status information to generate this chart.</p>
                        </div>
                    `;
                }
                return;
            }
            
            charts.treatmentCohortChart = new Chart('treatmentCohortChart', {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Initial Status (Enrollment)',
                            data: initialData,
                            backgroundColor: 'rgba(52, 152, 219, 0.7)',
                            borderColor: '#3498db',
                            borderWidth: 1
                        },
                        {
                            label: 'Current Status (Latest)',
                            data: currentData,
                            backgroundColor: 'rgba(46, 204, 113, 0.7)',
                            borderColor: '#2ecc71',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            stacked: false,
                            title: {
                                display: true,
                                text: 'Treatment Status'
                            }
                        },
                        y: {
                            stacked: false,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Patients'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `Treatment Status Cohort Analysis ${selectedPhc !== 'All' ? `- ${selectedPhc}` : ''}`
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }
        
        // Function to render treatment adherence trends chart
        function renderAdherenceTrendChart() {
            const phcFilterElement = document.getElementById('adherenceTrendPhcFilter');
            if (!phcFilterElement) {
                console.warn('adherenceTrendPhcFilter element not found, using "All" as default');
                return;
            }
            const selectedPhc = phcFilterElement.value || 'All';
            const allActivePatients = getActivePatients();
            const filteredPatients = selectedPhc === 'All' ? allActivePatients : allActivePatients.filter(p => p.PHC === selectedPhc);
            
            console.log('renderAdherenceTrendChart: Selected PHC:', selectedPhc);
            console.log('renderAdherenceTrendChart: All active patients:', allActivePatients.length);
            console.log('renderAdherenceTrendChart: Filtered patients:', filteredPatients.length);
            console.log('renderAdherenceTrendChart: Total follow-ups:', followUpsData.length);
            
            // Get follow-up data for these patients
            const patientIds = filteredPatients.map(p => p.ID);
            const relevantFollowUps = followUpsData.filter(f => patientIds.includes(f.PatientID));
            
            console.log('renderAdherenceTrendChart: Patient IDs:', patientIds.length);
            console.log('renderAdherenceTrendChart: Relevant follow-ups:', relevantFollowUps.length);
            console.log('renderAdherenceTrendChart: Sample follow-up:', relevantFollowUps[0]);
            
            // Group by month and adherence pattern
            const monthlyAdherence = {};
            
            relevantFollowUps.forEach(followUp => {
                const date = new Date(followUp.FollowUpDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyAdherence[monthKey]) {
                    monthlyAdherence[monthKey] = {
                        'Always take': 0,
                        'Occasionally miss': 0,
                        'Frequently miss': 0,
                        'Completely stopped medicine': 0
                    };
                }
                
                const adherence = followUp.TreatmentAdherence;
                if (adherence && monthlyAdherence[monthKey].hasOwnProperty(adherence)) {
                    monthlyAdherence[monthKey][adherence]++;
                }
            });
            
            console.log('renderAdherenceTrendChart: Monthly adherence data:', monthlyAdherence);
            
            // Sort months chronologically
            const sortedMonths = Object.keys(monthlyAdherence).sort();
            
            console.log('renderAdherenceTrendChart: Sorted months:', sortedMonths);
            
            if (charts.adherenceTrendChart) charts.adherenceTrendChart.destroy();
            
            // Check if we have data to display
            if (filteredPatients.length === 0) {
                const chartElement = document.getElementById('adherenceTrendChart');
                if (chartElement && chartElement.parentElement) {
                    chartElement.parentElement.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                            <h4>No Patient Data Available</h4>
                            <p>No active patients found for ${selectedPhc}.</p>
                            <p>Patient data is required to generate treatment adherence trends.</p>
                        </div>
                    `;
                }
                return;
            }
            
            if (relevantFollowUps.length === 0) {
                const chartElement = document.getElementById('adherenceTrendChart');
                if (chartElement && chartElement.parentElement) {
                    chartElement.parentElement.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                            <h4>No Follow-up Data Available</h4>
                            <p>No follow-up records found for ${selectedPhc}.</p>
                            <p>Follow-up records with adherence information are required to generate this chart.</p>
                        </div>
                    `;
                }
                return;
            }
            
            if (sortedMonths.length === 0) {
                const chartElement = document.getElementById('adherenceTrendChart');
                if (chartElement && chartElement.parentElement) {
                    chartElement.parentElement.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                            <h4>No Adherence Data Available</h4>
                            <p>No adherence data found in follow-up records for ${selectedPhc}.</p>
                            <p>Follow-up records need to include treatment adherence information.</p>
                        </div>
                    `;
                }
                return;
            }
            
            charts.adherenceTrendChart = new Chart('adherenceTrendChart', {
                type: 'line',
                data: {
                    labels: sortedMonths.map(month => {
                        const [year, monthNum] = month.split('-');
                        return `${monthNum}/${year}`;
                    }),
                    datasets: [
                        {
                            label: 'Always take',
                            data: sortedMonths.map(month => monthlyAdherence[month]['Always take']),
                            borderColor: '#2ecc71',
                            backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            tension: 0.1
                        },
                        {
                            label: 'Occasionally miss',
                            data: sortedMonths.map(month => monthlyAdherence[month]['Occasionally miss']),
                            borderColor: '#f39c12',
                            backgroundColor: 'rgba(243, 156, 18, 0.1)',
                            tension: 0.1
                        },
                        {
                            label: 'Frequently miss',
                            data: sortedMonths.map(month => monthlyAdherence[month]['Frequently miss']),
                            borderColor: '#e67e22',
                            backgroundColor: 'rgba(230, 126, 34, 0.1)',
                            tension: 0.1
                        },
                        {
                            label: 'Completely stopped medicine',
                            data: sortedMonths.map(month => monthlyAdherence[month]['Completely stopped medicine']),
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Month'
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Patients'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `Treatment Adherence Trends Over Time ${selectedPhc !== 'All' ? `- ${selectedPhc}` : ''}`
                        },
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }
        
        // Function to render treatment status summary table
        function renderTreatmentSummaryTable() {
            const phcFilterElement = document.getElementById('treatmentSummaryPhcFilter');
            if (!phcFilterElement) {
                console.warn('treatmentSummaryPhcFilter element not found, using "All" as default');
                return;
            }
            const selectedPhc = phcFilterElement.value || 'All';
            const allActivePatients = getActivePatients();
            const filteredPatients = selectedPhc === 'All' ? allActivePatients : allActivePatients.filter(p => p.PHC === selectedPhc);
            
            console.log('renderTreatmentSummaryTable: Selected PHC:', selectedPhc);
            console.log('renderTreatmentSummaryTable: All active patients:', allActivePatients.length);
            console.log('renderTreatmentSummaryTable: Filtered patients:', filteredPatients.length);
            console.log('renderTreatmentSummaryTable: Sample patient:', filteredPatients[0]);
            
            // Calculate summary statistics
            const summary = {
                total: filteredPatients.length,
                byInitialStatus: {},
                byCurrentAdherence: {},
                medianDuration: 0,
                retentionRate: 0
            };
            
            // Group by initial treatment status
            filteredPatients.forEach(patient => {
                const initialStatus = patient.TreatmentStatus || 'Unknown';
                summary.byInitialStatus[initialStatus] = (summary.byInitialStatus[initialStatus] || 0) + 1;
                
                const adherence = patient.Adherence || 'No follow-up';
                summary.byCurrentAdherence[adherence] = (summary.byCurrentAdherence[adherence] || 0) + 1;
            });
            
            console.log('renderTreatmentSummaryTable: Summary object:', summary);
            
            // Calculate retention rate (patients still on treatment)
            const stillOnTreatment = filteredPatients.filter(p => 
                p.Adherence === 'Always take' || p.Adherence === 'Occasionally miss' || 
                p.Adherence === 'Frequently miss' || p.TreatmentStatus === 'Ongoing'
            ).length;
            
            summary.retentionRate = summary.total > 0 ? ((stillOnTreatment / summary.total) * 100).toFixed(1) : 0;
            
            console.log('renderTreatmentSummaryTable: Still on treatment:', stillOnTreatment);
            console.log('renderTreatmentSummaryTable: Retention rate:', summary.retentionRate);
            
            // Check if we have data to display
            if (filteredPatients.length === 0) {
                const tableHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--medium-text);">
                        <h4>No Patient Data Available</h4>
                        <p>No active patients found for ${selectedPhc}.</p>
                        <p>Patient data is required to generate treatment status summary.</p>
                    </div>
                `;
                document.getElementById('treatmentSummaryTable').innerHTML = tableHTML;
                return;
            }
            
            // Create HTML table
            let tableHTML = `
                <div style="overflow-x: auto;">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th colspan="2">Treatment Status Summary ${selectedPhc !== 'All' ? `- ${selectedPhc}` : ''}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Total Patients</strong></td>
                                <td>${summary.total}</td>
                            </tr>
                            <tr>
                                <td><strong>Retention Rate</strong></td>
                                <td>${summary.retentionRate}% (${stillOnTreatment}/${summary.total})</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <h4 style="margin-top: 20px; color: var(--primary-color);">Initial Treatment Status (Enrollment)</h4>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Count</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            Object.entries(summary.byInitialStatus).forEach(([status, count]) => {
                const percentage = ((count / summary.total) * 100).toFixed(1);
                tableHTML += `
                    <tr>
                        <td>${status}</td>
                        <td>${count}</td>
                        <td>${percentage}%</td>
                    </tr>
                `;
            });
            
            tableHTML += `
                        </tbody>
                    </table>
                    
                    <h4 style="margin-top: 20px; color: var(--primary-color);">Current Adherence Pattern (Latest Follow-up)</h4>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Adherence Pattern</th>
                                <th>Count</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            Object.entries(summary.byCurrentAdherence).forEach(([adherence, count]) => {
                const percentage = ((count / summary.total) * 100).toFixed(1);
                tableHTML += `
                    <tr>
                        <td>${adherence}</td>
                        <td>${count}</td>
                        <td>${percentage}%</td>
                    </tr>
                `;
            });
            
            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;
        
            document.getElementById('treatmentSummaryTable').innerHTML = tableHTML;
        }

        // Function to toggle the Patient Education Center visibility
        function toggleEducationCenter() {
            const educationContainer = document.getElementById('patientEducationCenter');
            if (educationContainer.style.display === 'none') {
                educationContainer.style.display = 'block';
                document.querySelector('.education-center-container button').innerHTML = '<i class="fas fa-eye-slash"></i> Hide Patient Education Guide';
            } else {
                educationContainer.style.display = 'none';
                document.querySelector('.education-center-container button').innerHTML = '<i class="fas fa-book-open"></i> Show Patient Education Guide';
            }
        }

        // Function to setup the Breakthrough Seizure Decision Support Tool
        function setupBreakthroughChecklist() {
            const checklistItems = [
                document.getElementById('checkCompliance'),
                document.getElementById('checkDiagnosis'),
                document.getElementById('checkComedications')
            ];
            const newMedicationFields = document.getElementById('newMedicationFields');

            function validateChecklist() {
                if (checklistItems.every(checkbox => checkbox.checked)) {
                    newMedicationFields.style.display = 'block';
                } else {
                    newMedicationFields.style.display = 'none';
                }
            }

            checklistItems.forEach(checkbox => {
                checkbox.addEventListener('change', validateChecklist);
            });

            document.getElementById('medicationChanged').addEventListener('change', function() {
                if (!this.checked) {
                    checklistItems.forEach(checkbox => checkbox.checked = false);
                    newMedicationFields.style.display = 'none';
                }
            });
        }