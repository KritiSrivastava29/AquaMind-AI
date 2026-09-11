import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib


# Load the dataset
data = pd.read_excel("data/water_data.xlsx")


# Input features
X = data[["Pressure (bar)", "Flow Rate (L/s)"]]

# Target
y = data["Leak Status"]


# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)


# Create the Random Forest model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)


# Train the model
model.fit(X_train, y_train)


# Test the model
y_pred = model.predict(X_test)


# Calculate accuracy
accuracy = accuracy_score(y_test, y_pred)

print("Model Accuracy:", accuracy)


# Show detailed results
print("\nClassification Report:")
print(classification_report(y_test, y_pred))


# Save the trained model
joblib.dump(model, "model/leak_model.pkl")

print("\nAI model saved successfully!")