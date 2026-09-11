import joblib
import pandas as pd

# Load the trained burst model
model = joblib.load("model/burst_model.pkl")

# Get input
pressure = float(input("Enter Pressure (bar): "))
flow_rate = float(input("Enter Flow Rate (L/s): "))

# Keep the same feature names used during training
input_data = pd.DataFrame(
    [[pressure, flow_rate]],
    columns=["Pressure (bar)", "Flow Rate (L/s)"]
)

# Make prediction
prediction = model.predict(input_data)[0]

# Get probability
probability = model.predict_proba(input_data)[0]

# Display result
if prediction == 1:
    print("\n🚨 BURST RISK DETECTED")
    print(f"Burst Probability: {probability[1] * 100:.2f}%")
else:
    print("\n✅ NO BURST RISK DETECTED")
    print(f"No-Burst Probability: {probability[0] * 100:.2f}%")