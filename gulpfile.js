const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const replace = require('gulp-token-replace');

// Default task
gulp.task('default', function () {
  // Watch for changes in files
  gulp.watch('*.html', ['dist-html']);
  gulp.watch('css/**/*.css', ['dist-css']);
  gulp.watch('js/**/*.js', ['dist-js']);
});

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
// Copy css to dist folder
gulp.task('dist-css', function () {
  return gulp
          .src('css/**/*.css')
          .pipe(gulp.dest('./dist/css'));
});
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
  return gulp
          .src('js/**/*.js')
          .pipe(gulp.dest('./dist/js'));
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
gulp.task('dist', gulp.parallel('dist-html', 'dist-css', 'dist-js'));

