define(['util', 'socket/event_emitter'], function(util, eventEmitter) {

  /** CLASS: LineBuffer */
  var LineBuffer = function() {
    util.extend(this, eventEmitter);
  }

  LineBuffer.prototype = {
    _buffer: '',
    push: function(data) {
      if(this._intercepting) {
        this.interceptNow();
        return;
      }
      this._buffer += data;
      var parts;
      while((parts = this._buffer.split(/\r?\n/)).length > 1) {
        var line = parts.shift();
        this._buffer = parts.join('\n');
        this._lastLine = line;
        this.trigger('line', line);
      }
    },

    intercept: function(bytes, callback) {
      this._intercepting = {
        bytes: bytes, callback: callback, buffer: '', count: bytes
      }
      console.log("INTERCEPT NOW", bytes, "BYTES.", "LAST LINE", this._lastLine);
      this.interceptNow();
    },

    interceptNow: function() {
      var bytes = Math.min(this._buffer.length - 1, this._intercepting.count);
      this._intercepting.buffer += this._buffer.slice(0, bytes);
      this._buffer = this._buffer.slice(bytes);
      this._intercepting.count -= bytes;
      console.log("INTERCEPTED BYTES", JSON.stringify(this._intercepting));
      if(this._intercepting.count == 0) {
        this._intercepting.callback(this._intercepting.buffer);
        this._intercepting = null;
      }
    }
  }

  return LineBuffer;

});