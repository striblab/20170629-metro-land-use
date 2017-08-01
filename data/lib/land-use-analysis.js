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
if (!argv.output) {
  throw new Error('--output required');
}

// Load up data to match
function inputJSON(i) {
  return JSON.parse(fs.readFileSync(i[0] === '/' ? i : path.join(process.cwd(), i), 'utf-8'));
}
const aggregates = inputJSON(argv.aggregates);

['byCounty', 'byPopulation', 'byCity'].forEach((set) => {
  [
    { label: 'prev undeveloped', fields: '^chYYYY-undeveloped-->(residential|residential-dense|commercial|industrial|mixed|transportation)$' },
    { label: 'prev not park', fields: '^chYYYY-(?!park).*-->park$' },
    { label: 'residential to dense residential', fields: '^chYYYY-residential-->residential-dense$' },
    { label: 'industrial to residential', fields: '^chYYYY-industrial-->residential.*$' },
    { label: 'commercial to mixed', fields: '^chYYYY-commercial-->mixed.*$' },
    { label: 'undeveloped to commercial or industrial', fields: '^chYYYY-undeveloped-->(commerical|industrial)$' },
    { label: 'unchanged', fields: '^chYYYY-(.+)-->\\1$' },
    { label: 'changed-broad-category', fields: '^chYYYY-(.+)-->((?!\\1).+$|\\1.+$)' },
    { label: 'changed-specific-category', fields: '^cdYYYY-(.+)-->((?!\\1).+$|\\1.+$)' },
    { label: 'prev golf course', fields: '^cdYYYY-(.*golf.*)-->((?!golf).)*$' },
    { label: 'golf course to residential', fields: '^cdYYYY-(.*golf.*)-->.*(family|farmstead|housing|seasonal).*$' }
  ].forEach((filter) => {
    let collected = _.map(aggregates[set], (area) => {
      let row = {
        area: area.name,
        totalAcres: area.countedAcres,
      };

      ['20002005', '20052010', '20102016'].forEach((years) => {
        let y1 = years.substring(0, 4);
        let y2 = years.substring(4, 8);

        let r = new RegExp(filter.fields.replace('YYYY', years), 'i');
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
  const dir = argv.output[0] === '/' ? argv.output : path.join(process.cwd(), argv.output);
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
