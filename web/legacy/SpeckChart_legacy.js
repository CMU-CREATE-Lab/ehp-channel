(function () {
  "use strict";

  var util = window.ehp.util;
  if (!util) {
    throw new Error("Error: failed to load the util class, check if you load util.js first");
    return;
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var SpeckChart = function (chart_container_id, chart_settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //

    // Settings
    var channel_names = ( typeof (chart_settings["channel_names"]) === "undefined") ? "particle_concentration,temperature" : chart_settings["channel_names"];
    var selected_channel_name = "particle_concentration";

    // This table stores the mapping of Speck ID and ESDR feed information
    // (created by using the Python script)
    var device_feed_table = ( typeof (chart_settings["device_feed_table"]) === "undefined") ? {} : chart_settings["device_feed_table"];

    // Constants
    var ESDR_API_ROOT_URL = "http://esdr.cmucreatelab.org/api/v1";
    var MONTH_STR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // DOM objects
    var $chart_container = $("#" + chart_container_id);
    var $message;

    // Grapher
    var plot_container_id = "plot_container";
    var y_axis_id = "y_axis";
    var date_axis_id = "date_axis";
    var plot_manager;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    function init() {
      initUI();

      // Handle shared urls
      handleHashChange();
      window.addEventListener("hashchange", handleHashChange, false);
    }

    function initUI() {
      var html = '<div class="message"></div>';
      $chart_container.append($(html));
      $message = $(".message");
    }

    function createChart() {
      var html = '';
      html += '<table class="grapher" border="0" cellpadding="0" cellspacing="0" align="center">';
      html += '  <tr>';
      html += '    <td>';
      html += '      <div id="date_axis_container">';
      html += '        <div id="' + date_axis_id + '" class="date_axis"></div>';
      html += '      </div>';
      html += '    </td>';
      html += '    <td></td>';
      html += '  </tr>';
      html += '  <tr>';
      html += '    <td>';
      html += '      <div id="' + plot_container_id + '" class="plot_container"></div>';
      html += '      <div class="value_and_time"><div class="value"></div>&nbsp;&mu;g/m<sup>3</sup>&nbsp;(<div class="time"></div>)</div>';
      html += '    </td>';
      html += '    <td>';
      html += '      <div id="' + y_axis_id + '" class="y_axis"></div>';
      html += '      <div class="y_axis_label">PM<sub>2.5</sub></div>';
      html += '    </td>';
      html += '  </tr>';
      html += '</table>';
      $chart_container.append($(html));
    }

    function deleteChart() {
      $(".grapher").remove();
      plot_manager = null;
    }

    function handleHashChange() {
      var has_data = false;
      var unsafe_hash = util.getUnsafeHashString().match(/#(.+)/);
      if (unsafe_hash) {
        var unsafe_hash_obj = util.unpackVars(unsafe_hash[1]);
        var device_id = unsafe_hash_obj["device_id"];
        var feed = device_feed_table[device_id];
        if (typeof feed != "undefined") {
          var api_key_read_only = feed[3];
          has_data = true;
          deleteChart();
          $message.hide();
          loadEsdrFeedInfo(api_key_read_only, function (feed_info) {
            createChart();
            renderChart(api_key_read_only, feed_info);
          });
        }
      }
      if (!has_data) {
        deleteChart();
        $message.text("No speck is selected").show();
      }
    }

    function renderChart(api_key_read_only, feed_info) {
      var plot_id = feed_info["id"];
      var $value = $(".value");
      var $time = $(".time");
      var $value_and_time = $(".value_and_time");
      var $y_axis = $("#" + y_axis_id);
      var $date_axis = $("#" + date_axis_id);
      var channel_min_time = feed_info["channelBounds"]["channels"][selected_channel_name]["minTimeSecs"];
      var channel_max_time = feed_info["channelBounds"]["channels"][selected_channel_name]["maxTimeSecs"];

      plot_manager = new org.bodytrack.grapher.PlotManager(date_axis_id);
      plot_manager.setWillAutoResizeWidth(true, function () {
        return $chart_container.width() // chart width
          - $y_axis.width() // Y axis width
          - 4; // grapher and Y axis borders
      });
      plot_manager.addPlotContainer(plot_container_id).setAutoScaleEnabled(true, true);
      plot_manager.getDateAxis().setRange(channel_min_time, channel_max_time);
      plot_manager.getDateAxis().constrainRangeTo(channel_min_time, channel_max_time);
      plot_manager.addDataSeriesPlot(
        plot_id,
        function (level, offset, successCallback) {
          loadEsdrTile(api_key_read_only, selected_channel_name, level, offset, successCallback);
        },
        plot_container_id,
        y_axis_id
      );
      plot_manager.getPlot(plot_id).addDataPointListener(function (val) {
        if (val == null) {
          $value.empty();
          $time.empty();
          $value_and_time.hide();
        }
        else {
          $value.text(util.roundTo(val.y, 1));
          var date = new Date(val.x * 1000);
          var month = date.getMonth();
          var day = date.getDate();
          var hour = date.getHours() + 1;
          var minute = date.getMinutes() + 1;
          $time.text(MONTH_STR[month] + " " + day + " at " + ("0" + hour).slice(-2) + ":" + ("0" + minute).slice(-2));
          $value_and_time.show();
        }
      });
      plot_manager.getPlotContainer().setHeight($chart_container.height() - $date_axis.height() - 2);
    }

    function loadEsdrFeedInfo(api_key_read_only, success_callback) {
      $.ajax({
        type: "GET",
        url: ESDR_API_ROOT_URL + "/feeds/" + api_key_read_only,
        success: function (response) {
          if (typeof success_callback == "function") {
            success_callback(response.data);
          }
        },
        error: function (response) {
          console.log("server error:", response);
        }
      });
    }

    function loadEsdrTile(api_key_read_only, channel_name, level, offset, success_callback) {
      $.ajax({
        type: "GET",
        url: ESDR_API_ROOT_URL + "/feeds/" + api_key_read_only + "/channels/" + channel_name + "/tiles/" + level + "." + offset,
        success: function (response) {
          if (typeof success_callback == "function") {
            success_callback(response.data);
          }
        },
        error: function (response) {
          console.log("server error:", response);
        }
      });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Privileged methods
    //

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Constructor
    //
    init();
  };

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Register to window
  //
  if (window.ehp) {
    window.ehp.SpeckChart = SpeckChart;
  } else {
    window.ehp = {};
    window.ehp.SpeckChart = SpeckChart;
  }
})();
