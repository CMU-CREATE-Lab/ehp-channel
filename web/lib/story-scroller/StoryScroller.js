(function () {
  "use strict";

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var StoryScroller = function (container_selector, settings) {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    var $container = $(container_selector);
    var sources = settings["sources"];
    var captions = settings["captions"];

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //
    function init() {
      addUI();
    }

    function addUI() {
      var $story_scroller = $('<div class="story-scroller"></div>');
      $container.append($story_scroller);
      $story_scroller.append($('<h2 class="story-scroller-title">Story Title</h2>'));

      for (var i = 0; i < sources.length; i++) {
        var html = '';
        if (sources[i] != null) {
          html += '<img class="story-scroller-image" src="' + sources[i] + '">';
        }
        html += '<p class="story-scroller-text">' + captions[i] + '</p>';
        $story_scroller.append($(html));
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
  if (window.edaplotjs) {
    window.edaplotjs.StoryScroller = StoryScroller;
  } else {
    window.edaplotjs = {};
    window.edaplotjs.StoryScroller = StoryScroller;
  }
})();