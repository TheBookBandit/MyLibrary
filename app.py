from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime

app = Flask(__name__)

# Configure CORS - Update with your GitHub Pages URL
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://your-username.github.io", "http://localhost:*"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type"]
    }
})

# Configuration
UPLOAD_FOLDER = 'data/books-full'
METADATA_FILE = 'data/metadata-full.json'
ALLOWED_EXTENSIONS = {'pdf', 'epub', 'mobi'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('data', exist_ok=True)

# Initialize metadata file if it doesn't exist
if not os.path.exists(METADATA_FILE):
    with open(METADATA_FILE, 'w') as f:
        json.dump({"books": []}, f)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def load_metadata():
    """Load metadata from JSON file"""
    try:
        with open(METADATA_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading metadata: {e}")
        return {"books": []}


def save_metadata(metadata):
    """Save metadata to JSON file"""
    try:
        with open(METADATA_FILE, 'w') as f:
            json.dump(metadata, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving metadata: {e}")
        return False


def get_file_size(filepath):
    """Get file size in human-readable format"""
    size_bytes = os.path.getsize(filepath)
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Library Full server is running"})


@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    """Get all books metadata"""
    try:
        metadata = load_metadata()
        return jsonify(metadata)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/books/<book_id>', methods=['GET'])
def get_book(book_id):
    """Get specific book metadata"""
    try:
        metadata = load_metadata()
        book = next((b for b in metadata['books'] if b['id'] == book_id), None)
        if book:
            return jsonify(book)
        return jsonify({"error": "Book not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/books/<book_id>/download', methods=['GET'])
def download_book(book_id):
    """Download a book file"""
    try:
        metadata = load_metadata()
        book = next((b for b in metadata['books'] if b['id'] == book_id), None)
        
        if not book:
            return jsonify({"error": "Book not found"}), 404
        
        filepath = os.path.join(UPLOAD_FOLDER, book['path'])
        
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        directory = os.path.dirname(filepath)
        filename = os.path.basename(filepath)
        
        return send_from_directory(directory, filename, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/books/<book_id>/view', methods=['GET'])
def view_book(book_id):
    """View a book file (for PDF viewer)"""
    try:
        metadata = load_metadata()
        book = next((b for b in metadata['books'] if b['id'] == book_id), None)
        
        if not book:
            return jsonify({"error": "Book not found"}), 404
        
        filepath = os.path.join(UPLOAD_FOLDER, book['path'])
        
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        directory = os.path.dirname(filepath)
        filename = os.path.basename(filepath)
        
        return send_from_directory(directory, filename)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/books', methods=['POST'])
def upload_book():
    """Upload a new book (moderators/admins only)"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Only PDF, EPUB, and MOBI are allowed"}), 400
        
        # Get metadata from form
        title = request.form.get('title', '')
        author = request.form.get('author', '')
        field = request.form.get('field', 'Uncategorized')
        tags = request.form.get('tags', '').split(',')
        book_type = request.form.get('type', 'book')
        
        if not title or not author:
            return jsonify({"error": "Title and author are required"}), 400
        
        # Secure filename and create field directory
        filename = secure_filename(file.filename)
        field_dir = os.path.join(UPLOAD_FOLDER, field.replace(' ', '_'))
        os.makedirs(field_dir, exist_ok=True)
        
        # Save file
        filepath = os.path.join(field_dir, filename)
        file.save(filepath)
        
        # Get file size
        filesize = get_file_size(filepath)
        
        # Generate unique ID
        book_id = f"{field.replace(' ', '_')}_{len(load_metadata()['books']) + 1}"
        
        # Create metadata entry
        book_entry = {
            "id": book_id,
            "title": title,
            "author": author,
            "field": field,
            "tags": [tag.strip() for tag in tags if tag.strip()],
            "filesize": filesize,
            "type": book_type,
            "filename": filename,
            "path": os.path.join(field.replace(' ', '_'), filename),
            "addedDate": datetime.now().strftime("%Y-%m-%d")
        }
        
        # Update metadata
        metadata = load_metadata()
        metadata['books'].append(book_entry)
        
        if save_metadata(metadata):
            return jsonify({"message": "Book uploaded successfully", "book": book_entry}), 201
        else:
            # Rollback: delete uploaded file
            os.remove(filepath)
            return jsonify({"error": "Failed to update metadata"}), 500
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/books/<book_id>', methods=['PUT'])
def update_book(book_id):
    """Update book metadata (moderators/admins only)"""
    try:
        data = request.json
        metadata = load_metadata()
        
        book_index = next((i for i, b in enumerate(metadata['books']) if b['id'] == book_id), None)
        
        if book_index is None:
            return jsonify({"error": "Book not found"}), 404
        
        # Update fields
        book = metadata['books'][book_index]
        
        if 'title' in data:
            book['title'] = data['title']
        if 'author' in data:
            book['author'] = data['author']
        if 'field' in data:
            book['field'] = data['field']
        if 'tags' in data:
            book['tags'] = data['tags']
        if 'type' in data:
            book['type'] = data['type']
        
        if save_metadata(metadata):
            return jsonify({"message": "Book updated successfully", "book": book})
        else:
            return jsonify({"error": "Failed to update metadata"}), 500
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/books/<book_id>', methods=['DELETE'])
def delete_book(book_id):
    """Delete a book (admins only)"""
    try:
        metadata = load_metadata()
        book_index = next((i for i, b in enumerate(metadata['books']) if b['id'] == book_id), None)
        
        if book_index is None:
            return jsonify({"error": "Book not found"}), 404
        
        book = metadata['books'][book_index]
        
        # Delete file
        filepath = os.path.join(UPLOAD_FOLDER, book['path'])
        if os.path.exists(filepath):
            os.remove(filepath)
        
        # Remove from metadata
        metadata['books'].pop(book_index)
        
        if save_metadata(metadata):
            return jsonify({"message": "Book deleted successfully"})
        else:
            return jsonify({"error": "Failed to update metadata"}), 500
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/fields', methods=['GET'])
def get_fields():
    """Get list of all fields/genres"""
    try:
        metadata = load_metadata()
        fields = list(set(book['field'] for book in metadata['books']))
        return jsonify({"fields": sorted(fields)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/search', methods=['GET'])
def search_books():
    """Search books by query"""
    try:
        query = request.args.get('q', '').lower()
        field_filter = request.args.get('field', '')
        tag_filter = request.args.get('tag', '')
        
        metadata = load_metadata()
        results = metadata['books']
        
        # Apply filters
        if query:
            results = [b for b in results if 
                      query in b['title'].lower() or 
                      query in b['author'].lower() or
                      any(query in tag.lower() for tag in b['tags'])]
        
        if field_filter:
            results = [b for b in results if b['field'] == field_filter]
        
        if tag_filter:
            results = [b for b in results if tag_filter in b['tags']]
        
        return jsonify({"books": results, "count": len(results)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Run on all network interfaces so it's accessible from other devices on LAN
    app.run(host='0.0.0.0', port=5000, debug=True)