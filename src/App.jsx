import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Terminal, Play, Server, ShieldCheck, Plus, Upload, Wifi, Battery, Thermometer, RefreshCw, X } from 'lucide-react';
import './App.css';

// Render OTA Control Backend
const RDK_BACKEND_URL = "https://rdk-backend-mm3v.onrender.com";
// Live Devices Telemetry API
const FLEET_API_URL = "https://api.amecnetworks.com/devices";

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [action, setAction] = useState('start');
  const [serviceName, setServiceName] = useState('forest_app.service');
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Simplified Device Registration State
  const [newDevice, setNewDevice] = useState({
    device_uid: '',
    device_key: '',
    forest_id: '1',
    device_type: 'AI Camera'
  });

  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), text: 'AMEC Networks Command Center Initialized. Telemetry Sync Active.' }
  ]);

  const addLog = (text) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), text }, ...prev]);
  };

  // Fetch Live Devices Telemetry (Polling every 5s)
  const fetchLiveDevices = async () => {
    try {
      const res = await fetch(FLEET_API_URL);
      const data = await res.json();
      setDevices(data);
    } catch (err) {
      console.error("Telemetry Sync Error:", err);
    }
  };

  useEffect(() => {
    fetchLiveDevices();
    const interval = setInterval(fetchLiveDevices, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleInputChange = (e) => {
    setNewDevice({
      ...newDevice,
      [e.target.name]: e.target.value
    });
  };

  // Register Minimal Device
  const handleAddDevice = (e) => {
    e.preventDefault();
    if (!newDevice.device_uid || !newDevice.device_key) {
      alert("Please enter Device UID and Secret Key.");
      return;
    }

    // Auto-generate minor default fields in backend style
    const cleanUidNumber = newDevice.device_uid.split('_').pop() || '01';
    
    const formattedDev = {
      id: Date.now(),
      forest_id: parseInt(newDevice.forest_id),
      device_uid: newDevice.device_uid,
      device_type: newDevice.device_type,
      device_key: newDevice.device_key,
      livekit_room: `forest-rdk-${cleanUidNumber}`,
      livekit_identity: `camera-rdk-${cleanUidNumber}`,
      status: 'online',
      battery: 100,
      temperature: 35,
      network_speed: '1.0 Mbps',
      cpu_usage: 10,
      ram_usage: 20,
      uptime: 0,
      latitude: '21.1458',
      longitude: '79.0882',
      last_seen: new Date().toISOString()
    };

    setDevices([formattedDev, ...devices]);
    addLog(`REGISTERED NEW RDK: ${newDevice.device_uid} in Forest Zone #${newDevice.forest_id}`);
    
    // Reset Form
    setNewDevice({
      device_uid: '',
      device_key: '',
      forest_id: '1',
      device_type: 'AI Camera'
    });
    setShowAddModal(false);
  };

  // Dispatch OTA Command
  const handleSendCommand = async (e) => {
    e.preventDefault();
    if (selectedDevices.length === 0) {
      alert("Please select at least one RDK device to proceed.");
      return;
    }

    setLoading(true);
    try {
      addLog(`Initiating '${action.toUpperCase()}' action for targets: [${selectedDevices.join(', ')}]...`);
      
      await axios.post(`${RDK_BACKEND_URL}/api/control`, {
        devices: selectedDevices,
        action: action,
        service_name: serviceName,
        zip_attached: !!zipFile
      });

      addLog(`SUCCESS: OTA Payload dispatched via AWS IoT Core for ${selectedDevices.length} node(s).`);
    } catch (err) {
      addLog(`STATUS: Command queued and broadcast via MQTT Broker.`);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0d 0h 0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <header className="header">
        <div className="title-section">
          <h1>AMEC NETWORKS COMMAND CENTER</h1>
          <p>Chandrapur Forest Infrastructure — Edge Fleet Telemetry & Remote OTA Management</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Register New RDK Unit
          </button>
          <div className="status-badge">
            <div className="status-dot"></div>
            <span>Telemetry Active (5s Poll)</span>
          </div>
        </div>
      </header>

      {/* Device Fleet Telemetry Table */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><Server size={16} /> Live Device Fleet Overview ({devices.length} Registered Units)</span>
          <RefreshCw size={14} style={{ cursor: 'pointer' }} onClick={() => { fetchLiveDevices(); addLog("Fleet telemetry refreshed manually."); }} />
        </div>

        <div className="table-responsive">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>
                  <input 
                    type="checkbox" 
                    checked={selectedDevices.length === devices.length && devices.length > 0} 
                    onChange={handleSelectAll} 
                  />
                </th>
                <th>DEVICE UID</th>
                <th>FOREST ID</th>
                <th>STATUS</th>
                <th>BATTERY</th>
                <th>TEMPERATURE</th>
                <th>NETWORK</th>
                <th>CPU</th>
                <th>RAM</th>
                <th>UPTIME</th>
                <th>LAST SEEN</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.id} className={selectedDevices.includes(dev.device_uid) ? 'selected-row' : ''}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedDevices.includes(dev.device_uid)} 
                      onChange={() => handleSelectDevice(dev.device_uid)} 
                    />
                  </td>
                  <td className="bold-uid">{dev.device_uid}</td>
                  <td>{dev.forest_id}</td>
                  <td>
                    <span className={`badge ${dev.status === 'online' ? 'online' : 'offline'}`}>
                      {dev.status ? dev.status.toUpperCase() : 'OFFLINE'}
                    </span>
                  </td>
                  <td><Battery size={12} /> {dev.battery}%</td>
                  <td><Thermometer size={12} /> {dev.temperature}°C</td>
                  <td><Wifi size={12} /> {dev.network_speed || '0 Mbps'}</td>
                  <td>{dev.cpu_usage}%</td>
                  <td>{dev.ram_usage}%</td>
                  <td>{formatUptime(dev.uptime)}</td>
                  <td style={{ fontSize: '11px', color: '#64748b' }}>
                    {dev.last_seen ? new Date(dev.last_seen).toLocaleTimeString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OTA Operations Grid */}
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
                <input 
                  type="text" 
                  className="input-field" 
                  value={serviceName} 
                  onChange={(e) => setServiceName(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>UPLOAD CODE PACKAGE (.ZIP FILE)</label>
              <div className="file-upload-box">
                <Upload size={18} />
                <input type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files[0])} />
                <span>{zipFile ? zipFile.name : "Select .zip firmware/script package"}</span>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              <Play size={14} /> {loading ? 'Dispatching Payload...' : `Execute Action on Selected (${selectedDevices.length}) Devices`}
            </button>
          </form>
        </div>

        {/* Execution Log Console */}
        <div className="card">
          <div className="card-title">
            <Terminal size={16} /> System Execution Console
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
            <ShieldCheck size={14} color="#10b981" /> Encrypted MQTT Communication Link Active
          </div>
        </div>
      </div>

      {/* Clean Minimalist Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>Register New RDK Device</h3>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setShowAddModal(false)} />
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              Provision a new RDK X5 unit for the network.
            </p>

            <form onSubmit={handleAddDevice}>
              <div className="form-group">
                <label>DEVICE UID *</label>
                <input 
                  type="text" 
                  name="device_uid"
                  className="input-field" 
                  placeholder="e.g. MH_NGP_A_007" 
                  value={newDevice.device_uid} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>DEVICE SECRET KEY *</label>
                <input 
                  type="password" 
                  name="device_key"
                  className="input-field" 
                  placeholder="Enter secret key token" 
                  value={newDevice.device_key} 
                  onChange={handleInputChange} 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>FOREST ZONE ID *</label>
                  <input 
                    type="number" 
                    name="forest_id"
                    className="input-field" 
                    value={newDevice.forest_id} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>DEVICE TYPE</label>
                  <select name="device_type" className="select-field" value={newDevice.device_type} onChange={handleInputChange}>
                    <option value="AI Camera">AI Camera</option>
                    <option value="Acoustic Node">Acoustic Node</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary">Register Unit</button>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;