.PHONY: help test test-simple test-coverage clean server

# Default target
help:
	@echo "LawTime SMS OTP Authentication - Simple Test Commands"
	@echo "===================================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make test         Run all unit tests (free, fast)"
	@echo "  make test-all     Run all tests (unit + integration)"
	@echo "  make test-coverage Run tests with coverage report"
	@echo ""
	@echo "Integration Tests:"
	@echo "  make test-integration Run integration tests only"
	@echo "  make test-api-endpoints Run API endpoint tests only"
	@echo "  make test-auth-workflow Run auth workflow tests only"
	@echo ""
	@echo "Controller Tests:"
	@echo "  make test-auth    Run auth controller tests only"
	@echo "  make test-auth-coverage Run auth tests with coverage"
	@echo "  make test-task    Run task controller tests only"
	@echo "  make test-task-coverage Run task tests with coverage"
	@echo ""
	@echo "Service Tests:"
	@echo "  make test-services Run all service tests"
	@echo "  make test-services-coverage Run service tests with coverage"
	@echo "  make test-auth-service Run auth service tests only"
	@echo "  make test-phone-service Run phone service tests only"
	@echo "  make test-task-service Run task service tests only"
	@echo ""
	@echo "  make server       Start development server"
	@echo "  make clean        Clean test artifacts"
	@echo ""

# Activate virtual environment for all Python commands
VENV = source ../.venv/bin/activate &&

# Run all unit tests (fast, automated)
test:
	@echo "Running unit tests..."
	$(VENV) pytest tests/unit/ -v

# Run tests with coverage report
test-coverage:
	@echo "Running tests with coverage..."
	$(VENV) pytest tests/unit/ --cov=controllers --cov=services --cov=app --cov-report=term-missing --cov-report=html

# Run specific test file
test-unit:
	@echo "Running unit tests..."
	$(VENV) pytest tests/unit/ -v

# Run auth controller tests specifically
test-auth:
	@echo "Running auth controller tests..."
	$(VENV) pytest tests/unit/test_auth_controller.py -v

# Run auth controller tests with coverage
test-auth-coverage:
	@echo "Running auth controller tests with coverage..."
	$(VENV) pytest tests/unit/test_auth_controller.py --cov=controllers.auth_controller --cov-report=term-missing

# Run task controller tests specifically
test-task:
	@echo "Running task controller tests..."
	$(VENV) pytest tests/unit/test_task_controller.py -v

# Run task controller tests with coverage
test-task-coverage:
	@echo "Running task controller tests with coverage..."
	$(VENV) pytest tests/unit/test_task_controller.py --cov=controllers.task_controller --cov-report=term-missing

# Run all service tests
test-services:
	@echo "Running all service tests..."
	$(VENV) pytest tests/unit/test_auth_service.py tests/unit/test_phone_verification_service.py tests/unit/test_task_service.py -v

# Run service tests with coverage
test-services-coverage:
	@echo "Running service tests with coverage..."
	$(VENV) pytest tests/unit/test_auth_service.py tests/unit/test_phone_verification_service.py tests/unit/test_task_service.py --cov=services --cov-report=term-missing

# Run individual service tests
test-auth-service:
	@echo "Running auth service tests..."
	$(VENV) pytest tests/unit/test_auth_service.py -v

test-phone-service:
	@echo "Running phone verification service tests..."
	$(VENV) pytest tests/unit/test_phone_verification_service.py -v

test-task-service:
	@echo "Running task service tests..."
	$(VENV) pytest tests/unit/test_task_service.py -v

# Clean test artifacts
clean:
	@echo "Cleaning test artifacts..."
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf __pycache__
	find . -name "*.pyc" -delete

# Run all tests (unit + integration)
test-all:
	@echo "Running all tests (unit + integration)..."
	$(VENV) pytest tests/ -v

# Run integration tests only
test-integration:
	@echo "Running integration tests..."
	$(VENV) pytest tests/integration/ -v

# Run API endpoint integration tests
test-api-endpoints:
	@echo "Running API endpoint integration tests..."
	$(VENV) pytest tests/integration/test_api_endpoints.py -v

# Run authentication workflow integration tests
test-auth-workflow:
	@echo "Running authentication workflow integration tests..."
	$(VENV) pytest tests/integration/test_auth_workflow.py -v

# Start development server
server:
	@echo "Starting development server on port 5001..."
	$(VENV) python run_server.py