const { filesize } = require("@drumee/ui-essentials");

/**
 * Get file icon based on file type (mimetype or extension)
 * @param {File|Object} file - File object with type property or fileName
 * @returns {String} Icon name
 */
function getFileIcon(file) {
  if (!file) return "desktop_docfile";
  
  // Check mimetype first
  if (file.type) {
    if (file.type.startsWith('image/')) {
      return "desktop_picture";
    } else if (file.type.startsWith('video/')) {
      return "desktop_videofile";
    } else if (file.type.startsWith('audio/')) {
      return "desktop_musicfile";
    }
  }
  
  // Check extension from fileName
  if (file.name || file.fileName) {
    const fileName = file.name || file.fileName;
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName)) {
      return "desktop_picture";
    } else if (/\.(mp4|avi|mov|wmv|flv|webm)$/i.test(fileName)) {
      return "desktop_videofile";
    } else if (/\.(mp3|wav|ogg|flac|m4a)$/i.test(fileName)) {
      return "desktop_musicfile";
    }
  }
  
  return "desktop_docfile";
}

/**
 * Format speed (bytes per second) to human readable string
 * @param {Number} bytesPerSecond - Speed in bytes per second
 * @returns {String} Formatted speed string (e.g., "1.2 MB/s")
 */
function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond === 0) return "0 kbs";
  return filesize(bytesPerSecond, { round: 0 }) + "/s";
}

module.exports = {
  getFileIcon,
  formatSpeed
};

