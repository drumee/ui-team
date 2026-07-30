const { filesize, dataTransfer } = require("@drumee/ui-essentials");
const __window_core = require("../core");
const { hasWriteBit } = require("window/live-privilege");
const { roleFromPrivilege } = require("builtins/skeleton/toolkit/permission");

// Cap the number of per-entry rows rendered in the bundle progress list. A
// dropped folder can hold tens of thousands of files; rendering one DOM row each
// (repeatedly, per file-done) exhausts memory. Show at most this many plus a
// "+N more" summary — the aggregate bar still reflects the true overall progress.
const MAX_PROGRESS_ROWS = 200;

// How long the "you can no longer upload here" notice stays up before it
// self-dismisses. Mirrors the document player's role-change notice.
const ROLE_NOTICE_MS = 5000;

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
    this._phase = "progress";         // default; bundle staging entry (openStaging) sets "staging"
    this._bundle = [];                // BundleEntry roots
    this._jobs = [];                  // Active + queued bundle jobs (multi-drop)
    this._replaceExisting = false;    // bulk conflict policy (toggle in staging)
    this._bundleEntry = require("media/bundle/entry");
    this._bundleManager = require("media/bundle/manager");
    // hub_id → last privilege seen for it, so a role-change notice can name
    // where the user came FROM (the server only ever sends the new value).
    this._lastPrivilege = {};
    this._targetWindow = opt && opt.targetWindow ? opt.targetWindow : null; // folder window

    // Large drops (10k–20k files) fire file-done/folder-created thousands of
    // times. Rebuilding the whole progress list each time is O(N^2) and blows up
    // memory, so coalesce the re-renders (the list itself is capped — see
    // MAX_PROGRESS_ROWS in _renderProgressList).
    this._renderProgressListThrottled = _.throttle(
      () => this._renderProgressList(), 400, { leading: true, trailing: true }
    );
    this._renderAggregateThrottled = _.throttle(
      () => this._renderAggregate(), 150, { leading: true, trailing: true }
    );

    this._isExpanded = true;
    this._autoMinimizeTimer = null; // 5s auto-dismiss once uploads settle (no pending)
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
      // Third place this number lives, and the one that decides: an inline
      // style beats both stylesheets. Keep it equal to the --z-index-upload-progress
      // fallback in this widget's skin/ and in desk/wm/skin (.upload-progress-layer).
      // Above every window layer so a raised window can't bury the floater.
      zIndex: 50002,
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

    // A new upload cancels any pending auto-collapse and re-opens the popup so
    // the incoming file is visible.
    this._cancelAutoMinimize();
    if (!this._isExpanded) this._isExpanded = true;

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
    
    
    // When this was the last pending file, arm the 5s auto-collapse.
    this._maybeArmAutoMinimize();
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
    // A status change (e.g. error) may leave nothing pending → arm collapse.
    this._maybeArmAutoMinimize();
  }

  /**
   * Cancel all uploads
   */
  /**
   * Cancel every in-flight upload.
   *
   * @param {{close?: boolean}} [opt] `close: true` also dismisses the window.
   *   That is the header X's route — it cancels AND closes, which is its only
   *   job while an upload is running. The footer's "Cancel all" leaves the
   *   window standing: its cancelled rows are the record of what just happened
   *   to the user's files, and dismissing them half a second later leaves
   *   nothing to read. There is still a way out — the footer flips to "Close"
   *   as soon as nothing is uploading (see _refreshFooter).
   */
  cancelAll(opt = {}) {
    const close = !!(opt && opt.close);
    if (this._bundleMode && this._jobs && this._jobs.length) {
      for (const job of this._jobs) {
        if (job && job.cancel) job.cancel();
      }
      if (this._bundleManager.cancelAll) this._bundleManager.cancelAll();
      this._uploading = false;
      this._renderAggregate();
      this._renderProgressList();
      // Dismiss the popup after cancelling, for the callers that asked to close
      // — the header X. This bundle-mode path used to return without ever
      // calling goodbye(), so the X could not close the window at all.
      if (close) _.delay(() => this.goodbye(), 500);
      return;
    }
    if (this._job && this._job.cancel) this._job.cancel();
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

    // Close window after delay — only for the caller that asked to (the X).
    if (close) {
      _.delay(() => {
        this.goodbye();
      }, 500);
    }
  }

  /**
   * Realtime role change for THIS viewer, while an upload is running.
   *
   * The server already refuses the upload once the write bit is gone
   * (acl/media.json declares media.upload with `"src": "write"`), so this is a
   * UX fix, not a security one — but the UX it replaces is bad: each queued
   * file kept its turn, burned its bandwidth, came back 403, and landed in the
   * list as a red error with a Retry button that could only ever 403 again.
   *
   * A bundle job outlives the folder window that started it (it belongs to the
   * `media/bundle/manager` singleton), so the folder window is the wrong place
   * to catch this — close the window mid-upload and nobody would be listening.
   * This widget lives exactly as long as the jobs it displays.
   *
   * WS wiring is inherited: window/utils binds Wm.on(WS_EVENT, handleWsEvent)
   * in onBeforeRender and unbinds it in onBeforeDestroy, so there is nothing to
   * subscribe or clean up here.
   */
  handleWsEvent(args = {}) {
    const { data, options } = args || {};
    if (options && options.service === SERVICE.hub.set_privilege) {
      this._freezeUploadsForHub(data || {});
    }
    // The base implementation reads `data.args` without guarding, so a payload
    // that has no `args` (set_privilege sends { privilege, hub_id, area })
    // throws there. That must not take this handler down with it — the freeze
    // above has already run, and every other window has its own subscription.
    try {
      return super.handleWsEvent(args);
    } catch (e) {
      if (this.warn) this.warn("[upload-progress] base ws handler failed", e);
    }
  }

  /**
   * Stop the in-flight uploads targeting one workspace after its role dropped
   * below "may write", and tell the user why.
   *
   * Scoped to the pushed hub on purpose: a user can be uploading into two
   * workspaces at once, and losing write on one says nothing about the other.
   * That is also why this does NOT reuse cancelAll() — that cancels every job
   * through the shared manager and closes this popup 500ms later, which would
   * both overreach and hide the very list explaining what just stopped.
   *
   * @param {Object} payload WS body: { privilege, hub_id, ... }
   */
  _freezeUploadsForHub(payload = {}) {
    const { privilege, hub_id } = payload;
    if (privilege == null || hub_id == null) return;

    // Only a LOST write bit blocks uploading. Admin → Edit is a demotion too,
    // but it keeps the bit, so the upload is still perfectly legal.
    const next = Number(privilege);
    if (hasWriteBit(next)) return;

    // `_jobs` is append-only (nothing prunes it when a job finishes) and
    // job.state never advances past "active", so neither can tell us whether a
    // job still matters. `_canceled` is the one honest signal, and cancelling a
    // job that already finished is a no-op in practice: _markCanceled skips
    // entries in a terminal state, so a fully-uploaded bundle keeps every tick.
    const hit = (this._jobs || []).filter(
      (j) => j && !j._canceled && `${j._hubId}` === `${hub_id}`,
    );
    if (!hit.length) return;

    // cancel() aborts the live XHR and walks the entry tree, settling every
    // unfinished file as "canceled" — a failure state, shown with a warning
    // glyph and no Retry (retrying would 403). Files that had already uploaded
    // keep their tick: they really are on the server.
    for (const job of hit) {
      if (job.cancel) job.cancel("permission");
    }

    this._uploading = false;
    this._renderAggregate();
    this._renderProgressList();

    // Name both ends of the change — "from Edit to View" is more use than "your
    // permission changed", and it stays right for Admin → Chat too.
    //
    // roleFromPrivilege(undefined) silently answers "View", so an unknown prior
    // would print the nonsense "from View to View". Send the generic wording
    // instead when we genuinely don't know where the user came from.
    const prior = this._priorPrivilege(hub_id);
    const prevRole = prior != null ? roleFromPrivilege(prior) : null;
    const nextRole = roleFromPrivilege(next);
    this._showUploadBlockedNotice(
      // Equal ends are also nonsense; treat them as unknown.
      prevRole && prevRole.value !== nextRole.value ? prevRole : null,
      nextRole,
    );
    this._lastPrivilege[hub_id] = next;
  }

  /**
   * Record the privilege this viewer currently holds in `hub_id`.
   *
   * Called when a bundle is queued — the one moment we can be sure the value
   * is the pre-change one, because the upload is starting and has not been
   * blocked. Read back by _priorPrivilege when a demotion arrives.
   *
   * @param {string|number} hub_id
   */
  _rememberPrivilege(hub_id) {
    if (hub_id == null) return;
    if (!this._lastPrivilege) this._lastPrivilege = {};
    const priv = this._readHubPrivilege(hub_id);
    if (priv != null) this._lastPrivilege[hub_id] = Number(priv);
  }

  /**
   * The privilege held in `hub_id` before the push being handled, or undefined.
   *
   * Only the snapshot counts. Reading live at push time — off this widget (a
   * progress floater is not a node, so mget returns undefined and
   * roleFromPrivilege maps that to the weakest role, hence "from View to View")
   * or off the folder window (which subscribes to WS_EVENT first and has
   * already stored the NEW value by then) — both give the wrong answer.
   *
   * @param {string|number} hub_id
   * @returns {number|undefined}
   */
  _priorPrivilege(hub_id) {
    return this._lastPrivilege ? this._lastPrivilege[hub_id] : undefined;
  }

  /**
   * This viewer's privilege in `hub_id`, from whichever open folder window is
   * showing that workspace. Safe to call at upload time; misleading later (see
   * _priorPrivilege).
   *
   * @param {string|number} hub_id
   * @returns {number|undefined}
   */
  _readHubPrivilege(hub_id) {
    if (typeof Wm === "undefined" || !_.isFunction(Wm.getItemsByKind)) return;
    try {
      const win = (Wm.getItemsByKind("window_folder") || []).find(
        (w) =>
          w &&
          !(w.isDestroyed && w.isDestroyed()) &&
          `${w.mget(_a.hub_id)}` === `${hub_id}` &&
          w.mget(_a.privilege) != null,
      );
      return win ? win.mget(_a.privilege) : undefined;
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Toast explaining the frozen upload: self-dismisses, plus an [x] to close
   * it sooner.
   *
   * The timer rides along as `dismiss_after` instead of being held here: the
   * value Wm.info returns is box.append()'s `children.last()`, i.e. the pool's
   * last child at call time, while Marionette builds this toast asynchronously
   * afterwards — so it is some other window, or undefined. window_info arms the
   * timer on itself in onDomRefresh, where the view definitely exists.
   *
   * @param {Object|null} prevRole role item before the change, or null when
   *                               the previous level could not be determined
   * @param {Object} nextRole role item after it
   */
  _showUploadBlockedNotice(prevRole, nextRole) {
    // Without a trustworthy "from", say only what we know rather than invent a
    // level — a wrong role name reads as a bug to the user.
    const message = prevRole
      ? LOCALE.UPLOAD_BLOCKED_ROLE_CHANGED.format(
          prevRole.label || "",
          (nextRole && nextRole.label) || "",
        )
      : LOCALE.UPLOAD_BLOCKED_ROLE_CHANGED_TO.format(
          (nextRole && nextRole.label) || "",
        );
    Wm.info({
      message,
      variant: "notice",
      dismiss_after: ROLE_NOTICE_MS,
      actions: [
        {
          label: LOCALE.CLOSE,
          priority: "primary",
          // No uiHandler → the toast closes itself.
          service: _e.close,
        },
      ],
    });
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
    // Cancelling the last in-flight file leaves nothing pending → arm collapse.
    this._maybeArmAutoMinimize();
  }

  /**
   * Whether the popup is tracking at least one upload batch/item.
   */
  _hasTrackedUploads() {
    if (this._bundleMode) {
      return !!((this._bundle && this._bundle.length) ||
        (this._jobs && this._jobs.length) ||
        this._uploading);
    }
    return (this._uploadItems || []).length > 0;
  }

  /**
   * True when nothing is still uploading (legacy items or bundle jobs/entries).
   */
  _isUploadSettled() {
    if (this._bundleMode) {
      const mgr = this._bundleManager;
      if (this._uploading) return false;
      if (mgr && (mgr.activeCount() > 0 || mgr.queuedCount() > 0)) return false;
      for (const e of this._bundle || []) {
        if (this._entryDisplayStatus(e) === "active") return false;
      }
      return this._hasTrackedUploads();
    }
    const items = this._uploadItems || [];
    if (!items.length) return false;
    return !items.some((i) => i.status === "uploading");
  }

  /**
   * Arm the 5s auto-dismiss once uploads settle (nothing left 'uploading').
   * Works for both legacy (_uploadItems) and bundle drag-drop paths.
   * A new upload or manual toggle cancels the countdown.
   *
   * "Settled" is not the same as "went well": a cancelled or errored batch is
   * settled too, and dismissing THAT on a timer throws away the only account of
   * what happened — including the Retry button an errored row offers, which is
   * useless if it disappears five seconds after appearing. A batch that ended
   * badly waits for the user to dismiss it.
   */
  _maybeArmAutoMinimize() {
    if (!this._isUploadSettled() || !this._hasTrackedUploads() || !this._isExpanded) {
      this._cancelAutoMinimize();
      return;
    }
    if (this._hasUnhappyEntry()) {
      this._cancelAutoMinimize();
      return;
    }
    if (this._autoMinimizeTimer) return; // already counting down
    this._autoMinimizeTimer = setTimeout(() => {
      this._autoMinimizeTimer = null;
      if (this.isDestroyed && this.isDestroyed()) return;
      if (this._isUploadSettled() && this._isExpanded) this.goodbye();
    }, 5000);
  }

  /**
   * Did anything in this batch fail or get cancelled?
   *
   * Covers both models the window drives: the legacy flat list, and the bundle
   * tree, whose folder rows roll their subtree up already (_entryDisplayStatus
   * reports "error"/"canceled" for a folder holding one).
   */
  _hasUnhappyEntry() {
    if (this._bundleMode) {
      for (const e of this._bundle || []) {
        const st = this._entryDisplayStatus(e);
        if (st === "error" || st === "canceled") return true;
      }
      return false;
    }
    return (this._uploadItems || []).some(
      (i) => i.status === "error" || i.status === "cancelled",
    );
  }

  /**
   * Cancel a pending auto-dismiss (new upload, user interaction, destroy).
   */
  _cancelAutoMinimize() {
    if (this._autoMinimizeTimer) {
      clearTimeout(this._autoMinimizeTimer);
      this._autoMinimizeTimer = null;
    }
  }

  onBeforeDestroy() {
    this._cancelAutoMinimize();
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   * Toggle expand/collapse
   */
  toggleExpand() {
    // A manual toggle is a user interaction — drop any pending auto-collapse.
    this._cancelAutoMinimize();
    this._isExpanded = !this._isExpanded;

    // Bundle path: the legacy _refreshUI() rebuilds the file-list from the EMPTY
    // _uploadItems array, which is exactly what wiped the list on collapse/expand.
    // Just flip the expanded state and re-render the bundle UI in place.
    if (this._bundleMode) {
      if (this.el) this.el.dataset.expanded = this._isExpanded ? "1" : "0";
      const container = this.el && this.el.querySelector(`.${this.fig.family}__container`);
      if (container) container.dataset.expanded = this._isExpanded ? "1" : "0";
      if (this._isExpanded) { this._renderAggregate(); this._renderProgressList(); }
      return;
    }

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
        // Keep the widget model in sync — onUiEvent resolves the service from
        // the model first, so a DOM-only update left "Close" firing the stale
        // "cancel-all" service.
        if (actionPart.mset) actionPart.mset(_a.service, newService);
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
      // Store the FileSelector widget; its <input> is created later in onDomRefresh,
      // so we trigger it via its own open() API on demand (see onUiEvent add-files).
      this._fileSelector = child;
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

  _ensureDirInput() {
    if (!this._dirInput) {
      const inp = document.createElement("input");
      inp.type = "file"; inp.webkitdirectory = true; inp.multiple = true;
      inp.style.display = "none";
      inp.onchange = (e) => {
        const roots = this._bundleEntry.entriesFromFileList(e.target.files);
        this._addToBundle(roots);
        e.target.value = "";
      };
      this.el.appendChild(inp);
      this._dirInput = inp;
    }
    return this._dirInput;
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

  _resolveBundleDest() {
    let destNid, hub_id;
    if (this._dropDest) {
      destNid = this._dropDest.destNid;
      hub_id = this._dropDest.hub_id;
      this._dropDest = null;
    } else {
      const target = this._targetWindow;
      destNid = (target && typeof target.getCurrentNid === "function") ? target.getCurrentNid() : null;
      hub_id = (target && typeof target.mget === "function") ? target.mget(_a.hub_id) : null;
    }
    if (destNid == null) {
      destNid = Visitor.get(_a.home_id);
      hub_id = hub_id != null ? hub_id : Visitor.get(_a.id);
    }
    return { destNid, hub_id };
  }

  /**
   * Queue one upload batch (supports multiple drops while a prior batch is running).
   * @param {Array} entries  top-level BundleEntry roots for THIS drop only
   * @param {*} destNid
   * @param {*} hub_id
   */
  _enqueueBundle(entries, destNid, hub_id) {
    if (!entries || !entries.length) return;
    this._cancelAutoMinimize();
    if (!this._isExpanded) this._isExpanded = true;
    if (destNid == null) {
      Butler.say(LOCALE.WRONG_DROP_AREA || "Please open a folder to upload into");
      return;
    }

    this._bundleDest = this._bundleDest != null ? this._bundleDest : destNid;

    const total = this._bundleEntry.countSize(entries);
    if (typeof Visitor.diskFree === "function" && total > Visitor.diskFree()) {
      // Was a Butler.say() toast, which said the upload was refused and then
      // disappeared. This one stays until dismissed and carries the way out.
      //
      // The client-side pre-check, so the numbers are the client's: what the
      // user is storing now and what their plan allows. `used` is left to the
      // widget rather than guessed here — Visitor.diskFree() is remaining
      // space, and subtracting it from the allowance to reconstruct "used"
      // would produce a figure that quietly disagrees with the storage screen
      // whenever the cached quota is stale.
      const q = (Visitor.quota && Visitor.quota()) || {};
      Wm.openQuotaExceeded({
        limit: "storage",
        used: typeof Visitor.diskUsed === "function" ? Visitor.diskUsed() : null,
        cap: q.storage != null ? q.storage : q.disk,
      });
      // Take the progress window down with it. Nothing is going to upload, so
      // leaving it behind stranded it at "Uploading 0 Files" — a live-looking
      // panel reporting work that was refused before it began, sitting next to
      // a card explaining the refusal.
      this.cancelAll({ close: true });
      return;
    }

    const resolution = {
      mode: this._replaceExisting ? "replace" : "rename",
      skip: new Set(),
    };

    const job = this._bundleManager.create({ entries, destNid, hub_id, resolution });
    // Snapshot the privilege the viewer holds in this hub RIGHT NOW, while the
    // upload is being accepted — so it is by definition the level that allowed
    // it. A later demotion notice needs this to say what the user came FROM;
    // the server's push carries only the new value.
    //
    // It has to be captured here, not read when the push arrives: the folder
    // window subscribes to WS_EVENT before this popup exists (you open a folder
    // to start an upload), so by the time this widget handles the event that
    // window has already overwritten its own privilege with the new one.
    this._rememberPrivilege(hub_id);
    this._jobs.push(job);
    this._attachJob(job);
    this._uploading = true;
    this._phase = "progress";
    this._bundleMode = true;
    this._resetBundleFooter();
    this._switchToProgress();
    this._bundleManager.pump();
    this._renderAggregate();
    this._renderProgressList();
  }

  _startBundle() {
    if (!this._bundle.length) return;
    // Staging "Upload all" — only once; drag-drop uses _enqueueBundle directly.
    if (this._uploading) return;
    const { destNid, hub_id } = this._resolveBundleDest();
    this._enqueueBundle(this._bundle.slice(), destNid, hub_id);
  }

  _attachJob(job) {
    // Throttled renders: bursts of file-done events (thousands for a big folder)
    // coalesce instead of rebuilding the whole list on every single file.
    job.on("progress", this._renderAggregateThrottled);
    job.on("folder-created", (ev) => {
      this._revealInLayout(ev && ev.node, ev && ev.parent);
      this._renderProgressListThrottled();
    });
    job.on("file-done", (ev) => {
      this._revealInLayout(ev && ev.data, ev && ev.parent);
      this._renderAggregateThrottled();
      this._renderProgressListThrottled();
      // Global "a file was uploaded" signal. The BundleJob path (topbar Upload
      // button / file picker) only emits Backbone events on the job, so it
      // never fired the RADIO_MEDIA `_e.uploaded` that the legacy media_uploader
      // does — leaving global listeners (e.g. the reward-flow Step 2 gate)
      // stuck. Mirror it here, once per job: file-done repeats per file
      // (thousands for a big folder), and one signal is all a "did they upload
      // anything" consumer needs.
      if (!job._uploadedBroadcast && typeof RADIO_MEDIA !== "undefined") {
        job._uploadedBroadcast = 1;
        RADIO_MEDIA.trigger(_e.uploaded, ev && ev.data);
      }
    });
    job.on("error", this._renderProgressListThrottled);
    job.on("done", ({ canceled }) => this._onBundleDone(canceled, job));
    job.on("activated", () => {
      this._job = job;
      this._renderAggregateThrottled();
    });
    if (job.state === "active") this._job = job;
  }

  _resetBundleFooter() {
    this.ensurePart("footer-action").then((p) => {
      if (!p || !p.el) return;
      p.set({ content: LOCALE.CANCEL_ALL || "Cancel all" });
      p.el.className = `${this.fig.family}__cancel-all`;
      p.el.setAttribute(_a.service, "cancel-all");
      if (p.el.dataset) p.el.dataset.service = "cancel-all";
    });
  }

  _switchToProgress() {
    const root = this.el.querySelector(`.${this.fig.family}__container`) || this.el;
    if (root && root.dataset) root.dataset.phase = "progress";
    this._renderAggregate();
    this._renderProgressList();
  }

  _renderAggregate() {
    const jobs = (this._jobs || []).filter((j) => j && !(j.isDestroyed && j.isDestroyed()));
    if (!jobs.length) return;
    if (this.isDestroyed && this.isDestroyed()) return;

    let bytesTotal = 0;
    let bytesDone = 0;
    let filesTotal = 0;
    let filesDone = 0;
    for (const j of jobs) {
      bytesTotal += j.bytesTotal || 0;
      bytesDone += j.bytesDone || 0;
      filesTotal += j.filesTotal || 0;
      filesDone += j.filesDone || 0;
    }

    const pct = bytesTotal
      ? Math.min(100, Math.round(100 * bytesDone / bytesTotal)) : 0;
    this.ensurePart("agg-fill").then((p) => { if (p.el) p.el.style.width = pct + "%"; });
    const rate = this._bundleManager.governor.currentRate();
    const remaining = Math.max(0, bytesTotal - bytesDone);
    // Tidy aggregate line: percent + uploaded/total size only (Google-Drive style).
    this.ensurePart("agg-text").then((p) => p.set({
      content: `${pct}% · ${filesize(bytesDone)}/${filesize(bytesTotal)}`,
    }));
    // ETA shown in the footer next to the Cancel/Close button.
    let etaText = "";
    if (rate > 0 && remaining > 0) {
      const secs = Math.ceil(remaining / rate);
      etaText = secs >= 60 ? `~${Math.ceil(secs / 60)} min` : `~${secs} s`;
    }
    this.ensurePart("estimated-time").then((p) => p.set({ content: etaText }));
    // The bundle drag-drop path never runs through _refreshUI, so the header
    // title would otherwise stay stuck at "Uploading 0 files". Drive it here
    // from the job's own file counters so the user sees uploaded/total files.
    this.ensurePart("upload-title").then((p) => p.set({
      content: `${LOCALE.UPLOADING || "Uploading"} ${filesDone || 0}/${filesTotal || 0} ${LOCALE.FILES || "files"}`,
    }));
  }

  _renderProgressList() {
    if (this.isDestroyed && this.isDestroyed()) return;
    this.ensurePart("file-list").then((list) => {
      if (!list || (list.isDestroyed && list.isDestroyed())) return;
      // Google-Drive-style tidy list: ONE row per TOP-LEVEL dropped item only
      // (a folder shows an aggregate "done / total" count), never one row per
      // nested file — that keeps the DOM tiny no matter how big the bundle is.
      // Errors bucket first so a failed item is always visible (with Retry) even
      // if many loose files were dropped past the cap.
      const roots = this._bundle || [];
      const errors = [], active = [], rest = [];
      for (const e of roots) {
        const st = this._entryDisplayStatus(e);
        if (st === "error") errors.push(e);
        else if (st === "done") rest.push(e);
        else active.push(e);
      }
      const ordered = errors.concat(active, rest);
      const shown = ordered.slice(0, MAX_PROGRESS_ROWS);
      const rows = shown.map((e) => this._buildProgressRow(e));
      const omitted = roots.length - shown.length;
      if (omitted > 0) {
        rows.push(Skeletons.Note({
          className: `${this.fig.family}__progress-more`,
          content: `+ ${omitted} ${LOCALE.FILES || "files"}`,
        }));
      }
      list.feed(rows);
    });
  }

  // Rolled-up display status for a top-level entry. Files use their own status;
  // folders aggregate their subtree (any error -> error, all files done -> done,
  // otherwise in-progress). Used for bucketing AND the row status indicator.
  _entryDisplayStatus(e) {
    if (e.kind !== "folder") {
      if (e.status === "error") return "error";
      // "canceled" is a failure, not a completion — the file is NOT on the
      // server. It gets its own bucket rather than reusing "error" so the row
      // can drop the Retry button: the usual cause is a lost permission, and
      // retrying would just 403. Note this is distinct from "skipped", which
      // means the user deliberately passed on a name conflict — that IS a
      // resolved outcome and keeps the tick.
      if (e.status === "canceled") return "canceled";
      if (e.status === "done" || e.status === "skipped") return "done";
      return "active";
    }
    const s = this._folderStats(e);
    if (e.status === "error" || s.hasError) return "error";
    if (e.status === "canceled" || s.hasCanceled) return "canceled";
    if (s.total > 0 && s.done >= s.total) return "done";
    if (e.status === "done") return "done";
    return "active";
  }

  // One cheap walk over a folder subtree (ints/refs only, no UI) returning
  // { done, total, hasError }. Bounded work: only called for shown folder rows.
  _folderStats(folder) {
    let done = 0, total = 0, hasError = false, hasCanceled = false;
    const walk = (l) => {
      for (const e of l || []) {
        if (e.kind === "folder") {
          if (e.status === "error") hasError = true;
          else if (e.status === "canceled") hasCanceled = true;
          walk(e.children);
        } else {
          total += 1;
          if (e.status === "done" || e.status === "skipped") done += 1;
          else if (e.status === "error") hasError = true;
          // Deliberately NOT counted toward `done`: a cancelled file never
          // reached the server, so "3 / 10" must keep reading 3.
          else if (e.status === "canceled") hasCanceled = true;
        }
      }
    };
    walk(folder.children);
    return { done, total, hasError, hasCanceled };
  }

  _buildProgressRow(e) {
    const pfx = this.fig.family;
    const isFolder = e.kind === "folder";
    const st = this._entryDisplayStatus(e);
    const { getFileIcon } = require("./skeleton/helpers");
    // Folder: a valid NORMALIZED sprite (raw-* icons aren't in the sprite sheet,
    // so Button.Svg can't render them). File: derive from name via getFileIcon.
    const ico = isFolder ? "dock-folder" : getFileIcon({ name: e.name });

    // Right-hand status indicator: Retry (error) · warning (canceled) ·
    // check (done) · spinner (active).
    let statusEl;
    if (st === "error") {
      statusEl = Skeletons.Note({
        className: `${pfx}__progress-retry`,
        content: LOCALE.RETRY || "Retry",
        service: `retry:${e.id}`, uiHandler: [this],
      });
    } else if (st === "canceled") {
      // A warning glyph, NOT the Retry affordance: this file stopped because
      // the viewer lost the right to upload here, so retrying can only 403.
      // Offering the button would invite a click that silently fails.
      statusEl = Skeletons.Button.Svg({
        className: `${pfx}__progress-canceled`, ico: "apps-warning", active: 0,
        tooltips: LOCALE.UPLOAD_CANCELED,
      });
    } else if (st === "done") {
      statusEl = Skeletons.Button.Svg({
        className: `${pfx}__progress-check`, ico: "checked-circle", active: 0,
      });
    } else {
      statusEl = Skeletons.Box.X({ className: `${pfx}__progress-spinner` });
    }

    // Folder rows carry an aggregate "done / total" file count.
    const right = [];
    if (isFolder) {
      const s = this._folderStats(e);
      // Only show the "done / total" count when the folder actually holds files
      // (an empty/seeded folder would otherwise read a confusing "0 / 0").
      if (s.total > 0) {
        right.push(Skeletons.Note({
          className: `${pfx}__progress-count`, content: `${s.done} / ${s.total}`,
        }));
      }
    }
    right.push(statusEl);

    // A finished item is clickable → reveal/focus it in the workspace. Every
    // nested child needs active:0 so the click reaches this row's handler.
    const clickable = st === "done" && e.nid != null;
    const childOpt = clickable ? { active: 0 } : undefined;
    return Skeletons.Box.X({
      className: `${pfx}__progress-row`,
      dataset: { kind: e.kind, status: st, clickable: clickable ? 1 : 0 },
      service: clickable ? "open-uploaded" : null,
      uiHandler: clickable ? [this] : null,
      nid: clickable ? e.nid : undefined,
      hub_id: clickable ? e.hub_id : undefined,
      filetype: clickable && isFolder ? _a.folder : undefined,
      kidsOpt: childOpt,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__progress-left`,
          kidsOpt: childOpt,
          kids: [
            Skeletons.Button.Svg({ className: `${pfx}__progress-icon`, ico, active: 0 }),
            Skeletons.Note({ className: `${pfx}__progress-name`, content: e.name }),
          ],
        }),
        Skeletons.Box.X({ className: `${pfx}__progress-right`, kidsOpt: childOpt, kids: right }),
      ],
    });
  }

  // Live-append a finished TOP-LEVEL root to the target's grid, so each uploaded
  // file/folder appears as it completes WITHOUT reloading the view (a reload would
  // destroy this popup). Mirrors the app's own create-folder / WS-echo append
  // (wm:243-261, folder:586-593) so it behaves identically for the desk Wm and
  // folder windows — dedup, parent guard, and folder/file partition included.
  _revealInLayout(node, parent) {
    const tw = this._targetWindow;
    if (!tw || !node || node.nid == null) return;
    // Only the bundle's top-level roots belong in the currently-visible grid;
    // nested children live inside their own folders. `parent` is the dir the
    // node was created into — for a root that equals the bundle destination.
    if (this._bundleDest != null && parent !== this._bundleDest) return;
    // …and only while the target still shows that destination (the user may have
    // navigated elsewhere after dropping).
    if (this._bundleDest != null && typeof tw.getCurrentNid === "function" &&
        tw.getCurrentNid() !== this._bundleDest) return;
    if (typeof tw.ensurePart !== "function") return;
    tw.ensurePart(_a.list).then((list) => {
      if (!list || list.isDestroyed?.()) return;
      if (!list.el || !list.el.isConnected) return;
      // Dedup: a server WS echo may have rendered it already.
      if (typeof tw.getItemsByAttr === "function" &&
          tw.getItemsByAttr(_a.nid, node.nid).length) return;
      const data = Object.assign({}, node);
      if (data.pid == null && parent != null) data.pid = parent;
      if (typeof tw._getKind === "function") data.kind = tw._getKind();
      data.service = "open-node";
      data.uiHandler = [tw];
      if (data.position >= 0) list.append(data, data.position);
      else list.append(data);
      if (tw.getViewMode && tw.getViewMode() !== _a.row &&
          typeof tw._partitionFoldersAndFiles === "function") {
        tw._partitionFoldersAndFiles(list);
      }
    }).catch(() => {});
  }

  _onBundleDone(canceled, job) {
    this._renderAggregate();
    this._renderProgressList();

    const mgr = this._bundleManager;
    if (mgr.activeCount() > 0 || mgr.queuedCount() > 0) {
      return;
    }

    this._uploading = false;
    // No reload here: each finished file/folder was already live-appended to the
    // grid by `_revealInLayout` (driven off the job's folder-created/file-done
    // events). Reloading would re-render the whole view and destroy this popup —
    // exactly what we're avoiding.
    // The bundle drag-drop path does NOT populate `_uploadItems`, so
    // `_refreshFooter` can't detect completion and the footer button stays on
    // "Cancel all". Flip it to "Close" here so the user can dismiss the popup
    // once the drop finished (onUiEvent "close" -> goodbye()).
    this.ensurePart("footer-action").then((p) => {
      if (!p || !p.el) return;
      p.set({ content: LOCALE.CLOSE || "Close" });
      p.el.className = `${this.fig.family}__close`;
      p.el.setAttribute(_a.service, "close");
      if (p.el.dataset) p.el.dataset.service = "close";
      // Also flip the widget MODEL — onUiEvent resolves the service from the
      // model before the DOM attribute, so without this the relabeled "Close"
      // button still fired the stale "cancel-all" service.
      if (p.mset) p.mset(_a.service, "close");
    });
    this._maybeArmAutoMinimize();
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

  _retryEntry(id) {
    if (!this._job) return;
    const find = (list) => {
      for (const e of list) {
        if (e.id === id) return e;
        if (e.kind === "folder") { const r = find(e.children); if (r) return r; }
      }
      return null;
    };
    const entry = find(this._bundle);
    if (!entry || entry.status !== "error") return;
    entry.status = "queued";
    this._renderProgressList();
    this._job.retry(entry).then(() => { this._renderAggregate(); this._renderProgressList(); });
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
    if (service === "add-files") {
      if (this._fileSelector && this._fileSelector.open) {
        this._fileSelector.open((e) => {
          const roots = this._bundleEntry.entriesFromFileList(e.target.files);
          this._addToBundle(roots);
        });
      }
      return;
    }
    if (service === "add-folder") { this._ensureDirInput().click(); return; }
    if (service === "upload-all") { this._startBundle(); return; }
    if (service === "clear-bundle") { this._bundle = []; this._renderStaging(); return; }
    if (service === "toggle-replace") {
      this._replaceExisting = !this._replaceExisting;
      if (cmd && cmd.setState) cmd.setState(this._replaceExisting ? 1 : 0);
      return;
    }
    if (service && service.indexOf("remove:") === 0) {
      this._removeFromBundle(service.slice(7)); return;
    }
    if (service && service.indexOf("retry:") === 0) { this._retryEntry(service.slice(6)); return; }
    if (service === "open-uploaded") {
      // Focus the finished file/folder ON THE LAYOUT only: locate its tile in the
      // current grid and select + scroll it into view. Never open a viewer / fall
      // back to navigation — if the tile isn't on screen, this is a no-op.
      const nid = cmd && cmd.mget ? cmd.mget(_a.nid) : null;
      const wm = window.Wm;
      if (nid == null || !wm || typeof wm.getItemsByAttr !== "function") return;
      const item = wm.getItemsByAttr(_a.nid, nid)[0];
      if (item && item.el) {
        if (typeof item.select === "function") item.select();
        else if (typeof item.setState === "function") item.setState(1);
        try { item.el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { }
      }
      return;
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
        // Footer: cancel and stay, so the user can see what was cancelled.
        return this.cancelAll();

      case "cancel-close":
        // Header X: cancel and dismiss.
        return this.cancelAll({ close: true });

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

/**
 * Cancel and dismiss the progress window because the server refused on quota.
 *
 * For callers that are not the window itself — media/core.js raises the
 * quota-exceeded card from onServerComplain, and the uploads behind it are
 * already doomed: every remaining one will be refused for the same reason.
 * Leaving the panel up shows a progress bar for work that cannot finish.
 *
 * No-op when no window is open, so the caller never has to check.
 */
__window_upload_progress.dismissForQuota = function () {
  if (typeof window === "undefined" || !window.Wm) return;
  const open = window.Wm.getItemsByKind &&
    window.Wm.getItemsByKind("window_upload_progress");
  if (!open || !open.length) return;
  for (const w of open) {
    if (w && !w.isDestroyed() && w.cancelAll) w.cancelAll({ close: true });
  }
};

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

/**
 * Open (or reuse) the upload-progress window in staging phase.
 * Reuses the existing getOrCreate singleton path.
 * @param {Object} [targetWindow] - the caller window (stored as _targetWindow)
 * @returns {Promise<__window_upload_progress|null>}
 */
__window_upload_progress.openStaging = function(targetWindow) {
  return __window_upload_progress.getOrCreate().then(function(win) {
    if (!win) return null;
    win._targetWindow = targetWindow || win._targetWindow;
    win._dropDest = null;            // staging derives dest from the target window
    win._phase = "staging";
    const root = win.el && win.el.querySelector(`.${win.fig.family}__container`);
    if (root && root.dataset) root.dataset.phase = "staging";
    if (win.raise) win.raise();
    if (win._renderStaging) win._renderStaging();
    return win;
  });
};

/**
 * Run a drag-dropped bundle directly (skip staging): set the entry tree + an
 * explicit destination, then start the job and show progress. Used by the
 * workspace drag-drop path so file+folder drops go through the same proven
 * make_dir-first BundleJob orchestrator as the staging "Upload all".
 * @param {Array}  roots        BundleEntry roots (from entriesFromDataTransfer)
 * @param {string} destNid      destination directory nid (the drop target)
 * @param {string} hub_id       destination hub id
 * @param {Object} [targetWindow] folder window to refresh on completion
 * @returns {Promise<__window_upload_progress|null>}
 */
__window_upload_progress.runBundle = function(roots, destNid, hub_id, targetWindow) {
  if (!roots || !roots.length) return Promise.resolve(null);
  return __window_upload_progress.getOrCreate().then(function(win) {
    if (!win) return null;
    win._targetWindow = targetWindow || win._targetWindow;
    // Merge into the visible bundle list (do not replace — user may drop more
    // files while a prior batch is still uploading).
    const batch = roots;
    for (const r of batch) win._mergeEntry(win._bundle, r);
    win._replaceExisting = false;
    win._phase = "progress";
    const root = win.el && win.el.querySelector(`.${win.fig.family}__container`);
    if (root && root.dataset) root.dataset.phase = "progress";
    if (win.raise) win.raise();
    win._enqueueBundle(batch, destNid, hub_id);
    return win;
  });
};

module.exports = __window_upload_progress;

