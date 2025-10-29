/*
* grunt-svgstore
* https://github.com/FWeinb/grunt-svgstore
*
* Copyright (c) 2014 Fabrice Weinberg
* Licensed under the MIT license.
*/

'use strict';
const Path    = require("path");

var conf = {
  jshint: {
    all: [
      'Gruntfile.js',
      'tasks/*.js',
      '<%= nodeunit.tests %>'
    ],
    options: {
      jshintrc: '.jshintrc'
    }
  },
  
  // Before generating any new files, remove any previously-created files.
  clean: {
    tests: ['tmp']
  },
  // Configuration to be run (and then tested).
  svgstore: {
    normalized: {
      options: {
        prefix: '--icon-',
        cleanup: ['id', 'fill', 'stroke', 'imafake', 'style', 'class'], //, 'class'
        cleanupdefs: true,
        preserveDescElement: false,
        fixedSizeVersion: false,
        includeTitleElement: false,
        renameDefs:true,
        svg: {
          viewBox: '0 0 100 100',
          x: '0',
          y: '0',
          version: "1.1",
          preserveAspectRatio: "xMidYMid meet"
        },
        symbol: {
          viewBox: '0 0 100 100',
          x: '0',
          y: '0',
          version: "1.1",
          preserveAspectRatio: "xMidYMid meet"
        },
      }
    },
    raw: {
      options: {
        prefix: '--icon-raw-',
        //cleanup: ['imafake'],
        cleanupdefs: false,
        preserveDescElement: true,
        fixedSizeVersion: false,
        renameDefs:true,
        includeTitleElement: false,
        svg: {
          viewBox: '0 0 100 100',
          x: '0',
          y: '0',
          version: "1.1",
          preserveAspectRatio: "xMidYMid meet"
        },
        symbol: {
          viewBox: '0 0 100 100',
          x: '0',
          y: '0',
          version: "1.1",
          preserveAspectRatio: "xMidYMid meet"
        },
      }
    }
  },
  // Unit tests.
  nodeunit: {
    tests: ['test/*_test.js']
  }
};
const buildConfig = function(from, to){
  conf.svgstore.normalized.files = {};
  conf.svgstore.raw.files = {};
  
  let source_dir = from || Path.join(__dirname, '..');
  // let dest_dir   = to   || process.env.UI_BUILD_PATH;
  
  var norm_src = Path.join(source_dir, 'icons/normalized/*.svg');
  var norm_dest = Path.join(source_dir, 'bb-templates/svg/normalized.sprite.svg');
  
  var raw_src = Path.join(source_dir, 'icons/raw/*.svg');
  var raw_dest = Path.join(source_dir, 'bb-templates/svg/raw.sprite.svg');
  
  conf.svgstore.normalized.files[norm_dest] = [norm_src];
  conf.svgstore.raw.files[raw_dest] = [raw_src];
  console.log("Building SVG...\n");
  // console.log("Normalized source files (without class)      : " + norm_src + "\n");
  // console.log("Normalized destination files (without class) : " + norm_dest + "\n");
  // console.log("Raw source files   (with classes)            : " + raw_src + "\n");
  // console.log("Raw destination (with classes)               : " + raw_dest + "\n");
  // console.log("---------------------------------------------------------------------------\n");
    
}

module.exports = function (grunt) {
  let from, to;
  if(grunt.option('from')){
    from=grunt.option('from');
  }
  if(grunt.option('to')){
    to=grunt.option('to');
  }
  buildConfig(from, to);

  // Project configuration.
  grunt.initConfig(conf);
  
  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');
  
  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  
  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  //grunt.registerTask('test', ['clean', 'svgstore', 'nodeunit']);
  grunt.registerTask('make', ['clean', 'svgstore']);
  
  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'make']);
  
  //grunt.registerTask('make', ['svgstore:normalized', 'svgstore:raw']);
  
  //console.log("DONE!\n");
  
};
