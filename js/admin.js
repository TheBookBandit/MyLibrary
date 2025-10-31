// Admin Panel JavaScript - Updated with user management
let currentUser = null;
let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and admin status
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                await auth.signOut();
                window.location.href = 'index.html';
                return;
            }
            
            currentUser = userDoc.data();
            
            // Check if user is admin
            if (currentUser.role !== 'admin') {
                document.body.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <h1>Access Denied</h1>
                        <p>You do not have permission to access the admin panel.</p>
                        <a href="dashboard.html" class="btn btn-primary">Go to Dashboard</a>
                    </div>
                `;
                return;
            }
            
            // User is admin, load content
            loadAdminContent();
            
        } catch (error) {
            console.error('Error checking user:', error);
            await auth.signOut();
            window.location.href = 'index.html';
        }
    });
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            window.location.href = 'index.html';
        });
    }
    
    // Tab navigation
    const tabs = document.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
        tab.addEventListener('click', switchTab);
    });
});

function switchTab(e) {
    const tabName = e.target.getAttribute('data-tab');
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    e.target.classList.add('active');
    
    // Load data based on tab
    if (tabName === 'pending-approvals') {
        loadPendingUsers();
    } else if (tabName === 'all-users') {
        loadAllUsers();
    }
}

function loadAdminContent() {
    // Load pending users by default
    loadPendingUsers();
}

async function loadPendingUsers() {
    try {
        const snapshot = await db.collection('users')
            .where('approved', '==', false)
            .orderBy('createdAt', 'desc')
            .get();
        
        const pendingContainer = document.getElementById('pending-users-list');
        if (!pendingContainer) return;
        
        if (snapshot.empty) {
            pendingContainer.innerHTML = '<p style="text-align: center; color: #6b7280;">No pending approvals</p>';
            return;
        }
        
        let html = '<table class="users-table"><thead><tr><th>Email</th><th>Name</th><th>Created</th><th>Actions</th></tr></thead><tbody>';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            const createdDate = user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A';
            
            html += `
                <tr>
                    <td>${escapeHtml(user.email)}</td>
                    <td>${escapeHtml(user.name || 'N/A')}</td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="btn btn-small btn-success" onclick="approveUser('${doc.id}')">
                            Approve
                        </button>
                        <button class="btn btn-small btn-danger" onclick="rejectUser('${doc.id}')">
                            Reject
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        pendingContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading pending users:', error);
        const pendingContainer = document.getElementById('pending-users-list');
        if (pendingContainer) {
            pendingContainer.innerHTML = `<div class="alert alert-error">Error loading pending users: ${error.message}</div>`;
        }
    }
}

async function loadAllUsers() {
    try {
        const snapshot = await db.collection('users')
            .where('approved', '==', true)
            .orderBy('createdAt', 'desc')
            .get();
        
        const allUsersContainer = document.getElementById('all-users-list');
        if (!allUsersContainer) return;
        
        if (snapshot.empty) {
            allUsersContainer.innerHTML = '<p style="text-align: center; color: #6b7280;">No approved users</p>';
            return;
        }
        
        let html = '<table class="users-table"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead><tbody>';
        
        snapshot.forEach(doc => {
            const user = doc.data();
            const createdDate = user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString() : 'N/A';
            const role = user.role || 'user';
            
            html += `
                <tr>
                    <td>${escapeHtml(user.email)}</td>
                    <td>${escapeHtml(user.name || 'N/A')}</td>
                    <td>
                        <span class="badge badge-${role}">${role}</span>
                    </td>
                    <td>${createdDate}</td>
                    <td>
                        ${role === 'admin' ? '<span style="color: #999;">Admin</span>' : `
                            <button class="btn btn-small btn-primary" onclick="promoteModerator('${doc.id}')">
                                Make Moderator
                            </button>
                        `}
                        <button class="btn btn-small btn-danger" onclick="removeUser('${doc.id}')">
                            Remove
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        allUsersContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading all users:', error);
        const allUsersContainer = document.getElementById('all-users-list');
        if (allUsersContainer) {
            allUsersContainer.innerHTML = `<div class="alert alert-error">Error loading users: ${error.message}</div>`;
        }
    }
}

async function approveUser(userId) {
    if (!confirm('Are you sure you want to approve this user?')) {
        return;
    }
    
    try {
        await db.collection('users').doc(userId).update({
            approved: true,
            approvedAt: new Date(),
            role: 'user'
        });
        
        alert('User approved successfully!');
        loadPendingUsers();
        
    } catch (error) {
        console.error('Error approving user:', error);
        alert(`Failed to approve user: ${error.message}`);
    }
}

async function rejectUser(userId) {
    if (!confirm('Are you sure you want to reject this user? This cannot be undone.')) {
        return;
    }
    
    try {
        await db.collection('users').doc(userId).delete();
        alert('User rejected and removed successfully!');
        loadPendingUsers();
        
    } catch (error) {
        console.error('Error rejecting user:', error);
        alert(`Failed to reject user: ${error.message}`);
    }
}

async function promoteModerator(userId) {
    if (!confirm('Are you sure you want to make this user a moderator?')) {
        return;
    }
    
    try {
        await db.collection('users').doc(userId).update({
            role: 'moderator'
        });
        
        alert('User promoted to moderator!');
        loadAllUsers();
        
    } catch (error) {
        console.error('Error promoting user:', error);
        alert(`Failed to promote user: ${error.message}`);
    }
}

async function removeUser(userId) {
    if (!confirm('Are you sure you want to remove this user? This cannot be undone.')) {
        return;
    }
    
    try {
        await db.collection('users').doc(userId).delete();
        alert('User removed successfully!');
        loadAllUsers();
        
    } catch (error) {
        console.error('Error removing user:', error);
        alert(`Failed to remove user: ${error.message}`);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}