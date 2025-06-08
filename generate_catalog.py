import os
import json
import fitz  # PyMuPDF
from PIL import Image

def generate_thumbnails_and_catalog():
    catalog = []
    base_path = "Books"
    thumb_dir = "thumbnails"

    # Create thumbnail directory
    os.makedirs(thumb_dir, exist_ok=True)

    for category in os.listdir(base_path):
        category_path = os.path.join(base_path, category)

        if not os.path.isdir(category_path):
            continue

        for book_file in os.listdir(category_path):
            if not book_file.lower().endswith('.pdf'):
                continue

            book_path = os.path.join(category_path, book_file)
            book_name = os.path.splitext(book_file)[0]
            thumb_path = os.path.join(thumb_dir, f"{category}-{book_name}.jpg")

            # Generate thumbnail from first page
            try:
                doc = fitz.open(book_path)
                page = doc.load_page(0)
                pix = page.get_pixmap(matrix=fitz.Matrix(0.3, 0.3))
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                img.thumbnail((200, 300))
                img.save(thumb_path)
            except Exception as e:
                print(f"Error processing {book_path}: {str(e)}")
                thumb_path = ""  # Use placeholder

            # Add to catalog
            catalog.append({
                "title": book_name.replace('_', ' '),
                "category": category,
                "pdfPath": book_path,
                "thumbPath": thumb_path
            })

    # Save catalog
    with open("books.json", "w") as f:
        json.dump(catalog, f, indent=2)

if __name__ == "__main__":
    generate_thumbnails_and_catalog()
