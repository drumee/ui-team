const { makeHeaders } = require("core/socket/utils")


/**
 * 
 * @returns 
 */
function onReadyStateChange(r) {
  let { target } = r;
  if (target) {
    try {
      let { responseText, readyState, status } = target;
      if (readyState == 4) {
        let { data } = JSON.parse(responseText);
        switch (status) {
          case 200:
            if (this.onUploadResponse) {
              this.onUploadResponse(data);
            }
            break;
          case 0:
            break;
          default:
            if (this.onUploadError) {
              this.onUploadError(this.pendingItem);
            }
        }
        return;
      }
    } catch (e) {
      this.warn("RESPONSE_PARSE_ERROR", e);
      return;
    }
  }
}


/**
 * @param {any} url - url of backend service
 */
export function uploadFile(file, params) {
  let xhr = new XMLHttpRequest();
  let uploader = xhr.upload || xhr;
  if (this.onAbort) {
    uploader.onabort = this.onAbort.bind(this);
  }
  if (this.onReadystatechange) {
    uploader.onreadystatechange = this.onReadystatechange.bind(this);
  }
  if (this.onUploadError) {
    uploader.onerror = this.onUploadError.bind(this);
  }
  if (this.onLoad) {
    this.pendingItem = { ...params, file };
    uploader.onload = this.onLoad.bind(this);
  }
  if (this.onUploadEnd) {
    uploader.onloadend = this.onUploadEnd.bind(this);
  }
  if (this.onUploadProgress) {
    uploader.onprogress = this.onUploadProgress.bind(this);
  }

  xhr.onreadystatechange = onReadyStateChange.bind(this);
  const { svc } = bootstrap();
  let { service } = params;
  if (!service) {
    service = 'media.upload'
  } else {
    delete params.service;
  }
  xhr.open(_a.post, `${svc}${service}`, true);

  const opt = {
    filename: encodeURI(file.name),
    mimetype: file.type,
    filesize: file.size,
    socket_id: this.get(_a.socket_id) || Visitor.get(_a.socket_id),
    ...params
  };
  const _data = JSON.stringify(opt);
  makeHeaders({
    "Content-Type": "application/octet-stream; charset=utf-8",
    "x-param-xia-data": _data
  }, xhr)
  this.verbose(`Sending ${file.name} (${file.size})`);
  // addListeners(this, xhr, file, params);
  if (_.isFunction(file.file)) {
    file.file((f) => {
      xhr.send(f);
    })
  } else {
    try {
      xhr.send(file);
    } catch (error) {
      if (this.onUploadError) {
        this.onUploadError({ error, file, params })
      }
    }
  }
  return xhr
}

