// Library Full JavaScript - Flask HTTPS version
let allBooks = [];
let filteredBooks = [];
let currentUser = null;

// Get Raspberry Pi URL from config.js
// Make sure config.js has: const RASPBERRY_PI_URL = 'https://10.25.136.207:5000';
const API_URL = window.RASPBERRY_PI_URL || 'https://10.25.136.207:5000';

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists || !userDoc.data().approved) {
                await auth.signOut();
                window.location.href = 'index.html';
                return;
            }
            
            currentUser = userDoc.data();
            
            // Show upload section for moderators/admins
            if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
                const uploadSection = document.getElementById('upload-section');
                if (uploadSection) {
                    uploadSection.classList.remove('hidden');
                }
            }
            
            // Check hash for upload section
            if (window.location.hash === '#upload') {
                showUploadForm();
            }
            
            checkServerConnection();
            loadLibrary();
            
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
    
    // Search
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    const fieldFilter = document.getElementById('field-filter');
    if (fieldFilter) {
        fieldFilter.addEventListener('change', performSearch);
    }
    
    // Upload form
    const showUploadBtn = document.getElementById('show-upload-btn');
    if (showUploadBtn) {
        showUploadBtn.addEventListener('click', showUploadForm);
    }
    
    const cancelUploadBtn = document.getElementById('cancel-upload-btn');
    if (cancelUploadBtn) {
        cancelUploadBtn.addEventListener('click', hideUploadForm);
    }
    
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }
});

async function checkServerConnection() {
    const statusEl = document.getElementById('server-status');
    if (!statusEl) return;
    
    try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
            statusEl.innerHTML = '<span style="color: #10b981;">● Connected to Library Full</span>';
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        statusEl.innerHTML = '<span style="color: #ef4444;">● Not connected - Please ensure you are on the local network</span>';
        console.error('Server connection error:', error);
    }
}

async function loadLibrary() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/metadata`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch metadata');
        }
        
        const data = await response.json();
        allBooks = data.books || [];
        filteredBooks = allBooks;
        
        populateFilters();
        displayBooks(filteredBooks);
        
    } catch (error) {
        console.error('Error loading library:', error);
        const grid = document.getElementById('books-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="alert alert-error" style="grid-column: 1 / -1;">
                    <p><strong>Connection Error</strong></p>
                    <p>Could not connect to Library Full server. Please ensure:</p>
                    <ul style="margin-left: 2rem;">
                        <li>You are connected to the local network</li>
                        <li>The Raspberry Pi server is running</li>
                        <li>You've accepted the HTTPS certificate at: ${API_URL}/api/health</li>
                    </ul>
                    <p style="margin-top: 1rem;">
                        <a href="${API_URL}/api/health" target="_blank" class="btn btn-primary">
                            Open Server & Accept Certificate
                        </a>
                    </p>
                </div>
            `;
        }
    } finally {
        showLoading(false);
    }
}

function populateFilters() {
    if (!Array.isArray(allBooks) || allBooks.length === 0) {
        return;
    }
    
    try {
        // Populate field filter
        const fields = [...new Set(allBooks.map(b => b.field))];
        const fieldFilter = document.getElementById('field-filter');
        
        if (fieldFilter) {
            // Clear existing options except the first one
            while (fieldFilter.options.length > 1) {
                fieldFilter.remove(1);
            }
            
            fields.forEach(field => {
                const option = document.createElement('option');
                option.value = field;
                option.textContent = field;
                fieldFilter.appendChild(option);
            });
        }
        
        // Populate tag filters
        const allTags = [...new Set(allBooks.flatMap(b => b.tags || []))];
        const filtersContainer = document.getElementById('filters');
        
        if (filtersContainer) {
            filtersContainer.innerHTML = '';
            
            allTags.forEach(tag => {
                if (tag) {
                    const chip = document.createElement('div');
                    chip.className = 'filter-chip';
                    chip.textContent = tag;
                    chip.onclick = () => toggleTagFilter(tag, chip);
                    filtersContainer.appendChild(chip);
                }
            });
        }
        
    } catch (error) {
        console.error('Error populating filters:', error);
    }
}

let activeTagFilters = new Set();

function toggleTagFilter(tag, chipEl) {
    if (activeTagFilters.has(tag)) {
        activeTagFilters.delete(tag);
        chipEl.classList.remove('active');
    } else {
        activeTagFilters.add(tag);
        chipEl.classList.add('active');
    }
    performSearch();
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const fieldFilter = document.getElementById('field-filter');
    
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const fieldFilterValue = fieldFilter ? fieldFilter.value : '';
    
    filteredBooks = allBooks.filter(book => {
        const matchesQuery = !query || 
            (book.title && book.title.toLowerCase().includes(query)) ||
            (book.author && book.author.toLowerCase().includes(query)) ||
            (book.tags && book.tags.some(tag => tag && tag.toLowerCase().includes(query)));
        
        const matchesField = !fieldFilterValue || book.field === fieldFilterValue;
        
        const matchesTags = activeTagFilters.size === 0 || 
            (book.tags && Array.from(activeTagFilters).some(tag => book.tags.includes(tag)));
        
        return matchesQuery && matchesField && matchesTags;
    });
    
    displayBooks(filteredBooks);
}

function displayBooks(books) {
    const grid = document.getElementById('books-grid');
    const noResults = document.getElementById('no-results');
    
    if (!grid) return;
    
    if (!books || books.length === 0) {
        grid.innerHTML = '';
        if (noResults) {
            noResults.classList.remove('hidden');
        }
        return;
    }
    
    if (noResults) {
        noResults.classList.add('hidden');
    }
    
    const isModerator = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
    
    grid.innerHTML = books.map(book => `
        <div class="book-card">
            <div class="book-icon">${book.type === 'book' ? '📖' : '📄'}</div>
            <div class="book-title">${escapeHtml(book.title)}</div>
            <div class="book-author">${escapeHtml(book.author)}</div>
            <div class="book-meta">
                <span class="tag">${escapeHtml(book.field)}</span>
                <span class="tag">${escapeHtml(book.filesize)}</span>
            </div>
            <div class="book-meta">
                ${(book.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="book-actions">
                <button class="btn btn-primary" onclick="downloadBook('${escapeHtml(book.id)}')">Download</button>
                ${isModerator ? `<button class="btn btn-secondary" onclick="editBook('${escapeHtml(book.id)}')">Edit</button>` : ''}
            </div>
        </div>
    `).join('');
}

function downloadBook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    // Save to recent activity
    if (window.saveRecentActivity) {
        window.saveRecentActivity({
            id: book.id,
            title: book.title,
            author: book.author,
            type: book.type
        });
    }
    
    // Download from Raspberry Pi
    window.open(`${API_URL}/api/books/${bookId}/download`, '_blank');
}

function editBook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    const newTitle = prompt('Enter new title:', book.title);
    if (!newTitle) return;
    
    const newAuthor = prompt('Enter new author:', book.author);
    if (!newAuthor) return;
    
    const newTags = prompt('Enter tags (comma-separated):', (book.tags || []).join(', '));
    if (newTags === null) return;
    
    updateBookMetadata(bookId, {
        title: newTitle,
        author: newAuthor,
        tags: newTags.split(',').map(t => t.trim())
    });
}

async function updateBookMetadata(bookId, updates) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update book');
        }
        
        alert('Book updated successfully!');
        loadLibrary();
        
    } catch (error) {
        console.error('Error updating book:', error);
        alert(`Failed to update book: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showUploadForm() {
    const formContainer = document.getElementById('upload-form-container');
    const showBtn = document.getElementById('show-upload-btn');
    
    if (formContainer) {
        formContainer.classList.remove('hidden');
    }
    if (showBtn) {
        showBtn.classList.add('hidden');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideUploadForm() {
    const formContainer = document.getElementById('upload-form-container');
    const showBtn = document.getElementById('show-upload-btn');
    const form = document.getElementById('upload-form');
    
    if (formContainer) {
        formContainer.classList.add('hidden');
    }
    if (showBtn) {
        showBtn.classList.remove('hidden');
    }
    if (form) {
        form.reset();
    }
}

async function handleUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-input');
    const file = fileInput ? fileInput.files[0] : null;
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const titleInput = document.getElementById('title-input');
    const authorInput = document.getElementById('author-input');
    const fieldInput = document.getElementById('field-input');
    const tagsInput = document.getElementById('tags-input');
    const typeInput = document.getElementById('type-input');
    
    if (titleInput) formData.append('title', titleInput.value);
    if (authorInput) formData.append('author', authorInput.value);
    if (fieldInput) formData.append('field', fieldInput.value);
    if (tagsInput) formData.append('tags', tagsInput.value);
    if (typeInput) formData.append('type', typeInput.value);
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/books`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        alert('Book uploaded successfully!');
        hideUploadForm();
        loadLibrary();
        
    } catch (error) {
        console.error('Error uploading book:', error);
        alert(`Failed to upload book: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}