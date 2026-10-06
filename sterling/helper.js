(function(){
'use strict';
try{
  if(window.__sterlingONE&&window.__sterlingONE.version==='14.0'){
    window.__sterlingONE.open();
    return;
  }
  try{
    if(window.__sterlingONE&&window.__sterlingONE.stop)window.__sterlingONE.stop();
  }catch(e){}
  var ids=['sterling-v11-host','sterling-one-v12','sterling-one-v14-loader','sterling-one-v12-loader'];
  ids.forEach(function(id){var el=document.getElementById(id);if(el)el.remove()});
  try{window.__sterlingV11=null;window.__sterlingONE=null}catch(e){}
  var sc=document.createElement('script');
  sc.id='sterling-one-v14-loader';
  sc.src='https://sterling-olive.vercel.app/one.js?v=14.0&t='+Date.now();
  sc.async=false;
  sc.onerror=function(){alert('Sterling V14 Alpha could not load. Refresh Salesforce and tap the Sterling ONE bookmark again.');};
  (document.documentElement||document.body).appendChild(sc);
}catch(e){
  alert('Sterling V14 Alpha loader error: '+(e&&e.message?e.message:e));
}
})();