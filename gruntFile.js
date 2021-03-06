module.exports = function ( grunt ) {

    /**
     * Load required Grunt tasks. These are installed based on the versions listed
     * in `package.json` when you do `npm install` in this directory.
     */
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-ngmin');
    grunt.loadNpmTasks('grunt-html2js');
    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.loadNpmTasks('grunt-plato');

    /**
     * Load in our build configuration file.
     */
    var userConfig = require( './build.config.js' );

    /**
     * This is the configuration object Grunt uses to give each plugin its
     * instructions.
     */
    var taskConfig = {
        /**
         * We read in our `package.json` file so we can access the package name and
         * version. It's already there, so we don't repeat ourselves here.
         */
        pkg: grunt.file.readJSON("package.json"),

        /**
         * The banner is the comment that is placed at the top of our compiled
         * source files. It is first processed as a Grunt template, where the `<%=`
         * pairs are evaluated based on this very configuration object.
         */
        meta: {
            banner:
                '/**\n' +
                    ' * <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                    ' *\n' +
                    ' * Copyright (c) <%= grunt.template.today("yyyy") %> ICDC\n' +
                    ' */\n'
        },

        /**
         * The directories to delete when `grunt clean` is executed.
         * grunt clean ...toutes les targets
         * grunt clean:report... target report uniquement
         */
        clean: {
            report: ['<%= report_dir %>'],
            build: ['<%= build_dir %>'],
            dist: ['<%= dist_dir %>'],
            options: {
                force: true
            }
        },

        /**
         * `jshint` defines the rules of our linter as well as which files we
         * should check. This file, all javascript sources, and all our unit tests
         * are linted based on the policies listed in `options`. But we can also
         * specify exclusionary patterns by prefixing them with an exclamation
         * point (!); this is useful when code comes from a third party but is
         * nonetheless inside `src/`.
         *
         * On joue jshint sur les sources du projet pour faciliter la correction et l'identification du pb
         */
        jshint: {
            beforeconcat : {
                src: [
                    '<%= app_files.js_files %>'
                ],
                test: [
                    '<%= app_files.jsunit %>'
                ],
                options: {
                    jshintrc: true
                }
            },
            afterconcat : {
                src: [
                    '<%= build_dir %>/js/<%= pkg.name %>-<%= pkg.version %>.js'
                ],
                options: {
                    "node": true,
                    "browser": true,
                    "esnext": true,
                    "bitwise": false,
                    "camelcase": false,
                    "curly": true,
                    "eqeqeq": true,
                    "immed": true,
                    "latedef": true,
                    "newcap": true,
                    "noarg": true,
                    "regexp": true,
                    "undef": true,
                    "unused": true,
                    "strict": true,
                    "trailing": true,
                    "smarttabs": false,
                    "-W099": true,
                    "-W116": true
                }
            }

        },

        /**
         * The `copy` task just copies files from A to B. We use it here to copy
         * our project assets (images, fonts, etc.) and javascripts into
         * `build_dir`, and then to copy the assets to `compile_dir`.
         *
         * Copie des fichiers js angular (service, directive, controler, ...) + tests unitaires
         * Copie des fichiers mock ! A NE PAS FAIRE POUR UNE RELEASE !
         * option cwd : défini un path relatif
         */
        copy: {

            build_appjs: {
                files: [
                    {
                        src: [ '<%= app_files.js_files %>' ],
                        dest: '<%= build_dir %>/',
                        cwd: '.',
                        expand: true
                    }
                ]
            },
            build_jsunit: {
                files: [
                    {
                        src: [ '<%= app_files.jsunit %>' ],
                        dest: '<%= build_dir %>/tests/unit',
                        cwd: '.',
                        expand: true,
                        flatten: true
                    }
                ]
            },
            build_mock_json: {
                files: [
                    {
                        src: [ '<%= app_files.mock.json %>' ],
                        dest: '<%= build_dir %>/mock',
                        cwd: 'src/',
                        expand: true
                    }
                ]
            },
            dist_js: {
                files: [
                    {
                        src: [ '<%= build_dir %>/js/*.js' ],
                        dest: '<%= dist_dir %>/',
                        cwd: '.',
                        expand: true,
                        flatten: true

                    }
                ]
            },
            dist_mock_json: {
                files: [
                    {
                        src: [ '<%= app_files.mock.json %>' ],
                        dest: '<%= dist_dir %>/integration/src',
                        cwd: 'src/',
                        expand: true
                    }
                ]
            },
            dist_bootstrap_js: {
                files: [
                    {
                        src: [ '<%= build_dir %>/src/commun/fwk-bootstrap.js' ],
                        dest: '<%= dist_dir %>/integration',
                        cwd: '.',
                        flatten: true,
                        expand: true
                    }
                ]
            }

        },

        /**
         * HTML2JS is a Grunt plugin that takes all of your template files and
         * places them into JavaScript files as strings that are added to
         * AngularJS's template cache. This means that the templates too become
         * part of the initial payload as one JavaScript file. Neat!
         *
         * Concerne uniquement les templates des directives ou des pages communes (error par exemple)
         */
        html2js: {
            fwk: {
                options: {
                    // ce path est oté du nom du template
                    base: 'src/views',
                    module: 'fwk-templates'
                },
                src: [ '<%= app_files.tpl %>' ],
                dest: '<%= build_dir %>/src/fwk-templates.js'
            }
        },

        /**
         * `ng-min` annotates the sources before minifying. That is, it allows us
         * to code without the array syntax. Grunt plugin for pre-minifying Angular apps
         */
        ngmin: {
            compile: {
                files: [
                    {
                        src: [ '<%= app_files.js_files %>'],  //en principe le fichier fwk-templates.js généré par html2js sera pris en compte car présent dans l'arbo et répond au pattern **/*.js
                        cwd: '<%= build_dir %>',
                        dest: '<%= build_dir %>',
                        expand: true
                    }
                ]
            }
        },

        /**
         * `grunt concat` concatenates multiple source files into a single file.
         */
        concat: {

            /**
             * The `compile_js` target is the concatenation of our application source
             * code and all specified vendor source code into a single file.
             * ici concaténation des scripts js du framework sans les tests et sans librairies tierces
             */
            compile_js: {
                options: {
                    banner: '<%= meta.banner %>'
                },
                src: [  'module.prefix', '<%= app_files.concat_js_files %>', 'module.suffix' ],
                dest: '<%= build_dir %>/js/<%= pkg.name %>-<%= pkg.version %>.js'
            }

        },


        /**
         * Minify the sources!
         */
        uglify: {
            compile: {
                options: {
                    banner: '<%= meta.banner %>',
                    mangle: false
                },
                files: {
                    //output file : input file
                    '<%= build_dir %>/js/<%= pkg.name %>-<%= pkg.version %>.min.js': '<%= concat.compile_js.dest %>'
                }
            }

        },


        /**
         * rapport qualimétrie
         */
        plato: {
            report: {
                options : {
                    complexity : {
                    },
                    jshint: {
                        "node": true,
                        "browser": true,
                        "esnext": true,
                        "bitwise": false,
                        "camelcase": false,
                        "curly": true,
                        "eqeqeq": true,
                        "immed": true,
                        "latedef": true,
                        "newcap": true,
                        "noarg": true,
                        "regexp": true,
                        "undef": true,
                        "unused": true,
                        "strict": false,
                        "trailing": true,
                        "smarttabs": false,
                        "-W099": true,
                        "-W116": true,
                        "globals": {
                            "angular": false,
                            "console" : false
                        }
                    }
                },
                files: {
                    '<%= report_dir %>/plato': ['<%= app_files.js_files %>']
                }
            }
        },

        /**
         * This task compiles the karma template so that changes to its file array
         * don't have to be managed manually.
         */
        karmaconfig: {
            unit: {
                dir: '<%= build_dir %>/tests/unit',
                src: [
                    '<%= vendor_files.js %>',
                    '<%= vendor_files.mock %>'
                ]
            }
        },

        /**
         * The Karma configurations.
         */
        karma: {
            unit: {
               configFile: '<%= build_dir %>/tests/unit/karma-unit.js'
            }
        },

        compress: {
            main: {
                options: {
                    archive: '<%= dist_dir %>/<%= pkg.name %>-<%= pkg.version %>.zip'
                },
                expand: true,
                cwd: '<%= build_dir %>',
                src: ['js/*.min.js']
            }
        }

    };

    grunt.initConfig( grunt.util._.extend( taskConfig, userConfig ) );

    grunt.file.setBase('.');


    /**
     * The default task is to build and compile.
     */
    grunt.registerTask( 'default', [ 'release' ] );

    /**
     * TODO
     * istambul
     * karma
     */

    /**
     * Rapport qualimetrie
     */
    grunt.registerTask( 'report', [
        'clean:report', 'plato:report'
    ]);

    /**
     * Tests unitaires
     * Génération de l'archive angular-fwk-dei-x.x.x.js sur laquelle porte les tests
     */
    grunt.registerTask( 'tests', [
        'jshint:beforeconcat',
        'copy:build_appjs','copy:build_jsunit',
        'html2js',
        'ngmin',
        'concat',
        'jshint:afterconcat',
        'karmaconfig', 'karma:unit'
    ]);

    grunt.registerTask( 'package', [
        'clean:build', 'clean:dist', 'clean:report',
        'jshint:beforeconcat',
        'copy:build_appjs', 'copy:build_jsunit', 'copy:build_mock_json',
        'html2js',
        'ngmin',
        'concat',
        'jshint:afterconcat',
        'uglify',
        'compress',
        'copy:dist_js', 'copy:dist_mock_json', 'copy:dist_bootstrap_js'
    ]);

    grunt.registerTask( 'report', [
        'clean:build', 'clean:dist', 'clean:report',
        'plato:report'
    ]);

    /**
     * The `release` task gets your app ready for deployment by concatenating and
     * minifying your code.
     */
    grunt.registerTask( 'release', [
        'clean:build', 'clean:dist', 'clean:report',
        'jshint:beforeconcat',
        'copy:build_appjs', 'copy:build_jsunit', 'copy:build_mock_json',
        'html2js',
        'ngmin',
        'concat',
        'jshint:afterconcat',
        'karmaconfig', 'karma',
        'plato:report',
        'uglify',
        'compress',
        'copy:dist_js', 'copy:dist_mock_json', 'copy:dist_bootstrap_js'
    ]);


    /**
     * A utility function to get all app JavaScript sources.
     */
    function filterForJS ( files ) {
        return files.filter( function ( file ) {
            return file.match( /\.js$/ );
        });
    }

    /**
     * A utility function to get all app CSS sources.
     */
    function filterForCSS ( files ) {
        return files.filter( function ( file ) {
            return file.match( /\.css$/ );
        });
    }


    /**
     * In order to avoid having to specify manually the files needed for karma to
     * run, we use grunt to manage the list for us. The `karma/*` files are
     * compiled as grunt templates for use by Karma. Yay!
     */
    grunt.registerMultiTask( 'karmaconfig', 'Process karma config templates', function () {
        var jsFiles = filterForJS( this.filesSrc );

        grunt.file.copy( 'test-js-config/karma-unit.tpl.js', grunt.config( 'build_dir' ) + '/tests/unit/karma-unit.js', {
            process: function ( contents, path ) {
                return grunt.template.process( contents, {
                    data: {
                        scripts: jsFiles,
                        packageName: taskConfig.pkg.name,
                        packageVersion: taskConfig.pkg.version
                    }
                });
            }
        });
    });

};
