// Authentication JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Form elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    // Toggle forms
    document.getElementById('show-register')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForm('register-form');
    });
    
    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForm('login-form');
    });
    
    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleForm('forgot-password-form');
    });
    
    document.getElementById('back-to-login')?.addEventListener('click', () => {
        toggleForm('login-form');
    });
    
    // Login
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        showLoading(true);
        hideMessage();
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Check if user is approved
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                showMessage('Account not found. Please contact administrator.', 'error');
                await auth.signOut();
                return;
            }
            
            const userData = userDoc.data();
            
            if (!userData.approved) {
                showMessage('Your account is pending approval. Please wait for admin confirmation.', 'warning');
                await auth.signOut();
                return;
            }
            
            // Successful login
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            showMessage(getErrorMessage(error), 'error');
        } finally {
            showLoading(false);
        }
    });
    
    // Register
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        // Validate
        if (password !== confirmPassword) {
            showMessage('Passwords do not match!', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters long!', 'error');
            return;
        }
        
        showLoading(true);
        hideMessage();
        
        try {
            // Create user in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Create user document in Firestore
            await db.collection('users').doc(user.uid).set({
                name: name,
                username: username,
                email: email,
                role: 'user',
                approved: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create pending user notification for admin
            await db.collection('pendingUsers').doc(user.uid).set({
                name: name,
                username: username,
                email: email,
                requestedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Sign out immediately (user needs approval)
            await auth.signOut();
            
            showMessage('Registration successful! Your account is pending approval. You will receive an email once approved.', 'success');
            
            // Clear form
            registerForm.reset();
            
            // Switch to login form after 3 seconds
            setTimeout(() => {
                toggleForm('login-form');
            }, 3000);
            
        } catch (error) {
            console.error('Registration error:', error);
            showMessage(getErrorMessage(error), 'error');
        } finally {
            showLoading(false);
        }
    });
    
    // Forgot Password
    forgotPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('forgot-email').value;
        
        showLoading(true);
        hideMessage();
        
        try {
            await auth.sendPasswordResetEmail(email);
            showMessage('Password reset email sent! Please check your inbox.', 'success');
            
            // Clear form
            forgotPasswordForm.reset();
            
            // Switch to login form after 3 seconds
            setTimeout(() => {
                toggleForm('login-form');
            }, 3000);
            
        } catch (error) {
            console.error('Password reset error:', error);
            showMessage(getErrorMessage(error), 'error');
        } finally {
            showLoading(false);
        }
    });
    
    // Check if user is already logged in
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Check if approved
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().approved) {
                window.location.href = 'dashboard.html';
            }
        }
    });
});

// Utility functions
function toggleForm(formId) {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(formId).classList.add('active');
    hideMessage();
}

function showMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = message;
    messageEl.className = `message alert alert-${type}`;
    messageEl.classList.remove('hidden');
}

function hideMessage() {
    const messageEl = document.getElementById('auth-message');
    messageEl.classList.add('hidden');
}

function showLoading(show) {
    const loadingEl = document.getElementById('loading');
    if (show) {
        loadingEl.classList.remove('hidden');
    } else {
        loadingEl.classList.add('hidden');
    }
}

function getErrorMessage(error) {
    switch (error.code) {
        case 'auth/user-not-found':
            return 'No user found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'This email is already registered.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return error.message || 'An error occurred. Please try again.';
    }
}