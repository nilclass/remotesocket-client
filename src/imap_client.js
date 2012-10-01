
define(['util', 'socket/imap'], function(util, IMAP) {

  return function() {
    var imapForm = document.getElementById('imap-form'), imap;
    var stateDiv = document.getElementById('imap-state');
    var imapHeadlines = document.getElementById('imap-headlines');

    function resetButtons() {
      imapForm.connect.disabled = false;
      imapForm.login.disabled = true;
      imapForm.logout.disabled = true;
      imapForm.select.disabled = true;
    }

    resetButtons();

    imapForm.connect.onclick = util.terminateEvent(function() {
      imap = window.imap = new IMAP.Client(
        imapForm.host.value, imapForm.port.value, {
          ssl: imapForm.ssl.checked
        }
      );
      imap.on('error', function(event) {
        console.error("IMAP ERROR: ", event.data);
        resetButtons();
      });

      imap.on('state', function(event) {
        stateDiv.innerHTML = event.data.state;
      });

      imapForm.connect.disabled = true;

      imap.on('state-closed', function(event) {
        resetButtons();
      });

      imap.on('state-greeted', function(event) {
        imapForm.login.disabled = false;
      });
    });

    imapForm.login.onclick = util.terminateEvent(function() {

      imap.on('state-authenticated', function(event) {
        imapForm.login.disabled = true;
        imapForm.logout.disabled = false;
        imapForm.select.disabled = false;
      });

      imap.on('state-loggedout', function(event) {
        imapForm.login.disabled = false;
        imapForm.logout.disabled = true;
        imapForm.select.disabled = true;
      });

      imap.login(imapForm.username.value, imapForm.password.value);
    });

    imapForm.select.onclick = util.terminateEvent(function() {

      imap.on('state-selected', function(event) {
        console.log("SELECTED", event);

        imap.search('ALL', function(ids) {
          imap.fetch(
            ids.slice(-15, -1),
            ['BODY[HEADER.FIELDS (SUBJECT)]'], function(id, message) {
              console.log("EMAIL", id, message);
              var subject = message['BODY[HEADER.FIELDS (SUBJECT)]'].
                replace(/(?:^\s*Subject\: |\s*$)/, '');
              var li = document.createElement('li');
              li.innerHTML = subject;
              imapHeadlines.appendChild(li);
            });
        });
      });

      imap.select('INBOX');
    });

    imapForm.logout.onclick = util.terminateEvent(function() {
      imap.logout();
    });

  }

});
