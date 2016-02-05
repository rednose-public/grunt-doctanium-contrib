'use strict';

var path = require('path');

module.exports = function(grunt) {
    grunt.registerMultiTask('build', 'Build modules.', function() {
        var options = this.options({
            bowerPath: 'bower_components',
            buildDir: 'web/assets/build'
        });

        this.files.forEach(function(f) {
            f.src.filter(function(filepath) {

                function expand(template) {
                    var result = grunt.template.process(template, {data: {
                        bowerPath: options.bowerPath
                    }});

                    if (grunt.file.isPathAbsolute(result)) {
                        return result;
                    }

                    return path.dirname(filepath) + '/' + result;
                }

                var build = grunt.file.readJSON(filepath);

                if (build.cssfiles) {
                    grunt.config('cssmin.' + build.name, {
                        src: build.cssfiles.map(expand),
                        dest: options.buildDir + '/' + build.name + '/css/' + build.name + '.min.css'
                    });

                    grunt.task.run('cssmin:' + build.name);
                }

                if (build.jsfiles) {
                    grunt.config('uglify.' + build.name, {
                        src: build.jsfiles.map(expand),
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
