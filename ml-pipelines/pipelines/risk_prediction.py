"""Pipeline 5 — Risk Status Prediction for Residents.

Ordinal regression predicting current_risk_level (Critical=4 … Low=1) using
resident demographics and case features. Uses RMSE and MAE (not R²) as the
primary metrics for model and feature selection.

Outputs risk_predictions.csv — one row per resident with predicted risk level.
"""
import os, sys, warnings, re
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np

from sklearn.model_selection import KFold, cross_val_score, GridSearchCV
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.feature_selection import SequentialFeatureSelector
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions import (load_csv, save_pipeline_output, evaluate_regressors,
                       feature_importance_report, get_models_path)


# ── Constants ──────────────────────────────────────────────────────────────

RISK_MAP = {'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4}
RISK_REVERSE = {1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical'}

BOOL_COLS = [
    'sub_cat_orphaned', 'sub_cat_trafficked', 'sub_cat_child_labor',
    'sub_cat_physical_abuse', 'sub_cat_sexual_abuse', 'sub_cat_osaec',
    'sub_cat_cicl', 'sub_cat_at_risk', 'sub_cat_street_child',
    'sub_cat_child_with_hiv', 'is_pwd', 'has_special_needs',
    'family_is_4ps', 'family_solo_parent', 'family_indigenous',
    'family_parent_pwd', 'family_informal_settler',
]

CAT_COLS = [
    'case_category', 'religion', 'birth_status', 'referral_source',
    'initial_case_assessment', 'case_status',
]

REASON_MAP = {
    'initial_risk_numeric': 'Initial risk level at admission',
    'length_of_stay_months': 'Length of stay in safehouse',
    'age_upon_admission_months': 'Age at time of admission',
    'sub_cat_trafficked': 'Trafficking history',
    'sub_cat_sexual_abuse': 'Sexual abuse history',
    'sub_cat_physical_abuse': 'Physical abuse history',
    'sub_cat_osaec': 'OSAEC involvement',
    'sub_cat_at_risk': 'At-risk classification',
    'is_pwd': 'Person with disability',
    'has_special_needs': 'Special needs diagnosis',
    'family_solo_parent': 'Solo parent family',
    'family_informal_settler': 'Informal settler family',
    'risk_trajectory': 'Risk score trajectory over time',
    'abuse_count': 'Number of abuse categories',
    'family_vulnerability_count': 'Number of family vulnerability factors',
}


def parse_duration_months(val):
    """Parse '15 Years 9 months' → numeric months."""
    if pd.isna(val) or str(val).strip() == '':
        return np.nan
    s = str(val)
    years = re.search(r'(\d+)\s*Year', s, re.IGNORECASE)
    months = re.search(r'(\d+)\s*month', s, re.IGNORECASE)
    total = 0
    if years:
        total += int(years.group(1)) * 12
    if months:
        total += int(months.group(1))
    return total if total > 0 else np.nan


def prepare_data(residents):
    """Clean and engineer features."""
    df = residents.copy()

    # Parse durations
    df['age_upon_admission_months'] = df['age_upon_admission'].apply(parse_duration_months)
    df['length_of_stay_months'] = df['length_of_stay'].apply(parse_duration_months)

    # Convert booleans
    for col in BOOL_COLS:
        df[col] = df[col].astype(str).str.strip().str.lower().map(
            {'true': 1, 'false': 0}).fillna(0).astype(int)

    # Ordinal encoding for initial risk
    df['initial_risk_numeric'] = df['initial_risk_level'].map(RISK_MAP)

    # Target: current risk as ordinal
    df['current_risk_numeric'] = df['current_risk_level'].map(RISK_MAP)

    # Drop rows without valid target
    df = df.dropna(subset=['current_risk_numeric'])

    # Engineered features
    df['abuse_count'] = df[['sub_cat_orphaned', 'sub_cat_trafficked', 'sub_cat_child_labor',
                            'sub_cat_physical_abuse', 'sub_cat_sexual_abuse', 'sub_cat_osaec',
                            'sub_cat_cicl', 'sub_cat_at_risk', 'sub_cat_street_child',
                            'sub_cat_child_with_hiv']].sum(axis=1)
    df['family_vulnerability_count'] = df[['family_is_4ps', 'family_solo_parent',
                                           'family_indigenous', 'family_parent_pwd',
                                           'family_informal_settler']].sum(axis=1)

    # Fill missing
    df['age_upon_admission_months'] = df['age_upon_admission_months'].fillna(
        df['age_upon_admission_months'].median())
    df['length_of_stay_months'] = df['length_of_stay_months'].fillna(
        df['length_of_stay_months'].median())
    df['initial_risk_numeric'] = df['initial_risk_numeric'].fillna(
        df['initial_risk_numeric'].median())

    for col in CAT_COLS:
        df[col] = df[col].fillna('Unknown')

    return df


def build_feature_matrix(df):
    """Build X (excluding current_risk_level) and y."""
    numeric_features = (
        BOOL_COLS +
        ['age_upon_admission_months', 'length_of_stay_months',
         'initial_risk_numeric', 'abuse_count', 'family_vulnerability_count']
    )

    encoded = pd.get_dummies(df[CAT_COLS], columns=CAT_COLS, drop_first=True, dtype=int)

    X = pd.concat([df[numeric_features].reset_index(drop=True),
                    encoded.reset_index(drop=True)], axis=1)
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    y = df['current_risk_numeric'].reset_index(drop=True)

    return X, y


def train_model(X, y):
    """Compare regressors with RMSE/MAE focus, tune best."""
    models = {
        'Ridge': Ridge(alpha=1.0),
        'Random Forest': RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=200, random_state=42),
        'XGBoost': XGBRegressor(n_estimators=200, random_state=42, verbosity=0),
        'LightGBM': LGBMRegressor(n_estimators=200, random_state=42, verbose=-1),
    }

    print("\n── Cross-validation (KFold=5) — primary metrics: RMSE, MAE ──")
    results = evaluate_regressors(X, y, models, cv=5)
    print(results.to_string(index=False))

    best_name = results.iloc[0]['Model']
    best_model = models[best_name]

    param_grids = {
        'Random Forest': {'n_estimators': [100, 300, 500], 'max_depth': [3, 5, 10, None],
                          'min_samples_leaf': [1, 3, 5]},
        'Gradient Boosting': {'n_estimators': [100, 300], 'max_depth': [3, 5],
                              'learning_rate': [0.05, 0.1, 0.2]},
        'XGBoost': {'n_estimators': [100, 300], 'max_depth': [3, 5, 7],
                    'learning_rate': [0.05, 0.1]},
        'LightGBM': {'n_estimators': [100, 300], 'max_depth': [3, 5, -1],
                     'learning_rate': [0.05, 0.1]},
    }

    if best_name in param_grids:
        print(f"\n── Tuning {best_name} (scoring=neg_mean_squared_error) ──")
        grid = GridSearchCV(best_model, param_grids[best_name], cv=5,
                            scoring='neg_mean_squared_error', n_jobs=-1, verbose=0)
        grid.fit(X, y)
        best_model = grid.best_estimator_
        print(f"Best params: {grid.best_params_}")
        rmse = np.sqrt(-grid.best_score_)
        print(f"Best CV RMSE: {rmse:.4f}")
    else:
        best_model.fit(X, y)

    return best_model, results, best_name


def forward_feature_selection_rmse(X, y, model_class, max_features=None):
    """Forward selection using RMSE as criterion."""
    print("\n── Forward Feature Selection (RMSE) ──")
    if max_features is None:
        max_features = min(8, X.shape[1])

    try:
        # Use a lightweight estimator for selection to avoid timeout
        from sklearn.ensemble import RandomForestRegressor as _RF
        light_model = _RF(n_estimators=50, max_depth=5, random_state=42, n_jobs=-1)
        sfs = SequentialFeatureSelector(
            light_model, n_features_to_select=max_features,
            direction='forward', scoring='neg_mean_squared_error',
            cv=3, n_jobs=-1)
        sfs.fit(X, y)
        selected = X.columns[sfs.get_support()].tolist()
        print(f"Selected {len(selected)} features: {selected}")
        return selected
    except Exception as e:
        print(f"Forward selection failed: {e}")
        return X.columns.tolist()


def generate_predictions(df, model, X, feature_names):
    """Generate risk predictions with top reasons."""
    preds = model.predict(X)
    preds = np.clip(preds, 1, 4)

    df = df.copy()
    df['predicted_risk_score'] = np.round(preds, 2)

    # Map to categories
    df['predicted_risk_level'] = pd.cut(
        df['predicted_risk_score'],
        bins=[0, 1.5, 2.5, 3.5, 5],
        labels=['Low', 'Medium', 'High', 'Critical']
    )

    # Confidence: inverse of how close the score is to a boundary
    boundaries = np.array([1.5, 2.5, 3.5])
    min_dist = np.min(np.abs(preds[:, np.newaxis] - boundaries), axis=1)
    df['confidence'] = pd.cut(
        min_dist,
        bins=[-0.01, 0.15, 0.35, 1.0],
        labels=['Low', 'Medium', 'High']
    )

    # Top risk factors from feature importance
    if hasattr(model, 'feature_importances_'):
        imp = feature_importance_report(model, feature_names)
        top_features = imp.head(2)['feature'].tolist()
        df['top_risk_factor_1'] = REASON_MAP.get(top_features[0], top_features[0])
        df['top_risk_factor_2'] = REASON_MAP.get(top_features[1], top_features[1])
    else:
        df['top_risk_factor_1'] = 'Model feature importance unavailable'
        df['top_risk_factor_2'] = ''

    return df


# ── Public entry point ────────────────────────────────────────────────────

def run(residents=None):
    """Full pipeline → risk_predictions.csv."""
    print("=" * 60)
    print("Pipeline 5: Risk Status Prediction")
    print("=" * 60)

    if residents is None:
        residents = load_csv('residents')
    print(f"Residents loaded: {len(residents)}")

    # 1. Prepare
    df = prepare_data(residents)
    print(f"After cleaning: {len(df)} residents")
    print(f"Target distribution:\n{df['current_risk_numeric'].value_counts().sort_index().to_string()}")

    # 2. Feature matrix
    X, y = build_feature_matrix(df)
    print(f"Features: {X.shape[1]} | Samples: {X.shape[0]}")

    # 3. Train model (RMSE priority)
    best_model, results, best_name = train_model(X, y)

    # 4. Feature selection by RMSE
    try:
        base_model = best_model.__class__(**best_model.get_params())
        selected = forward_feature_selection_rmse(X, y, base_model)
        X_sel = X[selected]
    except Exception as e:
        print(f"Feature selection skipped: {e}")
        X_sel = X
        selected = X.columns.tolist()

    # 5. Retrain on selected features
    best_model.fit(X_sel, y)

    # 6. Feature importance
    if hasattr(best_model, 'feature_importances_'):
        imp = feature_importance_report(best_model, selected)
        print("\nTop 10 risk factors:")
        print(imp.head(10).to_string(index=False))

    # 7. Save model
    path = os.path.join(get_models_path(), 'risk_prediction_model.pkl')
    joblib.dump(best_model, path)

    # 8. Generate predictions
    X_all, _ = build_feature_matrix(df)
    X_all_sel = X_all[selected] if set(selected).issubset(X_all.columns) else X_all
    df = generate_predictions(df, best_model, X_all_sel, selected)

    # 9. Build output
    output = df[['resident_id', 'internal_code', 'case_control_no',
                 'predicted_risk_score', 'predicted_risk_level',
                 'confidence', 'top_risk_factor_1', 'top_risk_factor_2']].copy()

    save_pipeline_output(output, 'risk_predictions.csv')

    # Accuracy of bucketed predictions vs actual
    df['actual_level'] = df['current_risk_level']
    match = (df['predicted_risk_level'].astype(str) == df['actual_level'].astype(str)).mean()
    print(f"\nBucketed accuracy: {match:.1%}")

    final_rmse = np.sqrt(mean_squared_error(y, best_model.predict(X_sel)))
    final_mae = mean_absolute_error(y, best_model.predict(X_sel))
    print(f"Final RMSE: {final_rmse:.4f} | Final MAE: {final_mae:.4f}")

    dist = output['predicted_risk_level'].value_counts()
    print(f"\nPredicted risk distribution:\n{dist.to_string()}")
    print("Pipeline 5 complete.\n")

    return output, best_model, results


if __name__ == '__main__':
    run()
