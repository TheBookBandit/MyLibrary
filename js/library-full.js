// Library Full JavaScript - Nginx + Node.js Upload Server version
let allBooks = [];
let filteredBooks = [];
let currentUser = null;
const UPLOAD_SERVER_URL = 'http://10.25.136.207:3000'; // Update with your Pi IP

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '/index.html';
            return;
        }
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || !userDoc.data().approved) {
            await auth.signOut();
            window.location.href = '/index.html';
            return;
        }
        
        currentUser = userDoc.data();
        
        // Show upload section for moderators/admins
        if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
            document.getElementById('upload-section').classList.remove('hidden');
        }
        
        // Check hash for upload section
        if (window.location.hash === '#upload') {
            showUploadForm();
        }
        
        checkServerStatus();
        loadLibrary();
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = '/index.html';
    });
    
    // Search
    document.getElementById('search-btn')?.addEventListener('click', performSearch);
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    document.getElementById('field-filter')?.addEventListener('change', performSearch);
    
    // Upload form
    document.getElementById('show-upload-btn')?.addEventListener('click', showUploadForm);
    document.getElementById('cancel-upload-btn')?.addEventListener('click', hideUploadForm);
    document.getElementById('upload-form')?.addEventListener('submit', handleUpload);
});

async function checkServerStatus() {
    const statusEl = document.getElementById('server-status');
    
    try {
        const response = await fetch(`${UPLOAD_SERVER_URL}/api/health`);
        if (response.ok) {
            statusEl.innerHTML = '<span style="color: #10b981;">● Server connected</span>';
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        statusEl.innerHTML = '<span style="color: #ef4444;">● Server not responding</span>';
        console.warn('Upload server not available - uploads will not work');
    }
}

async function loadLibrary() {
    showLoading(true);
    
    try {
        // Fetch metadata as static JSON file from Nginx
        const response = await fetch('/data/metadata-full.json');
        
        if (!response.ok) {
            throw new Error('Failed to load metadata');
        }
        
        const data = await response.json();
        allBooks = data.books || [];
        filteredBooks = allBooks;
        
        populateFilters();
        displayBooks(filteredBooks);
        
    } catch (error) {
        console.error('Error loading library:', error);
        document.getElementById('books-grid').innerHTML = `
            <div class="alert alert-error">
                <p><strong>Error Loading Library</strong></p>
                <p>Could not load metadata file. Please check if metadata-full.json exists.</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</p>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

function populateFilters() {
    // Populate field filter
    const fields = [...new Set(allBooks.map(b => b.field))];
    const fieldFilter = document.getElementById('field-filter');
    
    fields.forEach(field => {
        const option = document.createElement('option');
        option.value = field;
        option.textContent = field;
        fieldFilter.appendChild(option);
    });
    
    // Populate tag filters
    const allTags = [...new Set(allBooks.flatMap(b => b.tags))];
    const filtersContainer = document.getElementById('filters');
    
    allTags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.textContent = tag;
        chip.onclick = () => toggleTagFilter(tag, chip);
        filtersContainer.appendChild(chip);
    });
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
    const query = document.getElementById('search-input').value.toLowerCase();
    const fieldFilter = document.getElementById('field-filter').value;
    
    filteredBooks = allBooks.filter(book => {
        const matchesQuery = !query || 
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query) ||
            book.tags.some(tag => tag.toLowerCase().includes(query));
        
        const matchesField = !fieldFilter || book.field === fieldFilter;
        
        const matchesTags = activeTagFilters.size === 0 || 
            Array.from(activeTagFilters).some(tag => book.tags.includes(tag));
        
        return matchesQuery && matchesField && matchesTags;
    });
    
    displayBooks(filteredBooks);
}

function displayBooks(books) {
    const grid = document.getElementById('books-grid');
    const noResults = document.getElementById('no-results');
    
    if (books.length === 0) {
        grid.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    
    const isModerator = currentUser.role === 'admin' || currentUser.role === 'moderator';
    
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
                ${book.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="book-actions">
                <button class="btn btn-primary" onclick="downloadBook('${book.id}')">Download</button>
                ${isModerator ? `<button class="btn btn-secondary" onclick="editBook('${book.id}')">Edit</button>` : ''}
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
    
    // Download from local server
    const link = document.createElement('a');
    link.href = `/data/books-full/${book.path}`;
    link.download = book.filename;
    link.click();
}

function editBook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    const newTitle = prompt('Enter new title:', book.title);
    if (!newTitle) return;
    
    const newAuthor = prompt('Enter new author:', book.author);
    if (!newAuthor) return;
    
    const newTags = prompt('Enter tags (comma-separated):', book.tags.join(', '));
    if (!newTags) return;
    
    updateBookMetadata(bookId, {
        title: newTitle,
        author: newAuthor,
        tags: newTags.split(',').map(t => t.trim())
    });
}

async function updateBookMetadata(bookId, updates) {
    showLoading(true);
    
    try {
        const response = await fetch(`${UPLOAD_SERVER_URL}/api/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update book');
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
    document.getElementById('upload-form-container').classList.remove('hidden');
    document.getElementById('show-upload-btn').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideUploadForm() {
    document.getElementById('upload-form-container').classList.add('hidden');
    document.getElementById('show-upload-btn').classList.remove('hidden');
    document.getElementById('upload-form').reset();
}

async function handleUpload(e) {
    e.preventDefault();
    
    const file = document.getElementById('file-input').files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', document.getElementById('title-input').value);
    formData.append('author', document.getElementById('author-input').value);
    formData.append('field', document.getElementById('field-input').value);
    formData.append('tags', document.getElementById('tags-input').value);
    formData.append('type', document.getElementById('type-input').value);
    
    showLoading(true);
    
    try {
        const response = await fetch(`${UPLOAD_SERVER_URL}/api/upload`, {
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
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}