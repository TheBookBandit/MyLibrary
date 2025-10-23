// auth.js - Firebase Authentication Module
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    updateDoc, 
    query, 
    where, 
    orderBy,
    deleteDoc,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Application State
let currentUser = null;
let userProfile = null;
let isAdmin = false;

// Default admin email - Change this to your email
const ADMIN_EMAIL = 'sandipan7085@gmail.com'; // CHANGE THIS

// Raspberry Pi server configuration
const PI_SERVER_CONFIG = {
    host: '10.25.136.207', // CHANGE TO YOUR PI'S IP
    port: 8080,
    protocol: 'http'
};

// UI Elements
const elements = {
    // Pages
    authPage: document.getElementById('authPage'),
    librarySelection: document.getElementById('librarySelection'),
    lanDenied: document.getElementById('lanDenied'),
    libraryApp: document.getElementById('libraryApp'),
    
    // Auth forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    forgotPasswordForm: document.getElementById('forgotPasswordForm'),
    pendingApproval: document.getElementById('pendingApproval'),
    loadingAuth: document.getElementById('loadingAuth'),
    
    // Form elements
    loginFormElement: document.getElementById('loginFormElement'),
    registerFormElement: document.getElementById('registerFormElement'),
    forgotPasswordFormElement: document.getElementById('forgotPasswordFormElement'),
    
    // User info
    userName: document.getElementById('userName'),
    libraryMode: document.getElementById('libraryMode'),
    
    // Modals
    profileModal: document.getElementById('profileModal'),
    adminModal: document.getElementById('adminModal'),
    
    // Admin panel
    pendingUsersList: document.getElementById('pendingUsersList'),
    approvedUsersList: document.getElementById('approvedUsersList')
};

// Utility Functions
function showPage(pageId) {
    const pages = ['authPage', 'librarySelection', 'lanDenied', 'libraryApp'];
    pages.forEach(page => {
        document.getElementById(page).style.display = page === pageId ? 'block' : 'none';
    });
}

function showAuthForm(formName) {
    const forms = ['loginForm', 'registerForm', 'forgotPasswordForm', 'pendingApproval'];
    forms.forEach(form => {
        document.getElementById(form).style.display = form === formName ? 'block' : 'none';
    });
}

function showLoading(show, message = 'Please wait...') {
    elements.loadingAuth.style.display = show ? 'block' : 'none';
    if (show) {
        elements.loadingAuth.querySelector('p').textContent = message;
    }
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}

// Authentication Functions
async function handleLogin(email, password) {
    try {
        showLoading(true, 'Signing in...');
        const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        // User state will be handled by onAuthStateChanged
    } catch (error) {
        showLoading(false);
        showError(getErrorMessage(error));
    }
}

async function handleRegister(name, username, email, password, confirmPassword) {
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    try {
        showLoading(true, 'Creating account...');
        
        // Check if username already exists
        const usernameQuery = query(
            collection(window.firebaseDb, 'users'), 
            where('username', '==', username)
        );
        const usernameSnapshot = await getDocs(usernameQuery);
        
        if (!usernameSnapshot.empty) {
            showLoading(false);
            showError('Username already exists');
            return;
        }
        
        // Create Firebase user
        const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        const user = userCredential.user;
        
        // Update display name
        await updateProfile(user, { displayName: name });
        
        // Create user profile in Firestore
        await setDoc(doc(window.firebaseDb, 'users', user.uid), {
            name: name,
            username: username,
            email: email,
            approved: false,
            isAdmin: email === ADMIN_EMAIL,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Send admin notification if not self-registration by admin
        if (email !== ADMIN_EMAIL) {
            await addDoc(collection(window.firebaseDb, 'notifications'), {
                type: 'new_user_registration',
                userId: user.uid,
                userName: name,
                userEmail: email,
                message: `New user ${name} (${email}) has registered and is awaiting approval.`,
                read: false,
                createdAt: new Date()
            });
        }
        
        showLoading(false);
        showSuccess('Registration successful! ' + (email === ADMIN_EMAIL ? 'Admin account created.' : 'Please wait for admin approval.'));
        
    } catch (error) {
        showLoading(false);
        showError(getErrorMessage(error));
    }
}

async function handleForgotPassword(email) {
    try {
        showLoading(true, 'Sending reset link...');
        await sendPasswordResetEmail(window.firebaseAuth, email);
        showLoading(false);
        showSuccess('Password reset link sent to your email');
        showAuthForm('loginForm');
    } catch (error) {
        showLoading(false);
        showError(getErrorMessage(error));
    }
}

async function handleSignOut() {
    try {
        await signOut(window.firebaseAuth);
        showPage('authPage');
        showAuthForm('loginForm');
    } catch (error) {
        showError('Failed to sign out');
    }
}

// User Profile Functions
async function loadUserProfile(user) {
    try {
        const userDoc = await getDoc(doc(window.firebaseDb, 'users', user.uid));
        if (userDoc.exists()) {
            userProfile = userDoc.data();
            isAdmin = userProfile.isAdmin || false;
            
            // Update UI
            elements.userName.textContent = userProfile.name || user.displayName || 'User';
            
            // Show admin panel if admin
            const adminBtn = document.getElementById('adminPanelBtn');
            if (adminBtn) {
                adminBtn.style.display = isAdmin ? 'inline-flex' : 'none';
            }
            
            return userProfile;
        }
        return null;
    } catch (error) {
        console.error('Error loading user profile:', error);
        return null;
    }
}

async function updateUserProfile(name, username) {
    try {
        const user = window.firebaseAuth.currentUser;
        if (!user) return;
        
        // Check if username is taken by another user
        const usernameQuery = query(
            collection(window.firebaseDb, 'users'),
            where('username', '==', username)
        );
        const usernameSnapshot = await getDocs(usernameQuery);
        
        const existingUser = usernameSnapshot.docs.find(doc => doc.id !== user.uid);
        if (existingUser) {
            throw new Error('Username already exists');
        }
        
        // Update Firebase Auth profile
        await updateProfile(user, { displayName: name });
        
        // Update Firestore document
        await updateDoc(doc(window.firebaseDb, 'users', user.uid), {
            name: name,
            username: username,
            updatedAt: new Date()
        });
        
        // Update local profile
        userProfile.name = name;
        userProfile.username = username;
        
        // Update UI
        elements.userName.textContent = name;
        
        showSuccess('Profile updated successfully');
    } catch (error) {
        showError(getErrorMessage(error));
    }
}

// Admin Functions
async function loadPendingUsers() {
    try {
        const pendingQuery = query(
            collection(window.firebaseDb, 'users'),
            where('approved', '==', false),
            where('isAdmin', '==', false),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(pendingQuery);
        
        elements.pendingUsersList.innerHTML = '';
        
        if (snapshot.empty) {
            elements.pendingUsersList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No pending users</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const user = doc.data();
            const userCard = createUserCard(doc.id, user, true);
            elements.pendingUsersList.appendChild(userCard);
        });
    } catch (error) {
        showError('Failed to load pending users');
    }
}

async function loadApprovedUsers() {
    try {
        const approvedQuery = query(
            collection(window.firebaseDb, 'users'),
            where('approved', '==', true),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(approvedQuery);
        
        elements.approvedUsersList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            const userCard = createUserCard(doc.id, user, false);
            elements.approvedUsersList.appendChild(userCard);
        });
    } catch (error) {
        showError('Failed to load approved users');
    }
}

function createUserCard(userId, user, isPending) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
        <h4>${user.name} (@${user.username})</h4>
        <p>${user.email}</p>
        <p>Registered: ${user.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'user-actions';
    
    if (isPending) {
        const approveBtn = document.createElement('button');
        approveBtn.className = 'btn btn-primary btn-small';
        approveBtn.textContent = '✓ Approve';
        approveBtn.onclick = () => approveUser(userId, user);
        
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn-secondary btn-small';
        rejectBtn.textContent = '✗ Reject';
        rejectBtn.onclick = () => rejectUser(userId, user);
        
        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);
    } else {
        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'btn btn-secondary btn-small';
        revokeBtn.textContent = '🚫 Revoke Access';
        revokeBtn.onclick = () => revokeUser(userId, user);
        
        actions.appendChild(revokeBtn);
    }
    
    card.appendChild(userInfo);
    card.appendChild(actions);
    
    return card;
}

async function approveUser(userId, user) {
    try {
        await updateDoc(doc(window.firebaseDb, 'users', userId), {
            approved: true,
            updatedAt: new Date()
        });
        
        showSuccess(`User ${user.name} approved successfully`);
        loadPendingUsers();
        loadApprovedUsers();
    } catch (error) {
        showError('Failed to approve user');
    }
}

async function rejectUser(userId, user) {
    if (!confirm(`Are you sure you want to reject ${user.name}? This will delete their account.`)) {
        return;
    }
    
    try {
        await deleteDoc(doc(window.firebaseDb, 'users', userId));
        showSuccess(`User ${user.name} rejected and account deleted`);
        loadPendingUsers();
    } catch (error) {
        showError('Failed to reject user');
    }
}

async function revokeUser(userId, user) {
    if (!confirm(`Are you sure you want to revoke access for ${user.name}?`)) {
        return;
    }
    
    try {
        await updateDoc(doc(window.firebaseDb, 'users', userId), {
            approved: false,
            updatedAt: new Date()
        });
        
        showSuccess(`Access revoked for ${user.name}`);
        loadPendingUsers();
        loadApprovedUsers();
    } catch (error) {
        showError('Failed to revoke user access');
    }
}

// Library Access Functions
async function checkLANAccess() {
    try {
        const response = await fetch(`${PI_SERVER_CONFIG.protocol}://${PI_SERVER_CONFIG.host}:${PI_SERVER_CONFIG.port}/health`, {
            method: 'GET',
            timeout: 3000
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function enterLibrary(mode) {
    if (mode === 'full') {
        const hasLANAccess = await checkLANAccess();
        if (!hasLANAccess) {
            showPage('lanDenied');
            return;
        }
        // Set library mode for full access
        window.libraryMode = 'full';
        elements.libraryMode.textContent = 'Library Full';
    } else {
        // Set library mode for lite access
        window.libraryMode = 'lite';
        elements.libraryMode.textContent = 'Library Lite';
    }
    
    showPage('libraryApp');
    
    // Initialize the main library app
    if (window.initializeLibraryApp) {
        window.initializeLibraryApp();
    }
}

// Error message helper
function getErrorMessage(error) {
    switch (error.code) {
        case 'auth/user-not-found':
            return 'No account found with this email address';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later';
        default:
            return error.message || 'An unexpected error occurred';
    }
}

// Event Listeners
function bindAuthEvents() {
    // Form navigation
    document.getElementById('showRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('registerForm');
    });
    
    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('loginForm');
    });
    
    document.getElementById('showForgotPassword')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('forgotPasswordForm');
    });
    
    document.getElementById('backToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthForm('loginForm');
    });
    
    // Form submissions
    elements.loginFormElement?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        handleLogin(email, password);
    });
    
    elements.registerFormElement?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        handleRegister(name, username, email, password, confirmPassword);
    });
    
    elements.forgotPasswordFormElement?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        handleForgotPassword(email);
    });
    
    // Library selection
    document.getElementById('libraryLite')?.addEventListener('click', () => {
        enterLibrary('lite');
    });
    
    document.getElementById('libraryFull')?.addEventListener('click', () => {
        enterLibrary('full');
    });
    
    // Navigation buttons
    document.getElementById('signOutBtn')?.addEventListener('click', handleSignOut);
    document.getElementById('logoutBtn')?.addEventListener('click', handleSignOut);
    document.getElementById('switchLibraryBtn')?.addEventListener('click', () => {
        showPage('librarySelection');
    });
    
    // LAN denied page
    document.getElementById('backToSelectionBtn')?.addEventListener('click', () => {
        showPage('librarySelection');
    });
    
    document.getElementById('tryLibraryLiteBtn')?.addEventListener('click', () => {
        enterLibrary('lite');
    });
    
    // Profile modal
    document.getElementById('editProfileBtn')?.addEventListener('click', () => {
        document.getElementById('profileName').value = userProfile?.name || '';
        document.getElementById('profileUsername').value = userProfile?.username || '';
        document.getElementById('profileEmail').value = currentUser?.email || '';
        elements.profileModal.style.display = 'flex';
    });
    
    document.getElementById('closeProfileModalBtn')?.addEventListener('click', () => {
        elements.profileModal.style.display = 'none';
    });
    
    document.getElementById('cancelProfileBtn')?.addEventListener('click', () => {
        elements.profileModal.style.display = 'none';
    });
    
    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profileName').value;
        const username = document.getElementById('profileUsername').value;
        await updateUserProfile(name, username);
        elements.profileModal.style.display = 'none';
    });
    
    // Admin panel
    document.getElementById('adminPanelBtn')?.addEventListener('click', () => {
        elements.adminModal.style.display = 'flex';
        loadPendingUsers();
        loadApprovedUsers();
    });
    
    document.getElementById('closeAdminModalBtn')?.addEventListener('click', () => {
        elements.adminModal.style.display = 'none';
    });
    
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            document.getElementById('pendingUsersTab').style.display = tabName === 'pending' ? 'block' : 'none';
            document.getElementById('approvedUsersTab').style.display = tabName === 'approved' ? 'block' : 'none';
        });
    });
    
    // Modal backdrop clicks
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Initialize Authentication
async function initAuth() {
    bindAuthEvents();
    
    // Listen for auth state changes
    onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (user) {
            currentUser = user;
            showLoading(true, 'Loading profile...');
            
            const profile = await loadUserProfile(user);
            showLoading(false);
            
            if (!profile) {
                showError('Failed to load user profile');
                handleSignOut();
                return;
            }
            
            if (!profile.approved && !profile.isAdmin) {
                showAuthForm('pendingApproval');
                return;
            }
            
            // User is approved, show library selection
            showPage('librarySelection');
            
        } else {
            currentUser = null;
            userProfile = null;
            isAdmin = false;
            showPage('authPage');
            showAuthForm('loginForm');
        }
    });
}

// Export functions for use in other modules
window.authModule = {
    initAuth,
    currentUser: () => currentUser,
    userProfile: () => userProfile,
    isAdmin: () => isAdmin,
    checkLANAccess,
    enterLibrary
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}