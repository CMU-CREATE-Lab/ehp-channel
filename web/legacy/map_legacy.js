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
  var Map = function (map_container_id, settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    var markers_all = {};
    var google_map;
    var focused_device_id;
    var focused_marker;
    var info_window;
    var highlighted_zipcode;
    var highlighted_speck_id;
    var zipcode_feature_table = {};

    // Settings
    var init_map_zoom = ( typeof (settings["initial_zoom"]) == "undefined") ? 9 : settings["initial_zoom"];
    var init_map_center = ( typeof (settings["init_map_center"]) == "undefined") ? {
      lat: 40.263373,
      lng: -80.133303
    } : settings["init_map_center"];

    // This table stores the mapping of Speck ID and latitude/longitude position
    // (created by using the Python script)
    var device_latlng_table = ( typeof (settings["device_latlng_table"]) == "undefined") ? {} : settings["device_latlng_table"];

    // This GeoJSON stores the zipcode boundaries which have Speck devices
    // (created by using the Python script)
    var zipcode_boundary = ( typeof (settings["zipcode_boundary"]) == "undefined") ? {} : settings["zipcode_boundary"];

    // This table stores the mapping of zipcode and Speck ID
    // (created by using the Python script)
    var zipcode_device_table = ( typeof (settings["zipcode_device_table"]) == "undefined") ? {} : settings["zipcode_device_table"];

    // This table stores the mapping of Speck ID and zipcode
    // (created by using the Python script)
    var device_zipcode_table = ( typeof (settings["device_zipcode_table"]) == "undefined") ? {} : settings["device_zipcode_table"];

    // This table stores the mapping of zipcode, bounds, and center positions
    // (created by using the Python script)
    var zipcode_bound_table = ( typeof (settings["zipcode_bound_table"]) == "undefined") ? {} : settings["zipcode_bound_table"];

    // This table stores the mapping of Speck ID and statistics
    // (created by using the Python script)
    var device_statistics_table = ( typeof (settings["device_statistics_table"]) == "undefined") ? {} : settings["device_statistics_table"];

    // Constants for the marker
    var ZOOM_TO_PX_TAB = [8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 15, 15, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120];
    var ZOOM_TO_OPACITY_TAB = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.8, 0.8, 0.65, 0.5, 0.35, 0.2, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15];
    var ZOOM_LEVEL_ON_MARKER_CLICK = 15;
    var MAR_FILL_COLOR = "#448847";
    var FOC_MAR_FILL_COLOR = "#27ff31";
    var HOV_MAR_FILL_COLOR = "#27ff31";
    var MAR_STROKE_WEIGHT = 2;
    var FOC_MAR_STROKE_WEIGHT = 2;
    var HOV_MAR_STROKE_WEIGHT = 2;
    var MAR_STROKE_COLOR = "#ffffff";
    var FOC_MAR_STROKE_COLOR = "#ffffff";
    var HOV_MAR_STROKE_COLOR = "#ffffff";
    var MAR_Z_INDEX = 2;
    var FOC_MAR_Z_INDEX = 3;

    // Constants for the zipcode regions
    var ZIPCODE_DEFAULT_STYLE = {
      fillColor: "#ff0000",
      fillOpacity: 0.2,
      strokeColor: "#000000",
      strokeOpacity: 1,
      strokeWeight: 1
    };
    var ZIPCODE_HIGHLIGHT_STYLE = {
      fillColor: "#ff0000",
      fillOpacity: 0.5,
      strokeColor: "#000000",
      strokeOpacity: 1,
      strokeWeight: 2
    };
    var ZIPCODE_HOVER_STYLE = {
      strokeWeight: 4
    };
    var SPECK_ID_HIGHLIGHT_CSS = {"font-weight": "bold", "color": "rgb(212,85,85)"};
    var SPECK_ID_DEFAULT_CSS = {"font-weight": "normal", "color": "inherit"};

    // Constants for the map
    var MAP_STYLE = [
      {
        featureType: "all",
        stylers: [
          {saturation: -80}
        ]
      }, {
        featureType: "road.arterial",
        elementType: "geometry",
        stylers: [
          {hue: "#00ffee"},
          {saturation: 50}
        ]
      }, {
        featureType: "poi.business",
        elementType: "labels",
        stylers: [
          {visibility: "off"}
        ]
      }
    ];

    // DOM objects
    var $map_container = $("#" + map_container_id);
    var $map;
    var $map_home_btn;
    var $map_legend;
    var $map_devices_select;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    function init() {
      addMap();
      //addMarkers();
      addZipcodeBoundaries();

      // Handle shared urls
      handleHashChange();
      window.addEventListener("hashchange", handleHashChange, false);
    }

    function addMap() {
      // Set map UI
      var html = '';
      html += '<div class="viz-map"></div>';
      html += '<button class="viz-map-home-btn viz-map-custom-button"></button>';

      $map_container.append($(html));
      $map = $("#" + map_container_id + " .viz-map");
      $map_home_btn = $("#" + map_container_id + " .viz-map-home-btn");

      // Set Google map
      google_map = new google.maps.Map($map.get(0), {
        styles: MAP_STYLE,
        center: init_map_center,
        zoom: init_map_zoom,
        zIndex: 1,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: [
            google.maps.MapTypeId.HYBRID,
            google.maps.MapTypeId.SATELLITE,
            google.maps.MapTypeId.ROADMAP,
            google.maps.MapTypeId.TERRAIN
          ]
        },
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.LEFT_TOP
        },
        streetViewControl: true,
        streetViewControlOptions: {
          position: google.maps.ControlPosition.LEFT_TOP
        },
        scaleControl: true
      });

      // Add map listeners
      google.maps.event.addListenerOnce(google_map, "idle", function () {
        // Set map controls
        $map_home_btn.button({
          icons: {
            primary: "ui-icon-home"
          }
        }).on("click", function () {
          window.location.hash = "";
          google_map.panTo(init_map_center);
          google_map.setZoom(init_map_zoom);
        });

        // Show map controls
        $map_home_btn.show();
      });
    }

    function addMarkers() {
      // Add legend
      var html = "";
      html += "<table class='viz-map-legend'>";
      html += "  <tr>";
      html += "    <td class='viz-map-legend-color-td viz-map-legend-color-green'></td>";
      html += "    <td class='viz-map-legend-color-txt'>Device:";
      html += "      <select name='devices' class='viz-map-devices-select'>";
      html += "        <option selected='selected'>Select device</option>";
      html += "      </select>";
      html += "    </td>";
      html += "  </tr>";
      html += "</table>";
      $map_container.append($(html));
      $map_legend = $("#" + map_container_id + " .viz-map-legend");
      $map_devices_select = $("#" + map_container_id + " .viz-map-devices-select");
      $map_legend.show();

      // Add markers (circles) to indicate houses
      var zoom = google_map.getZoom();
      for (var key in device_latlng_table) {
        var latlng = device_latlng_table[key];
        var marker = new google.maps.Marker({
          position: {lat: latlng[0], lng: latlng[1]},
          map: google_map,
          key: key,
          title: key,
          zIndex: MAR_Z_INDEX,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillOpacity: ZOOM_TO_OPACITY_TAB[zoom],
            fillColor: MAR_FILL_COLOR,
            strokeOpacity: 1.0,
            strokeColor: MAR_STROKE_COLOR,
            strokeWeight: MAR_STROKE_WEIGHT,
            scale: ZOOM_TO_PX_TAB[zoom]
          }
        });
        marker.addListener("click", function () {
          var device_id = this.key;
          handleViewChange(device_id);
        });
        marker.addListener("mouseover", function () {
          var device_id = this.key;
          if (device_id != focused_device_id) {
            setMarkerIcon(this, HOV_MAR_STROKE_WEIGHT, HOV_MAR_STROKE_COLOR, HOV_MAR_FILL_COLOR);
          }
        });
        marker.addListener("mouseout", function () {
          var device_id = this.key;
          if (device_id != focused_device_id) {
            setMarkerIcon(this, MAR_STROKE_WEIGHT, MAR_STROKE_COLOR, MAR_FILL_COLOR);
          }
        });
        markers_all[key] = marker;
        $map_devices_select.append("<option data-key='" + key + "'>" + key + "</option>>");
      }

      // Add events when a specific device id is selected
      $map_devices_select.on("change", function () {
        var device_id = $(this).find(":selected").data("key");
        handleViewChange(device_id);
      });

      // Change icon size according to different zoom levels
      google.maps.event.addListener(google_map, 'zoom_changed', function () {
        var zoom = google_map.getZoom();
        for (var key in markers_all) {
          var marker = markers_all[key];
          var icon = marker.getIcon();
          icon.scale = ZOOM_TO_PX_TAB[zoom];
          icon.fillOpacity = ZOOM_TO_OPACITY_TAB[zoom];
          marker.setIcon(icon);
        }
      });
    }

    function addZipcodeBoundaries() {
      // Add GeoJSON to the map as a data layer
      var featues = google_map.data.addGeoJson(zipcode_boundary);

      // Build a map of zipcodes and features
      for (var i = 0; i < featues.length; i++) {
        var zipcode = featues[i].getProperty("ZCTA5CE10");
        zipcode_feature_table[zipcode] = featues[i];
      }

      // Add default style
      google_map.data.setStyle(function (feature) {
        var zipcode = feature.getProperty("ZCTA5CE10");
        if (highlighted_zipcode == zipcode) {
          return ZIPCODE_HIGHLIGHT_STYLE;
        } else {
          return ZIPCODE_DEFAULT_STYLE;
        }
      });

      // Set the information window for displaying Specks in a polygon on the map
      info_window = new google.maps.InfoWindow({
        pixelOffset: new google.maps.Size(0, 0)
      });

      // Set click event
      google_map.data.addListener("click", function (event) {
        var zipcode = event.feature.getProperty("ZCTA5CE10");
        var speck_id_all = zipcode_device_table[zipcode];

        var html = "";
        html += "<table>";
        html += "  <tr>";
        html += "    <td><b>Specks in Zipcode " + zipcode + "</b></td>";
        html += "    <td class='cell-pad'><b>Max (PM<sub>2.5</sub>)</b></td>";
        html += "    <td class='cell-pad'><b>Mean (PM<sub>2.5</sub>)</b></td>";
        html += "    <td class='cell-pad'><b>Std (PM<sub>2.5</sub>)</b></td>";
        html += "  </tr>";
        for (var i = 0; i < speck_id_all.length; i++) {
          var speck_id = speck_id_all[i];
          var statistics = device_statistics_table[speck_id];
          // Sanity check of the statistics
          if (typeof statistics == "undefined") {
            statistics = ["n/a", "n/a", "n/a", "n/a"]
          } else {
            for (var j = 0; j < statistics.length; j++) {
              if (statistics[j] == -1) {
                statistics[j] = "n/a";
              }
            }
          }
          // Add html table elements
          html += "  <tr>";
          html += "    <td><a id='" + speck_id + "' href='#device_id=" + speck_id + "'>" + speck_id + "</a></td>";
          html += "    <td class='cell-pad'>" + statistics[0] + "</td>";
          html += "    <td class='cell-pad'>" + statistics[1] + "</td>";
          html += "    <td class='cell-pad'>" + statistics[2] + "</td>";
          html += "  </tr>";
        }
        html += "</table>";

        var bc = zipcode_bound_table[zipcode];
        var c = new google.maps.LatLng(bc[5], bc[4]);
        info_window.setContent(html);
        info_window.setPosition(c);
        info_window.open(google_map);
        $("#" + highlighted_speck_id).css(SPECK_ID_HIGHLIGHT_CSS);
      });

      // When the user hovers, tempt them to click by changing color.
      // Call revertStyle() to remove all overrides.
      // This will use the style rules defined in the function passed to setStyle()
      google_map.data.addListener("mouseover", function (event) {
        google_map.data.revertStyle();
        google_map.data.overrideStyle(event.feature, ZIPCODE_HOVER_STYLE);
      });

      // Set mouseout event
      google_map.data.addListener("mouseout", function (event) {
        google_map.data.revertStyle();
      });
    }

    function updateViewByDeviceID(device_id) {
      var marker = markers_all[device_id];
      if (marker) { // Update current view when a maker is clicked
        // Update UI
        $map_devices_select.find("option[data-key=" + device_id + "]").prop('selected', true);

        // Set google map
        google_map.setZoom(ZOOM_LEVEL_ON_MARKER_CLICK);
        google_map.setCenter(marker.getPosition());

        // Set marker style
        if (focused_marker) {
          setMarkerIcon(focused_marker, MAR_STROKE_WEIGHT, MAR_STROKE_COLOR, MAR_FILL_COLOR);
          focused_marker.setZIndex(MAR_Z_INDEX);
        }
        setMarkerIcon(marker, FOC_MAR_STROKE_WEIGHT, FOC_MAR_STROKE_COLOR, FOC_MAR_FILL_COLOR);
        marker.setZIndex(FOC_MAR_Z_INDEX);

        focused_marker = marker;
      } else { // Update current view when a GeoJSON polygon is clicked
        // Get and fit bounds
        var z = device_zipcode_table[device_id];
        if (typeof z == "undefined") return;
        var bc = zipcode_bound_table[z];
        var b = new google.maps.LatLngBounds(
          new google.maps.LatLng(bc[1], bc[0]),
          new google.maps.LatLng(bc[3], bc[2])
        );
        google_map.fitBounds(b);

        // Handle style of the data layer
        google_map.data.revertStyle();
        google_map.data.overrideStyle(zipcode_feature_table[highlighted_zipcode], ZIPCODE_DEFAULT_STYLE);
        highlighted_zipcode = z;
        google_map.data.overrideStyle(zipcode_feature_table[highlighted_zipcode], ZIPCODE_HIGHLIGHT_STYLE);

        // Handle style of the info window
        $("#" + highlighted_speck_id).css(SPECK_ID_DEFAULT_CSS);
        highlighted_speck_id = device_id;
        $("#" + highlighted_speck_id).css(SPECK_ID_HIGHLIGHT_CSS);
      }
    }

    function setMarkerIcon(marker, stroke_weight, stroke_color, fill_color) {
      var icon = marker.getIcon();
      icon.strokeWeight = stroke_weight;
      icon.strokeColor = stroke_color;
      icon.fillColor = fill_color;
      marker.setIcon(icon);
    }

    function handleHashChange() {
      var unsafe_hash = util.getUnsafeHashString().match(/#(.+)/);
      if (unsafe_hash) {
        var unsafe_hash_obj = util.unpackVars(unsafe_hash[1]);
        var device_id = unsafe_hash_obj["device_id"];
        focused_device_id = device_id;
        updateViewByDeviceID(device_id);
      }
    }

    function handleViewChange(device_id) {
      // This method prevents calling handleHashChange multiple times
      if (focused_device_id == device_id) {
        updateViewByDeviceID(device_id);
      } else {
        // Changing hash calls handleHashChange() and updates the UI
        window.location.hash = "device_id=" + device_id;
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
    window.ehp.Map = Map;
  } else {
    window.ehp = {};
    window.ehp.Map = Map;
  }
})();