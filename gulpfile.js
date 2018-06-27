const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const replace = require('gulp-token-replace');
const minify = require('gulp-minify');
const cleanCSS = require('gulp-clean-css');

/**
 * HTML tasks
 */
// Copy html files to dist folder
gulp.task('dist-html', function () {
  const config = require('./config/config.json');
  return gulp
    .src('*.html')
    .pipe(replace({global: config}))
    .pipe(gulp.dest('./dist'));
});


/**
 * CSS tasks
 */
// Concatenate common and main css
gulp.task('dist-css-main', function () {
  return gulp
    .src(['css/shared.css', 'css/main.css'])
    .pipe(concat('main.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest('./dist/css'));
});
// Concatenate common and detail css
gulp.task('dist-css-detail', function () {
  return gulp
    .src(['css/shared.css', 'css/detail.css'])
    .pipe(concat('detail.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest('./dist/css'));
});

// Copy css to dist folder
gulp.task('dist-css', gulp.parallel('dist-css-main', 'dist-css-detail'));

// TODO: For now this task won't be used (postponed to project part 2 or 3)
gulp.task('styles', function () {
  return gulp.src('sass/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(gulp.dest('./css'));
});

/**
 * JS tasks 
 * TODO: setup production tasks and use ".pipe(uglify())" before  ".pipe(gulp.dest('js'))"
 */
// Copy scripts to dist folder
gulp.task('dist-js', function () {
  // Copy regular js
  return gulp
    .src('js/**/*.js')
    .pipe(minify({
      ext: {
        src: '.js',
        min: '.min.js'
      }
    }))
    .pipe(gulp.dest('./dist/js'));
});
// Copy service worker (and others) to dist folder
gulp.task('dist-sw', function () {
  // Copy service worker js (and others)
  return gulp
    .src(['sw.js', 'favicon.ico', 'manifest.json'])
    .pipe(gulp.dest('./dist'));
});

// Concatenate main page js
// TODO: For now this task won't be used (postponed to project part 2 or 3)
gulp.task('scripts-main', function () {
  return gulp.src(['js/main.js', 'js/dbhelper.js'])
    .pipe(concat('main_page.js'))
    .pipe(gulp.dest('js'));
});

// Concatenate restaurant info page js
// TODO: For now this task won't be used (postponed to project part 2 or 3)
gulp.task('scripts-info', function () {
  return gulp.src(['js/restaurant_info.js', 'js/dbhelper.js'])
    .pipe(concat('info_page.js'))
    .pipe(gulp.dest('js'));
});

/**
 * DIST task
 */
gulp.task('dist', gulp.parallel('dist-html', 'dist-css', 'dist-js', 'dist-sw'));

/**
 * Watch task
 */
gulp.task('watch', function () {
  // Watch for changes in files
  gulp.watch('*.html', gulp.parallel('dist-html'));
  gulp.watch('css/**/*.css', gulp.parallel('dist-css'));
  gulp.watch('js/**/*.js', gulp.parallel('dist-js'));
  gulp.watch(['sw.js', 'favicon.ico', 'manifest.json'], gulp.parallel('dist-sw'));
});

/**
 * Default task
 */
gulp.task('default', gulp.series('dist', 'watch'));