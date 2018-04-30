const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');

// Default task
gulp.task('default', function () {
  // Watch for changes in sass files
  gulp.watch('sass/**/*.scss',['styles']);
});

// Sass to CSS task
gulp.task('styles', function () {
  // TODO: For now this task won't be used (postponed to project part 2 or 3)
  return gulp.src('sass/**/*.scss')
      .pipe(sass().on('error', sass.logError))
      .pipe(autoprefixer({
        browsers: ['last 2 versions']
      }))
      .pipe(gulp.dest('./css'));
});


