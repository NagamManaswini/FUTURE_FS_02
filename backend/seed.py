import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any
 # pyrefly: ignore [missing-import]
from bson import ObjectId

# Ensure parent directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import db, leads_collection, users_collection
from backend.auth import hash_password
from backend.config import Config

def seed_database():
    print("Initializing Database Seeder...")
    
    # 1. Reset collections (clean start)
    print("Clearing existing collections...")
    leads_collection.delete_many({})
    users_collection.delete_many({})
    
    # 2. Seed Admin User
    admin_email = Config.ADMIN_EMAIL.lower().strip()
    admin_pw = Config.ADMIN_PASSWORD
    hashed_pw = hash_password(admin_pw)
    
    users_collection.insert_one({
        'email': admin_email,
        'password': hashed_pw
    })
    print(f"-> Seeded Admin User: {admin_email} / {admin_pw}")
    
    # 3. Create Sample Leads spanning the last 3 months
    now = datetime.now(timezone.utc)
    
    sample_leads: list[dict[str, Any]] = [
        {
            'name': 'John Doe',
            'email': 'john@example.com',
            'phone': '9876543210',
            'company': 'ABC Pvt Ltd',
            'source': 'Website',
            'status': 'New',
            'days_ago': 2,
            'notes': [
                {'text': 'Initial message: Interested in your custom software pricing.', 'offset_days': 2}
            ]
        },
        {
            'name': 'Jane Smith',
            'email': 'jane@example.com',
            'phone': '9871234560',
            'company': 'XYZ Innovations',
            'source': 'Facebook',
            'status': 'Contacted',
            'days_ago': 14,
            'notes': [
                {'text': 'Initial message: Saw your ad on Facebook. Do you offer consulting?', 'offset_days': 14},
                {'text': 'Called client on 15 July. She was busy, requested call back tomorrow.', 'offset_days': 12},
                {'text': 'Followed up via call. Discussed project specifications and scheduled next review.', 'offset_days': 11}
            ]
        },
        {
            'name': 'Robert Johnson',
            'email': 'robert@techsolutions.com',
            'phone': '5556667777',
            'company': 'Tech Solutions LLC',
            'source': 'LinkedIn',
            'status': 'Converted',
            'days_ago': 45,
            'notes': [
                {'text': 'Initial message: Connect request. Looking for a development partner.', 'offset_days': 45},
                {'text': 'Called to introduce our services. Very positive response.', 'offset_days': 40},
                {'text': 'Sent contract proposal document.', 'offset_days': 35},
                {'text': 'Contract signed! Lead converted to active customer.', 'offset_days': 30}
            ]
        },
        {
            'name': 'Michael Brown',
            'email': 'michael@innovate.co',
            'phone': '4443332222',
            'company': 'Innovate Co',
            'source': 'Referral',
            'status': 'Converted',
            'days_ago': 60,
            'notes': [
                {'text': 'Referred by active client Alice. Interested in our backend migration service.', 'offset_days': 60},
                {'text': 'Sent proposal & quote for the migration layout.', 'offset_days': 55},
                {'text': 'Proposal accepted! Client converted.', 'offset_days': 50}
            ]
        },
        {
            'name': 'Emily Davis',
            'email': 'emily@creativestudio.com',
            'phone': '8889990000',
            'company': 'Creative Studio',
            'source': 'Instagram',
            'status': 'Contacted',
            'days_ago': 5,
            'notes': [
                {'text': 'Initial message: DM inquiry about logo design options.', 'offset_days': 5},
                {'text': 'Replied to DM query. Sent design catalog.', 'offset_days': 4},
                {'text': 'Follow-up scheduled next week to review catalog.', 'offset_days': 2}
            ]
        },
        {
            'name': 'William Wilson',
            'email': 'william@globalinc.com',
            'phone': '1112223333',
            'company': 'Global Inc',
            'source': 'Other',
            'status': 'New',
            'days_ago': 8,
            'notes': [
                {'text': 'Met William at local business meetup. Exchanged contact info.', 'offset_days': 8}
            ]
        },
        {
            'name': 'Jessica Taylor',
            'email': 'jessica@designworks.com',
            'phone': '9998887777',
            'company': 'Design Works',
            'source': 'Website',
            'status': 'Converted',
            'days_ago': 30,
            'notes': [
                {'text': 'Submitted website contact form for UI/UX audit.', 'offset_days': 30},
                {'text': 'Audit presentation call conducted.', 'offset_days': 25},
                {'text': 'Invoice paid. Audit scheduled.', 'offset_days': 22}
            ]
        },
        {
            'name': 'David Thomas',
            'email': 'david@fastdelivery.com',
            'phone': '2223334444',
            'company': 'Fast Delivery Co',
            'source': 'Facebook',
            'status': 'New',
            'days_ago': 1,
            'notes': [
                {'text': 'Interested in CRM API connection details.', 'offset_days': 1}
            ]
        },
        {
            'name': 'Sarah Jackson',
            'email': 'sarah@greentech.com',
            'phone': '3334445555',
            'company': 'Green Tech Solutions',
            'source': 'LinkedIn',
            'status': 'Contacted',
            'days_ago': 25,
            'notes': [
                {'text': 'LinkedIn message: Interested in sustainable cloud hosting.', 'offset_days': 25},
                {'text': 'Exchanged introductory emails.', 'offset_days': 20}
            ]
        },
        {
            'name': 'Karen White',
            'email': 'karen@stylelab.org',
            'phone': '6667778888',
            'company': 'Style Lab',
            'source': 'Instagram',
            'status': 'Converted',
            'days_ago': 18,
            'notes': [
                {'text': 'DM inquiry for influencer campaign management.', 'offset_days': 18},
                {'text': 'Sent rate sheet and campaign roadmap.', 'offset_days': 16},
                {'text': 'Deposit received! Campaign launched.', 'offset_days': 12}
            ]
        },
        {
            'name': 'Charles Harris',
            'email': 'charles@buildgroup.net',
            'phone': '7778889999',
            'company': 'Build Group',
            'source': 'Referral',
            'status': 'New',
            'days_ago': 6,
            'notes': [
                {'text': 'Referred by Bob. Needs estimator software implementation.', 'offset_days': 6}
            ]
        },
        {
            'name': 'Thomas Martin',
            'email': 'thomas@healthfirst.org',
            'phone': '4445556666',
            'company': 'Health First Tech',
            'source': 'Website',
            'status': 'Contacted',
            'days_ago': 40,
            'notes': [
                {'text': 'Website form: HIPAA compliance application consultation.', 'offset_days': 40},
                {'text': 'Sent questionnaire to evaluate requirements.', 'offset_days': 35}
            ]
        },
        {
            'name': 'Patricia Garcia',
            'email': 'patricia@educationhub.edu',
            'phone': '5554443333',
            'company': 'Education Hub',
            'source': 'Website',
            'status': 'Converted',
            'days_ago': 75,
            'notes': [
                {'text': 'Contacted via portal regarding e-learning platforms.', 'offset_days': 75},
                {'text': 'Demo conducted successfully.', 'offset_days': 70},
                {'text': 'Purchase order received. Accounts created.', 'offset_days': 65}
            ]
        },
        {
            'name': 'Christopher Clark',
            'email': 'chris@mediahouse.net',
            'phone': '1239874560',
            'company': 'Media House',
            'source': 'LinkedIn',
            'status': 'New',
            'days_ago': 3,
            'notes': []
        },
        {
            'name': 'Nancy Rodriguez',
            'email': 'nancy@fooddelights.com',
            'phone': '3216540987',
            'company': 'Food Delights LLC',
            'source': 'Other',
            'status': 'Contacted',
            'days_ago': 20,
            'notes': [
                {'text': 'Met at Food Expo, scheduled software demonstration.', 'offset_days': 20},
                {'text': 'Sent follow-up email confirming demo date.', 'offset_days': 18}
            ]
        }
    ]
    
    for lead_data in sample_leads:
        created_time = now - timedelta(days=lead_data['days_ago'])
        updated_time = created_time + timedelta(hours=6)
        
        # Build note documents
        notes = []
        for note in lead_data['notes']:
            note_time = now - timedelta(days=note['offset_days'])
            notes.append({
                'id': str(ObjectId()),
                'text': note['text'],
                'createdAt': note_time
            })
            
        lead = {
            'name': lead_data['name'],
            'email': lead_data['email'],
            'phone': lead_data['phone'],
            'company': lead_data['company'],
            'source': lead_data['source'],
            'status': lead_data['status'],
            'notes': notes,
            'createdAt': created_time,
            'updatedAt': updated_time
        }
        leads_collection.insert_one(lead)
        
    print(f"-> Seeded {len(sample_leads)} Mock Leads successfully!")
    print("Database seeding completed.")

if __name__ == '__main__':
    seed_database()
