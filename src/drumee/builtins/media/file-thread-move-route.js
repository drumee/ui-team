const FALLBACK_FILE_THREAD_MOVE = "media.move_cross_hub";
const FALLBACK_WORKSPACE_MOVE = "media.workspace_move";

function mediaServices(services) {
  return (services && services.media) || {};
}

function fileThreadMoveService(services) {
  return mediaServices(services).move_cross_hub || FALLBACK_FILE_THREAD_MOVE;
}

function workspaceMoveService(services) {
  return mediaServices(services).workspace_move || FALLBACK_WORKSPACE_MOVE;
}

function selectCrossWorkspaceMoveService(threadInfo, services) {
  const info = threadInfo || {};
  const hasFileThread = Number(info.exists_thread) === 1 &&
    Boolean(info.file_thread_id);

  return hasFileThread
    ? fileThreadMoveService(services)
    : workspaceMoveService(services);
}

function isMoveResultSuccessful(service, result, services) {
  if (!result) return false;
  if (service !== fileThreadMoveService(services)) return true;
  return result.state === "committed";
}

module.exports = {
  isMoveResultSuccessful,
  selectCrossWorkspaceMoveService,
};
