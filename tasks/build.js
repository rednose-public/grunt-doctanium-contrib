'use strict';

var path = require('path');

module.exports = function(grunt) {
    grunt.registerMultiTask('build', 'Build modules.', function() {
        var options = this.options({
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

            if (keyName.toLowerCase() === 'jsfiles' || keyName.toLowerCase() === 'cssfiles') {
                if (grunt.file.isPathAbsolute(result) === false) {
                    result = '<%= buildFilePath %>/' + result;
                }
            }

            return grunt.template.process(result, { data: {
                buildFilePath: path.dirname(sourceConfig)
            }});
        };

        var readConfig = function (buildFile, _config) {
            var buildFilePath = buildFile;

            buildFile = grunt.file.readJSON(buildFile);

            var expandPaths = function (c) {
                /* Expend file paths */
                for (var item in c) {
                    if (isIterable(c[item]) === true) {
                        c[item] = c[item].map(function (template) {
                            return expand(template, buildFilePath, item)
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
                    readConfig(buildFile.extends[offset], _config);
                }
            }

            return _config;
        };

        this.files.forEach(function(f) {
            f.src.filter(function(filepath) {
                var build = readConfig(filepath);

                if (build.cssfiles) {
                    grunt.config('cssmin.' + build.name, {
                        src: build.cssfiles,
                        dest: options.buildDir + '/' + build.name + '/css/' + build.name + '.min.css'
                    });

                    grunt.task.run('cssmin:' + build.name);
                }

                if (build.jsfiles) {
                    grunt.config('uglify.' + build.name, {
                        src: build.jsfiles,
                        dest: options.buildDir + '/' + build.name + '/' + build.name + '.min.js'
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
            });
        });
    });
};

