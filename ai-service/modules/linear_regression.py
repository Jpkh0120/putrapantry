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
    - category (label-encoded)
    Target: quantityTaken
    """
    if not records:
        return None, None

    df = pd.DataFrame(records)

    # Require these columns
    required = ['pickedUpAt', 'quantityTaken', 'itemId']
    if not all(c in df.columns for c in required):
        return None, None

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
    Returns a 7-day demand forecast per unique item.
    Falls back to synthetic data if real data is insufficient.
    """
    records = _fetch_pickup_history()

    # Fall back to synthetic data when history is sparse
    if len(records) < 10:
        return _synthetic_forecast()

    result = _build_features(records)
    if result[0] is None:
        return _synthetic_forecast()

    X, y, df = result

    model = LinearRegression()
    model.fit(X, y)

    # Forecast next 7 days for each unique item
    today = datetime.utcnow()
    forecasts = []
    unique_items = df[['itemId', 'item_encoded']].drop_duplicates()

    for _, row in unique_items.iterrows():
        item_id = row['itemId']
        item_code = row['item_encoded']
        weekly_predictions = []

        for day_offset in range(7):
            future_date = today
            future_dow = (today.weekday() + day_offset) % 7
            future_week = today.isocalendar()[1]
            pred = model.predict([[future_dow, future_week, item_code]])[0]
            weekly_predictions.append(max(0, round(float(pred), 1)))

        forecasts.append({
            'itemId': item_id,
            'forecastedDemand': weekly_predictions,
            'totalForecast7Days': round(sum(weekly_predictions), 1),
            'suggestedRestockQty': max(0, round(sum(weekly_predictions) * 1.2)),  # 20% buffer
        })

    return {
        'forecasts': forecasts,
        'model': 'LinearRegression',
        'dataPoints': len(records),
        'note': 'Based on real pickup history',
    }


def _synthetic_forecast():
    """
    Fallback synthetic forecast when real data is insufficient.
    Uses hardcoded categories that match the system's inventory structure.
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
        # Simulate weekday variation (Mon-Fri higher, weekend lower)
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
