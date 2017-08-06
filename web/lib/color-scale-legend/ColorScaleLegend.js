/*************************************************************************
 * This library is developed by Yen-Chia Hsu
 * Copyright Yen-Chia Hsu.
 * GitHub: https://github.com/yenchiah/geo-heatmap
 * Dependencies: jQuery (http://jquery.com/), d3.js (https://d3js.org/)
 * Contact: hsu.yenchia@gmail.com
 * License: GNU General Public License v2
 * Version: v1.0
 *************************************************************************/

(function () {
  "use strict";

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var ColorScaleLegend = function (container_selector, settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    // The d3.js color scale object for rendering the color legend
    var color_scale = settings["color_scale"];

    // DOM objects
    var $container = $(container_selector);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    function init() {
      addLegend();
    }

    function addLegend() {
      // Add DOM element
      var $legend = $('<div class="color-scale-legend"></div>');
      $container.append($legend);

      // Parameters
      var w = $legend.width();
      var h = $legend.height();
      var center_x = w / 2;
      var center_y = h / 2;
      var margin_t = 10; // distance between text and top border
      var margin_b = 7; // distance between text bottom border
      var bar_margin_t = 7; // distance between color bar and top text
      var bar_margin_b = 4; // distance between color bar and bottom text
      var font_size = 11;
      var bar_h = h - bar_margin_t - bar_margin_b - margin_t - margin_b - font_size * 2;
      var bar_w = 10;

      // Add the legend container
      var svg = d3.select(container_selector + " .color-scale-legend")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g");

      // Add the linear gradient
      svg.append("defs")
        .append("linearGradient")
        .attr("id", "linear-gradient")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%")
        .selectAll("stop")
        .data(color_scale.range())
        .enter()
        .append("stop")
        .attr("offset", function (d, i) {
          return i / (color_scale.range().length - 1);
        })
        .attr("stop-color", function (d) {
          return d;
        });

      // Add the rectangle
      svg.append("rect")
        .attr("class", "legend-rect")
        .attr("x", center_x - bar_w / 2)
        .attr("y", center_y - bar_h / 2)
        .attr("width", bar_w)
        .attr("height", bar_h)
        .style("fill", "url(#linear-gradient)");

      // Add the "high" text
      svg.append("text")
        .attr("class", "legend-high")
        .attr("x", center_x)
        .attr("y", center_y - bar_h / 2 - bar_margin_t)
        .attr("font-size", font_size)
        .attr("alignment-baseline", "baseline")
        .style("text-anchor", "middle")
        .text("high");

      // Add the "low" text
      svg.append("text")
        .attr("class", "legend-low")
        .attr("x", center_x)
        .attr("y", center_y + bar_h / 2 + bar_margin_b)
        .attr("font-size", font_size)
        .attr("alignment-baseline", "hanging")
        .style("text-anchor", "middle")
        .text("low");
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
  if (window.edaplotjs) {
    window.edaplotjs.ColorScaleLegend = ColorScaleLegend;
  } else {
    window.edaplotjs = {};
    window.edaplotjs.ColorScaleLegend = ColorScaleLegend;
  }
})();