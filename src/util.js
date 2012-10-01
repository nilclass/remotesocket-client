define([], function() {
  return {

    escapeHTML: function(string) {
      return string.replace(/[<>]/g, function(c) {
        return c == '>' ? '&gt;' : '&lt;';
      });
    },

    terminateEvent: function(handler) {
      return function(event) {
        event.preventDefault();
        handler();
        return false;
      }
    },

    extend: function(target, source) {
      for(var key in source) {
        target[key] = typeof(source[key]) == 'object' ?
          this.extend({}, source[key]) : source[key];
      }
      return target;
    },

    array: function(arrayLike) {
      return Array.prototype.slice.call(arrayLike);
    },

    takeOptions: function(options) {
      var result = {};
      var keys = this.array(arguments).slice(1);
      keys.forEach(function(key) {
        result[key] = options[key];
        delete options[key];
      });
      return result;
    }
  };
});