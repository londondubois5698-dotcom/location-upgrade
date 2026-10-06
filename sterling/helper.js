(function(){
'use strict';
try{
  if(window.__sterlingONE&&window.__sterlingONE.version==='13.0'){
    window.__sterlingONE.open();
    return;
  }
  try{
    if(window.__sterlingONE&&window.__sterlingONE.stop)window.__sterlingONE.stop();
  }catch(e){}
  var ids=['sterling-v11-host','sterling-one-v12','sterling-one-v13-loader','sterling-one-v12-loader'];
  ids.forEach(function(id){var el=document.getElementById(id);if(el)el.remove()});
  try{window.__sterlingV11=null;window.__sterlingONE=null}catch(e){}
  var sc=document.createElement('script');
  sc.id='sterling-one-v13-loader';
  sc.src='https://sterling-olive.vercel.app/one.js?v=13.0&t='+Date.now();
  sc.async=false;
  sc.onerror=function(){alert('Sterling V13 could not load. Refresh Salesforce and tap the Sterling ONE bookmark again.');};
  (document.documentElement||document.body).appendChild(sc);
}catch(e){
  alert('Sterling V13 loader error: '+(e&&e.message?e.message:e));
}
})();