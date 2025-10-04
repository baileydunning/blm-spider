#!/bin/bash
# .github/scripts/install_harper.sh
# Usage: ./install_harper.sh <version> <username> <password>

set -e
HDB_VERSION=${1:-latest}

if [ "$HDB_VERSION" = "latest" ]; then
  npm install -g harperdb
else
  npm install -g harperdb@"$HDB_VERSION"
fi

echo "HarperDB $HDB_VERSION installed."
