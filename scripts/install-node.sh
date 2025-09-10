#!/bin/bash

# Install Node.js setup script
echo "Installing Node.js..."

# Kill any hanging apt processes
pkill -f apt-get || true
pkill -f dpkg || true

# Remove lock files
rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock

# Wait a moment
sleep 2

# Try to install Node.js via apt
apt update && apt install -y nodejs npm

# Check if installation was successful
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    echo "Node.js installed successfully:"
    node --version
    npm --version
else
    echo "Node.js installation failed via apt, trying alternative method..."
    
    # Try installing via snap
    snap install node --classic
    
    # Add snap to PATH
    export PATH="/snap/bin:$PATH"
    echo 'export PATH="/snap/bin:$PATH"' >> ~/.bashrc
    
    # Check again
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        echo "Node.js installed successfully via snap:"
        node --version
        npm --version
    else
        echo "Failed to install Node.js. Please install manually."
        exit 1
    fi
fi

echo "Node.js installation completed!"

