import { supabase } from './config/supabaseClient.js';

import { checkSession, initAuthListeners, toggleAuthMode, handleAuthSubmit, doLogout, getCurrentUser } from './auth/authManager.js';
import { medicationService } from './services/medicationService.js';
import { taskService } from './services/taskService.js';
import { openAddMedModal, closeAddMedModal, saveMed, updateDosageInput, openRemindersModal, closeRemindersModal, saveReminders, openMedDetails, closeMedDetailsModal } from './ui/modals/medicationModal.js';
import { renderCareHub, renderMeds } from './ui/pages/careHub.js?v=7';

// --- INITIALIZATION ---
async function initApp() {
    console.log("Initializing App (Module)...");

    // expose to window for legacy code (CRITICAL)
    window.supabase = supabase;
    window.toggleAuthMode = toggleAuthMode;
    window.doLogout = doLogout;

    function startServiceLoops() {
        // 1. Daily Refresh Check (Every minute)
        setInterval(() => {
            if (window.services.medication.runDailyReset) {
                window.services.medication.runDailyReset();
            }
        }, 60000);

        // Initial check on load
        if (window.services.medication.runDailyReset) {
            window.services.medication.runDailyReset();
        } else {
            console.error("MedicationService: runDailyReset not found!");
        }

        // 2. Notification Check (Every minute)
        setInterval(() => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            // Loop through meds
            if (window.appData && window.appData.meds) {
                window.appData.meds.forEach(med => {
                    if (med.reminderTimes && med.reminderTimes.includes(currentTime)) {
                        // Check if already taken for this slot is redundant if we just notify "It's time"
                        // Simple "Time to take" notification
                        if (Notification.permission === 'granted') {
                            new Notification(`Time to take ${med.name}`, {
                                body: `${med.dosage}. Open App to log.`
                            });
                        }
                    }
                });
            }
        }, 60000);

        // Request Permission
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    // Bind Services
    window.services = {
        medication: medicationService,
        task: taskService
    };

    // Bind UI (Legacy Callbacks)
    window.openAddMedModal = openAddMedModal;
    window.closeAddMedModal = closeAddMedModal;
    window.saveMed = saveMed;
    window.updateDosageInput = updateDosageInput;
    window.openRemindersModal = openRemindersModal;
    window.closeRemindersModal = closeRemindersModal;
    window.saveReminders = saveReminders;
    window.openMedDetails = openMedDetails;
    window.closeMedDetailsModal = closeMedDetailsModal;
    window.renderCareHub = renderCareHub;

    // Initialize CareHub
    if (window.renderCareHub) window.renderCareHub();

    // Start Loops
    startServiceLoops();

    window.renderMeds = renderMeds;


    // Bind Auth Submit Button
    const authBtn = document.getElementById('auth-submit-btn');
    if (authBtn) {
        authBtn.onclick = async () => {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            const errorDiv = document.getElementById('auth-error');

            // Basic UI Validation
            if (!email || !password) {
                if (errorDiv) errorDiv.innerText = "Please enter email and password";
                return;
            }

            authBtn.disabled = true;
            authBtn.innerText = "Processing...";
            if (errorDiv) errorDiv.innerText = "";

            try {
                // Get mode from UI state or manager
                // We'll infer from button text for simplicity or import getAuthMode
                const isLogin = authBtn.innerText.toLowerCase().includes("sign in") || document.getElementById('auth-title').innerText.includes("Welcome");

                // Correction: The button text changes immediately to "Processing", so we need source of truth
                // We'll rely on the exported logic but for now let's use the UI text BEFORE we changed it
                // Actually safer to import getAuthMode
                // Let's rely on the module state or DOM header
                const title = document.getElementById('auth-title').innerText;
                const modeIsLogin = title.includes("Welcome") || title.includes("Login");

                const { data, error } = await handleAuthSubmit(email, password, modeIsLogin);

                if (error) throw error;

                // If SignUp, often requires email confirmation
                if (!modeIsLogin && data?.user && !data?.session) {
                    alert("Account created! Please check your email to confirm.");
                    toggleAuthMode(); // Switch to login
                }

            } catch (e) {
                console.error("Auth Error:", e);
                if (errorDiv) errorDiv.innerText = e.message || "Authentication failed";
            } finally {
                authBtn.disabled = false;
                // Text reset handled by updateAuthUI or manually here if needed
                // But successful login triggers onAuthStateChange -> showApp
                // Failed login stays here
                if (document.getElementById('auth-title').innerText.includes("Welcome")) {
                    authBtn.innerText = "Sign In";
                } else {
                    authBtn.innerText = "Sign Up";
                }
            }
        };
    }

    // Initialize Auth State
    initAuthListeners((user) => {
        window.currentUser = user; // Bind for legacy
        console.log("Auth State Change: ", user ? "Logged In" : "Logged Out");
        if (typeof window.showApp === 'function') window.showApp();
        else console.error("window.showApp missing!");
    });

    // Check Session on Load
    await checkSession(
        (user) => {
            console.log("Session Found:", user.email);
            window.currentUser = user;

            console.log("Calling window.showApp()...");
            if (typeof window.showApp === 'function') window.showApp();
            else console.error("window.showApp missing (Session Success)!");

            // Start Legacy App Interval/Clock
            if (typeof window.init === 'function') window.init();
        },
        () => {
            console.log("No Session (Login Required)");
            window.currentUser = null;

            // FORCE LOGIN: Even if local data exists, require login.
            // Only show app if we are truly logged in.

            /* Legacy Local Support Removed to Enforce Account */
            /*
            const local = localStorage.getItem('adl_checklist_data');
            if (local) {
                console.log("Local Data Found, showing app...");
                if (typeof window.showApp === 'function') window.showApp();
                else console.error("window.showApp missing (Local Mode)!");
            } else { ... }
            */

            const authModal = document.getElementById('auth-modal');
            if (authModal) {
                authModal.style.display = 'flex';
                setTimeout(() => authModal.style.opacity = '1', 10);
            }
        }
    );

    // Bind legacy toggle (the span in the footer)
    const switchText = document.getElementById('auth-switch-text');
    if (switchText) {
        switchText.onclick = toggleAuthMode;
    }

    // --- Legacy Listeners (Ported from index.html) ---
    if (typeof window.initializeTimeDropdowns === 'function') {
        window.initializeTimeDropdowns();
    }

    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink && typeof window.showForgotPasswordModal === 'function') {
        forgotLink.addEventListener('click', window.showForgotPasswordModal);
    }

    const googleBtn = document.querySelector('.google-btn');
    if (googleBtn && typeof window.loginWithGoogle === 'function') {
        googleBtn.addEventListener('click', window.loginWithGoogle);
    }

    // Global Click Listener (Action Menu)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.action-menu') && !e.target.closest('.kebab-btn')) {
            if (typeof window.triggerGlobalAction === 'function') {
                window.triggerGlobalAction('close');
            }
        }
    });
}


// --- NAVIGATION (Legacy Restoration) ---
function navigateTo(viewId) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });

    // Show target view
    const target = document.getElementById(viewId);
    if (target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);

        // Update Nav Menu UI
        // Assuming nav items have onclick that contains the viewId
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            // Check button or anchor inside or the item itself
            if (item.getAttribute('onclick')?.includes(viewId) ||
                item.querySelector('button')?.getAttribute('onclick')?.includes(viewId)) {
                item.classList.add('active');
            }
        });

        // Init Care Hub if needed
        if (viewId === 'view-care-hub' && typeof window.renderCareHub === 'function') {
            window.renderCareHub();
        }
    }
}

// Bind Global
window.navigateTo = navigateTo;

// Start
document.addEventListener('DOMContentLoaded', initApp);
