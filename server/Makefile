.PHONY: help test test-simple test-coverage clean server

# Default target
help:
	@echo "LawTime SMS OTP Authentication - Simple Test Commands"
	@echo "===================================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make test         Run automated tests (free, fast)"
	@echo "  make test-coverage Run tests with coverage report"
	@echo "  make test-real    Run real API tests (💰 costs SMS fees)"
	@echo "  make server       Start development server"
	@echo "  make clean        Clean test artifacts"
	@echo ""

# Activate virtual environment for all Python commands
VENV = source venv/bin/activate &&

# Run all unit tests (fast, automated)
test:
	@echo "Running unit tests..."
	$(VENV) pytest tests/unit/ -v

# Run tests with coverage report
test-coverage:
	@echo "Running tests with coverage..."
	$(VENV) pytest tests/unit/ --cov=app --cov-report=term-missing --cov-report=html

# Run specific test file
test-unit:
	@echo "Running unit tests..."
	$(VENV) pytest tests/unit/ -v

# Run real API tests (costs money for SMS!)
test-real:
	@echo "⚠️  WARNING: This will send REAL SMS messages and cost money!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read line
	@echo "Starting Flask server and running real API tests..."
	$(VENV) python tests/integration/test_auth_api.py

# Clean test artifacts
clean:
	@echo "Cleaning test artifacts..."
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf __pycache__
	find . -name "*.pyc" -delete

# Start development server
server:
	@echo "Starting development server on port 5000..."
	$(VENV) python run_server.py