import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  // ================= MODE =================
  const [mode, setMode] = useState("manual");

  // ================= MANUAL INPUTS =================
  const [manualPressure, setManualPressure] = useState("");
  const [manualFlowRate, setManualFlowRate] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");

  // ================= MANUAL RESULTS =================
  const [manualResult, setManualResult] = useState(null);
  const [manualHistory, setManualHistory] = useState([]);
  const [manualInsight, setManualInsight] = useState("");
  const [manualRecommendation, setManualRecommendation] = useState("");

  // ================= LIVE IOT INPUTS / STATUS =================
  const [iotPressure, setIotPressure] = useState("");
  const [iotFlowRate, setIotFlowRate] = useState("");
  const [iotConnected, setIotConnected] = useState(false);
  const [iotLoading, setIotLoading] = useState(false);
  const [iotError, setIotError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);

  // ================= LIVE IOT RESULTS =================
  const [iotResult, setIotResult] = useState(null);
  const [iotHistory, setIotHistory] = useState([]);

  // ================= LIVE IOT GRAPH DATA =================
  const [iotChartData, setIotChartData] = useState([]);

  // ================= LIVE IOT SESSION =================
  const [iotSessionStats, setIotSessionStats] = useState({
    readings: 0,
    warnings: 0,
    critical: 0,
    anomalies: 0,
    efficiencyTotal: 0,
  });

  const [iotAnomaly, setIotAnomaly] = useState(null);

  const previousIoTReadingRef = useRef(null);

  // ================= RISK HELPERS =================
  const getRiskLevel = (probability) => {
    if (probability >= 60) return "HIGH";
    if (probability >= 30) return "MEDIUM";
    return "LOW";
  };

  const getRiskClass = (probability) => {
    if (probability >= 60) return "danger";
    if (probability >= 30) return "medium";
    return "safe";
  };

  const getLiveAlert = () => {
    if (!iotResult) {
      return null;
    }

    if (iotResult.burst_probability >= 60) {
      return {
        type: "critical",
        title: "Critical Burst Risk",
        message: `Burst probability is ${iotResult.burst_probability}%. Immediate system inspection is recommended.`,
      };
    }

    if (iotResult.leak_probability >= 60) {
      return {
        type: "critical",
        title: "High Leak Risk",
        message: `Leak probability is ${iotResult.leak_probability}%. Check the water system for possible leakage.`,
      };
    }

    if (
      iotResult.burst_probability >= 30 ||
      iotResult.leak_probability >= 30
    ) {
      return {
        type: "warning",
        title: "Potential System Risk",
        message: "The latest IoT reading indicates an elevated risk. Continue monitoring the system.",
      };
    }

    return {
      type: "normal",
      title: "System Operating Normally",
      message: "No significant leak, burst, or abnormal behaviour detected in the latest IoT reading.",
    };
  };

  // ================= COMMON PREDICTION API =================
  // Used by Manual mode and Live IoT mode.
  const getPrediction = async (pressure, flowRate) => {
    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pressure: Number(pressure),
        flow_rate: Number(flowRate),
      }),
    });

    if (!response.ok) {
      throw new Error("Prediction request failed");
    }

    return response.json();
  };

  // =================================================
  // MANUAL MODE ONLY: ONE COMBINED GEMINI API CALL
  // Calls POST /gemini-analysis
  // Returns: insight + recommendation
  // =================================================
  const generateManualGeminiAnalysis = async (data) => {
    try {
      setManualInsight("Generating AI insight...");
      setManualRecommendation("Generating AI recommendation...");

      const response = await fetch(
        "http://127.0.0.1:8000/gemini-analysis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pressure: data.pressure,
            flow_rate: data.flow_rate,
            leak_probability: data.leak_probability,
            burst_probability: data.burst_probability,
            anomaly_status: data.anomaly_status,
            efficiency_score: data.efficiency_score,
            efficiency_status: data.efficiency_status,
            system_status: data.system_status,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Combined Gemini analysis failed (${response.status}): ${errorText}`
        );
      }

      const geminiData = await response.json();

      setManualInsight(
        geminiData.insight ||
          "No AI insight was generated for this analysis."
      );

      setManualRecommendation(
        geminiData.recommendation ||
          "Continue monitoring current water-system conditions."
      );
    } catch (error) {
      console.error("Manual Gemini analysis error:", error);

      setManualInsight(
        "AI insight is currently unavailable. Continue monitoring the water-system conditions."
      );

      setManualRecommendation(
        "AI recommendation is currently unavailable. Continue monitoring current water-system conditions."
      );
    }
  };

  // =================================================
  // MANUAL MODE: BUTTON-BASED ANALYSIS
  // =================================================
  const analyzeManualSystem = async () => {

    const pressure = Number(manualPressure);
    const flowRate = Number(manualFlowRate);

    if (
      manualPressure === "" ||
      manualFlowRate === "" ||
      !Number.isFinite(pressure) ||
      !Number.isFinite(flowRate)
    ) {
      setManualError(
        "Please enter valid values. Pressure: 0–10 bar | Flow Rate: 0–400 L/s."
      );
      return;
    }

    if (pressure < 0 || pressure > 10 || flowRate < 0 || flowRate > 400) {
      setManualError(
        "Please enter values within the valid ranges: Pressure: 0–10 bar | Flow Rate: 0–400 L/s."
      );
      return;
    }

    setManualError("");

    if (manualPressure === "" || manualFlowRate === "") {
      setManualError("Please enter both pressure and flow rate.");
      return;
    }

    setManualLoading(true);
    setManualError("");
    setManualResult(null);
    setManualInsight("");
    setManualRecommendation("");

    // Lets React show "Analyzing..." before API calls begin.
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      // 1. Manual ML prediction
      const data = await getPrediction(manualPressure, manualFlowRate);

      console.log("Manual prediction response:", data);

      setManualResult(data);

      // 2. Save only to Manual History
      setManualHistory((previousHistory) =>
        [
          {
            pressure: data.pressure,
            flow: data.flow_rate,
            leak: data.leak_probability,
            burst: data.burst_probability,
            status: data.system_status,
          },
          ...previousHistory,
        ].slice(0, 5)
      );

      // 3. One combined Gemini request only
      await generateManualGeminiAnalysis(data);
    } catch (error) {
      console.error("Manual analysis error:", error);

      setManualError(
        "Unable to complete analysis. Please verify that the backend is running."
      );
    } finally {
      setManualLoading(false);
    }
  };


useEffect(() => {
  const checkBackendConnection = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/health"
      );

      if (!response.ok) {
        throw new Error("Backend unavailable");
      }

      setBackendConnected(true);
    } catch (error) {
      setBackendConnected(false);
    }
  };

  checkBackendConnection();

  const intervalId = setInterval(
    checkBackendConnection,
    5000
  );

  return () => clearInterval(intervalId);
}, []);

  // =================================================
  // LIVE IOT MODE: SENSOR + PREDICTION ONLY
  // IMPORTANT: NO GEMINI CALL HERE
  // =================================================
  const fetchLiveIoTData = async () => {
    try {
      setIotLoading(true);

      // 1. Get newest IoT sensor reading
      const response = await fetch("http://127.0.0.1:8000/iot/latest");

      if (!response.ok) {
        throw new Error("IoT data request failed");
      }

      const sensorData = await response.json();

      if (sensorData.connected === false) {
        setIotConnected(false);
        setIotError("Live IoT device is unavailable.");
        return;
      }

      const hasValidIoTData =
        sensorData.pressure !== null &&
        sensorData.pressure !== undefined &&
        sensorData.flow_rate !== null &&
        sensorData.flow_rate !== undefined;

      if (!hasValidIoTData) {
        throw new Error("IoT data is incomplete");
      }

      setIotPressure(sensorData.pressure);
      setIotFlowRate(sensorData.flow_rate);
      setIotConnected(true);
      setLastUpdated(new Date());
      setIotError("");

      // ================================================
      // LIVE ANOMALY DETECTION
      // Compare current reading with previous reading
      // ================================================

      const currentPressure = Number(sensorData.pressure);
      const currentFlow = Number(sensorData.flow_rate);

      const previousReading = previousIoTReadingRef.current;

      let detectedAnomaly = null;

      if (previousReading) {
        const pressureChange =
          ((currentPressure - previousReading.pressure) /
            previousReading.pressure) *
          100;

        const flowChange =
          ((currentFlow - previousReading.flow) /
            previousReading.flow) *
          100;

        if (pressureChange <= -20) {
          detectedAnomaly = {
            type: "pressure-drop",
            title: "Significant Pressure Drop Detected",
            message: `Pressure dropped from ${previousReading.pressure.toFixed(
              2
            )} → ${currentPressure.toFixed(2)} bar`,
            change: `${Math.abs(pressureChange).toFixed(1)}% decrease`,
          };
        } else if (pressureChange >= 20) {
          detectedAnomaly = {
            type: "pressure-rise",
            title: "Significant Pressure Increase Detected",
            message: `Pressure increased from ${previousReading.pressure.toFixed(
              2
            )} → ${currentPressure.toFixed(2)} bar`,
            change: `${pressureChange.toFixed(1)}% increase`,
          };
        } else if (flowChange <= -20) {
          detectedAnomaly = {
            type: "flow-drop",
            title: "Significant Flow Drop Detected",
            message: `Flow rate dropped from ${previousReading.flow.toFixed(
              2
            )} → ${currentFlow.toFixed(2)} L/min`,
            change: `${Math.abs(flowChange).toFixed(1)}% decrease`,
          };
        } else if (flowChange >= 20) {
          detectedAnomaly = {
            type: "flow-rise",
            title: "Significant Flow Increase Detected",
            message: `Flow rate increased from ${previousReading.flow.toFixed(
              2
            )} → ${currentFlow.toFixed(2)} L/min`,
            change: `${flowChange.toFixed(1)}% increase`,
          };
        }
      }

      setIotAnomaly(detectedAnomaly);

      // Store current reading for the next comparison
      previousIoTReadingRef.current = {
        pressure: currentPressure,
        flow: currentFlow,
      };

      // Save latest reading for live graphs
      setIotChartData((previousData) => [
        ...previousData.slice(-19),
        {
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          pressure: Number(sensorData.pressure),
          flow: Number(sensorData.flow_rate),
        },
      ]);

      // 2. Only ML prediction — not Gemini
      const predictionData = await getPrediction(
        sensorData.pressure,
        sensorData.flow_rate
      );

      console.log("Live IoT prediction response:", predictionData);

      setIotResult(predictionData);

      // ================================================
      // LIVE SESSION STATISTICS
      // ================================================

      setIotSessionStats((previousStats) => {
        const leakProbability = Number(
          predictionData.leak_probability || 0
        );

        const burstProbability = Number(
          predictionData.burst_probability || 0
        );

        const highestRisk = Math.max(
          leakProbability,
          burstProbability
        );

        const warningDetected = highestRisk >= 30 && highestRisk < 60;
        const criticalDetected = highestRisk >= 60;

        return {
          readings: previousStats.readings + 1,

          warnings:
            previousStats.warnings +
            (warningDetected ? 1 : 0),

          critical:
            previousStats.critical +
            (criticalDetected ? 1 : 0),

          anomalies:
            previousStats.anomalies +
            (
              detectedAnomaly ||
              String(predictionData.anomaly_status || "")
                .toLowerCase()
                .includes("anomaly")
            ? 1
            : 0
          ),

          efficiencyTotal:
            previousStats.efficiencyTotal +
            Number(predictionData.efficiency_score || 0),
        };
      });

      // 3. Save only to Live IoT History
      setIotHistory((previousHistory) =>
        [
          {
            pressure: predictionData.pressure,
            flow: predictionData.flow_rate,
            leak: predictionData.leak_probability,
            burst: predictionData.burst_probability,
            status: predictionData.system_status,
          },
          ...previousHistory,
        ].slice(0, 5)
      );
    } catch (error) {
      console.error("IoT connection error:", error);
      setIotConnected(false);
      setIotError("Live IoT device is unavailable.");
    } finally {
      setIotLoading(false);
    }
  };

  // =================================================
  // LIVE IOT POLLING
  // Runs only in IoT mode and stops after mode changes.
  // =================================================
  useEffect(() => {
    if (mode !== "iot") {
      return;
    }

    // Start a fresh Live IoT session
    setIotSessionStats({
      readings: 0,
      warnings: 0,
      critical: 0,
      anomalies: 0,
      efficiencyTotal: 0,
    });

    setIotAnomaly(null);
    previousIoTReadingRef.current = null;

    fetchLiveIoTData();

    const intervalId = setInterval(() => {
      fetchLiveIoTData();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [mode]);

  // ================= ACTIVE MODE VALUES =================
  const activeResult = mode === "manual" ? manualResult : iotResult;

  const activeHistory =
    mode === "manual" ? manualHistory : iotHistory;


  // ================= LIVE GRAPH POINTS =================

  const createGraphPoints = (values, width = 700, height = 220) => {
    if (values.length < 2) {
      return "";
    }

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const range = maxValue - minValue || 1;

    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;

        const y =
          height -
          ((value - minValue) / range) * (height - 30) -
          15;

        return `${x},${y}`;
      })
      .join(" ");
  };

const pressureGraphPoints = createGraphPoints(
  iotChartData.map((item) => item.pressure)
);

const flowGraphPoints = createGraphPoints(
  iotChartData.map((item) => item.flow)
);

const liveStats = {
  avgPressure:
    iotChartData.length > 0
      ? (
          iotChartData.reduce((sum, item) => sum + item.pressure, 0) /
          iotChartData.length
        ).toFixed(2)
      : "--",

  avgFlow:
    iotChartData.length > 0
      ? (
          iotChartData.reduce((sum, item) => sum + item.flow, 0) /
          iotChartData.length
        ).toFixed(2)
      : "--",

  minPressure:
    iotChartData.length > 0
      ? Math.min(...iotChartData.map((item) => item.pressure)).toFixed(2)
      : "--",

  maxPressure:
    iotChartData.length > 0
      ? Math.max(...iotChartData.map((item) => item.pressure)).toFixed(2)
      : "--",

  minFlow:
  iotChartData.length > 0
    ? Math.min(...iotChartData.map((item) => item.flow)).toFixed(2)
    : "--",

  maxFlow:
    iotChartData.length > 0
      ? Math.max(...iotChartData.map((item) => item.flow)).toFixed(2)
      : "--",

};


  const switchMode = (selectedMode) => {
    setMode(selectedMode);
  };

  return (
    <div className="dashboard">
      {/* ================= HEADER ================= */}
      <header className="header">
        <div className="brand">
          <img src="/favicon.png" alt="AquaMind AI Logo" />

          <div>
            <h1>
              AquaMind <span>AI</span>
            </h1>

            <p>Smart Water Sustainability & Monitoring System</p>
          </div>
        </div>

        <div className={`online ${backendConnected ? "connected" : "offline"}`}>
          ● {backendConnected ? "System Online" : "System Offline"}
        </div>
      </header>

      {/* ================= MODE + INPUTS ================= */}
      <section className="card inputs">
        <div className="analysis-mode">
          <button
            type="button"
            className={
              mode === "manual" ? "mode-btn active" : "mode-btn"
            }
            onClick={() => switchMode("manual")}
          >
            Manual Analysis
          </button>

          <button
            type="button"
            className={
              mode === "iot" ? "mode-btn active" : "mode-btn"
            }
            onClick={() => switchMode("iot")}
          >
            Live IoT
          </button>
        </div>

        {/* ================= MANUAL MODE UI ================= */}
        {mode === "manual" && (
          <div className="system-input-row manual-row">
            <div className="section-title">

              <div>
                <h2>① MANUAL SYSTEM INPUTS</h2>
                <p>Enter water system parameters</p>
              </div>
            </div>

            <div className="input-box">
              <label>Pressure (bar)</label>

              <input
                type="number"
                min="0"
                max="10"
                value={manualPressure}
                onChange={(event) =>
                  setManualPressure(event.target.value)
                }
                placeholder="Enter pressure"
              />
            </div>

            <div className="input-box">
              <label>Flow Rate (L/s)</label>

              <input
                type="number"
                min="0"
                max="400"
                value={manualFlowRate}
                onChange={(event) =>
                  setManualFlowRate(event.target.value)
                }
                placeholder="Enter flow rate"
              />
            </div>

            <button
              type="button"
              onClick={analyzeManualSystem}
              disabled={
                manualLoading ||
                manualPressure === "" ||
                manualFlowRate === ""
              }
            >
              💧{" "}
              {manualLoading ? "Analyzing..." : "Analyze Water System"}
            </button>

            {manualError && (
              <p className="mode-error">{manualError}</p>
            )}
          </div>
        )}

        {/* ================= LIVE IOT MODE UI ================= */}
        {mode === "iot" && (
          <div className="iot-mode-content">
            <div
              className="iot-status"
              style={{
                color: iotConnected ? "#18c985" : "#e5484d",
              }}
            >
              {iotConnected
                ? "● Live IoT Connected"
                : "● IoT Disconnected"}
            </div>

            <div className="iot-last-updated">
              Last updated:{" "}
              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : "--"}
            </div>

            <div className="system-input-row iot-row">
              <div className="section-title">

                <div>
                  <h2>① LIVE IOT MONITORING</h2>
                  <p>Real-time sensor readings</p>
                </div>
              </div>

              <div className="input-box">
                <label>Live Pressure (bar)</label>

                <input
                  type="number"
                  value={iotPressure}
                  placeholder="Waiting for IoT data"
                  disabled
                />
              </div>

              <div className="input-box">
                <label>Live Flow Rate (L/s)</label>

                <input
                  type="number"
                  value={iotFlowRate}
                  placeholder="Waiting for IoT data"
                  disabled
                />
              </div>
            </div>

            <p className="iot-updating">
              {iotLoading
                ? "Updating live readings and prediction..."
                : "Data refreshes automatically every 5 seconds."}
            </p>

            {iotError && (
              <p className="mode-error">{iotError}</p>
            )}

            {/* ================= LIVE IOT GRAPHS ================= */}

            <div className="iot-live-graphs">

              {/* PRESSURE GRAPH */}
              <div className="iot-graph-card">

                <div className="iot-graph-header">
                  <div>
                    <h3>Live Pressure</h3>
                    <p>Real-time sensor readings</p>
                  </div>

                  <strong>
                    {iotPressure !== "" ? `${iotPressure} bar` : "--"}
                  </strong>
                </div>

                <div className="iot-graph">
                  {iotChartData.length >= 2 ? (
                    <svg
                      viewBox="0 0 700 220"
                      preserveAspectRatio="none"
                    >
                      <line
                        x1="0"
                        y1="55"
                        x2="700"
                        y2="55"
                        className="graph-grid-line"
                      />

                      <line
                        x1="0"
                        y1="110"
                        x2="700"
                        y2="110"
                        className="graph-grid-line"
                      />

                      <line
                        x1="0"
                        y1="165"
                        x2="700"
                        y2="165"
                        className="graph-grid-line"
                      />

                      <polyline
                        points={pressureGraphPoints}
                        className="iot-pressure-line"
                      />
                    </svg>
                  ) : (
                    <div className="graph-waiting">
                      Waiting for live IoT readings...
                    </div>
                  )}
                </div>

              </div>


              {/* FLOW GRAPH */}
              <div className="iot-graph-card">

                <div className="iot-graph-header">
                  <div>
                    <h3>Live Flow Rate</h3>
                    <p>Real-time sensor readings</p>
                  </div>

                  <strong>
                    {iotFlowRate !== "" ? `${iotFlowRate} L/s` : "--"}
                  </strong>
                </div>

                <div className="iot-graph">
                  {iotChartData.length >= 2 ? (
                    <svg
                      viewBox="0 0 700 220"
                      preserveAspectRatio="none"
                    >
                      <line
                        x1="0"
                        y1="55"
                        x2="700"
                        y2="55"
                        className="graph-grid-line"
                      />

                      <line
                        x1="0"
                        y1="110"
                        x2="700"
                        y2="110"
                        className="graph-grid-line"
                      />

                      <line
                        x1="0"
                        y1="165"
                        x2="700"
                        y2="165"
                        className="graph-grid-line"
                      />

                      <polyline
                        points={flowGraphPoints}
                        className="iot-flow-line"
                      />
                    </svg>
                  ) : (
                    <div className="graph-waiting">
                      Waiting for live IoT readings...
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}
      </section>


      {/* ================= Live IoT Statistics card ================= */}

      {mode === "iot" && (
        <section className="card live-statistics">
          <h2>② LIVE IOT STATISTICS</h2>
          
          <div className="live-stat-grid">
            <div className="live-stat">
              <span>Average Pressure</span>
              <strong>{liveStats.avgPressure}</strong>
              <small>bar</small>
            </div>

            <div className="live-stat">
              <span>Minimum Pressure</span>
              <strong>{liveStats.minPressure}</strong>
              <small>bar</small>
            </div>

            <div className="live-stat">
              <span>Maximum Pressure</span>
              <strong>{liveStats.maxPressure}</strong>
              <small>bar</small>
            </div>

            <div className="live-stat">
              <span>Average Flow Rate</span>
              <strong>{liveStats.avgFlow}</strong>
              <small>L/min</small>
            </div>

            <div className="live-stat">
              <span>Minimum Flow Rate</span>
              <strong>{liveStats.minFlow}</strong>
              <small>L/s</small>
            </div>

            <div className="live-stat">
              <span>Maximum Flow Rate</span>
              <strong>{liveStats.maxFlow}</strong>
              <small>L/s</small>
            </div>
          </div>
        </section>
      )}


      {/* ================= AI Analysis ================= */}
      
      {activeResult && (
        <>
          <section className="card">
            <div className="section-title">
            
              <div>
                <h2>
                  {mode === "manual"
                    ? "② MANUAL AI ANALYSIS"
                    : "③ LIVE IOT AI ANALYSIS"}
                </h2>
              </div>
            </div>

            <div className="analysis-grid">
              <div className="metric leak">
                <div className="metric-top">
                  <h3>💧 Leak Probability</h3>

                  <span
                    className={`metric-status ${getRiskClass(
                      activeResult.leak_probability
                    )}`}
                  >
                    {getRiskLevel(activeResult.leak_probability)}
                  </span>
                </div>

                <strong>{activeResult.leak_probability}%</strong>
                <p>AI Prediction</p>

                <div className="graph">
                  <svg viewBox="0 0 300 45" preserveAspectRatio="none">
                    <polyline
                      className="leak-graph"
                      points="0,30 15,27 30,32 45,20 60,25 75,18 90,28 105,15 120,24 135,12 150,20 165,10 180,23 195,16 210,25 225,12 240,20 255,9 270,18 285,13 300,16"
                    />
                  </svg>
                </div>
              </div>

              <div className="metric burst">
                <div className="metric-top">
                  <h3>💥 Burst Probability</h3>

                  <span
                    className={`metric-status ${getRiskClass(
                      activeResult.burst_probability
                    )}`}
                  >
                    {getRiskLevel(activeResult.burst_probability)}
                  </span>
                </div>

                <strong>{activeResult.burst_probability}%</strong>
                <p>AI Prediction</p>

                <div className="graph">
                  <svg viewBox="0 0 300 45" preserveAspectRatio="none">
                    <polyline
                      className="burst-graph"
                      points="0,25 15,18 30,27 45,14 60,21 75,12 90,24 105,15 120,28 135,17 150,23 165,10 180,22 195,14 210,26 225,16 240,23 255,9 270,24 285,13 300,20"
                    />
                  </svg>
                </div>
              </div>

              <div className="metric anomaly">
                <div className="metric-top">
                  <h3>🧠 System Behaviour</h3>
                  <span className="metric-status anomaly-status">AI</span>
                </div>

                <strong>{activeResult.anomaly_status}</strong>
                <p>Pattern Analysis</p>

                <div className="graph">
                  <svg viewBox="0 0 300 45" preserveAspectRatio="none">
                    <polyline
                      className="anomaly-graph"
                      points="0,28 15,18 30,30 45,12 60,25 75,15 90,29 105,10 120,23 135,14 150,30 165,17 180,27 195,9 210,22 225,13 240,28 255,16 270,25 285,11 300,20"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* ================= RISK ALERT ================= */}

          {mode === "iot" && iotResult && (
            <section className={`card live-alert ${getLiveAlert().type}`}>
              <div className="live-alert-content">
                <div>
                  <h2>
                    <span className="live-alert-icon">
                      {getLiveAlert().type === "critical"
                        ? "🚨"
                        : getLiveAlert().type === "warning"
                        ? "⚠️"
                        : "🟢"}
                    </span>{" "}
                    {getLiveAlert().title}
                  </h2>

                  <p>{getLiveAlert().message}</p>
                </div>
              </div>
            </section>
          )}


          {/* ================= REAL-TIME ANOMALY EVENTS ================= */}

          {mode === "iot" && (
            <section className="card realtime-anomaly">

              <div className="section-title">
                <h2>④ REAL-TIME ANOMALY EVENTS</h2>
              </div>

              {iotAnomaly ? (
                <div
                  className={`realtime-anomaly-card ${
                    iotAnomaly.type === "pressure"
                      ? "pressure-anomaly"
                      : iotAnomaly.type === "flow"
                      ? "flow-anomaly"
                      : "general-anomaly"
                  }`}
                >
                  <div className="anomaly-card-icon">
                    ⚠️
                  </div>

                  <div className="anomaly-card-info">
                    <h3>{iotAnomaly.title}</h3>

                    <p>{iotAnomaly.message}</p>

                    <span>
                      Significant change detected between consecutive IoT readings.
                    </span>
                  </div>

                  <div className="anomaly-card-change">
                    {iotAnomaly.change}
                  </div>
                </div>
              ) : (
                <div className="realtime-anomaly-card normal-anomaly">
                  <div className="anomaly-card-icon">
                    ✓
                  </div>

                  <div className="anomaly-card-info">
                    <h3>System Stable</h3>

                    <p>No significant pressure or flow changes detected</p>

                    <span>
                      Live sensor readings are within the expected change range.
                    </span>
                  </div>
                </div>
              )}

            </section>
          )}


          {/* ================= EFFICIENCY SCORE ================= */}
          <section className="card sustainability">
            <div className="sustainability-info">
              <h2>
                {" "}
                {mode === "manual"
                  ? "③ MANUAL WATER SUSTAINABILITY"
                  : "⑤ LIVE IOT WATER SUSTAINABILITY"}
              </h2>

              <p>
                {mode === "manual"
                  ? "This efficiency score is based only on the values entered manually."
                  : "This efficiency score is based only on the latest IoT sensor reading."}
              </p>

              <div className="sustainability-tags">
                <span>Monitor</span>
                <span>Predict</span>
                <span>Optimize</span>
                <span>Protect</span>
              </div>
            </div>

            <div className="efficiency-score">
              <div
                className="score-circle"
                style={{
                  "--score": activeResult.efficiency_score,
                }}
              >
                <strong>{activeResult.efficiency_score}</strong>
                <span>/ 100</span>
              </div>

              <div className="score-details">
                <h3>Water Efficiency Score</h3>
                <p>{activeResult.efficiency_status}</p>

                <span className="score-description">
                  Based on the current{" "}
                  {mode === "manual" ? "manual" : "IoT"} analysis
                </span>
              </div>
            </div>
          </section>


          {/* ================= LIVE IOT SESSION ================= */}

      {mode === "iot" && iotSessionStats.readings > 0 && (
        <section className="card live-session">

          <div className="section-title">

            <div>
              <h2>⑥ LIVE IOT SESSION</h2>
            </div>
          </div>

          {/* Session statistics */}

          <div className="session-stat-grid">

            <div className="session-stat">
              <span>Warnings</span>
              <strong>{iotSessionStats.warnings}</strong>
            </div>

            <div className="session-stat">
              <span>Critical Events</span>
              <strong>{iotSessionStats.critical}</strong>
            </div>

            <div className="session-stat">
              <span>Anomalies</span>
              <strong>{iotSessionStats.anomalies}</strong>
            </div>

            <div className="session-stat">
              <span>Readings</span>
              <strong>{iotSessionStats.readings}</strong>
            </div>

           <div className="session-stat">
            <span>Average Efficiency</span>

            <div className="efficiency-value">
              <strong>
                {(
                  iotSessionStats.efficiencyTotal /
                  iotSessionStats.readings
                ).toFixed(1)}
              </strong>

              <small>/ 100</small>
            </div>
          </div>
          </div>

        </section>
      )}


          {/* ================= MANUAL GEMINI ONLY ================= */}
          {mode === "manual" && (
            <>
              <section className="card gemini-section">
                <h2>④ GEMINI AI INSIGHT</h2>

                <div className="gemini-insight-box">
                  <div className="gemini-icon">🧠</div>

                  <div className="gemini-content">
                    <p>
                      {manualInsight ||
                        "Run a manual analysis to generate an AI insight."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="card recommendation">
                <h2>⑤ GEMINI AI RECOMMENDATION</h2>

                <div className="recommendation-box">
                  <div className="recommendation-icon">🛡️</div>

                  <p>
                    {manualRecommendation ||
                      "Run a manual analysis to generate an AI recommendation."}
                  </p>
                </div>
              </section>
            </>
          )}
        </>
      )}

      {/* ================= SEPARATE HISTORY ================= */}
      <section className="card">
        <div className="section-title history-title">

          <div>
            <h2>
              {mode === "manual"
                ? "⑥ MANUAL ANALYSIS HISTORY"
                : "⑦ LIVE IOT ANALYSIS HISTORY"}
            </h2>
          </div>
        </div>

        {activeHistory.length === 0 ? (
          <p className="empty">
            No {mode === "manual" ? "manual" : "IoT"} analyses yet.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Pressure</th>
                  <th>Flow</th>
                  <th>Leak</th>
                  <th>Burst</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {activeHistory.map((item, index) => (
                  <tr key={index}>
                    <td>{item.pressure} bar</td>
                    <td>{item.flow} L/s</td>
                    <td>{item.leak}%</td>
                    <td>{item.burst}%</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer>
        💧 Every Drop Counts • Monitor • Predict • Protect • Sustain
      </footer>
    </div>
  );
}

export default App;