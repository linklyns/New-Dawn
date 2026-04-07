"""Pipeline 3 — Social Media Best Posting Times.

Trains a regression model on estimated_donation_value_php using post features
including day_of_week and post_hour, then generates ranked predictions for all
168 day/hour combos (7 × 24) to identify when fundraising posts perform best.

Outputs best_posting_times.csv.
"""
import os, sys, warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np

from sklearn.model_selection import GridSearchCV
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from sklearn.linear_model import Ridge
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions import (load_csv, save_pipeline_output, evaluate_regressors,
                       feature_importance_report, get_models_path)

# ── Constants ──────────────────────────────────────────────────────────────

FEATURE_COLS = [
    'platform', 'day_of_week', 'post_hour', 'post_type', 'media_type',
    'num_hashtags', 'mentions_count', 'has_call_to_action',
    'call_to_action_type', 'content_topic', 'sentiment_tone',
    'caption_length', 'features_resident_story', 'is_boosted', 'boost_budget_php',
]

CAT_COLS = [
    'platform', 'day_of_week', 'post_type', 'media_type',
    'has_call_to_action', 'call_to_action_type', 'content_topic',
    'sentiment_tone', 'features_resident_story', 'is_boosted',
]

NUM_COLS = ['post_hour', 'num_hashtags', 'mentions_count',
            'caption_length', 'boost_budget_php']

TARGET = 'estimated_donation_value_php'

DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
DAY_ABBREV = {'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed',
              'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun'}


def prepare_data(posts):
    """Clean data for this pipeline."""
    df = posts.copy()

    for col in ['has_call_to_action', 'features_resident_story', 'is_boosted']:
        df[col] = df[col].astype(str).str.strip().str.lower().map(
            {'true': 'Yes', 'false': 'No'}).fillna('No')

    df['call_to_action_type'] = df['call_to_action_type'].fillna('None')
    df['boost_budget_php'] = pd.to_numeric(df['boost_budget_php'], errors='coerce').fillna(0)

    for col in NUM_COLS:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    df[TARGET] = pd.to_numeric(df[TARGET], errors='coerce').fillna(0)

    # Standardize day names — data has abbreviations like "Thursday"
    day_map_full = {
        'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
        'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday',
        'Monday': 'Monday', 'Tuesday': 'Tuesday', 'Wednesday': 'Wednesday',
        'Thursday': 'Thursday', 'Friday': 'Friday', 'Saturday': 'Saturday', 'Sunday': 'Sunday',
    }
    df['day_of_week'] = df['day_of_week'].map(day_map_full).fillna(df['day_of_week'])

    return df


def encode(df):
    """One-hot encode and return feature matrix."""
    encoded = pd.get_dummies(df[CAT_COLS + NUM_COLS], columns=CAT_COLS,
                             drop_first=False, dtype=int)
    encoded = encoded.replace([np.inf, -np.inf], np.nan).fillna(0)
    return encoded, encoded.columns.tolist()


def train_model(X, y):
    """Compare models and tune the best one."""
    models = {
        'Ridge': Ridge(alpha=1.0),
        'Random Forest': RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=200, random_state=42),
        'XGBoost': XGBRegressor(n_estimators=200, random_state=42, verbosity=0),
        'LightGBM': LGBMRegressor(n_estimators=200, random_state=42, verbose=-1),
    }

    print("\n── Cross-validation comparison (KFold=5) ──")
    results = evaluate_regressors(X, y, models, cv=5)
    print(results.to_string(index=False))

    best_name = results.iloc[0]['Model']
    best_model = models[best_name]

    # Tune
    param_grids = {
        'Random Forest': {'n_estimators': [100, 300, 500], 'max_depth': [5, 10, None]},
        'Gradient Boosting': {'n_estimators': [100, 300], 'learning_rate': [0.05, 0.1, 0.2]},
        'XGBoost': {'n_estimators': [100, 300], 'max_depth': [3, 5, 7], 'learning_rate': [0.05, 0.1]},
        'LightGBM': {'n_estimators': [100, 300], 'max_depth': [5, 10, -1], 'learning_rate': [0.05, 0.1]},
    }

    if best_name in param_grids:
        print(f"\n── Tuning {best_name} ──")
        grid = GridSearchCV(best_model, param_grids[best_name], cv=5,
                            scoring='neg_mean_squared_error', n_jobs=-1, verbose=0)
        grid.fit(X, y)
        best_model = grid.best_estimator_
        print(f"Best params: {grid.best_params_}")
    else:
        best_model.fit(X, y)

    return best_model, results, best_name


def generate_time_predictions(model, df, feature_names):
    """Generate predictions for all 168 day/hour combos.
    
    For each day/hour combo, hold other features at their most common
    values (mode for categorical, median for numeric) and predict.
    """
    # Base row: mode/median of all features
    base = {}
    for col in CAT_COLS:
        if col not in ('day_of_week',):
            base[col] = df[col].mode().iloc[0]
    for col in NUM_COLS:
        if col != 'post_hour':
            base[col] = df[col].median()

    rows = []
    for day in DAYS_ORDER:
        for hour in range(24):
            row = base.copy()
            row['day_of_week'] = day
            row['post_hour'] = hour
            rows.append(row)

    combo_df = pd.DataFrame(rows)
    combo_encoded = pd.get_dummies(combo_df[CAT_COLS + NUM_COLS], columns=CAT_COLS,
                                    drop_first=False, dtype=int)

    # Align with training features
    for col in feature_names:
        if col not in combo_encoded.columns:
            combo_encoded[col] = 0
    combo_encoded = combo_encoded[feature_names]
    combo_encoded = combo_encoded.replace([np.inf, -np.inf], np.nan).fillna(0)

    preds = model.predict(combo_encoded)
    preds = np.clip(preds, 0, None)

    # Count historical posts per day/hour
    hist = df.groupby(['day_of_week', 'post_hour']).size().reset_index(name='historical_post_count')

    result = combo_df[['day_of_week', 'post_hour']].copy()
    result['predicted_estimated_donation_value_php'] = preds.round(2)
    result = result.merge(hist, on=['day_of_week', 'post_hour'], how='left')
    result['historical_post_count'] = result['historical_post_count'].fillna(0).astype(int)

    # Confidence based on sample size
    result['confidence_indicator'] = pd.cut(
        result['historical_post_count'],
        bins=[-1, 2, 5, 1000],
        labels=['Low', 'Medium', 'High']
    )

    # Rank by predicted value
    result = result.sort_values('predicted_estimated_donation_value_php', ascending=False)
    result['rank'] = range(1, len(result) + 1)

    return result


# ── Public entry point ────────────────────────────────────────────────────

def run(posts=None):
    """Full pipeline → best_posting_times.csv."""
    print("=" * 60)
    print("Pipeline 3: Best Posting Times")
    print("=" * 60)

    if posts is None:
        posts = load_csv('social_media_posts')
    print(f"Posts loaded: {len(posts)}")

    # 1. Prepare
    df = prepare_data(posts)

    # 2. Encode
    X, feature_names = encode(df)
    y = df[TARGET].values
    print(f"Features: {len(feature_names)} | Samples: {len(X)}")

    # 3. Train
    model, results, best_name = train_model(X, y)

    # 4. Feature importance
    if hasattr(model, 'feature_importances_'):
        imp = feature_importance_report(model, feature_names)
        print("\nTop 10 features:")
        print(imp.head(10).to_string(index=False))

    # 5. Save model
    path = os.path.join(get_models_path(), 'best_posting_times_model.pkl')
    joblib.dump(model, path)

    # 6. Generate time predictions
    print("\n── Generating 168 day/hour predictions ──")
    output = generate_time_predictions(model, df, feature_names)

    # 7. Save
    save_pipeline_output(output, 'best_posting_times.csv')

    print(f"\nTop 10 posting times:")
    top10 = output.head(10)[['rank', 'day_of_week', 'post_hour',
                              'predicted_estimated_donation_value_php',
                              'historical_post_count', 'confidence_indicator']]
    print(top10.to_string(index=False))
    print("Pipeline 3 complete.\n")

    return output, model


if __name__ == '__main__':
    run()
