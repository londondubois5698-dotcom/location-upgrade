(function(){
'use strict';
try{
  if(window.__sterlingONE&&window.__sterlingONE.version==='12.2'){
    window.__sterlingONE.open();
    return;
  }
  var oldHost=document.getElementById('sterling-v11-host');
  if(oldHost)oldHost.remove();
  try{window.__sterlingV11=null}catch(e){}
  var existing=document.getElementById('sterling-one-v12-loader');
  if(existing)existing.remove();
  var s=document.createElement('script');
  s.id='sterling-one-v12-loader';
  s.src='https://sterling-olive.vercel.app/one.js?v=12.2&t='+Date.now();
  s.async=false;
  s.onerror=function(){alert('Sterling V12 could not load. Refresh Salesforce and tap the Sterling bookmark again.');};
  (document.documentElement||document.body).appendChild(s);
}catch(e){
  alert('Sterling V12 loader error: '+(e&&e.message?e.message:e));
}
})();