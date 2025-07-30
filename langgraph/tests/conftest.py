import pytest
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(".env")

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
