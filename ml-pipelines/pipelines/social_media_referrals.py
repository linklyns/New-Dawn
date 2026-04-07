"""Pipeline 2 — Social Media Referrals (6 prediction targets).

Builds 6 regression models for controllable post features → performance metrics:
  1. donation_referrals
  2. estimated_donation_value_php
  3. forwards
  4. profile_visits
  5. engagement_rate
  6. impressions

Outputs social_post_predictions.csv — a lookup table of realistic feature
combinations with the 6 predicted columns.
"""
import os, sys, warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from itertools import product

from sklearn.model_selection import GridSearchCV, KFold
from sklearn.linear_model import Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions import (load_csv, save_pipeline_output, evaluate_regressors,
                       feature_importance_report, get_models_path)

# ── Constants ──────────────────────────────────────────────────────────────

INPUT_FEATURES = [
    'platform', 'post_type', 'media_type', 'content_topic', 'sentiment_tone',
    'has_call_to_action', 'call_to_action_type', 'caption_length',
    'num_hashtags', 'mentions_count', 'features_resident_story',
    'is_boosted', 'boost_budget_php', 'day_of_week', 'post_hour',
]

TARGETS = [
    'donation_referrals', 'estimated_donation_value_php',
    'forwards', 'profile_visits', 'engagement_rate', 'impressions',
]

CAT_COLS = [
    'platform', 'post_type', 'media_type', 'content_topic', 'sentiment_tone',
    'has_call_to_action', 'call_to_action_type', 'features_resident_story',
    'is_boosted', 'day_of_week',
]

NUM_COLS = ['caption_length', 'num_hashtags', 'mentions_count',
            'boost_budget_php', 'post_hour']


def prepare_data(posts):
    """Clean and prepare social media post data."""
    df = posts.copy()

    # Convert booleans
    for col in ['has_call_to_action', 'features_resident_story', 'is_boosted']:
        df[col] = df[col].astype(str).str.strip().str.lower().map(
            {'true': 'Yes', 'false': 'No'}).fillna('No')

    # Fill nulls
    df['call_to_action_type'] = df['call_to_action_type'].fillna('None')
    df['boost_budget_php'] = pd.to_numeric(df['boost_budget_php'], errors='coerce').fillna(0)
    df['forwards'] = pd.to_numeric(df['forwards'], errors='coerce').fillna(0)

    for col in NUM_COLS:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    for target in TARGETS:
        df[target] = pd.to_numeric(df[target], errors='coerce').fillna(0)

    return df


def encode_features(df, label_encoders=None):
    """One-hot encode categoricals, return feature matrix + encoders."""
    encoded = df[NUM_COLS].copy()
    encoded = pd.get_dummies(df[CAT_COLS + NUM_COLS], columns=CAT_COLS,
                             drop_first=False, dtype=int)
    feature_names = encoded.columns.tolist()
    encoded = encoded.replace([np.inf, -np.inf], np.nan).fillna(0)
    return encoded, feature_names


def train_target_model(X, y, target_name):
    """Train & select best regressor for one target variable."""
    print(f"\n  ── Target: {target_name} ──")
    models = {
        'Ridge': Ridge(alpha=1.0),
        'Lasso': Lasso(alpha=0.1, max_iter=5000),
        'Random Forest': RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=200, random_state=42),
        'XGBoost': XGBRegressor(n_estimators=200, random_state=42, verbosity=0),
        'LightGBM': LGBMRegressor(n_estimators=200, random_state=42, verbose=-1),
    }

    results = evaluate_regressors(X, y, models, cv=5)

    best_name = results.iloc[0]['Model']
    best_model = models[best_name]

    # Tune best model
    param_grids = {
        'Random Forest': {'n_estimators': [100, 300], 'max_depth': [5, 10, None]},
        'Gradient Boosting': {'n_estimators': [100, 300], 'learning_rate': [0.05, 0.1]},
        'XGBoost': {'n_estimators': [100, 300], 'learning_rate': [0.05, 0.1]},
        'LightGBM': {'n_estimators': [100, 300], 'learning_rate': [0.05, 0.1]},
    }

    if best_name in param_grids:
        grid = GridSearchCV(best_model, param_grids[best_name], cv=5,
                            scoring='neg_mean_squared_error', n_jobs=-1, verbose=0)
        grid.fit(X, y)
        best_model = grid.best_estimator_
        print(f"  Tuned {best_name}: {grid.best_params_}")
    else:
        best_model.fit(X, y)

    print(f"  Best model: {best_name}")
    return best_model, results, best_name


def generate_lookup_combos(df):
    """Generate realistic feature combinations from historical data.
    
    Strategy: take unique values observed for each categorical feature and
    combine with representative numeric values. Filter to combos where at
    least 2 individual feature values are commonly observed together.
    """
    cat_uniques = {}
    for col in CAT_COLS:
        vals = df[col].value_counts()
        # Keep values that appear in ≥ 2% of posts (avoid ultra-rare combos)
        common = vals[vals >= max(2, len(df) * 0.02)].index.tolist()
        if not common:
            common = vals.head(5).index.tolist()
        cat_uniques[col] = common

    # Representative numeric values
    num_representatives = {}
    for col in NUM_COLS:
        vals = df[col].dropna()
        # Use 3 representative values: 25th, 50th, 75th percentile
        num_representatives[col] = sorted(vals.quantile([0.25, 0.5, 0.75]).unique().tolist())

    # Build combos — limit to manageable size
    # Start with observed categorical combos from actual posts
    observed = df[CAT_COLS].drop_duplicates()
    print(f"  Observed categorical combos: {len(observed)}")

    # Cross with representative numeric values
    rows = []
    for _, cat_row in observed.iterrows():
        for num_combo in product(*[num_representatives[c] for c in NUM_COLS]):
            row = cat_row.to_dict()
            for i, col in enumerate(NUM_COLS):
                row[col] = num_combo[i]
            rows.append(row)

    # If too many rows, sample down
    combo_df = pd.DataFrame(rows)
    if len(combo_df) > 50000:
        combo_df = combo_df.sample(50000, random_state=42)
        print(f"  Sampled down to {len(combo_df)} combos")
    else:
        print(f"  Generated {len(combo_df)} combos")

    return combo_df


# ── Public entry point ────────────────────────────────────────────────────

def run(posts=None):
    """Full pipeline: prepare → train 6 models → generate lookup CSV.

    Args:
        posts: DataFrame of social_media_posts. If None, loads from CSV.
    Returns:
        (lookup_df, models_dict)
    """
    print("=" * 60)
    print("Pipeline 2: Social Media Referrals (6 Targets)")
    print("=" * 60)

    if posts is None:
        posts = load_csv('social_media_posts')
    print(f"Posts loaded: {len(posts)}")

    # 1. Prepare
    df = prepare_data(posts)

    # 2. Encode
    X_encoded, feature_names = encode_features(df)
    print(f"Encoded features: {len(feature_names)}")

    # 3. Train a model per target
    trained_models = {}
    all_results = {}
    for target in TARGETS:
        y = df[target].values
        model, results, name = train_target_model(X_encoded, y, target)
        trained_models[target] = model
        all_results[target] = results

    # Save models
    for target, model in trained_models.items():
        path = os.path.join(get_models_path(), f'social_{target}_model.pkl')
        joblib.dump(model, path)

    # 4. Generate realistic combos
    print("\n── Generating lookup combinations ──")
    combos = generate_lookup_combos(df)

    # 5. Encode combos and predict
    combo_encoded, _ = encode_features(combos)
    # Align columns with training data
    for col in feature_names:
        if col not in combo_encoded.columns:
            combo_encoded[col] = 0
    combo_encoded = combo_encoded[feature_names]

    for target in TARGETS:
        preds = trained_models[target].predict(combo_encoded)
        preds = np.clip(preds, 0, None)  # no negative predictions
        combos[f'predicted_{target}'] = preds.round(4)

    # 6. Save
    save_pipeline_output(combos, 'social_post_predictions.csv')

    print(f"\nLookup table: {len(combos)} rows × {len(combos.columns)} cols")
    print("Pipeline 2 complete.\n")

    return combos, trained_models


if __name__ == '__main__':
    run()
