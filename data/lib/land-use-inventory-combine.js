/**
 * Combine and format land use inventories.
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const csv = require('d3-dsv').dsvFormat(',');
const categories = require('./categories');

// Input and out
const argv = require('yargs').argv;
if (!argv.counties) {
  throw new Error('--counties required');
}
if (!argv.cities) {
  throw new Error('--cities required');
}
if (!argv.output) {
  throw new Error('--output required');
}

// Load up data to match
function inputCSV(i) {
  return csv.parse(fs.readFileSync(i[0] === '/' ? i : path.join(process.cwd(), i), 'utf-8'));
}

const cities = inputCSV(argv.cities);
const counties = inputCSV(argv.counties);

// Combine
let combined = {};

// Go theough each set
_.each({ city: cities, county: counties }, (set, type) => {
  _.each(set, (row) => {
    let code = type === 'county' ? row.CO_CODE : row.CTU_CODE;
    let name = type === 'county' ? row.CO_NAME : row.CTU_NAME;
    let id = type + '-' + code + '-' + row.YEAR;

    // Existing or not
    combined[id] = combined[id] || {
      id: id,
      type: type,
      area: type + '-' + code,
      code: code,
      name: name,
      countyCode: row.CO_CODE,
      year: parseInt(row.YEAR),
      landUse: []
    };

    if (!categories.categorize(row.LAND_USE_DESCRIPTION)) {
      console.log(row.LAND_USE_DESCRIPTION);
    }

    combined[id].landUse.push({
      code: row.LAND_USE,
      desc: row.LAND_USE_DESCRIPTION,
      acres: _.isNaN(parseFloat(row.ACRES)) ? undefined : parseFloat(row.ACRES),
      community: row.COMMUNITY_DESIGNATION,
      category: categories.categorize(row.LAND_USE_DESCRIPTION)
    });
  });
});

// Totals
combined = _.map(combined, (d) => {
  // Total acres
  d.acres = _.sumBy(d.landUse, (l) => {
    return l.acres || 0;
  });

  // Acres by categories
  d.categories = _.map(_.groupBy(d.landUse, 'category'), (landUse, c) => {
    return {
      category: c,
      acres: _.sumBy(landUse, (l) => {
        return l.acres || 0;
      })
    };
  });

  return d;
});

// Save
fs.writeFileSync(argv.output[0] === '/' ? argv.output : path.join(process.cwd(), argv.output), JSON.stringify(combined));
