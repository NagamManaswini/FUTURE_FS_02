import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from backend.config import Config

try:
    # Setup client with a 5-second timeout for server selection so it fails quickly if MongoDB isn't running
    client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
    
    # Try to ping the server to verify the connection is alive
    client.admin.command('ping')
    
    db = client.get_default_database()
    print(f"Successfully connected to MongoDB database: {db.name}")
except (ConnectionFailure, ServerSelectionTimeoutError) as e:
    print(f"CRITICAL ERROR: Could not connect to MongoDB at {Config.MONGO_URI}.", file=sys.stderr)
    print("Please make sure MongoDB is running locally or check your MONGO_URI in the environment variables.", file=sys.stderr)
    print(f"Details: {e}", file=sys.stderr)
    # We will still allow DB variables to be imported but warn they will fail when queried
    db = client.get_database("mini_crm")

# Collections
leads_collection = db["leads"]
users_collection = db["users"]
