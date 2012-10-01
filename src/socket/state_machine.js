
define([], function() {

  /** INTERFACE: stateMachine */
  return {
    _state: 'init',
    _stateMap: {},

    jump: function(state, data) {
      if(this._validateTransition(state)) {
        console.log('Transition: ', this._state, '->', state);
        this._state = state;
        this.trigger('state', { state: this._state, data: data });
        this.trigger('state-' + this._state, data);
      } else {
        throw "Invalid transition: " + this._state + " -> " + state;
      }
    },

    canJump: function(state) {
      return this._validateTransition(state);
    },

    defineStates: function(stateMap) {
      this._stateMap = stateMap;
    },

    _validateTransition: function(state) {
      var valid = this._stateMap[this._state];
      if(! valid) {
        return false;
      }
      for(var i=0;i<valid.length;i++) {
        if(state === valid[i]) {
          return true;
        }
      }
      return false;
    }
  }

});