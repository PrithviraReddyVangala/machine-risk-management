from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "model"

DATA_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

rng = np.random.default_rng(42)

rows = []

vibration_map = {
    "Low": 0,
    "Medium": 1,
    "High": 2
}

for _ in range(600):

    temperature = int(rng.integers(55, 101))
    pressure = int(rng.integers(40, 141))
    vibration = rng.choice(["Low", "Medium", "High"])
    humidity = int(rng.integers(30, 91))

    # Synthetic rule used to create demonstration training labels.
    score = 0

    # Temperature
    if temperature >= 85:
        score += 2
    elif temperature >= 75:
        score += 1

    # Pressure
    if pressure >= 125:
        score += 2
    elif pressure >= 115:
        score += 1

    # Vibration
    score += vibration_map[vibration]

    # Humidity
    if humidity >= 80:
        score += 2
    elif humidity >= 65:
        score += 1

    # Risk classification
    if score <= 2:
        risk = "Low"
    elif score <= 4:
        risk = "Medium"
    else:
        risk = "High"

    rows.append([
        temperature,
        pressure,
        vibration,
        humidity,
        risk
    ])


df = pd.DataFrame(
    rows,
    columns=[
        "Temperature",
        "Pressure",
        "Vibration",
        "Humidity",
        "Risk"
    ]
)

# Save training data
df.to_csv(
    DATA_DIR / "training_data.csv",
    index=False
)


# Prepare model features
X = pd.DataFrame({
    "Temperature": df["Temperature"],
    "Pressure": df["Pressure"],
    "Vibration": df["Vibration"].map(vibration_map),
    "Humidity": df["Humidity"]
})


# Encode target labels
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(df["Risk"])


# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# Random Forest model
model = RandomForestClassifier(
    n_estimators=120,
    max_depth=8,
    random_state=42
)

model.fit(X_train, y_train)


# Test accuracy
accuracy = model.score(X_test, y_test)


# Save trained model
joblib.dump(
    {
        "model": model,
        "label_encoder": label_encoder,
        "vibration_map": vibration_map
    },
    MODEL_DIR / "risk_model.joblib"
)


print(f"Model trained. Test accuracy: {accuracy:.3f}")
print(f"Features used: {list(X.columns)}")
print(f"Saved model to: {MODEL_DIR / 'risk_model.joblib'}")