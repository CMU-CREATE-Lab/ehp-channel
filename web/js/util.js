(function () {
  "use strict";

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var Util = function () {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Privileged methods
    //
    this.getUnsafeHashString = function () {
      var unsafe_hash_source = "";
      var unsafe_hash_iframe = "";
      unsafe_hash_source = window.location.hash;
      try {
        unsafe_hash_iframe = window.top.location.hash;
        if (unsafe_hash_source)
          unsafe_hash_iframe = unsafe_hash_iframe.slice(1);
      } catch (e) {
        // Most likely we are dealing with different domains and cannot access window.top
      }
      return unsafe_hash_source + "&" + unsafe_hash_iframe;
    };

    // Unpack the variables in the hash
    this.unpackVars = function (str) {
      var keyvals = str.split('&');
      var vars = {};

      if (keyvals.length === 1 && keyvals[0] === "")
        return null;

      for (var i = 0; i < keyvals.length; i++) {
        var keyval = keyvals[i].split('=');
        vars[keyval[0]] = keyval[1];
      }
      return vars;
    };

    // Round up to n decimals
    var roundTo = function (val, n) {
      if (typeof n === "undefined") n = 0;
      var d = Math.pow(10, n);
      return Math.round(parseFloat(val) * d) / d;
    };
    this.roundTo = roundTo;

    // Convert an array of dictionaries to a dictionary by a key
    // Example:
    // arr = [{"id": "a", "val": 1}, {"id": "b", "val": 2}, {"id": "c", "val": 3}]
    // key = "id"
    // output = arrayToDict(arr, key)
    // output = {"a": {"id": "a", "val": 1}, "b": {"id": "b", "val": 2},  "c": {"id": "c", "val": 2}}
    this.arrayToDict = function (arr, key) {
      var dict = {};
      arr.forEach(function (d) {
        dict[d[key]] = d;
      });
      return dict;
    };

    // Replace the content in a dictionary by another dictionary
    // Example:
    // dict_1 = {"15213": ["a", "b"], "15232": ["c"]}
    // dict_2 = {"a": {"id": "a", "val": 1}, "b": {"id": "b", "val": 2},  "c": {"id": "c", "val": 2}}
    // output = replaceDictContent(dict_1, dict_2)
    // output = {"15213": [{"id": "a", "val": 1}, {"id": "b", "val": 2}], "15232": [{"id": "c", "val": 2}]}
    this.replaceDictContent = function (dict_1, dict_2) {
      var dict = {};
      for (var field in dict_1) {
        var tmp = [];
        dict_1[field].forEach(function (content) {
          tmp.push(dict_2[content]);
        });
        dict[field] = tmp;
      }
      return dict;
    };

    // Aggregate the content in a dictionary by another dictionary according to some keys
    // (currently compute the median or mean, can support more methods in the future)
    // Example:
    // method = "mean"
    // dict_1 = {"15213": ["a", "b"], "15232": ["c"]}
    // dict_2 = {"a": {"id": "a", "val": 1}, "b": {"id": "b", "val": 2},  "c": {"id": "c", "val": 2}}
    // keys = ["val"]
    // output = aggregateDicContent(dict_1, dict_2, keys, method)
    // output = {"val": {"15213": 1.5, "15232": 2}}
    // output["val"]["15213"] = dict_2[dict_1["15213"][0]]["val"] + dict_2[dict_1["15213"][1]]["val"]
    this.aggregateDicContent = function (dict_1, dict_2, keys, method) {
      method = typeof method === "undefined" ? "mean" : method;
      var dict = {};

      if (method === "mean") {
        for (var field in dict_1) {
          // Sum up all values in a field
          dict_1[field].forEach(function (v) {
            keys.forEach(function (k) {
              if (typeof dict[k] === "undefined") dict[k] = {};
              if (typeof dict[k][field] === "undefined") dict[k][field] = 0;
              dict[k][field] += parseFloat(dict_2[v][k]);
            });
          });
          // Compute the average
          var n = dict_1[field].length;
          keys.forEach(function (k) {
            dict[k][field] = roundTo(dict[k][field] / n, 2);
          });
        }
      } else if (method === "median") {
        for (var field in dict_1) {
          // Store an array of all values in a field
          dict_1[field].forEach(function (v) {
            keys.forEach(function (k) {
              if (typeof dict[k] === "undefined") dict[k] = {};
              if (typeof dict[k][field] === "undefined") dict[k][field] = [];
              dict[k][field].push(parseFloat(dict_2[v][k]));
            });
          });
          // Compute the mean
          keys.forEach(function (k) {
            dict[k][field] = roundTo(percentile(dict[k][field], 0.5), 2);
          });
        }
      }

      return dict;
    };

    // Get keys from a dictionary and filter them
    // Example:
    // dict = {"id": "a", "val": 1, "banana": 2}
    // keys_to_exclude = ["id"]
    // output = getFilteredKeys(dict, keys_to_exclude)
    // output = ["val", "banana"]
    this.getFilteredKeys = function (dict, keys_to_exclude) {
      var a = [];
      for (var key in dict) {
        if (keys_to_exclude.indexOf(key) === -1) a.push(key);
      }
      return a;
    };

    // Compute the percentile of an array
    // Example:
    // arr = [3, 6, 7, 8, 8, 10, 13, 15, 16, 20]
    // Q = 0.25
    // output = percentile(arr, Q)
    // output = 7.5
    var percentile = function (arr, Q) {
      if (arr.length === 1) return arr[0];

      var a = $.merge([], arr);

      a.sort(function (a, b) {
        return a - b
      });

      var q = Math.abs(Q);
      var result = NaN;
      if (q === 0) {
        result = a[0];
      } else if (q === 1) {
        result = a[a.length - 1];
      } else if (q > 0 && q < 1) {
        var i = q * (a.length - 1);
        var j = Math.floor(i);
        result = a[j] + (a[j + 1] - a[j]) * (i - j);
      }

      return Q >= 0 ? result : -result;
    };
    this.percentile = percentile;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Constructor
    //
  };

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Register to window
  //
  window.ehp = {};
  window.ehp.util = new Util();
})();