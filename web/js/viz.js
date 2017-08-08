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

    // For normalization
    var max_percentile = 0.95; // using quantile instead of max value when normalizing data
    var min_percentile = 0.05; // using quantile instead of min value when normalizing data

    // Set color scale for displaying the normalized value
    var ncolor_scale = d3.scale.linear()
      .domain([0, 0.25, 0.75, 1])
      .range(["#00a511", "#fff200", "#ff6200", "#ff0000"])
      .interpolate(d3.interpolateLab);

    // Set color scale for displaying the z-score
    var zcolor_scale = d3.scale.linear()
      .domain([-1, -0.5, 0.5, 1.5])
      .range(["#00a511", "#fff200", "#ff6200", "#ff0000"])
      .interpolate(d3.interpolateLab);

    // Objects
    var geo_heatmap;
    var chart = {
      speck: undefined,
      health: undefined
    };
    var slideshow = [];

    // This table maps zipcodes and aggregated Speck (or health) analysis data
    var analysis_aggr_by_zipcode = {
      speck: settings["speck_analysis_aggr_by_zipcode"],
      health: settings["health_analysis_aggr_by_zipcode"]
    };

    // Main data tables
    var data = {
      speck: settings["speck_data"],
      health: settings["health_data"],
      story: settings["story_data"]
    };

    // Data tables grouped by zipcode
    var data_group_by_zipcode = {
      speck: settings["speck_data_group_by_zipcode"],
      health: settings["health_data_group_by_zipcode"]
    };

    // Get the available dimensions
    var available_dimensions = {
      speck: util.getFilteredKeys(analysis_aggr_by_zipcode["speck"], ["size"]),
      health: util.getFilteredKeys(analysis_aggr_by_zipcode["health"], ["size"])
    };

    // Set selected dimensions
    var selected_dimension = {
      speck: "Peaks per day",
      health: "stress/anxiety"
    };

    // Dimension settings
    var dimension_settings = {
      speck: {},
      health: {}
    };

    // Chart settings
    var chart_settings = {
      speck: {
        chart_min_width: 600,
        margin_left: 0,
        margin_right: 0,
        wrap_label_width: 100,
        line_alpha: 0.4,
        line_alpha_on_brushed: 0.15,
        highlighted_line_width: 1.2,
        axis_font_size: "12px"
      },
      health: {
        chart_min_width: 1200,
        margin_left: 20,
        margin_right: 5,
        wrap_label_width: 60,
        line_alpha: 0.8,
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
      addColorScaleLegend();

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
        zipcode_metadata: analysis_aggr_by_zipcode[mode][selected_dimension[mode]],
        init_map_zoom: 9,
        color_scale: ncolor_scale,
        max_percentile: max_percentile,
        min_percentile: min_percentile,
        color_opacity: 0.5,
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

      // Add terrain button
      var $terrain_btn = $('<div class="terrain-btn custom-button" title="Toggle terrain view"><div>');
      $terrain_btn.on("click", function () {
        var $this = $(this);
        if ($this.hasClass("button-pressed")) {
          geo_heatmap.getGoogleMap().setMapTypeId("roadmap");
          $this.removeClass("button-pressed");
        } else {
          geo_heatmap.getGoogleMap().setMapTypeId("terrain");
          $this.addClass("button-pressed");
        }
      });
      $viz_map_container.append($terrain_btn);

      // Add data toggle button
      var $data_toggle_btn = $('<div class="data-toggle-btn custom-button" title="Toggle sensor or health data"><div>');
      $data_toggle_btn.addClass(mode);
      $data_toggle_btn.on("click", function () {
        var $this = $(this);
        geo_heatmap.unhighlightZipcode();
        geo_heatmap.getInfoWindow().close();
        chart[mode].unhighlight();
        if (mode === "health") {
          chart["health"].highlight(data_group_by_zipcode["health"]["all"]);
        }
        highlighted_zipcode = undefined;
        if ($this.hasClass("health")) {
          $("#" + container_id + " .viz-health-chart-container").css("visibility", "hidden");
          $("#" + container_id + " .viz-speck-chart-container").css("visibility", "visible");
          mode = "speck";
          $this.addClass("speck");
          $this.removeClass("health");
        } else {
          $("#" + container_id + " .viz-speck-chart-container").css("visibility", "hidden");
          $("#" + container_id + " .viz-health-chart-container").css("visibility", "visible");
          mode = "health";
          $this.addClass("health");
          $this.removeClass("speck");
        }
        geo_heatmap.setZipcodeMetadata(analysis_aggr_by_zipcode[mode][selected_dimension[mode]]);
      });
      $viz_map_container.append($data_toggle_btn);

      function generateInfoWindowHTML(zipcode) {
        var html = "";

        // Add description
        var size_text = analysis_aggr_by_zipcode[mode]["size"][zipcode];
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
          var value = analysis_aggr_by_zipcode[mode][d][zipcode];
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
          chart[mode].highlight(data_group_by_zipcode[mode][zipcode]);
        }
      }

      function onZipcodeRegionMouseout(zipcode) {
        if (zipcode !== highlighted_zipcode) {
          chart[mode].unhighlight(data_group_by_zipcode[mode][zipcode]);
          if (typeof highlighted_zipcode !== "undefined") {
            chart[mode].highlight(data_group_by_zipcode[mode][highlighted_zipcode]);
          }
        }
      }

      function onInfoWindowDomReady(zipcode) {
        if (typeof chart[mode] === "undefined") return;
        if (zipcode !== highlighted_zipcode) {
          chart[mode].highlight(data_group_by_zipcode[mode][zipcode]);
          highlighted_zipcode = zipcode;
        }
      }

      function onInfoWindowCloseClick(zipcode) {
        highlighted_zipcode = undefined;
        if (typeof chart[mode] === "undefined") return;
        chart[mode].unhighlight(data_group_by_zipcode[mode][zipcode]);
        if (mode === "health") {
          chart["health"].highlight(data_group_by_zipcode["health"]["all"]);
        }
      }
    }

    function addColorScaleLegend() {
      var legend_class = "viz-color-scale-legend-container";
      var legend_selector = "#" + container_id + " ." + legend_class;

      // Add to DOM
      $container.append($('<div class="' + legend_class + '"></div>'));

      // Create object
      var color_scale_legend = new edaplotjs.ColorScaleLegend(legend_selector, {
        color_scale: ncolor_scale
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
      var margin_bottom = 40;
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
        data: data[type],
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
          if (d === "PM baseline") {
            scale = d3.scale.linear().clamp(true);
            dimension_settings[type][d]["tickFormat"] = d3.format(",d");
            dimension_settings[type][d]["tickValues"] = [10, 20, 30, 40, 50];
          } else if (d === "Peaks per day") {
            scale = d3.scale.linear().clamp(true);
            dimension_settings[type][d]["tickValues"] = [2, 4, 6, 8, 10];
          } else if (d === "Peak duration (mins)") {
            scale = d3.scale.log().base(2).clamp(true);
            dimension_settings[type][d]["tickFormat"] = d3.format(",d");
            dimension_settings[type][d]["tickValues"] = [5, 10, 20, 40, 80, 160, 320];
          } else if (d === "Hours between peaks") {
            scale = d3.scale.log().base(2).clamp(true);
            dimension_settings[type][d]["tickFormat"] = d3.format(",2f");
            dimension_settings[type][d]["tickValues"] = [2.5, 5, 10, 20, 40, 80, 160];
          } else if (d === "Accumulation per day") {
            scale = d3.scale.log().base(2).clamp(true);
            dimension_settings[type][d]["tickFormat"] = d3.format(",2f");
            dimension_settings[type][d]["tickValues"] = [1.25, 2.5, 5, 10, 20, 40, 80];
          } else {
            scale = d3.scale.linear().clamp(true);
          }
          scale.range([chart_height - margin_top - margin_bottom, 0])
            .domain(d3.extent(data[type], function (p) {
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

      function renderChart(desired_type, desired_dimension_settings) {
        var w = $(chart_selector).width();
        var options = chart_settings[desired_type];
        var chart_min_width = typeof options["chart_min_width"] === "undefined" ? 800 : options["chart_min_width"];
        var line_alpha = typeof options["line_alpha"] === "undefined" ? 0.4 : options["line_alpha"];
        var line_alpha_on_brushed = typeof options["line_alpha_on_brushed"] === "undefined" ? 0.25 : options["line_alpha_on_brushed"];
        var desired_chart_width = w > chart_min_width ? w : chart_min_width;

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
          geo_heatmap.setZipcodeMetadata(analysis_aggr_by_zipcode[desired_type][dimension]);

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
        chart[desired_type].svg.selectAll(".dimension")
          .style("font-weight", "normal")
          .filter(function (d) {
            return d === dimension;
          })
          .style("font-weight", "bold");

        chart[desired_type].svg.selectAll(".dimension .label")
          .style("text-decoration", "none")
          .filter(function (d) {
            return d === dimension;
          })
          .style("text-decoration", "underline");

        //chart[desired_type].color(zcolor(chart[desired_type].data(), dimension)).render();
        chart[desired_type].color(ncolor(chart[desired_type].data(), dimension)).render();

        if (desired_type === "health") {
          chart["health"].highlight(data_group_by_zipcode["health"]["all"]);
        }
        if (typeof highlighted_zipcode !== "undefined") {
          chart[desired_type].highlight(data_group_by_zipcode[desired_type][highlighted_zipcode]);
        }
      }

      // This function is used for mapping the z-score to a color
      function zcolor(col, dimension) {
        var z = zscore(_(col).pluck(dimension).map(parseFloat));
        return function (d) {
          return zcolor_scale(z(d[dimension]));
        }
      }

      // This function is used for mapping the normalized value to a color
      function ncolor(col, dimension) {
        var s = nscore(_(col).pluck(dimension).map(parseFloat));
        return function (d) {
          return ncolor_scale(s(d[dimension]));
        }
      }

      // This function computes the z-score
      function zscore(col) {
        var mean = _(col).mean();
        var sigma = _(col).stdDeviation();

        return function (d) {
          return (d - mean) / sigma;
        };
      }

      // This function normalizes the original value between 0 to 1
      function nscore(col) {
        //var max_old = _(col).max();
        //var min_old = _(col).min();
        var all = col.sort(d3.ascending);
        var max_old = d3.quantile(all, max_percentile);
        var min_old = d3.quantile(all, min_percentile);
        var max_new = 1;
        var min_new = 0;
        var r = (max_new - min_new) / (max_old - min_old);

        return function (d) {
          var v = r * (d - min_old) + min_new;
          if (v < min_new) v = min_new;
          if (v > max_new) v = max_new;
          return v;
        };
      }
    }

    function addStory() {
      // Add DOM
      var slideshow_inner_class = "viz-slideshow-inner-container";
      var slideshow_outer_mask_class = "viz-slideshow-outer-mask";
      var slideshow_outer_class = "viz-slideshow-outer-container";
      var $slideshow_inner = $('<div class="' + slideshow_inner_class + '"></div>');
      var $slideshow_outer = $('<div class="' + slideshow_outer_class + '"></div>');
      var $slideshow_outer_mask = $('<div class="' + slideshow_outer_mask_class + '"></div>');
      var $slideshow_close = $('<div class="viz-slideshow-close" title="Close slideshow"></div>');
      $slideshow_outer.append($slideshow_inner);
      $container.append($slideshow_outer);
      $container.append($slideshow_outer_mask);
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

      $slideshow_close.on("click", function() {
        slideshow[current_slideshow_index].close();
        current_slideshow_index = undefined;
      });

      function onSlideshowClose() {
        $slideshow_outer.hide();
        $slideshow_outer_mask.hide();
      }

      function onSlideshowOpen() {
        $slideshow_outer.show();
        $slideshow_outer_mask.show();
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
