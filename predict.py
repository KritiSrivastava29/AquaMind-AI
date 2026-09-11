import joblib

# Load the trained AI model
model = joblib.load("model/leak_model.pkl")

# Get input from the user
pressure = float(input("Enter Pressure (bar): "))
flow_rate = float(input("Enter Flow Rate (L/s): "))

# Make prediction
prediction = model.predict([[pressure, flow_rate]])[0]

# Get prediction probability
probability = model.predict_proba([[pressure, flow_rate]])[0]

# Display result
if prediction == 1:
    print("\n🚨 LEAK DETECTED")
    print(f"Leak Probability: {probability[1] * 100:.2f}%")
else:
    print("\n✅ NO LEAK DETECTED")
    print(f"No-Leak Probability: {probability[0] * 100:.2f}%")