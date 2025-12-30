
module.exports = function(ui, data={}){
  const value = data.count || "";
  
  const counter = { 
    service    : "counter",
    sys_pn     : "counter",
    className  : `${ui.fig.family}__digit `,
    innerClass : `${ui.fig.group}__btn-counter`,
    content    : value,
    dataset    : { 
      count    : ui.mget(_a.count)
    }
  };

  return [Skeletons.Note(counter)];
};
