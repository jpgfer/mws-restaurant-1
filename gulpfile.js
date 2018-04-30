var gulp = require('gulp');

gulp.task('default', defaultTask);

function defaultTask(done) {
  console.log('Hello world!');
  done();
}