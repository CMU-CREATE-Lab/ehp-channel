(function () {
  "use strict";

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var GroupedHistograms = function (container_selector, settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    var data = settings["data"];

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    function init() {
      addChart();
    }

    function addChart() {
      $(container_selector).append($('<div class="grouped-histograms"></div>'));
      var n = data["data"][0].length; // number of data points
      var m = data["index"].length; // number of categories
      var total_sample_size = data["data"][0][0] + data["data"][0][1];

      var margin = {top: 20, right: 30, bottom: 30, left: 40},
        width = 850 - margin.left - margin.right,
        height = 190 - margin.top - margin.bottom;

      var y = d3.scale.linear()
        .domain([0, total_sample_size])
        .range([height, 0]);

      var x0 = d3.scale.ordinal()
        .domain(data["columns"])
        .rangeBands([0, width], 0.2);

      var x1 = d3.scale.ordinal()
        .domain(d3.range(m))
        .rangeBands([0, x0.rangeBand()]);

      var color = d3.scale.ordinal()
        .range(["#888888", "#444444"]);

      var xAxis = d3.svg.axis()
        .scale(x0)
        .orient("bottom");

      var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

      var svg = d3.select(container_selector + " .grouped-histograms").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("svg:g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

      svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll(".tick text")
        .call(wrapSvgText, x0.rangeBand());

      svg.append("g").selectAll("g")
        .data(data["data"])
        .enter().append("g")
        .style("fill", function (d) {
          return color(d);
        })
        .attr("transform", function (d, i) {
          return "translate(" + x1(i) + ",0)";
        })
        .selectAll("rect")
        .data(function (d) {
          return d;
        })
        .enter().append("rect")
        .attr("width", x1.rangeBand())
        .attr("height", function (d) {
          return height - y(d);
        })
        .attr("x", function (d, i) {
          return x0(data["columns"][i]);
        })
        .attr("y", function (d) {
          return y(d);
        });

      var legend = svg.selectAll(".legend")
        .data(d3.range(m))
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function (d, i) {
          return "translate(0," + i * 20 + ")";
        });

      legend.append("rect")
        .attr("x", width)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

      legend.append("text")
        .attr("x", width - 5)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function (d) {
          return d;
        });
    }

    function wrapSvgText(text, width) {
      if (width == null) return;
      text.each(function () {
        var text = d3.select(this),
          words = text.text().replace("/", " ").split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy") === null ? 0 : text.attr("dy")),
          tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em"),
          words_length = words.length;
        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          // IMPORTANT: in order for getComputedTextLength() to work, its parent containers need to be not hidden
          if (tspan.node().getComputedTextLength() > width && words_length > 1) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
          }
        }
      });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Privileged methods
    //
    var highlight = function () {

    };
    this.highlight = highlight;

    var unhighlight = function () {

    };
    this.unhighlight = unhighlight;
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
    window.edaplotjs.GroupedHistograms = GroupedHistograms;
  } else {
    window.edaplotjs = {};
    window.edaplotjs.GroupedHistograms = GroupedHistograms;
  }
})();