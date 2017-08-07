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
    var title = settings["title"];
    var slide = settings["slide"];

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
      $story_scroller.append($('<h2 class="story-scroller-title">' + title + '</h2>'));

      for (var i = 0; i < slide.length; i++) {
        var html = '';
        html += '<img class="story-scroller-image" src="' + slide[i]["image"] + '">';
        html += '<p class="story-scroller-text">' + slide[i]["text"] + '</p>';
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