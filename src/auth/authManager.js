import { supabase } from '../config/supabaseClient.js';

let currentUser = null;
let isLoginMode = true;

// Auth State Management
export function getCurrentUser() {
    return currentUser;
}

export function getAuthMode() {
    return isLoginMode;
}

export function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    updateAuthUI();
    return isLoginMode;
}

function updateAuthUI() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const btn = document.getElementById('auth-submit-btn');
    const container = document.querySelector('.auth-switch-container');

    if (!title || !btn || !container) return;

    if (isLoginMode) {
        title.innerText = "Welcome Back";
        if (subtitle) subtitle.innerText = "Sign in to sync your tasks";
        btn.innerText = "Sign In";
        container.innerHTML = 'Don\'t have an account? <span id="auth-switch-text" class="auth-link">Sign Up</span>';
    } else {
        title.innerText = "Create Account";
        if (subtitle) subtitle.innerText = "Create an account to get started";
        btn.innerText = "Sign Up";
        container.innerHTML = 'Already have an account? <span id="auth-switch-text" class="auth-link">Sign In</span>';
    }

    // Re-attach listener since we replaced innerHTML
    const switchText = document.getElementById('auth-switch-text');
    if (switchText) {
        switchText.onclick = toggleAuthMode;
    }
}

// Session Check
export async function checkSession(onSessionFound, onLocalFallback) {
    try {
        if (!supabase) throw new Error("Supabase SDK not initialized");

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
            currentUser = session.user;
            if (onSessionFound) onSessionFound(currentUser);
            return currentUser;
        } else {
            console.log("No active session.");
            if (onLocalFallback) onLocalFallback();
            return null;
        }
    } catch (e) {
        console.error("Auth Init Error:", e);
        if (onLocalFallback) onLocalFallback();
        return null;
    }
}

// Auth Actions
export async function handleAuthSubmit(email, password, isLogin) {
    if (!supabase) return { error: { message: "Database connection failed" } };

    if (isLogin) {
        return await supabase.auth.signInWithPassword({ email, password });
    } else {
        return await supabase.auth.signUp({ email, password });
    }
}

export async function doLogout() {
    if (supabase) await supabase.auth.signOut();
    // Clear local data to prevent "Local Mode" fallback and ensure Login Modal appears
    localStorage.removeItem('adl_checklist_data');
    localStorage.removeItem('adl_meds_data');
    // Clear any other potential keys just in case
    localStorage.clear();
    window.location.reload();
}

// Initialize Auth Listeners
export function initAuthListeners(onAuthStateChange) {
    if (!supabase) return;

    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            if (onAuthStateChange) onAuthStateChange(currentUser);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            window.location.reload();
        }
    });
}
