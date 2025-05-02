module.exports   = function(){
  let html = `
    <div>Ooops !</div> 
    <div>Could not find proper data from the end point ${bootstrap().serviceUrl}.</div> 
    <a \
    style=\"width: 475px; height: 354px; font-size:20px; color:red; margin:auto;\" 
    href=\"https://drumee.com/#/desk\">go to your own desk</a>
  `;
  return html;
};