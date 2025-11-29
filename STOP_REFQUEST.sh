#!/bin/bash
#
# RefQuest Platform Stop Script
# Quick way to stop all RefQuest services
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping RefQuest Services...${NC}"
echo ""

# Kill by port
echo "Stopping UI (port 5174)..."
fuser -k 5174/tcp 2>/dev/null || true

echo "Stopping Backend (port 8088)..."
fuser -k 8088/tcp 2>/dev/null || true

# Clean up PID files
PID_DIR="/home/cyberhope/Documents/pcos_sports_perception_referee_ai/.pids"
if [ -d "$PID_DIR" ]; then
    for pidfile in "$PID_DIR"/*.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            kill "$pid" 2>/dev/null || true
            rm "$pidfile"
        fi
    done
fi

sleep 2

echo ""
echo -e "${GREEN}RefQuest services stopped.${NC}"
echo ""
echo "To start again: ./START_REFQUEST.sh"
echo ""
