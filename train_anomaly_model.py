import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Load dataset
data = pd.read_excel("data/water_data.xlsx")

# Select only genuinely normal readings
normal_data = data[
    (data["Leak Status"] == 0) &
    (data["Burst Status"] == 0)
].copy()

# Features used for anomaly detection
X = normal_data[["Pressure (bar)", "Flow Rate (L/s)"]]

# Create Isolation Forest model
model = IsolationForest(
    n_estimators=100,
    contamination=0.10,
    random_state=42
)

# Train only on normal operating data
model.fit(X)

# Check anomalies among normal training data
predictions = model.predict(X)

normal_count = (predictions == 1).sum()
anomaly_count = (predictions == -1).sum()

print("Normal training readings:", normal_count)
print("Anomalous training readings:", anomaly_count)

print("\nAnomalous normal-condition readings:")
print(
    normal_data[predictions == -1][
        ["Sensor_ID", "Pressure (bar)", "Flow Rate (L/s)"]
    ]
)

# Save model
joblib.dump(model, "model/anomaly_model.pkl")

print("\nAnomaly detection model saved successfully!")