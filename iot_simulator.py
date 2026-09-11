import json
import random
import time
import urllib.request
import pandas as pd
from dotenv import load_dotenv
import os

load_dotenv()


# ==========================================
# THINGSBOARD DEVICE TOKEN
# ==========================================

TOKEN = os.getenv("THINGSBOARD_DEVICE_TOKEN")

URL = f"https://eu.thingsboard.cloud/api/v1/{TOKEN}/telemetry"


# ==========================================
# LOAD KAGGLE DATASET
# ==========================================

DATA_FILE = "data/water_data.xlsx"

data = pd.read_excel(DATA_FILE)

# Normal readings
normal_data = data[
    (data["Leak Status"] == 0) &
    (data["Burst Status"] == 0)
].copy()

# Leak readings
leak_data = data[
    data["Leak Status"] == 1
].copy()

# Burst readings
burst_data = data[
    data["Burst Status"] == 1
].copy()


# ==========================================
# SEND TELEMETRY
# ==========================================

def send_data(pressure, flow_rate):

    telemetry = {
        "pressure": round(float(pressure), 2),
        "flow_rate": round(float(flow_rate), 2)
    }

    payload = json.dumps(telemetry).encode("utf-8")

    request = urllib.request.Request(
        URL,
        data=payload,
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(request) as response:
            print(
                f"Sent → Pressure: {pressure:.2f} bar | "
                f"Flow: {flow_rate:.2f} L/s | "
                f"Status: {response.status}"
            )

    except Exception as error:
        print("Error:", error)


# ==========================================
# LIVE SIMULATION
# ==========================================

print("==========================================")
print("AquaMind AI - IoT Simulator")
print("==========================================")
print(f"Dataset loaded: {DATA_FILE}")
print(f"Normal readings : {len(normal_data)}")
print(f"Leak readings   : {len(leak_data)}")
print(f"Burst readings  : {len(burst_data)}")
print("==========================================")
print("Starting live simulation...")
print()


while True:

    # --------------------------------------
    # NORMAL OPERATION
    # --------------------------------------

    # Most readings will be normal.
    # Every 12 readings, simulate an event.
    reading_number = getattr(
        globals(),
        "reading_number",
        0
    )

    reading_number += 1
    globals()["reading_number"] = reading_number

    if reading_number % 12 != 0:

        row = normal_data.sample(
            n=1
        ).iloc[0]

        pressure = row["Pressure (bar)"]
        flow_rate = row["Flow Rate (L/s)"]

        status = "NORMAL"

    # --------------------------------------
    # EVENT READING
    # --------------------------------------

    else:

        # Randomly choose Leak or Burst
        if random.choice(["leak", "burst"]) == "leak":

            row = leak_data.sample(
                n=1
            ).iloc[0]

            status = "LEAK EVENT"

        else:

            row = burst_data.sample(
                n=1
            ).iloc[0]

            status = "BURST EVENT"

        pressure = row["Pressure (bar)"]
        flow_rate = row["Flow Rate (L/s)"]


    # --------------------------------------
    # SEND TO THINGSBOARD
    # --------------------------------------

    print(f"[{status}]")

    send_data(
        pressure,
        flow_rate
    )

    # Wait 5 seconds before next reading
    time.sleep(5)