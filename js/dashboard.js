// Dashboard JavaScript
let currentUser = null;
let userRole = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
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
            
            const userData = userDoc.data();
            
            if (!userData.approved) {
                await auth.signOut();
                window.location.href = 'index.html';
                return;
            }
            
            currentUser = userData;
            userRole = userData.role;
            
            // Update UI
            updateUserInfo(userData);
            loadRecentActivity();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            await auth.signOut();
            window.location.href = 'index.html';
        }
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
});

function updateUserInfo(userData) {
    document.getElementById('user-name').textContent = userData.name;
    
    const roleEl = document.getElementById('user-role');
    roleEl.textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    roleEl.className = `badge badge-${userData.role}`;
    
    // Show admin/moderator sections
    if (userData.role === 'admin' || userData.role === 'moderator') {
        document.getElementById('admin-section').classList.remove('hidden');
        
        if (userData.role === 'moderator') {
            document.getElementById('moderator-card').classList.remove('hidden');
        }
    }
}

function loadRecentActivity() {
    // Load recent activity from localStorage
    const recentActivity = JSON.parse(localStorage.getItem('recentActivity') || '[]');
    const recentItemsEl = document.getElementById('recent-items');
    
    if (recentActivity.length === 0) {
        recentItemsEl.innerHTML = '<p class="text-muted">No recent activity</p>';
        return;
    }
    
    recentItemsEl.innerHTML = recentActivity
        .slice(0, 5)
        .map(item => `
            <div class="activity-item">
                <span class="activity-icon">${item.type === 'book' ? '📖' : '📄'}</span>
                <div class="activity-info">
                    <div class="activity-title">${item.title}</div>
                    <div class="activity-meta">${item.author} • ${item.date}</div>
                </div>
            </div>
        `).join('');
}

// Save recent activity
function saveRecentActivity(item) {
    let recentActivity = JSON.parse(localStorage.getItem('recentActivity') || '[]');
    
    // Remove if already exists
    recentActivity = recentActivity.filter(a => a.id !== item.id);
    
    // Add to beginning
    recentActivity.unshift({
        ...item,
        date: new Date().toLocaleDateString()
    });
    
    // Keep only last 20
    recentActivity = recentActivity.slice(0, 20);
    
    localStorage.setItem('recentActivity', JSON.stringify(recentActivity));
}

window.saveRecentActivity = saveRecentActivity;