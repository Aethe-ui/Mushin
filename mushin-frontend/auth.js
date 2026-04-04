document.addEventListener('DOMContentLoaded', () => {

    // ─── Supabase Client ────────────────────────────────────────────────────────
    // Replace with your actual credentials.
    // For production, inject these via your build step or a config file
    // that is excluded from version control (.gitignore).
    const SUPABASE_URL = 'https://yrxsjgybzknxbdqkplos.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyeHNqZ3liemtueGJkcWtwbG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTgxNjcsImV4cCI6MjA5MDc5NDE2N30.xU8bPKvcWVpVYSH1GtPfhCXK-yqQZ5JUTRcXn9XGLZM';

    const { createClient } = supabase; // assumes supabase CDN script is loaded before this file
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ─── Element References ─────────────────────────────────────────────────────
    const authCard = document.getElementById('auth-card-inner');
    const sessionPanel = document.getElementById('session-panel');
    const authView = document.getElementById('auth-view');
    const dashboardView = document.getElementById('dashboard-view');
    const topbarEmail = document.getElementById('topbar-email');

    // Auth form elements
    const tabs = document.querySelectorAll('.tab');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const submitBtn = document.getElementById('auth-submit-btn');
    const submitSpinner = document.getElementById('auth-spinner');
    const submitBtnText = document.getElementById('auth-btn-text');
    const msgEl = document.getElementById('auth-msg');

    // Session panel elements
    const sessionEmail = document.getElementById('session-email');
    const sessionUid = document.getElementById('session-uid');
    const signOutBtn = document.getElementById('signout-btn');
    const signOutSpinner = document.getElementById('signout-spinner');
    const signOutText = document.getElementById('signout-text');

    // Dashboard elements
    const dashboardSignOutBtn = document.getElementById('dashboard-signout-btn');
    const dashboardSignOutSpinner = document.getElementById('dashboard-signout-spinner');
    const dashboardSignOutText = document.getElementById('dashboard-signout-text');

    // ─── State ──────────────────────────────────────────────────────────────────
    let activeTab = 'signin'; // 'signin' | 'signup'

    // ─── Helpers ────────────────────────────────────────────────────────────────
    function showMessage(type, text) {
        msgEl.className = `msg ${type}`;
        msgEl.textContent = text;
        msgEl.style.display = 'block';
    }

    function clearMessage() {
        msgEl.style.display = 'none';
        msgEl.textContent = '';
    }

    function clearForm() {
        emailInput.value = '';
        passwordInput.value = '';
        clearMessage();
    }

    function setSubmitLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitSpinner.style.display = isLoading ? 'inline-block' : 'none';
        submitBtnText.textContent = isLoading
            ? (activeTab === 'signup' ? 'Creating...' : 'Signing in...')
            : (activeTab === 'signup' ? 'Create Account' : 'Enter System');
    }

    function setSignOutLoading(isLoading) {
        const displayVal = isLoading ? 'inline-block' : 'none';
        const textVal = isLoading ? 'signing out...' : '→ Sign Out';
        
        signOutBtn.disabled = isLoading;
        signOutSpinner.style.display = displayVal;
        signOutText.textContent = textVal;

        if (dashboardSignOutBtn) {
            dashboardSignOutBtn.disabled = isLoading;
            dashboardSignOutSpinner.style.display = displayVal;
            dashboardSignOutText.textContent = textVal;
        }
    }

    // ─── View Switching ─────────────────────────────────────────────────────────
    function showAuthView() {
        if (authView) authView.style.display = 'flex';
        if (dashboardView) dashboardView.style.display = 'none';
        
        authCard.style.display = 'block';
        sessionPanel.style.display = 'none';
        clearForm();
    }

    function showSessionView(session) {
        if (authView) authView.style.display = 'flex';
        if (dashboardView) dashboardView.style.display = 'none';
        
        authCard.style.display = 'none';
        sessionPanel.style.display = 'block';
        sessionEmail.textContent = session.user.email;
        sessionUid.textContent = `uid: ${session.user.id}`;
        
        if (topbarEmail) topbarEmail.textContent = session.user.email;
        
        // Brief transition to dashboard view
        setTimeout(() => {
            if (sessionPanel.style.display === 'block') {
                if (authView) authView.style.display = 'none';
                if (dashboardView) dashboardView.style.display = 'block';
            }
        }, 1500);
    }

    // ─── Tab Switching ──────────────────────────────────────────────────────────
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.dataset.tab;
            submitBtnText.textContent = activeTab === 'signup' ? 'Create Account' : 'Enter System';
            passwordInput.setAttribute(
                'autocomplete',
                activeTab === 'signup' ? 'new-password' : 'current-password'
            );
            clearForm();
        });
    });

    // ─── Auth Actions ───────────────────────────────────────────────────────────
    async function handleSignUp() {
        const { error } = await sb.auth.signUp({
            email: emailInput.value.trim(),
            password: passwordInput.value,
        });

        if (error) {
            showMessage('error', error.message);
        } else {
            showMessage('success', 'Account created. Check your email to confirm before signing in.');
        }
    }

    async function handleSignIn() {
        const { error } = await sb.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: passwordInput.value,
        });

        if (error) {
            showMessage('error', error.message);
        }
        // On success, onAuthStateChange fires → showSessionView() is called automatically
    }

    async function handleSignOut() {
        setSignOutLoading(true);
        await sb.auth.signOut();
        setSignOutLoading(false);
        clearForm();
    }

    async function handleSubmit() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage('error', 'Email and password are required.');
            return;
        }

        clearMessage();
        setSubmitLoading(true);

        if (activeTab === 'signup') {
            await handleSignUp();
        } else {
            await handleSignIn();
        }

        setSubmitLoading(false);
    }

    // ─── Event Listeners ────────────────────────────────────────────────────────
    submitBtn.addEventListener('click', handleSubmit);

    signOutBtn.addEventListener('click', handleSignOut);
    if (dashboardSignOutBtn) {
        dashboardSignOutBtn.addEventListener('click', handleSignOut);
    }

    // Enter key on either input triggers submit
    [emailInput, passwordInput].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSubmit();
        });
    });

    // ─── Session Sync ───────────────────────────────────────────────────────────
    // Check for existing session on page load
    sb.auth.getSession().then(({ data }) => {
        if (data.session) {
            showSessionView(data.session);
        } else {
            showAuthView();
        }
    });

    // Listen for auth state changes (sign in / sign out)
    sb.auth.onAuthStateChange((_event, session) => {
        if (session) {
            showSessionView(session);
        } else {
            showAuthView();
        }
    });

});