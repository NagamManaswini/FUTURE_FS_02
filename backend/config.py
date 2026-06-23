import os
from dotenv import load_dotenv

# Load environmental variables from .env file if present
load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/mini_crm")
    JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-crm-key-change-in-production")
    PORT = int(os.getenv("PORT", 5000))
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))
    
    # Default admin user credentials created on startup if database is empty
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@crm.com")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
