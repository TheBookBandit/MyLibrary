#!/bin/bash

# Raspberry Pi Static File Server Setup Script
# Run this script on your Raspberry Pi to set up the full library server

echo "🍓 Setting up Raspberry Pi Library Server..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install nginx
echo "🌐 Installing nginx..."
sudo apt install nginx -y

# Create directory structure
echo "📁 Setting up directory structure..."
sudo mkdir -p /var/www/library
sudo mkdir -p /var/www/library/Books
sudo chown -R pi:pi /var/www/library

# Create nginx configuration
echo "⚙️ Configuring nginx..."
sudo tee /etc/nginx/sites-available/library > /dev/null <<EOF
server {
    listen 8080;
    server_name _;
    
    root /var/www/library;
    index index.html books.json;
    
    # Enable CORS for all requests
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization' always;
    
    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    # Serve static files
    location / {
        try_files \$uri \$uri/ =404;
        autoindex off;
    }
    
    # Books directory
    location /Books/ {
        alias /var/www/library/Books/;
        autoindex off;
        
        # Set proper content type for PDFs
        location ~* \\.pdf\$ {
            add_header Content-Type application/pdf;
            add_header Content-Disposition inline;
        }
    }
    
    # Health check endpoint
    location /health {
        add_header Content-Type application/json;
        return 200 '{"status":"ok","server":"pi-library"}';
    }
    
    # books.json endpoint
    location = /books.json {
        add_header Content-Type application/json;
        try_files /books.json =404;
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # File size limits
    client_max_body_size 100M;
}
EOF

# Enable the site
echo "🔗 Enabling nginx site..."
sudo ln -sf /etc/nginx/sites-available/library /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration error"
    exit 1
fi

# Start and enable nginx
echo "🚀 Starting nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Create sample books.json
echo "📄 Creating sample books.json..."
cat > /var/www/library/books.json <<EOF
[
  {
    "id": "sample-1",
    "title": "Sample Mathematics Book",
    "author": "Sample Author",
    "field": "Sample Field",
    "tags": ["sample", "math"],
    "description": "This is a sample book entry for testing the Pi server.",
    "path": "Books/Sample/sample-book.pdf",
    "sizeBytes": 1024000,
    "addedAt": $(date +%s000),
    "metadataSource": "manual"
  }
]
EOF

# Create sample directory and file
mkdir -p /var/www/library/Books/Sample
echo "Sample PDF content - replace with actual PDF files" > /var/www/library/Books/Sample/sample-book.pdf

# Set proper permissions
echo "🔒 Setting permissions..."
sudo chown -R www-data:www-data /var/www/library
sudo chmod -R 755 /var/www/library

# Get Pi's IP address
PI_IP=$(hostname -I | awk '{print $1}')

# Create management script
echo "📝 Creating management script..."
cat > ~/library-manager.sh <<EOF
#!/bin/bash

# Library Management Script for Raspberry Pi

case "\$1" in
    "status")
        echo "🔍 Library Server Status:"
        echo "Nginx status: \$(sudo systemctl is-active nginx)"
        echo "Pi IP address: $PI_IP"
        echo "Library URL: http://$PI_IP:8080"
        echo "Health check: http://$PI_IP:8080/health"
        echo "Books manifest: http://$PI_IP:8080/books.json"
        ;;
    "restart")
        echo "🔄 Restarting nginx..."
        sudo systemctl restart nginx
        echo "✅ Nginx restarted"
        ;;
    "logs")
        echo "📄 Recent nginx logs:"
        sudo tail -n 20 /var/log/nginx/error.log
        ;;
    "upload")
        if [ -z "\$2" ]; then
            echo "Usage: \$0 upload <pdf-file>"
            exit 1
        fi
        
        if [ ! -f "\$2" ]; then
            echo "❌ File not found: \$2"
            exit 1
        fi
        
        echo "📚 Upload feature - Manual steps:"
        echo "1. Copy your PDF to: /var/www/library/Books/<field-name>/"
        echo "2. Update books.json with the new entry"
        echo "3. Run: \$0 restart"
        echo ""
        echo "Example:"
        echo "  sudo cp '\$2' /var/www/library/Books/Analysis/"
        echo "  # Then edit /var/www/library/books.json"
        ;;
    "backup")
        BACKUP_DIR="~/library-backup-\$(date +%Y%m%d-%H%M%S)"
        echo "💾 Creating backup in \$BACKUP_DIR"
        mkdir -p "\$BACKUP_DIR"
        cp -r /var/www/library/* "\$BACKUP_DIR/"
        echo "✅ Backup created: \$BACKUP_DIR"
        ;;
    *)
        echo "🍓 Raspberry Pi Library Manager"
        echo ""
        echo "Usage: \$0 {status|restart|logs|upload|backup}"
        echo ""
        echo "Commands:"
        echo "  status   - Show server status and URLs"
        echo "  restart  - Restart nginx service"
        echo "  logs     - Show recent error logs"
        echo "  upload   - Help with uploading new books"
        echo "  backup   - Create backup of library"
        echo ""
        echo "Your library server: http://$PI_IP:8080"
        ;;
esac
EOF

chmod +x ~/library-manager.sh

# Create auto-backup cron job
echo "⏰ Setting up daily backup cron job..."
(crontab -l 2>/dev/null; echo "0 2 * * * ~/library-manager.sh backup > /dev/null 2>&1") | crontab -

# Final status check
echo ""
echo "🎉 Setup complete! Your Raspberry Pi library server is ready."
echo ""
echo "📊 Server Information:"
echo "  • Pi IP Address: $PI_IP"
echo "  • Library URL: http://$PI_IP:8080"
echo "  • Health Check: http://$PI_IP:8080/health"
echo "  • Books Manifest: http://$PI_IP:8080/books.json"
echo ""
echo "📁 Directory Structure:"
echo "  • Library Root: /var/www/library"
echo "  • Books Folder: /var/www/library/Books"
echo "  • Config File: /var/www/library/books.json"
echo ""
echo "🛠️ Management:"
echo "  • Use: ~/library-manager.sh status"
echo "  • Logs: sudo tail -f /var/log/nginx/access.log"
echo "  • Config: sudo nano /etc/nginx/sites-available/library"
echo ""
echo "📋 Next Steps:"
echo "1. Copy your PDF files to /var/www/library/Books/<field>/"
echo "2. Update /var/www/library/books.json with your book metadata"
echo "3. Update auth.js with this Pi's IP address: $PI_IP"
echo "4. Test access from your main computer"
echo ""
echo "⚠️ Important:"
echo "  • Make sure port 8080 is not blocked by firewall"
echo "  • This server is HTTP only (fine for LAN use)"
echo "  • Access is restricted to your local network"

# Test the server
echo ""
echo "🧪 Testing server..."
sleep 2
curl -s http://localhost:8080/health && echo "✅ Health check passed" || echo "❌ Health check failed"
curl -s http://localhost:8080/books.json > /dev/null && echo "✅ Books manifest accessible" || echo "❌ Books manifest not accessible"