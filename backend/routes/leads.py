from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from bson import ObjectId
from backend.database import leads_collection
from backend.auth import token_required

leads_bp = Blueprint('leads', __name__)

def serialize_lead(lead):
    """Convert MongoDB Document to JSON-serializable format."""
    if not lead:
        return None
    lead['id'] = str(lead['_id'])
    lead.pop('_id', None)
    
    # Format datetime objects to ISO strings
    for field in ['createdAt', 'updatedAt']:
        if field in lead and lead[field]:
            if isinstance(lead[field], datetime):
                lead[field] = lead[field].replace(tzinfo=timezone.utc).isoformat()
                
    if 'notes' in lead and isinstance(lead['notes'], list):
        for note in lead['notes']:
            if 'createdAt' in note and isinstance(note['createdAt'], datetime):
                note['createdAt'] = note['createdAt'].replace(tzinfo=timezone.utc).isoformat()
    else:
        lead['notes'] = []
        
    return lead

@leads_bp.route('', methods=['GET'])
@token_required
def get_leads(current_user):
    """Retrieve leads with search, filter, sorting, and pagination."""
    # Get parameters
    search = request.args.get('search', '').strip()
    status = request.args.get('status', '').strip()
    source = request.args.get('source', '').strip()
    sort = request.args.get('sort', 'date_desc').strip()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    query = {}
    
    # Apply search filter
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'company': {'$regex': search, '$options': 'i'}},
            {'notes.text': {'$regex': search, '$options': 'i'}}
        ]
        
    # Apply status filter
    if status:
        query['status'] = status
        
    # Apply source filter
    if source:
        query['source'] = source
        
    # Build sort criteria
    sort_criteria = [('createdAt', -1)]  # default
    if sort == 'date_asc':
        sort_criteria = [('createdAt', 1)]
    elif sort == 'name_asc':
        sort_criteria = [('name', 1)]
    elif sort == 'name_desc':
        sort_criteria = [('name', -1)]
    elif sort == 'updated_desc':
        sort_criteria = [('updatedAt', -1)]
        
    # Calculate skip and limit
    skip = (page - 1) * limit
    
    # Query database
    total_leads = leads_collection.count_documents(query)
    cursor = leads_collection.find(query).sort(sort_criteria).skip(skip).limit(limit)
    leads = [serialize_lead(lead) for lead in cursor]
    
    # Calculate total pages
    pages = (total_leads + limit - 1) // limit if total_leads > 0 else 1
    
    return jsonify({
        'leads': leads,
        'total': total_leads,
        'page': page,
        'limit': limit,
        'pages': pages
    }), 200

@leads_bp.route('/<lead_id>', methods=['GET'])
@token_required
def get_lead(current_user, lead_id):
    """Retrieve detailed info for a single lead."""
    try:
        lead = leads_collection.find_one({'_id': ObjectId(lead_id)})
        if not lead:
            return jsonify({'message': 'Lead not found!'}), 404
        return jsonify(serialize_lead(lead)), 200
    except Exception:
        return jsonify({'message': 'Invalid Lead ID format!'}), 400

@leads_bp.route('', methods=['POST'])
def create_lead():
    """Create a new lead. Endpoint is public to allow website contact forms to submit leads."""
    data = request.get_json() or {}
    
    # Validate required fields
    name = data.get('name')
    email = data.get('email')
    
    if not name or not email:
        return jsonify({'message': 'Name and Email are required!'}), 400
        
    now = datetime.now(timezone.utc)
    
    # Build lead fields
    lead = {
        'name': name.strip(),
        'email': email.lower().strip(),
        'phone': data.get('phone', '').strip(),
        'company': data.get('company', '').strip(),
        'source': data.get('source', 'Website').strip(),
        'status': data.get('status', 'New').strip(),
        'notes': [],
        'createdAt': now,
        'updatedAt': now
    }
    
    # If a message is sent via public contact form, add it as the initial note
    message = data.get('message')
    if message:
        lead['notes'].append({
            'id': str(ObjectId()),
            'text': f"Initial message: {message.strip()}",
            'createdAt': now
        })
        
    result = leads_collection.insert_one(lead)
    lead['id'] = str(result.inserted_id)
    lead.pop('_id')
    lead['createdAt'] = lead['createdAt'].isoformat()
    lead['updatedAt'] = lead['updatedAt'].isoformat()
    if lead['notes']:
        lead['notes'][0]['createdAt'] = lead['notes'][0]['createdAt'].isoformat()
        
    return jsonify({
        'message': 'Lead created successfully!',
        'lead': lead
    }), 201

@leads_bp.route('/<lead_id>', methods=['PUT'])
@token_required
def update_lead(current_user, lead_id):
    """Update detailed info for a single lead."""
    try:
        data = request.get_json() or {}
        now = datetime.now(timezone.utc)
        
        # Check if lead exists
        existing = leads_collection.find_one({'_id': ObjectId(lead_id)})
        if not existing:
            return jsonify({'message': 'Lead not found!'}), 404
            
        update_fields = {
            'name': data.get('name', existing.get('name')).strip(),
            'email': data.get('email', existing.get('email')).lower().strip(),
            'phone': data.get('phone', existing.get('phone', '')).strip(),
            'company': data.get('company', existing.get('company', '')).strip(),
            'source': data.get('source', existing.get('source', 'Website')).strip(),
            'status': data.get('status', existing.get('status', 'New')).strip(),
            'updatedAt': now
        }
        
        leads_collection.update_one(
            {'_id': ObjectId(lead_id)},
            {'$set': update_fields}
        )
        
        # Fetch updated doc
        updated = leads_collection.find_one({'_id': ObjectId(lead_id)})
        return jsonify({
            'message': 'Lead updated successfully!',
            'lead': serialize_lead(updated)
        }), 200
    except Exception as e:
         return jsonify({'message': f'Error updating lead: {str(e)}'}), 400

@leads_bp.route('/<lead_id>', methods=['DELETE'])
@token_required
def delete_lead(current_user, lead_id):
    """Delete a single lead."""
    try:
        result = leads_collection.delete_one({'_id': ObjectId(lead_id)})
        if result.deleted_count == 0:
            return jsonify({'message': 'Lead not found!'}), 404
        return jsonify({'message': 'Lead deleted successfully!'}), 200
    except Exception:
        return jsonify({'message': 'Invalid Lead ID format!'}), 400

# ----------------- NOTE CRUD ROUTES -----------------

@leads_bp.route('/<lead_id>/notes', methods=['POST'])
@token_required
def add_note(current_user, lead_id):
    """Add a follow-up note to a lead."""
    try:
        data = request.get_json() or {}
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'message': 'Note text cannot be empty!'}), 400
            
        now = datetime.now(timezone.utc)
        new_note = {
            'id': str(ObjectId()),
            'text': text,
            'createdAt': now
        }
        
        result = leads_collection.update_one(
            {'_id': ObjectId(lead_id)},
            {
                '$push': {'notes': new_note},
                '$set': {'updatedAt': now}
            }
        )
        
        if result.matched_count == 0:
            return jsonify({'message': 'Lead not found!'}), 404
            
        # Serialize datetime for response
        new_note['createdAt'] = new_note['createdAt'].isoformat()
        return jsonify({
            'message': 'Note added successfully!',
            'note': new_note
        }), 201
    except Exception as e:
        return jsonify({'message': f'Error adding note: {str(e)}'}), 400

@leads_bp.route('/<lead_id>/notes/<note_id>', methods=['PUT'])
@token_required
def update_note(current_user, lead_id, note_id):
    """Edit the text of an existing follow-up note."""
    try:
        data = request.get_json() or {}
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'message': 'Note text cannot be empty!'}), 400
            
        now = datetime.now(timezone.utc)
        
        # Check if lead and note exist
        lead = leads_collection.find_one({'_id': ObjectId(lead_id)})
        if not lead:
            return jsonify({'message': 'Lead not found!'}), 404
            
        # Find and update specific note inside notes array
        note_found = False
        notes = lead.get('notes', [])
        for note in notes:
            if note.get('id') == note_id:
                note['text'] = text
                # We update the modified note text
                note_found = True
                break
                
        if not note_found:
            return jsonify({'message': 'Note not found!'}), 404
            
        leads_collection.update_one(
            {'_id': ObjectId(lead_id)},
            {
                '$set': {
                    'notes': notes,
                    'updatedAt': now
                }
            }
        )
        
        return jsonify({'message': 'Note updated successfully!'}), 200
    except Exception as e:
        return jsonify({'message': f'Error updating note: {str(e)}'}), 400

@leads_bp.route('/<lead_id>/notes/<note_id>', methods=['DELETE'])
@token_required
def delete_note(current_user, lead_id, note_id):
    """Delete an existing follow-up note."""
    try:
        now = datetime.now(timezone.utc)
        
        # Pull note with given note_id from notes list
        result = leads_collection.update_one(
            {'_id': ObjectId(lead_id)},
            {
                '$pull': {'notes': {'id': note_id}},
                '$set': {'updatedAt': now}
            }
        )
        
        if result.matched_count == 0:
            return jsonify({'message': 'Lead not found!'}), 404
            
        return jsonify({'message': 'Note deleted successfully!'}), 200
    except Exception as e:
        return jsonify({'message': f'Error deleting note: {str(e)}'}), 400
