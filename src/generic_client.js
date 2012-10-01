define(['util', 'socket/tcp'], function(util, TCPSocket) {

  return function() {

    var connectForm = document.getElementById('connect-form');
    var sendForm = document.getElementById('send-form');
    var helperRunnerForm = document.getElementById('helper-runner-form');

    var logStreams = {
      client: document.getElementById('log-stream-client'),
      server: document.getElementById('log-stream-server')
    }

    var helperRunners = {};

    var socket, currentHost, currentPort;

    function implementHelper(name, callback) {
      var option = document.createElement('option');
      option.setAttribute('value', name);
      option.innerHTML = name;
      helperRunnerForm.helper.appendChild(option);
      helperRunners[name] = callback;
    }

    function runHelper() {
      if(! socket) {
        console.log("NOT CONNECTED");
      } else {
        helperRunners[helperRunnerForm.helper.value]();
      }
    }

    function logStream(name, data) {
      logStreams[name].innerHTML += util.escapeHTML(data);
    }

    function connectSocket() {
      var host = connectForm.host.value, port = connectForm.port.value;
      socket = new TCPSocket(host, port);

      socket.on('open', function() {
        currentHost = host, currentPort = port;
      });
      socket.on('close', disconnectSocket);
      socket.on('data', function(event) {
        logStream('server', event.data);
      });

      connectForm.connect.disabled = true;
      connectForm.disconnect.disabled = false;
    }

    function doSend(data) {
      console.log("SEND", data.length, "Bytes")
      socket.write(data);
      logStream('client', data);
    }
    
    function sendData() {
      if(! socket) {
        console.log("NOT CONNECTED");
      } else {
        var data = sendForm.data.value;
        doSend(data);
      }
    }

    function disconnectSocket() {
      if(! socket) { return; }
      console.log("DISCONNECT");

      connectForm.connect.disabled = false;
      connectForm.disconnect.disabled = true;

      socket.close();
      socket = undefined;
    }

    implementHelper('http', function() {
      doSend('GET / HTTP/1.1\r\nHost: ' + currentHost+'\r\nConnection: keep-alive\r\n\r\n');
    });

    connectForm.onsubmit = util.terminateEvent(connectSocket);
    connectForm.disconnect.onclick = util.terminateEvent(disconnectSocket);

    sendForm.onsubmit = util.terminateEvent(sendData);

    helperRunnerForm.onsubmit = util.terminateEvent(runHelper);
    document.getElementById('clear-streams').onclick = function() {
      logStreams.client.innerHTML = logStreams.server.innerHTML = '';
    };

  }
});