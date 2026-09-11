import joblib
import pandas as pd

# Load all trained AI models
leak_model = joblib.load("model/leak_model.pkl")
burst_model = joblib.load("model/burst_model.pkl")
anomaly_model = joblib.load("model/anomaly_model.pkl")

# Get input
pressure = float(input("Enter Pressure (bar): "))
flow_rate = float(input("Enter Flow Rate (L/s): "))

# Prepare input
input_data = pd.DataFrame(
    [[pressure, flow_rate]],
    columns=["Pressure (bar)", "Flow Rate (L/s)"]
)

# -----------------------------
# AI PREDICTIONS
# -----------------------------

# Leak
leak_probability = leak_model.predict_proba(input_data)[0][1]

# Burst
burst_probability = burst_model.predict_proba(input_data)[0][1]

# Anomaly
anomaly_prediction = anomaly_model.predict(input_data)[0]

if anomaly_prediction == -1:
    anomaly_status = "ANOMALY DETECTED"
else:
    anomaly_status = "NORMAL"


# -----------------------------
# RISK ASSESSMENT
# -----------------------------

if burst_probability >= 0.80:
    status = "CRITICAL BURST RISK"
    recommendation = "Immediate inspection required due to high burst risk."

elif leak_probability >= 0.80:
    status = "HIGH LEAK RISK"
    recommendation = "Inspect the pipeline for possible water leakage."

elif burst_probability >= 0.50 or leak_probability >= 0.50:
    status = "MEDIUM RISK"
    recommendation = "Schedule a pipeline inspection and continue monitoring."

elif anomaly_prediction == -1:
    status = "ANOMALOUS READING"
    recommendation = (
        "Reading is outside the usual operating pattern. "
        "Verify the sensor reading and inspect the system before "
        "relying on the leak or burst prediction."
    )

else:
    status = "NORMAL"
    recommendation = "No significant leak or burst risk detected. Continue regular monitoring."


# -----------------------------
# DISPLAY RESULTS
# -----------------------------

print("\n" + "=" * 50)
print("                 AQUAMIND AI")
print("=" * 50)

print(f"\nPressure   : {pressure} bar")
print(f"Flow Rate  : {flow_rate} L/s")

print("\n--- AI ANALYSIS ---")

print(f"Leak Probability   : {leak_probability * 100:.2f}%")
print(f"Burst Probability  : {burst_probability * 100:.2f}%")
print(f"System Behaviour   : {anomaly_status}")

print("\n--- SYSTEM STATUS ---")

print(f"System Status      : {status}")

print("\n--- RECOMMENDATION ---")

print(recommendation)

print("\n" + "=" * 50)