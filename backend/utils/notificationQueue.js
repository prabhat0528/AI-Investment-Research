/**
 * In-memory queue mimicking Redis list operations with a 2-hour TTL.
 * Automatically removes notifications older than 2 hours.
 */
class NotificationQueue {
  constructor() {
    this.store = {}; // maps userId -> array of notifications
    this.ttlMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  }

  /**
   * Sweeps expired notifications for a specific user.
   */
  _sweep(userId) {
    if (!this.store[userId]) return;
    const cutoff = Date.now() - this.ttlMs;
    this.store[userId] = this.store[userId].filter(notif => notif.timestamp >= cutoff);
  }

  /**
   * Pushes a new notification into the user's queue.
   * @param {number|string} userId 
   * @param {object} notifData - { ticker, companyName, title, message }
   */
  push(userId, notifData) {
    const key = String(userId);
    if (!this.store[key]) {
      this.store[key] = [];
    }

    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticker: notifData.ticker,
      companyName: notifData.companyName,
      title: notifData.title,
      message: notifData.message,
      timestamp: Date.now()
    };

    // Push to the front of the array (newest first)
    this.store[key].unshift(notification);
    
    // Perform cleanup sweep
    this._sweep(key);
    
    return notification;
  }

  /**
   * Retrieves all active notifications for a user, sweeping expired items.
   * @param {number|string} userId 
   */
  getAll(userId) {
    const key = String(userId);
    this._sweep(key);
    return this.store[key] || [];
  }

  /**
   * Clears all notifications for a specific user.
   * @param {number|string} userId 
   */
  clear(userId) {
    const key = String(userId);
    this.store[key] = [];
  }
}

// Export a single instance to be used across the app
const notificationQueue = new NotificationQueue();
export default notificationQueue;
