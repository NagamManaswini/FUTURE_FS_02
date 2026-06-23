
from flask import Blueprint, jsonify
from datetime import datetime
from backend.database import leads_collection
from backend.auth import token_required

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('', methods=['GET'])
@token_required
def get_analytics(current_user):
    """Retrieve summarized statistics for dashboard metrics and charts."""
    try:
        # Load all leads from database

        all_leads = list(leads_collection.find({}))
        
        total = len(all_leads)
        new_count = sum(1 for l in all_leads if l.get('status') == 'New')
        contacted_count = sum(1 for l in all_leads if l.get('status') == 'Contacted')
        converted_count = sum(1 for l in all_leads if l.get('status') == 'Converted')
        
        conversion_rate = round((converted_count / total * 100), 1) if total > 0 else 0.0
        
        # Breakdown by Status
        status_map = {'New': 0, 'Contacted': 0, 'Converted': 0}
        for l in all_leads:
            status = l.get('status', 'New')
            if status in status_map:
                status_map[status] += 1
            else:
                status_map[status] = 1
                
        by_status = [{'status': k, 'count': v} for k, v in status_map.items()]
        
        # Breakdown by Source
        sources = ['Website', 'Facebook', 'Instagram', 'LinkedIn', 'Referral', 'Other']
        source_map = {s: 0 for s in sources}
        for l in all_leads:
            source = l.get('source', 'Other')
            if source in source_map:
                source_map[source] += 1
            else:
                source_map['Other'] += 1
                
        by_source = [{'source': k, 'count': v} for k, v in source_map.items()]
        
        # Monthly Registration Trends (Last 6 Months)
        # We will parse the createdAt datetime and group by Year-Month
        monthly_trends = {}
        for l in all_leads:
            created_at = l.get('createdAt')
            if isinstance(created_at, datetime):
                # E.g. "Jun 2026"
                month_key = created_at.strftime('%b %Y')
                monthly_trends[month_key] = monthly_trends.get(month_key, 0) + 1
        
        # Sort months chronologically
        # To sort, we parse month names back to datetime object keys
        def month_sort_key(item):
            try:
                return datetime.strptime(item[0], '%b %Y')
            except Exception:
                return datetime.min
                
        sorted_months = sorted(monthly_trends.items(), key=month_sort_key)
        by_month = [{'month': k, 'count': v} for k, v in sorted_months][-6:]  # Get last 6 active months
        
        return jsonify({
            'summary': {
                'totalLeads': total,
                'newLeads': new_count,
                'contactedLeads': contacted_count,
                'convertedLeads': converted_count,
                'conversionRate': conversion_rate
            },
            'byStatus': by_status,
            'bySource': by_source,
            'byMonth': by_month
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Error fetching analytics: {str(e)}'}), 500
