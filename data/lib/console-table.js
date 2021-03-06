/**
 * console.table but as just a function.
 */


var Table = require('easy-table');

function isType(t, x) {
  return typeof x === t;
}

var isString = isType.bind(null, 'string');

function isArrayOf(isTypeFn, a) {
  return Array.isArray(a) &&
    a.every(isTypeFn);
}

var isArrayOfStrings = isArrayOf.bind(null, isString);
var isArrayOfArrays = isArrayOf.bind(null, Array.isArray);

function arrayToString(arr) {
  var t = new Table();
  arr.forEach(function (record) {
    if (typeof record === 'string' ||
      typeof record === 'number') {
      t.cell('item', record);
    } else {
      // assume plain object
      Object.keys(record).forEach(function (property) {
        t.cell(property, record[property]);
      });
    }
    t.newRow();
  });
  return t.toString();
}

function printTableWithColumnTitles(titles, items) {
  var t = new Table();
  items.forEach(function (item) {
    item.forEach(function (value, k) {
      t.cell(titles[k], value);
    });
    t.newRow();
  });
  var str = t.toString();
  console.log(str);
}

function printTitleTable(title, arr) {
  var str = arrayToString(arr);
  var rowLength = str.indexOf('\n');
  if (rowLength > 0) {
    if (title.length > rowLength) {
      rowLength = title.length;
    }
    console.log(title);
    var sep = '-', k, line = '';
    for (k = 0; k < rowLength; k += 1) {
      line += sep;
    }
    console.log(line);
  }
  console.log(str);
}

function objectToArray(obj) {
  var keys = Object.keys(obj);
  return keys.map(function (key) {
    return {
      key: key,
      value: obj[key]
    };
  });
}

function objectToString(obj) {
  return arrayToString(objectToArray(obj));
}

module.exports = function () {
  var args = Array.prototype.slice.call(arguments);

  if (args.length === 2 &&
    typeof args[0] === 'string' &&
    Array.isArray(args[1])) {

    return printTitleTable(args[0], args[1]);
  }

  if (args.length === 2 &&
    isArrayOfStrings(args[0]) &&
    isArrayOfArrays(args[1])) {
    return printTableWithColumnTitles(args[0], args[1]);
  }

  args.forEach(function (k) {
    if (typeof k === 'string') {
      return console.log(k);
    }
    else if (Array.isArray(k)) {
      console.log(arrayToString(k));
    }
    else if (typeof k === 'object') {
      console.log(objectToString(k));
    }
  });
};
