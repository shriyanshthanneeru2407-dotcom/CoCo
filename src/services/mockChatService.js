import { ChatService } from './chatService';

// Default starter rooms categorized into Servers, Groups, Collabs
const DEFAULT_ROOMS = [
  { id: 'dev-lounge', name: 'Developers Lounge', type: 'server', description: 'Tech discussions, frameworks, and system alerts.' },
  
  { id: 'gaming-guild', name: 'Gaming Guild', type: 'group', description: 'For casual and competitive multiplayer gamers.' },
  { id: 'book-club', name: 'Book Club', type: 'group', description: 'Weekly reading lists and literature reviews.' },
  
  { id: 'design-sprint', name: 'Design Sprint', type: 'collab', description: 'Collaborative Figma workspace reviews.' },
  { id: 'code-review', name: 'Code Review', type: 'collab', description: 'Pull request discussions, refactors, and approvals.' }
];


// Helper to raise cross-tab or same-tab events
function dispatchStorageChange(key) {
  const event = new CustomEvent('aura_storage_change', { detail: { key } });
  window.dispatchEvent(event);
}

export class MockChatService extends ChatService {
  constructor() {
    super();
    this.messageListeners = {}; // roomId -> Set of callbacks
    this.roomsListeners = new Set();
    this.presenceListeners = new Set();
    this.typingListeners = {}; // roomId -> Set of callbacks

    // Initialize default rooms if empty OR if old schema / aura-hq is detected
    const stored = localStorage.getItem('aura_rooms');
    if (!stored || stored.includes('"channel"') || stored.includes('"aura-hq"')) {
      localStorage.setItem('aura_rooms', JSON.stringify(DEFAULT_ROOMS));
    }


    // Set up storage listeners
    window.addEventListener('storage', (e) => this.handleStorageChange(e.key));
    window.addEventListener('aura_storage_change', (e) => this.handleStorageChange(e.detail.key));

    // Start presence cleanup timer (mark idle users after 60s)
    setInterval(() => this.cleanupPresence(), 15000);
  }

  handleStorageChange(key) {
    if (!key) return;

    if (key === 'aura_rooms') {
      const rooms = this.getRooms();
      this.roomsListeners.forEach(cb => cb(rooms));
    }

    if (key.startsWith('aura_messages_')) {
      const roomId = key.replace('aura_messages_', '');
      if (this.messageListeners[roomId]) {
        const messages = this.getMessages(roomId);
        this.messageListeners[roomId].forEach(cb => cb(messages));
      }
    }

    if (key === 'aura_presence') {
      const presence = this.getPresence();
      this.presenceListeners.forEach(cb => cb(presence));
    }

    if (key.startsWith('aura_typing_')) {
      const roomId = key.replace('aura_typing_', '');
      if (this.typingListeners[roomId]) {
        const typing = this.getTyping(roomId);
        this.typingListeners[roomId].forEach(cb => cb(typing));
      }
    }
  }

  // Room methods
  getRooms() {
    try {
      return JSON.parse(localStorage.getItem('aura_rooms')) || [];
    } catch {
      return [];
    }
  }

  subscribeToRooms(callback) {
    this.roomsListeners.add(callback);
    callback(this.getRooms());
    return () => this.roomsListeners.delete(callback);
  }

  async createRoom(name, type, createdBy, description) {
    const rooms = this.getRooms();
    const id = `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    if (rooms.some(r => r.id === id)) {
      throw new Error('Room name already exists in this category!');
    }

    const newRoom = {
      id,
      name,
      type, // 'server' | 'group' | 'collab' | 'dm'
      description: description || `Created by ${createdBy.fullName}`,
      createdAt: Date.now()
    };


    rooms.push(newRoom);
    localStorage.setItem('aura_rooms', JSON.stringify(rooms));
    dispatchStorageChange('aura_rooms');
    return newRoom;
  }

  async deleteRoom(roomId) {
    let rooms = this.getRooms();
    rooms = rooms.filter(r => r.id !== roomId);
    localStorage.setItem('aura_rooms', JSON.stringify(rooms));
    localStorage.removeItem(`aura_messages_${roomId}`);
    dispatchStorageChange('aura_rooms');
  }


  // Message methods
  getMessages(roomId) {
    try {
      return JSON.parse(localStorage.getItem(`aura_messages_${roomId}`)) || [];
    } catch {
      return [];
    }
  }

  subscribeToMessages(roomId, callback) {
    if (!this.messageListeners[roomId]) {
      this.messageListeners[roomId] = new Set();
    }
    this.messageListeners[roomId].add(callback);
    callback(this.getMessages(roomId));
    return () => {
      this.messageListeners[roomId].delete(callback);
      if (this.messageListeners[roomId].size === 0) {
        delete this.messageListeners[roomId];
      }
    };
  }

  async sendMessage(roomId, message) {
    const messages = this.getMessages(roomId);
    const newMessage = {
      id: Math.random().toString(36).substring(2, 11),
      roomId,
      text: message.text,
      senderId: message.senderId,
      senderName: message.senderName, // full name or username based on presentation layer
      senderAvatar: message.senderAvatar,
      timestamp: Date.now(),
      reactions: {},
      mediaUrl: message.mediaUrl || null,
      mediaType: message.mediaType || null,
      mediaName: message.mediaName || null,
      replyTo: message.replyTo || null
    };

    messages.push(newMessage);
    localStorage.setItem(`aura_messages_${roomId}`, JSON.stringify(messages));
    await this.sendTyping(roomId, { id: message.senderId }, false);
    dispatchStorageChange(`aura_messages_${roomId}`);
    return newMessage;
  }

  async toggleReaction(roomId, messageId, emoji, userId) {
    const messages = this.getMessages(roomId);
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const message = messages[msgIndex];
    if (!message.reactions) message.reactions = {};

    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }

    const userIndex = message.reactions[emoji].indexOf(userId);
    if (userIndex === -1) {
      message.reactions[emoji].push(userId);
    } else {
      message.reactions[emoji].splice(userIndex, 1);
    }

    if (message.reactions[emoji].length === 0) {
      delete message.reactions[emoji];
    }

    localStorage.setItem(`aura_messages_${roomId}`, JSON.stringify(messages));
    dispatchStorageChange(`aura_messages_${roomId}`);
  }

  // Presence methods
  getPresence() {
    try {
      return JSON.parse(localStorage.getItem('aura_presence')) || {};
    } catch {
      return {};
    }
  }

  subscribeToPresence(callback) {
    this.presenceListeners.add(callback);
    callback(this.getPresence());
    return () => this.presenceListeners.delete(callback);
  }

  async updatePresence(user, status) {
    if (!user || !user.id) return;
    const presence = this.getPresence();
    
    presence[user.id] = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      friends: user.friends || [],
      status,
      lastActive: Date.now()
    };

    localStorage.setItem('aura_presence', JSON.stringify(presence));
    dispatchStorageChange('aura_presence');
  }

  cleanupPresence() {
    const presence = this.getPresence();
    let changed = false;
    const now = Date.now();

    Object.keys(presence).forEach(userId => {
      const userPres = presence[userId];
      if (userPres.status === 'online' && now - userPres.lastActive > 60000) {
        userPres.status = 'away';
        changed = true;
      } else if (userPres.status !== 'offline' && now - userPres.lastActive > 300000) {
        userPres.status = 'offline';
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem('aura_presence', JSON.stringify(presence));
      dispatchStorageChange('aura_presence');
    }
  }

  // Typing indicator methods
  getTyping(roomId) {
    try {
      return JSON.parse(localStorage.getItem(`aura_typing_${roomId}`)) || {};
    } catch {
      return {};
    }
  }

  subscribeToTyping(roomId, callback) {
    if (!this.typingListeners[roomId]) {
      this.typingListeners[roomId] = new Set();
    }
    this.typingListeners[roomId].add(callback);
    callback(this.getTyping(roomId));
    
    return () => {
      this.typingListeners[roomId].delete(callback);
      if (this.typingListeners[roomId].size === 0) {
        delete this.typingListeners[roomId];
      }
    };
  }

  async sendTyping(roomId, user, isTyping) {
    if (!user || !user.id) return;
    const typing = this.getTyping(roomId);

    if (isTyping) {
      typing[user.id] = {
        username: user.username || 'Someone',
        fullName: user.fullName || 'Someone',
        isTyping: true,
        timestamp: Date.now()
      };
    } else {
      delete typing[user.id];
    }

    localStorage.setItem(`aura_typing_${roomId}`, JSON.stringify(typing));
    dispatchStorageChange(`aura_typing_${roomId}`);
  }
}
