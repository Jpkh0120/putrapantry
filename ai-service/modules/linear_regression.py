import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from datetime import datetime
from config.firebase import get_db


def _fetch_pickup_history():
    """Fetch all pickup history records from Firestore."""
    db = get_db()
    docs = db.collection('pickupHistory').stream()
    records = []
    for doc in docs:
        d = doc.to_dict()
        records.append(d)
    return records


def _build_features(records):
    """
    Convert pickup history records into a DataFrame with features:
    - day_of_week (0=Mon, 6=Sun)
    - week_of_year
    - item_encoded (Label encoded array value index map)
    Target: quantityTaken
    """
    if not records:
        return None, None, None

    df = pd.DataFrame(records)

    # Require these columns
    required = ['pickedUpAt', 'quantityTaken', 'itemId']
    if not all(c in df.columns for c in required):
        return None, None, None

    df['pickedUpAt'] = pd.to_datetime(df['pickedUpAt'], errors='coerce')
    df = df.dropna(subset=['pickedUpAt', 'quantityTaken'])

    df['day_of_week'] = df['pickedUpAt'].dt.dayofweek
    df['week_of_year'] = df['pickedUpAt'].dt.isocalendar().week.astype(int)
    df['item_encoded'] = df['itemId'].astype('category').cat.codes

    X = df[['day_of_week', 'week_of_year', 'item_encoded']].values
    y = df['quantityTaken'].values

    return X, y, df


def get_demand_forecast():
    """
    Train a Linear Regression model on historical pickup data.
    Returns a 7-day demand forecast per unique item mapped against current live stock.
    Falls back to synthetic data if real data is sparse.
    """
    records = _fetch_pickup_history()

    # Fall back to synthetic data when total database history is sparse
    if len(records) < 10:
        return _synthetic_forecast()

    result = _build_features(records)
    if result[0] is None:
        return _synthetic_forecast()

    X, y, df = result

    # Fit Scikit-Learn weights matrix
    model = LinearRegression()
    model.fit(X, y)

    # 🌟 STEP 1: Pull full inventory collections to drive left-join loop structure
    db = get_db()
    inventory_docs = db.collection('inventory').stream()
    item_name_map = {}
    
    for doc in inventory_docs:
        inv_data = doc.to_dict()
        item_name_map[doc.id] = inv_data.get('itemName', doc.id)

    today = datetime.utcnow()
    forecasts = []

    # 🌟 STEP 2: Iterate directly over the real Inventory collection items
    for item_id, item_name in item_name_map.items():
        
        # Isolate rows to see if this specific product has transactional history data
        item_rows = df[df['itemId'] == item_id]
        
        if not item_rows.empty:
            # Case A: Item has historical vectors. Use the trained model to calculate trends.
            item_code = item_rows['item_encoded'].iloc[0]
            weekly_predictions = []
            
            for day_offset in range(7):
                future_dow = (today.weekday() + day_offset) % 7
                future_week = today.isocalendar()[1]
                
                pred = model.predict([[future_dow, future_week, item_code]])[0]
                weekly_predictions.append(max(0, round(float(pred), 1)))
        else:
            # Case B: Brand new inventory item with 0 historical data points.
            # Fallback to a zeroed baseline array so it still populates a clean chart card.
            weekly_predictions = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

        total_7_days = round(sum(weekly_predictions), 1)

        forecasts.append({
            'itemId': item_id,
            'label': item_name, 
            'forecastedDemand': weekly_predictions,
            'totalForecast7Days': total_7_days,
            'suggestedRestockQty': max(0, round(total_7_days * 1.2)),  # Adds a 20% safety stock buffer
        })

    return {
        'forecasts': forecasts,
        'model': 'LinearRegression',
        'dataPoints': len(records),
        'note': 'Based on real pickup history linked to current physical stock registries.',
    }


def _synthetic_forecast():
    """
    Fallback synthetic forecast when real data is insufficient.
    """
    categories = [
        {'itemId': 'synthetic-grains', 'label': 'Grains & Rice', 'baseQty': 15},
        {'itemId': 'synthetic-canned', 'label': 'Canned Goods', 'baseQty': 10},
        {'itemId': 'synthetic-dairy', 'label': 'Dairy', 'baseQty': 8},
        {'itemId': 'synthetic-produce', 'label': 'Fresh Produce', 'baseQty': 12},
        {'itemId': 'synthetic-protein', 'label': 'Protein', 'baseQty': 9},
    ]

    forecasts = []
    for cat in categories:
        base = cat['baseQty']
        weekly = [base + np.random.randint(-2, 3) if i < 5 else max(1, base - 5)
                  for i in range(7)]
        weekly = [max(0, int(v)) for v in weekly]
        forecasts.append({
            'itemId': cat['itemId'],
            'label': cat['label'],
            'forecastedDemand': weekly,
            'totalForecast7Days': sum(weekly),
            'suggestedRestockQty': round(sum(weekly) * 1.2),
        })

    return {
        'forecasts': forecasts,
        'model': 'LinearRegression (synthetic)',
        'dataPoints': 0,
        'note': 'Insufficient pickup history — using synthetic baseline data. Train with real data after Sprint 2.',
    }