import React, { useState, useRef } from 'react';
import { 
  Hash, 
  MessageSquare, 
  Plus, 
  Sun, 
  Moon, 
  Sparkles,
  Wifi,
  WifiOff,
  User,
  Settings,
  Server,
  Users,
  Briefcase,
  UploadCloud
} from 'lucide-react';

// Custom Logo Icon (Option 3: Interlocked Cs with blue double-ring central link)
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



export default function Sidebar({ 
  rooms, 
  activeRoom, 
  onSelectRoom, 
  presence, 
  currentUser, 
  isDarkMode, 
  toggleTheme, 
  onLogout,
  isFirebaseActive,
  onCreateRoom,
  onUpdateProfile,
  isCollapsed,
  onToggleCollapse,
  typingUsers,
  onToggleFriend
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState('server'); // 'server' | 'group' | 'collab'
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  
  // Profile settings state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editFullName, setEditFullName] = useState(currentUser.fullName);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [isDragOver, setIsDragOver] = useState(false);

  // Add friend state
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [friendError, setFriendError] = useState('');
  const [friendSuccess, setFriendSuccess] = useState('');
  
  const fileInputRef = useRef(null);

  // Group rooms by category
  const servers = rooms.filter(r => r.type === 'server');
  const groups = rooms.filter(r => r.type === 'group');
  const collabs = rooms.filter(r => r.type === 'collab');

  // Filter presence users: show online users OR those in friend list (even if offline)
  const activeUsers = Object.values(presence).filter(u => {
    const isMe = u.id === currentUser.id;
    const isFriendUser = currentUser.friends?.includes(u.id);
    const isOnline = u.status !== 'offline';
    return !isMe && (isOnline || isFriendUser);
  });

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setFriendError('');
    setFriendSuccess('');

    const targetUsername = friendUsername.trim().replace(/^@/, '');
    if (!targetUsername) {
      setFriendError('Please enter a username.');
      return;
    }

    if (targetUsername.toLowerCase() === currentUser.username?.toLowerCase()) {
      setFriendError("You cannot add yourself as a friend!");
      return;
    }

    // Search presence for user with this username (case-insensitive)
    const foundUser = Object.values(presence).find(
      u => u.username?.toLowerCase() === targetUsername.toLowerCase()
    );

    if (!foundUser) {
      setFriendError(`User @${targetUsername} not found. Make sure they have logged in at least once!`);
      return;
    }

    if (currentUser.friends?.includes(foundUser.id)) {
      setFriendError(`@${targetUsername} is already your friend!`);
      return;
    }

    try {
      if (onToggleFriend) {
        await onToggleFriend(foundUser.id);
      }
      setFriendSuccess(`Successfully added @${targetUsername} as a friend!`);
      setFriendUsername('');
      setTimeout(() => {
        setShowAddFriendModal(false);
        setFriendSuccess('');
      }, 1500);
    } catch (err) {
      setFriendError('Failed to add friend. Try again.');
      console.error(err);
    }
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onCreateRoom(newRoomName.trim(), addType, newRoomDesc.trim());
    setNewRoomName('');
    setNewRoomDesc('');
    setShowAddModal(false);
  };

  const openAddModal = (type) => {
    setAddType(type);
    setNewRoomDesc('');
    setShowAddModal(true);
  };

  const handleSelectRoomWrapper = (room) => {
    if (isCollapsed) {
      onToggleCollapse(false);
    } else {
      onSelectRoom(room);
    }
  };

  const handleStartDM = (otherUser) => {
    if (isCollapsed) {
      onToggleCollapse(false);
      return;
    }

    const sortedIds = [currentUser.id, otherUser.id].sort();
    const dmRoomId = `dm-${sortedIds[0]}-${sortedIds[1]}`;
    
    const existingDm = rooms.find(r => r.id === dmRoomId);
    if (existingDm) {
      onSelectRoom(existingDm);
    } else {
      const dmRoom = {
        id: dmRoomId,
        name: otherUser.fullName,
        type: 'dm',
        recipientId: otherUser.id,
        username: otherUser.username,
        avatar: otherUser.avatar,
        status: otherUser.status
      };
      onSelectRoom(dmRoom);
    }
  };

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image file.');
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setEditAvatar(dataUrl);
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

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editFullName.trim()) return;
    
    const finalAvatar = editAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(editFullName.trim())}`;

    onUpdateProfile({
      fullName: editFullName.trim(),
      avatar: finalAvatar
    });
    setShowProfileModal(false);
  };

  const isFriend = (userId) => {
    const myFriends = currentUser.friends || [];
    return myFriends.includes(userId);
  };

  // RENDER COLLAPSED (Slim/Minimalist Mode) - Displays strictly logo symbol, 4 circles, and footer avatar
  if (isCollapsed) {
    return (
      <aside className="sidebar collapsed">
        <div className="sidebar-header" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div onClick={() => onToggleCollapse(false)} style={{ cursor: 'pointer', color: 'var(--text-primary)' }} title="Open CoCo">
            <LogoIcon size={38} />
          </div>
        </div>
        
        {/* Category Circle List (Clicking opens/expands the sidebar) */}
        <div className="sidebar-list" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', paddingTop: '20px' }}>
          <div className="category-logo-circle dm" onClick={() => onToggleCollapse(false)} title="Open DM's" style={{ cursor: 'pointer' }}>
            <MessageSquare size={18} strokeWidth={2.5} />
          </div>
          
          <div className="category-logo-circle group" onClick={() => onToggleCollapse(false)} title="Open Groups" style={{ cursor: 'pointer' }}>
            <Users size={18} strokeWidth={2.5} />
          </div>
          
          <div className="category-logo-circle collab" onClick={() => onToggleCollapse(false)} title="Open Collabs" style={{ cursor: 'pointer' }}>
            <Briefcase size={18} strokeWidth={2.5} />
          </div>
          
          <div className="category-logo-circle server" onClick={() => onToggleCollapse(false)} title="Open Servers" style={{ cursor: 'pointer' }}>
            <Server size={18} strokeWidth={2.5} />
          </div>
        </div>

        {/* Footer Profile Circle (Clicking opens/expands the sidebar) */}
        <div 
          className="sidebar-footer" 
          onClick={() => onToggleCollapse(false)}
          style={{ padding: '20px 0', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
          title="Open Profile Settings"
        >
          <div className="avatar-wrapper" style={{ width: '42px', height: '42px' }}>
            <img src={currentUser.avatar} alt={currentUser.fullName} className="avatar" />
            <span className="status-dot online"></span>
          </div>
        </div>
      </aside>
    );
  }

  // RENDER EXPANDED (Full Sidebar Mode)
  return (
    <aside className="sidebar expanded">
      {/* Sidebar Header */}
      <div className="sidebar-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="logo" style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LogoIcon size={32} />
            <span>CoCo</span>
          </h1>
          <button 
            className="icon-btn" 
            onClick={toggleTheme} 
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div style={{ 
          fontSize: '0.72rem', 
          color: 'var(--text-muted)', 
          fontWeight: '600', 
          textTransform: 'uppercase', 
          letterSpacing: '0.12em',
          marginTop: '-4px'
        }}>
          Collab n' Cooperate
        </div>
      </div>

      {/* Network indicator */}
      <div className="network-indicator-container" style={{
        padding: '6px 20px',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: isFirebaseActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.01)'
      }}>
        {isFirebaseActive ? (
          <><Wifi size={12} /> Live Database (Firebase)</>
        ) : (
          <><WifiOff size={12} /> Local Mock Database</>
        )}
      </div>

      {/* Sidebar Lists - ORDER: DM's -> Groups -> Collabs -> Servers */}
      <div className="sidebar-list">
        
        {/* 1. DM'S SECTION */}
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} /> DM's
          </span>
          <button className="add-room-btn" onClick={() => setShowAddFriendModal(true)} title="Add Friend by Username">
            <Plus size={14} />
          </button>
        </div>
        {activeUsers.length > 0 ? (
          activeUsers.map(user => {
            const isSelected = activeRoom?.recipientId === user.id;
            const userIsFriend = isFriend(user.id);
            const displayName = userIsFriend 
              ? `${user.fullName} (@${user.username})` 
              : user.fullName;

            const isTyping = activeRoom?.recipientId === user.id && 
              typingUsers && 
              Object.keys(typingUsers).some(uid => uid !== currentUser?.id);

            return (
              <div 
                key={user.id} 
                className={`list-item ${isSelected ? 'active' : ''}`}
                onClick={() => handleStartDM(user)}
              >
                <div className="avatar-wrapper">
                  <img src={user.avatar} alt={user.fullName} className="avatar" />
                  <span className={`status-dot ${user.status}`}></span>
                </div>
                <div className="item-details">
                  <div className="item-name">{displayName}</div>
                  <div className="item-subtext" style={{ fontSize: '0.75rem' }}>
                    {isTyping ? (
                      <span style={{ color: '#22c55e', fontWeight: '600' }}>typing...</span>
                    ) : (
                      userIsFriend ? 'Friend' : 'Public'
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="item-details" style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No active users online
          </div>
        )}

        {/* 2. GROUPS SECTION */}
        <div className="section-title" style={{ marginTop: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} /> Groups
          </span>
          <button className="add-room-btn" onClick={() => openAddModal('group')} title="Create Group">
            <Plus size={14} />
          </button>
        </div>
        {groups.map(room => (
          <div 
            key={room.id} 
            className={`list-item ${activeRoom?.id === room.id ? 'active' : ''}`}
            onClick={() => handleSelectRoomWrapper(room)}
          >
            <div className="category-logo-circle group">
              <Users size={18} strokeWidth={2.5} />
            </div>
            <div className="item-details">
              <div className="item-name">{room.name}</div>
              {activeRoom?.id === room.id && typingUsers && Object.keys(typingUsers).some(uid => uid !== currentUser?.id) && (
                <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>typing...</div>
              )}
            </div>
          </div>
        ))}

        {/* 3. COLLABS SECTION */}
        <div className="section-title" style={{ marginTop: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase size={14} /> Collabs
          </span>
          <button className="add-room-btn" onClick={() => openAddModal('collab')} title="Create Collab">
            <Plus size={14} />
          </button>
        </div>
        {collabs.map(room => (
          <div 
            key={room.id} 
            className={`list-item ${activeRoom?.id === room.id ? 'active' : ''}`}
            onClick={() => handleSelectRoomWrapper(room)}
          >
            <div className="category-logo-circle collab">
              <Briefcase size={18} strokeWidth={2.5} />
            </div>
            <div className="item-details">
              <div className="item-name">{room.name}</div>
              {activeRoom?.id === room.id && typingUsers && Object.keys(typingUsers).some(uid => uid !== currentUser?.id) && (
                <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>typing...</div>
              )}
            </div>
          </div>
        ))}

        {/* 4. SERVERS SECTION */}
        <div className="section-title" style={{ marginTop: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} /> Servers
          </span>
          <button className="add-room-btn" onClick={() => openAddModal('server')} title="Create Server">
            <Plus size={14} />
          </button>
        </div>
        {servers.map(room => (
          <div 
            key={room.id} 
            className={`list-item ${activeRoom?.id === room.id ? 'active' : ''}`}
            onClick={() => handleSelectRoomWrapper(room)}
          >
            <div className="category-logo-circle server">
              <Server size={18} strokeWidth={2.5} />
            </div>
            <div className="item-details">
              <div className="item-name">{room.name}</div>
              {activeRoom?.id === room.id && typingUsers && Object.keys(typingUsers).some(uid => uid !== currentUser?.id) && (
                <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>typing...</div>
              )}
            </div>
          </div>
        ))}

      </div>

      {/* Sidebar Footer (Clickable profile to edit) */}
      <div 
        className="sidebar-footer" 
        onClick={() => {
          setEditFullName(currentUser.fullName);
          setEditAvatar(currentUser.avatar);
          setShowProfileModal(true);
        }}
        style={{ cursor: 'pointer', transition: 'background var(--transition-fast)' }}
        title="Edit Profile Settings"
      >
        <div className="user-profile">
          <div className="avatar-wrapper">
            <img src={currentUser.avatar} alt={currentUser.fullName} className="avatar" />
            <span className="status-dot online"></span>
          </div>
          <div className="item-details">
            <div className="item-name" style={{ fontWeight: 700 }}>{currentUser.fullName}</div>
            <div className="item-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              @{currentUser.username} • Settings
            </div>
          </div>
        </div>
      </div>

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div className="modal-overlay" style={{ zIndex: 150 }} onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Profile</h3>
            <p className="modal-desc">Customize your profile photo and Full Name seen by others.</p>
            
            <form onSubmit={handleSaveProfile}>
              
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', textAlign: 'center' }}>Profile Photo</label>
                <div 
                  className={`pfp-dropzone ${isDragOver ? 'dragover' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {editAvatar ? (
                    <img src={editAvatar} alt="Profile preview" className="pfp-dropzone-preview" />
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
                <label className="form-label" htmlFor="edit-fullname">Full Name</label>
                <input 
                  type="text" 
                  id="edit-fullname"
                  className="form-input" 
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  maxLength={30}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username (Read-only)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={`@${currentUser.username}`}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="secondary-btn" onClick={onLogout} style={{ color: '#ef4444' }}>
                  Log Out
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="secondary-btn" onClick={() => setShowProfileModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal Overlay */}
      {showAddModal && (
        <div className="modal-overlay" style={{ zIndex: 120 }} onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create {addType.charAt(0).toUpperCase() + addType.slice(1)}</h3>
            <p className="modal-desc">Add a new collaborative space to AuraChat.</p>
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label className="form-label" htmlFor="room-name">Name</label>
                <input 
                  type="text" 
                  id="room-name"
                  className="form-input" 
                  placeholder={`e.g. general-${addType}`} 
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={25}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="room-desc">Description</label>
                <textarea 
                  id="room-desc"
                  className="form-input" 
                  placeholder="What is this space about?" 
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  maxLength={100}
                  rows={3}
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Friend Modal Overlay */}
      {showAddFriendModal && (
        <div className="modal-overlay" style={{ zIndex: 120 }} onClick={() => setShowAddFriendModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Friend</h3>
            <p className="modal-desc">Enter a username to add them to your DM list (even if they are offline).</p>
            <form onSubmit={handleAddFriend}>
              <div className="form-group">
                <label className="form-label" htmlFor="friend-username">Username</label>
                <input 
                  type="text" 
                  id="friend-username"
                  className="form-input" 
                  placeholder="e.g. shriyansh" 
                  value={friendUsername}
                  onChange={(e) => setFriendUsername(e.target.value)}
                  maxLength={25}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {friendError && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '-8px', marginBottom: '12px' }}>
                  {friendError}
                </div>
              )}

              {friendSuccess && (
                <div style={{ color: '#22c55e', fontSize: '0.8rem', marginTop: '-8px', marginBottom: '12px' }}>
                  {friendSuccess}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAddFriendModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Add Friend
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
