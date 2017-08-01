/**
 * Take combined land use and format and create new fields.
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const shapefile = require('shapefile-stream');
const geojson = require('geojson-stream');
const through = require('through2');
const categories = require('./categories.js');

// Input and out
const argv = require('yargs').argv;
if (!argv['land-use']) {
  throw new Error('--land-use required');
}
if (!argv.counties) {
  throw new Error('--counties required');
}
if (!argv.cities) {
  throw new Error('--cities required');
}
if (!argv.output) {
  throw new Error('--output required');
}

// Inputs
function inputJSON(i) {
  return JSON.parse(fs.readFileSync(i[0] === '/' ? i : path.join(process.cwd(), i), 'utf-8'));
}
const counties = inputJSON(argv.counties);
const cities = inputJSON(argv.cities);

// Make lookup for counties and cities
const countiesL = _.keyBy(_.map(counties.features, 'properties'), 'geoid');
const citiesL = _.keyBy(_.map(cities.features, 'properties'), 'geoid');

// Output streams
let output = fs.createWriteStream(argv.output)
  .on('error', (error) => {
    console.error('Geo writing error.');
    console.error(error);
  });

// Count features.
let featureCount = 0;

// Read in data
console.log('\nStreaming data and formatting...\n');
let landUse = argv['land-use'][0] === '/' ? argv['land-use'] : path.join(process.cwd(), argv['land-use']);
let input = shapefile.createReadStream(landUse)
  .pipe(through.obj(function(feature, enc, next) {
    let p = feature.properties;

    // Main transformation

    // General categories
    p.luc_1984 = categories.categorize(p.LUD_1984);
    p.luc_1990 = categories.categorize(p.LUD_1990);
    p.luc_1997 = categories.categorize(p.LUD_1997);
    p.luc_2000 = categories.categorize(p.LUD_2000);
    p.luc_2005 = categories.categorize(p.LUD_2005);
    p.luc_2010 = categories.categorize(p.LUD_2010);
    p.luc_2016 = categories.categorize(p.LUD_2016);

    // General category changes
    p.ch20002005 = p.luc_2000 + '-->' + p.luc_2005;
    p.ch20002010 = p.luc_2000 + '-->' + p.luc_2010;
    p.ch20002016 = p.luc_2000 + '-->' + p.luc_2016;
    p.ch20052010 = p.luc_2005 + '-->' + p.luc_2010;
    p.ch20052016 = p.luc_2005 + '-->' + p.luc_2016;
    p.ch20102016 = p.luc_2010 + '-->' + p.luc_2016;

    // Specific category changes
    p.cd20002005 = p.LUD_2000 + '-->' + p.LUD_2005;
    p.cd20002010 = p.LUD_2000 + '-->' + p.LUD_2010;
    p.cd20002016 = p.LUD_2000 + '-->' + p.LUD_2016;
    p.cd20052010 = p.LUD_2005 + '-->' + p.LUD_2010;
    p.cd20052016 = p.LUD_2005 + '-->' + p.LUD_2016;
    p.cd20102016 = p.LUD_2010 + '-->' + p.LUD_2016;

    // Sub areas
    let county = countiesL[p.CO_ID];
    if (!county) {
      console.error('No county match.');
      console.error(p);
    }
    else {
      p.co_name = county.name.replace(' County, MN', '');
      p.co_pop = county.B03002001;
      p.co_pop_e = county['B03002001, Error'];
    }

    let city = citiesL[p.SC_ID];
    if (!city) {
      console.error('No city match.');
      console.error(p);
    }
    else {
      p.sc_name = city.name.replace(', MN', '');
      p.sc_pop = city.B03002001;
      p.sc_pop_e = city['B03002001, Error'];
    }

    // Convert to acres
    p.acres = sqMetersToAcres(p.AREA);

    // Lowercase name
    let lowered = {};
    _.each(p, (v, k) => {
      lowered[k.toLowerCase()] = v;
    });
    feature.properties = lowered;

    featureCount++;
    this.push(feature);
    next(null);
  }))
  .on('data', (feature) => {
    return feature;
  })
  .on('error', (error) => {
    console.error('Geo reading error.');
    console.error(error);
  })
  .on('finish', () => {
    console.log('Done reading ' + featureCount + ' features.');
  });

// Transform to geojson
input.pipe(geojson.stringify())
  .pipe(output);

// Square meters to acres
const sqMetersToAcres = (input) => {
  return input * 0.000247105;
};
