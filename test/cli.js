const describe = require('mocha').describe
const exec = require('child_process').exec
const it = require('mocha').it

require('chai').should()

describe('cli', function() {
  it('Should run on CLI (with glob support)', function(done) {
    const command = [
      'cp test/samples/image_2.jpg test/samples/image_2.cli.jpg',
      'cp test/samples/image_3.jpg test/samples/image_3.cli.jpg',
      'cp test/samples/image_4.jpg test/samples/image_4.cli.jpg',
      './src/cli.js test/samples/image_2.cli.jpg "test/samples/image_{3,4}.cli.jpg" --quality=85',
      'rm test/samples/image_2.cli.jpg',
      'rm test/samples/image_3.cli.jpg',
      'rm test/samples/image_4.cli.jpg',
    ]
    exec(command.join(' && '), function(error, stdout, stderr) {
      stdout.should.be.a('string').and.contain('Processed (Orientation was 2) (Quality 85%)')
      stdout.should.be.a('string').and.contain('Processed (Orientation was 3) (Quality 85%)')
      stdout.should.be.a('string').and.contain('Processed (Orientation was 4) (Quality 85%)')
      stderr.should.equal('')
      done()
    })
  })
})
