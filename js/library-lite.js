// Library Lite JavaScript
let allBooks = [];
let filteredBooks = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || !userDoc.data().approved) {
            await auth.signOut();
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = userDoc.data();
        loadLibrary();
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await auth.signOut();
        window.location.href = 'index.html';
    });
    
    // Search
    document.getElementById('search-btn')?.addEventListener('click', performSearch);
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    document.getElementById('field-filter')?.addEventListener('change', performSearch);
    
    // Close modal
    document.getElementById('close-modal')?.addEventListener('click', closeModal);
});

async function loadLibrary() {
    showLoading(true);
    
    try {
        const response = await fetch('data/metadata-lite.json');
        const data = await response.json();
        allBooks = data.books;
        filteredBooks = allBooks;
        
        populateFilters();
        displayBooks(filteredBooks);
    } catch (error) {
        console.error('Error loading library:', error);
        alert('Failed to load library. Please try again.');
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
        // Text search
        const matchesQuery = !query || 
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query) ||
            book.tags.some(tag => tag.toLowerCase().includes(query));
        
        // Field filter
        const matchesField = !fieldFilter || book.field === fieldFilter;
        
        // Tag filters
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
                <button class="btn btn-primary" onclick="viewBook('${book.id}')">
                    ${getFileSize(book.filesize) < PDF_SIZE_LIMIT ? 'View' : 'Download'}
                </button>
                <button class="btn btn-secondary" onclick="downloadBook('${book.id}')">Download</button>
            </div>
        </div>
    `).join('');
}

function getFileSize(filesizeStr) {
    const match = filesizeStr.match(/([0-9.]+)\s*(B|KB|MB|GB)/);
    if (!match) return Infinity;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    const multipliers = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
    return value * multipliers[unit];
}

function viewBook(bookId) {
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
    
    const fileSize = getFileSize(book.filesize);
    
    if (fileSize < PDF_SIZE_LIMIT) {
        // Open in modal viewer
        openPdfModal(book);
    } else {
        // Download instead
        downloadBook(bookId);
    }
}

function openPdfModal(book) {
    const modal = document.getElementById('pdf-modal');
    const viewer = document.getElementById('pdf-viewer');
    const title = document.getElementById('pdf-title');
    
    title.textContent = book.title;
    
    // Use PDF.js viewer if available, otherwise use iframe
    const pdfPath = `data/books-lite/${book.path}`;
    
    // Check if PDF.js is available
    if (typeof PDFViewerApplication !== 'undefined') {
        viewer.src = `pdfjs/web/viewer.html?file=${encodeURIComponent('../../' + pdfPath)}`;
    } else {
        viewer.src = pdfPath;
    }
    
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('pdf-modal');
    const viewer = document.getElementById('pdf-viewer');
    
    modal.classList.add('hidden');
    viewer.src = '';
}

function downloadBook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) return;
    
    const link = document.createElement('a');
    link.href = `data/books-lite/${book.path}`;
    link.download = book.filename;
    link.click();
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