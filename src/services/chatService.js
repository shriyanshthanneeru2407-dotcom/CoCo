/**
 * ChatService interface definition.
 * All chat providers (Mock, Firebase) must implement these methods.
 */
export class ChatService {
  /**
   * Subscribe to messages in a specific room.
   * @param {string} roomId 
   * @param {function} callback - Receives array of messages
   * @returns {function} Unsubscribe function
   */
  subscribeToMessages(roomId, callback) {
    throw new Error('Not implemented');
  }

  /**
   * Send a message to a room.
   * @param {string} roomId 
   * @param {object} message - { text, senderId, senderName, senderAvatar }
   */
  async sendMessage(roomId, message) {
    throw new Error('Not implemented');
  }

  /**
   * Subscribe to the list of available rooms.
   * @param {function} callback - Receives array of rooms
   * @returns {function} Unsubscribe function
   */
  subscribeToRooms(callback) {
    throw new Error('Not implemented');
  }

  /**
   * Create a new chat room.
   * @param {string} name 
   * @param {string} type - 'channel' | 'dm'
   * @param {object} createdBy - User object
   */
  async createRoom(name, type, createdBy) {
    throw new Error('Not implemented');
  }

  /**
   * Update the current user's presence state (online, away, offline).
   * @param {object} user 
   * @param {string} status - 'online' | 'away' | 'offline'
   */
  async updatePresence(user, status) {
    throw new Error('Not implemented');
  }

  /**
   * Subscribe to all users' presence states.
   * @param {function} callback - Receives object mapping userId -> status
   * @returns {function} Unsubscribe function
   */
  subscribeToPresence(callback) {
    throw new Error('Not implemented');
  }

  /**
   * Send typing status for the current user in a room.
   * @param {string} roomId 
   * @param {object} user 
   * @param {boolean} isTyping 
   */
  async sendTyping(roomId, user, isTyping) {
    throw new Error('Not implemented');
  }

  /**
   * Subscribe to typing status in a room.
   * @param {string} roomId 
   * @param {function} callback - Receives object mapping userId -> { name, isTyping }
   * @returns {function} Unsubscribe function
   */
  subscribeToTyping(roomId, callback) {
    throw new Error('Not implemented');
  }

  /**
   * Toggle emoji reaction on a message.
   * @param {string} roomId 
   * @param {string} messageId 
   * @param {string} emoji 
   * @param {string} userId 
   */
  async toggleReaction(roomId, messageId, emoji, userId) {
    throw new Error('Not implemented');
  }
}
