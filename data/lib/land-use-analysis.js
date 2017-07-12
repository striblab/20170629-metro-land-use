/**
 * Analysis of aggregated land-use data.
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const csv = require('d3-dsv').dsvFormat(',');
const table = require('./console-table.js');
const categories = require('./categories.js');

// Input and out
const argv = require('yargs').argv;
if (!argv.aggregates) {
  throw new Error('--aggregates required');
}

// Load up data to match
function inputJSON(i) {
  return JSON.parse(fs.readFileSync(i[0] === '/' ? i : path.join(process.cwd(), i), 'utf-8'));
}
const aggregates = inputJSON(argv.aggregates);


['byCounty', 'byPopulation', 'byCity'].forEach((set) => {
  [
    { label: 'prev undeveloped', fields: '-undeveloped-(?!undeveloped).*$' },
    { label: 'prev not park', fields: '-(?!park).*-park$' },
    { label: 'residential to dense residential', fields: '-residential-residential-dense$' },
    { label: 'industrial to residential', fields: '-industrial-residential.*$' },
    { label: 'commercial to mixed', fields: '-commercial-mixed.*$' },
    { label: 'unchanged', fields: '-([^\\-]*(-dense)?)-\\1$' }
  ].forEach((filter) => {
    let collected = _.map(aggregates[set], (area) => {
      let row = {
        area: area.name,
        totalAcres: area.countedAcres,
      };

      ['20002005', '20052010', '20102016'].forEach((years) => {
        let y1 = years.substring(0, 4);
        let y2 = years.substring(4, 8);

        let r = new RegExp(years + filter.fields, 'i');
        let sum = sumFields(r, area);
        row[y1 + ' to ' + y2 + ' ' + filter.label] = sum;
        row[y1 + ' to ' + y2 + ' ' + filter.label + ' % area'] = percent(sum / area.countedAcres);
      });

      return row;
    });

    // Save
    let file = _.kebabCase(filter.label) + '-' + _.kebabCase(set) + '.csv';
    outputCSV(file, _.sortBy(collected, 'area'));
  });
});




// { population: 823,
// populationError: 89,
// countedAcres: 3.086218240205205e-9,
// 'lud_1984-No Data': 3.086218240205205e-9,
// 'lud_1990-No Data': 3.086218240205205e-9,
// 'lud_1997-Vacant/Agricultural': 3.086218240205205e-9,
// 'lud_2000-Agricultural': 3.086218240205205e-9,
// 'lud_2005-Agricultural': 3.086218240205205e-9,
// 'lud_2010-Agricultural': 3.086218240205205e-9,
// 'lud_2016-Agricultural': 3.086218240205205e-9,
// 'luc_1984-unknown': 3.086218240205205e-9,
// 'luc_1990-unknown': 3.086218240205205e-9,
// 'luc_1997-undeveloped': 3.086218240205205e-9,
// 'luc_2000-undeveloped': 3.086218240205205e-9,
// 'luc_2005-undeveloped': 3.086218240205205e-9,
// 'luc_2010-undeveloped': 3.086218240205205e-9,
// 'luc_2016-undeveloped': 3.086218240205205e-9,
// 'ch20002005-undeveloped-undeveloped': 3.086218240205205e-9,
// 'ch20002010-undeveloped-undeveloped': 3.086218240205205e-9,
// 'ch20002016-undeveloped-undeveloped': 3.086218240205205e-9,
// 'ch20052010-undeveloped-undeveloped': 3.086218240205205e-9,
// 'ch20052016-undeveloped-undeveloped': 3.086218240205205e-9,
// 'ch20102016-undeveloped-undeveloped': 3.086218240205205e-9 }


// Sum fields
function sumFields(reg, data) {
  return _.reduce(data, (prev, v, k) => {
    // Helpful debug to see if regex field matching is good
    // if (k.match(reg)) {
    //   console.log(true, reg, k);
    // }
    // else {
    //   //console.log(false, reg, k);
    // }
    return prev + (k.match(reg) ? v : 0);
  }, 0);
}

// Output csv
function outputCSV(name, data) {
  data = _.map(data);
  const dir = path.join(__dirname, '..', 'build', 'land-use-analysis-outputs');
  mkdirp.sync(dir);
  fs.writeFileSync(path.join(dir, name), csv.format(data));
}

// Join on field
function join(key, fields, sort, ...inputs) {
  let output = {};

  inputs.forEach((set) => {
    _.each(set, (row) => {
      output[row[key]] = output[row[key]] || {};
      output[row[key]] = _.merge(output[row[key]],
        fields ? _.pick(row, [key].concat(fields)) :
          row);
    });
  });

  return _.sortBy(output, sort);
}

// Percentage
function percent(input) {
  return Math.round(input * 10000000) / 100000;
}
