import React, { useState, useRef } from 'react';
import { User, Settings, Database, ArrowRight, AtSign, UploadCloud } from 'lucide-react';
// Custom Logo Icon (Option 3: Interlocked Cs with blue double-ring central link, styled with contrast container)
const LogoIcon = ({ size = 28, style }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size * 1.4}px`,
    height: `${size * 1.4}px`,
    borderRadius: '26%', // Apple squircle radius
    background: 'var(--text-primary)', // black in light mode, white in dark mode
    color: 'var(--bg-app)', // white/light-gray in light mode, black in dark mode
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: `${size * 0.16}px`,
    boxSizing: 'border-box',
    flexShrink: 0
  }}>
    <svg 
      viewBox="0 0 220 120" 
      width="100%" 
      height="100%" 
      style={{ overflow: 'visible', ...style }}
    >
      {/* Left C */}
      <path 
        d="M 98 32 A 40 40 0 1 0 98 88" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="20" 
        strokeLinecap="round" 
      />
      {/* Right flipped C */}
      <path 
        d="M 122 32 A 40 40 0 1 1 122 88" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="20" 
        strokeLinecap="round" 
      />
      {/* Overlapping blue rings (oo) */}
      <circle 
        cx="96" 
        cy="60" 
        r="15" 
        fill="none" 
        stroke="#0071e3" 
        strokeWidth="9" 
      />
      <circle 
        cx="124" 
        cy="60" 
        r="15" 
        fill="none" 
        stroke="#0071e3" 
        strokeWidth="9" 
      />
    </svg>
  </div>
);

export default function AuthModal({ onLogin, savedConfig, onSaveConfig }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null); // Base64 compressed string
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  
  const [showFirebaseConfig, setShowFirebaseConfig] = useState(false);
  
  // Firebase inputs
  const [apiKey, setApiKey] = useState(savedConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(savedConfig?.authDomain || '');
  const [projectId, setProjectId] = useState(savedConfig?.projectId || '');
  const [storageBucket, setStorageBucket] = useState(savedConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(savedConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(savedConfig?.appId || '');

  // Compressor utility
  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file (png, jpg, jpeg, webp).');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // JPEG compression
        setSelectedAvatar(dataUrl);
      };
    };
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) return;
    
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const finalAvatar = selectedAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName.trim())}`;
    
    onLogin({
      id: 'user_' + Math.random().toString(36).substring(2, 11),
      fullName: fullName.trim(),
      username: cleanUsername,
      avatar: finalAvatar,
      friends: []
    });
  };

  const handleSaveFirebase = (e) => {
    e.preventDefault();
    if (!apiKey || !projectId || !appId) {
      alert('Please fill out at least API Key, Project ID, and App ID.');
      return;
    }
    onSaveConfig({
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId
    });
    setShowFirebaseConfig(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {!showFirebaseConfig ? (
          <>
            <h2 className="modal-title" style={{ fontSize: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ marginBottom: '12px' }}>
                <LogoIcon size={54} />
              </div>
              <span style={{ fontSize: '3rem', color: 'var(--text-primary)', fontWeight: '800' }}>CoCo</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Collab n' Cooperate</span>
            </h2>
            <p className="modal-desc" style={{ marginTop: '12px' }}>
              Create your identity. Your Full Name is visible to everyone; username is only seen by friends.
            </p>

            <form onSubmit={handleSubmit}>
              
              {/* Drag and Drop Profile Photo Upload Zone */}
              <div className="form-group">
                <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>Profile Photo</label>
                <div 
                  className={`pfp-dropzone ${isDragOver ? 'dragover' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedAvatar ? (
                    <img src={selectedAvatar} alt="Profile preview" className="pfp-dropzone-preview" />
                  ) : (
                    <>
                      <UploadCloud size={24} className="pfp-dropzone-icon" />
                      <div className="pfp-dropzone-text">Drag photo here or click to browse</div>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  style={{ display: 'none' }}
                />

              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Full Name</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    id="fullName"
                    className="form-input"
                    placeholder="e.g. Srikanth G"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={30}
                    required
                    style={{ paddingLeft: '40px' }}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="username">Username (friends only)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <AtSign size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    id="username"
                    className="form-input"
                    placeholder="e.g. srikanth_g"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={15}
                    required
                    style={{ paddingLeft: '40px' }}
                    autoComplete="off"
                  />
                </div>
              </div>

              <button type="submit" className="primary-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Join Chat Stream <ArrowRight size={18} />
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                type="button"
                className="text-btn"
                onClick={() => setShowFirebaseConfig(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Database size={14} /> Configure Custom Firebase
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <Database size={24} className="icon-glow" style={{ color: 'var(--accent-primary)' }} /> Firebase Setup
            </h2>
            <p className="modal-desc">
              Connect to your Firestore instance. Leave blank to switch back to Local Mock Mode.
            </p>

            <form onSubmit={handleSaveFirebase}>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="aurachat-app"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">Auth Domain</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="domain.firebaseapp.com"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">App ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="1:12345:web:abcd"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">Storage Bucket</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="app.appspot.com"
                    value={storageBucket}
                    onChange={(e) => setStorageBucket(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Messaging Sender ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="123456789"
                    value={messagingSenderId}
                    onChange={(e) => setMessagingSenderId(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    onSaveConfig(null);
                    setShowFirebaseConfig(false);
                  }}
                >
                  Clear & Use Mock Mode
                </button>
                <button type="submit" className="primary-btn">
                  Save & Apply
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
