
Array.prototype.plug =function(k, v) { 
  return this.forEach(c=> {
    return c[k] = v;
  });
};
    