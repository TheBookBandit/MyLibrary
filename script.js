// DOM Elements
const categoriesContainer = document.getElementById('categories-container');
const searchBox = document.getElementById('search-box');
const pdfModal = document.getElementById('pdf-viewer-modal');
const pdfEmbed = document.getElementById('pdf-embed');
const closeBtn = document.querySelector('.close');

// Main data store
let booksCatalog = [];
let categories = {};

// Initialize library
async function initLibrary() {
    // Load book catalog
    const response = await fetch('books.json');
    booksCatalog = await response.json();

    // Organize by category
    booksCatalog.forEach(book => {
        if (!categories[book.category]) {
            categories[book.category] = [];
        }
        categories[book.category].push(book);
    });

    // Render all categories
    renderCategories();

    // Set up search
    searchBox.addEventListener('input', handleSearch);

    // Set up modal closing
    closeBtn.addEventListener('click', () => {
        pdfModal.style.display = 'none';
        pdfEmbed.src = '';
    });

    // Close modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === pdfModal) {
            pdfModal.style.display = 'none';
            pdfEmbed.src = '';
        }
    });
}

// Render categories to DOM
function renderCategories() {
    categoriesContainer.innerHTML = '';

    for (const [category, books] of Object.entries(categories)) {
        const categorySection = document.createElement('section');
        categorySection.className = 'category-section';

        categorySection.innerHTML = `
        <h2 class="category-title">${category}</h2>
        <div class="books-grid" id="grid-${category.replace(/\s+/g, '-')}"></div>
        `;

        categoriesContainer.appendChild(categorySection);

        const booksGrid = categorySection.querySelector('.books-grid');
        books.forEach(book => renderBookCard(book, booksGrid));
    }
}

// Render individual book card
function renderBookCard(book, container) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.title = book.title.toLowerCase();
    bookCard.dataset.category = book.category.toLowerCase();

    // Use placeholder if thumbnail missing
    const thumbSrc = book.thumbPath || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140"><rect width="100" height="140" fill="%233a0ca3" opacity="0.1"/><text x="50" y="70" font-family="Arial" font-size="14" fill="%233a0ca3" text-anchor="middle">📚</text><text x="50" y="100" font-family="Arial" font-size="12" fill="%233a0ca3" text-anchor="middle">${book.title.substring(0, 15)}</text></svg>';

    bookCard.innerHTML = `
    <div class="book-thumbnail">
    <img src="${thumbSrc}" alt="${book.title}">
    </div>
    <div class="book-info">
    <div class="book-title">${book.title}</div>
    <div class="book-category">${book.category}</div>
    </div>
    `;

    bookCard.addEventListener('click', () => openPDF(book.pdfPath));
    container.appendChild(bookCard);
}

// Open PDF in modal
function openPDF(pdfPath) {
    // Create URL relative to your site root
    const basePath = window.location.pathname.includes('github.io')
    ? window.location.pathname.split('/').slice(0, 3).join('/')
    : '';

    const fullPath = `${basePath}/${pdfPath}`;

    // Use your local PDF.js viewer
    const viewerURL = `pdfjs/viewer.html?file=${encodeURIComponent(fullPath)}`;

    pdfEmbed.src = viewerURL;
    pdfModal.style.display = 'block';
}

// Search functionality
function handleSearch() {
    const searchTerm = searchBox.value.trim().toLowerCase();

    document.querySelectorAll('.book-card').forEach(card => {
        const matches = searchTerm === '' ||
        card.dataset.title.includes(searchTerm) ||
        card.dataset.category.includes(searchTerm);

        card.style.display = matches ? 'block' : 'none';
    });
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initLibrary);
