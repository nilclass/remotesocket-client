define([], function() {

  /** INTERFACE: eventEmitter */
  return {
    _eventHandlers: {},

    on: function(type, handler) {
      if(! (type in this._eventHandlers)) {
        this._eventHandlers[type] = [];
      }
      this._eventHandlers[type].push(handler)
    },

    trigger: function(type, data) {
      var handlers = this._eventHandlers[type] || [];
      var event = { type: type, data: data };
      console.log('TRIGGER', this, type, handlers.length);
      handlers.forEach(function(handler) { handler(event); });
    },

    forwardEvent: function(source, type) {
      source.on(type, function(event) {
        this.trigger(type, event.data);
      }.bind(this));
    }
                
  }

});