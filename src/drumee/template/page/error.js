module.exports   = function(style){
  let html = `
    <div>Ooops !</div> 
    <div>${location.host} could not be found.</div> 
    <a ${style} 
    href=\"https://drumee.com/#/desk\">go to your own desk</a>
  `;
  return html;
};