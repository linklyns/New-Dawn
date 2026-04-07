"""Pipeline 1 — Donor Likelihood to Donate Again.

Reads supporters, donations, donation_allocations CSVs (or DB), engineers
supporter-level features, trains an ensemble classifier to predict churn
(no donation in 180 days), and outputs supporter_predictions.csv with
likelihood_category (High / Medium / Low) and SHAP-based top reasons.
"""
import os, sys, warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.metrics import classification_report, roc_auc_score
import joblib

# Allow imports from parent
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions import (load_csv, save_pipeline_output, evaluate_classifiers,
                       feature_importance_report, rfecv_selection, get_models_path)


# ── helpers ──────────────────────────────────────────────────────────────────

CHURN_DAYS = 180  # no donation in this window → churned

FEATURE_COLS = [
    'total_donation_amount', 'donation_count', 'average_donation_amount',
    'days_since_last_donation', 'time_since_first_donation',
    'donation_frequency', 'is_recurring_donor',
    'number_of_campaigns_supported', 'number_of_program_areas_supported',
    'avg_donation_interval', 'donation_type_diversity', 'channel_diversity',
]

CAT_FEATURES = ['supporter_type', 'region', 'country', 'acquisition_channel']

REASON_MAP = {
    'days_since_last_donation': 'Time since last donation',
    'total_donation_amount': 'Total lifetime giving',
    'donation_count': 'Number of past donations',
    'average_donation_amount': 'Average donation size',
    'donation_frequency': 'Donation frequency',
    'is_recurring_donor': 'Recurring donor status',
    'time_since_first_donation': 'Length of relationship',
    'number_of_campaigns_supported': 'Campaign engagement breadth',
    'number_of_program_areas_supported': 'Program area diversity',
    'avg_donation_interval': 'Average time between gifts',
    'donation_type_diversity': 'Variety of donation types',
    'channel_diversity': 'Variety of giving channels',
}


def engineer_features(supporters, donations, allocations, reference_date=None):
    """Build one row per supporter with behavioural features."""
    if reference_date is None:
        reference_date = pd.to_datetime(donations['donation_date']).max()
    else:
        reference_date = pd.to_datetime(reference_date)

    donations = donations.copy()
    donations['donation_date'] = pd.to_datetime(donations['donation_date'])
    donations['amount'] = pd.to_numeric(donations['amount'], errors='coerce')
    donations['is_recurring'] = donations['is_recurring'].astype(str).str.strip().str.lower() == 'true'

    # Monetary amounts
    monetary = donations[donations['donation_type'] == 'Monetary']
    amt_agg = monetary.groupby('supporter_id').agg(
        total_donation_amount=('amount', 'sum'),
        monetary_count=('amount', 'count'),
        average_donation_amount=('amount', 'mean'),
    ).reset_index()

    # All donations features
    don_agg = donations.groupby('supporter_id').agg(
        donation_count=('donation_id', 'count'),
        last_donation_date=('donation_date', 'max'),
        first_donation_date=('donation_date', 'min'),
        is_recurring_donor=('is_recurring', 'max'),
        donation_type_diversity=('donation_type', 'nunique'),
        channel_diversity=('channel_source', 'nunique'),
        number_of_campaigns_supported=('campaign_name', lambda x: x.dropna().replace('', np.nan).nunique()),
    ).reset_index()

    don_agg['days_since_last_donation'] = (reference_date - don_agg['last_donation_date']).dt.days
    don_agg['time_since_first_donation'] = (reference_date - don_agg['first_donation_date']).dt.days
    don_agg['donation_frequency'] = don_agg['donation_count'] / (don_agg['time_since_first_donation'].clip(lower=1) / 365.25)
    don_agg['is_recurring_donor'] = don_agg['is_recurring_donor'].astype(int)

    # Average interval between consecutive donations
    sorted_don = donations.sort_values(['supporter_id', 'donation_date'])
    sorted_don['prev_date'] = sorted_don.groupby('supporter_id')['donation_date'].shift(1)
    sorted_don['interval'] = (sorted_don['donation_date'] - sorted_don['prev_date']).dt.days
    interval_agg = sorted_don.groupby('supporter_id')['interval'].mean().reset_index()
    interval_agg.columns = ['supporter_id', 'avg_donation_interval']

    # Program areas from allocations
    don_alloc = donations[['donation_id', 'supporter_id']].merge(
        allocations[['donation_id', 'program_area']], on='donation_id', how='inner')
    prog_agg = don_alloc.groupby('supporter_id')['program_area'].nunique().reset_index()
    prog_agg.columns = ['supporter_id', 'number_of_program_areas_supported']

    # Merge everything
    df = supporters[['supporter_id', 'display_name', 'first_name', 'last_name',
                     'email', 'supporter_type', 'region', 'country',
                     'status', 'first_donation_date', 'acquisition_channel']].copy()
    df = df.merge(don_agg, on='supporter_id', how='left')
    df = df.merge(amt_agg, on='supporter_id', how='left')
    df = df.merge(interval_agg, on='supporter_id', how='left')
    df = df.merge(prog_agg, on='supporter_id', how='left')

    # Fill missing (supporters with no donations get zeros)
    for col in FEATURE_COLS:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    # Target: churned = no donation in last CHURN_DAYS
    df['churned'] = (df['days_since_last_donation'] > CHURN_DAYS).astype(int)
    # If supporter has zero donations, treat as churned
    df.loc[df['donation_count'] == 0, 'churned'] = 1

    return df, reference_date


def prepare_modelling_data(df):
    """Encode categoricals and return X, y, feature names."""
    model_df = df.copy()

    # One-hot encode categoricals
    model_df = pd.get_dummies(model_df, columns=CAT_FEATURES, drop_first=True, dtype=int)

    feature_cols = FEATURE_COLS.copy()
    for col in model_df.columns:
        if any(col.startswith(f'{cat}_') for cat in CAT_FEATURES):
            feature_cols.append(col)

    X = model_df[feature_cols].copy()
    y = model_df['churned']

    # Replace inf with nan then fill
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

    return X, y, feature_cols


def train_best_model(X, y, feature_names):
    """Compare 6 classifiers, tune the best, return fitted model + results."""
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'Decision Tree': DecisionTreeClassifier(random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=200, random_state=42),
        'XGBoost': XGBClassifier(n_estimators=200, use_label_encoder=False,
                                  eval_metric='logloss', random_state=42, verbosity=0),
        'LightGBM': LGBMClassifier(n_estimators=200, random_state=42, verbose=-1),
    }

    print("\n── Cross-validation comparison (StratifiedKFold=5) ──")
    results = evaluate_classifiers(X, y, models, cv=5)
    print(results.to_string(index=False))

    best_name = results.iloc[0]['Model']
    print(f"\nBest model by F1: {best_name}")

    # -- Hyperparameter tuning on best model --
    param_grids = {
        'Random Forest': {
            'n_estimators': [100, 300, 500],
            'max_depth': [5, 10, None],
            'min_samples_leaf': [1, 3, 5],
        },
        'Gradient Boosting': {
            'n_estimators': [100, 300],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.05, 0.1, 0.2],
        },
        'XGBoost': {
            'n_estimators': [100, 300],
            'max_depth': [3, 5, 7],
            'learning_rate': [0.05, 0.1, 0.2],
        },
        'LightGBM': {
            'n_estimators': [100, 300],
            'max_depth': [5, 10, -1],
            'learning_rate': [0.05, 0.1, 0.2],
        },
    }

    base_model = models[best_name]
    if best_name in param_grids:
        print(f"\n── GridSearchCV tuning {best_name} ──")
        grid = GridSearchCV(base_model, param_grids[best_name], cv=5,
                            scoring='f1_weighted', n_jobs=-1, verbose=0)
        grid.fit(X, y)
        best_model = grid.best_estimator_
        print(f"Best params: {grid.best_params_}")
        print(f"Best CV F1: {grid.best_score_:.4f}")
    else:
        best_model = base_model
        best_model.fit(X, y)

    return best_model, results, best_name


def generate_predictions(df, model, X, feature_names):
    """Generate likelihood predictions with SHAP-based top reasons."""
    # Predict probabilities (probability of NOT churning = likelihood to donate again)
    proba = model.predict_proba(X)
    # Class 0 = not churned = will donate again
    churn_class_idx = list(model.classes_).index(1) if 1 in model.classes_ else 1
    likelihood_idx = 1 - churn_class_idx  # index for "not churned"

    df = df.copy()
    df['likelihood_score'] = proba[:, likelihood_idx].round(4)

    # Map to categories
    df['likelihood_category'] = pd.cut(
        df['likelihood_score'],
        bins=[-0.01, 0.4, 0.7, 1.01],
        labels=['Low', 'Medium', 'High']
    )

    # Feature importance for top reasons
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)
        # For binary classification shap_values might be a list of 2 arrays
        if isinstance(shap_values, list):
            sv = shap_values[likelihood_idx]
        else:
            sv = shap_values
        # Top 2 reasons per supporter (features pushing towards "will donate")
        reasons_1, reasons_2 = [], []
        for i in range(len(sv)):
            row_shap = pd.Series(sv[i], index=feature_names)
            top = row_shap.abs().nlargest(2).index.tolist()
            r1 = REASON_MAP.get(top[0], top[0]) if len(top) > 0 else ''
            r2 = REASON_MAP.get(top[1], top[1]) if len(top) > 1 else ''
            reasons_1.append(r1)
            reasons_2.append(r2)
        df['top_reason_1'] = reasons_1
        df['top_reason_2'] = reasons_2
    except Exception as e:
        print(f"SHAP failed ({e}), falling back to feature importance")
        imp = feature_importance_report(model, feature_names)
        r1 = REASON_MAP.get(imp.iloc[0]['feature'], imp.iloc[0]['feature'])
        r2 = REASON_MAP.get(imp.iloc[1]['feature'], imp.iloc[1]['feature'])
        df['top_reason_1'] = r1
        df['top_reason_2'] = r2

    return df


def build_output(df):
    """Select and format final CSV columns."""
    out_cols = [
        'supporter_id', 'display_name', 'first_name', 'last_name', 'email',
        'likelihood_score', 'likelihood_category',
        'total_donation_amount', 'donation_count', 'days_since_last_donation',
        'top_reason_1', 'top_reason_2',
    ]
    out = df[out_cols].copy()
    out['total_donation_amount'] = out['total_donation_amount'].round(2)
    out['days_since_last_donation'] = out['days_since_last_donation'].astype(int)
    return out.sort_values('likelihood_score', ascending=False)


# ── Public entry point ────────────────────────────────────────────────────

def run(supporters=None, donations=None, allocations=None):
    """Full pipeline: engineer → train → predict → save CSV.

    Args:
        supporters, donations, allocations: DataFrames.
            If None, loads from lighthouse_csv_v7/.
    Returns:
        (output_df, model, results_df)
    """
    print("=" * 60)
    print("Pipeline 1: Donor Likelihood to Donate Again")
    print("=" * 60)

    # 1. Load data
    if supporters is None:
        supporters = load_csv('supporters')
    if donations is None:
        donations = load_csv('donations')
    if allocations is None:
        allocations = load_csv('donation_allocations')

    print(f"Supporters: {len(supporters)} | Donations: {len(donations)} | Allocations: {len(allocations)}")

    # 2. Feature engineering
    df, ref_date = engineer_features(supporters, donations, allocations)
    print(f"Reference date: {ref_date.date()}")
    print(f"Churn rate: {df['churned'].mean():.1%}")

    # 3. Prepare modelling data
    X, y, feature_names = prepare_modelling_data(df)
    print(f"Features: {len(feature_names)} | Samples: {len(X)}")

    # 4. Train & select best model
    best_model, results, best_name = train_best_model(X, y, feature_names)

    # 5. Feature selection (RFECV) 
    try:
        if hasattr(best_model, 'feature_importances_'):
            selector, selected_features = rfecv_selection(
                X, y, best_model.__class__(**best_model.get_params()),
                cv=5, scoring='f1_weighted', min_features=5)
        else:
            selected_features = feature_names
    except Exception as e:
        print(f"RFECV skipped: {e}")
        selected_features = feature_names

    # 6. Retrain on selected features
    X_sel = X[selected_features] if set(selected_features).issubset(X.columns) else X
    best_model.fit(X_sel, y)

    # 7. Save model
    model_path = os.path.join(get_models_path(), 'donor_likelihood_model.pkl')
    joblib.dump(best_model, model_path)
    print(f"Model saved → {model_path}")

    # 8. Generate predictions for ALL supporters
    X_all, _, _ = prepare_modelling_data(df)
    X_all_sel = X_all[selected_features] if set(selected_features).issubset(X_all.columns) else X_all
    df = generate_predictions(df, best_model, X_all_sel, 
                              selected_features if set(selected_features).issubset(X_all.columns) else feature_names)

    # 9. Build & save output CSV
    output = build_output(df)
    save_pipeline_output(output, 'supporter_predictions.csv')

    print(f"\nLikelihood distribution:")
    print(output['likelihood_category'].value_counts().to_string())
    print("Pipeline 1 complete.\n")

    return output, best_model, results


if __name__ == '__main__':
    run()
