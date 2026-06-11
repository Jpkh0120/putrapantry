import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from config.firebase import get_db

EXPIRY_WARNING_DAYS = int(os.getenv('EXPIRY_WARNING_DAYS', 3))
LOW_STOCK_THRESHOLD = int(os.getenv('LOW_STOCK_THRESHOLD', 10))


def get_expiry_alerts():
    """
    Rule-Based Logic:
    - Flag items expiring within EXPIRY_WARNING_DAYS
    - Flag items below LOW_STOCK_THRESHOLD
    Returns a dict with two lists: expiry_alerts and low_stock_alerts
    """
    db = get_db()
    inventory_ref = db.collection('inventory').stream()

    expiry_alerts = []
    low_stock_alerts = []
    cutoff_date = datetime.utcnow() + timedelta(days=EXPIRY_WARNING_DAYS)

    for doc in inventory_ref:
        item = doc.to_dict()
        item['id'] = doc.id

        # Check expiry
        try:
            expiry = datetime.fromisoformat(item.get('expiryDate', ''))
            days_left = (expiry - datetime.utcnow()).days
            if days_left <= EXPIRY_WARNING_DAYS:
                expiry_alerts.append({
                    'id': item['id'],
                    'itemName': item.get('itemName'),
                    'expiryDate': item.get('expiryDate'),
                    'daysLeft': days_left,
                    'quantity': item.get('quantity'),
                })
        except (ValueError, TypeError):
            pass  # Skip items with invalid/missing dates

        # Check low stock
        qty = item.get('quantity', 0)
        if qty < LOW_STOCK_THRESHOLD:
            low_stock_alerts.append({
                'id': item['id'],
                'itemName': item.get('itemName'),
                'quantity': qty,
                'threshold': LOW_STOCK_THRESHOLD,
            })

    return {
        'expiryAlerts': expiry_alerts,
        'lowStockAlerts': low_stock_alerts,
        'totalAlerts': len(expiry_alerts) + len(low_stock_alerts),
    }
