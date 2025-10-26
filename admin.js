// Admin Panel JavaScript
let currentAdmin = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and admin role
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (!userData || !userData.approved || userData.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'dashboard.html';
            return;
        }
        
        currentAdmin = userData;
        loadPendingUsers();
        loadActiveUsers();
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'index.html';
    });
    
    // User search
    document.getElementById('user-search')?.addEventListener('input', (e) => {
        filterActiveUsers(e.target.value);
    });
});

async function loadPendingUsers() {
    const container = document.getElementById('pending-users');
    
    try {
        const pendingSnapshot = await db.collection('pendingUsers').orderBy('requestedAt', 'desc').get();
        
        if (pendingSnapshot.empty) {
            container.innerHTML = '<div class="no-users">No pending approvals</div>';
            return;
        }
        
        const pendingUsers = [];
        
        for (const doc of pendingSnapshot.docs) {
            const pendingData = doc.data();
            const userDoc = await db.collection('users').doc(doc.id).get();
            const userData = userDoc.data();
            
            // Only show if not yet approved
            if (userData && !userData.approved) {
                pendingUsers.push({
                    id: doc.id,
                    ...pendingData,
                    ...userData
                });
            }
        }
        
        if (pendingUsers.length === 0) {
            container.innerHTML = '<div class="no-users">No pending approvals</div>';
            return;
        }
        
        container.innerHTML = pendingUsers.map(user => `
            <div class="user-card">
                <div class="user-info">
                    <h3>${escapeHtml(user.name)}</h3>
                    <div class="user-meta">
                        ${escapeHtml(user.email)} • @${escapeHtml(user.username)}
                    </div>
                    <div class="user-meta">
                        Requested: ${formatDate(user.requestedAt)}
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-success" onclick="approveUser('${user.id}')">Approve</button>
                    <button class="btn btn-danger" onclick="rejectUser('${user.id}')">Reject</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading pending users:', error);
        container.innerHTML = '<div class="no-users">Error loading pending users</div>';
    }
}

let allActiveUsers = [];

async function loadActiveUsers() {
    const container = document.getElementById('active-users');
    
    try {
        const usersSnapshot = await db.collection('users')
            .where('approved', '==', true)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (usersSnapshot.empty) {
            container.innerHTML = '<div class="no-users">No active users</div>';
            return;
        }
        
        allActiveUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayActiveUsers(allActiveUsers);
        
    } catch (error) {
        console.error('Error loading active users:', error);
        container.innerHTML = '<div class="no-users">Error loading active users</div>';
    }
}

function displayActiveUsers(users) {
    const container = document.getElementById('active-users');
    
    if (users.length === 0) {
        container.innerHTML = '<div class="no-users">No users found</div>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="user-info">
                <h3>${escapeHtml(user.name)}</h3>
                <div class="user-meta">
                    ${escapeHtml(user.email)} • @${escapeHtml(user.username)}
                </div>
                <div class="user-meta">
                    Role: <span class="badge badge-${user.role}">${user.role}</span> • 
                    Joined: ${formatDate(user.createdAt)}
                </div>
            </div>
            <div class="user-actions">
                ${user.role !== 'admin' ? `
                    <select onchange="changeUserRole('${user.id}', this.value)" class="role-select">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                    </select>
                ` : '<span class="badge badge-admin">Admin</span>'}
            </div>
        </div>
    `).join('');
}

function filterActiveUsers(query) {
    const filtered = allActiveUsers.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase())
    );
    displayActiveUsers(filtered);
}

async function approveUser(userId) {
    if (!confirm('Approve this user?')) return;
    
    try {
        // Update user document
        await db.collection('users').doc(userId).update({
            approved: true
        });
        
        // Remove from pending
        await db.collection('pendingUsers').doc(userId).delete();
        
        alert('User approved successfully!');
        loadPendingUsers();
        loadActiveUsers();
        
    } catch (error) {
        console.error('Error approving user:', error);
        alert('Failed to approve user. Please try again.');
    }
}

async function rejectUser(userId) {
    if (!confirm('Reject this user? This will delete their account.')) return;
    
    try {
        // Delete from users collection
        await db.collection('users').doc(userId).delete();
        
        // Delete from pending
        await db.collection('pendingUsers').doc(userId).delete();
        
        // Note: You cannot delete the Firebase Auth user from client-side
        // This would need to be done via Firebase Admin SDK on a backend
        // For now, the user can still log in but won't have access
        
        alert('User rejected successfully!');
        loadPendingUsers();
        
    } catch (error) {
        console.error('Error rejecting user:', error);
        alert('Failed to reject user. Please try again.');
    }
}

async function changeUserRole(userId, newRole) {
    if (!confirm(`Change user role to ${newRole}?`)) {
        loadActiveUsers(); // Reset the select
        return;
    }
    
    try {
        await db.collection('users').doc(userId).update({
            role: newRole
        });
        
        alert('User role updated successfully!');
        loadActiveUsers();
        
    } catch (error) {
        console.error('Error changing user role:', error);
        alert('Failed to change user role. Please try again.');
        loadActiveUsers();
    }
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}