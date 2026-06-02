const { filesize, dataTransfer } = require("@drumee/ui-essentials");
const __window_core = require("../core");

/**
 * @class __window_upload_progress
 * @extends __window_core
 * Window to display upload progress at bottom right of screen
 */
class __window_upload_progress extends __window_core {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
    this.toggleExpand = this.toggleExpand.bind(this);
    this.addUploadItem = this.addUploadItem.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
    this.completeUpload = this.completeUpload.bind(this);
    this.cancelAll = this.cancelAll.bind(this);
  }

  /**
   * Initialize class
   */
  static initClass() {
    this.prototype.figName = "window_upload_progress";
  }

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    
    // State management
    this._uploadItems = []; // Array of upload items: { id, file, progress, speed, status, queue }

    // Bundle staging state
    this._phase = "staging";          // "staging" | "progress"
    this._bundle = [];                // BundleEntry roots
    this._replaceExisting = false;    // bulk conflict policy (toggle in staging)
    this._bundleEntry = require("media/bundle/entry");
    this._bundleManager = require("media/bundle/manager");
    this._targetWindow = opt && opt.targetWindow ? opt.targetWindow : null; // folder window

    this._isExpanded = true;
    this._totalFiles = 0;
    this._fileProgressMap = {}; // Track progress for speed calculation
    this._pendingProgressUpdates = new Map(); // Queue progress updates when DOM not ready
    this._updateRetryCount = new Map(); // Track retry count to avoid infinite loops
    this._progressListeners = new Map(); // Store progress listeners for cleanup
    this._lastRenderedCount = 0; // Track last rendered item count to avoid unnecessary re-render
    this._lastRenderedStatuses = ""; // Track statuses signature

    this._detachQueueListener = (queue) => {
      if (queue && this._progressListeners && this._progressListeners.has(queue)) {
        const listener = this._progressListeners.get(queue);
        if (queue.off && typeof queue.off === 'function') {
          queue.off(_e.progress, listener);
        }
        this._progressListeners.delete(queue);
      }
    };
    
    // Set window position to bottom right corner
    const width = 360;
    const height = 280;
    this.size = {
      width: width,
      height: height,
      minWidth: 320,
      minHeight: 80,
    };
    
    // Position at bottom right, aligned with dock launcher
    // Dock launcher is at bottom: 60px, so we position window above it
    // Dock height is approximately 48-50px, so we add padding of ~20px = ~130px from bottom
    this.style.set({
      position: "fixed",
      right: 24,
      bottom: 130, // Aligned with dock launcher (60px dock bottom + ~70px height/padding)
      width: width,
      height: height,
      zIndex: 10000,
    });
    
    // Listen to global upload events
    this._setupGlobalListeners();
  }

  /**
   * Setup global listeners for upload events
   */
  _setupGlobalListeners() {
    // Listen to RADIO_MEDIA events for upload progress
    if (typeof RADIO_MEDIA !== 'undefined') {
      RADIO_MEDIA.on("upload:queue:created", this._onUploadQueueCreated.bind(this));
      RADIO_MEDIA.on("upload:start", this._onUploadStart.bind(this));
      RADIO_MEDIA.on("upload:progress", this._onUploadProgress.bind(this));
      RADIO_MEDIA.on("upload:end", this._onUploadEnd.bind(this));
      RADIO_MEDIA.on("upload:error", this._onUploadError.bind(this));
    }
  }

  /**
   * Handle upload queue created event
   * This receives upload information: queue, destination, token, etc.
   */
  _onUploadQueueCreated(data) {
    if (!data || !data.queue) return;
    
    
    // Store queue reference and setup progress tracking
    const queue = data.queue;
    
    // Listen to progress events from queue
    if (queue.on) {
      // Create progress handler that checks status before updating
      const progressHandler = (progressPercent) => {
        
        // Find current uploading file from queue
        let currentFile = null;
        let fileName = null;
        
        // Try to get from pendingItem first
        if (queue.pendingItem && queue.pendingItem.file) {
          currentFile = queue.pendingItem.file;
          fileName = currentFile.name;
        }
        // Fallback to xhr array - find active xhr
        else if (queue.xhr && queue.xhr.length > 0) {
          const activeXhrs = queue.xhr.filter(xhr => xhr.file && xhr.readyState < 4);
          if (activeXhrs.length > 0) {
            currentFile = activeXhrs[activeXhrs.length - 1].file;
            fileName = currentFile ? currentFile.name : null;
          } else {
            // Use last xhr if no active ones
            const lastXhr = queue.xhr[queue.xhr.length - 1];
            if (lastXhr && lastXhr.file) {
              currentFile = lastXhr.file;
              fileName = currentFile.name;
            }
          }
        }
        
        // If we found a file, check status before updating
        if (fileName) {
          const item = this._findUploadItem(fileName);
          // Skip if item is already completed, cancelled, or error
          if (item && (item.status === 'completed' || item.status === 'cancelled' || item.status === 'error')) {
            return;
          }
          
          // Skip if progress is already 100% - wait for completion
          if (item && item.progress >= 100) {
            return;
          }
          
          // Skip if progressPercent is 100% - wait for completion event
          if (progressPercent >= 100) {
            return;
          }
          
          // Calculate speed using instance-level map
          if (!this._fileProgressMap[fileName]) {
            this._fileProgressMap[fileName] = { lastProgress: 0, lastTime: Date.now() };
          }
          
          const now = Date.now();
          const deltaTime = Math.max(0.1, (now - this._fileProgressMap[fileName].lastTime) / 1000);
          const deltaProgress = progressPercent - this._fileProgressMap[fileName].lastProgress;
          
          let speed = 0;
          if (deltaTime > 0 && currentFile && currentFile.size && deltaProgress > 0) {
            const bytesProgressed = (currentFile.size * deltaProgress) / 100;
            speed = bytesProgressed / deltaTime;
          }
          
          // Only update progress map if not at 100%
          if (progressPercent < 100) {
            this._fileProgressMap[fileName].lastProgress = progressPercent;
            this._fileProgressMap[fileName].lastTime = now;
            
            this.updateProgress(fileName, progressPercent, speed);
          }
        } else {
          // No file found - update all uploading items in this queue (only if still uploading and not at 100%)
          if (progressPercent >= 100) {
            return;
          }
          
          this._uploadItems.forEach((item) => {
            if (item.status === 'uploading' && item.queue === queue && (item.progress || 0) < 100) {
              this.updateProgress(item.fileName, progressPercent, 0);
            }
          });
        }
      };
      
      // Store listener for cleanup
      this._progressListeners.set(queue, progressHandler);
      queue.on(_e.progress, progressHandler);
      
      // Listen to upload completion to clean up progress listener and mark as completed
      queue.once(_e.uploaded, (data) => {
        
        // Find the file that was uploaded
        let fileName = null;
        let result = data;
        
        // Try to get fileName from various sources
        if (queue.pendingItem && queue.pendingItem.file) {
          fileName = queue.pendingItem.file.name;
        } else if (queue.xhr && queue.xhr.length > 0) {
          const lastXhr = queue.xhr[queue.xhr.length - 1];
          if (lastXhr && lastXhr.file) {
            fileName = lastXhr.file.name;
          }
        }
        
        // Also try from data if available
        if (!fileName && data) {
          if (data.file && data.file.name) {
            fileName = data.file.name;
          } else if (data.name) {
            fileName = data.name;
          } else if (data.filename) {
            fileName = data.filename;
          }
        }
        
        // If we found a fileName, mark upload as completed
        if (fileName) {
          this.completeUpload(fileName, result);
        } else {
          // Try to find any uploading item in this queue and mark as completed
          const uploadingItem = this._uploadItems.find(item => 
            item.status === 'uploading' && item.queue === queue
          );
          if (uploadingItem) {
            this.completeUpload(uploadingItem.fileName, result);
          }
        }
        
        // Remove progress listener when upload completes
        if (queue.off && this._progressListeners.has(queue)) {
          const listener = this._progressListeners.get(queue);
          queue.off(_e.progress, listener);
          this._progressListeners.delete(queue);
        }
      });
      
      // Also clean up on queue destroy
      queue.once(_e.destroy, () => {
        if (this._progressListeners.has(queue)) {
          this._progressListeners.delete(queue);
        }
      });
    }
    
    // Store queue info for later use
    this._currentQueue = queue;
    this._currentQueueInfo = {
      destination: data.destination,
      token: data.token,
      echoId: data.echoId,
      isFolder: data.isFolder,
      media: data.media
    };
  }

  /**
   * Handle upload start event
   */
  _onUploadStart(data) {
    if (!data || !data.file) {
      // Try to extract file from opt
      if (data && data.opt && data.opt.file) {
        data.file = data.opt.file;
      } else {
        return;
      }
    }
    
    // Get or create upload progress window and add item
    // Queue might not be available yet, so we'll add it later when upload actually starts
    const file = data.file;
    const fileName = file.name || data.fileName || data.opt?.filename || "Unknown file";
    const fileSize = file.size || data.fileSize || data.opt?.size || 0;
    
    // Create a placeholder file object if needed
    if (!file.name && fileName) {
      file.name = fileName;
    }
    if (!file.size && fileSize) {
      file.size = fileSize;
    }
    
    // Add item to window (queue will be set later when upload actually starts)
    this.addUploadItem(file, data.queue || null);
  }

  /**
   * Handle upload progress event
   */
  _onUploadProgress(data) {
    if (!data || !data.file) return;
    this.updateProgress(data.file.name || data.file.filename, data.progress || 0, data.speed || 0);
  }

  /**
   * Handle upload end event
   */
  _onUploadEnd(data) {
    if (!data || !data.file) return;
    this.completeUpload(data.file.name || data.file.filename, data.result);
  }

  /**
   * Handle upload error event
   */
  _onUploadError(data) {
    if (!data || !data.file) return;
    // Mark as failed
    this.updateUploadStatus(data.file.name || data.file.filename, "error");
  }

  /**
   * Add a new upload item to the list
   * @param {File} file - File being uploaded
   * @param {*} queue - Upload queue instance (optional)
   */
  addUploadItem(file, queue = null) {
    if (!file) return;
    
    const fileName = file.name || file.filename || "Unknown file";
    const fileId = `${fileName}-${Date.now()}`;
    
    
    // Check if file already exists
    const existingIndex = this._uploadItems.findIndex(item => item.fileName === fileName && item.status === 'uploading');
    if (existingIndex >= 0) {
      return; // Already tracking this file
    }
    
    const uploadItem = {
      id: fileId,
      fileName: fileName,
      file: file,
      progress: 0,
      speed: 0, // bytes per second
      status: 'uploading', // 'uploading', 'completed', 'error', 'cancelled'
      queue: queue,
      startTime: Date.now(),
      fileSize: file.size || 0,
      
      // Visibility options - will be set by _prepareFileItemOptions
      showIcon: true,
      showName: true,
      showSpeed: false,
      showProgress: true,
      showCheck: false,
      showCancel: true,
      showCancelled: false,
      showError: false,
    };
    
    this._uploadItems.push(uploadItem);
    this._totalFiles = this._uploadItems.length;
    
    
    // Show window if hidden - do this even if DOM not ready yet
    if (this.el) {
      // Safely call raise() if it exists (for window_core/interact windows)
      if (typeof this.raise === 'function') {
        this.raise();
      } else if (window.Wm && window.Wm.onUiEvent) {
        // Fallback: trigger raise via window manager
        this.triggerMethod && this.triggerMethod("raise");
      }
      this.el.style.display = '';
    } else {
    }
    
    // Refresh UI - if DOM not ready, it will be refreshed in onDomRefresh
    if (this.el) {
      this._refreshUI();
    } else {
      // DOM not ready yet - items will be rendered when onDomRefresh is called
    }
  }

  /**
   * Find upload item by file name (with fuzzy matching)
   * @param {String} fileName - File name (may be encoded or decoded)
   * @param {Boolean} allowAnyStatus - If true, don't filter by status (default: false, only finds 'uploading' items)
   * @returns {Object|null}
   */
  _findUploadItem(fileName, allowAnyStatus = false) {
    if (!fileName) return null;
    
    // Normalize filename: try to decode if encoded
    let normalizedFileName = fileName;
    try {
      // Try to decode if it looks encoded
      if (fileName.includes('%')) {
        normalizedFileName = decodeURIComponent(fileName);
      }
    } catch (e) {
      // If decode fails, use original
      normalizedFileName = fileName;
    }
    
    // Helper function to normalize a filename for comparison
    const normalizeForCompare = (name) => {
      if (!name) return '';
      try {
        if (name.includes('%')) {
          return decodeURIComponent(name);
        }
      } catch (e) {}
      return name;
    };
    
    // Exact match first (both encoded and decoded)
    let item = this._uploadItems.find(item => {
      const matches = item.fileName === fileName || 
                     item.fileName === normalizedFileName ||
                     normalizeForCompare(item.fileName) === normalizedFileName ||
                     normalizeForCompare(item.fileName) === fileName;
      if (!matches) return false;
      return allowAnyStatus || item.status === 'uploading';
    });
    if (item) return item;
    
    // Try matching by basename (without path)
    const basename = normalizedFileName.split('/').pop().split('\\').pop();
    item = this._uploadItems.find(item => {
      const itemBasename = item.fileName.split('/').pop().split('\\').pop();
      const itemBasenameNormalized = normalizeForCompare(itemBasename);
      const basenameNormalized = normalizeForCompare(basename);
      
      const matches = itemBasename === basename || 
                     itemBasename === basenameNormalized ||
                     itemBasenameNormalized === basename ||
                     itemBasenameNormalized === basenameNormalized;
      
      if (!matches) return false;
      return allowAnyStatus || item.status === 'uploading';
    });
    if (item) return item;
    
    // Try case-insensitive match
    item = this._uploadItems.find(item => {
      const itemNameNormalized = normalizeForCompare(item.fileName);
      const fileNameNormalized = normalizeForCompare(normalizedFileName);
      
      const matches = itemNameNormalized.toLowerCase() === fileNameNormalized.toLowerCase();
      if (!matches) return false;
      return allowAnyStatus || item.status === 'uploading';
    });
    
    return item || null;
  }

  /**
   * Update progress for an upload item
   * @param {String} fileName
   * @param {Number} progress - 0-100
   * @param {Number} speed - bytes per second
   */
  updateProgress(fileName, progress, speed) {
    const item = this._findUploadItem(fileName);
    if (!item) {
      return;
    }
    
    // Don't update progress for completed, cancelled, or error items
    if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'error') {
      return;
    }
    
    // Get current progress
    const currentProgress = item.progress || 0;
    
    
    // If progress reaches 100%, mark as completed immediately and update UI
    if (progress >= 100) {
      item.progress = 100;
      item.speed = speed || 0;
      
      // Update status to completed immediately so UI shows checked icon
      const wasCompleted = item.status === 'completed';
      if (!wasCompleted) {
        item.status = 'completed';
      }
      
      // Set visibility options for completed status
      item.showIcon = true;
      item.showName = true;
      item.showSpeed = false;
      item.showProgress = false;
      item.showCheck = true;
      item.showCancel = false;
      item.showCancelled = false;
      item.showError = false;
      
      // Force re-render file list immediately to show checkmark icon
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
      }
      
      // Refresh UI (this will also update other parts like footer)
      this._refreshUI();
      
      // Also update estimated time
      if (this._isExpanded) {
        this._updateEstimatedTime();
      }
      
      return; // Don't continue with normal progress update
    }
    
    // Normal progress update (0-99.99%)
    const newProgress = Math.min(99.99, Math.max(0, progress));
    item.progress = newProgress;
    item.speed = speed || 0;
    
    // Update visibility options for uploading state
    item.showIcon = true;
    item.showName = true;
    item.showSpeed = (speed || 0) > 0;
    item.showProgress = true;
    item.showCheck = false;
    item.showCancel = true;
    item.showCancelled = false;
    item.showError = false;
    
    // Update DOM directly for better performance
    this._updateItemInDOM(fileName);
    
    // Also update estimated time
    if (this._isExpanded) {
      this._updateEstimatedTime();
    }
  }
  
  /**
   * Update a single item in DOM without re-rendering entire list
   * @param {String} fileName
   */
  _updateItemInDOM(fileName) {
    if (!this.el) {
      return; // Silently skip if DOM not ready
    }
    
    const item = this._findUploadItem(fileName);
    if (!item) {
      return; // Silently skip if item not found
    }
    
    // Skip DOM updates for completed, cancelled, or error items
    // These should be handled by re-rendering the file list
    if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'error') {
      // Always re-render file list for completed/cancelled/error items to show correct UI
        const fileListPart = this.findPart("file-list");
        if (fileListPart) {
          this._renderFileList(fileListPart);
      }
      // Clear retry count for completed/cancelled/error items
      if (this._updateRetryCount && this._updateRetryCount.has(fileName)) {
        this._updateRetryCount.delete(fileName);
      }
      return;
    }
    
    // Find the file item element in DOM - try multiple methods
    let fileListContainer = null;
    
    // Only try to find elements if window is expanded
    if (this._isExpanded) {
      // Method 1: Try to find via findPart (more reliable)
      const fileListPart = this.findPart("file-list");
      if (fileListPart && fileListPart.el) {
        fileListContainer = fileListPart.el;
      }
      
      // Method 2: Try to find via querySelector with different class names
      if (!fileListContainer && this.el) {
        fileListContainer = this.el.querySelector(`.${this.fig.family}__file-list`) ||
                           this.el.querySelector(`[data-partname="file-list"]`);
      }
    }
    
    // If window is collapsed or container not found, queue update
    if (!this._isExpanded || !fileListContainer) {
      // Queue update for when window is expanded or DOM is ready
      if (!this._pendingProgressUpdates) {
        this._pendingProgressUpdates = new Map();
      }
      this._pendingProgressUpdates.set(fileName, { progress: item.progress, speed: item.speed });
      return;
    }
    
    // Find item by dataset.fileName (try exact match, then fuzzy match)
    let itemEl = null;
    const allItems = fileListContainer.querySelectorAll(`.${this.fig.family}__file-item`);
    
    for (let el of allItems) {
      const elFileName = el.dataset.fileName;
      if (elFileName === fileName || 
          elFileName === decodeURIComponent(fileName) ||
          decodeURIComponent(elFileName) === fileName ||
          elFileName?.toLowerCase() === fileName?.toLowerCase()) {
        itemEl = el;
        break;
      }
    }
    
    // If item element not found, queue update and trigger render if needed
    if (!itemEl) {
      // Queue this update for later processing
      if (!this._pendingProgressUpdates) {
        this._pendingProgressUpdates = new Map();
      }
      this._pendingProgressUpdates.set(fileName, { progress: item.progress, speed: item.speed });
      
      // Try to trigger render to ensure item is in DOM
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
        // Retry update after a short delay to allow DOM to render
        setTimeout(() => {
          this._updateItemInDOM(fileName);
        }, 50);
      }
      return;
    }
    
    // Clear retry count when item element is found
    if (this._updateRetryCount && this._updateRetryCount.has(fileName)) {
      this._updateRetryCount.delete(fileName);
    }
    
    // Clear pending update for this file since we're updating now
    if (this._pendingProgressUpdates && this._pendingProgressUpdates.has(fileName)) {
      this._pendingProgressUpdates.delete(fileName);
    }
    
    // Update status attribute
    itemEl.dataset.status = item.status;

    // Ensure file name text is visible
    const nameEl = itemEl.querySelector(`.${this.fig.family}__file-item-name`);
    if (nameEl) {
      nameEl.textContent = item.fileName || item.file?.name || item.file?.filename || nameEl.textContent;
      nameEl.style.display = '';
    }
    // Ensure progress wrapper is visible when uploading
    const progressWrapper = itemEl.querySelector(`.${this.fig.family}__file-item-progress-wrapper`);
    if (progressWrapper && item.status === 'uploading') {
      progressWrapper.style.display = '';
    }
    // Update percent text
    const percentEl = itemEl.querySelector(`.${this.fig.family}__file-item-percent`);
    if (percentEl) {
      percentEl.textContent = `${Math.round(item.progress || 0)}%`;
      percentEl.style.display = '';
    }
    // Update size text (static)
    const sizeEl = itemEl.querySelector(`.${this.fig.family}__file-item-size`);
    if (sizeEl && item.fileSize) {
      sizeEl.textContent = filesize(item.fileSize);
      sizeEl.style.display = '';
    }
    
    // Update progress bar if uploading
    if (item.status === 'uploading') {
      // Calculate progress percent once
      const progressPercent = Math.round(item.progress);
      
      // Update progress bar fill - try multiple methods to find element
      let progressFill = null;
      
      // Find progress fill element - try multiple methods
      const normalizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
      const partName = `progress-fill-${normalizedFileName}`;
      
      // Method 1: Find via progress wrapper and progress bar container (most reliable)
      const progressWrapper = itemEl.querySelector(`.${this.fig.family}__file-item-progress-wrapper`);
      if (progressWrapper) {
        const progressBar = progressWrapper.querySelector(`.${this.fig.family}__file-item-progress-bar`);
        if (progressBar) {
          // Try data-partname first
          progressFill = progressBar.querySelector(`[data-partname="${partName}"]`);
          
          // Try className
          if (!progressFill) {
            progressFill = progressBar.querySelector(`.${this.fig.family}__file-item-progress-fill`);
          }
          
          // Try class contains progress-fill
          if (!progressFill) {
            progressFill = progressBar.querySelector('[class*="progress-fill"]');
          }
          
          // Try finding any div child of progressBar
          if (!progressFill) {
            const allDivs = progressBar.querySelectorAll('div');
            for (let div of allDivs) {
              if (div.classList.contains(`${this.fig.family}__file-item-progress-fill`) ||
                  div.dataset.partname === partName ||
                  div.className.includes('progress-fill')) {
                progressFill = div;
                break;
              }
            }
          }
        }
      }
      
      // Method 2: Find by data-partname directly within itemEl
      if (!progressFill) {
        progressFill = itemEl.querySelector(`[data-partname="${partName}"]`);
      }
      
      // Method 3: Find by className within itemEl
      if (!progressFill) {
        progressFill = itemEl.querySelector(`.${this.fig.family}__file-item-progress-fill`);
      }
      
      // Method 4: Find any element with progress-fill in class within itemEl
      if (!progressFill) {
        progressFill = itemEl.querySelector('[class*="progress-fill"]');
      }
      
      // Method 5: Find by iterating all elements in itemEl
      if (!progressFill) {
        const allElements = itemEl.querySelectorAll('*');
        for (let el of allElements) {
          if (el.dataset && el.dataset.partname === partName) {
            progressFill = el;
            break;
          }
          if (el.className && (
            el.className.includes(`${this.fig.family}__file-item-progress-fill`) ||
            el.className.includes('progress-fill')
          )) {
            progressFill = el;
            break;
          }
        }
      }
      
      if (progressFill) {
        // Update progress bar fill directly for realtime updates
        const widthValue = `${progressPercent}%`;
        
        // Update immediately for realtime updates
        progressFill.style.width = widthValue;
        progressFill.style.setProperty('width', widthValue, 'important');
        progressFill.style.display = 'block';
        progressFill.style.setProperty('display', 'block', 'important');
        progressFill.style.setProperty('flex', 'none', 'important');
        
        // Force browser reflow to apply changes immediately
        void progressFill.offsetWidth;
      } else {
        // If progress fill not found, queue update and trigger re-render
        if (!this._pendingProgressUpdates) {
          this._pendingProgressUpdates = new Map();
        }
        this._pendingProgressUpdates.set(fileName, { progress: item.progress, speed: item.speed });
        
        // Trigger re-render to ensure progress fill is in DOM
        const fileListPart = this.findPart("file-list");
        if (fileListPart) {
          this._renderFileList(fileListPart);
          // Retry update after a short delay
          setTimeout(() => {
            this._updateItemInDOM(fileName);
          }, 50);
        }
      }
      
      // Update speed text
      const speedEl = itemEl.querySelector(`.${this.fig.family}__file-item-speed`);
      if (speedEl) {
        const { formatSpeed } = require('./skeleton/helpers');
        speedEl.textContent = formatSpeed(item.speed || 0);
        speedEl.style.display = (item.speed || 0) > 0 ? '' : 'none';
      }
      // Ensure cancel button visible when uploading
      const cancelEl = itemEl.querySelector(`.${this.fig.family}__file-item-cancel`);
      if (cancelEl) {
        cancelEl.style.display = '';
      }
      
      // Update file size text
      const sizeEl = itemEl.querySelector(`.${this.fig.family}__file-item-size`);
      if (sizeEl && item.fileSize) {
        const { filesize } = require("@drumee/ui-essentials");
        sizeEl.textContent = filesize(item.fileSize);
      }
      
      // Show progress wrapper if hidden
      if (progressWrapper) {
        progressWrapper.style.display = '';
      }
    } else if (item.status === 'completed') {
      // Update dataset for clickable
      itemEl.dataset.clickable = "1";
      itemEl.dataset.status = 'completed';
      
      // Hide progress bar if still visible
      const progressWrapper = itemEl.querySelector(`.${this.fig.family}__file-item-progress-wrapper`);
      if (progressWrapper) {
        progressWrapper.style.display = 'none';
      }
      
      // Hide cancel button if still visible
      const cancelButton = itemEl.querySelector(`.${this.fig.family}__file-item-cancel`);
      if (cancelButton) {
        cancelButton.style.display = 'none';
      }
      
      // Re-render file list to show checkmark and hide cancel/progress
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
      }
      
    } else if (item.status === 'cancelled' || item.status === 'error') {
      // Re-render to update UI for cancelled/error state
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
      }
    }
  }

  /**
   * Mark upload as completed
   * @param {String} fileName
   * @param {*} result - Upload result data
   */
  completeUpload(fileName, result) {
    
    // Try to find item - allow any status except cancelled to handle edge cases
    let item = this._findUploadItem(fileName, true);
    
    // If not found, try to find by matching file object if result has file info
    if (!item && result) {
      if (result.name) {
        item = this._findUploadItem(result.name, true);
      }
      if (!item && result.filename) {
        item = this._findUploadItem(result.filename, true);
      }
    }
    
    // If still not found, try all items and find by file object reference
    if (!item && this._uploadItems.length > 0) {
      // Try to match by file size if available
      if (result && result.size) {
        item = this._uploadItems.find(item => 
          item.file && item.file.size === result.size && 
          (item.status === 'uploading' || !item.status || item.status === 'pending')
        );
      }
    }
    
    if (!item) {
      return;
    }
    
    
    // Update item status and options
    const oldStatus = item.status;
    item.status = 'completed';
    item.progress = 100;
    item.result = result;
    
    // Set visibility options for completed status
    item.showIcon = true;
    item.showName = true;
    item.showSpeed = false;
    item.showProgress = false;
    item.showCheck = true;
    item.showCancel = false;
    item.showCancelled = false;
    item.showError = false;
    
    
    // Force expand window to show completed status if collapsed
    if (!this._isExpanded) {
      this._isExpanded = true;
    }
    
    // Clear any pending updates for this file since it's now completed
    if (this._pendingProgressUpdates && this._pendingProgressUpdates.has(item.fileName)) {
      this._pendingProgressUpdates.delete(item.fileName);
    }
    
    // Clear retry count for this file
    if (this._updateRetryCount && this._updateRetryCount.has(item.fileName)) {
      this._updateRetryCount.delete(item.fileName);
    }
    
    // Remove progress listener for this queue if item has queue
    if (item.queue && this._progressListeners && this._progressListeners.has(item.queue)) {
      const listener = this._progressListeners.get(item.queue);
      if (item.queue.off && typeof item.queue.off === 'function') {
        item.queue.off(_e.progress, listener);
        this._progressListeners.delete(item.queue);
      }
    }
    
    // Force re-render file list immediately to show checkmark and hide cancel
    // This ensures the UI is updated with the new status
    const fileListPart = this.findPart("file-list");
    if (fileListPart) {
      this._renderFileList(fileListPart);
    }
    
    // Update UI (this will also refresh other parts)
    this._refreshUI();
    
    // Also force re-render after a short delay to ensure DOM is fully ready
    setTimeout(() => {
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
      }
    }, 50);
    
    // One more re-render after longer delay to ensure it sticks
    setTimeout(() => {
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
      }
    }, 200);
    
    
    // Auto-close after a delay if all uploads are complete
    _.delay(() => {
      const allComplete = this._uploadItems.every(item => item.status === 'completed' || item.status === 'error');
      if (allComplete) {
        _.delay(() => {
          if (this._uploadItems.every(item => item.status === 'completed' || item.status === 'error')) {
            // Optionally close after delay
            // this.goodbye();
          }
        }, 3000);
      }
    }, 500);
  }

  /**
   * Update upload status
   * @param {String} fileName
   * @param {String} status
   */
  updateUploadStatus(fileName, status) {
    // Use fuzzy finder to handle encoded/decoded names
    const item = this._findUploadItem(fileName, true);
    if (!item) return;
    
    item.status = status;
    
    // Set visibility options based on status
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';
    const isError = status === 'error';
    const isUploading = status === 'uploading' && (item.progress || 0) < 100;
    
    item.showIcon = true;
    item.showName = true;
    item.showSpeed = isUploading && (item.speed || 0) > 0;
    item.showProgress = isUploading;
    item.showCheck = isCompleted;
    item.showCancel = isUploading;
    item.showCancelled = isCancelled;
    item.showError = isError;
    
    this._refreshUI();
  }

  /**
   * Cancel all uploads
   */
  cancelAll() {
    // Cancel all active uploads
    this._uploadItems.forEach(item => {
      if (item.status === 'uploading') {
        if (item.queue) {
          if (item.queue.isCanceled && typeof item.queue.isCanceled === 'function') {
            item.queue.isCanceled() || (item.queue._canceled = true);
          }
          if (item.queue.trigger) {
            item.queue.trigger(_e.cancel);
          }
          this._detachQueueListener(item.queue);
        }
        item.status = 'cancelled';
        // Visibility for cancelled uploading items
        item.showIcon = true;
        item.showName = true;
        item.showSpeed = false;
        item.showProgress = false;
        item.showCheck = false;
        item.showCancel = false;
        item.showCancelled = true;
        item.showError = false;
      } else if (item.status === 'completed') {
        // Keep completed items intact
        item.status = 'completed';
        item.progress = Math.max(item.progress || 0, 100);
        item.showIcon = true;
        item.showName = true;
        item.showSpeed = false;
        item.showProgress = false;
        item.showCheck = true;
        item.showCancel = false;
        item.showCancelled = false;
        item.showError = false;
      }
    });
    
    this._refreshUI();
    
    // Close window after delay
    _.delay(() => {
      this.goodbye();
    }, 500);
  }

  /**
   * Cancel single upload
   * @param {String} fileName
   */
  cancelUpload(fileName) {
    // Use fuzzy finder to handle encoded/decoded names
    const item = this._findUploadItem(fileName, true);
    if (!item) return;
    
    if (item.status === 'uploading' && item.queue) {
      if (item.queue.isCanceled && typeof item.queue.isCanceled === 'function') {
        item.queue.isCanceled() || (item.queue._canceled = true);
      }
      if (item.queue.trigger) {
        item.queue.trigger(_e.cancel);
      }
      this._detachQueueListener(item.queue);
    }
    
    item.status = 'cancelled';
    
    // Set visibility options for cancelled status
    item.showIcon = true;
    item.showName = true;
    item.showSpeed = false;
    item.showProgress = false;
    item.showCheck = false;
    item.showCancel = false;
    item.showCancelled = true;
    item.showError = false;
    
    this._refreshUI();
  }

  /**
   * Toggle expand/collapse
   */
  toggleExpand() {
    this._isExpanded = !this._isExpanded;
    this._refreshUI();
    
    // When expanding, process any pending updates immediately
    if (this._isExpanded && this._pendingProgressUpdates && this._pendingProgressUpdates.size > 0) {
      setTimeout(() => {
        // Update all pending items
        this._pendingProgressUpdates.forEach((data, fileName) => {
          const item = this._findUploadItem(fileName);
          if (item) {
            item.progress = data.progress;
            item.speed = data.speed;
            this._updateItemInDOM(fileName);
          }
        });
      }, 150);
    }
  }

  /**
   * Handle click on upload item (when completed)
   * @param {String} fileName
   */
  onItemClick(fileName) {
    const item = this._uploadItems.find(item => item.fileName === fileName);
    if (!item || item.status !== 'completed') return;
    
    // Handle click - could open file viewer or navigate to file location
    if (item.result && item.result.nid) {
      // Navigate to file or open viewer
      // You can emit event or trigger navigation here
      if (this.triggerHandlers) {
        this.triggerHandlers({ 
          data: item.result, 
          service: "open-uploaded-file" 
        });
      }
    }
  }

  /**
   * Refresh UI
   */
  _refreshUI() {
    if (!this.el) return;
    
    // Update file count
    this._totalFiles = this._uploadItems.length;
    const activeCount = this._uploadItems.filter(item => item.status === 'uploading').length;
    
    // Update title
    const titlePart = this.findPart("upload-title");
    if (titlePart) {
      const count = activeCount || this._totalFiles;
      titlePart.set({ 
        content: `${LOCALE.UPLOADING || "Uploading"} ${count} ${count === 1 ? LOCALE.FILE || "file" : LOCALE.FILES || "files"}` 
      });
    }
    
    // Update expand state on container
    const container = this.el.querySelector(`.${this.fig.family}__container`);
    if (container) {
      container.dataset.expanded = this._isExpanded ? "1" : "0";
    } else {
    }
    // Also update on root element for CSS
    if (this.el) {
      this.el.dataset.expanded = this._isExpanded ? "1" : "0";
      
      // CSS will handle height changes via data-expanded attribute
    }
    
    // Update file list.
    // Avoid full re-render for plain progress ticks: only re-render when:
    // - expanded, AND (item count changed OR has completed/cancelled/error)
    // - or window was not rendered yet
    const hasCompletedItems = this._uploadItems.some(item => item.status === 'completed');
    const hasUploadingItems = this._uploadItems.some(item => item.status === 'uploading');
    const hasCancelledOrError = this._uploadItems.some(item => item.status === 'cancelled' || item.status === 'error');
    const countChanged = this._uploadItems.length !== this._lastRenderedCount;
    const statusesSignature = this._uploadItems.map(i => i.status).join('|');
    const statusesChanged = statusesSignature !== this._lastRenderedStatuses;
    const needRender =
      (this._isExpanded && (countChanged || hasCompletedItems || hasCancelledOrError || hasUploadingItems || !this._lastRenderedCount || statusesChanged))
      || (!this._isExpanded && (hasCompletedItems || hasUploadingItems));

    if (needRender) {
      const fileListPart = this.findPart("file-list");
      if (fileListPart) {
        this._renderFileList(fileListPart);
      }
    }
    
    // Update estimated time (only when expanded)
    if (this._isExpanded) {
      this._updateEstimatedTime();
    }
    
    // Update footer action button (only update footer, do NOT trigger file list re-render)
    // This is safe to call even when items are completed - it only updates footer button
    this._refreshFooter();
    
    // Process any pending progress updates after UI refresh
    if (this._pendingProgressUpdates && this._pendingProgressUpdates.size > 0) {
      // Use setTimeout to ensure DOM is fully rendered before applying updates
      setTimeout(() => {
        this._pendingProgressUpdates.forEach((data, fileName) => {
          const item = this._findUploadItem(fileName);
          if (item) {
            // Update item state first
            item.progress = data.progress;
            item.speed = data.speed;
            // Then update DOM
            this._updateItemInDOM(fileName);
          }
        });
        // Clear pending updates after processing
        this._pendingProgressUpdates.clear();
      }, 100);
    }
  }

  /**
   * Prepare file item options based on status and state
   * @param {Object} item - Upload item
   * @returns {Object} Item with visibility options set
   */
  _prepareFileItemOptions(item) {
    // Ensure status is set correctly
    const rawStatus = item.status;
    if (rawStatus === 'completed') {
      item.status = 'completed';
      item.progress = Math.max(item.progress || 0, 100);
    } else if (!rawStatus && item.progress >= 100) {
      item.status = 'completed';
      item.progress = 100;
    } else if (!rawStatus || rawStatus === 'pending') {
      item.status = 'uploading';
    }
    
    // Set visibility options based on status
    const isCompleted = item.status === 'completed';
    const isCancelled = item.status === 'cancelled';
    const isError = item.status === 'error';
    const isUploading = item.status === 'uploading' && (item.progress || 0) < 100;
    
    // Set visibility flags freshly each time to avoid stale state
    item.showIcon = true; // Always show icon
    item.showName = true; // Always show name
    item.showSpeed = isUploading && (item.speed || 0) > 0; // Show speed only when uploading with speed > 0
    item.showProgress = isUploading; // Show progress bar only when uploading
    item.showCheck = isCompleted; // Show check icon only when completed
    item.showCancel = isUploading; // Show cancel button only when uploading
    item.showCancelled = isCancelled; // Show cancelled text only when cancelled
    item.showError = isError; // Show error text only when error
    
    return item;
  }

  /**
   * Render file list
   * @param {*} listPart
   */
  _renderFileList(listPart) {
    if (!listPart || !listPart.softClear) return;
    
    // Clear existing items
    listPart.softClear();
    
    // Create and add file items
    // IMPORTANT: Prepare item options before creating skeleton
    const fileItems = this._uploadItems.map(item => {
      // Prepare item with correct options
      const preparedItem = this._prepareFileItemOptions({ ...item });
      return this._createFileItemSkeleton(preparedItem);
    }).filter(Boolean);
    
    if (fileItems.length > 0) {
      listPart.feed(fileItems);
      this._lastRenderedCount = this._uploadItems.length;
      this._lastRenderedStatuses = this._uploadItems.map(i => i.status).join('|');
    } else {
      this._lastRenderedCount = 0;
      this._lastRenderedStatuses = "";
    }
  }

  /**
   * Create file item skeleton
   * @param {Object} item
   */
  _createFileItemSkeleton(item) {
    const createFileItem = require('./skeleton/file-item');
    return createFileItem(this, item);
  }

  /**
   * Refresh footer action button (Cancel All / Close)
   * This method only updates footer, does NOT trigger file list re-render
   */
  _refreshFooter() {
    const actionPart = this.findPart("footer-action");
    if (!actionPart) return;
    
    const uploadItems = this._uploadItems || [];
    const hasUploading = uploadItems.some(item => item.status === 'uploading');
    const allCompleted = uploadItems.length > 0 && uploadItems.every(item => 
      item.status === 'completed' || item.status === 'cancelled' || item.status === 'error'
    );
    
    // Update button text and service
    const newContent = allCompleted ? (LOCALE.CLOSE || "Close") : (LOCALE.CANCEL_ALL || "Cancel all");
    const newService = allCompleted ? "close" : "cancel-all";
    const newClassName = allCompleted ? `${this.fig.family}__close` : `${this.fig.family}__cancel-all`;
    
    // Only update if content or service has changed to avoid unnecessary DOM updates
    if (actionPart.el) {
      const currentContent = actionPart.el.textContent?.trim();
      const currentService = actionPart.el.dataset?.service || actionPart.el.getAttribute?.('service');
      
      // Update content only if changed
      if (currentContent !== newContent) {
        actionPart.set({ content: newContent });
      }
      
      // Update element attributes only if changed
      if (actionPart.el.className !== newClassName) {
        actionPart.el.className = newClassName;
      }
      
      if (currentService !== newService) {
        // Set service attribute using both methods
        if (typeof _a !== 'undefined' && _a.service) {
          actionPart.el.setAttribute(_a.service, newService);
        } else {
          actionPart.el.setAttribute('service', newService);
        }
        if (actionPart.el.dataset) {
          actionPart.el.dataset.service = newService;
        }
      }
    } else {
      // If element not ready, just update the part
      actionPart.set({ content: newContent });
    }
  }

  /**
   * Update estimated time display
   */
  _updateEstimatedTime() {
    const timePart = this.findPart("estimated-time");
    if (!timePart) return;
    
    const uploadingItems = this._uploadItems.filter(item => item.status === 'uploading');
    if (uploadingItems.length === 0) {
      timePart.el.style.display = 'none';
      return;
    }
    
    // Calculate estimated time based on remaining bytes and average speed
    let totalRemaining = 0;
    let totalSpeed = 0;
    
    uploadingItems.forEach(item => {
      const remaining = item.fileSize * (1 - item.progress / 100);
      totalRemaining += remaining;
      totalSpeed += item.speed || 0;
    });
    
    if (totalSpeed > 0) {
      const secondsRemaining = Math.ceil(totalRemaining / totalSpeed);
      const minutes = Math.floor(secondsRemaining / 60);
      
      let timeText;
      if (minutes >= 1) {
        timeText = `${LOCALE.LESS_THAN || "Less than"} ${minutes} ${minutes === 1 ? LOCALE.MINUTE || "minute" : LOCALE.MINUTES || "minutes"} ${LOCALE.LEFT || "left"}`;
      } else {
        timeText = LOCALE.LESS_THAN_A_MINUTE_LEFT || "Less than a minute left";
      }
      
      timePart.set({ content: timeText });
    } else {
      timePart.set({ content: LOCALE.LESS_THAN_A_MINUTE_LEFT || "Less than a minute left" });
    }
    
    timePart.el.style.display = '';
  }

  /**
   * Get upload items for rendering
   */
  getUploadItems() {
    return this._uploadItems;
  }

  /**
   *
   */
  onDomRefresh() {
    const skeletonFn = require("./skeleton");
    this.feed(typeof skeletonFn === 'function' ? skeletonFn(this) : skeletonFn.default(this));
    
    // Call raise() if it exists (for window_core/interact windows)
    if (typeof this.raise === 'function') {
      this.raise();
    } else if (window.Wm && window.Wm.onUiEvent) {
      // Fallback: trigger raise via window manager
      this.triggerMethod && this.triggerMethod("raise");
    }
    
    // Wait for DOM to be ready before refreshing UI
    this.waitElement(this.el, () => {
      // Render any items that were added before DOM was ready
      if (this.el) {
        this.el.style.display = '';
      }
      this._refreshUI();
      
      // Apply any pending progress updates after UI refresh
      if (this._pendingProgressUpdates && this._pendingProgressUpdates.size > 0) {
        setTimeout(() => {
          this._pendingProgressUpdates.forEach((data, fileName) => {
            const item = this._findUploadItem(fileName);
            if (item) {
              item.progress = data.progress;
              item.speed = data.speed;
              this._updateItemInDOM(fileName);
            }
          });
          this._pendingProgressUpdates.clear();
        }, 100);
      }
    });
  }

  /**
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    if (pn === "fileselector") {
      // files picker change -> add as root files
      child.el.querySelector("input").onchange = (e) => {
        const roots = this._bundleEntry.entriesFromFileList(e.target.files);
        this._addToBundle(roots);
        e.target.value = "";
      };
      // build a sibling folder picker once
      if (!this._dirInput) {
        const inp = document.createElement("input");
        inp.type = "file"; inp.webkitdirectory = true; inp.multiple = true;
        inp.style.display = "none";
        inp.onchange = (e) => {
          const roots = this._bundleEntry.entriesFromFileList(e.target.files);
          this._addToBundle(roots);
          e.target.value = "";
        };
        child.el.appendChild(inp);
        this._dirInput = inp;
        this._filesInput = child.el.querySelector("input");
      }
      return;
    }
    if (pn === "staging") {
      const el = child.el;
      el.addEventListener("dragover", (e) => { e.preventDefault(); el.dataset.over = "1"; });
      el.addEventListener("dragleave", () => { el.dataset.over = "0"; });
      el.addEventListener("drop", async (e) => {
        e.preventDefault(); e.stopPropagation(); el.dataset.over = "0";
        const transfer = dataTransfer({ type: _e.drop, originalEvent: e });
        const roots = await this._bundleEntry.entriesFromDataTransfer(transfer);
        this._addToBundle(roots);
      });
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  _addToBundle(roots) {
    // merge roots into this._bundle by name (folders merge, files append)
    for (const r of roots) this._mergeEntry(this._bundle, r);
    this._renderStaging();
  }

  _mergeEntry(list, entry) {
    if (entry.kind === "folder") {
      let existing = list.find((e) => e.kind === "folder" && e.name === entry.name);
      if (!existing) { list.push(entry); return; }
      for (const c of entry.children) this._mergeEntry(existing.children, c);
      existing.size = this._bundleEntry.computeSize(existing.children);
    } else {
      list.push(entry);
    }
  }

  _renderStaging() {
    const total = this._bundleEntry.countSize(this._bundle);
    const fileCount = this._countBundleFiles(this._bundle);
    this.ensurePart("staging-summary").then((p) =>
      p.set({ content: `${fileCount} ${LOCALE.FILES || "files"} · ${filesize(total)}` }));
    this.ensurePart("staging-list").then((list) => {
      if (list.empty) list.empty();
      list.feed(this._stagingRows(this._bundle, 0));
    });
  }

  _countBundleFiles(list) {
    let n = 0;
    for (const e of list) n += e.kind === "file" ? 1 : this._countBundleFiles(e.children);
    return n;
  }

  _stagingRows(list, depth) {
    const pfx = this.fig.family;
    const rows = [];
    for (const e of list) {
      rows.push(Skeletons.Box.X({
        className: `${pfx}__staging-row`,
        dataset: { kind: e.kind, depth },
        kids: [
          Skeletons.Note({ className: `${pfx}__staging-name`, content: e.name }),
          Skeletons.Note({
            className: `${pfx}__staging-remove`, content: "✕",
            service: `remove:${e.id}`, uiHandler: [this],
          }),
        ],
      }));
      if (e.kind === "folder" && e.children.length) {
        rows.push(...this._stagingRows(e.children, depth + 1));
      }
    }
    return rows;
  }

  _startBundle() {
    if (!this._bundle.length) return;
    const target = this._targetWindow;
    const destNid = target ? target.getCurrentNid() : Visitor.get(_a.home_id);
    const hub_id = target ? target.mget(_a.hub_id) : Visitor.get(_a.id);

    // Quota guard: total bundle bytes vs free disk (spec §5.8)
    const total = this._bundleEntry.countSize(this._bundle);
    if (typeof Visitor.diskFree === "function" && total > Visitor.diskFree()) {
      Butler.say(LOCALE.QUOTA_EXCEEDED || "Not enough space for this upload");
      return;
    }

    // Bulk conflict policy decided up-front via the staging toggle (§5.6):
    //   _replaceExisting OFF -> "rename" (server appends timestamp on dup names)
    //   _replaceExisting ON  -> "replace" (server overwrites)
    const resolution = {
      mode: this._replaceExisting ? "replace" : "rename",
      skip: new Set(),
    };

    const job = this._bundleManager.create({ entries: this._bundle, destNid, hub_id, resolution });
    this._attachJob(job);
    this._phase = "progress";
    this._switchToProgress();
  }

  _attachJob(job) {
    this._job = job;
    job.on("progress", () => this._renderAggregate());
    job.on("folder-created", () => this._renderProgressList());
    job.on("file-done", () => { this._renderAggregate(); this._renderProgressList(); });
    job.on("error", () => this._renderProgressList());
    job.on("done", ({ canceled }) => this._onBundleDone(canceled));
    job.on("activated", () => this._renderAggregate());
  }

  _switchToProgress() {
    const root = this.el.querySelector(`.${this.fig.family}__container`) || this.el;
    if (root && root.dataset) root.dataset.phase = "progress";
    this._renderAggregate();
    this._renderProgressList();
  }

  _renderAggregate() {
    if (!this._job) return;
    const pct = this._job.bytesTotal
      ? Math.min(100, Math.round(100 * this._job.bytesDone / this._job.bytesTotal)) : 0;
    this.ensurePart("agg-fill").then((p) => { if (p.el) p.el.style.width = pct + "%"; });
    const rate = this._bundleManager.governor.currentRate();
    const mbps = (rate / (1024 * 1024)).toFixed(1);
    this.ensurePart("agg-text").then((p) => p.set({
      content: `${pct}% · ${filesize(this._job.bytesDone)}/${filesize(this._job.bytesTotal)} · ${mbps} MB/s`,
    }));
  }

  _renderProgressList() {
    this.ensurePart("file-list").then((list) => {
      if (list.empty) list.empty();
      list.feed(this._progressRows(this._bundle, 0));
    });
  }

  _progressRows(entries, depth) {
    const pfx = this.fig.family;
    const rows = [];
    for (const e of entries) {
      const label = e.kind === "folder" && e.status === "creating"
        ? (LOCALE.CREATING_FOLDER || "Creating folder…") : (e.status || "queued");
      rows.push(Skeletons.Box.X({
        className: `${pfx}__progress-row`, dataset: { kind: e.kind, status: e.status, depth },
        kids: [
          Skeletons.Note({ className: `${pfx}__progress-name`, content: e.name }),
          Skeletons.Note({ className: `${pfx}__progress-state`, content: label }),
        ],
      }));
      if (e.kind === "folder" && e.children.length) rows.push(...this._progressRows(e.children, depth + 1));
    }
    return rows;
  }

  _onBundleDone(canceled) {
    this._renderAggregate();
    this._renderProgressList();
    // refresh target folder view so new nodes appear (reuse existing reload if available)
    if (this._targetWindow && this._targetWindow.reload) this._targetWindow.reload();
  }

  _removeFromBundle(id) {
    const prune = (list) => {
      const i = list.findIndex((e) => e.id === id);
      if (i >= 0) { list.splice(i, 1); return true; }
      for (const e of list) if (e.kind === "folder" && prune(e.children)) {
        e.size = this._bundleEntry.computeSize(e.children); return true;
      }
      return false;
    };
    prune(this._bundle);
    this._renderStaging();
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    // Try multiple ways to get service
    let service = args.service;
    if (!service && cmd) {
      service = cmd.service || 
                (typeof cmd.mget === 'function' ? cmd.mget(_a.service) : null) ||
                (typeof cmd.mget === 'function' ? cmd.mget(_a.name) : null) ||
                (typeof cmd.get === 'function' ? cmd.get(_a.service) : null) ||
                (typeof cmd.get === 'function' ? cmd.get(_a.name) : null);
      }
    if (!service && cmd?.el) {
      service = cmd.el.dataset?.service || 
                cmd.el.getAttribute?.(_a.service) ||
                cmd.el.getAttribute?.('service') ||
                cmd.el.getAttribute?.('data-service');
    }

    // ---- bundle staging events (return early; others fall through to existing handling) ----
    if (service === "add-files") { this._filesInput && this._filesInput.click(); return; }
    if (service === "add-folder") { this._dirInput && this._dirInput.click(); return; }
    if (service === "upload-all") { this._startBundle(); return; }
    if (service === "clear-bundle") { this._bundle = []; this._renderStaging(); return; }
    if (service === "toggle-replace") { this._replaceExisting = !this._replaceExisting; return; }
    if (service && service.indexOf("remove:") === 0) {
      this._removeFromBundle(service.slice(7)); return;
    }

    switch (service) {
      case _e.close:
      case "close":
        // Close window immediately without triggering any UI refresh
        // This prevents any re-render that might cause completed items to show cancel button
        // Do NOT call _refreshUI() or _refreshFooter() before closing
        return this.goodbye();

      case "toggle-expand":
        return this.toggleExpand();

      case "cancel-all":
        return this.cancelAll();

      case "cancel-upload":
        // Try to get fileName from various sources
        let fileName = null;
        
        // Method 1: From args (if passed directly)
        if (args?.fileName) {
          fileName = args.fileName;
        }
        
        // Method 2: From cmd model/attributes
        if (!fileName && cmd) {
          if (typeof cmd.mget === 'function') {
            fileName = cmd.mget(_a.fileName) || cmd.mget(_a.name) || cmd.mget(_a.value);
          }
          if (!fileName && typeof cmd.get === 'function') {
            fileName = cmd.get(_a.fileName) || cmd.get(_a.name) || cmd.get(_a.value);
          }
          if (!fileName && cmd.value) {
            fileName = cmd.value;
          }
          if (!fileName && cmd.model && typeof cmd.model.get === 'function') {
            fileName = cmd.model.get(_a.fileName) || cmd.model.get(_a.name) || cmd.model.get(_a.value);
          }
        }
        
        // Method 3: From cmd.el dataset (most direct method for Note elements)
        if (!fileName && cmd?.el?.dataset) {
          fileName = cmd.el.dataset.fileName || cmd.el.dataset.name || cmd.el.dataset.value;
        }
        
        // Method 4: From cmd.el attribute
        if (!fileName && cmd?.el) {
          fileName = cmd.el.getAttribute?.(_a.fileName) || 
                     cmd.el.getAttribute?.('name') || 
                     cmd.el.getAttribute?.('value') ||
                     cmd.el.getAttribute?.('data-file-name');
        }
        
        // Method 4.5: From cmd.value (if set directly on Note)
        if (!fileName && cmd?.value) {
          fileName = cmd.value;
        }
        
        // Method 5: From event target and walk up DOM tree
        if (!fileName && args?.target) {
          let target = args.target;
          let depth = 0;
          const maxDepth = 10; // Prevent infinite loop
          while (target && target !== document.body && target !== document.documentElement && depth < maxDepth) {
            depth++;
            if (target.dataset && target.dataset.fileName) {
              fileName = target.dataset.fileName;
              break;
            }
            // Also check for file-item container
            if (target.classList && target.classList.contains(`${this.fig.family}__file-item`)) {
              fileName = target.dataset?.fileName;
              if (fileName) break;
            }
            target = target.parentElement;
          }
        }
        
        // Method 6: From cmd.el parent elements (file-item container)
        if (!fileName && cmd?.el) {
          let parent = cmd.el.parentElement;
          let depth = 0;
          const maxDepth = 10; // Prevent infinite loop
          while (parent && parent !== document.body && parent !== document.documentElement && depth < maxDepth) {
            depth++;
            // Check if this is the file-item container
            if (parent.classList && parent.classList.contains(`${this.fig.family}__file-item`)) {
              fileName = parent.dataset?.fileName;
              if (fileName) break;
            }
            if (parent.dataset && parent.dataset.fileName) {
              fileName = parent.dataset.fileName;
              break;
            }
            parent = parent.parentElement;
          }
        }
        
        // Method 7: Try to find from closest file-item ancestor
        if (!fileName && cmd?.el) {
          const fileItemEl = cmd.el.closest?.(`.${this.fig.family}__file-item`);
          if (fileItemEl && fileItemEl.dataset?.fileName) {
            fileName = fileItemEl.dataset.fileName;
          }
        }
        
        if (fileName) {
          console.log("[UPLOAD_PROGRESS] cancel-upload resolved fileName:", fileName);
          return this.cancelUpload(fileName);
        } else {
          // Log for debugging
          console.warn('[UPLOAD_PROGRESS] Cancel upload: Could not find fileName', {
            cmd: cmd ? { 
              hasMget: typeof cmd.mget === 'function',
              hasGet: typeof cmd.get === 'function',
              hasEl: !!cmd.el,
              elDataset: cmd.el?.dataset,
              value: cmd.value
            } : null,
            args: args ? { target: args.target?.tagName, hasTarget: !!args.target } : null
          });
        }
        break;

      case "click-upload-item":
        const itemFileName = cmd.mget?.(_a.fileName) || cmd.el?.dataset?.fileName;
        if (itemFileName) {
          return this.onItemClick(itemFileName);
        }
        break;

      default:
        return super.onUiEvent(cmd, { ...args, no_raise: true });
    }
  }
}

__window_upload_progress.initClass();

// Cache promise to prevent multiple window creation (singleton pattern)
let _pendingPromise = null;

/**
 * Get or create upload progress window instance (singleton)
 * @returns {Promise<__window_upload_progress>}
 */
__window_upload_progress.getOrCreate = function() {
  // If there's already a pending promise, return it
  if (_pendingPromise) {
    return _pendingPromise.then((instance) => {
      // Check if instance is still valid
      if (instance && !instance.isDestroyed()) {
        return instance;
      }
      // If destroyed, clear cache and try again
      _pendingPromise = null;
      return __window_upload_progress.getOrCreate();
    });
  }
  
  _pendingPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.Wm) {
      _pendingPromise = null;
      resolve(null);
      return;
    }
    
    // Check if window already exists
    const existing = window.Wm.getItemsByKind('window_upload_progress');
    if (existing && existing.length > 0 && !existing[0].isDestroyed()) {
      _pendingPromise = null;
      resolve(existing[0]);
      return;
    }
    
    // Launch new window
    const launched = window.Wm.launch(
      { kind: 'window_upload_progress' },
      { explicit: 1, singleton: 1 }
    );
    
    if (launched === false) {
      // Window already exists (singleton returned false)
      const windows = window.Wm.getItemsByKind('window_upload_progress');
      if (windows && windows.length > 0 && !windows[0].isDestroyed()) {
        _pendingPromise = null;
        resolve(windows[0]);
        return;
      }
    }
    
    // Wait for window to be created
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    const checkWindow = () => {
      attempts++;
      const windows = window.Wm.getItemsByKind('window_upload_progress');
      if (windows && windows.length > 0 && !windows[0].isDestroyed()) {
        _pendingPromise = null;
        resolve(windows[0]);
      } else if (attempts < maxAttempts) {
        setTimeout(checkWindow, 100);
      } else {
        // Timeout - clear cache and resolve null
        _pendingPromise = null;
        resolve(null);
      }
    };
    setTimeout(checkWindow, 100);
  });
  
  // Clear cache when promise resolves/rejects
  _pendingPromise.then(() => {
    _pendingPromise = null;
  }).catch(() => {
    _pendingPromise = null;
  });
  
  return _pendingPromise;
};

module.exports = __window_upload_progress;

