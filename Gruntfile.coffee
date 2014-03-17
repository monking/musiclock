module.exports = (grunt) ->

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)

  grunt.initConfig

    pkg: grunt.file.readJSON('package.json')

    coffee:
      compile:
        options:
          bare: true
        expand : true
        cwd    : 'src/coffee'
        src    : '**/*.coffee'
        dest   : 'src'
        ext    : '.js'

    compass:
      compile:
        options:
          sassDir     : 'style/sass'
          imagesDir   : 'public/img'
          cssDir      : 'public/css'
          environment : 'production'
          outputStyle : 'expanded'
          force       : true

    concat:
      dist:
        src: [
          'src/Utils.js',
          'src/EventDispatcher.js',
          'src/Player.js',
          'src/YTPlayer.js',
          'src/MusiClock.js',
          'src/Main.js',
        ]
        dest: 'public/js/tunewich.js'

    watch:
      coffee:
        files: ['src/coffee/**/*.coffee']
        tasks: ['coffee', 'concat']

      styles:
        files: ['style/**/*.{sass,scss}']
        tasks: ['compass']

  grunt.registerTask 'default', ['compass', 'coffee', 'concat', 'watch']
