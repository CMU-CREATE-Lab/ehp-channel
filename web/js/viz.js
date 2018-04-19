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
  var Viz = function (container_id, settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    var highlighted_zipcode;
    var mode = "speck"; // "speck" means using speck data, "health" means using health data
    var current_slideshow_index;
    var season = {
      speck: "All",
      health: "All"
    }; // the current selected season

    // For scaling data
    var min_output = -3; // to cap the output z-score
    var max_output = 3; // to cap the output z-score
    var color_scale = {
      speck: d3.scale.linear().domain([min_output, -2, -0.6, -0.3, 0, 0.3, 0.6, 2, max_output]).range(["#006837", "#1a9850", "#66bd63", "#a6d96a", "#cccc00", "#fdae61", "#f46d43", "#d73027", "#a50026"]).interpolate(d3.interpolateLab),
      health: d3.scale.linear().domain([min_output, -2, -0.6, -0.3, 0, 0.3, 0.6, 2, max_output]).range(["#006837", "#1a9850", "#66bd63", "#a6d96a", "#cccc00", "#fdae61", "#f46d43", "#d73027", "#a50026"]).interpolate(d3.interpolateLab)
    };
    //.range(["#1ac647", "#737373", "#0084ff"]) // green to grey to blue
    //.range(["#737373", "#7d9cc7", "#0084ff"]) // grey to blue
    //.range(["#737373", "#c17e84", "#ff003b"]) // grey to red
    //.range(["#fcbba1", "#cb181d", "#67000d"]) // red
    //.range(["#c6dbef", "#2171b5", "#08306b"]) // blue
    //.range(["#ccece6", "#238b45", "#00441b"]) // green
    //.range(["#fdd0a2", "#d94801", "#7f2704"]) // orange
    //.range(["#dadaeb", "#6a51a3", "#3f007d"]) // purple
    //.range(["#6eb1d9", "#835db9", "#810007"]) // blue to red
    //.range(["#78c679", "#31a354", "#2c7fb8", "#002d68"]) // green to blue
    //.range(["#00a511", "#fff200", "#ff6200", "#ff0000"]) // green to red

    // Objects
    var geo_heatmap;
    var chart = {
      speck: undefined,
      health: undefined
    };
    var color_scale_legend = {
      speck: undefined,
      health: undefined
    };
    var slideshow = [];

    // This table maps zipcodes and aggregated Speck (or health) analysis data
    var analysis = {
      speck: settings["speck_analysis"],
      health: settings["health_analysis"]
    };

    // Main data tables
    var data = {
      speck: settings["speck_data"],
      health: settings["health_data"],
      story: settings["story_data"]
    };

    // Get the available dimensions
    var available_dimensions = {
      speck: util.getFilteredKeys(analysis["speck"][season["speck"]], ["size"]),
      health: util.getFilteredKeys(analysis["health"][season["health"]], ["size"])
    };

    // Set selected dimensions
    var selected_dimension = {
      speck: available_dimensions["speck"][3],
      health: available_dimensions["health"][0]
    };

    // The title on the top-left on the map
    var title = {
      speck: "PM<sub>2.5</sub>",
      health: "Health Symptoms"
    };

    // Dimension settings
    var dimension_settings = {
      speck: {},
      health: {}
    };

    // Time ranges
    var time_ranges = {
      speck: Object.keys(settings["speck_data"]),
      health: Object.keys(settings["health_data"])
    };

    // Chart settings
    var chart_settings = {
      speck: {
        chart_min_width: available_dimensions["speck"].length * 130,
        margin_left: 10,
        margin_right: 10,
        wrap_label_width: 100,
        line_alpha: 0.4,
        line_alpha_on_brushed: 0.15,
        highlighted_line_width: 1,
        axis_font_size: "12px"
      },
      health: {
        chart_min_width: available_dimensions["health"].length * 75,
        margin_left: 15,
        margin_right: 10,
        wrap_label_width: 70,
        line_alpha: 0.7,
        line_alpha_on_brushed: 0.15,
        highlighted_line_width: 2,
        axis_font_size: "12px"
      }
    };

    // DOM objects
    var $container = $("#" + container_id);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    function init() {
      // Add map and the color legend
      addMap();

      // Add two color legends
      addColorScaleLegend("speck", mode !== "speck");
      addColorScaleLegend("health", mode !== "health");

      // Add two analysis charts
      addAnalysisChart("speck", mode !== "speck");
      addAnalysisChart("health", mode !== "health");

      // Add stories
      addStory();

      // Handle shared urls
      handleHashChange();
      window.addEventListener("hashchange", handleHashChange, false);
    }

    function addMap() {
      var map_class = "viz-map-container";
      var map_selector = "#" + container_id + " ." + map_class;

      // Add to DOM
      var $viz_map_container = $('<div class="' + map_class + '"></div>');
      $container.append($viz_map_container);

      // Create heatmap
      geo_heatmap = new edaplotjs.GeoHeatmap(map_selector, {
        zipcode_bound_geoJson: settings["zipcode_bound_geoJson"],
        zipcode_bound_info: settings["zipcode_bound_info"],
        zipcode_metadata: analysis[mode][season[mode]][selected_dimension[mode]],
        init_map_zoom: 9,
        color_scale: color_scale[mode],
        color_opacity: 0.7,
        scaling_method: "zscore",
        max_output: max_output,
        min_output: min_output,
        init_map_center: {
          lat: 40.4,
          lng: -80.05
        },
        info_window_html_layout: generateInfoWindowHTML,
        //mouseover_callback: onZipcodeRegionMouseover,
        //mouseout_callback: onZipcodeRegionMouseout,
        info_window_domready_callback: onInfoWindowDomReady,
        info_window_closeclick_callback: onInfoWindowCloseClick
      });

      // Add home button
      var $home_btn = $('<div class="home-btn custom-button" title="Go to home view"><div>');
      $home_btn.on("click", function () {
        geo_heatmap.setToDefaultView();
      });
      $viz_map_container.append($home_btn);

      // Add data tab buttons
      var $sensor_data_btn = $('<div class="sensor-data-btn custom-button" title="Change to sensor data tab"><div>');
      var $health_data_btn = $('<div class="health-data-btn custom-button" title="Change to health data tab"><div>');
      $sensor_data_btn.html(title["speck"]);
      $health_data_btn.html(title["health"]);
      $sensor_data_btn.on("click", function () {
        setMode("speck");
      });
      $health_data_btn.on("click", function () {
        setMode("health");
      });
      if (mode === "speck") {
        $sensor_data_btn.addClass("sensor-button-selected");
      } else if (mode === "health") {
        $health_data_btn.addClass("health-button-selected");
      }
      $viz_map_container.append($sensor_data_btn);
      $viz_map_container.append($health_data_btn);

      // Add time button and menu
      var $sensor_time_data_select = $('<select class="sensor_time_data_select custom-select" title="Change time frame for data"></select>');
      var $health_time_data_select = $('<select class="health_time_data_select custom-select" title="Change time frame for data"></select>');
      for (var i = 0; i < time_ranges["speck"].length; i++) {
        var str = time_ranges["speck"][i].replace("_", " ");
        if (str == "All") {
          $sensor_time_data_select.append($('<option selected="selected" value="' + str + '">' + str + '</option>'));
        } else {
          $sensor_time_data_select.append($('<option value="' + str + '">' + str + '</option>'));
        }
      }
      $sensor_time_data_select.on("change", function () {
        season["speck"] = this.value.replace(" ", "_");
        setMode("speck", true);
        chart["speck"].data(data["speck"][season["speck"]]["All"]);
        chart["speck"].render();
      });
      for (var i = 0; i < time_ranges["health"].length; i++) {
        var str = time_ranges["health"][i].replace("_", " ");
        if (str == "All") {
          $health_time_data_select.append($('<option selected="selected" value="' + str + '">' + str + '</option>'));
        } else {
          $health_time_data_select.append($('<option value="' + str + '">' + str + '</option>'));
        }
      }
      $health_time_data_select.on("change", function () {
        season["health"] = this.value.replace(" ", "_");
        setMode("health", true);
        chart["health"].data(data["health"][season["health"]]["All"]);
        chart["health"].render();
      });
      $viz_map_container.append($sensor_time_data_select);
      $viz_map_container.append($health_time_data_select);
      if (mode === "speck") {
        $sensor_time_data_select.show();
      } else if (mode === "health") {
        $health_time_data_select.show();
      }

      function setMode(desired_mode, force_refresh) {
        if (!force_refresh && desired_mode === mode) return;
        geo_heatmap.unhighlightZipcode();
        geo_heatmap.getInfoWindow().close();
        chart[mode].unhighlight();
        if (desired_mode === "speck") {
          $("#" + container_id + " .viz-health-chart-container").css("visibility", "hidden");
          $("#" + container_id + " .viz-speck-chart-container").css("visibility", "visible");
          color_scale_legend["speck"].show();
          color_scale_legend["health"].hide();
          $sensor_data_btn.addClass("sensor-button-selected");
          $health_data_btn.removeClass("health-button-selected");
          $sensor_time_data_select.show();
          $health_time_data_select.hide();
        } else if (desired_mode === "health") {
          $("#" + container_id + " .viz-speck-chart-container").css("visibility", "hidden");
          $("#" + container_id + " .viz-health-chart-container").css("visibility", "visible");
          color_scale_legend["speck"].hide();
          color_scale_legend["health"].show();
          $sensor_data_btn.removeClass("sensor-button-selected");
          $health_data_btn.addClass("health-button-selected");
          $sensor_time_data_select.hide();
          $health_time_data_select.show();
        }
        highlighted_zipcode = undefined;
        var desired_zipcode_metadata = analysis[desired_mode][season[desired_mode]][selected_dimension[desired_mode]];
        var desired_color_scale = color_scale[desired_mode];
        geo_heatmap.setZipcodeMetadataAndColorScale(desired_zipcode_metadata, desired_color_scale);
        mode = desired_mode;
      }

      function generateInfoWindowHTML(zipcode) {
        var html = "";

        // Add description
        var size_text = analysis[mode][season[mode]]["size"][zipcode];
        var title;
        if (mode === "speck") {
          size_text += " Speck sensors";
          title = "Median Values:";
        } else {
          size_text += " cases";
          title = "Having Symptom:";
        }
        html += "<div class='info-window-content'><table>";
        html += "  <tr>";
        html += "    <td colspan=10>";
        html += "      <h4><span class='large-text'>" + title + "</span><br>";
        html += "      (" + size_text + " in zipcode " + zipcode + ")</h4>";
        html += "    </td>";
        html += "  </tr>";

        // Add statistics
        available_dimensions[mode].forEach(function (d) {
          var value = analysis[mode][season[mode]][d][zipcode];
          if (mode === "health") {
            value = util.roundTo(value * 100) + "%";
          }

          if (d === selected_dimension[mode]) {
            html += "  <tr data-dimension='" + d + "' class='text-highlight'>";
          } else {
            html += "  <tr data-dimension='" + d + "'>";
          }
          html += "    <td class='cell-pad'>" + d + ":</td>";
          html += "    <td class='cell-pad'>" + value + "</td>";
          html += "  </tr>";
        });

        html += "</table></div>";

        return html;
      }

      function onZipcodeRegionMouseover(zipcode) {
        if (zipcode !== highlighted_zipcode) {
          chart[mode].highlight(data[mode][season[mode]][zipcode]);
        }
      }

      function onZipcodeRegionMouseout(zipcode) {
        if (zipcode !== highlighted_zipcode) {
          chart[mode].unhighlight(data[mode][season[mode]][zipcode]);
          if (typeof highlighted_zipcode !== "undefined") {
            chart[mode].highlight(data[mode][season[mode]][highlighted_zipcode]);
          }
        }
      }

      function onInfoWindowDomReady(zipcode) {
        if (typeof chart[mode] === "undefined") return;
        if (zipcode !== highlighted_zipcode) {
          chart[mode].highlight(data[mode][season[mode]][zipcode]);
          highlighted_zipcode = zipcode;
        }
      }

      function onInfoWindowCloseClick(zipcode) {
        highlighted_zipcode = undefined;
        if (typeof chart[mode] === "undefined") return;
        chart[mode].unhighlight(data[mode][season[mode]][zipcode]);
      }
    }

    function addColorScaleLegend(type, is_hidden) {
      var legend_class = "viz-" + type + "-color-scale-legend-container";
      var legend_selector = "#" + container_id + " ." + legend_class;

      // Add to DOM
      $container.append($('<div class="' + legend_class + '"></div>'));
      if (typeof is_hidden === "undefined" ? false : is_hidden) {
        $(legend_selector).css("visibility", "hidden");
      }

      // Create object
      color_scale_legend[type] = new edaplotjs.ColorScaleLegend(legend_selector, {
        color_scale: color_scale[type]
      });
    }

    function addAnalysisChart(type, is_hidden) {
      var chart_class = "viz-" + type + "-chart-container";
      var chart_selector = "#" + container_id + " ." + chart_class;

      // Add to DOM
      $container.append($('<div class="' + chart_class + '"></div>'));
      if (typeof is_hidden === "undefined" ? false : is_hidden) {
        $(chart_selector).css("visibility", "hidden");
      }

      // Parameters
      var margin_top = 15;
      var margin_bottom = 50;
      var chart_height = $(chart_selector).height();
      var options = chart_settings[type];
      var margin_left = typeof options["margin_left"] === "undefined" ? 0 : options["margin_left"];
      var margin_right = typeof options["margin_right"] === "undefined" ? 0 : options["margin_right"];
      var wrap_label_width = typeof options["wrap_label_width"] === "undefined" ? null : options["wrap_label_width"];
      var line_alpha = typeof options["line_alpha"] === "undefined" ? 0.4 : options["line_alpha"];
      var line_alpha_on_brushed = typeof options["line_alpha_on_brushed"] === "undefined" ? 0.25 : options["line_alpha_on_brushed"];
      var highlighted_line_width = typeof options["highlighted_line_width"] === "undefined" ? 1 : options["highlighted_line_width"];
      var axis_font_size = typeof options["axis_font_size"] === "undefined" ? "14px" : options["axis_font_size"];

      // Create parallel coordinates
      chart[type] = d3.parcoords({
        data: data[type][season[mode]]["All"],
        margin: {
          top: margin_top,
          left: margin_left,
          right: margin_right,
          bottom: margin_bottom
        },
        axisLabelOffset: {
          x: 0,
          y: chart_height - margin_bottom + 5
        },
        wrapLabelWidth: wrap_label_width,
        highlightedLineWidth: highlighted_line_width,
        axisFontSize: axis_font_size
      })(chart_selector);

      // Specify dimensions
      available_dimensions[type].forEach(function (d) {
        // Set dimension
        dimension_settings[type][d] = {
          type: "number",
          innerTickSize: 8,
          outerTickSize: 0,
          tickPadding: 2
        };

        // Set scale for the y axis according to different dimensions
        var scale;
        if (type === "speck") {
          /*if (d === "Accumulation per day (mg/m3)") {
           scale = d3.scale.log().base(2).clamp(true);
           //dimension_settings[type][d]["tickFormat"] = d3.format(",d");
           dimension_settings[type][d]["tickFormat"] = d3.format(",2f");
           dimension_settings[type][d]["tickValues"] = [1.25, 2.5, 5, 10, 20, 40, 80];
           } else {
           scale = d3.scale.linear().clamp(true);
           }*/
          scale = d3.scale.linear().clamp(true);
          scale.range([chart_height - margin_top - margin_bottom, 0])
            .domain(d3.extent(data[type][season[mode]]["All"], function (p) {
              return +p[d];
            }));
        } else {
          scale = d3.scale.linear().clamp(true);
          dimension_settings[type][d]["tickFormat"] = d3.format(".0%");
          dimension_settings[type][d]["tickValues"] = [0, 0.5, 1];
          scale.range([chart_height - margin_top - margin_bottom, 0]).domain([0, 1]);
        }
        dimension_settings[type][d]["yscale"] = scale;
      });

      // Render and show chart
      renderChart(type, dimension_settings[type]);

      // Resize the chart when the window size is changed
      window.onresize = function () {
        renderChart("speck", dimension_settings["speck"]);
        renderChart("health", dimension_settings["health"]);
      };

      // Add events
      // TODO: this is a hack, need to move the entire function out to a class
      $("#" + container_id + " .sensor-data-btn").on("click", function () {
        changeColorAndRenderChart(selected_dimension["speck"], "speck");
      });
      $("#" + container_id + " .health-data-btn").on("click", function () {
        changeColorAndRenderChart(selected_dimension["health"], "health");
      });

      function renderChart(desired_type, desired_dimension_settings) {
        var w = $(chart_selector).width();
        var options = chart_settings[desired_type];
        var chart_min_width = typeof options["chart_min_width"] === "undefined" ? 800 : options["chart_min_width"];
        var line_alpha = typeof options["line_alpha"] === "undefined" ? 0.4 : options["line_alpha"];
        var line_alpha_on_brushed = typeof options["line_alpha_on_brushed"] === "undefined" ? 0.25 : options["line_alpha_on_brushed"];
        var desired_chart_width = w;

        if (w < chart_min_width) {
          desired_chart_width = chart_min_width;
        }

        chart[desired_type].width(desired_chart_width);
        chart[desired_type].dimensions(desired_dimension_settings)
          .alpha(line_alpha)
          .alphaOnBrushed(line_alpha_on_brushed)
          //.reorderable()
          //.mode("queue")
          //.rate(5)
          //.smoothness(0.1)
          .interactive()
          .brushMode("1D-axes")
          .brushReset();

        changeColorAndRenderChart(selected_dimension[desired_type], desired_type);

        chart[desired_type].svg.selectAll(".dimension .label").on("click", function (dimension) {
          if (dimension === selected_dimension[desired_type]) return;
          changeColorAndRenderChart(dimension, desired_type);
          geo_heatmap.setZipcodeMetadata(analysis[desired_type][season[mode]][dimension]);

          var $info_window_content = $(".gm-style-iw");
          $info_window_content.find("[data-dimension='" + selected_dimension[desired_type] + "']").removeClass("text-highlight");
          $info_window_content.find("[data-dimension='" + dimension + "']").addClass("text-highlight");

          selected_dimension[desired_type] = dimension;
        }).on("dblclick", function (dimension) {
          chart[desired_type].flipAxes([dimension]);
          changeColorAndRenderChart(dimension, desired_type);
        });
      }

      function changeColorAndRenderChart(dimension, desired_type) {
        var all_d = chart[desired_type].svg.selectAll(".dimension");
        all_d.style("font-weight", "normal");
        all_d.selectAll(".label").style("text-decoration", "none");
        all_d.selectAll("path").style("stroke-width", "1px");
        all_d.selectAll("line").style("stroke-width", "1px");

        var selected_d = all_d.filter(function (d) {
          return d === dimension;
        });
        selected_d.style("font-weight", "bold");
        selected_d.selectAll(".label").style("text-decoration", "underline");
        selected_d.selectAll("path").style("stroke-width", "2px");
        selected_d.selectAll("line").style("stroke-width", "2px");

        chart[desired_type].color(colorMap(chart[desired_type].data(), dimension)).render();

        if (typeof highlighted_zipcode !== "undefined") {
          chart[desired_type].highlight(data[desired_type][season[mode]][highlighted_zipcode]);
        }
      }

      // This function is used for mapping the scaled value to a color
      function colorMap(col, dimension) {
        var s = zscore(_(col).pluck(dimension).map(parseFloat));
        return function (d) {
          return color_scale[mode](s(d[dimension]));
        }
      }

      // This function computes the z-score
      function zscore(col) {
        var mean = _(col).mean();
        var sigma = _(col).stdDeviation();

        return function (d) {
          var v = (d - mean) / sigma;
          if (v < min_output) v = min_output;
          if (v > max_output) v = max_output;
          return v;
        };
      }
    }

    function addStory() {
      // Add DOM
      var slideshow_inner_class = "viz-slideshow-inner-container";
      var slideshow_outer_class = "viz-slideshow-outer-container";
      var $slideshow_inner = $('<div class="' + slideshow_inner_class + '"></div>');
      var $slideshow_outer = $('<div class="' + slideshow_outer_class + '"></div>');
      var $slideshow_close = $('<div class="viz-slideshow-close" title="Close slideshow"></div>');
      $slideshow_outer.append($slideshow_inner);
      $container.append($slideshow_outer);
      $slideshow_outer.append($slideshow_close);

      // Add slideshows
      for (var i = 0; i < data["story"].length; i++) {
        // Add object
        slideshow[i] = new edaplotjs.Slideshow({
          title: data["story"][i]["title"],
          slide: data["story"][i]["slide"],
          slideshow_close_callback: onSlideshowClose,
          slideshow_open_callback: onSlideshowOpen
        });
        onSlideshowClose();

        // Add a book marker on the Google map
        var google_map = geo_heatmap.getGoogleMap();
        if (typeof google === "undefined") return;
        var marker = new google.maps.Marker({
          position: {lat: data["story"][i]["latitude"], lng: data["story"][i]["longitude"]},
          map: google_map,
          title: data["title"],
          icon: {
            url: "img/book.png",
            scaledSize: new google.maps.Size(30, 30),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(0, 25)
          },
          slideshow_index: i
        });
        var slideshow_inner_selector = "#" + container_id + " ." + slideshow_inner_class;
        marker.addListener("click", function () {
          slideshow[this["slideshow_index"]].open(slideshow_inner_selector);
          current_slideshow_index = this["slideshow_index"];
        });
      }

      $slideshow_close.on("click", function () {
        slideshow[current_slideshow_index].close();
        current_slideshow_index = undefined;
      });

      function onSlideshowClose() {
        $slideshow_outer.hide();
      }

      function onSlideshowOpen() {
        $slideshow_outer.show();
      }
    }

    function handleHashChange() {
      var unsafe_hash = util.getUnsafeHashString().match(/#(.+)/);
      if (unsafe_hash) {
        var unsafe_hash_obj = util.unpackVars(unsafe_hash[1]);
        var slideshow_idx = unsafe_hash_obj["slideshow"];
        if (typeof slideshow[slideshow_idx] !== "undefined") {
          slideshow[slideshow_idx].open("#" + container_id + " .viz-slideshow-inner-container");
          current_slideshow_index = slideshow_idx;
        }
      }
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
    window.ehp.Viz = Viz;
  } else {
    window.ehp = {};
    window.ehp.Viz = Viz;
  }
})();
