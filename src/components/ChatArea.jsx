import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  Hash, 
  MessageSquare,
  Sparkles,
  CheckCheck,
  UserPlus,
  UserMinus,
  Trash2,
  Server,
  Users,
  Briefcase,
  CornerUpLeft,
  Plus,
  X,
  Mic,
  FileText
} from 'lucide-react';

// Custom SVG Sidebar Toggle Icon (representing the user's sketch)
const SidebarToggleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 3v18" />
    <path d="M5 7h2" />
    <path d="M5 12h2" />
    <path d="M5 17h2" />
  </svg>
);

export default function ChatArea({ 
  room, 
  messages, 
  typingUsers, 
  currentUser, 
  onSendMessage, 
  onSendTyping, 
  onToggleReaction,
  onToggleSidebar,
  onToggleFriend,
  isSidebarCollapsed,
  onDeleteRoom
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // Selected message to reply to
  const [attachment, setAttachment] = useState(null); // Selected file attachment: { dataUrl, name, type }
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Ref variables for swipe-to-reply dragging logic
  const dragStart = useRef({ x: 0, y: 0, messageId: null, isMe: false });
  const isDragging = useRef(false);


  // Drag / Swipe handlers for swipe-to-reply gesture
  const handleDragStart = (e, messageId, isMe) => {
    // If it's a mouse event, only allow left click (button === 0)
    if (e.type.startsWith('mouse') && e.button !== 0) return;
    
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX, y: clientY, messageId, isMe };
    isDragging.current = true;
    
    // Prevent default touch scrolling if dragging horizontally
    if (e.type.startsWith('mouse')) {
      e.preventDefault();
    }
  };

  const handleDragMove = (e) => {
    if (!isDragging.current) return;
    const { x: startX, y: startY, messageId, isMe } = dragStart.current;
    if (!messageId) return;

    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - startX;
    const dy = clientY - startY;

    // If scrolling vertically, cancel drag
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      handleDragEnd();
      return;
    }

    // Yours: swipe right (dx > 0) only; Others: swipe left (dx < 0) only
    let moveX = 0;
    if (isMe) {
      if (dx > 0) {
        moveX = Math.min(dx, 80);
      }
    } else {
      if (dx < 0) {
        moveX = Math.max(dx, -80);
      }
    }

    const bubble = document.getElementById(`bubble-${messageId}`);
    if (bubble) {
      bubble.style.transform = `translateX(${moveX}px)`;
      bubble.style.transition = 'none';
      
      const replyIndicator = document.getElementById(`reply-indicator-${messageId}`);
      if (replyIndicator) {
        const opacity = Math.min(Math.abs(moveX) / 50, 1);
        replyIndicator.style.opacity = opacity;
        replyIndicator.style.transform = `translateY(-50%) scale(${Math.min(Math.abs(moveX) / 60, 1)})`;
      }
    }
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const { x: startX, messageId, isMe } = dragStart.current;
    if (!messageId) return;

    const bubble = document.getElementById(`bubble-${messageId}`);
    const replyIndicator = document.getElementById(`reply-indicator-${messageId}`);
    
    if (bubble) {
      const transform = bubble.style.transform;
      const match = transform.match(/translateX\(([-]?\d+(?:\.\d+)?)\s*px\)/) || transform.match(/translateX\(([-]?\d+)\s*px\)/);
      const currentDx = match ? parseFloat(match[1]) : 0;

      // Animate bubble back
      bubble.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      bubble.style.transform = 'translateX(0)';

      if (replyIndicator) {
        replyIndicator.style.transition = 'all 0.25s ease';
        replyIndicator.style.opacity = '0';
        replyIndicator.style.transform = 'translateY(-50%) scale(0)';
      }

      // If drag exceeds 50px, trigger reply
      const threshold = 50;
      if (isMe && currentDx >= threshold) {
        const msg = messages.find(m => m.id === messageId);
        if (msg) setReplyingTo(msg);
      } else if (!isMe && currentDx <= -threshold) {
        const msg = messages.find(m => m.id === messageId);
        if (msg) setReplyingTo(msg);
      }
    }
    
    dragStart.current = { x: 0, y: 0, messageId: null, isMe: false };
  };

  // Add global event listeners for dragging
  useEffect(() => {
    const handleGlobalEnd = () => {
      handleDragEnd();
    };
    const handleGlobalMove = (e) => {
      handleDragMove(e);
    };

    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });

    return () => {
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('touchmove', handleGlobalMove);
    };
  }, [messages]);

  // Reply scrolling & highlight spotlight
  const scrollToMessage = (messageId) => {
    const el = document.getElementById(`bubble-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash-highlight');
      setTimeout(() => {
        el.classList.remove('flash-highlight');
      }, 1500);
    }
  };

  // Attachment triggers
  const handleAttachmentClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        dataUrl: event.target.result,
        name: file.name,
        type: file.type
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Handle typing state
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    onSendTyping(room.id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(room.id, false);
    }, 1500);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    const extra = {};
    if (replyingTo) {
      extra.replyTo = {
        messageId: replyingTo.id,
        senderName: replyingTo.senderName,
        text: replyingTo.text
      };
    }
    if (attachment) {
      extra.mediaUrl = attachment.dataUrl;
      extra.mediaType = attachment.type;
      extra.mediaName = attachment.name;
    }

    onSendMessage(room.id, inputText.trim(), extra);
    
    setInputText('');
    setReplyingTo(null);
    setAttachment(null);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSendTyping(room.id, false);
  };


  const selectEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiDrawer(false);
  };

  const formatGroupDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (!room) {
    return (
      <div className="chat-area chat-empty">
        {/* Toggle Button still accessible in empty state */}
        <button 
          className="icon-btn" 
          onClick={onToggleSidebar} 
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{ 
            position: 'absolute',
            top: '16px',
            left: '20px',
            color: 'var(--text-primary)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            zIndex: 15
          }}
        >
          <SidebarToggleIcon />
        </button>

        <div className="chat-empty-icon">
          <MessageSquare size={36} />
        </div>
        <h3>No Conversation Selected</h3>
        <p>Select a category or click on an active user under DM's to begin a real-time conversation.</p>
      </div>
    );
  }

  // Helpers for friend rules
  const isFriend = (userId) => {
    const friends = currentUser.friends || [];
    return friends.includes(userId);
  };

  const getSenderDisplayName = (message) => {
    if (message.senderId === currentUser.id) return 'You';
    if (isFriend(message.senderId)) {
      return `${message.senderName} (@${message.senderUsername || 'username'})`;
    }
    return message.senderName;
  };

  const isDmRecipientFriend = room.type === 'dm' && isFriend(room.recipientId);

  // Filter typing status
  const typingList = Object.keys(typingUsers || {})
    .filter(uid => uid !== currentUser.id && typingUsers[uid]?.isTyping)
    .map(uid => {
      const isUidFriend = isFriend(uid);
      const user = typingUsers[uid];
      return isUidFriend ? `${user.fullName} (@${user.username})` : user.fullName;
    });

  let typingText = '';
  if (typingList.length === 1) {
    typingText = `${typingList[0]} is typing...`;
  } else if (typingList.length > 1) {
    typingText = `${typingList.slice(0, 2).join(', ')} are typing...`;
  }

  return (
    <div className="chat-area">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-info">
          
          {/* Relocated Sidebar Toggle Icon - placed in the main chat header */}
          <button 
            className="icon-btn" 
            onClick={onToggleSidebar} 
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            style={{ 
              marginRight: '12px', 
              color: 'var(--text-primary)',
              display: 'flex'
            }}
          >
            <SidebarToggleIcon />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {room.type !== 'dm' ? (
              <div className={`category-logo-circle ${room.type}`} style={{ width: '36px', height: '36px' }}>
                {room.type === 'server' ? <Server size={16} strokeWidth={2.5} /> : 
                 room.type === 'group' ? <Users size={16} strokeWidth={2.5} /> : 
                 <Briefcase size={16} strokeWidth={2.5} />}
              </div>
            ) : (
              <div className="avatar-wrapper" style={{ width: '36px', height: '36px' }}>
                <img src={room.avatar} alt={room.name} className="avatar" />
                <span className={`status-dot ${room.status || 'online'}`}></span>
              </div>
            )}
            
            <div className="chat-header-details">
              <div className="chat-title">
                {room.type === 'dm' && isDmRecipientFriend 
                  ? `${room.name} (@${room.username})` 
                  : room.name
                }
              </div>
              <div className="chat-status">
                {room.type !== 'dm' ? (
                  room.description || `${room.type} chat space`
                ) : (
                  <span style={{ textTransform: 'capitalize' }}>
                    {isDmRecipientFriend ? 'Friend • ' : 'Public • '}
                    {room.status || 'online'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Friend Control in DM Header */}
        {room.type === 'dm' && (
          <button 
            className="primary-btn" 
            style={{ 
              width: 'auto', 
              padding: '6px 14px', 
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isDmRecipientFriend ? '#ef4444' : 'var(--accent-primary)',
              boxShadow: isDmRecipientFriend ? 'none' : '0 4px 12px var(--accent-glow)'
            }}
            onClick={() => onToggleFriend(room.recipientId)}
          >
            {isDmRecipientFriend ? (
              <>
                <UserMinus size={14} /> Remove Friend
              </>
            ) : (
              <>
                <UserPlus size={14} /> Add Friend
              </>
            )}
          </button>
        )}

        {/* Delete Room option in Room Header */}
        {room.type !== 'dm' && (
          <button 
            className="secondary-btn" 
            style={{ 
              width: 'auto', 
              padding: '6px 14px', 
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ef4444',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.05)',
              boxShadow: 'none'
            }}
            onClick={() => onDeleteRoom(room.id)}
            title="Delete Space"
          >
            <Trash2 size={14} /> Delete Space
          </button>
        )}
      </header>

      {/* Message Feed */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Sparkles size={28} style={{ color: 'var(--accent-primary)', marginBottom: '8px', opacity: 0.6 }} />
            <p style={{ fontSize: '0.9rem' }}>Send a message to start the thread.</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const showDateSeparator = index === 0 || 
              new Date(messages[index - 1].timestamp).toDateString() !== new Date(message.timestamp).toDateString();
            
            const isMe = message.senderId === currentUser.id;
            
            // Consecutive messages by the same sender on the same day are chained
            const isChained = index > 0 && 
              messages[index - 1].senderId === message.senderId && 
              (new Date(message.timestamp).toDateString() === new Date(messages[index - 1].timestamp).toDateString());

            const messageSenderIsFriend = isFriend(message.senderId);

            return (
              <React.Fragment key={message.id}>
                {showDateSeparator && (
                  <div className="date-separator">
                    <span className="date-text">{formatGroupDate(message.timestamp)}</span>
                  </div>
                )}

                <div className={`message-item ${isMe ? 'me' : 'other'} ${isChained ? 'chained' : ''}`}>
                  <div className="message-avatar-wrap">
                    {!isChained && (
                      <img 
                        src={message.senderAvatar} 
                        alt={message.senderName} 
                        className="avatar" 
                        style={{ cursor: !isMe ? 'pointer' : 'default' }}
                        onClick={() => !isMe && onToggleFriend(message.senderId)}
                        title={isMe ? "" : (messageSenderIsFriend ? "Remove Friend" : "Add Friend")}
                      />
                    )}
                  </div>
                  
                  <div className="message-content-wrapper">
                    {!isMe && !isChained && (
                      <span 
                        className="message-sender"
                        style={{ cursor: 'pointer' }}
                        onClick={() => onToggleFriend(message.senderId)}
                        title={messageSenderIsFriend ? "Remove Friend" : "Add Friend"}
                      >
                        {getSenderDisplayName(message)}
                      </span>
                    )}
                    
                    <div 
                      className="bubble-container" 
                      style={{ 
                        position: 'relative', 
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexDirection: isMe ? 'row' : 'row-reverse',
                        width: 'fit-content',
                        maxWidth: '100%'
                      }}
                    >
                      {/* Swipe indicator for yours (slides in from left when swiping right) */}
                      {isMe && (
                        <div 
                          id={`reply-indicator-${message.id}`} 
                          className="swipe-indicator left" 
                          style={{
                            position: 'absolute',
                            left: '-32px',
                            top: '50%',
                            transform: 'translateY(-50%) scale(0)',
                            opacity: 0,
                            pointerEvents: 'none',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <CornerUpLeft size={16} />
                        </div>
                      )}

                      {/* Swipe indicator for others (slides in from right when swiping left) */}
                      {!isMe && (
                        <div 
                          id={`reply-indicator-${message.id}`} 
                          className="swipe-indicator right" 
                          style={{
                            position: 'absolute',
                            right: '-32px',
                            top: '50%',
                            transform: 'translateY(-50%) scale(0)',
                            opacity: 0,
                            pointerEvents: 'none',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <CornerUpLeft size={16} />
                        </div>
                      )}

                      <div 
                        id={`bubble-${message.id}`}
                        className="message-bubble"
                        style={{ 
                          transform: 'translateX(0)', 
                          cursor: 'grab', 
                          position: 'relative', 
                          touchAction: 'pan-y',
                          userSelect: 'none'
                        }}
                        onTouchStart={(e) => handleDragStart(e, message.id, isMe)}
                        onMouseDown={(e) => handleDragStart(e, message.id, isMe)}
                      >
                        {/* Quote reply box */}
                        {message.replyTo && (
                          <div 
                            className="reply-quote-box"
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToMessage(message.replyTo.messageId);
                            }}
                            style={{
                              borderLeft: '4px solid var(--accent-primary)',
                              background: 'rgba(var(--accent-primary-rgb), 0.08)',
                              padding: '6px 12px',
                              borderRadius: '0 6px 6px 0',
                              marginBottom: '8px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2.5px',
                              maxWidth: '100%',
                              overflow: 'hidden'
                            }}
                          >
                            <span style={{ fontWeight: '700', fontSize: '0.76rem', color: 'var(--accent-primary)' }}>
                              {message.replyTo.senderName}
                            </span>
                            <span style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '0.8rem',
                              textOverflow: 'ellipsis', 
                              overflow: 'hidden', 
                              whiteSpace: 'nowrap', 
                              display: 'block' 
                            }}>
                              {message.replyTo.text}
                            </span>
                          </div>
                        )}

                        {/* Media display card */}
                        {message.mediaUrl && (
                          <div className="attached-media-container" style={{ marginBottom: message.text ? '8px' : '0', overflow: 'hidden', borderRadius: '6px' }}>
                            {message.mediaType && message.mediaType.startsWith('image/') ? (
                              <img 
                                src={message.mediaUrl} 
                                alt="Attached Media" 
                                style={{ maxWidth: '100%', maxHeight: '240px', display: 'block', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in' }} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(message.mediaUrl, '_blank');
                                }}
                              />
                            ) : message.mediaType && message.mediaType.startsWith('video/') ? (
                              <video src={message.mediaUrl} controls style={{ maxWidth: '100%', maxHeight: '200px', display: 'block', borderRadius: '4px' }} />
                            ) : message.mediaType && message.mediaType.startsWith('audio/') ? (
                              <audio src={message.mediaUrl} controls style={{ maxWidth: '100%', display: 'block' }} />
                            ) : (
                              /* WhatsApp/Discord style generic file attachment card */
                              <div 
                                className="file-attachment-card"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(message.mediaUrl, '_blank');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '10px 14px',
                                  background: isMe ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                                  border: '1px solid var(--border-glass)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  maxWidth: '280px',
                                  width: '100%',
                                  transition: 'all 0.2s ease',
                                  userSelect: 'none'
                                }}
                              >
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '6px',
                                  background: isMe ? 'var(--bg-glass-hover)' : 'var(--accent-primary)',
                                  color: isMe ? 'var(--text-primary)' : 'var(--text-on-accent)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  <FileText size={20} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, textAlign: 'left' }}>
                                  <span style={{ 
                                    fontSize: '0.82rem', 
                                    fontWeight: '600', 
                                    color: 'inherit', 
                                    textOverflow: 'ellipsis', 
                                    overflow: 'hidden', 
                                    whiteSpace: 'nowrap' 
                                  }}>
                                    {message.mediaName || "Attachment File"}
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.68rem', 
                                    color: isMe ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-secondary)', 
                                    textTransform: 'uppercase' 
                                  }}>
                                    {message.mediaType ? message.mediaType.split('/')[1] || "FILE" : "FILE"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {message.text && <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>}
                      </div>

                      {/* Reactions next to bubble inside flex row layout */}
                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className="reaction-container" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
                          {Object.entries(message.reactions).map(([emoji, userIds]) => {
                            const hasReacted = userIds.includes(currentUser.id);
                            return (
                              <button
                                key={emoji}
                                className={`reaction-pill ${hasReacted ? 'reacted' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleReaction(room.id, message.id, emoji);
                                }}
                                style={{ margin: 0 }}
                              >
                                <span>{emoji}</span>
                                <span>{userIds.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="message-meta-outside" style={{ 
                      fontSize: '0.68rem', 
                      color: 'var(--text-secondary)', 
                      marginTop: '2px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      justifyContent: 'flex-start',
                      paddingLeft: '4px'
                    }}>
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span className="read-receipt" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <CheckCheck size={11} style={{ color: 'var(--text-muted)' }} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {typingText && (
          <div className="message-item">
            <div className="message-content-wrapper" style={{ marginLeft: '48px' }}>
              <div className="message-bubble" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: '0' }}>
                <div className="chat-status typing" style={{ fontSize: '0.85rem' }}>
                  <div className="typing-bubble">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  {typingText}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="scroll-anchor" ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area" style={{ position: 'relative' }}>
        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />

        {/* Reply preview */}
        {replyingTo && (
          <div className="reply-preview-container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(var(--blur-amount))',
            borderTop: '1px solid var(--border-glass)',
            borderBottom: '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '2.5px solid var(--accent-primary)', paddingLeft: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                Replying to {replyingTo.senderName}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                {replyingTo.text || "[Media File]"}
              </span>
            </div>
            <button 
              type="button"
              className="icon-btn" 
              onClick={() => setReplyingTo(null)} 
              style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Cancel Reply"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Attachment preview */}
        {attachment && (
          <div className="attachment-preview-container" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(var(--blur-amount))',
            borderTop: '1px solid var(--border-glass)'
          }}>
            <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-glass)', flexShrink: 0 }}>
              {attachment.type.startsWith('image/') ? (
                <img src={attachment.dataUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-glass-hover)', fontSize: '0.65rem', fontWeight: '600', textTransform: 'uppercase' }}>
                  {attachment.type.split('/')[0] || 'FILE'}
                </div>
              )}
              <button 
                type="button"
                onClick={() => setAttachment(null)}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '9px',
                  padding: 0
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '500', color: 'var(--text-primary)', wordBreak: 'break-all', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                {attachment.name}
              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                Ready to attach
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="input-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Plus icon attachment button in the far left corner */}
          <button 
            type="button" 
            onClick={handleAttachmentClick}
            style={{ 
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            title="Attach Media"
          >
            <Plus size={24} strokeWidth={2.2} />
          </button>

          {/* Pill text input wrapper */}
          <div className="chat-input-wrapper" style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            background: 'var(--bg-glass-hover)', 
            border: '1px solid var(--border-glass)', 
            borderRadius: '24px', 
            padding: '4px 14px 4px 16px',
            gap: '8px'
          }}>
            <input 
              type="text" 
              className="chat-input"
              placeholder={`Message ${room.type !== 'dm' ? room.name : (isDmRecipientFriend ? room.name + ' (@' + room.username + ')' : room.name)}...`}
              value={inputText}
              onChange={handleInputChange}
              required={!attachment}
              autoComplete="off"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                padding: '8px 0',
                fontSize: '0.95rem',
                color: 'var(--text-primary)'
              }}
            />
            <button 
              type="button" 
              className="emoji-trigger" 
              onClick={() => setShowEmojiDrawer(!showEmojiDrawer)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Add Emoji"
            >
              <Smile size={22} />
            </button>
          </div>

          {/* Right hand side action toggle (Send or Microphone) */}
          {(inputText.trim() || attachment) ? (
            <button 
              type="submit" 
              className="send-btn" 
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                flexShrink: 0,
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }} 
              title="Send Message"
            >
              <Send size={20} />
            </button>
          ) : (
            <button 
              type="button" 
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                flexShrink: 0,
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }} 
              title="Voice Message (Mock)"
              onClick={() => alert("Voice messaging is not supported in this version.")}
            >
              <Mic size={20} />
            </button>
          )}
        </form>

        {showEmojiDrawer && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 9 }} 
              onClick={() => setShowEmojiDrawer(false)} 
            />
            <div className="emoji-drawer">
              <div className="emoji-grid">
                {DRAWER_EMOJIS.map(emoji => (
                  <button 
                    key={emoji} 
                    type="button" 
                    className="emoji-select"
                    onClick={() => selectEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '👏', '😢', '😮'];
const DRAWER_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '💀'
];

