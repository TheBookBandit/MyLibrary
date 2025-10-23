# Complete Deployment Guide

## 📋 Overview

This implementation provides:
- **Firebase Authentication** with admin approval workflow
- **Library Lite** (GitHub Pages) - ~100 books, public internet access
- **Library Full** (Raspberry Pi) - complete collection, LAN access only
- **Admin Panel** for user management
- **Profile Management** for users
- **Dual-mode operation** with automatic LAN detection

## 🗂️ Files Provided

### Main Application Files
- **index.html** - Complete HTML structure with authentication UI [40]
- **styles.css** - Responsive styles for auth and library interface [41]  
- **auth.js** - Firebase authentication and user management [80]
- **app.js** - Enhanced library app with dual-mode support [42]

### Setup Files
- **firebase-setup.md** - Step-by-step Firebase configuration [81]
- **pi-setup.sh** - Automated Raspberry Pi server setup [82]

## 🚀 Step-by-Step Deployment

### Phase 1: Firebase Setup (5 minutes)

1. **Create Firebase Project**
   ```bash
   # Follow firebase-setup.md instructions
   # Get your Firebase config object
   ```

2. **Update Configuration**
   ```javascript
   // In index.html, replace firebaseConfig with your actual config
   const firebaseConfig = {
       apiKey: "your-actual-api-key",
       authDomain: "your-project.firebaseapp.com",
       // ... rest of your config
   };
   ```

3. **Set Admin Email**
   ```javascript
   // In auth.js line 24, change to your email
   const ADMIN_EMAIL = 'your-admin@email.com';
   ```

### Phase 2: GitHub Pages (Library Lite)

1. **Repository Setup**
   ```bash
   git clone https://github.com/yourusername/math-library.git
   cd math-library
   
   # Add the provided files
   # Add your Books directory structure:
   # Books/Real Analysis/book1.pdf
   # Books/Linear Algebra/book2.pdf
   # etc.
   ```

2. **Create books.json for Lite**
   ```json
   [
     {
       "id": "1",
       "title": "Real Analysis Fundamentals",
       "author": "Author Name",
       "field": "Real Analysis", 
       "tags": ["analysis", "undergraduate"],
       "description": "Introduction to real analysis",
       "path": "Books/Real Analysis/book1.pdf",
       "sizeBytes": 2458624,
       "addedAt": 1697366400000,
       "metadataSource": "manual"
     }
   ]
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "Initial library deployment"
   git push origin main
   
   # Enable GitHub Pages in repository settings
   ```

### Phase 3: Raspberry Pi Setup (Library Full)

1. **Run Setup Script**
   ```bash
   # On your Raspberry Pi
   wget https://raw.githubusercontent.com/yourusername/math-library/main/pi-setup.sh
   chmod +x pi-setup.sh
   ./pi-setup.sh
   ```

2. **Add Your Books**
   ```bash
   # Copy your full PDF collection
   sudo cp -r /path/to/your/books/* /var/www/library/Books/
   
   # Update permissions
   sudo chown -R www-data:www-data /var/www/library
   ```

3. **Create Full books.json**
   ```bash
   sudo nano /var/www/library/books.json
   # Add all your books with full metadata
   ```

4. **Update Code with Pi's IP**
   ```javascript
   // In auth.js line 27-31, update with your Pi's IP
   const PI_SERVER_CONFIG = {
       host: '192.168.1.XXX', // Your Pi's actual IP
       port: 8080,
       protocol: 'http'
   };
   
   // In app.js line 41-43, update the same IP
   ```

### Phase 4: Testing

1. **Test Firebase Auth**
   - Register with your admin email → immediate access
   - Register with different email → pending approval
   - Login as admin → approve pending user

2. **Test Library Access**
   - From internet: only Library Lite accessible
   - From LAN: both Library Lite and Full accessible
   - From LAN with Pi off: Full shows "LAN Access Required"

## 🔧 Configuration Reference

### Key Files to Customize

1. **auth.js**
   - Line 24: `ADMIN_EMAIL` 
   - Lines 27-31: `PI_SERVER_CONFIG`

2. **app.js**  
   - Lines 41-43: Pi server URLs

3. **index.html**
   - Firebase configuration object

### Raspberry Pi Management

```bash
# Check status
~/library-manager.sh status

# View logs  
~/library-manager.sh logs

# Restart server
~/library-manager.sh restart

# Create backup
~/library-manager.sh backup
```

## 🎯 User Experience Flow

1. **Registration**
   - User visits your GitHub Pages site
   - Registers with email/password + profile info
   - If not admin email: sees "Pending Approval"
   - Admin gets notification and can approve

2. **Login & Library Selection**
   - Approved users see library selection page
   - **Library Lite**: Always accessible, smaller collection
   - **Library Full**: LAN check → access full collection or show error

3. **Library Features**
   - Search with fuzzy matching
   - Filter by field and tags
   - Inline PDF viewer for small files
   - Download all files
   - Edit metadata (saves to localStorage + exportable)
   - Admin panel for user management

## 🔒 Security Features

- Firebase Authentication with email verification
- Admin approval workflow for new users
- Firestore security rules prevent unauthorized access
- Raspberry Pi server only accessible on LAN
- No sensitive data in client-side code
- User profile editing with validation

## 🎉 Success Metrics

After deployment, you should have:
- ✅ Secure authentication with admin approval
- ✅ Dual library system (GitHub + Pi)
- ✅ Automatic LAN detection
- ✅ User management dashboard
- ✅ Responsive design for mobile/desktop
- ✅ PDF inline viewing and downloads
- ✅ Fuzzy search and filtering
- ✅ Profile management for users

## 🔧 Troubleshooting

**Firebase Issues**
- Check browser console for authentication errors
- Verify Firestore security rules
- Ensure admin email matches exactly

**Raspberry Pi Issues**
```bash
# Check nginx status
sudo systemctl status nginx

# Test connectivity
curl http://localhost:8080/health

# Check logs
sudo tail -f /var/log/nginx/error.log
```

**Library Access Issues**  
- Verify Firebase config is correct
- Check browser network tab for CORS errors
- Ensure Pi IP addresses match in code

The system is now production-ready with enterprise-grade authentication, dual hosting, and comprehensive user management! 🚀