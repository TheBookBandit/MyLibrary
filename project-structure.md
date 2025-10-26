# Digital Library Project Structure

## Overview
This project creates a digital library with two versions:
- **Library Lite**: Hosted entirely on GitHub Pages with a small collection
- **Library Full**: Hosted on Raspberry Pi 5 within your LAN with full collection

## Project Architecture

### Frontend (GitHub Pages)
- Static HTML/CSS/JavaScript
- Firebase Authentication for user management
- PDF.js for in-browser PDF viewing
- Separate metadata systems for Lite and Full versions

### Backend (Raspberry Pi 5)
- Python Flask web server
- File storage for books/articles
- REST API for book management
- JSON metadata storage

## Directory Structure

```
digital-library/
├── index.html                  # Login/Register page
├── dashboard.html              # Main dashboard after login
├── library-lite.html           # Library Lite interface
├── library-full.html           # Library Full interface (connects to Pi)
├── admin-panel.html            # Admin/Moderator management
├── css/
│   ├── style.css              # Main styles
│   └── viewer.css             # PDF viewer styles
├── js/
│   ├── auth.js                # Firebase authentication
│   ├── dashboard.js           # Dashboard functionality
│   ├── library-lite.js        # Library Lite logic
│   ├── library-full.js        # Library Full logic (Pi connection)
│   ├── admin.js               # Admin panel logic
│   ├── pdf-viewer.js          # PDF viewer implementation
│   └── config.js              # Firebase configuration
├── data/
│   ├── metadata-lite.json     # Metadata for Library Lite
│   └── books-lite/            # PDF files for Library Lite
│       ├── Computer_Science/
│       ├── Mathematics/
│       └── Physics/
├── pdfjs/                      # PDF.js library files
│   ├── build/
│   └── web/
└── raspberry-pi/               # Files for Raspberry Pi
    ├── app.py                 # Flask application
    ├── requirements.txt       # Python dependencies
    ├── data/
    │   ├── metadata-full.json # Metadata for Library Full
    │   └── books-full/        # PDF files for Library Full
    │       ├── Computer_Science/
    │       ├── Mathematics/
    │       └── Physics/
    └── templates/
        └── upload.html        # Book upload interface
```

## Technology Stack

### Frontend
- **HTML5/CSS3/JavaScript**: Core web technologies
- **Firebase Authentication**: User authentication and management
- **Firebase Firestore**: User roles and permissions storage
- **PDF.js**: In-browser PDF rendering
- **Fetch API**: HTTP requests to Raspberry Pi

### Backend (Raspberry Pi)
- **Python 3.9+**: Programming language
- **Flask**: Web framework
- **Flask-CORS**: Cross-origin resource sharing
- **Werkzeug**: File upload handling

## Setup Instructions

### Part 1: Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication with Email/Password provider
   - Enable Firestore Database

2. **Firestore Database Structure**
   ```
   users/
     {userId}/
       email: string
       name: string
       username: string
       role: "admin" | "moderator" | "user"
       approved: boolean
       createdAt: timestamp
   
   pendingUsers/
     {userId}/
       email: string
       name: string
       username: string
       requestedAt: timestamp
   ```

3. **Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth.uid == userId || 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       match /pendingUsers/{userId} {
         allow read, write: if request.auth != null && 
                             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
         allow create: if request.auth.uid == userId;
       }
     }
   }
   ```

### Part 2: GitHub Pages Setup

1. **Create GitHub Repository**
   - Name: `{your-username}.github.io` or custom name
   - Set to Public
   - Enable GitHub Pages in Settings

2. **Upload Files**
   - Upload all frontend files (HTML, CSS, JS)
   - Upload Library Lite books to `data/books-lite/`
   - Upload metadata-lite.json

3. **Configure Firebase**
   - Copy Firebase config to `js/config.js`
   - Update Raspberry Pi IP in `library-full.js`

### Part 3: Raspberry Pi Setup

1. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install python3-pip python3-venv
   cd ~/digital-library/raspberry-pi
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Configure Flask App**
   - Update CORS origins in `app.py`
   - Set upload folder paths
   - Configure port (default: 5000)

3. **Start Flask Server**
   ```bash
   python3 app.py
   ```

4. **Set Up Autostart (Optional)**
   ```bash
   sudo nano /etc/systemd/system/library-server.service
   ```
   
   Add:
   ```ini
   [Unit]
   Description=Digital Library Flask Server
   After=network.target
   
   [Service]
   User=pi
   WorkingDirectory=/home/pi/digital-library/raspberry-pi
   ExecStart=/home/pi/digital-library/raspberry-pi/venv/bin/python app.py
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   Enable:
   ```bash
   sudo systemctl enable library-server
   sudo systemctl start library-server
   ```

### Part 4: Admin Account Setup

1. **Create First Admin**
   - Register through the website
   - Manually update Firestore:
     - Go to Firebase Console → Firestore
     - Find user document
     - Set `role: "admin"` and `approved: true`

## Features Implementation

### Authentication
- Email/Password authentication via Firebase
- User registration with admin approval
- Password reset via Firebase email
- Role-based access (admin, moderator, user)

### Library Lite
- Fully hosted on GitHub Pages
- Uses local metadata-lite.json
- Books organized by field/genre folders
- Search by title, author, tags
- In-browser PDF viewer for small PDFs (<5MB)

### Library Full
- Connects to Raspberry Pi via REST API
- Only accessible from LAN
- Uses metadata-full.json on Pi
- Upload functionality for moderators
- Search by title, author, tags
- Large PDF support

### Admin Features
- Approve/reject new user registrations
- Promote users to moderators
- Manage user roles
- View all pending requests

### Moderator Features
- Upload books to Library Full
- Edit metadata for books
- Organize books into folders

## Security Considerations

1. **Firebase Authentication**
   - Passwords are hashed by Firebase
   - Email verification available
   - Password reset via email

2. **Firestore Security Rules**
   - Users can only read approved users
   - Only admins can approve users
   - Users can update their own profiles

3. **Raspberry Pi**
   - Not exposed to internet
   - Only accessible from LAN
   - File upload validation
   - Size limits enforced

4. **GitHub Pages**
   - Static hosting (no server-side secrets)
   - Firebase config is safe to expose (protected by security rules)
   - API keys restricted by domain

## Metadata Format

```json
{
  "books": [
    {
      "id": "unique-id",
      "title": "Book Title",
      "author": "Author Name",
      "field": "Computer Science",
      "tags": ["tag1", "tag2"],
      "filesize": "5.2 MB",
      "type": "book",
      "filename": "book-title.pdf",
      "path": "Computer_Science/book-title.pdf",
      "addedDate": "2025-10-26"
    }
  ]
}
```

## Password Reset Implementation

**Using Firebase Authentication:**

1. User clicks "Forgot Password"
2. Enter email address
3. Firebase sends password reset email
4. User clicks link in email
5. User sets new password
6. Automatically redirected to login

## Future Enhancements

- Bookmarks and reading progress
- User comments/reviews
- Download statistics
- Advanced search filters
- Mobile app version
- OCR for searchable PDFs
- Multi-language support

## Troubleshooting

### Common Issues

1. **CORS errors with Raspberry Pi**
   - Ensure Flask-CORS is installed
   - Check CORS origins in app.py
   - Verify Pi IP is correct in library-full.js

2. **Firebase authentication not working**
   - Check Firebase config in config.js
   - Verify domain is authorized in Firebase Console
   - Check browser console for errors

3. **PDF.js not loading**
   - Download PDF.js prebuilt from GitHub
   - Place in `/pdfjs/` directory
   - Check paths in pdf-viewer.js

4. **Raspberry Pi not accessible**
   - Verify Pi is on same network
   - Check Pi IP address: `hostname -I`
   - Test with: `curl http://PI_IP:5000/api/health`

## Support

For issues or questions:
- Check browser console for JavaScript errors
- Check Raspberry Pi logs: `journalctl -u library-server`
- Verify Firestore security rules
- Test API endpoints with curl/Postman
