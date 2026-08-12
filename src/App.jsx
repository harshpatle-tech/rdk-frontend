import React, { useState } from 'react';
import axios from 'axios';
import { Cpu, Terminal, Play, Server, ShieldCheck } from 'lucide-react';
import './App.css';

// Aapka Render Backend API URL
const BACKEND_URL = "https://rdk-backend-mm3v.onrender.com";

function App() {
  const [deviceUid, setDeviceUid] = useState('AMEC-RDK-CHANDRAPUR-01');
  const [action, setAction] = useState('start');
  const [serviceName, setServiceName] = useState('tree_monitor_service');
  const [codeContent, setCodeContent] = useState('# Python Service Script\nimport time\nprint("RDK Monitoring active...")');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), text: 'Dashboard initialized. Ready for execution.' }
  ]);

  const addLog = (text) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), text }, ...prev]);
  };

  const handleSendCommand = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      addLog(`Sending '${action}' command for service: ${serviceName}...`);
      
      const response = await axios.post(`${BACKEND_URL}/api/control`, {
        device_uid: deviceUid,
        action: action,
        service_name: serviceName,
        code_content: codeContent
      });

      if (response.data.success) {
        addLog(`SUCCESS: ${response.data.message}`);
      } else {
        addLog(`ERROR: ${response.data.error}`);
      }
    } catch (err) {
      addLog(`NETWORK ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Professional Header */}
      <header className="header">
        <div className="title-section">
          <h1>AMEC RDK Remote Control Dashboard</h1>
          <p>Chandrapur Forest Infrastructure — OTA Deployment Platform</p>
        </div>
        <div className="status-badge">
          <div className="status-dot"></div>
          <span>Cloud API Operational</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid">
        {/* Left Control Panel */}
        <div className="card">
          <div className="card-title">
            <Cpu size={16} /> Device & Service Command Panel
          </div>

          <form onSubmit={handleSendCommand}>
            <div className="form-group">
              <label>TARGET DEVICE ID (UID)</label>
              <input 
                type="text" 
                className="input-field" 
                value={deviceUid} 
                onChange={(e) => setDeviceUid(e.target.value)} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>ACTION COMMAND</label>
                <select 
                  className="select-field" 
                  value={action} 
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="start">START SERVICE</option>
                  <option value="stop">STOP SERVICE</option>
                  <option value="update">UPDATE CODE</option>
                  <option value="delete">DELETE SERVICE</option>
                </select>
              </div>

              <div className="form-group">
                <label>SERVICE NAME</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={serviceName} 
                  onChange={(e) => setServiceName(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {(action === 'update' || action === 'start') && (
              <div className="form-group">
                <label>SCRIPT / CONFIGURATION PAYLOAD</label>
                <textarea 
                  className="textarea-field" 
                  value={codeContent} 
                  onChange={(e) => setCodeContent(e.target.value)} 
                />
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              <Play size={14} /> {loading ? 'Dispatching Command...' : 'Execute Remote Command'}
            </button>
          </form>
        </div>

        {/* Right Status & Logs Panel */}
        <div className="card">
          <div className="card-title">
            <Terminal size={16} /> Command Execution Console
          </div>
          
          <div className="log-box">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">
                <span className="log-time">[{log.time}]</span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', fontSize: '11px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#10b981" /> Encrypted MQTT Payload via AWS IoT Core
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;