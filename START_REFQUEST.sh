#!/bin/bash
#
# RefQuest Platform Startup Script
# PCOS Sports Perception Referee AI - Demo Ready
#
# Usage: ./START_REFQUEST.sh [--full|--ui-only|--status]
#
# Options:
#   --full      Start all services (Backend + UI + PCOS MCP)
#   --ui-only   Start only RefQuest UI (default)
#   --status    Show status of all services
#   --stop      Stop all RefQuest services
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directories
REFQUEST_ROOT="/home/cyberhope/Documents/pcos_sports_perception_referee_ai"
REFQUEST_UI="$REFQUEST_ROOT/refquest-ui"
PCOS_KERNEL="/home/cyberhope/pcos-mcp-kernel"

# Ports
BACKEND_PORT=8088
UI_PORT=5174
PCOS_PORT=7890

# PID file location
PID_DIR="$REFQUEST_ROOT/.pids"
mkdir -p "$PID_DIR"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           RefQuest Platform - PCOS Sports AI                 ║"
echo "║                    Phase 12.5 Demo Ready                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

show_status() {
    echo -e "${CYAN}=== Service Status ===${NC}"
    echo ""

    # Check Backend
    if ss -tlnp 2>/dev/null | grep -q ":$BACKEND_PORT"; then
        echo -e "  ${GREEN}✓${NC} Backend API      : Running on port $BACKEND_PORT"
    else
        echo -e "  ${RED}✗${NC} Backend API      : Not running"
    fi

    # Check UI
    if ss -tlnp 2>/dev/null | grep -q ":$UI_PORT"; then
        echo -e "  ${GREEN}✓${NC} RefQuest UI      : Running on port $UI_PORT"
    else
        echo -e "  ${RED}✗${NC} RefQuest UI      : Not running"
    fi

    # Check PCOS MCP
    if ss -tlnp 2>/dev/null | grep -q ":$PCOS_PORT"; then
        echo -e "  ${GREEN}✓${NC} PCOS MCP Kernel  : Running on port $PCOS_PORT"
    else
        echo -e "  ${YELLOW}○${NC} PCOS MCP Kernel  : Not running (optional)"
    fi

    echo ""
    echo -e "${CYAN}=== Access URLs ===${NC}"
    echo ""
    echo -e "  RefQuest UI     : ${GREEN}http://localhost:$UI_PORT/refquest${NC}"
    echo -e "  Backend API     : http://localhost:$BACKEND_PORT/docs"
    echo -e "  PCOS WebSocket  : ws://localhost:$PCOS_PORT"
    echo ""
    echo -e "  ${YELLOW}Developer Console: Press Ctrl+Shift+E in RefQuest UI${NC}"
    echo ""
}

stop_services() {
    echo -e "${YELLOW}Stopping RefQuest services...${NC}"

    # Kill by port
    fuser -k $UI_PORT/tcp 2>/dev/null || true
    fuser -k $BACKEND_PORT/tcp 2>/dev/null || true

    # Kill by PID files
    for pidfile in "$PID_DIR"/*.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            kill "$pid" 2>/dev/null || true
            rm "$pidfile"
        fi
    done

    sleep 2
    echo -e "${GREEN}Services stopped.${NC}"
}

start_backend() {
    echo -e "${CYAN}Starting Backend API on port $BACKEND_PORT...${NC}"

    # Check if already running
    if ss -tlnp 2>/dev/null | grep -q ":$BACKEND_PORT"; then
        echo -e "  ${YELLOW}Backend already running${NC}"
        return 0
    fi

    cd "$REFQUEST_ROOT"

    # Activate venv and start
    source venv/bin/activate
    uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload > "$PID_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"

    sleep 3

    if ss -tlnp 2>/dev/null | grep -q ":$BACKEND_PORT"; then
        echo -e "  ${GREEN}✓ Backend started${NC}"
    else
        echo -e "  ${RED}✗ Backend failed to start - check $PID_DIR/backend.log${NC}"
    fi
}

start_ui() {
    echo -e "${CYAN}Starting RefQuest UI on port $UI_PORT...${NC}"

    # Check if already running
    if ss -tlnp 2>/dev/null | grep -q ":$UI_PORT"; then
        echo -e "  ${YELLOW}UI already running${NC}"
        return 0
    fi

    cd "$REFQUEST_UI"

    # Start Vite dev server
    npm run dev -- --port $UI_PORT > "$PID_DIR/ui.log" 2>&1 &
    echo $! > "$PID_DIR/ui.pid"

    sleep 5

    if ss -tlnp 2>/dev/null | grep -q ":$UI_PORT"; then
        echo -e "  ${GREEN}✓ RefQuest UI started${NC}"
    else
        echo -e "  ${RED}✗ UI failed to start - check $PID_DIR/ui.log${NC}"
    fi
}

start_pcos() {
    echo -e "${CYAN}Starting PCOS MCP Kernel on port $PCOS_PORT...${NC}"

    # Check if already running
    if ss -tlnp 2>/dev/null | grep -q ":$PCOS_PORT"; then
        echo -e "  ${YELLOW}PCOS MCP already running${NC}"
        return 0
    fi

    if [ ! -d "$PCOS_KERNEL" ]; then
        echo -e "  ${RED}PCOS Kernel not found at $PCOS_KERNEL${NC}"
        return 1
    fi

    cd "$PCOS_KERNEL"

    # Activate venv and start telemetry server
    source .venv/bin/activate
    PYTHONPATH=src python scripts/demo_telemetry.py > "$PID_DIR/pcos.log" 2>&1 &
    echo $! > "$PID_DIR/pcos.pid"

    sleep 3

    if ss -tlnp 2>/dev/null | grep -q ":$PCOS_PORT"; then
        echo -e "  ${GREEN}✓ PCOS MCP Kernel started${NC}"
    else
        echo -e "  ${YELLOW}○ PCOS MCP Kernel not started (optional)${NC}"
    fi
}

open_browser() {
    echo ""
    echo -e "${CYAN}Opening RefQuest in browser...${NC}"
    sleep 2

    # Try different browser commands
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:$UI_PORT/refquest" 2>/dev/null &
    elif command -v google-chrome &> /dev/null; then
        google-chrome "http://localhost:$UI_PORT/refquest" 2>/dev/null &
    elif command -v firefox &> /dev/null; then
        firefox "http://localhost:$UI_PORT/refquest" 2>/dev/null &
    fi
}

# Parse arguments
MODE="ui-only"
OPEN_BROWSER=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            MODE="full"
            shift
            ;;
        --ui-only)
            MODE="ui-only"
            shift
            ;;
        --status)
            show_status
            exit 0
            ;;
        --stop)
            stop_services
            exit 0
            ;;
        --no-browser)
            OPEN_BROWSER=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--full|--ui-only|--status|--stop]"
            echo ""
            echo "Options:"
            echo "  --full        Start all services (Backend + UI + PCOS MCP)"
            echo "  --ui-only     Start only RefQuest UI (default)"
            echo "  --status      Show status of all services"
            echo "  --stop        Stop all RefQuest services"
            echo "  --no-browser  Don't open browser automatically"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Execute based on mode
case $MODE in
    "full")
        echo -e "${GREEN}Starting FULL RefQuest Platform...${NC}"
        echo ""
        start_backend
        start_pcos
        start_ui
        ;;
    "ui-only")
        echo -e "${GREEN}Starting RefQuest UI (mock data mode)...${NC}"
        echo ""
        start_ui
        ;;
esac

echo ""
show_status

if [ "$OPEN_BROWSER" = true ]; then
    open_browser
fi

echo ""
echo -e "${GREEN}RefQuest Platform Ready!${NC}"
echo ""
echo -e "To stop services: ${YELLOW}./START_REFQUEST.sh --stop${NC}"
echo -e "To check status:  ${YELLOW}./START_REFQUEST.sh --status${NC}"
echo ""
