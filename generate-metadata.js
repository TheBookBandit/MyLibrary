#!/usr/bin/env node

/**
 * Metadata Generator for Digital Library
 * Automatically generates metadata JSON from directory structure
 * 
 * Usage:
 *   node generate-metadata.js <source-dir> <output-file> [library-type]
 * 
 * Examples:
 *   node generate-metadata.js ./data/books-lite ./data/metadata-lite.json lite
 *   node generate-metadata.js ./data/books-full ./data/metadata-full.json full
 * 
 * Directory Structure Expected:
 *   books-lite/
 *   ├── Real_Analysis/
 *   │   ├── book1.pdf
 *   │   └── book2.pdf
 *   ├── Complex_Analysis/
 *   │   └── book3.pdf
 *   └── Topology/
 *       └── book4.pdf
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const ALLOWED_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.txt', '.doc', '.docx'];

/**
 * Get human-readable file size
 */
function getFileSize(filepath) {
    try {
        const sizeBytes = fs.statSync(filepath).size;
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = sizeBytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    } catch (error) {
        return 'Unknown';
    }
}

/**
 * Generate unique ID for a book
 */
function generateBookId(field, index) {
    const sanitized = field.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${sanitized}_${index}`;
}

/**
 * Extract metadata from filename
 * Tries to parse: "Title - Author.pdf" or "Title.pdf"
 */
function parseFilename(filename) {
    const nameWithoutExt = path.parse(filename).name;
    
    // Try to split by " - " separator
    if (nameWithoutExt.includes(' - ')) {
        const [title, author] = nameWithoutExt.split(' - ').map(s => s.trim());
        return { title, author };
    }
    
    // Otherwise, use filename as title and empty author
    return {
        title: nameWithoutExt,
        author: 'Unknown'
    };
}

/**
 * Format field name from folder name
 * Convert "Real_Analysis" to "Real Analysis"
 */
function formatFieldName(folderName) {
    return folderName
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Get file type from extension
 */
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.pdf', '.epub', '.mobi'].includes(ext)) {
        return 'book';
    } else if (['.txt', '.md'].includes(ext)) {
        return 'note';
    } else if (['.doc', '.docx'].includes(ext)) {
        return 'article';
    }
    return 'book';
}

/**
 * Extract tags from filename or folder
 * Format: "filename [tag1, tag2].pdf"
 */
function extractTags(filename, folderName) {
    const tags = [];
    
    // Try to extract from filename: filename [tag1, tag2].pdf
    const tagMatch = filename.match(/\[([^\]]+)\]/);
    if (tagMatch) {
        const tagStr = tagMatch[1];
        tags.push(...tagStr.split(',').map(t => t.trim()));
    }
    
    // Add field as a tag
    const fieldName = formatFieldName(folderName);
    tags.push(fieldName);
    
    return [...new Set(tags)]; // Remove duplicates
}

/**
 * Scan directory and generate metadata
 */
function generateMetadata(sourceDir) {
    const books = [];
    let bookIndex = 1;
    
    if (!fs.existsSync(sourceDir)) {
        console.error(`Error: Source directory not found: ${sourceDir}`);
        process.exit(1);
    }
    
    // Get all subdirectories (fields/genres)
    const fields = fs.readdirSync(sourceDir)
        .filter(file => {
            const fullPath = path.join(sourceDir, file);
            return fs.statSync(fullPath).isDirectory();
        });
    
    console.log(`Found ${fields.length} field(s)/genre(s):`);
    
    // Process each field
    fields.forEach(field => {
        const fieldPath = path.join(sourceDir, field);
        const formattedField = formatFieldName(field);
        
        console.log(`\n  📚 ${formattedField}`);
        
        // Get all files in this field
        const files = fs.readdirSync(fieldPath)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ALLOWED_EXTENSIONS.includes(ext);
            })
            .sort();
        
        console.log(`     Found ${files.length} file(s)`);
        
        // Process each file
        files.forEach(file => {
            const filePath = path.join(fieldPath, file);
            const { title, author } = parseFilename(file);
            const filesize = getFileSize(filePath);
            const type = getFileType(file);
            const tags = extractTags(file, field);
            
            const bookEntry = {
                id: generateBookId(field, bookIndex),
                title: title,
                author: author,
                field: formattedField,
                tags: tags,
                filesize: filesize,
                type: type,
                filename: file,
                path: path.join(field, file).replace(/\\/g, '/'), // Normalize path separators
                addedDate: new Date().toISOString().split('T')[0]
            };
            
            books.push(bookEntry);
            console.log(`     ✓ ${title} (${filesize})`);
            
            bookIndex++;
        });
    });
    
    return books;
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log(`
📚 Digital Library Metadata Generator

Usage:
  node generate-metadata.js <source-dir> <output-file> [library-type]

Arguments:
  <source-dir>    Path to books directory
                  Example: ./data/books-lite or /var/www/library/data/books-full
  
  <output-file>   Path to output JSON file
                  Example: ./data/metadata-lite.json
  
  [library-type]  Optional: 'lite' or 'full' (for logging only)

Examples:
  # Generate metadata for Library Lite
  node generate-metadata.js ./data/books-lite ./data/metadata-lite.json lite
  
  # Generate metadata for Library Full
  node generate-metadata.js /var/www/library/data/books-full /var/www/library/data/metadata-full.json full
  
  # Generate from Maths books organized by subject
  node generate-metadata.js ./maths-collection ./metadata.json

Directory Structure Example:
  books-lite/
  ├── Real_Analysis/
  │   ├── Rudin - Principles of Mathematical Analysis.pdf
  │   ├── Analysis [calculus, proofs].pdf
  │   └── real-analysis-notes.pdf
  ├── Complex_Analysis/
  │   ├── Ahlfors - Complex Analysis.pdf
  │   └── complex-analysis-supplement [exam-prep].pdf
  └── Topology/
      └── Munkres - Topology.pdf

Filename Format (for better metadata):
  "Title - Author.pdf"     → Parsed as title and author
  "Title [tag1, tag2].pdf" → Parsed as title with tags
  "filename.pdf"           → Used as title, author set to "Unknown"
        `);
        process.exit(1);
    }
    
    const sourceDir = args[0];
    const outputFile = args[1];
    const libraryType = args[2] || 'unknown';
    
    console.log(`\n📖 Generating metadata for Library ${libraryType.toUpperCase()}...`);
    console.log(`   Source: ${sourceDir}`);
    console.log(`   Output: ${outputFile}\n`);
    
    try {
        // Generate metadata
        const books = generateMetadata(sourceDir);
        
        // Create metadata object
        const metadata = {
            books: books,
            generatedAt: new Date().toISOString(),
            totalBooks: books.length,
            fields: [...new Set(books.map(b => b.field))]
        };
        
        // Write to file
        const outputDir = path.dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`✓ Created output directory: ${outputDir}`);
        }
        
        fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
        
        // Summary
        console.log(`\n✅ Metadata Generated Successfully!\n`);
        console.log(`   Total books: ${books.length}`);
        console.log(`   Fields/Genres: ${metadata.fields.length}`);
        console.log(`   Output file: ${outputFile}`);
        console.log(`   File size: ${getFileSize(outputFile)}\n`);
        
        // Show field summary
        console.log(`📊 Summary by Field:`);
        metadata.fields.forEach(field => {
            const count = books.filter(b => b.field === field).length;
            console.log(`   ${field}: ${count} book(s)`);
        });
        
        console.log(`\n✨ Done!\n`);
        
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}\n`);
        process.exit(1);
    }
}

// Run the script
main();