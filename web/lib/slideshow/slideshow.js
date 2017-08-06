(function () {
  "use strict";

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var Slideshow = function (container_selector, settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    var $container = $(container_selector);
    var sources = settings["sources"];
    var captions = settings["captions"];
    var slideshow_close_callback = settings["slideshow_close_callback"];
    var slideshow_open_callback = settings["slideshow_open_callback"];
    var $slideshow, $slideshow_caption, $slideshow_left_arrow, $slideshow_right_arrow;
    var current_slide_idx = 0;
    var previous_slide_idx = 0;
    var images_cache = new Array(sources.length);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    function init() {
      loadImagesAsync();
      addSlideshowUI();
      setSlide(0);
    }

    function loadImagesAsync() {
      for (var i = 0; i < sources.length; i++) {
        images_cache[i] = $('<img class="slideshow-image" src="' + sources[i] + '">');
      }
    }

    function addSlideshowUI() {
      var html = "";
      html += '<div class="slideshow">';
      html += '  <img class="slideshow-image" src="">';
      html += '  <div class="slideshow-caption-container">';
      html += '    <div class="slideshow-caption"></div>';
      html += '  </div>';
      html += '  <div class="slideshow-left-arrow slideshow-arrow"></div>';
      html += '  <div class="slideshow-right-arrow slideshow-arrow"></div>';
      html += '  <div class="slideshow-close"></div>';
      html += '</div>';
      $container.append($(html));

      $slideshow = $(container_selector + " .slideshow");
      $slideshow_caption = $(container_selector + " .slideshow-caption");

      $slideshow_left_arrow = $(container_selector + " .slideshow-left-arrow");
      $slideshow_left_arrow.on("click", function () {
        setSlide(current_slide_idx - 1);
      });

      $slideshow_right_arrow = $(container_selector + " .slideshow-right-arrow");
      $slideshow_right_arrow.on("click", function () {
        setSlide(current_slide_idx + 1);
      });

      $(container_selector + " .slideshow-close").on("click", function () {
        close();
      });
    }

    function setSlide(desired_slide_idx) {
      if (sources.length > 1) {
        if (desired_slide_idx <= 0) {
          desired_slide_idx = 0;
          $slideshow_right_arrow.show();
          $slideshow_left_arrow.hide();
        } else if (desired_slide_idx >= sources.length - 1) {
          desired_slide_idx = sources.length - 1;
          $slideshow_right_arrow.hide();
          $slideshow_left_arrow.show();
        } else {
          $slideshow_right_arrow.show();
          $slideshow_left_arrow.show();
        }
      }
      var $slideshow_image = $(container_selector + " .slideshow-image");
      if (typeof images_cache[desired_slide_idx] === "undefined") {
        $slideshow_image.attr("src", sources[desired_slide_idx]);
      } else {
        $slideshow_image.replaceWith(images_cache[desired_slide_idx]);
      }
      $slideshow_caption.text(captions[desired_slide_idx]);
      previous_slide_idx = current_slide_idx;
      current_slide_idx = desired_slide_idx;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Privileged methods
    //
    var close = function () {
      $container.hide();
      if (typeof slideshow_close_callback === "function") {
        slideshow_close_callback();
      }
    };
    this.close = close;

    var open = function () {
      $container.show();
      if (typeof slideshow_open_callback === "function") {
        slideshow_open_callback();
      }
    };
    this.open = open;

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
    window.edaplotjs.Slideshow = Slideshow;
  } else {
    window.edaplotjs = {};
    window.edaplotjs.Slideshow = Slideshow;
  }
})();