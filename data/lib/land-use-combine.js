/**
 * Combine data sets
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const shapefile = require('shapefile-stream');
const through = require('through2');
const pace = require('pace');
const turf = require('turf');
const _ = require('lodash');


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
if (!argv['output']) {
  throw new Error('--output required');
}

// Load up data to match
function inputJSON(i) {
  return JSON.parse(fs.readFileSync(i[0] === '/' ? i : path.join(process.cwd(), i), 'utf-8'));
}
console.log('Loading inputs...');
const counties = inputJSON(argv.counties);
const cities = inputJSON(argv.cities);

// Loadup output to be able to make things resumable
console.log('Loading output...');
let output = {};
try {
  output = inputJSON(argv.output);
}
catch (e) {
  output = { type: 'FeatureCollection', features: [] };
}

// Crop counties and cities
console.log('Cropping inputs for quicker matching...');
const inputBBOX = turf.bboxPolygon([ -94.0126, 44.4712, -92.7319, 45.4146 ]);
counties.features = counties.features.filter((f) => {
  return turf.intersect(f, inputBBOX);
});
cities.features = cities.features.filter((f) => {
  return turf.intersect(f, inputBBOX);
});

// Progress (manually known total);
const pacer = pace(35241);

// Output streams
let findExisting = (id) => {
  return id ? _.find(output.features, (f) => {
    return f.properties && f.properties.id === id && f.properties.countyID && f.properties.cityID;
  }) : false;
};

// Save stream
let saveOutput = () => {
  fs.writeFileSync(argv.output[0] === '/' ? argv.output : path.join(process.cwd(), argv.output),
    JSON.stringify(output));
};

// There is no ID for each feature, so we assume the same order
let countID = 0;

// Start reading in shapefile
let inputGeo = shapefile.createReadStream(argv['land-use'])
  .pipe(through.obj(function(feature, enc, next) {
    let p = feature.properties;
    let existing = findExisting(countID);

    // Move on
    let moveOn = (doSaveOutput = true) => {
      countID++;
      this.push(feature);
      if (doSaveOutput) {
        saveOutput();
      }
      pacer.op();
      next();
    };

    // Check
    if (!existing || p.error) {
      // Timeout
      let t = setTimeout(() => {
        console.error('Timeout error.');
        p.error = 'Timeout';
        output.features.push(feature);
        moveOn();
      }, 20000);

      try {
        // ID
        p.id = countID;

        // Cleanup some bad fields
        _.each(p, (v, k) => {
          p[k] = _.isString(v) ? v.trim().replace(/[^a-z0-9-,.\s\\/]/ig, '') : v;
        });

        // Area
        p.area = turf.area(feature);

        // County boundaries and population
        let county = intersectJSON(feature, counties);
        if (county) {
          p.countyID = county.properties.geoid;
          p.county = county.properties.name.replace(', MN', '').replace(' County', '');
          p.countyPop = county.properties.B03002001;
          p.countyPopE = county.properties['B03002001, Error'];
        }
        else {
          p.error = 'Unable to match county.';
        }

        // City/county-subdivision boundaries and population
        let city = intersectJSON(feature, cities);
        if (city) {
          p.cityID = city.properties.geoid;
          p.city = city.properties.name.replace(/,.* county/i, '').replace(/, mn/i, '');
          p.cityPop = city.properties.B03002001;
          p.cityPopE = city.properties['B03002001, Error'];
        }
        else {
          p.error = (p.error ? p.error + ' || ' : '') + 'Unable to match county.';
        }

        // Add to output
        output.features.push(feature);
      }
      catch (e) {
        console.error('Error processing.');
        console.error(e);
        p.error = e;
        output.features.push(feature);
      }

      clearTimeout(t);
      moveOn();
    }
    else {
      moveOn(false);
    }
  }))
  .on('error', (error) => {
    console.error('Geo reading error.');
    console.error(error);
    output.end();
  })
  .on('data', () => {
    // Nothing
  })
  .on('finish', () => {
    console.log('Done reading.');
  });


// Make sure save happen correctly on intterruption
process.on('SIGINT', function() {
  saveOutput();
  console.error('Aborting...');
  process.exit();
});

// Find intersscetion in JSON
function intersectJSON(feature, set) {
  return _.find(set.features, (f) => {
    return turf.intersect(feature, f);
  });
}
