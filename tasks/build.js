'use strict';

var path = require('path');
var Glob = require("glob").Glob;

module.exports = function(grunt) {
    grunt.registerMultiTask('build', 'Build modules.', function() {
        var options = this.options({
            webDir: 'web/',
            bowerPath: 'bower_components',
            buildDir: 'web/assets/build'
        });

        var arrayUnique = function(arr) {
            for (var i = 0; i < arr.length; ++i) {
                for (var j = i + 1; j < arr.length; ++j) {
                    if(arr[i] === arr[j]) {
                        arr.splice(j--, 1);
                    }
                }
            }

            return arr;
        };

        var isIterable = function(obj) {
            if (obj == null) {
                return false;
            }

            return ((typeof obj != 'string') && (typeof obj[Symbol.iterator] === 'function'));
        };

        var expand = function(template, sourceConfig, keyName) {
            var result = grunt.template.process(template, { data: {
                bowerPath: options.bowerPath
            }});

            if (grunt.file.isPathAbsolute(result) === false) {
                result = '<%= buildFilePath %>/' + result;
            }

            return grunt.template.process(result, { data: {
                buildFilePath: path.dirname(sourceConfig)
            }});
        };

        var parseConfig = function (buildFile, _config) {
            buildFile = options.webDir + buildFile;

            var buildFilePath = buildFile;

            buildFile = grunt.file.readJSON(buildFile);

            var expandPaths = function (c) {
                /* Expend file paths */
                for (var item in c) {
                    if (isIterable(c[item]) === true) {
                        c[item] = c[item].map(function (template) {
                            if (item.toLowerCase() === 'jsfiles' || item.toLowerCase() === 'cssfiles') {
                                return expand(template, buildFilePath, item);
                            }

                            return template;
                        });
                    }
                }

                return c;
            };

            buildFile = expandPaths(buildFile);

            if (!_config) {
                _config = buildFile;
            } else {
                // Apply config from extended child configuration
                for (var item in buildFile) {
                    if (!_config[item]) {
                        // Add non existing keys
                        _config[item] = buildFile[item];
                    } else {
                        // Merge iteratable (compex) types and ignore scalar types,
                        // those have already been set by the parent build file.
                        if (isIterable(buildFile[item]) === true) {
                            _config[item] = arrayUnique(_config[item].concat(buildFile[item]));
                        }
                    }
                }
            }

            if (buildFile.extends) {
                for (var offset in buildFile.extends) {
                    parseConfig(buildFile.extends[offset], _config);
                }
            }

            return _config;
        };

        new Glob(options.webDir + this.data, { sync:true }, function (err, buildFiles) {
            for (var idx in buildFiles) {
                run(buildFiles[idx].substring(options.webDir.length));
            }
        });

        function run(filepath) {
            var build = parseConfig(filepath),
                token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                });

            grunt.config('clean.' + build.name, {
                src: [ options.buildDir + '/' + build.name + '/*' ]
            });
            grunt.task.run('clean:' + build.name);

            if (build.cssfiles) {
                grunt.config('cssmin.' + build.name, {
                    src: build.cssfiles,
                    dest: options.buildDir + '/' + build.name + '/css/' + build.name + '.' + token +  '.min.css'
                });

                grunt.task.run('cssmin:' + build.name);
            }

            if (build.jsfiles) {
                grunt.config('uglify.' + build.name, {
                    src: build.jsfiles,
                    dest: options.buildDir + '/' + build.name + '/' + build.name + '.' + token + '.min.js'
                });

                grunt.task.run('uglify:' + build.name);
            }

            if (build.copy) {
                grunt.config('copy.' + build.name, {
                    files: build.copy.map(function(dir) {
                        return {expand: true, cwd: expand(dir[0]), src: '**/*', dest: options.buildDir + '/' + build.name + '/' + dir[1]};
                    })
                });

                grunt.task.run('copy:' + build.name);
            }
        }
    });
};

