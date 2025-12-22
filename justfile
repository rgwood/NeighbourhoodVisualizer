# Default recipe - show available commands
default:
    @just --list

# Start development server
dev:
    npm run dev

# Build for production
build:
    npm run build

# Preview production build
preview:
    npm run preview

# Type check
check:
    npm run check

# Install dependencies
install:
    npm install

# Clean build artifacts
clean:
    rm -rf dist node_modules/.vite

# Full rebuild (clean + install + build)
rebuild: clean install build

# Format with prettier (if available) or just check types
lint: check

# Open in browser (assumes dev server running on default port)
open:
    open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173
