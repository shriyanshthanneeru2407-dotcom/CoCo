import { ChatService } from './chatService';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDoc
} from 'firebase/firestore';

export class FirebaseChatService extends ChatService {
  constructor(config) {
    super();
    this.app = getApps().length === 0 ? initializeApp(config) : getApp();
    this.db = getFirestore(this.app);
  }

  // Room methods
  subscribeToRooms(callback) {
    const q = query(collection(this.db, 'rooms'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const rooms = [];
      snapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() });
      });
      callback(rooms);
    }, (error) => {
      console.error('Error fetching rooms:', error);
    });
  }

  async createRoom(name, type, createdBy, description) {
    const id = `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const roomRef = doc(this.db, 'rooms', id);
    
    const roomDoc = await getDoc(roomRef);
    if (roomDoc.exists()) {
      throw new Error('Room name already exists in this category!');
    }

    const roomData = {
      name,
      type,
      description: description || `Created by ${createdBy.fullName}`,
      createdAt: Date.now()
    };

    await setDoc(roomRef, roomData);
    return { id, ...roomData };
  }

  async deleteRoom(roomId) {
    const roomRef = doc(this.db, 'rooms', roomId);
    await deleteDoc(roomRef);
  }


  // Message methods
  subscribeToMessages(roomId, callback) {
    const q = query(
      collection(this.db, 'rooms', roomId, 'messages'), 
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({ 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now())
        });
      });
      callback(messages);
    }, (error) => {
      console.error('Error fetching messages:', error);
    });
  }

  async sendMessage(roomId, message) {
    const messagesColl = collection(this.db, 'rooms', roomId, 'messages');
    
    const docRef = await addDoc(messagesColl, {
      roomId,
      text: message.text,
      senderId: message.senderId,
      senderName: message.senderName, // full name by default
      senderAvatar: message.senderAvatar,
      timestamp: serverTimestamp(),
      reactions: {},
      mediaUrl: message.mediaUrl || null,
      mediaType: message.mediaType || null,
      mediaName: message.mediaName || null,
      replyTo: message.replyTo || null
    });

    await this.sendTyping(roomId, { id: message.senderId }, false);
    return docRef.id;
  }

  async toggleReaction(roomId, messageId, emoji, userId) {
    const msgRef = doc(this.db, 'rooms', roomId, 'messages', messageId);
    
    const docSnap = await getDoc(msgRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const reactions = data.reactions || {};
    
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    const userIdx = reactions[emoji].indexOf(userId);
    if (userIdx === -1) {
      reactions[emoji].push(userId);
    } else {
      reactions[emoji].splice(userIdx, 1);
    }

    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }

    await updateDoc(msgRef, { reactions });
  }

  // Presence methods
  subscribeToPresence(callback) {
    const q = collection(this.db, 'presence');
    return onSnapshot(q, (snapshot) => {
      const presence = {};
      snapshot.forEach((doc) => {
        presence[doc.id] = doc.data();
      });
      callback(presence);
    }, (error) => {
      console.error('Error fetching presence:', error);
    });
  }

  async updatePresence(user, status) {
    if (!user || !user.id) return;
    const presenceRef = doc(this.db, 'presence', user.id);
    await setDoc(presenceRef, {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      friends: user.friends || [],
      status,
      lastActive: Date.now()
    }, { merge: true });
  }

  // Typing indicator methods
  subscribeToTyping(roomId, callback) {
    const typingRef = doc(this.db, 'typing', roomId);
    return onSnapshot(typingRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        callback({});
      }
    }, (error) => {
      console.error('Error fetching typing:', error);
    });
  }

  async sendTyping(roomId, user, isTyping) {
    if (!user || !user.id) return;
    const typingRef = doc(this.db, 'typing', roomId);
    
    const docSnap = await getDoc(typingRef);
    const data = docSnap.exists() ? docSnap.data() : {};

    if (isTyping) {
      data[user.id] = {
        username: user.username || 'Someone',
        fullName: user.fullName || 'Someone',
        isTyping: true,
        timestamp: Date.now()
      };
    } else {
      delete data[user.id];
    }

    await setDoc(typingRef, data);
  }
}
