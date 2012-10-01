define(['util', 'socket/event_emitter'], function(util, eventEmitter) {

  /** CLASS: TCPSocket */
  var TCPSocket = function(host, port, options) {

    util.extend(this, eventEmitter);

    this.host = host, this.port = port;
    this.hostAndPort = host + ':' + port;
    this.options = options || {};

    var query = this._generateQuery();

    this.socket = new WebSocket(proxyBase + "/" + this.host + '/' + this.port + query, 'tcp-stream-protocol');

    this.socket.onopen = function() {
      console.log("Socket opened.");
      this.trigger('open');
    }.bind(this);
    this.socket.onmessage = function(message) {
      console.log('receive', message);
      this.trigger('data', message.data);
    }.bind(this);
    this.socket.onclose = function() {
      console.log("Connection closed: ", this.hostAndPort);
      this.trigger('close');
    }.bind(this);
  }

  TCPSocket.prototype = {
    write: function(data) {
      this.socket.send(data);
    },

    close: function() {
      this.socket.close();
    },

    _generateQuery: function() {
      var pairs = [];
      for(var key in this.options) {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(this.options[key]));
      }
      return pairs.length > 0 ? '?' + pairs.join('&') : '';
    }
  }

  return TCPSocket;

});