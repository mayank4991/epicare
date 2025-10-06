function initializeFollowUpExportSelectors() {
    const monthSel = document.getElementById('followUpExportMonth');
    const yearSel = document.getElementById('followUpExportYear');
    if (!monthSel || !yearSel) return;

    if (monthSel.options.length === 0) {
        const monthNames = ['01 - Jan','02 - Feb','03 - Mar','04 - Apr','05 - May','06 - Jun','07 - Jul','08 - Aug','09 - Sep','10 - Oct','11 - Nov','12 - Dec'];
        monthNames.forEach((label, idx) => {
            const opt = new Option(label, String(idx));
            monthSel.appendChild(opt);
        });
    }

    if (yearSel.options.length === 0) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= currentYear - 5; y--) {
            const opt = new Option(String(y), String(y));
            yearSel.appendChild(opt);
        }
    }

    // Default to current month/year if nothing selected
    const now = new Date();
    if (!monthSel.value) monthSel.value = String(now.getMonth());
    if (!yearSel.value) yearSel.value = String(now.getFullYear());
}
// --- DRUG INFO DATA (CLINICALLY UPDATED) ---
const drugInfoData = {
    "Carbamazepine": {
        "adultDose": "Up to 2400 mg/day in 2 doses ER; Up to 24 mg/day in 3 doses IR",
        "interactions": "Present",
        "proteinBinding": "50-85%",
        "halfLife": "10-30 hr",
        "metabolism": "Extensive",
        "warnings": [
            "Patients of Asian descent should be tested for the HLA B*1502 allele due to increased risk of Stevens-Johnson syndrome.",
            "Risk of hyponatremia, especially in those using diuretics.",
            "Avoid in patients over age 60 as it induces hepatic enzymes, which may worsen cardiovascular risk factors."
        ]
    },
    "Phenytoin": {
        "adultDose": "200-600 mg/day in 2-3 doses",
        "interactions": "Present",
        "proteinBinding": ">85%",
        "halfLife": "10-30P",
        "metabolism": "Extensive, nonlinear",
        "warnings": [
            "Narrow therapeutic index. Monitor drug levels.",
            "Avoid in patients over age 60 as it induces hepatic enzymes."
        ]
    },
    "Levetiracetam": {
        "adultDose": "1500 mg twice daily",
        "interactions": "Absent",
        "proteinBinding": "<50%",
        "halfLife": "<10 hr",
        "metabolism": "~30%, nonhepatic",
        "warnings": [
            "Associated with mood swings, depression, and irritability; may exacerbate these symptoms in patients with psychiatric comorbidities.",
            "Requires dose adjustments in patients with kidney disease."
        ]
    },
    "Valproate": {
        "adultDose": "60 mg/kg/day in 2-3 doses IR or 60 mg/kg/day in 1 dose ER",
        "interactions": "Minimal",
        "proteinBinding": ">85%",
        "halfLife": "10-30 hr",
        "metabolism": "Extensive",
        "warnings": [
            "Teratogenic risk: Avoid in women of childbearing age.",
            "Can cause cognitive slowing, fatigue, and somnolence.",
            "Requires dose adjustments or avoidance in patients with hepatic impairment."
        ]
    },
    "Clobazam": {
        "adultDose": "Up to 10 mg/day if ≤ 30 kg; Up to 20 mg/day if > 30 kg",
        "interactions": "Present",
        "proteinBinding": ">85%",
        "halfLife": "10-30 hr",
        "metabolism": "Extensive",
        "warnings": [
            "Can cause sedation, drooling, and ataxia.",
            "Can cause cognitive slowing, fatigue, and somnolence.",
            "Avoid abrupt withdrawal due to dependence risk."
        ]
    },
    "Phenobarbitone": {
        "adultDose": "Maximum of 240 mg/day",
        "interactions": "Present",
        "proteinBinding": "<50%",
        "halfLife": ">30 hr",
        "metabolism": ">70%",
        "warnings": [
            "Can cause cognitive slowing, fatigue, and somnolence.",
            "Avoid in patients over age 60 as it induces hepatic enzymes.",
            "Requires dose adjustments or avoidance in patients with hepatic impairment."
        ]
    }
};

// --- LOADING INDICATOR FUNCTIONS ---
function showLoading(message = 'Loading...') {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loadingText = document.getElementById('loadingText');
    if (loadingIndicator && loadingText) {
        loadingText.textContent = message;
        loadingIndicator.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyaAOJzspgnks85CYt7h9cJ2oazgVVzjbcVA-O5ak0R16jPdnEteQidoQ5bAMjbJQds/exec';
// PHC names are now fetched dynamically from the backend via fetchPHCNames()

// PHC Dropdown IDs - used across the application
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
    'treatmentSummaryPhcFilter',
    'stockPhcSelector'
];

// Stock management configuration
const MEDICINE_LIST = [
    'Carbamazepine 100mg',
    'Carbamazepine 200mg',
    'Carbamazepine 400mg',
    'Sodium Valproate 200mg',
    'Sodium Valproate 300mg',
    'Sodium Valproate 500mg',
    'Levetiracetam 250mg',
    'Levetiracetam 500mg',
    'Phenytoin 100mg',
    'Clobazam 5mg',
    'Clobazam 10mg',
    'Phenobarbitone 30mg',
    'Phenobarbitone 60mg',
    'Carbamazepine Syrup',
    'Sodium Valproate Syrup',
    'Levetiracetam Syrup',
];

// --- GLOBAL STATE ---
let currentUserRole = "";
let currentUserName = "";
let currentUserPHC = "";
let currentUser = null;
let patientData = [];
let userData = [];
let followUpsData = [];
// Global charts object to hold all chart instances
let charts = {};
let followUpStartTime = null; // For monitoring follow-up duration
let currentFollowUpPatient = null; // Store the current patient in follow-up modal
let lastDataFetch = 0;
const DATA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Injury tracking
let selectedInjuries = [];
let currentBodyPart = null;

// Side Effect Data based on Clinical Presentations
const sideEffectData = {
    "Phenobarbitone": ["Cognitive issues (e.g., drowsiness, confusion)", "Teratogenicity risk"],
    "Phenytoin": ["Gingival hyperplasia (gum swelling)", "Hirsutism (excess hair growth)", "Fetal hydantoin syndrome risk"],
    "Carbamazepine": ["Skin rash", "Facial dysmorphism in babies (risk)"],
    "Sodium Valproate": ["Neural tube defects risk", "Weight gain", "Hair loss", "PCOS risk"],
    "Levetiracetam": ["Mood changes (irritability, depression)", "PCOS risk", "Oligomenorrhea (infrequent periods)"],
    "Benzodiazepines": ["Drowsiness", "Changes in cognition"]
};

/**
 * Generates a curated checklist of side effects based on the patient's prescribed drugs.
 * @param {object} patient The patient object.
 * @param {string} checklistContainerId The ID of the div where checkboxes will be inserted.
 * @param {string} otherContainerId The ID of the div containing the 'Other' text input.
 * @param {string} otherInputId The ID of the 'Other' text input field.
 * @param {string} otherCheckboxValue A unique value for the 'Other' checkbox for this form.
 */
function generateSideEffectChecklist(patient, checklistContainerId, otherContainerId, otherInputId, otherCheckboxValue) {
    const container = document.getElementById(checklistContainerId);
    if (!container) {
        console.error(`Side effects container with ID '${checklistContainerId}' not found.`);
        return;
    }
    
    container.innerHTML = ''; // Clear previous checklist
    const relevantEffects = new Set();

    // Add medication-specific side effects if drugs are prescribed
    if (patient && patient.Medications) {
        // Handle both string (comma-separated) and array Medications
        let medications = [];
        if (typeof patient.Medications === 'string') {
            medications = patient.Medications.split(',').map(m => ({ name: m.trim() }));
        } else if (Array.isArray(patient.Medications)) {
            medications = patient.Medications;
        }
        
        medications.forEach(med => {
            if (!med || !med.name) return;
            const baseDrugName = Object.keys(sideEffectData).find(key => 
                med.name.toLowerCase().includes(key.toLowerCase())
            );
            
            if (baseDrugName && sideEffectData[baseDrugName]) {
                sideEffectData[baseDrugName].forEach(effect => relevantEffects.add(effect));
            }
        });
    }

    // Create and append checkboxes for each effect
    Array.from(relevantEffects).sort().forEach(effect => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.style.display = 'block';
        label.style.marginBottom = '8px';
        label.innerHTML = `
            <input type="checkbox" class="adverse-effect-checkbox" value="${effect}" style="margin-right: 8px;">
            ${effect}
        `;
        container.appendChild(label);
    });

    // Handle the "Other" option
    const otherContainer = document.getElementById(otherContainerId);
    const otherInput = document.getElementById(otherInputId);
    const otherLabel = document.createElement('label');
    otherLabel.className = 'checkbox-label';
    otherLabel.style.display = 'block';
    otherLabel.style.marginBottom = '8px';
    otherLabel.innerHTML = `
        <input type="checkbox" class="adverse-effect-checkbox" value="${otherCheckboxValue}" style="margin-right: 8px;">
        Other (please specify)
    `;
    container.appendChild(otherLabel);

    const otherCheckbox = otherLabel.querySelector('input');
    if (otherCheckbox && otherContainer && otherInput) {
        otherCheckbox.addEventListener('change', function() {
            otherContainer.style.display = this.checked ? 'block' : 'none';
            if (!this.checked) {
                otherInput.value = '';
            }
        });
    }
}

// --- DOM ELEMENTS ---
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingText = document.getElementById('loadingText');

// Setup diagnosis-based form control function
function setupDiagnosisBasedFormControl() {
    const diagnosisField = document.getElementById('diagnosis');
    const epilepsyTypeGroup = document.getElementById('epilepsyTypeGroup');
    const epilepsyCategoryGroup = document.getElementById('epilepsyCategoryGroup');
    const epilepsyTypeInput = document.getElementById('epilepsyType');
    const epilepsyCategoryInput = document.getElementById('epilepsyCategory');

    if (diagnosisField && epilepsyTypeGroup && epilepsyCategoryGroup && epilepsyTypeInput && epilepsyCategoryInput) {
        function toggleEpilepsyFields() {
            if (diagnosisField.value === 'Epilepsy') {
                epilepsyTypeGroup.style.display = '';
                epilepsyCategoryGroup.style.display = '';
                epilepsyTypeInput.required = true;
                epilepsyCategoryInput.required = true;
            } else {
                epilepsyTypeGroup.style.display = 'none';
                epilepsyCategoryGroup.style.display = 'none';
                epilepsyTypeInput.required = false;
                epilepsyCategoryInput.required = false;
                epilepsyTypeInput.value = '';
                epilepsyCategoryInput.value = '';
            }
        }
        
        diagnosisField.addEventListener('change', toggleEpilepsyFields);
        // Run on load
        toggleEpilepsyFields();
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
    
    // Set the welcome message and make it visible
    welcomeElement.textContent = welcomeText;
    welcomeElement.style.opacity = '1';
    welcomeElement.style.transition = 'opacity 0.5s ease-in-out';
    
    // Auto-hide after 90 seconds
    setTimeout(() => {
        welcomeElement.style.opacity = '0';
        // Remove from DOM after fade out completes
        setTimeout(() => {
            welcomeElement.remove();
        }, 500);
    }, 90000);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tab visibility based on user role
    updateTabVisibility();
    
    // Initialize patient form
    initializePatientForm();
    
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
    // Add this inside the DOMContentLoaded listener in script.js

const significantEventSelect = document.getElementById('significantEvent');
const deceasedInfoSection = document.getElementById('deceasedInfoSection');
const pregnancyInfoSection = document.getElementById('pregnancyInfoSection');
const followUpFormSections = document.querySelectorAll('#followUpForm > *:not(#significantEvent, #deceasedInfoSection, #pregnancyInfoSection)'); // Select all other form sections

// Helper function to manage required fields
const requiredFieldsToToggle = ['phoneCorrect', 'feltImprovement', 'followUpSeizureFrequency', 'treatmentAdherence', 'medicationSource'];

function toggleFollowUpRequiredFields(makeRequired) {
requiredFieldsToToggle.forEach(fieldId => {
const field = document.getElementById(fieldId);
if (field) {
    if (makeRequired) {
        field.setAttribute('required', '');
    } else {
        field.removeAttribute('required');
    }
}
});
}

// Event listener for significant event changes
significantEventSelect.addEventListener('change', function() {
const selectedEvent = this.value;
const dateOfDeathInput = document.getElementById('dateOfDeath');
const submitButton = document.querySelector('#followUpForm button[type="submit"]');

// 1. Reset the form to default state
deceasedInfoSection.style.display = 'none';
pregnancyInfoSection.style.display = 'none';
dateOfDeathInput.removeAttribute('required');

// Remove any existing validation messages
const invalidInputs = document.querySelectorAll('.is-invalid');
invalidInputs.forEach(input => input.classList.remove('is-invalid'));

// Re-enable required fields by default
toggleFollowUpRequiredFields(true);

// Make all form sections visible by default
followUpFormSections.forEach(section => {
section.style.display = '';
});

// 2. Apply logic based on selection
if (selectedEvent === 'Patient has Passed Away') {
deceasedInfoSection.style.display = 'block';
dateOfDeathInput.setAttribute('required', '');
toggleFollowUpRequiredFields(false);

// Hide all form sections EXCEPT for essential ones
followUpFormSections.forEach(section => {
    const isSubmitButton = section.tagName === 'BUTTON' && section.type === 'submit';
    const isHeader = section.classList.contains('form-section-header');
    const containsChoName = section.querySelector('#choName');
    const containsFollowUpDate = section.querySelector('#followUpDate');

    // Keep headers, CHO name, follow-up date, and submit button visible
    if (!isSubmitButton && !isHeader && !containsChoName && !containsFollowUpDate) {
        section.style.display = 'none';
    }
});

// Ensure submit button is visible
if (submitButton) {
    submitButton.style.display = 'block';
    
    // Remove any 'required' attributes from hidden fields to prevent validation issues
    document.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.offsetParent === null) { // If element is not visible
            field.removeAttribute('required');
        }
    });
}
} else if (selectedEvent === 'Patient is Pregnant') {
pregnancyInfoSection.style.display = 'block';

// Check for teratogenic drugs
const patientId = document.getElementById('followUpPatientId').value;
const patient = patientData.find(p => p.ID === patientId);
const drugWarning = document.getElementById('pregnancyDrugWarning');
if (patient && patient.Medications) {
    const hasValproate = patient.Medications.some(med => 
        med.name && typeof med.name === 'string' && med.name.toLowerCase().includes('valproate')
    );
    if (hasValproate) {
        drugWarning.innerHTML = '<i class="fas fa-exclamation-triangle"></i> WARNING: This patient is on Sodium Valproate, which has a high risk of birth defects.';
    } else {
        drugWarning.innerHTML = '';
    }
}
}
// If "None" is selected, the form remains in the default state
});

    // Improvement status handler is defined later in the file

    // Medication changed handler
    document.getElementById('medicationChanged').addEventListener('change', function() {
        const medicationChangeSection = document.getElementById('medicationChangeSection');
        medicationChangeSection.style.display = this.checked ? 'block' : 'none';
    });

    // Setup Breakthrough Seizure Decision Support Tool
    setupBreakthroughChecklist();
    setupReferralBreakthroughChecklist(); // ADD THIS LINE

    // Age validation
    document.getElementById('patientAge').addEventListener('input', validateAgeOnset);
    document.getElementById('ageOfOnset').addEventListener('input', validateAgeOnset);

    // Procurement filter handler
    document.getElementById('procurementPhcFilter').addEventListener('change', renderProcurementForecast);
    document.getElementById('followUpTrendPhcFilter').addEventListener('change', renderFollowUpTrendChart);
    document.getElementById('treatmentSummaryPhcFilter').addEventListener('change', renderTreatmentSummaryTable);
    
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
    const updateWeightAgeCheckbox = document.getElementById('updateWeightAgeCheckbox');
    if (updateWeightAgeCheckbox) {
        updateWeightAgeCheckbox.addEventListener('change', function() {
            const fields = document.getElementById('updateWeightAgeFields');
            const updateAge = document.getElementById('updateAge');
            const updateWeight = document.getElementById('updateWeight');
            const reasonInput = document.getElementById('weightAgeUpdateReason');

            // Check if the checkbox is now checked
            if (this.checked) {
                fields.style.display = 'block';
                
                // Pre-fill with current values
                const patientId = document.getElementById('followUpPatientId')?.value;
                if (patientId && window.patientData) {
                    const patient = window.patientData.find(p => (p.ID || '').toString() === patientId);
                    if (patient) {
                        if (updateAge && patient.Age) updateAge.value = patient.Age;
                        if (updateWeight && patient.Weight) updateWeight.value = patient.Weight;
                    }
                }
            } else {
                // If the checkbox is unchecked, hide the fields and clear values
                fields.style.display = 'none';
                if (updateAge) updateAge.value = '';
                if (updateWeight) updateWeight.value = '';
                if (reasonInput) reasonInput.value = '';
            }
        });
    }

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

    // Removed legacy toggle listener here; consolidated under DOMContentLoaded with server persistence
    
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
if (feltImprovement && noImprovementQuestions) {
    feltImprovement.addEventListener('change', function() {
        if (this.value === 'No' && noImprovementQuestions) {
            noImprovementQuestions.style.display = 'grid';
        } else if (noImprovementQuestions) {
            noImprovementQuestions.style.display = 'none';
        }
    });
    
    // Trigger change event to set initial state
    feltImprovement.dispatchEvent(new Event('change'));
}

// --- DATE FORMATTING FUNCTIONS ---
function formatDateForInput(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${year}-${month}-${day}`; // yyyy-mm-dd format for input type="date"
}

function formatDateForDisplay(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Set default date inputs to today in dd/mm/yyyy
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const formattedDate = formatDateForInput(today);
    
    // Set default date for follow-up date
    const followUpDate = document.getElementById('followUpDate');
    if (followUpDate) {
        followUpDate.value = formattedDate;
        
        // Add event listener to format date on blur
        followUpDate.addEventListener('change', function(e) {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
                e.target.value = formatDateForInput(date);
            }
        });
    }
    
    // Add event listener for date of death field
    const dateOfDeath = document.getElementById('dateOfDeath');
    if (dateOfDeath) {
        dateOfDeath.addEventListener('change', function(e) {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
                e.target.value = formatDateForInput(date);
            }
        });
    }
});

// --- HELPER FUNCTIONS ---
/**
 * Analyzes patient data and displays a dosage recommendation aid.
 * @param {object} patient The patient object.
 */
function showDosageAid(patient) {
    const aidContainer = document.getElementById('dosageAidContainer');
    const aidText = document.getElementById('dosageAidText');
    const applyDosageBtn = document.getElementById('applyDosageBtn');
    if (!aidContainer || !aidText || !applyDosageBtn) return;

    // Medication protocol check
    const prescribedMeds = (patient.Medications || []).map(med => med.name.toLowerCase());
    const hasCarbamazepine = prescribedMeds.some(med => med.includes('carbamazepine'));
    const hasValproate = prescribedMeds.some(med => med.includes('valproate'));
    const hasClobazam = prescribedMeds.some(med => med.includes('clobazam'));

    let suggestedDrug = null;
    let suggestedDosage = '';
    let targetDropdownId = '';

    // Determine the next medication to add based on the protocol
    if ((hasCarbamazepine || hasValproate) && !hasClobazam) {
        suggestedDrug = 'Clobazam';
        // Dosage based on patient weight (as per clinical guidelines)
        const patientWeight = parseFloat(patient.Weight) || 0;
        suggestedDosage = patientWeight > 30 ? '10 OD' : '5 OD';
        targetDropdownId = 'referralNewClobazamDosage';
    } else if (hasClobazam) { // Assuming Levetiracetam is the next step after Clobazam
        suggestedDrug = 'Levetiracetam';
        suggestedDosage = '250 BD'; // Standard starting dose
        targetDropdownId = 'referralNewLevetiracetamDosage';
    }

    if (suggestedDrug) {
        aidText.innerHTML = `Based on the protocol, the suggested add-on therapy is <strong>${suggestedDrug}</strong> with a starting dose of <strong>${suggestedDosage}</strong>.`;
        applyDosageBtn.onclick = () => {
            const dropdown = document.getElementById(targetDropdownId);
            if (dropdown) {
                dropdown.value = suggestedDosage;
                showNotification(`${suggestedDrug} dosage applied.`, 'success');
            }
        };
        aidContainer.style.display = 'block';
    } else {
        aidContainer.style.display = 'none';
    }
}

const showLoader = (text = 'Loading...') => {
    loadingText.textContent = text;
    loadingIndicator.style.display = 'flex';
};

const hideLoader = () => {
    loadingIndicator.style.display = 'none';
};

/**
 * Safely gets the value of a DOM element by its ID.
 * Handles different input types like text, select, and checkbox.
 * @param {string} id The ID of the element.
 * @param {any} defaultValue The value to return if the element is not found.
 * @returns The element's value or the default value.
 */
const getElementValue = (id, defaultValue = '') => {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found, using default value: ${defaultValue}`);
        return defaultValue;
    }
    if (element.type === 'checkbox') {
        return element.checked;
    }
    return element.value;
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
    window.currentUserPHC = user && user.PHC ? user.PHC : null;
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';

    document.getElementById('currentUserName').textContent = currentUserName;
    document.getElementById('currentUserRole').textContent = role;
    
    // Update personalized welcome message
    updateWelcomeMessage();
    
    updateTabVisibility();
    // Wait for dashboard data to load before showing the dashboard tab and follow-up tab
    try {
        await initializeDashboard();
        // Show dashboard only after data has been loaded to avoid initializing charts with empty datasets
        showTab('dashboard', document.querySelector('.nav-tab'));
        
        const phcDropdownContainer = document.getElementById('phcFollowUpSelectContainer');
        const phcDropdown = document.getElementById('phcFollowUpSelect');
        
        // Now that data is loaded, render the follow-up list
        if ((role === 'phc' || role === 'phc_admin') && currentUserPHC) {
            // Hide dropdown, auto-render for assigned PHC
            phcDropdownContainer.style.display = 'none';
            renderFollowUpPatientList(getUserPHC());
            
            // Automatically show follow-up tab for PHC staff after data is loaded
            if (role === 'phc') {
                showTab('follow-up', document.querySelector('.nav-tab[onclick*="follow-up"]'));
            }
        } else if (role === 'phc') {
            // Show dropdown for multi-PHC user
            phcDropdownContainer.style.display = '';
            phcDropdown.value = '';
            renderFollowUpPatientList('');
            
            // Automatically show follow-up tab for PHC staff after data is loaded
            showTab('follow-up', document.querySelector('.nav-tab[onclick*="follow-up"]'));
        } else {
            // For master_admin/viewer, show dropdown
            phcDropdownContainer.style.display = '';
            phcDropdown.value = '';
            renderFollowUpPatientList('');
        }
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showNotification('Error loading dashboard data. Please refresh the page and try again.', 'error');
    }
    // Notify other parts of the app that the user is logged in
    document.dispatchEvent(new CustomEvent('userLoggedIn'));
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

// --- DASHBOARD & DATA HANDLING ---
async function initializeDashboard() {
    showLoader('Fetching all system data...');
    console.log('Initializing dashboard for user:', currentUserName, 'Role:', currentUserRole);
    
    try {
        // Build query parameters for user access filtering
        const userParams = new URLSearchParams({
            username: currentUserName,
            role: currentUserRole,
            assignedPHC: currentUserPHC || ''
        });

        console.log('Fetching data from:', SCRIPT_URL);
        console.log('User params:', userParams.toString());

        const [patientResponse, followUpResponse] = await Promise.all([
            fetch(`${SCRIPT_URL}?action=getPatients&${userParams}`).catch(err => {
                console.error('Error fetching patients:', err);
                throw new Error(`Failed to fetch patients: ${err.message}`);
            }),
            fetch(`${SCRIPT_URL}?action=getFollowUps&${userParams}`).catch(err => {
                console.error('Error fetching follow-ups:', err);
                throw new Error(`Failed to fetch follow-ups: ${err.message}`);
            })
        ]);

        if (!patientResponse || !patientResponse.ok) {
            throw new Error(`HTTP error! status: ${patientResponse?.status}`);
        }
        if (!followUpResponse || !followUpResponse.ok) {
            throw new Error(`HTTP error! status: ${followUpResponse?.status}`);
        }

        const patientResult = await patientResponse.json().catch(err => {
            console.error('Error parsing patient data:', err);
            throw new Error('Invalid patient data format from server');
        });
        
        const followUpResult = await followUpResponse.json().catch(err => {
            console.error('Error parsing follow-up data:', err);
            throw new Error('Invalid follow-up data format from server');
        });

        console.log('Patient API response:', patientResult);
        console.log('Follow-up API response:', followUpResult);

        if (patientResult.status === 'success') {
            patientData = Array.isArray(patientResult.data) 
                ? patientResult.data.map(normalizePatientFields)
                : [];
            console.log('Successfully loaded', patientData.length, 'patients');
        } else {
            console.error('Error in patient data:', patientResult.message);
            throw new Error(patientResult.message || 'Failed to load patient data');
        }

        if (followUpResult.status === 'success') {
            followUpsData = Array.isArray(followUpResult.data) ? followUpResult.data : [];
            console.log('Successfully loaded', followUpsData.length, 'follow-ups');
        } else {
            console.error('Error in follow-up data:', followUpResult.message);
            throw new Error(followUpResult.message || 'Failed to load follow-up data');
        }
        
        // Make data globally available for debugging
        window.patientData = patientData;
        window.followUpsData = followUpResult.data;
        
        // Check if any follow-ups need to be reset for the new month (only master admin)
        if (currentUserRole === 'master_admin') {
            try {
                await checkAndResetFollowUps();
            } catch (err) {
                console.error('Error in checkAndResetFollowUps:', err);
                // Don't block the UI for this non-critical operation
            }
        }
        
        // Check and mark patients as inactive based on diagnosis (only master admin)
        if (currentUserRole === 'master_admin') {
            try {
                await checkAndMarkInactiveByDiagnosis();
            } catch (err) {
                console.error('Error in checkAndMarkInactiveByDiagnosis:', err);
                // Don't block the UI for this non-critical operation
            }
        }
        
        // Now render all components
        renderAllComponents();
        
    } catch (error) {
        const errorMessage = error.message || 'Unknown error occurred';
        console.error('Dashboard initialization failed:', error);
        showNotification(`Could not load system data: ${errorMessage}`, 'error');
        // Try to reload after a delay
        setTimeout(() => {
            console.log('Attempting to reload data...');
            refreshData();
        }, 5000);
    } finally {
        hideLoader();
    }
}

function logout() {
    // Reset the viewer add patient toggle state
    allowAddPatientForViewer = false;
    setStoredToggleState(false);
    location.reload();

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

// Fetch the authoritative toggle state from server and update UI/local storage
async function syncViewerToggleFromServer() {
    try {
        const resp = await fetch(`${SCRIPT_URL}?action=getViewerAddPatientToggle`);
        const result = await resp.json();
        if (result && result.status === 'success' && result.data && typeof result.data.enabled !== 'undefined') {
            const serverEnabled = !!result.data.enabled;
            setStoredToggleState(serverEnabled);
            updateToggleButtonState();
            updateTabVisibility();
        } else {
            console.warn('Unexpected response for getViewerAddPatientToggle:', result);
        }
    } catch (err) {
        console.error('syncViewerToggleFromServer failed:', err);
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
    
    // Stock tab: visible for PHC staff and admins (master_admin, phc_admin)
    const stockTab = document.getElementById('stockTab');
    if (stockTab) {
        stockTab.style.display = isPhcOrAdmin ? 'flex' : 'none';
    }
}

function showTab(tabName, element) {
    console.log('showTab called with:', tabName);
    // Hide all tab content
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    // Show the selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        console.log('Showing tab:', tabName);
    } else {
        console.error('Tab not found:', tabName);
    }
    
    // Add active class to the clicked tab button
    if (element) {
        element.classList.add('active');
        element.setAttribute('aria-selected', 'true');
    }
    
    // Initialize charts when viewing the reports or dashboard tab
    if (tabName === 'reports' || tabName === 'dashboard') {
        initializeAllCharts();
    }
    
    // Refresh data when viewing the patients tab
    if (tabName === 'patients') {
        refreshData();
    }
    
    // Refresh stock form when viewing the stock tab
    if (tabName === 'stock') {
        renderStockForm();
    }
    
    // Update toggle button state when management tab is shown
    if (tabName === 'management' && currentUserRole === 'master_admin') {
        updateToggleButtonState();
    }
    
    // Initialize specific tab content when shown
    if (tabName === 'add-patient') {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            initializeInjuryMap();
            // Reset the form when tab is shown
            const patientForm = document.getElementById('patientForm');
            if (patientForm) {
                patientForm.reset();
                // Clear any previous form validation
                patientForm.classList.remove('was-validated');
            }
        }, 100);
    }
    
    // Initialize follow-up tab when shown
    if (tabName === 'follow-up') {
        const userPhc = getUserPHC();
        if (userPhc) {
            // If user has a specific PHC, filter by that PHC
            renderFollowUpPatientList(userPhc);
            // Hide the PHC filter since it's auto-filtered
            const phcFilter = document.getElementById('followUpPhcFilter');
            if (phcFilter) phcFilter.style.display = 'none';
        } else {
            // For master admin, show all PHCs in the filter
            populatePhcFilter('followUpPhcFilter');
            // Show the first PHC by default
            const phcFilter = document.getElementById('followUpPhcFilter');
            if (phcFilter && phcFilter.options.length > 1) {
                renderFollowUpPatientList(phcFilter.value);
            }
        }
        // Show month/year selectors for master admin
        const selectorsWrap = document.getElementById('followUpExportSelectors');
        if (selectorsWrap) {
            selectorsWrap.style.display = currentUserRole === 'master_admin' ? 'flex' : 'none';
        }
        if (currentUserRole === 'master_admin') {
            initializeFollowUpExportSelectors();
        }
    }
}

function renderStats() {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = '';
    const selectedPhc = document.getElementById('dashboardPhcFilter') ? document.getElementById('dashboardPhcFilter').value : 'All';
    
    // Update dashboard headers with PHC name
    const phcSuffix = selectedPhc === 'All' ? '' : `: ${selectedPhc}`;
    const criticalAlertsHeader = document.querySelector('#criticalAlertsSection h3');
    const dashboardHeader = document.querySelector('#dashboard h2');
    
    if (criticalAlertsHeader) {
        criticalAlertsHeader.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Critical Alerts${phcSuffix} 
            <span id="criticalAlertsCount" class="badge" style="background-color: var(--danger-color); color: white; border-radius: 10px; padding: 2px 8px; font-size: 0.8em; margin-left: 8px;">0</span>`;
    }
    
    if (dashboardHeader) {
        dashboardHeader.innerHTML = `<i class="fas fa-tachometer-alt"></i> Dashboard Overview${phcSuffix}`;
    }
    
    // Get active patients and filter by selected PHC if needed
    let filteredPatients = getActivePatients();
    if (selectedPhc && selectedPhc !== 'All') {
        filteredPatients = filteredPatients.filter(p => p.PHC && p.PHC.trim().toLowerCase() === selectedPhc.trim().toLowerCase());
    }
    
    // Get all patients for this PHC (including inactive) for stats
    let allPatientsForPhc = patientData;
    if (selectedPhc && selectedPhc !== 'All') {
        allPatientsForPhc = patientData.filter(p => p.PHC && p.PHC.trim().toLowerCase() === selectedPhc.trim().toLowerCase());
    }
    
    // Calculate timeframes for KPIs
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() - now.getDay() + 6);
    
    // Enhanced KPI calculations
    const overdueFollowUps = filteredPatients.filter(p => {
        if (!p.LastFollowUp) return false;
        const nextDueDate = new Date(p.LastFollowUp);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        return new Date() > nextDueDate && p.FollowUpStatus === 'Pending';
    }).length;

    const dueThisWeek = filteredPatients.filter(p => {
        if (!p.LastFollowUp) return false;
        const nextDueDate = new Date(p.LastFollowUp);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        return nextDueDate >= startOfWeek && nextDueDate <= endOfWeek && p.FollowUpStatus === 'Pending';
    }).length;
    
    const totalActive = filteredPatients.length;
    const inactivePatients = allPatientsForPhc.filter(p => p.PatientStatus === 'Inactive').length;
    const pendingFollowUps = filteredPatients.filter(p => p.FollowUpStatus === 'Pending').length;
    const completedThisMonth = filteredPatients.filter(p => p.FollowUpStatus && p.FollowUpStatus.includes('Completed')).length;
    const referredPatients = followUpsData.filter(f => f.ReferredToMO === 'Yes' && 
        (selectedPhc === 'All' || 
         (patientData.find(p => p.ID === f.PatientID)?.PHC || '').toLowerCase() === selectedPhc.toLowerCase())
    ).length;
    
    // Create stats array with enhanced KPIs
    const stats = [
        { 
            number: overdueFollowUps, 
            label: "Overdue Follow-ups", 
            color: '#e74c3c', 
            filter: 'overdue',
            icon: 'exclamation-triangle'
        },
        { 
            number: dueThisWeek, 
            label: "Due This Week", 
            color: '#f39c12', 
            filter: 'due',
            icon: 'calendar-week'
        },
        { 
            number: totalActive, 
            label: "Active Patients",
            icon: 'user-injured'
        },
        { 
            number: inactivePatients, 
            label: "Inactive Patients",
            color: '#7f8c8d',
            icon: 'user-slash'
        },
        { 
            number: referredPatients, 
            label: "Referred Patients",
            icon: 'user-md',
            color: '#3498db'
        },
        { 
            number: pendingFollowUps, 
            label: "Pending Follow-ups",
            icon: 'clipboard-list',
            color: '#9b59b6'
        }
    ];
    
    // Render stats cards
    stats.forEach(stat => {
        const statCard = document.createElement('div');
        statCard.className = `stat-card ${currentUserRole === 'viewer' ? 'viewer' : ''}`;
        
        // Apply special styling for cards with colors
        if (stat.color) {
            statCard.style.borderLeft = `4px solid ${stat.color}`;
            statCard.style.backgroundColor = `${stat.color}15`; // 15% opacity
            
            // Only make cards clickable if they should navigate to follow-up tab and user is not a viewer
            const followUpCards = ["Overdue Follow-ups", "Due This Week", "Pending Follow-ups"];
            if (followUpCards.includes(stat.label) && currentUserRole !== 'viewer') {
                statCard.style.cursor = 'pointer';
                statCard.onclick = () => {
                    showTab('follow-up', document.querySelector('.nav-tab[onclick*="follow-up"]'));
                    // Future: Add filtering logic for the follow-up list
                    console.log(`Filtering follow-up list by: ${stat.filter || 'all'}`);
                };
            }
        } else if (stat.label === "Inactive Patients") {
            statCard.style.borderLeft = '4px solid #7f8c8d';
            statCard.style.backgroundColor = '#f5f5f5';
        }
        
        statCard.innerHTML = `
            <div class="stat-icon">
                <i class="fas fa-${stat.icon || 'chart-bar'}"></i>
            </div>
            <div class="stat-content">
                <div class="stat-number">${stat.number}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
            ${stat.color ? '<div class="stat-arrow"><i class="fas fa-arrow-right"></i></div>' : ''}
        `;
        statsGrid.appendChild(statCard);
    });
    
    // Update master admin specific stats
    if (currentUserRole === 'master_admin') {
        document.getElementById('totalUsers').textContent = userData.length;
        document.getElementById('totalPatientsManagement').textContent = totalActive + inactivePatients;
    }
    
    // Update KPI gauges and alerts
    updateKPIGauges();
    updateCriticalAlerts();
}

// Update KPI gauges with follow-up rate and treatment adherence
function updateKPIGauges() {
    const selectedPhc = document.getElementById('dashboardPhcFilter') ? document.getElementById('dashboardPhcFilter').value : 'All';
    const activePatients = getActivePatients();
    
    // Filter by selected PHC if not 'All'
    if (selectedPhc && selectedPhc !== 'All') {
        activePatients = activePatients.filter(p => p.PHC && p.PHC.trim().toLowerCase() === selectedPhc.trim().toLowerCase());
    }
    
    // Calculate weekly timeframes
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    
    // Enhanced KPI calculations
    const overdueFollowUps = activePatients.filter(p => {
        const nextDueDate = new Date(p.LastFollowUp);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        return new Date() > nextDueDate && p.FollowUpStatus === 'Pending';
    }).length;

    const dueThisWeek = activePatients.filter(p => {
        const nextDueDate = new Date(p.LastFollowUp);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        return nextDueDate >= startOfWeek && nextDueDate <= endOfWeek && p.FollowUpStatus === 'Pending';
    }).length;
    
    const totalActive = activePatients.length;
    const completedThisMonth = activePatients.filter(p => p.FollowUpStatus && p.FollowUpStatus.includes('Completed')).length;
    const followUpRate = totalActive > 0 ? Math.round((completedThisMonth / totalActive) * 100) : 0;
    
    // Calculate treatment adherence (example: 85% of patients with good adherence)
    const patientsWithGoodAdherence = activePatients.filter(patient => {
        // This is a simplified example - you would replace with your actual adherence calculation
        return Math.random() > 0.15; // 85% adherence for demo
    }).length;
    
    const adherenceRate = activePatients.length > 0
        ? Math.min(100, Math.round((patientsWithGoodAdherence / activePatients.length) * 100))
        : 0;
    
    // Render follow-up rate gauge
    renderGauge('followUpRateGauge', followUpRate, [
        { value: 0, color: '#ff4d4d' },    // Red
        { value: 70, color: '#ffcc00' },   // Yellow
        { value: 90, color: '#00cc66' }    // Green
    ]);
    
    // Render treatment adherence gauge
    renderGauge('adherenceGauge', adherenceRate, [
        { value: 0, color: '#ff4d4d' },    // Red
        { value: 70, color: '#ffcc00' },   // Yellow
        { value: 85, color: '#00cc66' }    // Green
    ]);
    
    // Update trend indicators
    document.getElementById('followUpRateTrend').innerHTML = 
        followUpRate >= 90 ? 
        '<i class="fas fa-arrow-up" style="color: #00cc66;"></i> On target' : 
        '<i class="fas fa-arrow-down" style="color: #ff4d4d;"></i> Needs attention';
        
    document.getElementById('adherenceTrend').innerHTML = 
        adherenceRate >= 85 ? 
        '<i class="fas fa-arrow-up" style="color: #00cc66;"></i> Good' : 
        '<i class="fas fa-arrow-down" style="color: #ff4d4d;"></i> Needs improvement';
}

// Render a gauge chart
function renderGauge(containerId, value, colorStops) {
    try {
        const canvas = document.getElementById(containerId);
        
        // Check if the element exists and is a canvas
        if (!canvas || canvas.tagName !== 'CANVAS') {
            console.warn(`Cannot render gauge: Element with ID '${containerId}' is not a valid canvas`);
            return null;
        }
        
        // Get 2D context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn(`Cannot render gauge: Failed to get 2D context for '${containerId}'`);
            return null;
        }
        
        // Destroy existing chart if it exists. Prefer Chart.getChart (Chart.js v3+), fall back to stored reference
        try {
            let existingChart = null;
            if (typeof Chart.getChart === 'function') {
                existingChart = Chart.getChart(canvas);
            }
            if (!existingChart && canvas.chart) existingChart = canvas.chart;
            if (existingChart && typeof existingChart.destroy === 'function') {
                existingChart.destroy();
            }
        } catch (e) {
            console.warn('Error while trying to destroy existing chart instance for', containerId, e);
        }
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        colorStops.forEach(stop => {
            gradient.addColorStop(stop.value / 100, stop.color);
        });
        
        // Create and return the chart instance
    const chartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [value, 100 - value],
                    backgroundColor: [gradient, '#f0f0f0'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270,
                    cutout: '80%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutoutPercentage: 80,
                rotation: -90,
                circumference: 180,
                tooltips: { enabled: false },
                legend: { display: false },
                animation: { animateScale: true, animateRotate: true },
                centerText: {
                    display: true,
                    text: `${value}%`,
                    fontColor: '#333',
                    fontSize: 24,
                    fontStyle: 'bold',
                    fontFamily: 'Arial, sans-serif'
                }
            },
            plugins: [{
                beforeDraw: function(chart) {
                    const width = chart.width,
                          height = chart.height,
                          ctx = chart.ctx;
                    
                    ctx.restore();
                    const fontSize = (height / 6).toFixed(2);
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.textBaseline = 'middle';
                    
                    const text = `${value}%`,
                          textX = Math.round((width - ctx.measureText(text).width) / 2),
                          textY = height / 1.5;
                    
                    ctx.fillText(text, textX, textY);
                    ctx.save();
                }
            }]
        });

        // Store a reference on the canvas for easy lookup and compatibility
        try { canvas.chart = chartInstance; } catch (e) { /* ignore */ }
        return chartInstance;
    } catch (error) {
        console.error('Error rendering gauge chart:', error);
        return null;
    }
}

// Toggle collapsible section
function toggleCollapsible(header, content, toggleIcon) {
    const isExpanded = content.style.maxHeight && content.style.maxHeight !== '0px';
    content.style.maxHeight = isExpanded ? '0' : content.scrollHeight + 'px';
    toggleIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
}

// Initialize collapsible functionality
function initCollapsible() {
    const header = document.getElementById('criticalAlertsHeader');
    const content = document.getElementById('criticalAlertsContent');
    const toggleIcon = document.getElementById('criticalAlertsToggle');
    
    if (header && content && toggleIcon) {
        header.addEventListener('click', () => {
            toggleCollapsible(header, content, toggleIcon);
        });
        
        // Start with content collapsed
        content.style.maxHeight = '0';
    }
}

// Format date to be more readable
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleString(undefined, options);
}

// Update critical alerts section with improved details and collapsible functionality
function updateCriticalAlerts() {
    const alertsList = document.getElementById('criticalAlertsList');
    const alertsCount = document.getElementById('criticalAlertsCount');
    
    if (!alertsList || !alertsCount) return;
    
    alertsList.innerHTML = '';
    const alerts = [];
    
    // Check for patients with severe side effects
    const patientsWithSevereSideEffects = patientData.filter(patient => {
        return followUpsData.some(followUp => {
            return followUp.PatientID === patient.ID && 
                   followUp.SevereSideEffects === 'Yes' &&
                   (!followUp.SevereSideEffectsResolved || followUp.SevereSideEffectsResolved === 'No');
        });
    });
    
    patientsWithSevereSideEffects.forEach(patient => {
        const patientFollowUps = followUpsData
            .filter(f => f.PatientID === patient.ID && f.SevereSideEffects === 'Yes')
            .sort((a, b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate));
        
        const lastFollowUp = patientFollowUps[0];
        const sideEffects = lastFollowUp.SideEffects || 'Not specified';
        const followUpDate = lastFollowUp.FollowUpDate ? formatDate(lastFollowUp.FollowUpDate) : 'Unknown date';
        
        alerts.push({
            type: 'severe_side_effect',
            title: 'Severe Side Effect Detected',
            description: `${patient.Name || 'Patient'} (ID: ${patient.ID})`,
            details: `Reported side effects: ${sideEffects}`,
            phc: patient.PHC || 'Unknown PHC',
            timestamp: followUpDate,
            priority: 'high',
            patientId: patient.ID
        });
    });
    
    // Check for patients with missed follow-ups
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    patientData.forEach(patient => {
        if (!patient.ID) return;
        
        const patientFollowUps = followUpsData
            .filter(f => f.PatientID === patient.ID)
            .sort((a, b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate));
        
        const lastFollowUp = patientFollowUps[0];
        if (!lastFollowUp || !lastFollowUp.FollowUpDate) return;
        
        const lastFollowUpDate = new Date(lastFollowUp.FollowUpDate);
        const daysSinceLastFollowUp = Math.floor((new Date() - lastFollowUpDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastFollowUp > 30) {
            alerts.push({
                type: 'missed_followup',
                title: 'Missed Follow-up',
                description: `${patient.Name || 'Patient'} (ID: ${patient.ID})`,
                details: `No follow-up in the last ${daysSinceLastFollowUp} days`,
                phc: patient.PHC || 'Unknown PHC',
                timestamp: formatDate(lastFollowUp.FollowUpDate),
                priority: 'medium',
                patientId: patient.ID
            });
        }
    });
    
    // Check for patients with upcoming medication refills (within next 7 days)
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    patientData.forEach(patient => {
        if (!patient.MedicationEndDate) return;
        
        const endDate = new Date(patient.MedicationEndDate);
        if (endDate >= today && endDate <= sevenDaysFromNow) {
            const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            alerts.push({
                type: 'medication_refill',
                title: 'Medication Refill Needed',
                description: `${patient.Name || 'Patient'} (ID: ${patient.ID})`,
                details: `Medication ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
                phc: patient.PHC || 'Unknown PHC',
                timestamp: formatDate(patient.MedicationEndDate),
                priority: 'high',
                patientId: patient.ID
            });
        }
    });
    
    // Sort alerts by priority (high first) and then by timestamp (newest first)
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Update the alerts count
    alertsCount.textContent = alerts.length;
    
    // Show/hide the alerts section based on whether there are alerts
    const alertsSection = document.getElementById('criticalAlertsSection');
    if (alertsSection) {
        alertsSection.style.display = alerts.length > 0 ? 'block' : 'none';
    }
    
    // If no alerts, we're done
    if (alerts.length === 0) {
        alertsList.innerHTML = '<li class="no-alerts">No critical alerts at this time.</li>';
        return;
    }
    
    // Render the alerts
    alerts.forEach(alert => {
        const alertItem = document.createElement('li');
        alertItem.className = `alert-item ${alert.priority}`;
        alertItem.style.cursor = 'pointer';
        alertItem.onclick = () => {
            // Navigate to patient details when alert is clicked
            if (alert.patientId) {
                showTab('patients');
                // Focus on the patient in the list
                const patientSearch = document.getElementById('patientSearch');
                if (patientSearch) {
                    patientSearch.value = alert.patientId;
                    patientSearch.dispatchEvent(new Event('input'));
                }
            }
        };
        
        // Set appropriate icon based on alert type
        let iconClass = 'fa-info-circle';
        if (alert.type.includes('severe')) iconClass = 'fa-exclamation-triangle';
        else if (alert.type.includes('missed')) iconClass = 'fa-calendar-times';
        else if (alert.type.includes('refill')) iconClass = 'fa-pills';
        
        alertItem.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <div class="alert-content">
                <div class="alert-header">
                    <span class="alert-title">${alert.title}</span>
                    <span class="alert-phc">${alert.phc}</span>
                </div>
                <div class="alert-desc">${alert.description}</div>
                <div class="alert-details">${alert.details}</div>
                <div class="alert-time">${alert.timestamp}</div>
            </div>
        `;
        
        alertsList.appendChild(alertItem);
    });
    
    // Initialize collapsible functionality if not already done
    if (!window.collapsibleInitialized) {
        initCollapsible();
        window.collapsibleInitialized = true;
    }
    
    const patientsWithMissedFollowUps = getActivePatients().filter(patient => {
        const patientFollowUps = followUpsData
            .filter(f => f.PatientID === patient.ID)
            .sort((a, b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate));
        
        if (patientFollowUps.length === 0) return true;
        
        const lastFollowUp = new Date(patientFollowUps[0].FollowUpDate);
        return lastFollowUp < thirtyDaysAgo;
    });
    
    patientsWithMissedFollowUps.forEach(patient => {
        alerts.push({
            type: 'missed_followup',
            title: 'Missed Follow-up',
            description: `${patient.Name} (${patient.ID}) has not had a follow-up in over 30 days`,
            timestamp: new Date().toLocaleString(),
            priority: 'medium'
        });
    });
    
    // Add alerts to the list
    if (alerts.length > 0) {
        alerts.forEach(alert => {
            const alertItem = document.createElement('li');
            alertItem.className = 'alert-item';
            alertItem.innerHTML = `
                <i class="fas fa-${alert.priority === 'high' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                <div class="alert-content">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-desc">${alert.description}</div>
                    <div class="alert-time">${alert.timestamp}</div>
                </div>
            `;
            alertsList.appendChild(alertItem);
        });
        alertsSection.style.display = 'block';
    } else {
        alertsSection.style.display = 'none';
    }
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
                    <td>${formatDateForDisplay(new Date(f.FollowUpDate))}</td>
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

// (renderPatientList is implemented below with pagination support)

// --- CHARTING & REPORTS ---
function initializeAllCharts() {
    // Safely destroy existing charts
    Object.entries(charts).forEach(([chartId, chart]) => {
        try {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        } catch (e) {
            console.warn(`Error destroying chart ${chartId}:`, e);
        }
    });
    
    // Use getActivePatients for consistent filtering
    const activePatients = getActivePatients();
    // If we don't have any patient or follow-up data yet, skip initializing charts.
    // This avoids creating 'No Data Available' placeholders when data is still loading.
    if ((!activePatients || activePatients.length === 0) && (!followUpsData || followUpsData.length === 0)) {
        console.log('initializeAllCharts: no patient or follow-up data available yet, skipping chart initialization');
        return;
    }
    // Diagnostic: log counts and sample PHC values to help debugging
    console.log('initializeAllCharts: activePatients count =', (activePatients || []).length);
    console.log('initializeAllCharts: sample activePatients PHCs =', (activePatients || []).slice(0,5).map(p => ({ id: p.ID, phcRaw: p.PHC, phcNorm: p.PHC ? p.PHC.trim().toLowerCase() : p.PHC })));

    // Helper function to check if element exists before rendering
    const renderIfExists = (renderFn, elementId, ...args) => {
        if (document.getElementById(elementId)) {
            renderFn(...args);
        } else {
            console.log(`Skipping ${elementId} - element not found`);
        }
    };

    // Lazy-load charts using IntersectionObserver. We'll observe chart canvas elements and render
    // when they enter the viewport to reduce initial loading cost.
    const chartRenderers = [
        { id: 'phcChart', fn: () => {
            // normalize PHC values (trim and coerce)
            const phcs = (activePatients || []).map(p => (p.PHC || 'Unknown').toString().trim() || 'Unknown');
            console.log('Rendering phcChart with PHC buckets:', Array.from(new Set(phcs)).slice(0,10));
            renderPieChart('phcChart', 'PHC Distribution', phcs);
        } },
        { id: 'areaChart', fn: () => {
            const phcs = (activePatients || []).map(p => (p.PHC || 'Unknown').toString().trim() || 'Unknown');
            renderBarChart('areaChart', 'PHC Patient Distribution', phcs);
        } },
        { id: 'medicationChart', fn: () => renderPolarAreaChart('medicationChart', 'Medication Usage', activePatients.flatMap(p => Array.isArray(p.Medications) ? p.Medications.map(m => m.name.split('(')[0].trim()) : [])) },
    { id: 'residenceChart', fn: () => renderPieChart('residenceChart', 'Residence Type', activePatients.map(p => (p.ResidenceType || 'Unknown').toString().trim() || 'Unknown')) },
        { id: 'trendChart', fn: () => renderFollowUpTrendChart() },
        { id: 'seizureChart', fn: () => renderPHCFollowUpMonthlyChart() },
        { id: 'treatmentCohortChart', fn: () => renderTreatmentCohortChart() },
        { id: 'adherenceTrendChart', fn: () => renderAdherenceTrendChart() }
    ];

    // Desktop-only Draft vs Others chart (show only on wide screens)
    if (window.innerWidth >= 900 && document.getElementById('draftStatusChart')) {
        // Reveal the container
        const draftContainer = document.getElementById('draftChartContainer');
        if (draftContainer) draftContainer.style.display = '';

        // Helper to detect incomplete records (treat as draft)
        function isFormIncomplete(patient) {
            if (!patient) return false;
            const required = ['PatientName', 'FatherName', 'Age', 'Gender', 'Phone', 'PHC', 'Diagnosis'];
            // If any required field is missing or empty, consider the form incomplete
            for (const key of required) {
                const val = patient[key];
                if (val === undefined || val === null) return true;
                if (typeof val === 'string' && val.trim() === '') return true;
            }
            return false;
        }

        chartRenderers.push({ id: 'draftStatusChart', fn: () => {
            try {
                const total = (activePatients || []).length;
                const draftCount = (activePatients || []).filter(p => {
                    const status = (p.PatientStatus || p.status || '').toString().toLowerCase();
                    return status === 'draft' || status === 'incomplete' || (status === 'new' && isFormIncomplete(p));
                }).length;
                const otherCount = Math.max(0, total - draftCount);
                renderDoughnutChart('draftStatusChart', 'Form Status (Draft vs Others)', ['Draft', 'Completed/Other'], [draftCount, otherCount]);
            } catch (e) {
                console.error('Error rendering draftStatusChart', e);
            }
        }});
    }

    // Create an observer that renders charts when visible
    const chartObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const renderer = chartRenderers.find(r => r.id === el.id);
                if (renderer && typeof renderer.fn === 'function') {
                    try {
                        renderer.fn();
                    } catch (err) {
                        console.error('Error rendering chart', el.id, err);
                    }
                }
                // Stop observing after first render
                observer.unobserve(el);
            }
        });
    }, { root: null, rootMargin: '200px', threshold: 0.1 });

    // Register each chart element if present; if it's already visible render immediately
    chartRenderers.forEach(r => {
        const el = document.getElementById(r.id);
        if (!el) return;
        // If element is in viewport now, render immediately
        const rect = el.getBoundingClientRect();
        const isVisibleNow = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisibleNow) {
            try { r.fn(); } catch (err) { console.error('Error rendering chart immediately', r.id, err); }
        } else {
            chartObserver.observe(el);
        }
    });

    // Adherence and Medication Source Charts
    if (followUpsData && followUpsData.length > 0) {
        if (document.getElementById('adherenceChart')) {
            renderPieChart('adherenceChart', 'Treatment Adherence', followUpsData.map(f => (f.TreatmentAdherence || '').trim()));
        }
        if (document.getElementById('medSourceChart')) {
            renderDoughnutChart('medSourceChart', 'Medication Source', followUpsData.map(f => (f.MedicationSource || '').trim()));
        }
    }
}

// ADD these new generic, robust chart rendering functions to script.js
// --- GENERIC CHART RENDERING FUNCTION ---
/**
 * Renders a chart on a canvas element.
 * @param {string} canvasId The ID of the canvas element.
 * @param {string} chartType The type of chart to render (e.g., 'pie', 'bar', 'line').
 * @param {string} chartTitle The title of the chart.
 * @param {string[]} chartLabels The labels for the chart's data points.
 * @param {number[] | number[][]} chartData The data for the chart. Can be a single array for simple charts or an array of arrays for grouped/stacked charts.
 * @param {object} chartOptions Additional options to override the default chart configuration.
 */
/**
 * Safely destroys a chart instance if it exists
 * @param {string|Chart} chart The chart instance or canvas ID
 */
function safeDestroyChart(chart) {
    try {
        if (!chart) return;
        
        // If it's a string, get the chart instance from the charts object
        const chartInstance = typeof chart === 'string' ? charts[chart] : chart;
        
        if (chartInstance && typeof chartInstance.destroy === 'function') {
            // Set a flag to prevent reentrancy during destruction
            chartInstance._isBeingDestroyed = true;
            chartInstance.destroy();
        }
        
        // Clean up any existing chart instance
        if (typeof chart === 'string' && charts[chart]) {
            delete charts[chart];
        }
    } catch (e) {
        console.error('Error destroying chart:', e);
    }
}

function renderChart(canvasId, chartType, chartTitle, chartLabels, chartData, chartOptions = {}) {
    const chartColors = ['#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#34495e', '#1abc9c'];
    const chartElement = document.getElementById(canvasId);

    if (!chartElement) {
        // Provide a more actionable warning with stack trace to help debug caller
        const stack = (new Error()).stack;
        console.warn(`Chart element with ID '${canvasId}' not found. This typically means the canvas is not present in the DOM (maybe it's in a different tab or not yet rendered) or the chart is being requested too early. Caller stack:`, stack);
        return null;
    }

    if (!chartElement.parentElement) {
        console.warn(`Chart element with ID '${canvasId}' has no parent element`);
        return null;
    }

    // First, safely destroy any existing chart
    safeDestroyChart(canvasId);

    // Check if we have valid data to display
    const parentEl = chartElement.parentElement;
    const placeholderId = `no-data-${canvasId}`;
    let placeholderEl = parentEl.querySelector('#' + placeholderId);

    if (!chartLabels || chartLabels.length === 0) {
        // Keep the canvas in the DOM but hide it, and show a placeholder so future renders can reuse the canvas
        chartElement.style.display = 'none';
        if (!placeholderEl) {
            placeholderEl = document.createElement('div');
            placeholderEl.id = placeholderId;
            placeholderEl.style.cssText = 'text-align: center; padding: 2rem; color: var(--medium-text);';
            parentEl.appendChild(placeholderEl);
        }
        placeholderEl.innerHTML = `<h4>No Data Available for ${chartTitle || 'Chart'}</h4>`;
        placeholderEl.style.display = '';
        return null;
    }
    // Remove placeholder and show canvas when data is available
    if (placeholderEl) placeholderEl.style.display = 'none';
    chartElement.style.display = '';

    const datasets = Array.isArray(chartData[0]) ?
        chartData.map((data, index) => ({
            label: chartOptions.datasetLabels ? chartOptions.datasetLabels[index] : `Dataset ${index + 1}`,
            data: data,
            backgroundColor: chartOptions.backgroundColors ? chartOptions.backgroundColors[index] : chartColors[index % chartColors.length],
            borderColor: chartOptions.borderColors ? chartOptions.borderColors[index] : chartColors[index % chartColors.length],
            borderWidth: 1,
            tension: 0.3,
            fill: true
        })) :
        [{
            data: chartData,
            backgroundColor: chartColors
        }];

    const defaultOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right'
            },
            title: {
                display: true,
                text: chartTitle
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
        }
    };

    const finalOptions = { ...defaultOptions, ...chartOptions };

    try {
        // Create a new chart instance
        const chartInstance = new Chart(canvasId, {
            type: chartType,
            data: {
                labels: chartLabels,
                datasets: datasets
            },
            options: finalOptions
        });

        // Store the chart instance for future reference
        charts[canvasId] = chartInstance;
        return chartInstance;
    } catch (error) {
        console.error(`Error creating ${chartType} chart '${chartTitle}':`, error);
        
        // If chart creation fails, clean up and show error message
        safeDestroyChart(canvasId);
        
        // Show error message to user
        chartElement.parentElement.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #e74c3c;">
                <h4>Error Loading Chart</h4>
                <p>${chartTitle || 'The chart'} could not be displayed.</p>
                <p style="font-size: 0.8em; color: #7f8c8d;">${error.message || ''}</p>
            </div>`;
        
        return null;
    }
}

// --- REFACTORED CHART RENDERING FUNCTIONS ---
function renderPieChart(canvasId, title, dataArray) {
    if (!Array.isArray(dataArray)) {
        console.warn(`renderPieChart: expected array for ${canvasId} but got`, dataArray);
        dataArray = [];
    }
    // Normalize values: replace null/undefined/empty strings with 'Unknown' and trim strings
    const normalized = dataArray.map(val => {
        if (val === null || val === undefined) return 'Unknown';
        if (typeof val === 'string') {
            const t = val.trim();
            return t === '' ? 'Unknown' : t;
        }
        return String(val);
    });
    const counts = normalized.reduce((acc, val) => { if (val) acc[val] = (acc[val] || 0) + 1; return acc; }, {});
    const labels = Object.keys(counts);
    const values = Object.values(counts);
    if (labels.length === 0) {
        // No data - render a placeholder
        renderChart(canvasId, 'pie', title, [], []);
        return null;
    }
    renderChart(canvasId, 'pie', title, labels, values);
}

function renderDoughnutChart(canvasId, title, dataArray) {
    if (!Array.isArray(dataArray)) {
        console.warn(`renderDoughnutChart: expected array for ${canvasId} but got`, dataArray);
        dataArray = [];
    }
    const normalized = dataArray.map(val => {
        if (val === null || val === undefined) return 'Unknown';
        if (typeof val === 'string') {
            const t = val.trim();
            return t === '' ? 'Unknown' : t;
        }
        return String(val);
    });
    const counts = normalized.reduce((acc, val) => { if (val) acc[val] = (acc[val] || 0) + 1; return acc; }, {});
    const labels = Object.keys(counts);
    const values = Object.values(counts);
    if (labels.length === 0) {
        renderChart(canvasId, 'doughnut', title, [], []);
        return null;
    }
    renderChart(canvasId, 'doughnut', title, labels, values);
}

function renderBarChart(canvasId, title, dataArray) {
    if (!Array.isArray(dataArray)) {
        console.warn(`renderBarChart: expected array for ${canvasId} but got`, dataArray);
        dataArray = [];
    }
    const normalized = dataArray.map(val => {
        if (val === null || val === undefined) return 'Unknown';
        if (typeof val === 'string') {
            const t = val.trim();
            return t === '' ? 'Unknown' : t;
        }
        return String(val);
    });
    const counts = normalized.reduce((acc, val) => { if (val) acc[val] = (acc[val] || 0) + 1; return acc; }, {});
    const sortedData = Object.entries(counts).sort(([, a], [, b]) => b - a);
    renderChart(canvasId, 'bar', title, sortedData.map(item => item[0]), [sortedData.map(item => item[1])], {
        datasets: [{
            label: 'Count',
            backgroundColor: 'rgba(52, 152, 219, 0.7)'
        }],
        scales: {
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1 }
            }
        },
        plugins: {
            legend: { display: false }
        }
    });
}

function renderPolarAreaChart(canvasId, title, dataArray) {
    if (!dataArray || dataArray.length === 0) {
        console.log(`No data available for ${title}`);
        return;
    }
    const normalized = dataArray.map(val => {
        if (val === null || val === undefined) return 'Unknown';
        if (typeof val === 'string') {
            const t = val.trim();
            return t === '' ? 'Unknown' : t;
        }
        return String(val);
    });
    const counts = normalized.reduce((acc, val) => { if (val) acc[val] = (acc[val] || 0) + 1; return acc; }, {});
    renderChart(canvasId, 'polarArea', title, Object.keys(counts), Object.values(counts));
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

    renderChart('trendChart', 'line', `Follow-ups (${selectedPhc || 'All'})`, chartLabels, [chartData], {
        datasetLabels: [`Follow-ups (${selectedPhc})`],
        backgroundColors: ['rgba(52, 152, 219, 0.1)'],
        borderColors: ['#3498db'],
        tension: 0.3,
        fill: true,
        scales: {
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1 }
            }
        }
    });
}

function renderPHCFollowUpMonthlyChart() {
    // Build PHC-wise counts of follow-ups Completed vs Left (Pending) for current month
    try {
        const chartCanvasId = 'seizureChart'; // reusing the same canvas id

        // Derive unique PHC list from active patients
        const activePatients = (window.patientData || patientData || []).filter(p => (p.PatientStatus || '').toLowerCase() !== 'inactive');
        const phcSet = new Set();
        activePatients.forEach(p => { if (p.PHC) phcSet.add(p.PHC); });
        const phcLabels = Array.from(phcSet).sort();

        // For each PHC, compute completed and pending counts (this month)
        const completedCounts = [];
        const pendingCounts = [];
        phcLabels.forEach(phc => {
            const patientsInPhc = activePatients.filter(p => p.PHC === phc);
            const completed = patientsInPhc.filter(p => p.FollowUpStatus && p.FollowUpStatus.includes('Completed')).length;
            const pending = patientsInPhc.filter(p => p.FollowUpStatus === 'Pending').length;
            completedCounts.push(completed);
            pendingCounts.push(pending);
        });

        if (charts.seizureChart) charts.seizureChart.destroy();

        charts.seizureChart = new Chart(chartCanvasId, {
            type: 'bar',
            data: {
                labels: phcLabels,
                datasets: [
                    {
                        label: 'Completed',
                        data: completedCounts,
                        backgroundColor: 'rgba(46, 204, 113, 0.8)',
                        borderColor: '#2ecc71',
                        borderWidth: 1
                    },
                    {
                        label: 'Left (Pending)',
                        data: pendingCounts,
                        backgroundColor: 'rgba(243, 156, 18, 0.8)',
                        borderColor: '#f39c12',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Follow-ups by PHC'
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Error rendering PHC follow-up monthly chart:', e);
    }
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
        const forecast = {}; // { medName: { dosage: count } }
        
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
            // Skip if no medications
            if (!Array.isArray(patient.Medications) || patient.Medications.length === 0) {
                console.log('renderProcurementForecast: Patient', patient.ID, 'has no medications');
                return;
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
                
                // Initialize medication in forecast if not exists
                if (!forecast[medName]) {
                    forecast[medName] = {};
                }
                
                // Initialize or increment dosage count
                if (typeof forecast[medName][dosage] === 'undefined') {
                    forecast[medName][dosage] = 0;
                }
                
                forecast[medName][dosage]++;
            });
        });
        
        console.log('renderProcurementForecast: Processed forecast data:', forecast);
        
        // Generate HTML table
        let tableHTML = `
            <div style="overflow-x: auto; margin-top: 15px;">
                <table class="report-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Medication</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Dosage (mg)</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Patients</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Monthly Tablets</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let hasData = false;
        
        // Sort medications alphabetically
        const sortedMeds = Object.keys(forecast).sort();
        
        // Process each medication
        for (const med of sortedMeds) {
            const dosages = forecast[med];
            
            // Sort dosages numerically
            const sortedDosages = Object.keys(dosages).sort((a, b) => parseInt(a) - parseInt(b));
            
            for (const dosage of sortedDosages) {
                const patients = dosages[dosage];
                if (patients > 0) {
                    hasData = true;
                    const monthlyTablets = patients * 2 * 30; // Assuming 2 doses per day, 30 days
                    
                    tableHTML += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 12px; vertical-align: top;">${med}</td>
                            <td style="padding: 10px 12px; text-align: right; vertical-align: top;">${dosage || 'N/A'}</td>
                            <td style="padding: 10px 12px; text-align: right; vertical-align: top;">${patients}</td>
                            <td style="padding: 10px 12px; text-align: right; vertical-align: top; font-weight: 500;">${monthlyTablets.toLocaleString()}</td>
                        </tr>
                    `;
                }
            }
        }
        
        if (!hasData) {
            tableHTML += `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #666;">
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

// Populate PHC filter dropdown
function populatePhcFilter(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    // Clear existing options except the first one
    while (dropdown.options.length > 1) {
        dropdown.remove(1);
    }
    
    // Get unique PHCs from patient data
    const phcs = [...new Set(getActivePatients().map(p => p.PHC).filter(Boolean))].sort();
    
    // Add PHC options to dropdown
    phcs.forEach(phc => {
        if (phc) {
            const option = document.createElement('option');
            option.value = phc;
            option.textContent = phc;
            dropdown.appendChild(option);
        }
    });
    
    // Add change event listener if not already added
    if (dropdownId === 'followUpPhcFilter' && !dropdown.hasAttribute('data-listener-added')) {
        dropdown.addEventListener('change', (e) => {
            renderFollowUpPatientList(e.target.value);
        });
        dropdown.setAttribute('data-listener-added', 'true');
    }
}

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
                <div><strong>Last Follow-up:</strong> ${p.LastFollowUp ? formatDateForDisplay(new Date(p.LastFollowUp)) : 'N/A'}</div>
                ${isCompleted && !needsReset ? `
                    <div style="margin-top:10px; padding: 10px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid var(--success-color);">
                        <div style="font-weight:bold; color:var(--success-color); margin-bottom: 5px;">
                            <i class="fas fa-check-circle"></i> Follow-up completed${completionMonth ? ` for ${completionMonth}` : ''}
                        </div>
                        <div style="font-size: 0.9rem; color: #666;">
                            Next follow-up date: ${nextFollowUpDate ? formatDateForDisplay(new Date(nextFollowUpDate)) : 'N/A'}
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

// REPLACE the old checkIfFollowUpNeedsReset function with this new one

/**
* Checks if a patient's completed follow-up is due for a reset.
* The "due" message will now appear 5 days before the next month's anniversary
* of their last follow-up date.
* @param {object} patient The patient object.
* @returns {boolean} True if the follow-up is due for a reset/reminder.
*/
function checkIfFollowUpNeedsReset(patient) {
// Return false if there's no valid last follow-up date
if (!patient || !patient.FollowUpStatus || !patient.FollowUpStatus.includes('Completed') || !patient.LastFollowUp) {
return false;
}

// Helper: parse dates saved as dd/mm/yyyy or ISO formats
function parseFlexibleDate(val) {
if (!val) return null;
if (val instanceof Date) return isNaN(val.getTime()) ? null : new Date(val.getFullYear(), val.getMonth(), val.getDate());
const s = String(val).trim();
// dd/mm/yyyy or dd-mm-yyyy
const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
if (m) {
    let d = parseInt(m[1], 10);
    let mo = parseInt(m[2], 10) - 1;
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    const dt = new Date(y, mo, d, 0, 0, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
}
// ISO yyyy-mm-dd (optionally with time)
if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const dt = new Date(s.length === 10 ? s + 'T00:00:00' : s);
    return isNaN(dt.getTime()) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
// Fallback to native
const dt = new Date(s);
return isNaN(dt.getTime()) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

// Get the current date (normalized)
const today = new Date();
today.setHours(0, 0, 0, 0);

const lastFollowUp = parseFlexibleDate(patient.LastFollowUp);
if (!lastFollowUp) return false;

// Compute next due date = last follow-up + 1 calendar month (normalized)
const nextDueDate = new Date(lastFollowUp.getFullYear(), lastFollowUp.getMonth() + 1, lastFollowUp.getDate());
if (isNaN(nextDueDate.getTime())) return false;
nextDueDate.setHours(0, 0, 0, 0);

// Start showing 5 days before the due date, stop at the due date (inclusive)
const notificationStartDate = new Date(nextDueDate);
notificationStartDate.setDate(notificationStartDate.getDate() - 5);
notificationStartDate.setHours(0, 0, 0, 0);

return today >= notificationStartDate && today <= nextDueDate;
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
    try {
        // Always use string comparison for IDs
        patientId = patientId.toString();
        const patient = patientData.find(p => (p.ID || '').toString() === patientId);
        if (!patient) {
            showNotification('Patient not found!', 'error');
            return;
        }

        // Get the modal element
        const modal = document.getElementById('followUpModal');
        if (!modal) {
            console.error('Follow-up modal not found in the DOM');
            showNotification('Error: Follow-up form not available', 'error');
            return;
        }

        followUpStartTime = new Date(); // Start timer
        
        // Reset form and UI elements
        const form = document.getElementById('followUpForm');
        if (form) form.reset();
        
        // Explicitly reset the "significant event" dropdown to "None"
        const significantEventSelect = document.getElementById('significantEvent');
        if (significantEventSelect) {
            significantEventSelect.value = 'None';
        }
        
        const elementsToHide = [
            'noImprovementQuestions',
            'yesImprovementQuestions',
            'correctedPhoneContainer',
            'medicationChangeSection',
            'followUpSuccessMessage',
            'deceasedInfoSection',
            'pregnancyInfoSection'
        ];
        
        elementsToHide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        // Reset progressive disclosure sections
        const drugDoseSection = document.getElementById('drugDoseVerificationSection');
        if (drugDoseSection) {
            drugDoseSection.style.display = 'block';
        }
        
        const drugDoseInput = document.getElementById('drugDoseVerification');
        if (drugDoseInput) drugDoseInput.value = '';
        
        if (form) form.style.display = 'none';
    
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

    // Display current patient age and weight with fallback
    const currentAgeDisplay = document.getElementById('currentAgeDisplay');
    const currentWeightDisplay = document.getElementById('currentWeightDisplay');
    
    if (currentAgeDisplay) {
        const ageText = patient.Age ? `${patient.Age} years` : 'Not recorded';
        currentAgeDisplay.textContent = `(Current: ${ageText})`;
    }
    
    if (currentWeightDisplay) {
        const weightText = patient.Weight ? `${patient.Weight} kg` : 'Not recorded';
        currentWeightDisplay.textContent = `(Current: ${weightText})`;
    }
    
    // Set current values as placeholders for the input fields
    if (patient.Weight) {
        const weightInput = document.getElementById('updateWeight');
        if (weightInput) weightInput.placeholder = `Current: ${patient.Weight} kg`;
    }
    
    if (patient.Age) {
        const ageInput = document.getElementById('updateAge');
        if (ageInput) ageInput.placeholder = `Current: ${patient.Age} years`;
    }
    const ageDisplay = document.getElementById('currentAgeDisplay');
    const weightDisplay = document.getElementById('currentWeightDisplay');
    
    if (ageDisplay) {
        ageDisplay.textContent = patient.Age ? `${patient.Age} years` : 'Not recorded';
    }
    
    if (weightDisplay) {
        weightDisplay.textContent = patient.Weight ? `${patient.Weight} kg` : 'Not recorded';
    }
    
    // Display prescribed drugs
    displayPrescribedDrugs(patient);
    
    // Generate and display side effect checklist
    generateSideEffectChecklist(patient, 'adverseEffectsCheckboxes', 'adverseEffectOtherContainer', 'adverseEffectOther', 'followUp');
    
    // Generate patient education content
    generateAndShowEducation(patientId);
    
    // Show the form after all content is loaded
    if (form) {
        form.style.display = 'grid';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Role-based UI adjustments
    const medicationChangeToggle = document.getElementById('medicationChangeToggleContainer');
    const medicationChangeSection = document.getElementById('medicationChangeSection');
    const referToMOContainer = document.querySelector('#referToMO')?.closest('.form-group');
    const referToAIIMSContainer = document.getElementById('referToAIIMSContainer');
    
    // Ensure modal is visible
    if (modal) {
        modal.style.display = 'flex';
        // Force reflow to ensure smooth transition
        void modal.offsetHeight;
    }
    const medicationSourceContainer = document.getElementById('medicationSourceContainer');
    
    if (currentUserRole === 'phc') {
        // For CHOs, hide medicine change toggle but show the drug dose verification
        if (medicationChangeToggle) medicationChangeToggle.style.display = 'none';
        if (medicationChangeSection) medicationChangeSection.style.display = 'none';
        if (referToAIIMSContainer) referToAIIMSContainer.style.display = 'none';
        
        // Show drug dose verification section for PHC users
        const drugDoseSection = document.getElementById('drugDoseVerificationSection');
        if (drugDoseSection) {
            drugDoseSection.style.display = 'block';
        }
        
        // Show medication source field for PHC users
        if (medicationSourceContainer) {
            medicationSourceContainer.style.display = 'block';
        }
        
        // Show significant event field for PHC users
        const significantEventSection = document.querySelector('.form-group:has(#significantEvent)');
        if (significantEventSection) {
            significantEventSection.style.display = 'block';
        }
        
        // Make the referral checkbox more prominent for CHOs
        if (referToMOContainer) {
            referToMOContainer.style.background = '#fff3cd';
            referToMOContainer.style.padding = '1rem';
            referToMOContainer.style.borderRadius = 'var(--border-radius)';
            referToMOContainer.style.border = '2px solid var(--warning-color)';
            
            // Add a tooltip or info text for CHOs
            const existingInfo = referToMOContainer.querySelector('.form-text');
            if (!existingInfo) {
                const infoText = document.createElement('small');
                infoText.className = 'form-text';
                infoText.style.color = '#000000';
                infoText.textContent = 'Please refer to the doctor if the patient has not benefited from current treatment.';
                referToMOContainer.appendChild(infoText);
            }
        }
    } else {
        // For other roles (like doctors), ensure these sections are visible
        if (medicationChangeToggle) medicationChangeToggle.style.display = 'block';
        // The medicationChangeSection is hidden by default until the checkbox is ticked, so no need to show it here.
        
        // Show AIIMS referral button for doctors/admins
        if (referToAIIMSContainer) {
            referToAIIMSContainer.style.display = 'block';
            
            // Style the AIIMS referral button
            const aiimsButton = referToAIIMSContainer.querySelector('.btn-aiims-referral');
            if (aiimsButton) {
                aiimsButton.style.backgroundColor = '#d32f2f';
                aiimsButton.style.color = 'white';
                aiimsButton.style.padding = '10px 15px';
                aiimsButton.style.borderRadius = '4px';
                aiimsButton.style.display = 'flex';
                aiimsButton.style.alignItems = 'center';
                aiimsButton.style.gap = '8px';
                aiimsButton.style.marginTop = '10px';
            }
        }
        
        // Reset referral container style for other roles
        if (referToMOContainer) {
            referToMOContainer.style.background = '';
            referToMOContainer.style.padding = '';
            referToMOContainer.style.borderRadius = '';
            referToMOContainer.style.border = '';
            
            // Remove any added info text
            const existingInfo = referToMOContainer.querySelector('.form-text');
            if (existingInfo) {
                referToMOContainer.removeChild(existingInfo);
            }
        }
    }
    
    // Show the modal
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    // Scroll to top of modal
    modal.scrollTop = 0;
    } catch (error) {
        console.error('Error in openFollowUpModal:', error);
        showNotification('An error occurred while opening the follow-up form', 'error');
    }
}

function generateSideEffectChecklist(patient, containerId, otherContainerId, otherInputId, otherCheckboxPrefix) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Adverse effects checkboxes container not found');
        return;
    }
    
    container.innerHTML = ''; // Clear previous checklist
    
    if (!patient || !Array.isArray(patient.Medications) || patient.Medications.length === 0) {
        // If no medications, show a message
        container.textContent = 'No medications found for this patient.';
        return;
    }
    
    const relevantEffects = new Set();
    
    // Add side effects for each prescribed medication
    patient.Medications.forEach(med => {
        if (!med || !med.name) return;
        
        // Find the base drug name (e.g., "Sodium Valproate" from "Sodium Valproate 500mg")
        const baseDrugName = Object.keys(sideEffectData).find(key => 
            med.name.toLowerCase().includes(key.toLowerCase())
        );
        
        if (baseDrugName && sideEffectData[baseDrugName]) {
            sideEffectData[baseDrugName].forEach(effect => relevantEffects.add(effect));
        }
    });
    
    // Add general effects if no specific ones found or as a default
    const generalEffects = ["Drowsiness", "Dizziness", "Rash"];
    if (relevantEffects.size === 0) {
        generalEffects.forEach(effect => relevantEffects.add(effect));
    } else {
        // Still add general effects but mark them as such
        generalEffects.forEach(effect => relevantEffects.add(effect));
    }
    
    // Create and append checkboxes
    const sortedEffects = Array.from(relevantEffects).sort();
    sortedEffects.forEach(effect => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.style.display = 'block';
        label.style.marginBottom = '8px';
        label.innerHTML = `
            <input type="checkbox" 
                   class="adverse-effect" 
                   value="${effect}" 
                   style="margin-right: 8px;">
            ${effect}
        `;
        container.appendChild(label);
    });
    
    // Always include the "Other" option with text input
    const otherCheckboxId = `${otherCheckboxPrefix}-other-checkbox`;
    const otherItem = document.createElement('div');
    otherItem.className = 'side-effect-item';
    otherItem.innerHTML = `
        <input type="checkbox" id="${otherCheckboxId}" class="adverse-effect" value="Other">
        <label for="${otherCheckboxId}">Other (please specify)</label>
    `;
    container.appendChild(otherItem);

    // Add event listener for the "Other" checkbox
    const otherCheckbox = document.getElementById(otherCheckboxId);
    const otherContainerElement = document.getElementById(otherContainerId);

    if (otherCheckbox && otherContainerElement) {
        otherCheckbox.addEventListener('change', function() {
            otherContainerElement.style.display = this.checked ? 'block' : 'none';
            if (!this.checked) {
                const otherInputElement = document.getElementById(otherInputId);
                if (otherInputElement) {
                    otherInputElement.value = '';
                }
            }
        });
    }
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
    
    // Handle required fields for weight/age updates
    const updateWeightAgeCheckbox = document.getElementById('updateWeightAgeCheckbox');
    
    // If the update checkbox is checked, validate the fields
    if (updateWeightAgeCheckbox && updateWeightAgeCheckbox.checked) {
        const weight = document.getElementById('updateWeight')?.value;
        const age = document.getElementById('updateAge')?.value;
        const reason = document.getElementById('weightAgeUpdateReason')?.value;
        
        if (!weight || !age || !reason) {
            showNotification('Please fill in all weight/age update fields', 'error');
            return false;
        }
    }
    
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
    
    // Collect adverse effects
    const adverseEffects = [];
    document.querySelectorAll('#adverseEffectsCheckboxes .adverse-effect:checked').forEach(checkbox => {
        if (checkbox.value === 'Other') {
            const otherEffect = document.getElementById('adverseEffectOther')?.value.trim();
            if (otherEffect) adverseEffects.push(otherEffect);
        } else {
            adverseEffects.push(checkbox.value);
        }
    });

    // Collect new medications if changed
    let newMedications = [];
    if (document.getElementById('medicationChanged')?.checked) {
        const medications = [
            { name: "Carbamazepine CR", dosage: getElementValue('newCbzDosage') },
            { name: "Valproate", dosage: getElementValue('newValproateDosage') },
            { name: "Phenobarbitone", dosage: getElementValue('phenobarbitoneDosage2') },
            { name: "Clobazam", dosage: getElementValue('newClobazamDosage') },
            { name: "Folic Acid", dosage: getElementValue('newFolicAcidDosage') },
            { name: "Other Drugs", dosage: getElementValue('newOtherDrugs') }
        ].filter(med => med.dosage && med.dosage.trim() !== '');
        
        newMedications = medications;
    }

    // Stringify array fields to ensure proper serialization
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
        treatmentAdherence: getElementValue('treatmentAdherence'),
        adverseEffects: JSON.stringify(adverseEffects), // Convert array to JSON string
        medicationChanged: document.getElementById('medicationChanged')?.checked || false,
        newMedications: JSON.stringify(newMedications), // Convert array to JSON string
        newMedicalConditions: getElementValue('newMedicalConditions'),
        additionalQuestions: getElementValue('additionalQuestions'),
        durationInSeconds: durationInSeconds,
        submittedByUsername: currentUserName,
        referToMO: getElementValue('referToMO', false),
        drugDoseVerification: getElementValue('drugDoseVerification'),
        significantEvent: getElementValue('significantEvent'),
        dateOfDeath: getElementValue('dateOfDeath', ''),
        causeOfDeath: getElementValue('causeOfDeath', '')
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
        patientData[patientIndex].LastFollowUp = formatDateForDisplay(followUpData.followUpDate);
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
        // Update the follow-up streak in local storage
        const streakKey = `followUpStreak_${followUpData.patientId}`;
        const lastFollowUpDate = localStorage.getItem(streakKey);
        const currentDate = new Date().toISOString().split('T')[0];
        
        if (lastFollowUpDate) {
            const lastDate = new Date(lastFollowUpDate);
            const currentDateObj = new Date(currentDate);
            const diffTime = Math.abs(currentDateObj - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If the last follow-up was within 35 days, increment the streak
            if (diffDays <= 35) {
                const streakCount = parseInt(localStorage.getItem(`${streakKey}_count`) || '0') + 1;
                localStorage.setItem(`${streakKey}_count`, streakCount.toString());
            } else {
                // Reset streak if more than 35 days have passed
                localStorage.setItem(`${streakKey}_count`, '1');
            }
        } else {
            // First follow-up, initialize streak
            localStorage.setItem(`${streakKey}_count`, '1');
        }
        
        // Update the last follow-up date
        localStorage.setItem(streakKey, currentDate);
        
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

        /**
 * Handles the tertiary referral action from the main follow-up modal.
 */
async function handleTertiaryReferralFromFollowUp() {
    const patientId = getElementValue('followUpPatientId');
    if (!patientId) {
        showNotification('Could not identify patient. Please try again.', 'error');
        return;
    }

    if (confirm('Are you sure you want to refer this patient to AIIMS for tertiary review?')) {
        showLoading('Referring patient...');
        try {
            // Update the patient status in the backend
            await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({
                    action: 'updatePatientStatus',
                    id: patientId,
                    status: 'Referred to Tertiary'
                })
            });
            
            showNotification('Patient has been referred for tertiary review.', 'success');
            
            // Close the modal and refresh all data to reflect the change
            closeFollowUpModal();
            await refreshData();

        } catch (error) {
            showNotification('An error occurred during the referral.', 'error');
        } finally {
            hideLoading();
        }
    }
}

// --- REFERRAL FOLLOW-UP FORM SUBMISSION ---
function initializeReferralFollowUpForm() {
    const referralForm = document.getElementById('referralFollowUpForm');
    if (!referralForm) {
        console.log('Referral follow-up form not found, will retry on next page load');
        return false;
    }

    // Remove any existing event listeners to prevent duplicates
    const newForm = referralForm.cloneNode(true);
    referralForm.parentNode.replaceChild(newForm, referralForm);

    // Ensure patient ID input exists
    let patientIdInput = newForm.querySelector('#referralFollowUpPatientId');
    if (!patientIdInput) {
        patientIdInput = document.createElement('input');
        patientIdInput.type = 'hidden';
        patientIdInput.id = 'referralFollowUpPatientId';
        patientIdInput.name = 'patientId';
        newForm.prepend(patientIdInput);
    }

    // Add the new event listener
    newForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Get the patient ID from the hidden input
        const patientId = patientIdInput.value;
        if (!patientId) {
            console.error('Patient ID is missing in referral follow-up form');
            showNotification('Error: Could not identify patient. Please close and reopen the referral follow-up form.', 'error');
            return;
        }

        const form = event.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Prevent double submission
        if (submitBtn.disabled) return;

        // Show loading state
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        showLoading('Saving referral follow-up...');

        try {
            // --- 1. Comprehensive Data Collection ---
            const patientId = getElementValue('referralFollowUpPatientId');
            if (!patientId) {
                throw new Error('Patient ID is missing. Please close the modal and try again.');
            }

            // Verify patient exists
            const patient = patientData.find(p => (p.ID || '').toString() === patientId);
            if (!patient) {
                throw new Error('Patient not found in local data. Please refresh the page and try again.');
            }

            // Collect medication data
            let newMedications = [];
            const medicationChanged = getElementValue('referralConsiderMedicationChange', false);
            
            if (medicationChanged) {
                newMedications = [
                    { name: "Carbamazepine CR", dosage: getElementValue('referralNewCbzDosage', '').trim() },
                    { name: "Valproate", dosage: getElementValue('referralNewValproateDosage', '').trim() },
                    { name: "Levetiracetam", dosage: getElementValue('referralNewLevetiracetamDosage', '').trim() },
                    { name: "Phenytoin", dosage: getElementValue('referralNewPhenytoinDosage', '').trim() },
                    { name: "Clobazam", dosage: getElementValue('referralNewClobazamDosage', '').trim() },
                    { name: "Phenobarbitone", dosage: getElementValue('phenobarbitoneDosage3', '').trim() },
                    { name: "Folic Acid", dosage: getElementValue('referralNewFolicAcidDosage', '').trim() },
                    { name: "Other Drugs", dosage: getElementValue('referralNewOtherDrugs', '').trim() }
                ].filter(med => med.dosage !== ''); // Only include medications with a selected dosage
            }

            // Prepare follow-up data
            const referralFollowUpData = {
                patientId: patientId,
                choName: currentUserName || 'Doctor', // Use current user's name
                followUpDate: new Date().toISOString(),
                feltImprovement: getElementValue('referralFeltImprovement', '').trim(),
                seizureFrequency: getElementValue('referralFollowUpSeizureFrequency', '').trim(),
                medicationChanged: medicationChanged,
                newMedications: newMedications,
                additionalNotes: getElementValue('referralAdditionalNotes', '').trim(),
                submittedByUsername: currentUserName || 'system',
                referToMO: false, // This is a referral follow-up, not a new referral
                returnToPhc: getElementValue('referralClosed', false)
            };

            // Update age/weight if checkbox is checked
            if (document.getElementById('referralUpdateWeightAgeCheckbox')?.checked) {
                const newAge = getElementValue('referralUpdateAge', '').trim();
                const newWeight = getElementValue('referralUpdateWeight', '').trim();
                
                if (newAge || newWeight) {
                    // Update patient data
                    const patientIndex = patientData.findIndex(p => (p.ID || '').toString() === patientId);
                    if (patientIndex !== -1) {
                        if (newAge) patientData[patientIndex].Age = newAge;
                        if (newWeight) patientData[patientIndex].Weight = newWeight;
                    }
                }
            }

            // --- 2. Send Data to Backend ---
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'addFollowUp', 
                    data: referralFollowUpData 
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save follow-up data');
            }

            // --- 3. Provide Clear Success Feedback ---
            showNotification('Referral follow-up submitted successfully!', 'success');
            
            // --- 4. Refresh UI After a Short Delay ---
            setTimeout(async () => {
                closeReferralFollowUpModal();
                await loadPatientData();
                renderPatientList();
                renderReferredPatientList();
                renderStats();
                showTab('referred', document.querySelector('.nav-tab[onclick*="referred"]'));
            }, 1500);

        } catch (error) {
            // --- 5. Handle Errors Gracefully ---
            console.error("Referral Submission Error:", error);
            showNotification(`Submission failed: ${error.message}`, 'error');
        } finally {
            // --- 6. Always Reset the Form ---
            hideLoading();
            if (submitBtn) {
                submitBtn.innerHTML = originalBtnHtml || 'Submit';
                submitBtn.disabled = false;
            }
        }
    });
}

// --- PATIENT FORM SUBMISSION ---
let isPatientFormSubmitting = false; // Flag to prevent double submissions

// Initialize patient form submission
function initializePatientForm() {
    const patientForm = document.getElementById('patientForm');
    
    if (!patientForm) {
        console.error('Patient form not found');
        return false;
    }
    
    try {
        // Remove any existing event listeners to prevent duplicates
        const newForm = patientForm.cloneNode(true);
        patientForm.parentNode.replaceChild(newForm, patientForm);
        
        // Add submit event listener
        newForm.addEventListener('submit', handlePatientFormSubmit);

        // Add a hidden input to mark drafts (will be toggled by Save Draft)
        let draftInput = newForm.querySelector('#__isDraft');
        if (!draftInput) {
            draftInput = document.createElement('input');
            draftInput.type = 'hidden';
            draftInput.id = '__isDraft';
            draftInput.name = '__isDraft';
            draftInput.value = 'false';
            newForm.appendChild(draftInput);
        }

        // Wire Save Draft button
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', async function () {
                // Set draft flag and invoke submit handler
                draftInput.value = 'true';
                // Trigger same submit flow but indicate draft
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                newForm.dispatchEvent(submitEvent);
                // Reset draft flag after a short delay to avoid persisting it for normal submits
                setTimeout(() => { draftInput.value = 'false'; }, 500);
            });
        }
        
        // Add age validation
        const ageInput = document.getElementById('patientAge');
        const ageOfOnsetInput = document.getElementById('ageOfOnset');
        
        if (ageInput && ageOfOnsetInput) {
            ageInput.addEventListener('input', validateAgeOnset);
            ageOfOnsetInput.addEventListener('input', validateAgeOnset);
        }
        
        return true;
    } catch (error) {
        console.error('Error initializing patient form:', error);
        return false;
    }
}

// Paginated patient list with draft styling
let patientsPerPage = 12; // default page size
let currentPatientPage = 1;

function renderPatientList(searchTerm = '') {
    const container = document.getElementById('patientList');
    container.innerHTML = '';

    const lowerCaseSearch = (searchTerm || '').toLowerCase();
    const showInactive = document.getElementById('showInactivePatients') ? document.getElementById('showInactivePatients').checked : false;
    let allPatients = showInactive ? patientData : getActivePatients();

    // Apply search filtering
    const filteredPatients = allPatients.filter(p => 
        (p.PatientName && p.PatientName.toLowerCase().includes(lowerCaseSearch)) ||
        (p.PHC && p.PHC.toLowerCase().includes(lowerCaseSearch)) ||
        (p.ID && p.ID.toLowerCase().includes(lowerCaseSearch))
    );

    // Pagination calculations
    const totalPatients = filteredPatients.length;
    const totalPages = Math.max(1, Math.ceil(totalPatients / patientsPerPage));
    if (currentPatientPage > totalPages) currentPatientPage = totalPages;
    if (currentPatientPage < 1) currentPatientPage = 1;

    const startIdx = (currentPatientPage - 1) * patientsPerPage;
    const endIdx = startIdx + patientsPerPage;
    const patientsToShow = filteredPatients.slice(startIdx, endIdx);

    if (patientsToShow.length === 0) {
        container.innerHTML = '<p>No patients found.</p>';
    } else {
        patientsToShow.forEach(p => {
            const patientCard = document.createElement('div');
            patientCard.className = 'patient-card';
            patientCard.setAttribute('onclick', `showPatientDetails('${p.ID}')`);

            // Apply base styling
            const isInactive = p.PatientStatus && p.PatientStatus.toLowerCase() === 'inactive';
            if (isInactive) {
                patientCard.style.opacity = '0.7';
                patientCard.style.borderLeft = '4px solid #e74c3c';
                patientCard.style.backgroundColor = '#fdf2f2';
            }

            // Draft styling
            const isDraft = p.PatientStatus && p.PatientStatus.toLowerCase() === 'draft';
            if (isDraft) {
                // Add a semantic class so CSS rules can target drafts consistently
                patientCard.classList.add('draft');
            }

            let medsHtml = 'Not specified';
            if (Array.isArray(p.Medications) && p.Medications.length > 0) {
                medsHtml = p.Medications.map(med => `<div style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px;"><div style="font-weight: 600; color: #2196F3;">${med.name} ${med.dosage}</div></div>`).join('');
            }

            let statusControl = '';
            if (currentUserRole === 'master_admin') {
                const patientStatus = p.PatientStatus || '';
                const isActive = !patientStatus || (patientStatus && patientStatus.toLowerCase() !== 'inactive');
                const isInactiveLocal = patientStatus.toLowerCase() === 'inactive';
                statusControl = `<div style='margin-top:10px;'><label style='font-size:0.95rem;font-weight:600;'>Status: </label>
                    <select onchange="updatePatientStatus('${p.ID}', this.value)" style='margin-left:8px;padding:3px 8px;border-radius:6px;'>
                        <option value='Active' ${isActive ? 'selected' : ''}>Active</option>
                        <option value='Inactive' ${isInactiveLocal ? 'selected' : ''}>Inactive</option>
                    </select></div>`;
            }

            const inactiveIndicator = isInactive ? '<div style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 10px; display: inline-block;"><i class="fas fa-user-times"></i> Inactive</div>' : '';
            const draftBadge = isDraft ? '<div class="draft-badge"><i class="fas fa-pencil-alt"></i> Draft</div>' : '';

            patientCard.innerHTML = `
                ${draftBadge}
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

    // Pagination controls
    const paginationContainer = document.createElement('div');
    paginationContainer.style.display = 'flex';
    paginationContainer.style.justifyContent = 'center';
    paginationContainer.style.alignItems = 'center';
    paginationContainer.style.gap = '8px';
    paginationContainer.style.marginTop = '16px';

    // Page info
    const pageInfo = document.createElement('div');
    pageInfo.style.color = '#666';
    pageInfo.style.fontSize = '0.95rem';
    pageInfo.textContent = `Page ${currentPatientPage} of ${totalPages} (${totalPatients} patients)`;
    paginationContainer.appendChild(pageInfo);

    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = currentPatientPage <= 1;
    prevBtn.addEventListener('click', () => { currentPatientPage--; renderPatientList(searchTerm); });
    paginationContainer.appendChild(prevBtn);

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPatientPage >= totalPages;
    nextBtn.addEventListener('click', () => { currentPatientPage++; renderPatientList(searchTerm); });
    paginationContainer.appendChild(nextBtn);

    // Page size selector
    const pageSizeSelect = document.createElement('select');
    pageSizeSelect.style.marginLeft = '12px';
    [6, 12, 24, 48].forEach(size => {
        const opt = document.createElement('option');
        opt.value = size;
        opt.textContent = `${size}/page`;
        if (size === patientsPerPage) opt.selected = true;
        pageSizeSelect.appendChild(opt);
    });
    pageSizeSelect.addEventListener('change', () => {
        patientsPerPage = parseInt(pageSizeSelect.value, 10);
        currentPatientPage = 1;
        renderPatientList(searchTerm);
    });
    paginationContainer.appendChild(pageSizeSelect);

    container.appendChild(paginationContainer);
}

// Initialize forms when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Try to initialize forms
    const patientFormInitialized = initializePatientForm();
    const referralFormInitialized = initializeReferralFollowUpForm();
    
    // If forms weren't found, try again after a short delay
    if (!patientFormInitialized || !referralFormInitialized) {
        console.log('Some forms not found, retrying initialization...');
        setTimeout(() => {
            initializePatientForm();
            initializeReferralFollowUpForm();
        }, 500);
    }
});

// Handle patient form submission
async function handlePatientFormSubmit(e) {
    e.preventDefault();
    
    // Prevent double submission
    if (isPatientFormSubmitting) {
        return;
    }
    
    // Determine whether this submission is a draft (hidden input added during initialization)
    const formEl = e.target || this || document.getElementById('patientForm');
    const isDraftFlag = formEl && formEl.querySelector && formEl.querySelector('#__isDraft') ? formEl.querySelector('#__isDraft').value === 'true' : false;

    // Basic form validation (skip when saving a draft)
    if (!isDraftFlag) {
        const requiredFields = [
          'patientName', 'fatherName', 'patientAge', 'patientGender', 'patientPhone',
          'patientLocation', 'residenceType', 'patientAddress', 'diagnosis', 
          'epilepsyType', 'epilepsyCategory', 'ageOfOnset', 'seizureFrequency', 
          'patientWeight', 'treatmentStatus', 'patientStatus'
        ];
        const missingFields = requiredFields.filter(fieldId => {
            const field = document.getElementById(fieldId);
            return !field || !field.value.trim();
        });
        
        if (missingFields.length > 0) {
            showNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }
    }
    
    // Clinical safety validation
    const patientAge = parseInt(getElementValue('patientAge'));
    const patientGender = getElementValue('patientGender');
    
    // Check for Valproate prescription in females of reproductive age
    const valproateDosage = getElementValue('valproateDosage');
    if (valproateDosage && valproateDosage.trim() !== '' && patientGender === 'Female' && patientAge >= 15 && patientAge <= 49) {
        const folicAcidDosage = getElementValue('folicAcidDosage');
        if (!folicAcidDosage || folicAcidDosage.trim() === '') {
            const confirmed = await showConfirmationDialog(
                'Folic Acid Recommendation',
                'Valproate is prescribed for a female of reproductive age without folic acid supplementation.\n\nIt is strongly recommended to add folic acid (5 mg daily) for pregnancy prevention.\n\nDo you want to proceed without folic acid?',
                'warning',
                'Yes, Proceed Without Folic Acid',
                'No, Add Folic Acid'
            );
            
            if (!confirmed) {
                return; // Stop form submission if user cancels
            }
        }
    }
    
    // Check for Carbamazepine + Valproate combination
    const cbzDosage = getElementValue('cbzDosage');
    if (cbzDosage && cbzDosage.trim() !== '' && valproateDosage && valproateDosage.trim() !== '') {
        const confirmed = await showConfirmationDialog(
            'Medication Combination Warning',
            'You are prescribing both Valproate and Carbamazepine.\n\nConsider if both are needed for focal and generalized epilepsy. Please confirm epilepsy type from clinical history.\n\nDo you want to proceed with this combination?',
            'warning',
            'Yes, Proceed',
            'No, Cancel'
        );
        
        if (!confirmed) {
            return; // Stop form submission if user cancels
        }
    }

    // Auto-prescribe folic acid for females of reproductive age (15-49) prescribed Valproate
    if (valproateDosage && valproateDosage.trim() !== '' && patientGender === 'Female' && patientAge >= 15 && patientAge <= 49) {
        const folicAcidDosage = getElementValue('folicAcidDosage');
        if (!folicAcidDosage || folicAcidDosage.trim() === '') {
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
        // Helper function to safely get element value
        const getValue = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        
        // Collect all medication values
        const medications = [
            { name: "Carbamazepine CR", dosage: getValue('cbzDosage') },
            { name: "Valproate", dosage: getValue('valproateDosage') },
            { name: "Levetiracetam", dosage: getValue('levetiracetamDosage') },
            { name: "Phenytoin", dosage: getValue('phenytoinDosage') },
            { name: "Phenobarbitone", dosage: getValue('phenobarbitoneDosage1') },
            { name: "Clobazam", dosage: getValue('clobazamDosage') },
            { name: "Other Drugs", dosage: getValue('otherDrugs') }
        ].filter(med => med.dosage && med.dosage.trim() !== '');
        
        console.log('Collected medications:', medications); // Debug log

        const newPatient = {
            PatientName: getElementValue('patientName'),
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
            epilepsyType: getElementValue('epilepsyType'),
            epilepsyCategory: getElementValue('epilepsyCategory'),
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
            lastFollowUp: formatDateForDisplay(new Date()),
            followUpStatus: "Pending",
            adherence: "N/A"
        };

        // If this submission was flagged as a draft by setting a hidden input, honor it
        const isDraftFlag = this.querySelector('#__isDraft') ? this.querySelector('#__isDraft').value === 'true' : false;
        if (isDraftFlag) {
            // Set both keys to ensure backend (which may read either) records Draft status
            newPatient.PatientStatus = 'Draft';
            newPatient.status = 'Draft';
        }

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
        
        // Refresh data
        await refreshData();
        
        // Refresh the follow-up patient list for the selected PHC
        const phcSelect = document.getElementById('phcFollowUpSelect');
        if (phcSelect) {
            renderFollowUpPatientList(phcSelect.value);
        }
        
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
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
        hideLoader();
    }
}

// Initialize injury map functionality
function initializeInjuryMap() {
    const modal = document.getElementById('injury-modal');
    const bodyMap = document.getElementById('body-map');
    if (!bodyMap || !modal) return;
    
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
            ['active', 'follow-up', 'new', 'draft'].includes((p.PatientStatus + '').trim().toLowerCase());
        
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
            ['active', 'follow-up', 'new', 'draft'].includes((p.PatientStatus + '').trim().toLowerCase());
        
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

// Reset pagination when showInactive toggle changes
const showInactiveCheckbox = document.getElementById('showInactivePatients');
if (showInactiveCheckbox) {
    showInactiveCheckbox.addEventListener('change', () => { currentPatientPage = 1; renderPatientList(document.getElementById('patientSearch')?.value || ''); });
}

/**
* Handles referring a patient to a tertiary care center (AIIMS) for specialist review
* Updates the patient's status to 'Referred to Tertiary' and notifies the Master Admin
*/
async function referToTertiaryCenter() {
const patientId = document.getElementById('referralFollowUpPatientId')?.value;
if (!patientId) {
showNotification('No patient selected for tertiary referral.', 'error');
return;
}

const patient = patientData.find(p => String(p.ID) === String(patientId));
if (!patient) {
showNotification('Patient data not found. Please refresh and try again.', 'error');
return;
}

// Confirm with the doctor before proceeding
const confirmation = await showConfirmationDialog(
'Confirm Tertiary Referral',
`Are you sure you want to refer ${patient.PatientName} (ID: ${patient.ID}) to AIIMS for tertiary review?\n\n` +
'This will flag the patient for the Master Admin and may result in further evaluation at a tertiary care center.',
'warning',
'Yes, Refer to AIIMS',
'Cancel'
);

if (!confirmation) {
return; // User cancelled
}

showLoading('Referring patient to AIIMS...');

try {
// Submit the referral to the server
const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        action: 'updatePatientStatus',
        patientId: patientId,
        status: 'Referred to Tertiary',
        notes: 'Referred to AIIMS for specialist review',
        referredBy: currentUserName || 'System',
        timestamp: new Date().toISOString()
    })
});

if (!response.ok) {
    throw new Error('Failed to update patient status');
}

// Update local patient data
const patientIndex = patientData.findIndex(p => p.ID === patientId);
if (patientIndex !== -1) {
    patientData[patientIndex].PatientStatus = 'Referred to Tertiary';
    
    // Add to follow-ups data for tracking
    followUpsData.push({
        PatientID: patientId,
        FollowUpDate: new Date().toISOString().split('T')[0],
        Status: 'Referred to Tertiary',
        Notes: 'Referred to AIIMS for specialist review',
        SubmittedBy: currentUserName || 'System'
    });
}

// Show success message
showNotification(
    `Patient ${patient.PatientName} has been referred to AIIMS for specialist review.`,
    'success'
);

// Close the modal and refresh the UI
closeReferralFollowUpModal();
renderReferredPatientList();
renderStats();

} catch (error) {
console.error('Error referring to tertiary center:', error);
showNotification(
    'An error occurred while processing the referral. Please try again or contact support.',
    'error'
);
} finally {
hideLoading();
}
}

/**
* Shows a confirmation dialog with custom buttons and styling
* @param {string} title - The title of the dialog
* @param {string} message - The message to display
* @param {string} type - The type of dialog (e.g., 'warning', 'danger', 'info', 'success')
* @param {string} confirmText - Text for the confirm button
* @param {string} cancelText - Text for the cancel button
* @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
*/
function showConfirmationDialog(title, message, type = 'info', confirmText = 'Confirm', cancelText = 'Cancel') {
return new Promise((resolve) => {
// Create modal elements
const modal = document.createElement('div');
modal.className = 'confirmation-modal';
modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s ease;
`;

// Create dialog content
const dialog = document.createElement('div');
dialog.className = 'confirmation-dialog';
dialog.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 90%;
    width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-20px);
    transition: transform 0.3s ease;
`;

// Create title
const titleEl = document.createElement('h3');
titleEl.textContent = title;
titleEl.style.marginTop = '0';
titleEl.style.color = getTypeColor(type);

// Create message
const messageEl = document.createElement('div');
messageEl.innerHTML = message.replace(/\n/g, '<br>');
messageEl.style.margin = '15px 0';
messageEl.style.whiteSpace = 'pre-line';

// Create buttons container
const buttonsEl = document.createElement('div');
buttonsEl.style.display = 'flex';
buttonsEl.style.justifyContent = 'flex-end';
buttonsEl.style.gap = '10px';
buttonsEl.style.marginTop = '20px';

// Create cancel button
const cancelBtn = document.createElement('button');
cancelBtn.className = 'btn btn-outline-secondary';
cancelBtn.textContent = cancelText;
cancelBtn.onclick = () => {
    modal.remove();
    resolve(false);
};

// Create confirm button
const confirmBtn = document.createElement('button');
confirmBtn.className = `btn btn-${type === 'warning' || type === 'danger' ? 'danger' : 'primary'}`;
confirmBtn.textContent = confirmText;
confirmBtn.onclick = () => {
    modal.remove();
    resolve(true);
};

// Add elements to dialog
dialog.appendChild(titleEl);
dialog.appendChild(messageEl);
buttonsEl.appendChild(cancelBtn);
buttonsEl.appendChild(confirmBtn);
dialog.appendChild(buttonsEl);

// Add dialog to modal
modal.appendChild(dialog);

// Add to document
document.body.appendChild(modal);

// Trigger animation
setTimeout(() => {
    modal.style.opacity = '1';
    dialog.style.transform = 'translateY(0)';
}, 10);

// Handle escape key
const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleKeyDown);
        resolve(false);
    }
};

document.addEventListener('keydown', handleKeyDown);
});
}

/**
* Gets the appropriate color for the dialog based on type
* @param {string} type - The type of dialog
* @returns {string} The color code
*/
function getTypeColor(type) {
switch (type) {
case 'warning':
case 'danger':
    return '#dc3545'; // Red for warnings/danger
case 'success':
    return '#28a745'; // Green for success
case 'info':
default:
    return '#007bff'; // Blue for info/default
}
}

// --- RENDER REFERRED PATIENT LIST ---
function renderReferredPatientList() {
    const container = document.getElementById('referredPatientList');
    container.innerHTML = '';
    
    console.log('Rendering referred patients list...');
    
    // Get all patients with 'Referred to MO' status
    const referredPatients = patientData.filter(p => 
        p.PatientStatus === 'Referred to MO' || 
        p.PatientStatus === 'Referred to Tertiary'
    );
    
    console.log('Found referred patients:', referredPatients.length);
    
    if (referredPatients.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success" style="margin: 20px 0;">
                <i class="fas fa-check-circle"></i> No patients are currently in the referral queue.
            </div>
        `;
        return;
    }
    
    // Group by referral status
    const byStatus = referredPatients.reduce((acc, p) => {
        const status = p.PatientStatus;
        if (!acc[status]) acc[status] = [];
        acc[status].push(p);
        return acc;
    }, {});
    
    let listHtml = `
        <div class="referral-queue-header">
            <h3>Referred Patients Queue</h3>
            <p>Patients currently under specialist care or awaiting review</p>
            <div class="referral-stats">
                <span class="badge badge-primary">
                    <i class="fas fa-user-md"></i> MO Referrals: ${byStatus['Referred to MO']?.length || 0}
                </span>
                <span class="badge badge-warning">
                    <i class="fas fa-hospital"></i> Tertiary Referrals: ${byStatus['Referred to Tertiary']?.length || 0}
                </span>
                <button class="btn btn-sm btn-outline-secondary" onclick="refreshData()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        </div>
        <div class="patient-list">
    `;
    
    // Sort patients by most recent referral date
    referredPatients.sort((a, b) => {
        const dateA = new Date(getLastReferralDate(a.ID));
        const dateB = new Date(getLastReferralDate(b.ID));
        return dateB - dateA; // Most recent first
    });
    
    referredPatients.forEach(patient => {
        const referralFollowUp = getLastReferralFollowUp(patient.ID);
        const referralDate = referralFollowUp?.FollowUpDate ? new Date(referralFollowUp.FollowUpDate) : new Date();
        const daysSinceReferral = Math.floor((new Date() - referralDate) / (1000 * 60 * 60 * 24));
        const isTertiary = patient.PatientStatus === 'Referred to Tertiary';
        
        // Get the latest seizure frequency if available
        const lastFollowUp = followUpsData
            .filter(f => f.PatientID === patient.ID && f.SeizureFrequency)
            .sort((a, b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate))[0];
        
        listHtml += `
            <div class="referral-card ${isTertiary ? 'tertiary' : ''}" 
                 data-patient-id="${patient.ID}" 
                 data-status="${patient.PatientStatus}">
                
                <div class="referral-card-header">
                    <div class="patient-info">
                        <h4>${patient.PatientName || 'Unnamed Patient'}</h4>
                        <span class="patient-id">#${patient.ID}</span>
                        <span class="badge ${isTertiary ? 'badge-warning' : 'badge-primary'}">
                            ${isTertiary ? 'Tertiary Referral' : 'MO Referral'}
                        </span>
                    </div>
                    <div class="referral-meta">
                        <span class="days-ago ${daysSinceReferral > 14 ? 'urgent' : ''}" 
                              title="${formatDateForDisplay(referralDate)}">
                            <i class="fas fa-calendar-day"></i> ${daysSinceReferral} days
                            <span class="date-small">(${formatDateForDisplay(referralDate)})</span>
                        </span>
                        ${lastFollowUp?.SeizureFrequency ? `
                            <span class="seizure-freq" title="Last reported seizure frequency">
                                <i class="fas fa-brain"></i> ${lastFollowUp.SeizureFrequency}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="referral-card-body">
                    <div class="patient-details">
                        <div><i class="fas fa-hospital"></i> ${patient.PHC || 'N/A'}</div>
                        <div><i class="fas fa-user"></i> ${patient.Gender || 'N/A'}, ${patient.Age || 'N/A'} yrs</div>
                        <div><i class="fas fa-calendar-check"></i> ${formatDateForDisplay(referralDate)}</div>
                    </div>
                    
                    <div class="referral-reason">
                        <strong>Reason:</strong> ${referralFollowUp?.AdditionalQuestions || 'No specific reason provided'}
                    </div>
                    
                    ${referralFollowUp?.PrescribedDrugs ? `
                        <div class="current-meds">
                            <strong>Current Meds:</strong> ${formatMedications(referralFollowUp.PrescribedDrugs)}
                        </div>
                    ` : ''}
                </div>
                
                <div class="referral-card-actions">
                    <button class="btn btn-primary btn-sm" 
                            onclick="openReferralFollowUpModal('${patient.ID}')">
                        <i class="fas fa-notes-medical"></i> Record Follow-up
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" 
                            onclick="showPatientDetails('${patient.ID}')">
                        <i class="fas fa-user"></i> View
                    </button>
                    ${isTertiary ? `
                        <span class="tertiary-badge">
                            <i class="fas fa-hospital"></i> Tertiary Care
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    listHtml += '</div>'; // Close patient-list div
    container.innerHTML = listHtml;
    
    // Helper function to get last referral date for a patient
    function getLastReferralDate(patientId) {
        const referrals = followUpsData
            .filter(f => f.PatientID === patientId && (f.ReferredToMO === 'Yes' || f.ReferredToTertiary === 'Yes'))
            .sort((a, b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate));
        return referrals[0]?.FollowUpDate || new Date().toISOString();
    }
    
    // Helper function to get last referral follow-up
    function getLastReferralFollowUp(patientId) {
        return followUpsData
            .filter(f => f.PatientID === patientId && (f.ReferredToMO === 'Yes' || f.ReferredToTertiary === 'Yes'))
            .sort((a, b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate))[0];
    }
    
    // Helper function to format medications for display
    function formatMedications(meds) {
        if (!meds) return 'None';
        try {
            const medList = Array.isArray(meds) ? meds : JSON.parse(meds);
            return medList.map(m => `${m.medication} ${m.dosage}${m.unit || ''}`).join(', ');
        } catch (e) {
            return 'Multiple medications';
        }
    }
}

function closeReferralFollowUpModal() {
const modal = document.getElementById('referralFollowUpModal');
if (modal) {
modal.style.display = 'none';
}
// Reset the form when closing
const form = document.getElementById('referralFollowUpForm');
if (form) form.reset();
}

/**
* Opens the referral follow-up modal with patient data and referral information
* @param {string} patientId - The ID of the patient to load
*/
function openReferralFollowUpModal(patientId) {
try {
// Get DOM elements
const modal = document.getElementById('referralFollowUpModal');
const form = document.getElementById('referralFollowUpForm');
const modalTitle = document.getElementById('referralFollowUpModalTitle');
const summaryBox = document.getElementById('referralSummary');
const medicationChangeContainer = document.getElementById('referralMedicationChangeSection');
const newMedicationFields = document.getElementById('referralNewMedicationFields');
const breakthroughChecklist = document.getElementById('referralBreakthroughChecklist');

// Ensure patient ID is valid
if (!patientId) {
    console.error('No patient ID provided to openReferralFollowUpModal');
    showNotification('Error: Could not identify patient', 'error');
    return;
}

// Initialize form if not already done
if (form && !form.hasAttribute('data-initialized')) {
    initializeReferralFollowUpForm();
    form.setAttribute('data-initialized', 'true');
}

// Reset form and set patient ID
if (form) {
    form.reset();
    const patientIdInput = document.getElementById('referralFollowUpPatientId') || 
                         document.createElement('input');
    if (!patientIdInput.id) {
        patientIdInput.type = 'hidden';
        patientIdInput.id = 'referralFollowUpPatientId';
        patientIdInput.name = 'patientId';
        form.prepend(patientIdInput);
    }
    patientIdInput.value = patientId;
}

// Show loading state
if (summaryBox) summaryBox.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin me-2"></i>Loading patient data...</div>';

// Find the patient data
const patient = patientData.find(p => p && p.ID && p.ID.toString() === patientId.toString());
if (!patient) {
    console.error('Patient not found with ID:', patientId);
    showNotification('Error: Patient data could not be loaded', 'error');
    return;
}

// Update current patient information
const currentAgeDisplay = document.getElementById('referralCurrentAgeDisplay');
const currentWeightDisplay = document.getElementById('referralCurrentWeightDisplay');

if (currentAgeDisplay) {
    currentAgeDisplay.textContent = patient.Age ? `${patient.Age} years` : 'Not available';
}

if (currentWeightDisplay) {
    currentWeightDisplay.textContent = patient.Weight ? `${patient.Weight} kg` : 'Not available';
}

// Initialize medication flags
let hasCarbamazepine = false;
let hasValproate = false;
let hasClobazam = false;
let hasLevetiracetam = false;

// Check patient's current medications
if (patient.Medications && Array.isArray(patient.Medications)) {
    patient.Medications.forEach(med => {
        const medName = med && med.name ? med.name.toLowerCase() : '';
        if (medName.includes('carbamazepine')) hasCarbamazepine = true;
        if (medName.includes('valproate') || medName.includes('valproic') || medName.includes('sodium valproate')) hasValproate = true;
        if (medName.includes('clobazam')) hasClobazam = true;
        if (medName.includes('levetiracetam')) hasLevetiracetam = true;
    });
}

// Set modal title and patient ID
if (modalTitle) {
    modalTitle.textContent = `Referral Follow-up: ${patient.PatientName} (${patient.ID})`;
}

// Ensure patient ID is set in the form
const patientIdInput = document.getElementById('referralFollowUpPatientId');
if (patientIdInput) {
    patientIdInput.value = patientId;
} else {
    console.error('Could not find referralFollowUpPatientId input');
}

// Get the most recent referral data
const referralFollowUp = followUpsData
    .filter(f => f.PatientID === patient.ID && (f.ReferredToMO === 'Yes' || f.ReferredToTertiary === 'Yes'))
    .sort((a, b) => new Date(b.FollowUpDate) - new Date(a.FollowUpDate))[0];

// Populate referral summary
if (summaryBox) {
    const referredBy = referralFollowUp?.CHOName || 'N/A';
    const referralDate = referralFollowUp?.FollowUpDate ? formatDateForDisplay(new Date(referralFollowUp.FollowUpDate)) : 'N/A';
    const referralReason = referralFollowUp?.AdditionalQuestions || 'Not specified';
    const isTertiary = referralFollowUp?.ReferredToTertiary === 'Yes';
    
    summaryBox.innerHTML = `
        <div class="referral-summary-content">
            <h4>${isTertiary ? 'Tertiary' : 'MO'} Referral Details</h4>
            <div class="summary-grid mb-3">
                <div class="summary-item">
                    <i class="fas fa-user-md"></i>
                    <div>
                        <div class="summary-label">Referred By</div>
                        <div class="summary-value">${referredBy}</div>
                    </div>
                </div>
                <div class="summary-item">
                    <i class="fas fa-calendar-day"></i>
                    <div>
                        <div class="summary-label">Referral Date</div>
                        <div class="summary-value">${referralDate}</div>
                    </div>
                </div>
            </div>
            <div class="referral-reason">
                <strong>Reason for Referral:</strong>
                <p class="mb-0 mt-1">${referralReason}</p>
            </div>
        </div>
    `;
}

// Set up role-based UI elements
if (currentUserRole === 'phc') {
    // For PHC workers, simplify the interface
    if (medicationChangeContainer) medicationChangeContainer.style.display = 'none';
    if (newMedicationFields) newMedicationFields.style.display = 'none';
    if (breakthroughChecklist) breakthroughChecklist.style.display = 'none';
} else {
    // For doctors, show full functionality
    if (medicationChangeContainer) medicationChangeContainer.style.display = 'block';
    if (breakthroughChecklist) {
        breakthroughChecklist.style.display = 'block';
        setupReferralBreakthroughChecklist(patient);
    }
}

// Display current medications
displayReferralPrescribedDrugs(patient);

// Set default follow-up date to today
const today = new Date();
const dateInput = document.getElementById('referralFollowUpDate');
if (dateInput) {
    dateInput.valueAsDate = today;
    dateInput.min = today.toISOString().split('T')[0]; // Prevent past dates
}

// Show the modal with animation
if (modal) {
    modal.style.display = 'flex';
    modal.scrollTop = 0;
    
    // Add animation class
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Set up medication guidance based on current medications
if (currentUserRole !== 'phc') {
    const prescribedMeds = (patient.Medications || []).map(med => med.name?.toLowerCase() || '');
    const hasValproate = prescribedMeds.some(med => med.includes('valproate'));
    const hasClobazam = prescribedMeds.some(med => med.includes('clobazam'));
    const hasLevetiracetam = prescribedMeds.some(med => med.includes('levetiracetam'));
    
    const guidanceSection = document.getElementById('medicationGuidance');
    if (guidanceSection) {
        let guidanceHtml = '<h5 class="mt-4 mb-3">Medication Guidance</h5>';
        
        if (prescribedMeds.length === 0) {
            guidanceHtml += `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No current medications. Consider starting with first-line therapy.
                </div>
            `;
        } else if (hasValproate || hasLevetiracetam) {
            guidanceHtml += `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Patient is on appropriate first-line therapy${hasValproate && hasLevetiracetam ? ' combination' : ''}.
                </div>
            `;
        }
        
        if (hasClobazam) {
            guidanceHtml += `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Clobazam is an adjunctive therapy. Consider optimizing first-line medications first.
                </div>
            `;
        }
        
        guidanceSection.innerHTML = guidanceHtml;
    }
}

// Log for debugging
console.log(`Opened referral follow-up for patient ${patientId}`, { 
    patient, 
    referralFollowUp,
    currentUserRole
});

} catch (error) {
console.error('Error in openReferralFollowUpModal:', error);
showNotification('An error occurred while loading the referral follow-up form.', 'error');
}

// First-line drug guidance
const firstLineGuidance = document.getElementById('firstLineGuidance');
if (firstLineGuidance) {
if (!hasCarbamazepine && !hasValproate) {
    firstLineGuidance.innerHTML = '<i class="fas fa-prescription-bottle-alt"></i> Consider starting with Carbamazepine or Sodium Valproate.';
    firstLineGuidance.style.display = 'block';
} else {
    firstLineGuidance.style.display = 'none';
}
}

// Second-line (add-on) drug guidance
const secondLineGuidance = document.getElementById('secondLineGuidance');
if (secondLineGuidance) {
if ((hasCarbamazepine || hasValproate) && !hasClobazam) {
    secondLineGuidance.innerHTML = '<i class="fas fa-plus-circle"></i> If seizures are not controlled, consider adding Clobazam.';
    secondLineGuidance.style.display = 'block';
} else {
    secondLineGuidance.style.display = 'none';
}
}

// Third-line (add-on) drug guidance
const thirdLineGuidance = document.getElementById('thirdLineGuidance');
if (thirdLineGuidance) {
if (hasClobazam && !hasLevetiracetam) {
    thirdLineGuidance.innerHTML = '<i class="fas fa-plus-circle"></i> If seizures persist, consider adding Levetiracetam.';
    thirdLineGuidance.style.display = 'block';
} else {
    thirdLineGuidance.style.display = 'none';
}
}

// Tertiary Referral Guidance
const tertiaryReferralGuidance = document.getElementById('tertiaryReferralGuidance');
if (tertiaryReferralGuidance) {
if (hasCarbamazepine && hasValproate && hasClobazam && hasLevetiracetam) {
    tertiaryReferralGuidance.innerHTML = '<i class="fas fa-hospital-user"></i> Patient is on maximum standard therapy. If improvement is still not adequate, please refer to a tertiary center.';
    tertiaryReferralGuidance.style.display = 'block';
} else {
    tertiaryReferralGuidance.style.display = 'none';
}
}

// --- End of New/Modified Logic ---

// Generate dynamic content
generateAndShowEducation(patientId);
generateSideEffectChecklist(p, 'referralAdverseEffectsCheckboxes', 'referralAdverseEffectOtherContainer', 'referralAdverseEffectOther', 'referral');

// Finally, display the modal
document.getElementById('referralFollowUpModal').style.display = 'flex';

// Finally, display the modal
document.getElementById('referralFollowUpModal').style.display = 'flex';
}

/**
* Handles the "Refer to AIIMS (Master Admin Review)" button click
* Updates patient status to 'Referred to Tertiary' and refreshes the UI
*/
async function referToTertiaryCenter() {
const patientId = document.getElementById('referralFollowUpPatientId').value;
if (!patientId) {
showNotification('No patient selected.', 'error');
return;
}

if (confirm('Are you sure you want to refer this patient for tertiary review? This will flag the patient for the Master Admin and remove them from the active follow-up list.')) {
showLoader('Referring patient...');
try {
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // As per existing implementation
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'updatePatientStatus', 
            id: patientId, 
            status: 'Referred to Tertiary' // A new, specific status
        })
    });

    showNotification('Patient has been referred for tertiary review.', 'success');
    
    // Immediately update local data to reflect the change
    const patientIndex = patientData.findIndex(p => p.ID === patientId);
    if (patientIndex !== -1) {
        patientData[patientIndex].PatientStatus = 'Referred to Tertiary';
    }

    // Close the modal and refresh the list
    closeReferralFollowUpModal();
    renderReferredPatientList(); // Refresh the list to remove the patient
    renderStats(); // Update dashboard stats

} catch (error) {
    console.error('Error referring patient:', error);
    showNotification('An error occurred while referring the patient.', 'error');
} finally {
    hideLoader();
}
}
}

// Helper function to handle medication changed checkbox
function handleMedicationChanged() {
const medicationChangeSection = document.getElementById('referralMedicationChangeSection');
const checklistItems = [
document.getElementById('referralCheckCompliance'),
document.getElementById('referralCheckDiagnosis'),
document.getElementById('referralCheckComedications')
];
const newMedicationFields = document.getElementById('referralNewMedicationFields');

if (this.checked) {
// When checked, show the medication change section
if (medicationChangeSection) medicationChangeSection.style.display = 'block';
} else {
// When unchecked, hide the medication change section and reset checkboxes
if (medicationChangeSection) medicationChangeSection.style.display = 'none';
if (newMedicationFields) newMedicationFields.style.display = 'none';

// Uncheck all checklist items
checklistItems.forEach(checkbox => {
    if (checkbox) checkbox.checked = false;
});
}

if (this.checked) {
// When checked, show the medication change section
if (medicationChangeSection) medicationChangeSection.style.display = 'block';
} else {
// When unchecked, hide the medication change section and reset checkboxes
if (medicationChangeSection) medicationChangeSection.style.display = 'none';
if (newMedicationFields) newMedicationFields.style.display = 'none';

// Uncheck all checklist items
checklistItems.forEach(checkbox => {
if (checkbox) checkbox.checked = false;
});
}
}
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

    // Handles the "Change Medicine" checkbox in the referral modal
    document.getElementById('referralMedicationChanged').addEventListener('change', function() {
        const medicationChangeSection = document.getElementById('referralMedicationChangeSection');
        medicationChangeSection.style.display = this.checked ? 'block' : 'none';
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
/**
* Handles the submission of the referral follow-up form
*/
document.getElementById('referralFollowUpForm').addEventListener('submit', async function(event) {
event.preventDefault();

const form = event.target;
const submitBtn = form.querySelector('button[type="submit"]');

// Prevent double submission
if (submitBtn.disabled) return;

// Show loading state
const originalBtnHtml = submitBtn.innerHTML;
submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
submitBtn.disabled = true;

// Show loading overlay
showLoading('Saving referral follow-up...');

try {
// Validate required fields
const patientId = getElementValue('referralFollowUpPatientId');
if (!patientId) {
    throw new Error('Patient ID is missing');
}

// Get medication changes if applicable
let newMedications = [];
const medicationChanged = getElementValue('referralConsiderMedicationChange', false);

if (medicationChanged) {
    newMedications = [
        { name: "Carbamazepine CR", dosage: getElementValue('referralNewCbzDosage', '').trim() },
        { name: "Valproate", dosage: getElementValue('referralNewValproateDosage', '').trim() },
        { name: "Levetiracetam", dosage: getElementValue('referralNewLevetiracetamDosage', '').trim() },
    ].filter(med => med.dosage !== '');
    
    // Validate at least one medication has a dosage if medication was changed
    if (newMedications.length === 0) {
        throw new Error('Please enter dosages for at least one medication');
    }
}

// Prepare follow-up data
const followUpDate = new Date();
const referralFollowUpData = {
    patientId: patientId,
    choName: getElementValue('referralChoName', currentUserName || 'Doctor').trim(),
    followUpDate: followUpDate.toISOString(),
    feltImprovement: getElementValue('referralFeltImprovement', '').trim(),
    seizureFrequency: getElementValue('referralFollowUpSeizureFrequency', '').trim(),
    medicationChanged: medicationChanged,
    newMedications: newMedications,
    additionalQuestions: getElementValue('referralAdditionalQuestions', '').trim(),
    submittedByUsername: currentUserName || 'system',
    referToMO: false, // This is a referral follow-up, not a new referral
    returnToPhc: getElementValue('referralClosed', false),
    // Add metadata for better tracking
    timestamp: new Date().toISOString(),
    userRole: currentUserRole || 'unknown',
    returnToPhc: getElementValue('referralClosed', false) // Correctly gets the 'checked' status
};

// Send data to the unified 'addFollowUp' backend action
const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors', // Kept as per your original working implementation
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'addFollowUp', data: referralFollowUpData })
});

showNotification('Referral follow-up submitted successfully!', 'success');

// Use a short delay before refreshing to ensure the sheet has time to update
setTimeout(async () => {
    closeReferralFollowUpModal();
    await refreshData();
    showTab('referred', document.querySelector('.nav-tab[onclick*="referred"]'));
    hideLoading();
    submitBtn.innerHTML = originalBtnHtml;
    submitBtn.disabled = false;
}, 1500);

} catch (error) {
console.error("Referral Submission Error:", error);
showNotification(`Submission failed: ${error.message}`, 'error');
submitBtn.innerHTML = originalBtnHtml;
submitBtn.disabled = false;
hideLoading();
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



// --- STOCK MANAGEMENT FUNCTIONS ---
/**
 * Renders the stock management form for the user's PHC.
 * It fetches current stock levels and dynamically creates input fields for each medicine.
 */
async function renderStockForm() {
    const stockForm = document.getElementById('stockForm');
    const stockPhcName = document.getElementById('stockPhcName');
    const selectorContainer = document.getElementById('stockPhcSelectorContainer');
    const selector = document.getElementById('stockPhcSelector');
    if (!stockForm || !stockPhcName) return;

    // Determine which PHC to operate on
    let targetPhc = getUserPHC();

    if (currentUserRole === 'master_admin') {
        // Show PHC selector and ensure it's populated
        if (selectorContainer) selectorContainer.style.display = '';
        // Preserve current selection and detect if population is needed
        const previousSelection = selector ? selector.value : '';
        const needsPopulation = !selector || selector.options.length <= 1; // only placeholder present
        if (needsPopulation) {
            try { await fetchPHCNames(); } catch (e) { console.warn('PHC names fetch failed for stock selector', e); }
        }
        // Restore previous selection if it still exists
        if (selector && previousSelection) {
            const optionExists = Array.from(selector.options).some(o => o.value === previousSelection);
            if (optionExists) selector.value = previousSelection;
        }

        if (selector && selector.value) {
            targetPhc = selector.value;
        }

        if (!targetPhc) {
            stockPhcName.textContent = '—';
            stockForm.innerHTML = `
                <div class="alert alert-info" style="display:block;">
                    <i class="fas fa-info-circle"></i>
                    Please select a PHC above to manage stock.
                </div>`;
            return;
        }
    } else {
        // Hide PHC selector for non-master roles
        if (selectorContainer) selectorContainer.style.display = 'none';

        if (!targetPhc) {
            stockForm.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    You are not assigned to a specific PHC. Stock management is unavailable.
                </div>`;
            return;
        }
    }

    stockPhcName.textContent = targetPhc;
    showLoader('Loading stock levels...');

    try {
        // Fetch current stock for the selected/assigned PHC
        const response = await fetch(`${SCRIPT_URL}?action=getPHCStock&phcName=${encodeURIComponent(targetPhc)}`);
        const result = await response.json();

        if (result.status === 'success') {
            // Create a map of medicine to current stock
            const stockMap = {};
            result.data.forEach(item => {
                if (item.Medicine) {
                    stockMap[item.Medicine] = item.CurrentStock;
                }
            });

            // Generate form fields for each medicine
            let formHtml = `
                <div class="form-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
            `;

            const sortedMeds = [...MEDICINE_LIST].sort();

            sortedMeds.forEach(medicine => {
                const currentStock = stockMap[medicine] !== undefined ? stockMap[medicine] : 0;
                const fieldId = `stock_${medicine.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

                formHtml += `
                    <div class="form-group">
                        <label for="${fieldId}">
                            <div class="label-line">
                                <i class="fas fa-pills"></i>
                                <span>${medicine}</span>
                            </div>
                        </label>
                        <div class="input-group">
                            <input type="number"
                                   id="${fieldId}"
                                   name="${medicine.replace(/"/g, '&quot;')}"
                                   value="${currentStock}"
                                   class="form-control"
                                   min="0"
                                   step="1"
                                   required>
                            <div class="input-group-append">
                                <span class="input-group-text">units</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            // Add submit and refresh
            formHtml += `
                </div>
                <div class="form-group" style="margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Update Stock Levels
                    </button>
                    <button type="button" class="btn btn-outline-secondary ml-2" onclick="renderStockForm()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            `;

            stockForm.innerHTML = formHtml;
            initializeTooltips();
        } else {
            throw new Error(result.message || 'Failed to load stock data');
        }
    } catch (error) {
        stockForm.innerHTML = `
            <div class="alert alert-danger" style="display:block;">
                <i class="fas fa-exclamation-circle"></i>
                <strong>Error:</strong> Could not load stock levels. Please try again later.
                <div class="mt-2 text-muted small">${escapeHtml(error.message)}</div>
            </div>
            <div class="mt-3">
                <button class="btn btn-outline-primary" onclick="renderStockForm()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>`;
        console.error('Error fetching stock:', error);
    } finally {
        hideLoader();
    }
}

// Initialize tooltips for better UX
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// --- AIIMS Referral Functions ---
/**
 * Toggles the visibility of the AIIMS referral notes container
 */
function toggleTertiaryReferralContainer() {
    const container = document.getElementById('tertiaryReferralContainer');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Handles the AIIMS referral button click in the referral follow-up form
 */
function handleTertiaryReferralFromFollowUp() {
    // Toggle the AIIMS referral container
    toggleTertiaryReferralContainer();
    
    // Uncheck the Medical Officer referral checkbox
    const moCheckbox = document.getElementById('referralReferToMO');
    if (moCheckbox) {
        moCheckbox.checked = false;
    }
}

/**
 * Submits the AIIMS referral from the follow-up form
 */
async function submitTertiaryReferral() {
    const notes = document.getElementById('tertiaryReferralNotes')?.value.trim() || '';
    const patientId = document.getElementById('referralFollowUpPatientId')?.value;
    
    if (!patientId) {
        showNotification('Error: Patient ID is missing', 'error');
        return;
    }
    
    try {
        // Show loading state
        showLoading('Submitting AIIMS referral...');
        
        // Get the patient data
        const patient = patientData.find(p => (p.ID || '').toString() === patientId);
        if (!patient) {
            throw new Error('Patient not found');
        }
        
        // Submit the referral
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'referToTertiary',
                data: {
                    patientId: patientId,
                    referredBy: currentUserName || 'Doctor',
                    notes: notes,
                    timestamp: new Date().toISOString()
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit AIIMS referral');
        }
        
        // Show success message
        showNotification('Patient successfully referred to AIIMS', 'success');
        
        // Close the referral follow-up modal and refresh the UI
        setTimeout(() => {
            closeReferralFollowUpModal();
            renderReferredPatientList();
            renderPatientList();
            renderStats();
        }, 1500);
        
    } catch (error) {
        console.error('Error submitting AIIMS referral:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// --- Consolidated logic for the referral follow-up medication change workflow ---
const considerChangeCheckbox = document.getElementById('referralConsiderMedicationChange');
const breakthroughChecklist = document.getElementById('referralBreakthroughChecklist');

// Function to toggle the Breakthrough Seizure Decision Support section
function toggleBreakthroughChecklist() {
    if (considerChangeCheckbox && breakthroughChecklist) {
        breakthroughChecklist.style.display = considerChangeCheckbox.checked ? 'block' : 'none';
    }
}

// Add event listener for the checkbox
if (considerChangeCheckbox && breakthroughChecklist) {
    // Set initial state (hidden by default)
    breakthroughChecklist.style.display = 'none';
    
    // Add change event listener
    considerChangeCheckbox.addEventListener('change', function() {
        const section = document.getElementById('referralMedicationChangeSection');
        const checklistItems = [
            document.getElementById('referralCheckCompliance'),
            document.getElementById('referralCheckDiagnosis'),
            document.getElementById('referralCheckComedications')
        ];

        if (this.checked) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
            // Also reset the checklist if the main checkbox is unchecked
            checklistItems.forEach(checkbox => { if (checkbox) checkbox.checked = false; });
            document.getElementById('referralNewMedicationFields').style.display = 'none';
            document.getElementById('dosageAidContainer').style.display = 'none';
        }
    });
}
// --- End of addition ---

// --- FOLLOW-UP CSV EXPORT ---
function exportMonthlyFollowUpsCSV() {
    try {
        // Determine month boundaries
        let month, year;
        if (currentUserRole === 'master_admin') {
            const monthSel = document.getElementById('followUpExportMonth');
            const yearSel = document.getElementById('followUpExportYear');
            month = monthSel && monthSel.value !== '' ? parseInt(monthSel.value, 10) : new Date().getMonth();
            year = yearSel && yearSel.value !== '' ? parseInt(yearSel.value, 10) : new Date().getFullYear();
        } else {
            const now = new Date();
            month = now.getMonth();
            year = now.getFullYear();
        }
        const start = new Date(year, month, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

        // Determine scope by role
        const isMaster = currentUserRole === 'master_admin';
        const userPhc = getUserPHC();

        // Build a quick patient map for name/phone lookup
        const patientMap = new Map();
        (patientData || []).forEach(p => {
            patientMap.set(String(p.ID), p);
        });

        // Filter follow-ups by month and PHC access
        const rows = [];
        (followUpsData || []).forEach(f => {
            if (!f.FollowUpDate) return;
            const d = new Date(f.FollowUpDate);
            if (isNaN(d)) return;
            if (d < start || d > end) return; // outside current month

            // Enforce PHC scope for non-master roles
            if (!isMaster) {
                const patient = patientMap.get(String(f.PatientID));
                if (!patient) return;
                const pPhc = (patient.PHC || '').trim().toLowerCase();
                if (!userPhc || pPhc !== userPhc.trim().toLowerCase()) return;
            }

            // Enrich with patient details
            const patient = patientMap.get(String(f.PatientID)) || {};
            const name = patient.PatientName || patient.Name || '';
            const phone = patient.Phone || patient.Contact || '';
            const phc = patient.PHC || '';

            rows.push({
                PHC: phc,
                PatientID: f.PatientID || '',
                PatientName: name,
                Phone: phone,
                FollowUpDate: formatDateForDisplay(d),
                SubmittedBy: f.SubmittedBy || '',
                SeizureFrequency: f.SeizureFrequency || '',
                TreatmentAdherence: f.TreatmentAdherence || '',
                ReferredToMO: f.ReferredToMO || '',
                ReferralClosed: f.ReferralClosed || '',
                Notes: f.AdditionalQuestions || ''
            });
        });

        if (rows.length === 0) {
            showNotification('No follow-ups found for this month with your access.', 'info');
            return;
        }

        // Convert to CSV
        const headers = Object.keys(rows[0]);
        const csv = [headers.join(',')]
            .concat(rows.map(r => headers.map(h => csvEscape(String(r[h] ?? ''))).join(',')))
            .join('\n');

        // Filename
        const yyyy = year;
        const mm = String(month + 1).padStart(2, '0');
        const scope = isMaster ? 'AllPHCs' : (userPhc ? userPhc.replace(/[^A-Za-z0-9_-]/g, '_') : 'PHC');
        const filename = `FollowUps_${scope}_${yyyy}-${mm}.csv`;

        // Trigger download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('CSV downloaded successfully.', 'success');
    } catch (err) {
        console.error('Error exporting follow-ups CSV:', err);
        showNotification('Error exporting CSV. Please try again.', 'error');
    }
}

// Utility: CSV escape
function csvEscape(value) {
    if (value == null) return '';
    const needsQuotes = /[",\n]/.test(value);
    let v = value.replace(/"/g, '""');
    return needsQuotes ? '"' + v + '"' : v;
}

// Wire up button on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('downloadFollowUpsCsvBtn');
    if (btn) {
        btn.addEventListener('click', exportMonthlyFollowUpsCSV);
    }
    // Wire viewer Add Patient access toggle (admin control)
    const toggleBtn = document.getElementById('toggleVisitorAddPatientBtn');
    if (toggleBtn) {
        // Ensure button reflects current stored state on load
        try { updateToggleButtonState(); } catch (e) { console.warn('toggle state init failed', e); }
        toggleBtn.addEventListener('click', function() {
            if (currentUserRole !== 'master_admin') {
                showNotification('Only master administrators can change this setting.', 'error');
                return;
            }
            // Flip and persist state
            const current = getStoredToggleState();
            const next = !current;
            // Optimistically update UI
            setStoredToggleState(next);
            updateToggleButtonState();
            updateTabVisibility();
            // Persist server-side
            fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'setViewerAddPatientToggle', enabled: next })
            }).then(r => r.json()).then(result => {
                if (result.status !== 'success') throw new Error(result.message || 'Server rejected setting');
                showNotification(next ? 'Viewer access to Add Patient tab ENABLED.' : 'Viewer access to Add Patient tab DISABLED.', 'success');
            }).catch(err => {
                console.error('Failed to persist viewer toggle:', err);
                // Revert UI and local state
                setStoredToggleState(current);
                updateToggleButtonState();
                updateTabVisibility();
                showNotification('Failed to save setting to server. No changes applied.', 'error');
            });
        });
    }
    // Sync toggle state from server for all roles (so viewer sees correct tabs)
    syncViewerToggleFromServer();
    // Advanced Analytics modal wiring
    const openAA = document.getElementById('openAdvancedAnalyticsBtn');
    const closeAA = document.getElementById('advancedAnalyticsClose');
    const modalAA = document.getElementById('advancedAnalyticsModal');
    if (openAA && modalAA) {
        openAA.addEventListener('click', async () => {
            await openAdvancedAnalyticsModal();
        });
    }
    if (closeAA && modalAA) {
        closeAA.addEventListener('click', () => closeAdvancedAnalyticsModal());
    }
    if (modalAA) {
        modalAA.addEventListener('mousedown', function(e) {
            if (e.target === modalAA) closeAdvancedAnalyticsModal();
        });
    }
    
    // Add event listener for PHC filter in advanced analytics
    const phcFilter = document.getElementById('advancedPhcFilter');
    if (phcFilter) {
        phcFilter.addEventListener('change', function() {
            renderAdvancedAnalytics(this.value || 'All');
        });
    }
});

// Add event listener for stock form submission
document.addEventListener('DOMContentLoaded', function() {
    const stockForm = document.getElementById('stockForm');
    if (stockForm) {
        stockForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Determine target PHC: master_admin can select
            const selector = document.getElementById('stockPhcSelector');
            const isMaster = currentUserRole === 'master_admin';
            const userPhc = getUserPHC();
            const targetPhc = isMaster && selector && selector.value ? selector.value : userPhc;

            if (!targetPhc) {
                showNotification('Cannot update stock without a selected/assigned PHC.', 'error');
                return;
            }

            // Disable submit button to prevent double submission
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';

            try {
                const formData = new FormData(this);
                const stockData = [];
                const submissionId = 'SUB-' + Date.now();
                const submittedBy = currentUserName || 'Unknown';

                // Collect all form data (allow 0 values)
                for (const [medicine, stock] of formData.entries()) {
                    const stockValue = parseInt(stock) || 0;
                    stockData.push({
                        phc: targetPhc,
                        medicine: medicine,
                        stock: stockValue,
                        submissionId: submissionId,
                        submittedBy: submittedBy
                    });
                }

                showLoader('Updating stock levels...');

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    // DO NOT set headers here; keep it a simple request
                    body: JSON.stringify({
                      action: 'updatePHCStock',
                      data: stockData
                    }),
                  });

                const result = await response.json();
                if (result.status === 'success') {
                    showNotification('Stock levels updated successfully!', 'success');
                    // Refresh the stock form to show updated values
                    renderStockForm();
                    // Switch to patients tab (kept per current behavior)
                    const patientsTab = document.querySelector('.nav-tab[onclick*="patients"]');
                    if (patientsTab) patientsTab.click();
                    // Hide loader after a short delay to ensure smooth transition
                    setTimeout(() => hideLoader(), 500);
                } else {
                    throw new Error(result.message || 'Failed to update stock');
                }
            } catch (error) {
                console.error('Error updating stock:', error);
                showNotification(`Error updating stock: ${error.message}`, 'error', { autoClose: 5000 });
                // Re-enable the submit button on error
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            } finally {
                hideLoader();
            }
        });
    }
});

// Re-render stock form when master admin changes PHC selection while on the Stock tab
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'stockPhcSelector') {
        const stockSection = document.getElementById('stock');
        if (stockSection && stockSection.style.display !== 'none') {
            renderStockForm();
        }
    }
});

// --- Advanced Analytics Modal Logic ---
let advCharts = { stock: null, events: null, epilepsy: null, injury: null, addictions: null };
let isModalOpen = false;
let resizeObserver = null;

async function openAdvancedAnalyticsModal() {
    const modal = document.getElementById('advancedAnalyticsModal');
    if (!modal) return;
    
    // Set flag to indicate modal is opening
    isModalOpen = true;
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Initialize resize observer if not already done
    if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(debounce(() => {
            if (isModalOpen) {
                Object.values(advCharts).forEach(chart => {
                    if (chart && typeof chart.resize === 'function') {
                        chart.resize();
                    }
                });
            }
        }, 100));
        
        // Observe the modal for size changes
        resizeObserver.observe(modal);
    }
    
    // Populate PHC filter
    const phcSel = document.getElementById('advancedPhcFilter');
    if (phcSel && phcSel.options.length <= 1) {
        try {
            await fetchPHCNames();
            // fetchPHCNames calls populatePHCDropdowns for standard IDs; populate manually here
            const phcNames = JSON.parse(localStorage.getItem('phcNames') || '[]');
            phcNames.forEach(name => {
                const opt = new Option(name, name);
                phcSel.appendChild(opt);
            });
        } catch (e) {
            console.warn('Advanced Analytics PHC population failed', e);
        }
    }
    
    // Force a small delay to ensure the modal is fully rendered
    setTimeout(async () => {
        await renderAdvancedAnalytics(phcSel && phcSel.value ? phcSel.value : 'All');
    }, 100);
}

function closeAdvancedAnalyticsModal() {
    const modal = document.getElementById('advancedAnalyticsModal');
    if (!modal) return;
    
    // Set flag to indicate modal is closing
    isModalOpen = false;
    
    // Clean up all chart instances
    Object.entries(advCharts).forEach(([key, chart]) => {
        if (chart && typeof chart.destroy === 'function') {
            try {
                const canvas = document.getElementById(`adv${key.charAt(0).toUpperCase() + key.slice(1)}Chart`);
                if (canvas) {
                    // Clear the canvas
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                    // Reset canvas dimensions
                    canvas.width = canvas.offsetWidth;
                    canvas.height = 300; // Set a fixed height
                }
                chart.destroy();
            } catch (e) {
                console.error(`Error destroying ${key} chart:`, e);
            }
        }
    });
    
    // Reset the chart references
    advCharts = { stock: null, events: null, epilepsy: null, injury: null, addictions: null };
    
    // Hide the modal
    modal.style.display = 'none';
    
    // Force a reflow to ensure the DOM updates
    void modal.offsetHeight;
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function renderAdvancedAnalytics(targetPhc = 'All') {
    if (!isModalOpen) return; // Don't render if modal is closed
    
    try {
        // Render charts one by one with a small delay between them
        await renderAdvStockChart(targetPhc);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isModalOpen) return;
        renderAdvEventsChart(targetPhc);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isModalOpen) return;
        renderAdvEpilepsyChart(targetPhc);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isModalOpen) return;
        renderAdvInjuryChart(targetPhc);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isModalOpen) return;
        renderAdvAddictionsChart(targetPhc);
    } catch (error) {
        console.error('Error rendering advanced analytics:', error);
    }
}

async function renderAdvStockChart(targetPhc) {
    const ctx = document.getElementById('advStockChart');
    if (!ctx) return;
    // Load data: try consolidated endpoint, else per-PHC
    let stockMap = {};
    try {
        if (targetPhc === 'All') {
            // Try new consolidated endpoint first
            let resp = await fetch(`${SCRIPT_URL}?action=getAllPHCStock`);
            let result = await resp.json();
            if (result.status === 'success' && Array.isArray(result.data)) {
                result.data.forEach(row => {
                    const med = row.Medicine || row.medicine;
                    const qty = parseInt(row.CurrentStock ?? row.stock ?? 0) || 0;
                    if (!med) return;
                    stockMap[med] = (stockMap[med] || 0) + qty;
                });
            } else {
                // Fallback: sum across PHCs
                const phcNames = JSON.parse(localStorage.getItem('phcNames') || '[]');
                for (const phc of phcNames) {
                    const r = await fetch(`${SCRIPT_URL}?action=getPHCStock&phcName=${encodeURIComponent(phc)}`);
                    const res = await r.json();
                    if (res.status === 'success' && Array.isArray(res.data)) {
                        res.data.forEach(item => {
                            const med = item.Medicine;
                            const qty = parseInt(item.CurrentStock ?? 0) || 0;
                            if (!med) return;
                            stockMap[med] = (stockMap[med] || 0) + qty;
                        });
                    }
                }
            }
        } else {
            const r = await fetch(`${SCRIPT_URL}?action=getPHCStock&phcName=${encodeURIComponent(targetPhc)}`);
            const res = await r.json();
            if (res.status === 'success' && Array.isArray(res.data)) {
                res.data.forEach(item => {
                    const med = item.Medicine;
                    const qty = parseInt(item.CurrentStock ?? 0) || 0;
                    if (!med) return;
                    stockMap[med] = (stockMap[med] || 0) + qty;
                });
            }
        }
    } catch (e) {
        console.warn('Stock chart load failed', e);
    }

    const labels = Object.keys(stockMap);
    const data = labels.map(k => stockMap[k]);

    // Destroy existing chart if it exists
    if (advCharts.stock && typeof advCharts.stock.destroy === 'function') {
        advCharts.stock.destroy();
    }
    
    // Don't render if no data or Chart.js not loaded
    if (!window.Chart || labels.length === 0) return;
    
    // Set fixed dimensions for the canvas
    const container = ctx.parentElement;
    if (container) {
        container.style.position = 'relative';
        container.style.height = '300px'; // Fixed height
        container.style.width = '100%';
    }
    
    // Create new chart instance
    try {
        advCharts.stock = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{ 
                    label: 'Units', 
                    data, 
                    backgroundColor: '#4e79a7',
                    borderWidth: 1
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Disable animations for better performance
                },
                layout: {
                    padding: 10
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: { 
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering stock chart:', error);
    }
}

function renderAdvEventsChart(targetPhc) {
    const ctx = document.getElementById('advEventsChart');
    if (!ctx) return;
    const patientMap = new Map((patientData || []).map(p => [String(p.ID), p]));
    let counts = { ReferredToMO: 0, ReferralClosed: 0 };
    (followUpsData || []).forEach(f => {
        const p = patientMap.get(String(f.PatientID));
        if (!p) return;
        if (targetPhc !== 'All' && (p.PHC || '').trim().toLowerCase() !== targetPhc.trim().toLowerCase()) return;
        if ((f.ReferredToMO || '').toString().toLowerCase() === 'yes') counts.ReferredToMO++;
        if ((f.ReferralClosed || '').toString().toLowerCase() === 'yes') counts.ReferralClosed++;
    });
    const labels = Object.keys(counts);
    const data = labels.map(k => counts[k]);

    // Destroy existing chart if it exists
    if (advCharts.events && typeof advCharts.events.destroy === 'function') {
        advCharts.events.destroy();
    }
    
    // Don't render if Chart.js not loaded
    if (!window.Chart) return;
    
    // Set fixed dimensions for the canvas
    const container = ctx.parentElement;
    if (container) {
        container.style.position = 'relative';
        container.style.height = '300px'; // Fixed height
        container.style.width = '100%';
    }
    
    // Create new chart instance
    try {
        advCharts.events = new Chart(ctx, {
            type: 'pie',
            data: { 
                labels, 
                datasets: [{ 
                    data, 
                    backgroundColor: ['#e15759', '#76b7b2'],
                    borderWidth: 1
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Disable animations for better performance
                },
                layout: {
                    padding: 10
                },
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering events chart:', error);
    }
}

function renderAdvEpilepsyChart(targetPhc) {
    const ctx = document.getElementById('advEpilepsyChart');
    if (!ctx) return;
    let counts = { Focal: 0, Generalized: 0, Unknown: 0 };
    (patientData || []).forEach(p => {
        if (targetPhc !== 'All' && (p.PHC || '').trim().toLowerCase() !== targetPhc.trim().toLowerCase()) return;
        const t = (p.EpilepsyType || p.TypeOfEpilepsy || '').toString().trim();
        if (t in counts) counts[t]++; else if (t) counts.Unknown++;
    });
    const labels = Object.keys(counts);
    const data = labels.map(k => counts[k]);
    // Destroy existing chart if it exists
    if (advCharts.epilepsy && typeof advCharts.epilepsy.destroy === 'function') {
        advCharts.epilepsy.destroy();
    }
    
    // Don't render if Chart.js not loaded
    if (!window.Chart) return;
    
    // Set fixed dimensions for the canvas
    const container = ctx.parentElement;
    if (container) {
        container.style.position = 'relative';
        container.style.height = '300px'; // Fixed height
        container.style.width = '100%';
    }
    
    // Create new chart instance
    try {
        advCharts.epilepsy = new Chart(ctx, {
            type: 'doughnut',
            data: { 
                labels, 
                datasets: [{ 
                    data, 
                    backgroundColor: ['#59a14f','#f28e2b','#bab0ab'],
                    borderWidth: 1
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Disable animations for better performance
                },
                layout: {
                    padding: 10
                },
                plugins: {
                    legend: {
                        position: 'right'
                    }
                },
                cutout: '60%'
            }
        });
    } catch (error) {
        console.error('Error rendering epilepsy chart:', error);
    }
}

function renderAdvInjuryChart(targetPhc) {
    const ctx = document.getElementById('advInjuryChart');
    if (!ctx) return;
    let yes = 0, no = 0;
    const considerYes = (v) => ['yes','true','1'].includes(String(v).toLowerCase());
    (patientData || []).forEach(p => {
        if (targetPhc !== 'All' && (p.PHC || '').trim().toLowerCase() !== targetPhc.trim().toLowerCase()) return;
        const val = p.InjuryReported ?? p.Injury ?? p.InjuryHistory;
        if (considerYes(val)) yes++; else no++;
    });
    const labels = ['Yes','No'];
    const data = [yes, no];
    // Destroy existing chart if it exists
    if (advCharts.injury && typeof advCharts.injury.destroy === 'function') {
        advCharts.injury.destroy();
    }
    
    // Don't render if Chart.js not loaded
    if (!window.Chart) return;
    
    // Set fixed dimensions for the canvas
    const container = ctx.parentElement;
    if (container) {
        container.style.position = 'relative';
        container.style.height = '300px'; // Fixed height
        container.style.width = '100%';
    }
    
    // Create new chart instance
    try {
        advCharts.injury = new Chart(ctx, {
            type: 'pie',
            data: { 
                labels, 
                datasets: [{ 
                    data, 
                    backgroundColor: ['#edc948','#9c9ede'],
                    borderWidth: 1
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Disable animations for better performance
                },
                layout: {
                    padding: 10
                },
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering injury chart:', error);
    }
}

function renderAdvAddictionsChart(targetPhc) {
    const ctx = document.getElementById('advAddictionsChart');
    if (!ctx) return;
    const categories = ['Alcohol','Tobacco','Cannabis','Other','None'];
    const counts = Object.fromEntries(categories.map(c => [c, 0]));
    (patientData || []).forEach(p => {
        if (targetPhc !== 'All' && (p.PHC || '').trim().toLowerCase() !== targetPhc.trim().toLowerCase()) return;
        const raw = (p.Addictions || p.Addiction || '').toString();
        if (!raw) { counts.None++; return; }
        const parts = raw.split(/[,;/]|\s*\|\s*/).map(s => s.trim()).filter(Boolean);
        if (parts.length === 0) { counts.None++; return; }
        let matched = false;
        parts.forEach(part => {
            const low = part.toLowerCase();
            if (low.includes('alcohol')) { counts.Alcohol++; matched = true; }
            else if (low.includes('tobacco') || low.includes('smok')) { counts.Tobacco++; matched = true; }
            else if (low.includes('cannabis') || low.includes('ganja')) { counts.Cannabis++; matched = true; }
            else if (low.includes('none') || low === 'no') { counts.None++; matched = true; }
            else { counts.Other++; matched = true; }
        });
        if (!matched) counts.Other++;
    });
    const labels = categories;
    const data = labels.map(k => counts[k]);
    // Destroy existing chart if it exists
    if (advCharts.addictions && typeof advCharts.addictions.destroy === 'function') {
        advCharts.addictions.destroy();
    }
    
    // Don't render if Chart.js not loaded
    if (!window.Chart) return;
    
    // Set fixed dimensions for the canvas
    const container = ctx.parentElement;
    if (container) {
        container.style.position = 'relative';
        container.style.height = '300px'; // Fixed height
        container.style.width = '100%';
    }
    
    // Create new chart instance
    try {
        advCharts.addictions = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels, 
                datasets: [{ 
                    label: 'Count', 
                    data, 
                    backgroundColor: '#e15759',
                    borderWidth: 1
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Disable animations for better performance
                },
                layout: {
                    padding: 10
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: { 
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error rendering addictions chart:', error);
    }
}
// REPLACE your existing showDrugInfoModal function with this one
function showDrugInfoModal(drugName) {
    const modal = document.getElementById('drugInfoModal');
    const title = document.getElementById('drugInfoTitle');
    const content = document.getElementById('drugInfoContent');
    const info = drugInfoData[drugName];

    if (!info) return; // Exit if no info for this drug
    title.textContent = drugName;

    let html = '';

    // Display clinical warnings first, if they exist
    if (info.warnings && info.warnings.length > 0) {
        html += `<div style='background:#fff3cd; border-left:4px solid #f39c12; padding:12px; margin-bottom:16px; border-radius:8px;'>
            <b>⚠️ Clinical Considerations:</b><ul style="margin: 5px 0 0 20px; padding: 0;">`;
        info.warnings.forEach(warning => {
            html += `<li>${warning}</li>`;
        });
        html += `</ul></div>`;
    }

    // Display the structured drug characteristics
    html += `<div style='background:#e8f4fd; border-left:4px solid #3498db; padding:12px; border-radius:8px;'>
                <b>Adult Dosage:</b> ${info.adultDose}<br>
                <hr style="margin: 8px 0; border: 0; border-top: 1px solid #cce5ff;">
                <b>Interactions:</b> ${info.interactions}<br>
                <b>Protein Binding:</b> ${info.proteinBinding}<br>
                <b>Half-life:</b> ${info.halfLife}<br>
                <b>Metabolism:</b> ${info.metabolism}
            </div>`;

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
        // Try the new getActivePHCNames endpoint first
        let response = await fetch(`${SCRIPT_URL}?action=getActivePHCNames`);
        console.log('fetchPHCNames: Response status from getActivePHCNames:', response.status);
        
        let result = await response.json();
        console.log('fetchPHCNames: Response from getActivePHCNames:', result);
        
        let activePHCNames = [];
        
        if (result.status === 'success' && Array.isArray(result.data)) {
            // Use the pre-filtered active PHC names
            activePHCNames = result.data.filter(name => name);
            console.log('fetchPHCNames: Successfully got active PHC names:', activePHCNames);
        } else {
            // Fallback to the old method if the new endpoint fails
            console.log('fetchPHCNames: Falling back to getPHCs endpoint');
            response = await fetch(`${SCRIPT_URL}?action=getPHCs`);
            console.log('fetchPHCNames: Response status from getPHCs:', response.status);
            
            result = await response.json();
            console.log('fetchPHCNames: Response from getPHCs:', result);
            
            if (result.status === 'success' && Array.isArray(result.data)) {
                // Handle both old and new PHC data formats
                activePHCNames = result.data
                    .filter(phc => {
                        // Check if the item is an object with Status or just a string
                        if (typeof phc === 'string') return true; // Assume all strings are valid PHC names
                        return phc.Status && phc.Status.toString().toLowerCase() === 'active';
                    })
                    .map(phc => {
                        // Extract PHC name from object or use the string directly
                        if (typeof phc === 'object' && phc.PHCName) {
                            return phc.PHCName;
                        } else if (typeof phc === 'object' && phc.Name) {
                            return phc.Name;
                        } else if (typeof phc === 'string') {
                            return phc;
                        }
                        return null;
                    })
                    .filter(name => name && name.trim() !== ''); // Remove any empty or invalid names
                
                console.log('fetchPHCNames: Processed PHC names:', activePHCNames);
            } else {
                throw new Error(result.message || 'Failed to fetch PHC names');
            }
        }
        
        if (activePHCNames.length > 0) {
            // Cache the result
            localStorage.setItem('phcNames', JSON.stringify(activePHCNames));
            localStorage.setItem('phcNamesTimestamp', Date.now().toString());
            
            // Populate dropdowns with the PHC names
            populatePHCDropdowns(activePHCNames);
        } else {
            throw new Error('No active PHCs found');
        }
    } catch (error) {
        console.error('Error fetching PHC names:', error);
        
        // Show error state in dropdowns but keep any existing values
        PHC_DROPDOWN_IDS.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown && (!dropdown.value || dropdown.value === '')) {
                dropdown.innerHTML = `<option value="">Error loading PHCs: ${error.message || 'Unknown error'}</option>`;
            }
        });
        
        // Re-throw the error to be handled by the caller if needed
        throw error;
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

/**
* Toggles the visibility of the Patient Education Center in the active modal.
*/
function toggleEducationCenter() {
// Determine which modal is active and get the correct education center ID
const followUpModalVisible = document.getElementById('followUpModal').style.display !== 'none';
const activeModalId = followUpModalVisible ? 'followUpModal' : 'referralFollowUpModal';
const educationCenterId = followUpModalVisible ? 'patientEducationCenter' : 'referralPatientEducationCenter';

const educationContainer = document.getElementById(educationCenterId);
const toggleButton = document.querySelector(`#${activeModalId} .education-center-container button`);

if (!educationContainer || !toggleButton) return;

if (educationContainer.style.display === 'none') {
educationContainer.style.display = 'block';
toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Patient Education Guide';
} else {
educationContainer.style.display = 'none';
toggleButton.innerHTML = '<i class="fas fa-book-open"></i> Show Patient Education Guide';
}
}

/**
* Sets up the Breakthrough Seizure Decision Support Tool for the referral form
* @param {object} patient - The patient object containing medication and weight information
*/
function setupReferralBreakthroughChecklist(patient) {
const checklistItems = [
document.getElementById('referralCheckCompliance'),
document.getElementById('referralCheckDiagnosis'),
document.getElementById('referralCheckComedications')
];
const newMedicationFields = document.getElementById('referralNewMedicationFields');
const dosageAidContainer = document.getElementById('dosageAidContainer');

function validateChecklist() {
if (checklistItems.every(checkbox => checkbox && checkbox.checked)) {
    newMedicationFields.style.display = 'block';
    showDosageAid(patient); // Show dosage aid when all checkboxes are checked
} else {
    newMedicationFields.style.display = 'none';
    if (dosageAidContainer) dosageAidContainer.style.display = 'none'; // Hide aid if checklist is incomplete
}
}

checklistItems.forEach(checkbox => {
if (checkbox) checkbox.addEventListener('change', validateChecklist);
});

// Ensure the medication changed checkbox resets everything
const medicationChangedCheckbox = document.getElementById('referralMedicationChanged');
if (medicationChangedCheckbox) {
medicationChangedCheckbox.addEventListener('change', function() {
    if (!this.checked) {
        checklistItems.forEach(checkbox => { 
            if (checkbox) checkbox.checked = false; 
        });
        validateChecklist(); // This will hide the sections
    }
});
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
/**
* Displays a detailed modal view for a specific patient, including their follow-up history.
* @param {string} patientId The ID of the patient to display.
*/
function showPatientDetails(patientId) {
const patient = patientData.find(p => p.ID === patientId);
if (!patient) {
showNotification('Could not find patient details.', 'error');
return;
}

const modal = document.getElementById('patientDetailModal');
const contentArea = document.getElementById('patientDetailContent');

// Find all follow-ups for this patient and sort them by date
const patientFollowUps = followUpsData
.filter(f => {
    // Handle both string and number comparison by converting both to strings
    const followUpPatientId = f.PatientID || f.patientId || f.patientID || '';
    return followUpPatientId.toString() === patientId.toString();
})
.sort((a, b) => {
    // Sort by date in descending order (newest first)
    const dateA = new Date(a.FollowUpDate || a.followUpDate || 0);
    const dateB = new Date(b.FollowUpDate || b.followUpDate || 0);
    return dateB - dateA;
});

// --- Build the HTML for the detailed view ---
let detailsHtml = `
<div class="patient-header">
    <h2>${patient.PatientName || 'N/A'} (#${patient.ID || 'N/A'})</h2>
    <div style="background: #e3f2fd; padding: 4px 10px; border-radius: 15px; font-size: 0.9rem;">${patient.PHC || 'N/A'}</div>
</div>

<h3 class="form-section-header">Personal Information</h3>
<div class="detail-grid">
    <div class="detail-item"><h4>Age</h4><p>${patient.Age || 'N/A'}</p></div>
    <div class="detail-item"><h4>Gender</h4><p>${patient.Gender || 'N/A'}</p></div>
    <div class="detail-item"><h4>Phone</h4><p>${patient.Phone || 'N/A'}</p></div>
    <div class="detail-item"><h4>Address</h4><p>${patient.Address || 'N/A'}</p></div>
</div>

<h3 class="form-section-header">Medical Details</h3>
<div class="detail-grid">
    <div class="detail-item"><h4>Diagnosis</h4><p>${patient.Diagnosis || 'N/A'}</p></div>
    <div class="detail-item"><h4>Age of Onset</h4><p>${patient.AgeOfOnset || 'N/A'}</p></div>
    <div class="detail-item"><h4>Seizure Frequency</h4><p>${patient.SeizureFrequency || 'N/A'}</p></div>
    <div class="detail-item"><h4>Patient Status</h4><p>${patient.PatientStatus || 'Active'}</p></div>
</div>

<h3 class="form-section-header">Current Medications</h3>
<div class="medication-grid">
    ${(() => {
        try {
            if (!patient.Medications) return '<p>No medications listed.</p>';
            
            // Handle case where Medications is a string
            let meds = patient.Medications;
            if (typeof meds === 'string') {
                try {
                    meds = JSON.parse(meds);
                } catch (e) {
                    console.error('Error parsing medications:', e);
                    return `<p>Error loading medications: ${e.message}</p>`;
                }
            }
            
            // Handle case where meds is an array
            if (Array.isArray(meds) && meds.length > 0) {
                return meds.map(med => {
                    if (typeof med === 'string') {
                        return `<div class="medication-item">${med}</div>`;
                    } else if (med && typeof med === 'object') {
                        const name = med.name || med.medicine || med.drug || 'Unknown';
                        const dosage = med.dosage || med.dose || med.quantity || '';
                        return `<div class="medication-item">${name} ${dosage}</div>`;
                    }
                    return '';
                }).join('');
            }
            return '<p>No medications listed.</p>';
        } catch (e) {
            console.error('Error displaying medications:', e);
            return `<p>Error displaying medications: ${e.message}</p>`;
        }
    })()}
</div>
`;

// --- Build the Follow-up History ---
detailsHtml += `<h3 class="form-section-header">Follow-up History (${patientFollowUps.length})</h3>`;
if (patientFollowUps && patientFollowUps.length > 0) {
detailsHtml += '<div class="history-container">';

// Use the already sorted patientFollowUps array
patientFollowUps.forEach((followUp, index) => {
    try {
        const followUpDate = followUp.FollowUpDate || followUp.followUpDate || 'N/A';
        const submittedBy = followUp.SubmittedBy || followUp.submittedBy || 'N/A';
        const adherence = followUp.TreatmentAdherence || followUp.treatmentAdherence || 'N/A';
        const seizureFreq = followUp.SeizureFrequency || followUp.seizureFrequency || 'N/A';
        const notes = followUp.AdditionalQuestions || followUp.additionalQuestions || 'None';
        const referred = (followUp.ReferredToMO || followUp.referredToMO || '').toString().toLowerCase() === 'yes';
        
        detailsHtml += `
            <div class="history-item">
                <h4>Follow-up on: ${formatDateForDisplay(new Date(followUpDate))}</h4>
                <p><strong>Submitted by:</strong> ${submittedBy}</p>
                <p><strong>Adherence:</strong> ${adherence}</p>
                <p><strong>Seizure Frequency:</strong> ${seizureFreq}</p>
                <p><strong>Notes:</strong> ${notes}</p>
                ${referred ? '<p style="color:var(--danger-color); font-weight:600;">Referred to Medical Officer</p>' : ''}
            </div>`;
    } catch (e) {
        console.error('Error rendering follow-up:', e, followUp);
        detailsHtml += `
            <div class="history-item" style="border-left-color: var(--warning-color);">
                <h4>Error displaying follow-up</h4>
                <p>There was an error displaying this follow-up record.</p>
            </div>`;
    }
});
detailsHtml += '</div>';
} else {
detailsHtml += '<p>No follow-up records found for this patient.</p>';
}

contentArea.innerHTML = detailsHtml;
modal.style.display = 'flex';
}

/**
* Closes the patient detail modal.
*/
function closePatientDetailModal() {
document.getElementById('patientDetailModal').style.display = 'none';
}

/**
* Prints the content of the patient detail modal with proper styling for printing.
*/
function printPatientSummary() {
// Create a clone of the patient detail content
const content = document.getElementById('patientDetailContent').cloneNode(true);

// Create a print container
const printWindow = window.open('', '', 'width=900,height=600');

// Add print-specific styles
const styles = `
<style>
    @page { 
        size: A4;
        margin: 1cm;
    }
    body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        padding: 20px;
    }
    .print-header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #3498db;
    }
    .print-header h2 {
        color: #2c3e50;
        margin: 0;
    }
    .print-section {
        margin-bottom: 20px;
        page-break-inside: avoid;
    }
    .print-section h3 {
        color: #3498db;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
        margin-bottom: 10px;
    }
    .detail-row {
        display: flex;
        margin-bottom: 8px;
        page-break-inside: avoid;
    }
    .detail-label {
        font-weight: bold;
        min-width: 200px;
        color: #555;
    }
    .medication-item {
        background: #f5f9ff;
        border-left: 3px solid #3498db;
        padding: 8px 12px;
        margin-bottom: 8px;
        border-radius: 0 4px 4px 0;
    }
    .print-timestamp {
        text-align: right;
        color: #777;
        font-size: 0.9em;
        margin-top: 20px;
        border-top: 1px solid #eee;
        padding-top: 10px;
    }
    @media print {
        body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .no-print { 
            display: none !important; 
        }
    }
</style>
`;

// Add content to the print window
printWindow.document.open();
printWindow.document.write(`
<html>
    <head>
        <title>Patient Summary - ${document.querySelector('#patientDetailContent h2')?.textContent || 'Patient Details'}</title>
        ${styles}
    </head>
    <body>
        <div class="print-header">
            <h2>Epilepsy Patient Summary</h2>
            <p>${new Date().toLocaleString()}</p>
        </div>
        ${content.innerHTML}
        <div class="print-timestamp">
            Generated on: ${new Date().toLocaleString()}
        </div>
    </body>
</html>
`);

printWindow.document.close();

// Wait for content to load before printing
printWindow.onload = function() {
setTimeout(() => {
    printWindow.print();
    printWindow.onafterprint = function() {
        printWindow.close();
    };
}, 500);
};
}
