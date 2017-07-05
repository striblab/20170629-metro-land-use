/**
 * Take a config file and make Jakefile tasks with it.
 * This helps reduncy and promotes some readablity.
 */

// Dependencies
const jake = require('jake');
const chalk = require('chalk');
const exec = require('child_process').execSync;
const _ = require('lodash');

// Helper to run command line
const run = (c) => {
  return exec(c, { stdio: [0, 1, 2] });
};

// Main function to make tasks
module.exports = (config) => {
  // Groups
  let groups = {};

  // Go through config
  config.forEach((c) => {
    // Make directory tasks if needed
    let dir;
    if ((c.type === 'file' || !c.type) && c.task) {
      dir = c.task.split('/').slice(0, -1).join('/');
      jake.desc('Directory: ' + dir);
      jake.directory(dir);
    }
    // Automatically attached directory dependencies
    let deps = c.deps || [];
    deps = dir ? deps.concat([dir]) : deps;

    // Make task.  Allow to use a main function or commands array.
    jake.desc(c.desc);
    jake[c.type || 'file'](c.task, deps, c.main ? function() {
      console.log(chalk.bgGreen.black(c.desc));
      c.main(arguments);
    } : () => {
      console.log(chalk.bgGreen.black(c.desc));

      c.commands = _.isArray(c.commands) ? c.commands : [ c.commands ];
      c.commands.forEach((command) => {
        run(_.isArray(command) ? command.join(' ') : command);
      });
    });

    // Add to group
    if (c.group) {
      groups[c.group] = groups[c.group] || [];
      groups[c.group].push(c.task);
    }
  });

  // Make group function
  _.each(groups, (tasks, group) => {
    jake.desc('Group: ' + group);
    jake.task(group, tasks);
  });
};
