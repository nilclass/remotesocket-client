var proxyAddress;

define([
  'generic_client',
  'imap_client'
], function(genericClient, imapClient) {

  var currentAction = null;

  function runAction(name, handler) {
    if(currentAction) {
      var current = document.getElementById('action-' + currentAction);
      current.setAttribute('class', 'template');
    }
    document.getElementById('action-' + name).setAttribute('class', 'template current');
    currentAction = name;
    handler();
  }

  function dispatch() {
    var md = document.location.hash.match(/^#(.+)$/), action = md ? md[1] : null;
    
    switch(action) {
    case null: break;
    case 'generic': runAction(action, genericClient); break;
    case 'imap': runAction(action, imapClient); break;
    default: alert("Action not found: " + action);
    }
  }

  function navigateTo(path) {
    history.pushState(null, path, path);
    dispatch();
  }

  function setupNavigation() {
    var nav = document.getElementById('nav');
    nav.onclick = function(event) {
      if(event.target.tagName === 'A') {
        event.preventDefault();
        navigateTo(event.target.getAttribute('href'));
        return false;
      }
    }
  }

  window.onpopstate = dispatch;

  window.onload = function() {

    setupNavigation();

    var proxyAddr = document.getElementById('proxy-addr');
    function setProxyAddress() {
      proxyAddress = proxyAddr.value;
    }
    proxyAddr.onblur = setProxyAddress;
    setProxyAddress();
  }
});
