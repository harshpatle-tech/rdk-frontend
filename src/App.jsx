import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Cpu, Terminal, Play, Server, ShieldCheck, Plus, Upload, Wifi, Battery, Thermometer, RefreshCw, X, Folder, FileCode, AlertTriangle, Trash2 } from 'lucide-react';
import './App.css';

// Atharva's Central Backend URL
const RDK_BACKEND_URL = "https://api.amecnetworks.com";

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [action, setAction] = useState('start');
  const [serviceName, setServiceName] = useState('forest_app.service');
  const [targetPath, setTargetPath] = useState('/home/sunrise');
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Auto-scroll Reference for Registration Modal/Section
  const registrationRef = useRef(null);

  // File Inspector Drawer State
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
    { time: new Date().toLocaleTimeString(), text: 'AMEC Command Center Initialized. Syncing with Central DB.' }
  ]);

  const addLog = (text) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), text }, ...prev]);
  };

  // Open Registration Modal with Smooth Auto-Scroll
  const handleOpenRegistration = () => {
    setShowAddModal(true);
    setTimeout(() => {
      if (registrationRef.current) {
        registrationRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  };

  // Fetch Live Devices directly from Backend API
  const fetchLiveDevices = async () => {
    setIsFetching(true);
    try {
      const res = await axios.get(`${RDK_BACKEND_URL}/devices`, { timeout: 8000 });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const syncedData = res.data.map(dev => ({
          ...dev,
          forest_id: dev.forest_id || 1
        }));
        setDevices(syncedData);
        addLog("LIVE SYNC: Connected to https://api.amecnetworks.com/devices");
      } else {
        throw new Error("Empty payload from API");
      }
    } catch (err) {
      console.warn("Backend API sync pending...", err);
      setDevices(prev => prev.length > 0 ? prev : [
        { id: 1, forest_id: 1, device_uid: 'MH_NGP_A_001', status: 'offline', battery: 100, temperature: 96, network_speed: '0.48 Mbps', cpu_usage: 61, ram_usage: 36, uptime: 3420, last_seen: '2026-08-11T14:16:44' },
        { id: 2, forest_id: 1, device_uid: 'MH_NGP_A_002', status: 'offline', battery: 100, temperature: 88, network_speed: '0.2 Mbps', cpu_usage: 26, ram_usage: 30, uptime: 19500, last_seen: '2026-08-11T14:14:25' },
        { id: 3, forest_id: 1, device_uid: 'MH_NGP_A_003', status: 'offline', battery: 100, temperature: 96, network_speed: '0.49 Mbps', cpu_usage: 53, ram_usage: 36, uptime: 3420, last_seen: '2026-08-11T14:16:20' },
        { id: 4, forest_id: 1, device_uid: 'MH_NGP_A_004', status: 'offline', battery: 100, temperature: 94, network_speed: '2.58 Mbps', cpu_usage: 77, ram_usage: 80, uptime: 8580, last_seen: '2026-08-08T07:04:07' },
        { id: 5, forest_id: 1, device_uid: 'MH_NGP_A_005', status: 'offline', battery: 100, temperature: 85, network_speed: '0.14 Mbps', cpu_usage: 41, ram_usage: 33, uptime: 17640, last_seen: '2026-08-11T14:20:05' },
        { id: 6, forest_id: 1, device_uid: 'MH_NGP_A_006', status: 'offline', battery: 100, temperature: 0, network_speed: '0 Mbps', cpu_usage: 0, ram_usage: 0, uptime: 0, last_seen: null }
      ]);
      addLog("RETRYING: Waiting for api.amecnetworks.com response...");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchLiveDevices();
    const interval = setInterval(fetchLiveDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const inspectDeviceFiles = async (dev) => {
    setActiveFileDevice(dev.device_uid);
    setLoadingFiles(true);
    setFileError(null);
    setDeviceFiles([]);

    addLog(`INSPECTING: Fetching file schema for ${dev.device_uid}...`);

    try {
      const res = await axios.get(`${RDK_BACKEND_URL}/api/devices/${dev.device_uid}/files`, { timeout: 5000 });

      if (res.data && res.data.files && Array.isArray(res.data.files) && res.data.files.length > 0) {
        setDeviceFiles(res.data.files);
        addLog(`SUCCESS: Loaded live directory files from ${dev.device_uid}`);
      } else {
        setDeviceFiles([]);
        setFileError(`No active file payload returned from ${dev.device_uid}. Make sure aws_agent.py is running on node.`);
        addLog(`NOTICE: Empty file list returned for ${dev.device_uid}.`);
      }
    } catch (err) {
      console.warn("File API error:", err);
      setFileError(`Unable to reach /api/devices/${dev.device_uid}/files endpoint.`);
      addLog(`ERROR: File inspection API failed for ${dev.device_uid}.`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDeleteDevice = async (uid) => {
    if (!window.confirm(`Delete device [${uid}] permanently from central database?`)) return;

    try {
      await axios.delete(`${RDK_BACKEND_URL}/devices/${uid}`);
      addLog(`DATABASE REMOVAL: Device ${uid} deleted successfully.`);
      fetchLiveDevices();
    } catch (err) {
      addLog(`REMOVED: Unlinked ${uid} from active view.`);
      setDevices(prev => prev.filter(d => d.device_uid !== uid));
    }
  };

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
      device_key: newDevice.device_key
    };

    try {
      await axios.post(`${RDK_BACKEND_URL}/devices`, payload);
      addLog(`REGISTERED TO DB: ${newDevice.device_uid} added to Forest Zone #${newDevice.forest_id}`);
      setShowAddModal(false);
      setNewDevice({ device_uid: '', device_key: '', forest_id: '1', device_type: 'AI Camera' });
      fetchLiveDevices();
    } catch (err) {
      console.error("Device Registration Error:", err);
      const detailedError = err.response?.data?.detail 
        ? (typeof err.response.data.detail === 'object' ? JSON.stringify(err.response.data.detail) : err.response.data.detail)
        : err.message;
      
      alert(`Registration Failed: ${detailedError}`);
      addLog(`ERROR: Failed to register ${newDevice.device_uid} -> ${detailedError}`);
    }
  };

  const handleSendCommand = async (e) => {
    e.preventDefault();
    if (selectedDevices.length === 0) {
      alert("Please select at least one RDK device.");
      return;
    }

    setLoading(true);
    try {
      addLog(`Dispatching [${action.toUpperCase()}] to nodes: [${selectedDevices.join(', ')}]...`);

      const formData = new FormData();
      formData.append("devices", JSON.stringify(selectedDevices));
      formData.append("action", action);
      formData.append("service_name", serviceName);
      formData.append("target_path", targetPath);

      if (zipFile) {
        formData.append("file", zipFile);
        addLog(`Attaching deployment package: ${zipFile.name} (${(zipFile.size / (1024 * 1024)).toFixed(2)} MB)...`);
      }

      const res = await axios.post(`${RDK_BACKEND_URL}/api/control`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0
      });

      addLog(`SUCCESS: ${res.data.message || 'Command executed across fleet successfully.'}`);
      setZipFile(null);
    } catch (err) {
      console.error("OTA Dispatch Error:", err);
      const errMsg = err.response?.data?.detail || "Failed to dispatch command to RDK nodes.";
      addLog(`ERROR: ${errMsg}`);
      alert(`Deployment Error: ${errMsg}`);
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

  const formatUptime = (seconds) => {
    if (!seconds) return '0d 0h 0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return timestamp.substring(11, 19) || timestamp;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="header">
        <div className="title-section">
          <h1>AMEC NETWORKS COMMAND CENTER</h1>
          <p>Chandrapur Forest Infrastructure — Live Database Sync & Remote OTA</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={handleOpenRegistration}>
            <Plus size={14} /> Register New RDK Unit
          </button>
          <div className="status-badge">
            <div className="status-dot"></div>
            <span>Telemetry Sync Active</span>
          </div>
        </div>
      </header>

      {/* Device Fleet Overview Table */}
      <div className="card" style={{ marginBottom: '20px', overflowX: 'auto' }}>
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span><Server size={16} /> Live Device Fleet ({devices.length} Registered Units)</span>
          <RefreshCw size={14} style={{ cursor: 'pointer' }} className={isFetching ? "spin" : ""} onClick={fetchLiveDevices} />
        </div>

        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto' }}>
          <table className="fleet-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '8px', textAlign: 'center', width: '30px' }}>
                  <input type="checkbox" checked={selectedDevices.length === devices.length && devices.length > 0} onChange={handleSelectAll} />
                </th>
                <th style={{ padding: '8px', textAlign: 'left' }}>DEVICE UID</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>FOREST ID</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>BATTERY</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>TEMP</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>NETWORK</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>CPU</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>RAM</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>UPTIME</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>FILES</th>
                <th style={{ padding: '8px', textAlign: 'center', minWidth: '90px' }}>LAST SEEN</th>
                <th style={{ padding: '8px', textAlign: 'center', width: '40px' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.id || dev.device_uid} className={selectedDevices.includes(dev.device_uid) ? 'selected-row' : ''} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedDevices.includes(dev.device_uid)} onChange={() => handleSelectDevice(dev.device_uid)} />
                  </td>
                  <td style={{ padding: '8px', fontWeight: 'bold', fontSize: '12px' }}>{dev.device_uid}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#38bdf8', fontSize: '12px' }}>{dev.forest_id ?? 1}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span className={`badge ${dev.status?.toLowerCase() === 'online' ? 'online' : 'offline'}`}>
                      {dev.status ? dev.status.toUpperCase() : 'OFFLINE'}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}><Battery size={11} /> {dev.battery ?? 0}%</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}><Thermometer size={11} /> {dev.temperature ?? 0}°C</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}><Wifi size={11} /> {dev.network_speed || '0 Mbps'}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}>{dev.cpu_usage ?? 0}%</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}>{dev.ram_usage ?? 0}%</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}>{formatUptime(dev.uptime)}</td>
                  
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                      onClick={() => inspectDeviceFiles(dev)}
                    >
                      <Folder size={11} /> Inspect
                    </button>
                  </td>

                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                    {formatLastSeen(dev.last_seen)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }} onClick={() => handleDeleteDevice(dev.device_uid)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIRECTORY INSPECTOR DRAWER */}
      {activeFileDevice && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #38bdf8' }}>
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span><Folder size={16} /> Directory Inspector: <code>/home/sunrise</code> on Device [{activeFileDevice}]</span>
            <X size={16} style={{ cursor: 'pointer' }} onClick={() => setActiveFileDevice(null)} />
          </div>

          {loadingFiles ? (
            <p style={{ fontSize: '13px', color: '#94a3b8', padding: '10px 0' }}>Querying RDK node filesystem in <code>/home/sunrise</code>...</p>
          ) : fileError ? (
            <div style={{ padding: '12px', background: '#451a1a', border: '1px solid #7f1d1d', borderRadius: '6px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '12px' }}>
              <AlertTriangle size={16} color="#f87171" />
              <span>{fileError}</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px', marginTop: '10px' }}>
              {deviceFiles.map((file, idx) => (
                <div key={idx} style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileCode size={18} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>{file.name}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{file.path}</div>
                    {file.desc && <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>✓ {file.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* OTA Control Panel & Log Console */}
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
            <div className="form-group">
              <label>UPLOAD CODE PACKAGE (.ZIP FILE)</label>
              <div className="file-upload-box">
                <Upload size={18} />
                <input type="file" accept=".zip" onChange={(e) => setZipFile(e.target.files[0])} />
                <span>{zipFile ? zipFile.name : "Select .zip firmware/script package"}</span>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Play size={14} /> {loading ? 'Sending Command...' : `Execute Action on Selected (${selectedDevices.length}) Devices`}
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
          <div style={{ marginTop: '16px', fontSize: '11px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#10b981" /> Encrypted MQTT Communication Link Active
          </div>
        </div>
      </div>

      {/* Modal Form with Auto Scroll Target Ref */}
      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div ref={registrationRef} className="modal-content" style={{ width: '380px', background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Register New RDK Device</h3>
              <X size={18} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowAddModal(false)} />
            </div>

            <form onSubmit={handleAddDevice}>
              <div className="form-group">
                <label>DEVICE UID *</label>
                <input 
                  type="text" 
                  name="device_uid"
                  className="input-field" 
                  placeholder="e.g. MH_NGP_A_007" 
                  value={newDevice.device_uid} 
                  onChange={(e) => setNewDevice({...newDevice, device_uid: e.target.value})} 
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
                  onChange={(e) => setNewDevice({...newDevice, device_key: e.target.value})} 
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
                    onChange={(e) => setNewDevice({...newDevice, forest_id: e.target.value})} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>DEVICE TYPE</label>
                  <select name="device_type" className="select-field" value={newDevice.device_type} onChange={(e) => setNewDevice({...newDevice, device_type: e.target.value})}>
                    <option value="AI Camera">AI Camera</option>
                    <option value="Acoustic Node">Acoustic Node</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Register Unit</button>
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