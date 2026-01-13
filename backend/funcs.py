import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor

BINARY_MAPPING = {'yes': 1, 'no': 0}
SEX_MAPPING = {'F': 1, 'M': 0}
ADDRESS_MAPPING = {'U': 1, 'R': 0}
FAMSIZE_MAPPING = {'LE3': 1, 'GT3': 0}
PSTATUS_MAPPING = {'T': 1, 'A': 0}

def load_data(filepath):
    """Simple loader for csv data."""
    return pd.read_csv(filepath)

def preprocess_data(df, training_columns=None):
    """
    Transforms raw data into model-ready format.
    If training_columns is provided, ensures the output dataframe matches the model's expected structure.
    """
    df_proc = df.copy()
    
    # Drop identifiers
    drop_cols = ['StudentID', 'FirstName', 'FamilyName']
    df_proc = df_proc.drop([c for c in drop_cols if c in df_proc.columns], axis=1)

    # Binary Mappings
    cols_yes_no = ['schoolsup', 'famsup', 'paid', 'activities', 'nursery', 'higher', 'internet', 'romantic']
    for col in cols_yes_no:
        df_proc[col] = df_proc[col].map(BINARY_MAPPING)

    df_proc['sex'] = df_proc['sex'].map(SEX_MAPPING)
    df_proc['address'] = df_proc['address'].map(ADDRESS_MAPPING)
    df_proc['famsize'] = df_proc['famsize'].map(FAMSIZE_MAPPING)
    df_proc['Pstatus'] = df_proc['Pstatus'].map(PSTATUS_MAPPING)

    # One-Hot Encoding
    nominal_cols = ['Mjob', 'Fjob', 'reason', 'guardian']
    df_proc = pd.get_dummies(df_proc, columns=nominal_cols, drop_first=True, dtype=int)

    # Feature Engineering 
    df_proc['Parent_Edu_Total'] = df_proc['Medu'] + df_proc['Fedu']
    df_proc['Parent_Edu_Diff'] = abs(df_proc['Medu'] - df_proc['Fedu'])
    
    # Alcohol calculation
    df_proc['Total_Alcohol'] = df_proc['Dalc'] + df_proc['Walc'] * 2
    df_proc['Party_Life'] = df_proc['Total_Alcohol'] * df_proc['Total_Alcohol'] * df_proc['goout']


    # If a category is missing in new data, fill with 0.
    # If extra columns exist, drop them.
    if training_columns is not None:
        for col in training_columns:
            if col not in df_proc.columns:
                df_proc[col] = 0
        df_proc = df_proc[training_columns]
        
    return df_proc

def train_final_model(df_raw):
    """
    Trains the model on the full dataset using best params from GridSearch.
    Returns the model and the feature list.
    """
    # Preprocess
    df_clean = preprocess_data(df_raw)
    
    X = df_clean.drop('FinalGrade', axis=1)
    y = df_clean['FinalGrade']
    
    # Params from the grid search results
    params = {'max_depth': None, 'min_samples_leaf': 2, 'min_samples_split': 10, 'n_estimators': 300}
    
    model = RandomForestRegressor(**params, random_state=42)
    model.fit(X, y)
    
    print(f"Model trained on {len(X)} rows.")
    return model, list(X.columns)

def create_ideal_profile(df_raw):
    """
    Creates a 'Simulation' copy of the data where actionable habits are optimized.
    """
    df_ideal = df_raw.copy()
    
    # Actionable Adjustments
    df_ideal['studytime'] = 4  # Max study time
    df_ideal['Dalc'] = 1       # Min workday alcohol
    df_ideal['Walc'] = 1       # Min weekend alcohol
    df_ideal['absences'] = 0   # Perfect attendance
    df_ideal['goout'] = 2   # a score of 2 for the goout is the one with highest final grade mean.
    
    # 'Party_Life' and 'Total_Alcohol' will be updated automatically 
    
    return df_ideal


def generate_dashboard_data(csv_path, model_path='./ressources/model.pkl', features_path='./ressources/model_features.pkl'):
    """
    Main Pipeline:
    1. Load Data
    2. Simulate Ideal Habits -> Predict Potential Grade
    3. Calculate Improvability (Potential - Real Actual Grade)
    4. Calculate Complexity Score
    """
    # 1. Load data, model and features list
    df_raw = load_data(csv_path)
    model = joblib.load(model_path)
    feature_cols = joblib.load(features_path)
    
    # Ideal Prediction (Potential)
    # We create a profile with optimized habits (Study time up, Alcohol down, etc.)
    df_ideal_raw = create_ideal_profile(df_raw)
    X_ideal = preprocess_data(df_ideal_raw, training_columns=feature_cols)
    potential_preds = model.predict(X_ideal)
    
    # Construct Result DataFrame
    results = df_raw[['StudentID', 'FirstName', 'FamilyName', 'FinalGrade']].copy()
    results['Potential_Grade'] = np.round(potential_preds, 2)
    
    # Improvability = Potential - Real Actual Grade
    results['Improvability_Margin'] = results['Potential_Grade'] - results['FinalGrade']
    
    # in case the student is already outperforming their potential
    results['Improvability_Margin'] = results['Improvability_Margin'].clip(lower=0)
    
    # Calculate Complexity Score (0 to 1)
    # Logic: 
    # High Margin (e.g. +5 points possible) -> Low Complexity (0.75) -> "Easy win"
    # Low Margin (e.g. +0.5 points possible) -> High Complexity (0.97) -> "Hard to improve"
    # We normalize by 20 (max grade)
    results['Complexity_Score'] = 1 - (results['Improvability_Margin'] / 20)
    
    return results

# --- USAGE EXAMPLE ---

"""
# Train and Save 
df_full = load_data("./ressources/exercice_data.csv")
rf_model, train_cols = train_final_model(df_full)
joblib.dump(rf_model, './ressources/model.pkl')
joblib.dump(train_cols, './ressources/model_features.pkl')

# Run Inference 
dashboard_df = generate_dashboard_data("./ressources/exercice_data.csv")
print(dashboard_df.head())
"""