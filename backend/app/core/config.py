import os
from pathlib import Path

from dotenv import load_dotenv  # load the contents of .env as environment variables

# Path to the backend/ folder
BACKEND_DIR = Path(__file__).resolve().parents[2]
# Path to the project root
ROOT_DIR = BACKEND_DIR.parent
# Path to the schema SQL file
SCHEMA_FILE = ROOT_DIR / "schema" / "schema.sql"
# Path to the CSV data folder
DATA_DIR = ROOT_DIR / "data"

# Load the project root .env
load_dotenv(ROOT_DIR / ".env")

# Debug mode: environment variables are strings, so compare against "true"
DEBUG = os.environ["DEBUG"].lower() == "true"

# Minimum log level to print: DEBUG, INFO, WARNING, ERROR or CRITICAL
LOG_LEVEL = os.environ["LOG_LEVEL"].upper()

# Database connection info
DB_HOST = os.environ["DB_HOST"]
DB_PORT = int(os.environ["DB_PORT"])
DB_NAME = os.environ["DB_NAME"]
DB_USER = os.environ["DB_USER"]
DB_PASSWORD = os.environ["DB_PASSWORD"]
