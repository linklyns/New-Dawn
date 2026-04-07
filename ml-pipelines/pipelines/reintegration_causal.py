"""Pipeline 4 — Reintegration Readiness Causal Analysis.

Identifies which resident features have the greatest statistically significant
effect on reintegration_status (Completed vs. not), using logistic regression
for interpretability and ensemble models for validation.

Outputs reintegration_causal_analysis.csv.
"""
import os, sys, warnings, re
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np

import statsmodels.api as sm
from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.linear_model import LogisticRegression
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from functions import (load_csv, save_pipeline_output, evaluate_classifiers,
                       feature_importance_report, get_models_path, calculate_vif)


# ── Constants ──────────────────────────────────────────────────────────────

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
    'initial_case_assessment', 'initial_risk_level',
]

RISK_MAP = {'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4}

INTERPRETATION_TEMPLATES = {
    'positive': '{feature} is associated with higher likelihood of completed reintegration (OR={or_val:.2f})',
    'negative': '{feature} is associated with lower likelihood of completed reintegration (OR={or_val:.2f})',
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
    """Clean and engineer features from residents data."""
    df = residents.copy()

    # Parse age/duration strings
    df['age_upon_admission_months'] = df['age_upon_admission'].apply(parse_duration_months)
    df['length_of_stay_months'] = df['length_of_stay'].apply(parse_duration_months)
    df['present_age_months'] = df['present_age'].apply(parse_duration_months)

    # Convert booleans
    for col in BOOL_COLS:
        df[col] = df[col].astype(str).str.strip().str.lower().map(
            {'true': 1, 'false': 0}).fillna(0).astype(int)

    # Risk levels as ordinal
    df['initial_risk_numeric'] = df['initial_risk_level'].map(RISK_MAP)
    df['current_risk_numeric'] = df['current_risk_level'].map(RISK_MAP)
    df['risk_improvement'] = df['initial_risk_numeric'] - df['current_risk_numeric']

    # Target: reintegration completed
    df['reintegration_completed'] = (
        df['reintegration_status'].astype(str).str.strip() == 'Completed'
    ).astype(int)

    # Fill missing
    df['age_upon_admission_months'] = df['age_upon_admission_months'].fillna(
        df['age_upon_admission_months'].median())
    df['length_of_stay_months'] = df['length_of_stay_months'].fillna(
        df['length_of_stay_months'].median())
    df['initial_risk_numeric'] = df['initial_risk_numeric'].fillna(
        df['initial_risk_numeric'].median())
    df['risk_improvement'] = df['risk_improvement'].fillna(0)

    # Fill categorical
    for col in CAT_COLS:
        df[col] = df[col].fillna('Unknown')

    return df


def build_feature_matrix(df):
    """Build X, y for modelling."""
    # Numeric features
    numeric_features = (
        BOOL_COLS +
        ['age_upon_admission_months', 'length_of_stay_months',
         'initial_risk_numeric', 'risk_improvement']
    )

    # One-hot encode categoricals
    encoded = pd.get_dummies(df[CAT_COLS], columns=CAT_COLS, drop_first=True, dtype=int)

    X = pd.concat([df[numeric_features], encoded], axis=1)
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    y = df['reintegration_completed']

    return X, y


def run_causal_analysis(X, y):
    """Run statsmodels logistic regression for coefficient/p-value analysis."""
    print("\n── Statsmodels Logistic Regression (Causal Analysis) ──")

    X_const = sm.add_constant(X.astype(float))

    try:
        logit_model = sm.Logit(y, X_const)
        result = logit_model.fit(disp=0, maxiter=100)
        print(result.summary2())

        # Extract coefficients
        summary_df = pd.DataFrame({
            'feature': result.params.index,
            'coefficient': result.params.values,
            'std_error': result.bse.values,
            'z_value': result.tvalues.values,
            'p_value': result.pvalues.values,
            'conf_lower': result.conf_int()[0].values,
            'conf_upper': result.conf_int()[1].values,
        })

        # Remove constant
        summary_df = summary_df[summary_df['feature'] != 'const']

        # Odds ratios
        summary_df['odds_ratio'] = np.exp(summary_df['coefficient'])

        # Significance flags
        def sig_flag(p):
            if p < 0.001: return '***'
            if p < 0.01: return '**'
            if p < 0.05: return '*'
            if p < 0.1: return '.'
            return ''

        summary_df['significance_flag'] = summary_df['p_value'].apply(sig_flag)
        summary_df['effect_direction'] = summary_df['coefficient'].apply(
            lambda x: 'Positive' if x > 0 else 'Negative')

        # Plain language interpretation
        interpretations = []
        for _, row in summary_df.iterrows():
            if row['p_value'] < 0.05:
                direction = 'positive' if row['coefficient'] > 0 else 'negative'
                interp = INTERPRETATION_TEMPLATES[direction].format(
                    feature=row['feature'].replace('_', ' ').title(),
                    or_val=row['odds_ratio'])
            else:
                interp = f"{row['feature'].replace('_', ' ').title()} — not statistically significant (p={row['p_value']:.3f})"
            interpretations.append(interp)

        summary_df['plain_language_interpretation'] = interpretations
        summary_df = summary_df.sort_values('p_value')

        return summary_df, result

    except Exception as e:
        print(f"Statsmodels logit failed: {e}")
        print("Falling back to sklearn logistic regression for coefficient extraction")

        lr = LogisticRegression(max_iter=2000, random_state=42, penalty='l2', C=1.0)
        lr.fit(X, y)

        summary_df = pd.DataFrame({
            'feature': X.columns,
            'coefficient': lr.coef_.flatten(),
            'odds_ratio': np.exp(lr.coef_.flatten()),
            'p_value': np.nan,
            'significance_flag': '',
            'effect_direction': ['Positive' if c > 0 else 'Negative' for c in lr.coef_.flatten()],
            'plain_language_interpretation': [
                f"{f.replace('_', ' ').title()} — coefficient magnitude {abs(c):.3f}"
                for f, c in zip(X.columns, lr.coef_.flatten())
            ]
        })
        summary_df = summary_df.sort_values('coefficient', key=abs, ascending=False)
        return summary_df, lr


def validate_with_ensemble(X, y):
    """Run ensemble models to validate same features appear as important."""
    print("\n── Ensemble validation ──")
    models = {
        'Logistic Regression': LogisticRegression(max_iter=2000, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=200, random_state=42),
        'XGBoost': XGBClassifier(n_estimators=200, use_label_encoder=False,
                                  eval_metric='logloss', random_state=42, verbosity=0),
        'LightGBM': LGBMClassifier(n_estimators=200, random_state=42, verbose=-1),
    }

    results = evaluate_classifiers(X, y, models, cv=5)
    print(results.to_string(index=False))

    # Feature importance from best tree model
    best_tree = None
    for name in ['Random Forest', 'Gradient Boosting', 'XGBoost', 'LightGBM']:
        if name in models:
            models[name].fit(X, y)
            best_tree = models[name]
            break

    if best_tree and hasattr(best_tree, 'feature_importances_'):
        imp = feature_importance_report(best_tree, X.columns.tolist())
        print("\nEnsemble top 10 features:")
        print(imp.head(10).to_string(index=False))
        return results, imp

    return results, None


# ── Public entry point ────────────────────────────────────────────────────

def run(residents=None):
    """Full causal analysis pipeline → reintegration_causal_analysis.csv."""
    print("=" * 60)
    print("Pipeline 4: Reintegration Readiness Causal Analysis")
    print("=" * 60)

    if residents is None:
        residents = load_csv('residents')
    print(f"Residents loaded: {len(residents)}")

    # 1. Prepare
    df = prepare_data(residents)
    print(f"Target distribution:\n{df['reintegration_completed'].value_counts().to_string()}")

    # 2. Feature matrix
    X, y = build_feature_matrix(df)
    print(f"Features: {X.shape[1]} | Samples: {X.shape[0]}")

    # 3. VIF check
    try:
        vif = calculate_vif(X)
        high_vif = vif[vif['VIF'] > 10]
        if len(high_vif) > 0:
            print(f"\nHigh VIF features (>10): {high_vif['feature'].tolist()}")
            # Remove highest VIF features iteratively
            while True:
                vif = calculate_vif(X)
                worst = vif[vif['VIF'] > 10]
                if worst.empty:
                    break
                drop_col = worst.iloc[0]['feature']
                print(f"  Dropping {drop_col} (VIF={worst.iloc[0]['VIF']:.1f})")
                X = X.drop(columns=[drop_col])
    except Exception as e:
        print(f"VIF check skipped: {e}")

    # 4. Causal analysis (primary)
    summary_df, stats_model = run_causal_analysis(X, y)

    # 5. Ensemble validation
    cv_results, ensemble_imp = validate_with_ensemble(X, y)

    # 6. Build output
    output_cols = ['feature', 'coefficient', 'odds_ratio', 'p_value',
                   'significance_flag', 'effect_direction',
                   'plain_language_interpretation']
    output = summary_df[output_cols].copy()
    output['coefficient'] = output['coefficient'].round(4)
    output['odds_ratio'] = output['odds_ratio'].round(4)
    output['p_value'] = output['p_value'].round(6)

    save_pipeline_output(output, 'reintegration_causal_analysis.csv')

    # Print top factors
    sig = output[output['significance_flag'].str.len() > 0]
    print(f"\n{len(sig)} statistically significant features (p < 0.1):")
    if len(sig) > 0:
        print(sig[['feature', 'odds_ratio', 'p_value', 'significance_flag',
                    'effect_direction']].to_string(index=False))
    else:
        print("No significant features at p < 0.1. Showing top 5 by |coefficient|:")
        print(output.head(5)[['feature', 'coefficient', 'p_value']].to_string(index=False))

    print("Pipeline 4 complete.\n")

    return output, stats_model, cv_results


if __name__ == '__main__':
    run()
