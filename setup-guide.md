# Digital Library Project - Complete Implementation Guide

## 📚 Project Overview

A dual-library system with authentication, role-based access control, and Raspberry Pi integration:

- **Library Lite**: Hosted on GitHub Pages (small curated collection)
- **Library Full**: Hosted on Raspberry Pi 5 (complete collection, LAN-only access)

## 🚀 Quick Start Guide

### Prerequisites

- GitHub account
- Firebase account (free tier)
- Raspberry Pi 5 with Raspberry Pi OS
- Basic knowledge of Git and command line

### Step 1: Firebase Setup (15 minutes)

1. **Create Firebase Project**
   ```
   1. Go to https://console.firebase.google.com/
   2. Click "Add project"
   3. Name it "digital-library" (or your choice)
   4. Disable Google Analytics (optional)
   5. Click "Create project"
   ```

2. **Enable Authentication**
   ```
   1. In Firebase Console, click "Authentication"
   2. Click "Get started"
   3. Click "Sign-in method" tab
   4. Enable "Email/Password"
   5. Click "Save"
   ```

3. **Create Firestore Database**
   ```
   1. Click "Firestore Database" in sidebar
   2. Click "Create database"
   3. Select "Start in production mode"
   4. Choose location closest to you
   5. Click "Enable"
   ```

4. **Configure Firestore Security Rules**
   ```
   1. Click "Rules" tab in Firestore
   2. Replace rules with:
   ```
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null;
         allow create: if request.auth.uid == userId;
         allow update, delete: if request.auth.uid == userId || 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       match /pendingUsers/{userId} {
         allow read: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
         allow create: if request.auth.uid == userId;
         allow delete: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
     }
   }
   ```
   ```
   3. Click "Publish"
   ```

5. **Get Firebase Configuration**
   ```
   1. Click gear icon → "Project settings"
   2. Scroll to "Your apps" section
   3. Click "</>" (Web) icon
   4. Register app as "digital-library-web"
   5. Copy the firebaseConfig object
   ```

### Step 2: GitHub Setup (10 minutes)

1. **Create Repository**
   ```bash
   # Option 1: User/Organization site (recommended)
   Repository name: your-username.github.io
   
   # Option 2: Project site
   Repository name: digital-library
   ```

2. **Clone and Setup**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   
   # Create directory structure
   mkdir -p css js data/books-lite/{Computer_Science,Mathematics,Physics}
   ```

3. **Add All Files**
   - Copy all HTML files to root directory
   - Copy CSS files to `css/` directory
   - Copy JS files to `js/` directory
   - Copy `metadata-lite.json` to `data/` directory
   
4. **Configure Firebase in config.js**
   ```javascript
   // js/config.js
   const firebaseConfig = {
       apiKey: "YOUR_ACTUAL_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

5. **Add PDF.js Library**
   ```bash
   # Download PDF.js prebuilt
   wget https://github.com/mozilla/pdf.js/releases/download/v4.0.269/pdfjs-4.0.269-dist.zip
   
   # Extract to pdfjs directory
   unzip pdfjs-4.0.269-dist.zip -d pdfjs
   ```

6. **Commit and Push**
   ```bash
   git add .
   git commit -m "Initial commit: Digital Library"
   git push origin main
   ```

7. **Enable GitHub Pages**
   ```
   1. Go to repository Settings
   2. Click "Pages" in sidebar
   3. Source: Deploy from branch
   4. Branch: main, folder: / (root)
   5. Click "Save"
   6. Wait 2-3 minutes for deployment
   ```

### Step 3: Raspberry Pi Setup (20 minutes)

1. **Connect to Raspberry Pi**
   ```bash
   ssh pi@raspberrypi.local
   # Default password: raspberry (change it!)
   ```

2. **Update System**
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

3. **Install Python Dependencies**
   ```bash
   sudo apt install python3-pip python3-venv -y
   ```

4. **Create Project Directory**
   ```bash
   mkdir -p ~/digital-library/raspberry-pi
   cd ~/digital-library/raspberry-pi
   ```

5. **Upload Raspberry Pi Files**
   ```bash
   # On your computer, copy files to Pi:
   scp app.py pi@raspberrypi.local:~/digital-library/raspberry-pi/
   scp requirements.txt pi@raspberrypi.local:~/digital-library/raspberry-pi/
   ```

6. **Create Virtual Environment**
   ```bash
   cd ~/digital-library/raspberry-pi
   python3 -m venv venv
   source venv/bin/activate
   ```

7. **Install Requirements**
   ```bash
   pip install -r requirements.txt
   ```

8. **Create Directory Structure**
   ```bash
   mkdir -p data/books-full/{Computer_Science,Mathematics,Physics}
   ```

9. **Create Initial Metadata**
   ```bash
   cat > data/metadata-full.json << 'EOF'
   {
     "books": []
   }
   EOF
   ```

10. **Update CORS in app.py**
    ```python
    # Edit app.py and replace:
    CORS(app, resources={
        r"/api/*": {
            "origins": ["https://your-actual-username.github.io", "http://localhost:*"],
            # ... rest of config
        }
    })
    ```

11. **Find Raspberry Pi IP Address**
    ```bash
    hostname -I
    # Note the first IP address (e.g., 192.168.1.100)
    ```

12. **Test Flask Server**
    ```bash
    python app.py
    
    # Should see:
    # * Running on http://0.0.0.0:5000
    ```

13. **Test from Browser**
    ```
    Open: http://YOUR_PI_IP:5000/api/health
    Should see: {"status": "ok", "message": "Library Full server is running"}
    ```

### Step 4: Update Frontend with Pi IP (5 minutes)

1. **Edit config.js on GitHub**
   ```javascript
   // Replace with your actual Pi IP
   const RASPBERRY_PI_URL = 'http://192.168.1.100:5000';
   ```

2. **Commit and push**
   ```bash
   git add js/config.js
   git commit -m "Update Raspberry Pi IP"
   git push origin main
   ```

### Step 5: Create First Admin User (10 minutes)

1. **Open Your Site**
   ```
   https://your-username.github.io
   ```

2. **Register an Account**
   - Fill in all fields
   - Use your real email (for password reset)
   - Click "Register"

3. **Approve Admin in Firestore**
   ```
   1. Go to Firebase Console → Firestore
   2. Click "users" collection
   3. Find your user document (by email)
   4. Click the document
   5. Edit the document:
      - Change "approved" to true
      - Change "role" to "admin"
   6. Click "Update"
   ```

4. **Login**
   - Go back to your site
   - Login with your credentials
   - You should see Dashboard with Admin options

### Step 6: Set Up Raspberry Pi Autostart (Optional, 10 minutes)

1. **Create Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/library-server.service
   ```

2. **Add Service Configuration**
   ```ini
   [Unit]
   Description=Digital Library Flask Server
   After=network.target
   
   [Service]
   User=pi
   WorkingDirectory=/home/pi/digital-library/raspberry-pi
   Environment="PATH=/home/pi/digital-library/raspberry-pi/venv/bin"
   ExecStart=/home/pi/digital-library/raspberry-pi/venv/bin/python app.py
   Restart=always
   RestartSec=10
   
   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and Start Service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable library-server
   sudo systemctl start library-server
   ```

4. **Check Status**
   ```bash
   sudo systemctl status library-server
   
   # View logs
   sudo journalctl -u library-server -f
   ```

## 📖 Usage Guide

### For Users

1. **Register**: Click "Register" on login page
2. **Wait for Approval**: Admin will approve your account
3. **Login**: Use your credentials
4. **Browse Libraries**: Choose Library Lite or Library Full
5. **Search**: Use search bar and filters
6. **View/Download**: Click buttons on book cards

### For Moderators

1. **Upload Books**: Go to Library Full → Upload section
2. **Fill Metadata**: Title, Author, Field, Tags
3. **Select File**: Choose PDF/EPUB/MOBI
4. **Submit**: Book will be added to collection
5. **Edit Metadata**: Click edit on any book

### For Admins

1. **Approve Users**: Go to Admin Panel
2. **View Pending**: See new registration requests
3. **Approve/Reject**: Click buttons
4. **Promote Users**: Change roles to Moderator
5. **Manage Content**: Access all moderator features

## 🔧 Customization

### Adding More Fields/Genres

1. **Update metadata.json**
   ```json
   {
     "field": "Your New Field",
     "path": "Your_New_Field/book.pdf"
   }
   ```

2. **Create Directory**
   ```bash
   mkdir data/books-lite/Your_New_Field
   # or
   mkdir data/books-full/Your_New_Field
   ```

### Changing Colors

Edit `css/style.css`:
```css
:root {
    --primary-color: #your-color;
    --secondary-color: #your-color;
}
```

### Changing PDF Size Limit

Edit `js/config.js`:
```javascript
const PDF_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
```

## 🐛 Troubleshooting

### Issue: Cannot login after registration

**Solution**: Admin must approve your account in Firestore
```
1. Go to Firebase Console
2. Firestore → users collection
3. Find your user
4. Set approved: true
```

### Issue: Library Full not connecting

**Solutions**:
1. Check Pi is running: `sudo systemctl status library-server`
2. Check Pi IP in config.js matches actual IP
3. Check CORS settings in app.py
4. Ensure you're on same network

### Issue: Books not displaying

**Solutions**:
1. Check metadata-lite.json is valid JSON
2. Check file paths match actual files
3. Check browser console for errors
4. Clear browser cache

### Issue: PDF viewer not working

**Solutions**:
1. Download PDF.js prebuilt and extract to `pdfjs/` directory
2. Check file paths in library-lite.js
3. For large PDFs, download instead of viewing

### Issue: Firebase permission denied

**Solutions**:
1. Check Firestore security rules are correct
2. Ensure user is logged in
3. Check user has approved: true
4. Clear site data and re-login

## 📱 Access URLs

- **Main Site**: `https://your-username.github.io`
- **Library Full**: `http://YOUR_PI_IP:5000/api/health` (test)
- **Firebase Console**: `https://console.firebase.google.com`

## 🔒 Security Notes

1. **Firebase API Key**: Safe to expose (protected by security rules)
2. **Firestore Rules**: Restrict write access to admin/moderators
3. **Raspberry Pi**: Only accessible on LAN (not exposed to internet)
4. **Passwords**: Hashed by Firebase (never stored in plaintext)
5. **File Uploads**: Validated for type and size

## 📦 Project Structure Summary

```
digital-library/
├── Frontend (GitHub Pages)
│   ├── index.html           # Login/Register
│   ├── dashboard.html       # Main dashboard
│   ├── library-lite.html    # Library Lite interface
│   ├── library-full.html    # Library Full interface
│   ├── admin-panel.html     # Admin panel
│   ├── css/style.css        # Styles
│   ├── js/
│   │   ├── config.js        # Firebase config
│   │   ├── auth.js          # Authentication logic
│   │   ├── dashboard.js     # Dashboard logic
│   │   ├── library-lite.js  # Library Lite logic
│   │   ├── library-full.js  # Library Full logic
│   │   └── admin.js         # Admin panel logic
│   ├── data/
│   │   ├── metadata-lite.json
│   │   └── books-lite/      # PDF files
│   └── pdfjs/               # PDF.js library
│
└── Backend (Raspberry Pi)
    ├── app.py               # Flask server
    ├── requirements.txt     # Python dependencies
    └── data/
        ├── metadata-full.json
        └── books-full/      # PDF files
```

## 🎯 Feature Checklist

- ✅ User authentication with Firebase
- ✅ Email/password login
- ✅ Password reset via email
- ✅ User registration with admin approval
- ✅ Role-based access (admin, moderator, user)
- ✅ Library Lite (GitHub Pages hosted)
- ✅ Library Full (Raspberry Pi hosted)
- ✅ Search functionality with filters
- ✅ Tag-based search
- ✅ Field/genre organization
- ✅ PDF viewer for small files
- ✅ Download functionality
- ✅ Book upload (moderators)
- ✅ Metadata editing (moderators)
- ✅ User management (admin)
- ✅ Approval system (admin)
- ✅ Role promotion (admin)

## 📚 Additional Resources

- **Firebase Docs**: https://firebase.google.com/docs
- **Flask Docs**: https://flask.palletsprojects.com/
- **PDF.js**: https://mozilla.github.io/pdf.js/
- **GitHub Pages**: https://pages.github.com/
- **Raspberry Pi Setup**: https://www.raspberrypi.com/documentation/

## 🤝 Support

For issues:
1. Check troubleshooting section
2. Review browser console for errors
3. Check Pi logs: `sudo journalctl -u library-server -f`
4. Verify Firestore security rules
5. Test API endpoints: `curl http://PI_IP:5000/api/health`

## 📝 License

This project is provided as-is for educational purposes.

---

**Congratulations! Your digital library is now set up and running! 🎉**