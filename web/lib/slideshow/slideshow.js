(function () {
  "use strict";

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var Slideshow = function (settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    var slide = settings["slide"];
    var title = settings["title"];
    var slideshow_close_callback = settings["slideshow_close_callback"];
    var slideshow_open_callback = settings["slideshow_open_callback"];
    var $slideshow_image, $slideshow_image_loading, $slideshow_image_error;
    var $slideshow, $slideshow_caption, $slideshow_left_arrow, $slideshow_right_arrow;
    var current_slide_idx = 0;
    var previous_slide_idx = 0;
    var images_cache = new Array(slide.length);
    var setSlideTimeout = null;

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
      for (var i = 0; i < slide.length; i++) {
        var $img = $('<img class="slideshow-image" src="' + slide[i]["image"] + '" data-index="' + i + '">');
        $img.on("load", function () {
          var $this = $(this);
          images_cache[$this.data("index")] = $this;
        }).on("error", function () {
          images_cache[$(this).data("index")] = "error";
        })
      }
    }

    function addSlideshowUI() {
      $slideshow = $('<div class="slideshow"></div>');
      $slideshow_image_loading = $('<div class="slideshow-image-loading"></div>');
      $slideshow_image_error = $('<div class="slideshow-image-error">Error when loading image</div>');
      $slideshow_image = $slideshow_image_loading;
      var $slideshow_caption_container = $('<div class="slideshow-caption-container"></div>');
      $slideshow_caption = $('<div class="slideshow-caption"></div>');
      $slideshow_left_arrow = $('<div class="slideshow-left-arrow slideshow-arrow"></div>');
      $slideshow_right_arrow = $('<div class="slideshow-right-arrow slideshow-arrow"></div>');
      var $slideshow_close = $('<div class="slideshow-close"></div>');

      // Add structure
      $slideshow_caption_container.append($slideshow_caption);
      $slideshow.append($slideshow_image);
      $slideshow.append($slideshow_caption_container);
      $slideshow.append($slideshow_left_arrow);
      $slideshow.append($slideshow_right_arrow);
      $slideshow.append($slideshow_close);

      // Add listeners
      $slideshow_left_arrow.on("click", function () {
        setSlide(current_slide_idx - 1);
      });
      $slideshow_right_arrow.on("click", function () {
        setSlide(current_slide_idx + 1);
      });
      $slideshow_close.on("click", function () {
        close();
      });
    }

    function setSlide(desired_slide_idx) {
      // Sanity check
      if (desired_slide_idx <= 0) {
        desired_slide_idx = 0;
      } else if (desired_slide_idx >= slide.length - 1) {
        desired_slide_idx = slide.length - 1;
      }

      // Handle arrows
      if (slide.length > 1) {
        if (desired_slide_idx === 0) {
          $slideshow_right_arrow.show();
          $slideshow_left_arrow.hide();
        } else if (desired_slide_idx === slide.length - 1) {
          $slideshow_right_arrow.hide();
          $slideshow_left_arrow.show();
        } else {
          $slideshow_right_arrow.show();
          $slideshow_left_arrow.show();
        }
      }

      // Replace image and text
      setImage(desired_slide_idx);
      setCaption(desired_slide_idx);
      previous_slide_idx = current_slide_idx;
      current_slide_idx = desired_slide_idx;
    }

    function setImage(desired_slide_idx) {
      if (typeof images_cache[desired_slide_idx] === "undefined") {
        clearTimeout(setSlideTimeout);
        $slideshow_image.replaceWith($slideshow_image_loading);
        $slideshow_image = $slideshow_image_loading;
        setSlideTimeout = setTimeout(function () {
          setImage(desired_slide_idx);
        }, 300);
      } else {
        if (images_cache[desired_slide_idx] === "error") {
          $slideshow_image.replaceWith($slideshow_image_error);
          $slideshow_image = $slideshow_image_error;
        } else {
          $slideshow_image.replaceWith(images_cache[desired_slide_idx]);
          $slideshow_image = images_cache[desired_slide_idx];
        }
      }
    }

    function setCaption(desired_slide_idx) {
      $slideshow_caption.text(slide[desired_slide_idx]["text"]);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Privileged methods
    //
    var close = function () {
      $slideshow.detach();
      if (typeof slideshow_close_callback === "function") {
        slideshow_close_callback();
      }
    };
    this.close = close;

    var open = function (container_selector) {
      $slideshow.appendTo(container_selector);
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