import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Terminal, Play, Server, ShieldCheck, Plus, Upload, Wifi, Battery, Thermometer, RefreshCw, X, Folder, FileCode, AlertTriangle, Trash2 } from 'lucide-react';
import './App.css';

// Atharva's Live Backend URL
const RDK_BACKEND_URL = "https://rdk-backend-mm3v.onrender.com";

function App() {
  const [devices, setDevices] = useState([]); // Empty by default, fetched strictly from DB
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [action, setAction] = useState('start');
  const [serviceName, setServiceName] = useState('forest_app.service');
  const [targetPath, setTargetPath] = useState('/home/sunrise');
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // File Inspector State
  const [activeFileDevice, setActiveFileDevice] = useState(null);
  const [deviceFiles, setDeviceFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Registration State
  const [newDevice, setNewDevice] = useState({
    device_uid: '',
    device_key: '',
    forest_id: '1',
    device_type: 'AI Camera'
  });

  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), text: 'Connected to Live Central RDK Database.' }
  ]);

  const addLog = (text) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), text }, ...prev]);
  };

  // 1. Fetch Real Devices directly from Atharva's Backend Database
  const fetchLiveDevices = async () => {
    setIsFetching(true);
    try {
      const res = await axios.get(`${RDK_BACKEND_URL}/devices`);
      if (res.data && Array.isArray(res.data)) {
        setDevices(res.data);
      }
    } catch (err) {
      console.error("Database connection error:", err);
      addLog("ERROR: Unable to sync with live /devices API.");
    } finally {
      setIsFetching(false);
    }
  };

  // Auto Polling Every 5 Seconds (Real-time DB Sync)
  useEffect(() => {
    fetchLiveDevices();
    const interval = setInterval(fetchLiveDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Delete Device directly in Backend DB
  const handleDeleteDevice = async (uid) => {
    if (!window.confirm(`Permanently remove device [${uid}] from central database?`)) return;

    try {
      await axios.delete(`${RDK_BACKEND_URL}/devices/${uid}`);
      addLog(`DATABASE REMOVAL: Device ${uid} deleted successfully.`);
      fetchLiveDevices(); // Re-fetch updated list from DB
    } catch (err) {
      addLog(`FAILED: Could not delete ${uid} from database.`);
    }
  };

  // 3. Register New Device into Central DB
  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDevice.device_uid || !newDevice.device_key) {
      alert("Please enter Device UID and Secret Key.");
      return;
    }

    const payload = {
      forest_id: parseInt(newDevice.forest_id) || 1,
      device_uid: newDevice.device_uid,
      device_type: newDevice.device_type,
      device_key: newDevice.device_key,
      status: 'offline',
      battery: 100,
      temperature: 0,
      network_speed: '0 Mbps',
      cpu_usage: 0,
      ram_usage: 0,
      uptime: 0,
      last_seen: new Date().toISOString()
    };

    try {
      await axios.post(`${RDK_BACKEND_URL}/devices`, payload);
      addLog(`REGISTERED TO DB: ${newDevice.device_uid} added to Forest Zone #${newDevice.forest_id}`);
      setShowAddModal(false);
      fetchLiveDevices(); // Refresh list immediately from backend
    } catch (err) {
      alert("Failed to register device to backend database.");
      addLog(`ERROR: Backend rejected device registration.`);
    }
  };

  // 4. Send Control Command to RDK Node
  const handleSendCommand = async (e) => {
    e.preventDefault();
    if (selectedDevices.length === 0) {
      alert("Please select at least one RDK device to proceed.");
      return;
    }

    setLoading(true);
    try {
      addLog(`Dispatching command [${action}] for [${selectedDevices.join(', ')}]...`);
      await axios.post(`${RDK_BACKEND_URL}/api/control`, {
        devices: selectedDevices,
        action: action,
        service_name: serviceName,
        target_path: targetPath,
        zip_attached: !!zipFile
      });
      addLog(`SUCCESS: Backend executed command '${action}' on targeted nodes.`);
    } catch (err) {
      addLog(`ERROR: Control API request failed.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDevice = (uid) => {
    setSelectedDevices(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map(d => d.device_uid));
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="header">
        <div className="title-section">
          <h1>AMEC NETWORKS COMMAND CENTER</h1>
          <p>Chandrapur Forest Infrastructure — Direct Backend Database Sync</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Register New RDK Unit
          </button>
          <div className="status-badge">
            <div className="status-dot"></div>
            <span>Live DB Connected</span>
          </div>
        </div>
      </header>

      {/* Device Fleet Table */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><Server size={16} /> Live Device Fleet ({devices.length} Registered in Database)</span>
          <RefreshCw size={14} style={{ cursor: 'pointer' }} className={isFetching ? "spin" : ""} onClick={fetchLiveDevices} />
        </div>

        <div className="table-responsive">
          <table className="fleet-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left' }}>
                  <input type="checkbox" checked={selectedDevices.length === devices.length && devices.length > 0} onChange={handleSelectAll} />
                </th>
                <th style={{ padding: '10px', textAlign: 'left' }}>DEVICE UID</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>FOREST ID</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>BATTERY</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>TEMPERATURE</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>NETWORK</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>CPU</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>RAM</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>LAST SEEN</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    {isFetching ? "Fetching real-time data from database..." : "No devices found in backend database."}
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.id || dev.device_uid} className={selectedDevices.includes(dev.device_uid) ? 'selected-row' : ''}>
                    <td style={{ padding: '10px' }}>
                      <input type="checkbox" checked={selectedDevices.includes(dev.device_uid)} onChange={() => handleSelectDevice(dev.device_uid)} />
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{dev.device_uid}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#38bdf8' }}>{dev.forest_id ?? 1}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span className={`badge ${dev.status?.toLowerCase() === 'online' ? 'online' : 'offline'}`}>
                        {dev.status ? dev.status.toUpperCase() : 'OFFLINE'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}><Battery size={12} /> {dev.battery ?? 0}%</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}><Thermometer size={12} /> {dev.temperature ?? 0}°C</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}><Wifi size={12} /> {dev.network_speed || '0 Mbps'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{dev.cpu_usage ?? 0}%</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{dev.ram_usage ?? 0}%</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                      {dev.last_seen ? dev.last_seen : 'N/A'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }} onClick={() => handleDeleteDevice(dev.device_uid)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Control Panel & Log Console */}
      <div className="grid">
        <div className="card">
          <div className="card-title">
            <Cpu size={16} /> OTA Fleet Control Panel ({selectedDevices.length} Selected)
          </div>
          <form onSubmit={handleSendCommand}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>ACTION COMMAND</label>
                <select className="select-field" value={action} onChange={(e) => setAction(e.target.value)}>
                  <option value="start">START SERVICE</option>
                  <option value="stop">STOP SERVICE</option>
                  <option value="update">DEPLOY / UPDATE CODE (.ZIP)</option>
                  <option value="restart">RESTART SYSTEM</option>
                </select>
              </div>
              <div className="form-group">
                <label>SERVICE NAME</label>
                <input type="text" className="input-field" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label>TARGET DEPLOYMENT DIRECTORY</label>
              <input type="text" className="input-field" value={targetPath} onChange={(e) => setTargetPath(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Play size={14} /> {loading ? 'Sending Command...' : `Execute on Selected (${selectedDevices.length}) Nodes`}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">
            <Terminal size={16} /> Live Database Console
          </div>
          <div className="log-box">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">
                <span className="log-time">[{log.time}]</span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;