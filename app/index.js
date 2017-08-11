/**
 * Main JS file for project.
 */

/* global $, _, cartodb */
'use strict';

// Dependencies
import utilsFn from './utils.js';

// Setup utils function
let utils = utilsFn({ });

// Add some classes depending on what is going on
if (utils.isEmbedded()) {
  $('body').addClass('embedded');
}
if (utils.query.flush) {
  $('body').addClass('flush');
}

// Get info
let defaultMapConfig = 'http://alan-strib.carto.com/api/v2/viz/804d8a61-85b2-4b58-8e07-aa014702698b/viz.json';
drawMap(defaultMapConfig);

// Draw map
function drawMap(config) {
  let options = {
    shareable: false,
    title: false,
    description: false,
    search: false,
    cartodb_logo: false,
    center_lat: 44.9463334,
    center_lon: -93.1365967,
    zoom: 10,
    legends: true,
    fullscreen: true,
  };

  cartodb.createVis('map', config, options)
    .done((carto, layers) => {
      let visual = layers[1];
      window.map = carto.getNativeMap();

      visual.setInteractivity('lud_2010, lud_2016');
      //visual.setQuery('SELECT * FROM land_use_changed_2016 WHERE ch20102016 = \'residential-->industrial\'');
    })
    .on('error', error);
}

// Handle fullscreen parts
function fullscreen() {
  let header = $('header').outerHeight(true) || 0;
  let footer = $('footer').outerHeight(true) || 0;

  $('.fullscreen-minus-header').css('top', header);
  $('.fullscreen-minus-footer').css('bottom', footer);
}
let throttledFullscreen = _.throttle(fullscreen, 200);
$(window).on('resize', throttledFullscreen);
throttledFullscreen();

// Handle error
function error(e) {
  console.error(e);
}
