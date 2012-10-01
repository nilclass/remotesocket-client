define([
  'util',
  'socket/event_emitter',
  'socket/state_machine',
  'socket/line_buffer',
  'socket/tcp'
], function(util, eventEmitter, stateMachine, LineBuffer, TCPSocket) {

  /** NAMESPACE: IMAP */
  var IMAP = {};

  /** CLASS: IMAP.Client */
  IMAP.Client = function(host, port, options) {
    util.extend(this, eventEmitter);
    util.extend(this, stateMachine);

    this.defineStates({
      'init'          : ['connected'],
      'connected'     : ['greeted'],
      'greeted'       : ['anonymous', 'authenticated', 'loggedout'],
      'anonymous'     : ['authenticated', 'loggedout'],
      'authenticated' : ['selected', 'loggedout'],
      'selected'      : ['authenticated', 'loggedout', 'selected'],
      'loggedout'     : ['closed']
    });    
    
    this.inputBuffer = new LineBuffer();
    this.inputBuffer.on('line', this.parseLine.bind(this));

    this.tcp = new TCPSocket(host, port, options);


    this.tcp.on('data', function(event) {
      this.inputBuffer.push(event.data);
    }.bind(this));


    this.tcp.on('close', function(event) { this.jump('closed'); }.bind(this));
    this.tcp.on('open', function(event) { this.jump('connected'); }.bind(this));

    this.on('state-greeted', function(event) {
      console.log("GREETING CODES", event.data);
    });
  }

  IMAP.Client.prototype = {

    _idCounter: 0,
    _tagHandler: {},
    _untaggedHandler: {},
    // not sure what to do with these. probably just parse the once we can,
    // throw the rest away.
    _untaggedResponses: [],

    nextToken: function(data, separator, callback) {
      var token = '';
      for(var i=0;i<data.length;i++) {
        if(data[i] === separator) {
          data = data.slice(i + 1);
          break;
        } else {
          token += data[i];
        }
      }
      if(token.length == data.length) {
        callback.apply(this, [null]);
      } else {
        callback.apply(this, [token, data]);
      }
    },

    interceptData: function(bytes, callback) {
      this.inputBuffer.intercept(bytes, callback);
    },
    
    parseLine: function(event) {
      var line = event.data;
      this.nextToken(line, ' ', function(tag, rest) {
        if(tag === '*') {
          this.handleUntaggedMessage(rest);
        } else if(tag === '+') {
          this.handleContinuationMessage(rest);
        } else {
          this.handleTaggedMessage(tag, rest);
        }
      });
    },

    handleUntaggedMessage: function(line) {
      this._untaggedResponses.push(line);
      for(var id in this._untaggedHandler) {
        var md;
        if(md = line.match(this._untaggedHandler[id].pattern)) {
          this._untaggedHandler[id].callback(md);
        }
      }
      this.nextToken(line, ' ', function(resp, rest) {
        console.log("UNTAGGED", resp, rest);
        switch(resp) {
        case 'OK':
          if(this.canJump('greeted')) {
            var md = line.match(/\[(.+)\]/), codes = md ? md[1].split(' ') : [];
            this.jump('greeted', codes);
          }
          break;
        case 'NO':
          break;
        case 'BAD':
          this.trigger('error', "BAD: " + line);
          break;
        case 'PREAUTH':
          break;
        default:
        }
      });
    },

    handleContinuationMessage: function(line) {
    },

    handleTaggedMessage: function(tag, line) {
      console.log("TAGGED MESSAGE", tag, line);
      var handler = this._tagHandler[tag];
      if(handler) {
        handler(line);
      } else {
        console.log("WARNING: No tag handler installed for " + tag);
      }
    },

    sendCommand: function() {
      var args = util.array(arguments);
      var callback = args.pop();
      if(typeof(callback) !== 'function') {
        throw 'No callback given!';
      }
      var tag = this.acquireTag(callback);
      var data = tag + ' ' + args.join(' ') + '\r\n';
      console.log("SEND DATA", data.replace(/\r?\n/g, '\\n'));
      this.tcp.write(data);
    },

    acquireTag: function(handler) {
      var tag = this._generateId();
      this._tagHandler[tag] = handler;
      return tag;
    },

    _generateId: function() {
      var id = ++this._idCounter;
      var c = Math.floor(id / 100);
      id = id % 100;
      id = String.fromCharCode(97 + (c % 26)) + String(id);
      return id;
    },

    onUntagged: function(pattern, callback) {
      var id = this._generateId();
      this._untaggedHandler[id] = {
        pattern: pattern,
        callback: callback
      }
      return {
        clear: function() {
          delete this._untaggedHandler[id];
        }.bind(this)
      };
    },

    findUntagged: function(pattern, count, callback) {
      if(!callback) { callback = count; count = null; }
      var found = 0;
      for(var i=this._untaggedResponses.length-1;i>=0;i--) {
        var response = this._untaggedResponses[i], md;
        if(md = response.match(pattern)) {
          var result = callback(md);
          if(count < found) {
            found++;
          } else {
            return result;
          }
        }
      }
      if(found == 0) {
        console.log("WARNING: no untagged response found for pattern: " + String(pattern));
      }
      return null;
    },

    // COMMANDS

    login: function(username, password) {
      this.sendCommand(
        'LOGIN', username, password, function(response) {
          var md;
          if(md = response.match(/^OK (.+)/)) {
            this.jump('authenticated', md[1]);
          } else {
            this.trigger('error', 'authentication failed ' + response);
          }
        }.bind(this)
      );
    },

    noop: function() {
      this.sendCommand('NOOP', function() {});
    },

    logout: function() {
      this.sendCommand('LOGOUT', function(response) {
        this.jump('loggedout');
      }.bind(this));
    },

    select: function(mailbox) {
      this.sendCommand(
        'SELECT', mailbox, function(response) {
          var md;
          if(md = response.match(/^OK (.+)/)) {
            this.jump('selected', md[1]);
          } else {
            this.trigger('error', 'selecting mailbox failed: ' + response);
          }
        }.bind(this)
      );
    },

    search: function() {
      var args = util.array(arguments);
      var callback = args.pop();
      this.sendCommand('SEARCH', args.join(' '), function() {
        this.findUntagged(/^SEARCH (.+)$/, function(match) {
          callback(match[1].split(' '));
        });
      }.bind(this));
    },

    fetch: function(sequenceSet, what, callback) {
      var seq = sequenceSet.join(','), w = what.length > 1 ? 
        '(' + what.join(' ') + ')' : what;

      var idMap = {};
      for(var i=0;i<sequenceSet.length;i++) {
        idMap[String(sequenceSet[i])] = {};
      }

      var cb = this.onUntagged(/^(\d+) FETCH (.+)$/, function(m) {
        var msg = idMap[m[1]];
        if(! msg) { return; }
        var md = m[2].match(/\(([^\{]+)\s\{(\d+)\}/);
        if(md) {
          var key = md[1];
          this.interceptData(
            Number(md[2]) - (md[2].length + 1), function(value) {
              msg[key] = value.replace(/\)\s*$/, '');
              callback(Number(m[1]), msg);
            });
        } else {
          this.trigger('error', 'failed to parse FETCH response: ' + md[2]);
        }
      }.bind(this));
      
      this.sendCommand('FETCH', seq, w, function(response) {
        cb.clear();
      }.bind(this));
    }

  }

  return IMAP;
});
