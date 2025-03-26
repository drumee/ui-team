
function traverseDirectory(entry, name) {
  const folder = entry.createReader();
  // Resolved when the entire directory is traversed
  if(!entry.isDirectory){
    console.warn("entry is not a directory");
    return 

  }
  let p = new Promise((resolve, reject) => {
    const queue = [name];
    function readEntries() {
      // According to the FileSystem API spec, readEntries() must be called until
      // it calls the callback with an empty array.  Seriously??
      folder.readEntries((entries) => {
        if (!entries.length) {
          // Done iterating this particular directory
          resolve(Promise.all(queue));
        } else {
          // Add a list of promises for each directory entry.  If the entry is itself
          // a directory, then that promise won't resolve until it is fully traversed.
          queue.push(Promise.all(entries.map((item) => {
            if (item.isFile) {
              return item;
            }
            return traverseDirectory(item, name);
          })));
          readEntries();
        }
      }, error => reject(error));
    }
    readEntries();
  });
  return p;
}
module.exports = traverseDirectory    
