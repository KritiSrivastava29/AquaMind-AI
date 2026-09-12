# 💧 AquaMind AI

### AI-Powered Water System Monitoring & Risk Detection

AquaMind AI is an intelligent water monitoring platform that combines **Machine Learning, IoT telemetry, and Gemini AI** to analyze water system conditions, detect potential risks, and provide actionable insights.

The platform supports both **Manual Analysis** and **Live IoT Monitoring**, allowing users to evaluate pressure and flow-rate readings and identify potential leaks, burst risks, anomalies, and system efficiency issues.

---

## 🚀 Live Demo

🌐 **[AquaMind AI – Live Website](https://aquamind-ai-app.vercel.app)**

---

## 📌 Overview

Water infrastructure can experience problems such as leaks, abnormal pressure, excessive flow, and sudden system failures. AquaMind AI provides an intelligent monitoring interface that analyzes these parameters and helps identify potentially unsafe or inefficient system conditions.

The system combines:

- Machine Learning models for risk detection
- ThingsBoard for IoT telemetry
- FastAPI for backend processing
- Gemini AI for intelligent insights and recommendations
- React.js for the interactive dashboard

---

## ✨ Features

### 🔎 Manual System Analysis

Users can enter:

- Pressure (bar)
- Flow Rate (L/s)

The system analyzes the readings and provides:

- Leak probability
- Burst probability
- Anomaly status
- Efficiency score
- Overall system status
- AI-generated insights
- AI-generated recommendations

---

### 📡 Live IoT Monitoring

AquaMind AI can retrieve live sensor readings through **ThingsBoard IoT telemetry**.

The dashboard displays the latest:

- Pressure readings
- Flow-rate readings
- System condition
- IoT connection status

An IoT simulator is also included in the project for generating and sending water-system telemetry during development and testing.

---

### 🤖 Machine Learning Risk Detection

The backend uses trained ML models to evaluate water-system conditions.

The project includes models for:

- Leak detection
- Burst risk detection
- Anomaly detection

The models process pressure and flow-rate parameters to identify unusual or potentially risky operating conditions.

---

### 🧠 Gemini AI Insights

After the ML analysis, Gemini AI is used to generate contextual:

- System insights
- Risk explanations
- Recommendations

This adds a natural-language layer to the numerical and ML-based results.

---

### 📊 System Efficiency Analysis

The platform calculates an efficiency score based on the analyzed system conditions and presents the result through the dashboard.

---

### ⚠️ Input Validation

Manual inputs are validated against the supported pressure and flow-rate ranges so users can immediately understand when an entered value is outside the expected operating range.

---

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      User Input      │
                    │ Pressure + Flow Rate │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │      Vercel          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    FastAPI Backend   │
                    │       Render         │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌────────────┐ ┌─────────────┐ ┌──────────────┐
        │ ML Models  │ │ ThingsBoard │ │  Gemini AI   │
        │            │ │     IoT     │ │              │
        └─────┬──────┘ └──────┬──────┘ └──────┬───────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌──────────────────────┐
                    │ Analysis & Insights  │
                    │   shown on dashboard │
                    └──────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Vite
- JavaScript
- CSS

### Backend

- Python
- FastAPI
- Uvicorn

### Machine Learning

- Scikit-learn
- Pandas
- NumPy
- Joblib

### IoT

- ThingsBoard Cloud
- IoT telemetry
- Custom Python IoT simulator

### Generative AI

- Google Gemini API

### Deployment

- Vercel — Frontend
- Render — Backend
- GitHub — Source Code & Version Control

---

## 📂 Project Structure

```text
AquaMind/
│
├── README.md
├── app.py
├── iot_simulator.py
│
├── predict.py
├── predict_all.py
├── predict_burst.py
│
├── train_model.py
├── train_anomaly_model.py
├── train_burst_model.py
│
├── requirements.txt
├── .gitignore
│
├── data/
│   └── water_data.xlsx
│
├── model/
│   ├── anomaly_model.pkl
│   ├── burst_model.pkl
│   └── leak_model.pkl
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    │
    ├── public/
    │
    └── src/
        ├── App.jsx
        ├── App.css
        ├── index.css
        └── main.jsx
```

---

## ⚙️ How It Works

### 1. Input

The user either enters pressure and flow-rate values manually or selects **Live IoT Monitoring**.

### 2. Backend Processing

The React frontend sends the readings to the FastAPI backend.

### 3. Machine Learning Analysis

The backend processes the readings using the trained ML models to evaluate:

- Leak risk
- Burst risk
- Anomalous behavior

### 4. System Evaluation

The system calculates the overall condition and efficiency of the water system.

### 5. AI Analysis

The analyzed results are sent to Gemini AI to generate human-readable insights and recommendations.

### 6. Dashboard

The final results are displayed through the AquaMind AI dashboard.

---

## 💻 Local Setup

### Prerequisites

Make sure you have installed:

- Python
- Node.js
- npm
- Git

---

### Clone the Repository

```bash
git clone https://github.com/KritiSrivastava29/AquaMind-AI.git
cd AquaMind-AI
```

---

### Backend Setup

Create and activate a virtual environment:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

### Environment Variables

Create a `.env` file in the project root.

Add your required credentials:

```env
GEMINI_API_KEY=your_gemini_api_key
THINGSBOARD_DEVICE_ID=your_device_id
THINGSBOARD_API_KEY=your_api_key
THINGSBOARD_DEVICE_TOKEN=your_device_token
```

> **Never commit your `.env` file to GitHub.**

The project uses `.gitignore` to keep sensitive credentials out of version control.

---

### Start the Backend

```bash
uvicorn app:app --reload
```

The backend will run locally at:

```text
http://127.0.0.1:8000
```

---

### Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

## 📡 IoT Simulator

The project includes an IoT simulator for testing live telemetry.

From the project root:

```bash
python iot_simulator.py
```

The simulator loads readings from:

```text
data/water_data.xlsx
```

and sends telemetry to ThingsBoard.

---

## 🔐 Security

Sensitive credentials are stored using environment variables rather than being hard-coded into the application.

The following should **never be committed**:

- Gemini API keys
- ThingsBoard credentials
- Device tokens
- Other private API credentials

The `.env` file is excluded through `.gitignore`.

---

## 🌐 Deployment

### Frontend

The React frontend is deployed using **Vercel**.

### Backend

The FastAPI backend is deployed using **Render**.

### IoT

Live telemetry is integrated through **ThingsBoard Cloud**.

---

## 🔮 Future Improvements

Possible future improvements include:

- Historical telemetry graphs
- Database-backed sensor history
- Automated leak alerts
- Email or notification-based warnings
- More IoT sensor types
- Predictive maintenance
- Advanced time-series forecasting
- User authentication
- Monitoring multiple water systems simultaneously

---

## 👩‍💻 Project

**AquaMind AI**

Built as an intelligent water-system monitoring and risk-analysis platform using Machine Learning, IoT, and Generative AI.

---

⭐ If you find this project interesting, consider giving the repository a star!