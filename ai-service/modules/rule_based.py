import os
import sys
from datetime import datetime, date
from config.firebase import get_db

# Insert the parent directory into system path to handle relative module resolutions cleanly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

EXPIRY_WARNING_DAYS = int(os.getenv('EXPIRY_WARNING_DAYS', 3))
LOW_STOCK_THRESHOLD = int(os.getenv('LOW_STOCK_THRESHOLD', 10))


def get_expiry_alerts():
    """
    Rule-Based Logic:
    - Flag items explicitly expiring within EXPIRY_WARNING_DAYS (not yet expired)
    - Flag items below LOW_STOCK_THRESHOLD
    Returns a dict with precise categorization arrays
    """
    db = get_db()
    inventory_ref = db.collection('inventory').stream()

    expiry_alerts = []
    low_stock_alerts = []
    
    # Use localized date objects to eliminate fractional UTC hours drifting
    today = date.today()

    for doc in inventory_ref:
        item = doc.to_dict()
        item['id'] = doc.id

        # Check expiry matrix
        expiry_str = item.get('expiryDate', '')
        if expiry_str:
            try:
                # 🌟 FIXED: Timezone-safe string slicing using native Python bracket notation [:10]
                expiry_date = datetime.fromisoformat(expiry_str[:10]).date()
                days_left = (expiry_date - today).days
                
                # Only include it here if it is expiring soon or exactly today, 
                # but NOT if it has already completely expired in the past!
                if 0 <= days_left <= EXPIRY_WARNING_DAYS:
                    expiry_alerts.append({
                        'id': item['id'],
                        'itemName': item.get('itemName'),
                        'expiryDate': item.get('expiryDate'),
                        'daysLeft': days_left,
                        'quantity': item.get('quantity'),
                    })
            except (ValueError, TypeError):
                pass  # Skip items with unparseable formats

        # Check low stock parameters independently
        qty = item.get('quantity', 0)
        if qty < LOW_STOCK_THRESHOLD:
            low_stock_alerts.append({
                'id': item['id'],
                'itemName': item.get('itemName'),
                'quantity': qty,
                'threshold': LOW_STOCK_THRESHOLD,
                'expiryDate': item.get('expiryDate'),  # Passed along to help frontend rendering paths
            })

    return {
        'expiryAlerts': expiry_alerts,
        'lowStockAlerts': low_stock_alerts,
        'totalAlerts': len(expiry_alerts) + len(low_stock_alerts),
    }