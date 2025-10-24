// auth.js - Fixed Firebase Authentication Module
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
    deleteDoc,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Application State
let currentUser = null;
let userProfile = null;
let isAdmin = false;

// Default admin email - Change this to your email
const ADMIN_EMAIL = 'sandipansamanta2004@gmail.com'; // CHANGE THIS

// Raspberry Pi server configuration
const PI_SERVER_CONFIG = {
    host: '192.168.1.100', // CHANGE TO YOUR PI'S IP
    port: 8080,
    protocol: 'http'
};

// UI Elements
const elements = {
    authPage: document.getElementById('authPage'),
    librarySelection: document.getElementById('librarySelection'),
    lanDenied: document.getElementById('lanDenied'),
    libraryApp: document.getElementById('libraryApp'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    forgotPasswordForm: document.getElementById('forgotPasswordForm'),
    pendingApproval: document.getElementById('pendingApproval'),
    loadingAuth: document.getElementById('loadingAuth'),
    loginFormElement: document.getElementById('loginFormElement'),
    registerFormElement: document.getElementById('registerFormElement'),
    forgotPasswordFormElement: document.getElementById('forgotPasswordFormElement'),
    userName: document.getElementById('userName'),
    libraryMode: document.getElementById('libraryMode'),
    profileModal: document.getElementById('profileModal'),
    adminModal: document.getElementById('adminModal'),
    pendingUsersList: document.getElementById('pendingUsersList'),
    approvedUsersList: document.getElementById('approvedUsersList')
};

// Utility Functions
function showPage(pageId) {
    const pages = ['authPage', 'librarySelection', 'lanDenied', 'libraryApp'];
    pages.forEach(page => {
        const el = document.getElementById(page);
        if (el) el.style.display = page === pageId ? 'block' : 'none';
    });
}

function showAuthForm(formName) {
    const forms = ['loginForm', 'registerForm', 'forgotPasswordForm', 'pendingApproval'];
    forms.forEach(form => {
        const el = document.getElementById(form);
        if (el) el.style.display = form === formName ? 'block' : 'none';
    });
}

function showLoading(show, message = 'Please wait...') {
    if (elements.loadingAuth) {
        elements.loadingAuth.style.display = show ? 'block' : 'none';
        const loadingText = elements.loadingAuth.querySelector('p');
        if (show && loadingText) loadingText.textContent = message;
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
        await signInWithEmailAndPassword(window.firebaseAuth, email, password);
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
        
        console.log('Step 1: Checking username availability...');
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
        
        console.log('Step 2: Creating Firebase Auth user...');
        const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        const user = userCredential.user;
        console.log('User created with UID:', user.uid);
        
        console.log('Step 3: Updating display name...');
        await updateProfile(user, { displayName: name });
        
        console.log('Step 4: Creating Firestore profile document...');
        await setDoc(doc(window.firebaseDb, 'users', user.uid), {
            name: name,
            username: username,
            email: email,
            approved: email === ADMIN_EMAIL,
            isAdmin: email === ADMIN_EMAIL,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('Firestore profile created successfully');
        
        console.log('Step 5: Creating notification...');
        if (email !== ADMIN_EMAIL) {
            try {
                await addDoc(collection(window.firebaseDb, 'notifications'), {
                    type: 'new_user_registration',
                    userId: user.uid,
                    userName: name,
                    userEmail: email,
                    message: `New user ${name} (${email}) has registered and is awaiting approval.`,
                    read: false,
                    createdAt: new Date()
                });
                console.log('Notification created');
            } catch (notifError) {
                console.log('Notification creation failed (non-critical):', notifError);
            }
        }
        
        showLoading(false);
        showSuccess('Registration successful! ' + (email === ADMIN_EMAIL ? 'Admin account created.' : 'Please wait for admin approval.'));
        
    } catch (error) {
        console.error('Registration error at:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
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
            if (elements.userName) {
                elements.userName.textContent = userProfile.name || user.displayName || 'User';
            }
            
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
        if (elements.userName) {
            elements.userName.textContent = name;
        }
        
        showSuccess('Profile updated successfully');
    } catch (error) {
        showError(getErrorMessage(error));
    }
}

// Admin Functions - FIXED to avoid index requirements
async function loadPendingUsers() {
    try {
        // Simplified query without orderBy to avoid index requirement
        const pendingQuery = query(
            collection(window.firebaseDb, 'users'),
            where('approved', '==', false)
        );
        const snapshot = await getDocs(pendingQuery);
        
        if (elements.pendingUsersList) {
            elements.pendingUsersList.innerHTML = '';
            
            if (snapshot.empty) {
                elements.pendingUsersList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No pending users</p>';
                return;
            }
            
            // Collect and sort manually
            const users = [];
            snapshot.forEach(doc => {
                const user = doc.data();
                // Filter out admin users
                if (!user.isAdmin) {
                    users.push({ id: doc.id, data: user });
                }
            });
            
            // Sort by createdAt descending (newest first)
            users.sort((a, b) => {
                const aTime = a.data.createdAt?.toMillis ? a.data.createdAt.toMillis() : 0;
                const bTime = b.data.createdAt?.toMillis ? b.data.createdAt.toMillis() : 0;
                return bTime - aTime;
            });
            
            if (users.length === 0) {
                elements.pendingUsersList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No pending users</p>';
                return;
            }
            
            users.forEach(({ id, data }) => {
                const userCard = createUserCard(id, data, true);
                elements.pendingUsersList.appendChild(userCard);
            });
        }
    } catch (error) {
        console.error('Error loading pending users:', error);
        if (elements.pendingUsersList) {
            elements.pendingUsersList.innerHTML = '<p style="text-align: center; color: var(--danger-color); padding: 2rem;">Error loading pending users</p>';
        }
        showError('Failed to load pending users: ' + error.message);
    }
}

async function loadApprovedUsers() {
    try {
        // Simplified query without orderBy to avoid index requirement
        const approvedQuery = query(
            collection(window.firebaseDb, 'users'),
            where('approved', '==', true)
        );
        const snapshot = await getDocs(approvedQuery);
        
        if (elements.approvedUsersList) {
            elements.approvedUsersList.innerHTML = '';
            
            // Collect and sort manually
            const users = [];
            snapshot.forEach(doc => {
                const user = doc.data();
                users.push({ id: doc.id, data: user });
            });
            
            // Sort by createdAt descending (newest first)
            users.sort((a, b) => {
                const aTime = a.data.createdAt?.toMillis ? a.data.createdAt.toMillis() : 0;
                const bTime = b.data.createdAt?.toMillis ? b.data.createdAt.toMillis() : 0;
                return bTime - aTime;
            });
            
            if (users.length === 0) {
                elements.approvedUsersList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No approved users yet</p>';
                return;
            }
            
            users.forEach(({ id, data }) => {
                const userCard = createUserCard(id, data, false);
                elements.approvedUsersList.appendChild(userCard);
            });
        }
    } catch (error) {
        console.error('Error loading approved users:', error);
        if (elements.approvedUsersList) {
            elements.approvedUsersList.innerHTML = '<p style="text-align: center; color: var(--danger-color); padding: 2rem;">Error loading approved users</p>';
        }
        showError('Failed to load approved users: ' + error.message);
    }
}

function createUserCard(userId, user, isPending) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    const createdDate = user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'Unknown';
    
    userInfo.innerHTML = `
        <h4>${user.name || 'No Name'} (@${user.username || 'no-username'})</h4>
        <p>${user.email || 'No email'}</p>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Registered: ${createdDate}</p>
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
        showError('Failed to approve user: ' + error.message);
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
        showError('Failed to reject user: ' + error.message);
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
        showError('Failed to revoke user access: ' + error.message);
    }
}

// Library Access Functions
async function checkLANAccess() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${PI_SERVER_CONFIG.protocol}://${PI_SERVER_CONFIG.host}:${PI_SERVER_CONFIG.port}/health`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
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
        window.libraryMode = 'full';
        if (elements.libraryMode) elements.libraryMode.textContent = 'Library Full';
    } else {
        window.libraryMode = 'lite';
        if (elements.libraryMode) elements.libraryMode.textContent = 'Library Lite';
    }
    
    showPage('libraryApp');
    
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
    const showRegisterBtn = document.getElementById('showRegister');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthForm('registerForm');
        });
    }
    
    const showLoginBtn = document.getElementById('showLogin');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthForm('loginForm');
        });
    }
    
    const showForgotPasswordBtn = document.getElementById('showForgotPassword');
    if (showForgotPasswordBtn) {
        showForgotPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthForm('forgotPasswordForm');
        });
    }
    
    const backToLoginBtn = document.getElementById('backToLogin');
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthForm('loginForm');
        });
    }
    
    // Form submissions
    if (elements.loginFormElement) {
        elements.loginFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            handleLogin(email, password);
        });
    }
    
    if (elements.registerFormElement) {
        elements.registerFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            handleRegister(name, username, email, password, confirmPassword);
        });
    }
    
    if (elements.forgotPasswordFormElement) {
        elements.forgotPasswordFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value;
            handleForgotPassword(email);
        });
    }
    
    // Library selection
    const libraryLite = document.getElementById('libraryLite');
    if (libraryLite) {
        libraryLite.addEventListener('click', () => enterLibrary('lite'));
    }
    
    const libraryFull = document.getElementById('libraryFull');
    if (libraryFull) {
        libraryFull.addEventListener('click', () => enterLibrary('full'));
    }
    
    // Navigation buttons
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleSignOut);
    
    const switchLibraryBtn = document.getElementById('switchLibraryBtn');
    if (switchLibraryBtn) {
        switchLibraryBtn.addEventListener('click', () => showPage('librarySelection'));
    }
    
    // LAN denied page
    const backToSelectionBtn = document.getElementById('backToSelectionBtn');
    if (backToSelectionBtn) {
        backToSelectionBtn.addEventListener('click', () => showPage('librarySelection'));
    }
    
    const tryLibraryLiteBtn = document.getElementById('tryLibraryLiteBtn');
    if (tryLibraryLiteBtn) {
        tryLibraryLiteBtn.addEventListener('click', () => enterLibrary('lite'));
    }
    
    // Profile modal
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            document.getElementById('profileName').value = userProfile?.name || '';
            document.getElementById('profileUsername').value = userProfile?.username || '';
            document.getElementById('profileEmail').value = currentUser?.email || '';
            if (elements.profileModal) elements.profileModal.style.display = 'flex';
        });
    }
    
    const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
    if (closeProfileModalBtn) {
        closeProfileModalBtn.addEventListener('click', () => {
            if (elements.profileModal) elements.profileModal.style.display = 'none';
        });
    }
    
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', () => {
            if (elements.profileModal) elements.profileModal.style.display = 'none';
        });
    }
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('profileName').value;
            const username = document.getElementById('profileUsername').value;
            await updateUserProfile(name, username);
            if (elements.profileModal) elements.profileModal.style.display = 'none';
        });
    }
    
    // Admin panel
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            if (elements.adminModal) elements.adminModal.style.display = 'flex';
            loadPendingUsers();
            loadApprovedUsers();
        });
    }
    
    const closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
    if (closeAdminModalBtn) {
        closeAdminModalBtn.addEventListener('click', () => {
            if (elements.adminModal) elements.adminModal.style.display = 'none';
        });
    }
    
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const pendingTab = document.getElementById('pendingUsersTab');
            const approvedTab = document.getElementById('approvedUsersTab');
            
            if (pendingTab) pendingTab.style.display = tabName === 'pending' ? 'block' : 'none';
            if (approvedTab) approvedTab.style.display = tabName === 'approved' ? 'block' : 'none';
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

// Export functions
window.authModule = {
    initAuth,
    currentUser: () => currentUser,
    userProfile: () => userProfile,
    isAdmin: () => isAdmin,
    checkLANAccess,
    enterLibrary
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}