from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from google import genai
import os
import json
import requests
import random
import time
import threading
from dotenv import load_dotenv


# ==========================================
# CREATE FASTAPI APPLICATION
# ==========================================

load_dotenv()

app = FastAPI(title="AquaMind AI API")

@app.get("/health")
def health_check():
    return {"status": "ok"}

# ==========================================
# THINGSBOARD CONFIGURATION
# ==========================================

THINGSBOARD_HOST = "https://eu.thingsboard.cloud"

THINGSBOARD_DEVICE_ID = os.getenv("THINGSBOARD_DEVICE_ID")
THINGSBOARD_API_KEY = os.getenv("THINGSBOARD_API_KEY")
THINGSBOARD_DEVICE_TOKEN = os.getenv("THINGSBOARD_DEVICE_TOKEN")


# ==========================================
# CLOUD IOT SIMULATOR
# Runs only while Live IoT is being requested
# ==========================================

iot_simulator_thread = None
iot_simulator_lock = threading.Lock()
last_iot_request_time = 0


def run_iot_simulator():

    data_file = "data/water_data.xlsx"

    try:
        data = pd.read_excel(data_file)

        normal_data = data[
            (data["Leak Status"] == 0) &
            (data["Burst Status"] == 0)
        ].copy()

        leak_data = data[
            data["Leak Status"] == 1
        ].copy()

        burst_data = data[
            data["Burst Status"] == 1
        ].copy()

        print("AquaMind AI - Cloud IoT Simulator")
        print(f"Dataset loaded: {data_file}")
        print(f"Normal readings : {len(normal_data)}")
        print(f"Leak readings   : {len(leak_data)}")
        print(f"Burst readings  : {len(burst_data)}")

        reading_number = 0

        while True:

            reading_number += 1

            # Same simulation logic as the original
            # local iot_simulator.py

            if reading_number % 12 != 0:

                row = normal_data.sample(n=1).iloc[0]

                pressure = row["Pressure (bar)"]
                flow_rate = row["Flow Rate (L/s)"]

                status = "NORMAL"

            else:

                if random.choice(["leak", "burst"]) == "leak":

                    row = leak_data.sample(n=1).iloc[0]
                    status = "LEAK EVENT"

                else:

                    row = burst_data.sample(n=1).iloc[0]
                    status = "BURST EVENT"

                pressure = row["Pressure (bar)"]
                flow_rate = row["Flow Rate (L/s)"]

            telemetry = {
                "pressure": round(float(pressure), 2),
                "flow_rate": round(float(flow_rate), 2)
            }

            url = (
                f"https://eu.thingsboard.cloud/api/v1/"
                f"{THINGSBOARD_DEVICE_TOKEN}/telemetry"
            )

            try:

                response = requests.post(
                    url,
                    json=telemetry,
                    timeout=10
                )

                print(
                    f"[{status}] "
                    f"Pressure: {pressure:.2f} bar | "
                    f"Flow: {flow_rate:.2f} L/s | "
                    f"Status: {response.status_code}"
                )

            except Exception as error:

                print("Cloud IoT simulator error:", error)

            time.sleep(5)

    except Exception as error:

        print("IoT simulator startup error:", error)


def start_iot_simulator():

    global iot_simulator_thread
    global last_iot_request_time

    last_iot_request_time = time.time()

    with iot_simulator_lock:

        if (
            iot_simulator_thread is None
            or not iot_simulator_thread.is_alive()
        ):

            iot_simulator_thread = threading.Thread(
                target=run_iot_simulator,
                daemon=True
            )

            iot_simulator_thread.start()

            print("Cloud IoT simulator started.")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://aquamind-ai-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# LOAD AI MODELS
# ==========================================

leak_model = joblib.load("model/leak_model.pkl")
burst_model = joblib.load("model/burst_model.pkl")
anomaly_model = joblib.load("model/anomaly_model.pkl")


# ==========================================
# GEMINI AI
# ==========================================

gemini_client = genai.Client()


# ==========================================
# INPUT DATA
# ==========================================

class WaterInput(BaseModel):
    pressure: float
    flow_rate: float


# ==========================================
# WATER EFFICIENCY SCORE
# ==========================================

def calculate_efficiency_score(
    pressure,
    flow_rate,
    leak_probability,
    burst_probability,
    anomaly_prediction
):

    score = 100

    # Leak risk reduces efficiency
    score -= leak_probability * 35

    # Burst risk reduces efficiency
    score -= burst_probability * 25

    # Anomaly reduces efficiency
    if anomaly_prediction == -1:
        score -= 20

    # Pressure baseline
    if pressure < 1.0 or pressure > 5.0:
        score -= 10

    # Invalid flow rate
    if flow_rate <= 0:
        score -= 10

    # Keep score between 0 and 100
    score = max(0, min(100, score))

    return round(score)


def get_efficiency_status(score):

    if score >= 80:
        return "Excellent"

    elif score >= 65:
        return "Good"

    elif score >= 50:
        return "Moderate"

    else:
        return "Needs Attention"


# ==========================================
# PREDICTION ENDPOINT
# ==========================================

@app.post("/predict")
def predict(data: WaterInput):

    # --------------------------------------
    # PREPARE INPUT
    # --------------------------------------

    input_data = pd.DataFrame(
        [[data.pressure, data.flow_rate]],
        columns=[
            "Pressure (bar)",
            "Flow Rate (L/s)"
        ]
    )


    # --------------------------------------
    # AI PREDICTIONS
    # --------------------------------------

    leak_probability = leak_model.predict_proba(
        input_data
    )[0][1]

    burst_probability = burst_model.predict_proba(
        input_data
    )[0][1]

    anomaly_prediction = anomaly_model.predict(
        input_data
    )[0]


    # --------------------------------------
    # ANOMALY STATUS
    # --------------------------------------

    if anomaly_prediction == -1:
        anomaly_status = "ANOMALY DETECTED"
    else:
        anomaly_status = "NORMAL"


    # --------------------------------------
    # WATER EFFICIENCY
    # --------------------------------------

    efficiency_score = calculate_efficiency_score(
        data.pressure,
        data.flow_rate,
        leak_probability,
        burst_probability,
        anomaly_prediction
    )

    efficiency_status = get_efficiency_status(
        efficiency_score
    )


    # --------------------------------------
    # RISK ASSESSMENT
    # --------------------------------------

    if burst_probability >= 0.80:

        status = "CRITICAL BURST RISK"

        recommendation = (
            "Immediate inspection required due to high burst risk."
        )

    elif leak_probability >= 0.80:

        status = "HIGH LEAK RISK"

        recommendation = (
            "Inspect the pipeline for possible water leakage."
        )

    elif (
        burst_probability >= 0.50
        or leak_probability >= 0.50
    ):

        status = "MEDIUM RISK"

        recommendation = (
            "Schedule a pipeline inspection and continue monitoring."
        )

    elif anomaly_prediction == -1:

        status = "ANOMALOUS READING"

        recommendation = (
            "Reading is outside the usual operating pattern. "
            "Verify the sensor reading and inspect the system "
            "before relying on the leak or burst prediction."
        )

    else:

        status = "NORMAL"

        recommendation = (
            "No significant leak or burst risk detected. "
            "Continue regular monitoring."
        )


    # --------------------------------------
    # RETURN RESULTS TO REACT
    # --------------------------------------

    return {

        "pressure": data.pressure,

        "flow_rate": data.flow_rate,

        "leak_probability": round(
            leak_probability * 100,
            2
        ),

        "burst_probability": round(
            burst_probability * 100,
            2
        ),

        "anomaly_status": anomaly_status,

        "system_status": status,

        "recommendation": recommendation,

        "efficiency_score": efficiency_score,

        "efficiency_status": efficiency_status
    }


# ==========================================
# GEMINI INSIGHT INPUT
# ==========================================

class InsightInput(BaseModel):

    pressure: float
    flow_rate: float

    leak_probability: float
    burst_probability: float

    anomaly_status: str

    efficiency_score: int
    efficiency_status: str

    system_status: str


# ==========================================
# COMBINED GEMINI ANALYSIS FOR MANUAL MODE
# ONE GEMINI CALL = INSIGHT + RECOMMENDATION
# ==========================================

@app.post("/gemini-analysis")
def generate_gemini_analysis(data: InsightInput):
    raw_text = ""

    prompt = f"""
You are AquaMind AI, a smart water sustainability monitoring system.

Analyze these water-system readings:

Pressure: {data.pressure} bar
Flow Rate: {data.flow_rate} L/s
Leak Probability: {data.leak_probability}%
Burst Probability: {data.burst_probability}%
System Behaviour: {data.anomaly_status}
Water Efficiency Score: {data.efficiency_score}/100
Efficiency Status: {data.efficiency_status}
System Status: {data.system_status}

Return your answer in exactly this plain-text format:

INSIGHT: Write a concise practical insight in maximum 2 sentences.
RECOMMENDATION: Write a concise practical recommendation in maximum 2 sentences.

Rules:
- Start the two lines exactly with INSIGHT: and RECOMMENDATION:
- Do not use Markdown, headings, bullet points, or asterisks.
- Do not add any extra section or text.
- Do not invent sensor data.
- Focus on water loss prevention, safety, and monitoring.
"""

    try:
        response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

        raw_text = (response.text or "").strip()

        print("Gemini combined response:", raw_text)

        insight = ""
        recommendation = ""

        # Preferred response format:
        # INSIGHT: ...
        # RECOMMENDATION: ...
        if "INSIGHT:" in raw_text and "RECOMMENDATION:" in raw_text:
            after_insight = raw_text.split("INSIGHT:", 1)[1]

            insight_part, recommendation_part = after_insight.split(
                "RECOMMENDATION:",
                1
            )

            insight = insight_part.strip()
            recommendation = recommendation_part.strip()

        # Backup: supports the format Gemini returned in your terminal:
        # **1. Practical Insight**
        # ...
        # **2. Practical Recommendation**
        elif "**1. Practical Insight**" in raw_text and "**2. Practical Recommendation**" in raw_text:
            after_first_heading = raw_text.split(
                "**1. Practical Insight**",
                1
            )[1]

            insight_part, recommendation_part = after_first_heading.split(
                "**2. Practical Recommendation**",
                1
            )

            insight = insight_part.strip()
            recommendation = recommendation_part.strip()

        # Final backup if it returns plain text without labels
        else:
            insight = raw_text
            recommendation = (
                "Continue monitoring current water-system conditions and "
                "follow the preventive maintenance schedule."
            )

        if not insight:
            insight = (
                "AI insight is currently unavailable. "
                "Continue monitoring the water-system conditions."
            )

        if not recommendation:
            recommendation = (
                "Review the current system conditions and continue monitoring."
            )

        return {
            "insight": insight,
            "recommendation": recommendation
        }

    except Exception as error:
        print("Gemini combined analysis error:", repr(error))

        return {
            "insight": (
                "AI insight is currently unavailable. "
                "Continue monitoring the water-system conditions."
            ),
            "recommendation": (
                "Review the current system conditions and continue monitoring."
            )
        }


# ==========================================
# LIVE IOT TELEMETRY
# ==========================================

@app.get("/iot/latest")
def get_latest_iot_data():

    start_iot_simulator()

    url = (
        f"{THINGSBOARD_HOST}"
        f"/api/plugins/telemetry/DEVICE/"
        f"{THINGSBOARD_DEVICE_ID}"
        f"/values/timeseries"
        f"?keys=pressure,flow_rate"
    )

    headers = {
        "X-Authorization": f"ApiKey {THINGSBOARD_API_KEY}"
    }

    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=10
        )

        response.raise_for_status()

        telemetry = response.json()

        pressure_data = telemetry.get("pressure", [])
        flow_data = telemetry.get("flow_rate", [])

        if not pressure_data or not flow_data:
            return {
                "pressure": None,
                "flow_rate": None,
                "connected": False
            }

        pressure_entry = pressure_data[0]
        flow_entry = flow_data[0]

        pressure = pressure_entry.get("value")
        flow_rate = flow_entry.get("value")

        pressure_ts = pressure_entry.get("ts")
        flow_ts = flow_entry.get("ts")

        latest_timestamp = max(
            pressure_ts or 0,
            flow_ts or 0
        )

        # ThingsBoard timestamp is in milliseconds.
        # If the latest reading is older than 15 seconds,
        # consider the IoT device disconnected.
        import time

        current_timestamp = int(time.time() * 1000)

        data_age_seconds = (
            current_timestamp - latest_timestamp
        ) / 1000

        connected = data_age_seconds <= 15

        return {
            "pressure": float(pressure) if pressure is not None else None,
            "flow_rate": float(flow_rate) if flow_rate is not None else None,
            "connected": connected,
            "timestamp": latest_timestamp
        }

    except Exception as error:
        print("ThingsBoard error:", error)

        return {
            "pressure": None,
            "flow_rate": None,
            "connected": False
        }