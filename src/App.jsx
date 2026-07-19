import React, { useState, useEffect, useRef } from 'react';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { MockChatService } from './services/mockChatService';
import { FirebaseChatService } from './services/firebaseService';
import { playChatSound } from './utils/audio';

// Audio synth chime for notifications
const playMessageChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1109.73, now + 0.08);
    
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.23);
  } catch (err) {
    console.warn('Audio notification blocked or failed:', err);
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [firebaseConfig, setFirebaseConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_firebase_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    
    // Default fallback to your live Google Firebase database config
    return {
      apiKey: "AIzaSyD0eOiNAFeogiDpNtWY_gpStfKTmRra-N4",
      authDomain: "coco-chat-e2957.firebaseapp.com",
      projectId: "coco-chat-e2957",
      storageBucket: "coco-chat-e2957.firebasestorage.app",
      messagingSenderId: "1079400843621",
      appId: "1:1079400843621:web:a7891609691567ed84798c"
    };
  });

  const [service, setService] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Unified sidebar collapse state (default true - collapsed)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const prevMessagesLength = useRef(0);
  const prevActiveRoomId = useRef(null);

  // Initialize service
  useEffect(() => {
    let activeService;
    if (firebaseConfig) {
      try {
        activeService = new FirebaseChatService(firebaseConfig);
        console.log('Firebase Chat Service initialized successfully.');
      } catch (err) {
        console.error('Failed to initialize Firebase Service, falling back to Mock:', err);
        alert('Invalid Firebase Configuration. Falling back to Mock Storage Mode.');
        activeService = new MockChatService();
        setFirebaseConfig(null);
        localStorage.removeItem('aura_firebase_config');
      }
    } else {
      activeService = new MockChatService();
      console.log('Mock Chat Service initialized.');
    }
    setService(activeService);
  }, [firebaseConfig]);

  // Set up theme class on body
  useEffect(() => {
    const container = document.body;
    if (isDarkMode) {
      container.classList.add('dark-theme');
      container.classList.remove('light-theme');
    } else {
      container.classList.add('light-theme');
      container.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  // Presence and Rooms listeners
  useEffect(() => {
    if (!service || !currentUser) return;

    service.updatePresence(currentUser, 'online');

    // Subscribe to Rooms
    const unsubRooms = service.subscribeToRooms((updatedRooms) => {
      setRooms(updatedRooms);
      
      if (updatedRooms.length > 0 && !activeRoom) {
        setActiveRoom(updatedRooms[0]);
      }
    });

    // Subscribe to Presence
    const unsubPresence = service.subscribeToPresence((updatedPresence) => {
      setPresence(updatedPresence);
    });

    const interval = setInterval(() => {
      service.updatePresence(currentUser, 'online');
    }, 10000);

    const handleUnload = () => {
      service.updatePresence(currentUser, 'offline');
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      unsubRooms();
      unsubPresence();
      if (currentUser) {
        service.updatePresence(currentUser, 'offline');
      }
    };
  }, [service, currentUser]);

  // Active room data subscription (Messages + Typing)
  useEffect(() => {
    if (!service || !currentUser || !activeRoom) {
      setMessages([]);
      setTypingUsers({});
      return;
    }

    prevActiveRoomId.current = activeRoom.id;
    prevMessagesLength.current = 0;

    const unsubMessages = service.subscribeToMessages(activeRoom.id, (newMessages) => {
      setMessages(newMessages);

      if (
        prevMessagesLength.current > 0 && 
        newMessages.length > prevMessagesLength.current
      ) {
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.senderId !== currentUser.id) {
          playChatSound('received');
        }
      }
      prevMessagesLength.current = newMessages.length;
    });

    const unsubTyping = service.subscribeToTyping(activeRoom.id, (typingState) => {
      setTypingUsers(typingState);
    });

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [service, currentUser, activeRoom?.id]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('aura_current_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    if (service && currentUser) {
      await service.updatePresence(currentUser, 'offline');
    }
    setCurrentUser(null);
    setActiveRoom(null);
    localStorage.removeItem('aura_current_user');
  };

  const handleSaveFirebaseConfig = (config) => {
    setFirebaseConfig(config);
    if (config) {
      localStorage.setItem('aura_firebase_config', JSON.stringify(config));
    } else {
      localStorage.removeItem('aura_firebase_config');
    }
    setActiveRoom(null);
  };

  const handleUpdateProfile = async ({ fullName, avatar }) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      fullName,
      avatar
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('aura_current_user', JSON.stringify(updatedUser));
    
    if (service) {
      await service.updatePresence(updatedUser, 'online');
    }
  };

  const handleToggleFriend = async (userId) => {
    if (!currentUser) return;
    const friends = currentUser.friends || [];
    let updatedFriends;

    if (friends.includes(userId)) {
      updatedFriends = friends.filter(id => id !== userId);
    } else {
      updatedFriends = [...friends, userId];
    }

    const updatedUser = {
      ...currentUser,
      friends: updatedFriends
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('aura_current_user', JSON.stringify(updatedUser));

    if (service) {
      await service.updatePresence(updatedUser, 'online');
    }
  };

  const handleSendMessage = async (roomId, text, extra = {}) => {
    if (!service || !currentUser) return;
    
    // Play sending sound instantly
    playChatSound('sent');

    const sentMessage = await service.sendMessage(roomId, {
      text,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderUsername: currentUser.username,
      senderAvatar: currentUser.avatar,
      ...extra
    });

    // Simulate replies on local mock storage db to show off typing indicators and chimes
    if (!firebaseConfig) {
      const mockSender = {
        id: 'mock-buddy-bot',
        fullName: 'DevBuddy Bot 🤖',
        username: 'devbuddy',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'
      };

      // 1. Bot starts typing after 1 second
      setTimeout(() => {
        service.sendTyping(roomId, { id: mockSender.id, fullName: mockSender.fullName }, true);
      }, 1000);

      // 2. Bot stops typing and sends a reply after 3.2 seconds
      setTimeout(async () => {
        service.sendTyping(roomId, { id: mockSender.id, fullName: mockSender.fullName }, false);

        const replies = [
          "Nice! I totally agree with that. 👍",
          "Interesting point. Let's discuss this in detail.",
          "Check this out! That's awesome.",
          "Got it, let's keep collaborating! 🚀",
          "Exactly! That's what I was thinking.",
          "Thanks for sharing, super helpful!"
        ];
        const randomReplyText = replies[Math.floor(Math.random() * replies.length)];

        await service.sendMessage(roomId, {
          text: randomReplyText,
          senderId: mockSender.id,
          senderName: mockSender.fullName,
          senderUsername: mockSender.username,
          senderAvatar: mockSender.avatar,
          replyTo: {
            messageId: sentMessage.id || Math.random().toString(),
            senderName: currentUser.fullName,
            text: text || (extra.mediaUrl ? "Sent a file" : "Message")
          }
        });
      }, 3200);
    }
  };

  const handleSendTyping = async (roomId, isTyping) => {
    if (!service || !currentUser) return;
    await service.sendTyping(roomId, currentUser, isTyping);
  };

  const handleToggleReaction = async (roomId, messageId, emoji) => {
    if (!service || !currentUser) return;
    await service.toggleReaction(roomId, messageId, emoji, currentUser.id);
  };

  const handleCreateRoom = async (name, type, description) => {
    if (!service || !currentUser) return;
    try {
      const newRoom = await service.createRoom(name, type, currentUser, description);
      setActiveRoom(newRoom);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!service || !currentUser) return;
    if (!window.confirm('Are you sure you want to delete this space? This action cannot be undone.')) {
      return;
    }
    try {
      await service.deleteRoom(roomId);
      setActiveRoom(null);
    } catch (err) {
      alert(err.message);
    }
  };


  if (!currentUser) {
    return (
      <div className={`app-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
        <AuthModal 
          onLogin={handleLogin} 
          savedConfig={firebaseConfig}
          onSaveConfig={handleSaveFirebaseConfig}
        />
      </div>
    );
  }

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <div className="glass-window">
        <Sidebar 
          rooms={rooms}
          activeRoom={activeRoom}
          onSelectRoom={(room) => {
            setActiveRoom(room);
          }}
          presence={presence}
          currentUser={currentUser}
          isDarkMode={isDarkMode}
          toggleTheme={() => setIsDarkMode(!isDarkMode)}
          onLogout={handleLogout}
          isFirebaseActive={!!firebaseConfig}
          onCreateRoom={handleCreateRoom}
          onUpdateProfile={handleUpdateProfile}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={setIsSidebarCollapsed}
          typingUsers={typingUsers}
        />
        
        {!isSidebarCollapsed && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 9,
              background: 'rgba(0,0,0,0.2)'
            }}
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}
        
        <style dangerouslySetInnerHTML={{__html: `
          @media (max-width: 767px) {
            .sidebar {
              transform: translateX(${isSidebarCollapsed ? '-100%' : '0'}) !important;
            }
          }
        `}} />

        <ChatArea 
          room={activeRoom}
          messages={messages}
          typingUsers={typingUsers}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onSendTyping={handleSendTyping}
          onToggleReaction={handleToggleReaction}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onToggleFriend={handleToggleFriend}
          isSidebarCollapsed={isSidebarCollapsed}
          onDeleteRoom={handleDeleteRoom}
        />
      </div>
    </div>
  );
}
