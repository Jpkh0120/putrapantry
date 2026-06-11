import os
import sys
import random
from datetime import datetime, timedelta

# Maintain relative path injection to easily import your local config folder modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.firebase import initialize_firebase, get_db

def seed_pantry_data():
    print("🔄 Initializing Firebase connection profile...")
    initialize_firebase()
    
    db = get_db()
    
    # 1. Fetch live item document hash references dynamically from your inventory
    print("🔍 Fetching active item references from inventory...")
    inventory_docs = db.collection('inventory').stream()
    real_item_ids = [doc.id for doc in inventory_docs]
    
    if not real_item_ids:
        print("❌ ERROR: Your 'inventory' collection is completely empty!")
        print("Please add a few items via the 'Inventory' tab in your Admin panel first.")
        return

    print(f"📋 Found {len(real_item_ids)} real item registries to seed against.")
    
    # 2. Clear out old uniform noise dataset entries to keep tracking pure
    print("🧹 Cleaning up old flat transaction history records...")
    old_pickups = db.collection('pickupHistory').stream()
    for doc in old_pickups:
        doc.reference.delete()

    # 3. Inject a patterned tracking dataset to train the Linear Regression algorithm
    pickup_collection = db.collection('pickupHistory')
    print("🚀 Seeding 60 history points with structured variance (Friday spikes)...")
    
    for i in range(60):
        # Spread transactions evenly over the last 28 days
        days_ago = random.randint(1, 28)
        timestamp = datetime.utcnow() - timedelta(days=days_ago)
        day_of_week = timestamp.weekday()  # 0 = Monday, 4 = Friday, 5 = Saturday, 6 = Sunday
        
        # 🌟 MATHEMATICAL VARIANCE: Hardcode explicit weekly demand habits
        if day_of_week == 4:      # Fridays: Large pre-weekend rush spikes
            base_qty = random.randint(10, 16)
        elif day_of_week == 0:    # Mondays: Moderate beginning-of-week pickups
            base_qty = random.randint(6, 11)
        elif day_of_week in [5, 6]:  # Weekends: Pantry closed/low campus activity
            base_qty = random.randint(1, 3)
        else:                     # Tue, Wed, Thu: Steady mid-week flow
            base_qty = random.randint(4, 8)
            
        mock_record = {
            "itemId": random.choice(real_item_ids),
            "quantityTaken": float(base_qty),  # Live quantitative target value
            "pickedUpAt": timestamp.isoformat() + "Z", 
            "studentId": f"student_uid_{random.randint(100, 200)}"
        }
        
        pickup_collection.add(mock_record)
        
    print("✅ Successfully injected 60 patterned historical data vectors!")

if __name__ == "__main__":
    seed_pantry_data()