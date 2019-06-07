const before = require('mocha').before
const {checkTransformation, transformWithCli} = require('./helpers.js')
const describe = require('mocha').describe
const fs = require('fs-extra')
const it = require('mocha').it
const jo = require('../src/main.js')
const path = require('path')

require('chai').should()

describe('transformations', function() {
  before(function() {
    return fs.emptyDir(path.join(__dirname, '.tmp'))
  })
  itShouldTransform(path.join(__dirname, '/samples/image_2.jpg'), 'image_2.jpg', 'promise')
  itShouldTransform(path.join(__dirname, '/samples/image_3.jpg'), 'image_3.jpg', 'promise')
  itShouldTransform(path.join(__dirname, '/samples/image_4.jpg'), 'image_4.jpg', 'promise')
  itShouldTransform(path.join(__dirname, '/samples/image_5.jpg'), 'image_5.jpg', 'promise')
  itShouldTransform(path.join(__dirname, '/samples/image_6.jpg'), 'image_6.jpg', 'promise')
  itShouldTransform(path.join(__dirname, '/samples/image_7.jpg'), 'image_7.jpg', 'promise')
  itShouldTransform(path.join(__dirname, '/samples/image_8.jpg'), 'image_8.jpg', 'promise')
  itShouldTransform(path.join(__dirname, '/samples/image_exif.jpg'), 'image_exif.jpg', 'promise')
  itShouldTransform(fs.readFileSync(path.join(__dirname, '/samples/image_8.jpg')), 'From a buffer', 'promise')

  itShouldTransform(path.join(__dirname, '/samples/image_2.jpg'), 'image_2.jpg', 'callback')
  itShouldTransform(path.join(__dirname, '/samples/image_3.jpg'), 'image_3.jpg', 'callback')
  itShouldTransform(path.join(__dirname, '/samples/image_4.jpg'), 'image_4.jpg', 'callback')
  itShouldTransform(path.join(__dirname, '/samples/image_5.jpg'), 'image_5.jpg', 'callback')
  itShouldTransform(path.join(__dirname, '/samples/image_6.jpg'), 'image_6.jpg', 'callback')
  itShouldTransform(path.join(__dirname, '/samples/image_7.jpg'), 'image_7.jpg', 'callback')
  itShouldTransform(path.join(__dirname, '/samples/image_8.jpg'), 'image_8.jpg', 'callback')
  itShouldTransform(path.join(__dirname, '/samples/image_exif.jpg'), 'image_exif.jpg', 'callback')
  itShouldTransform(fs.readFileSync(path.join(__dirname, '/samples/image_8.jpg')), 'From a buffer', 'callback')

  itShouldTransform(path.join(__dirname, '/samples/image_2.jpg'), 'image_2.jpg', 'cli')
  itShouldTransform(path.join(__dirname, '/samples/image_3.jpg'), 'image_3.jpg', 'cli')
  itShouldTransform(path.join(__dirname, '/samples/image_4.jpg'), 'image_4.jpg', 'cli')
  itShouldTransform(path.join(__dirname, '/samples/image_5.jpg'), 'image_5.jpg', 'cli')
  itShouldTransform(path.join(__dirname, '/samples/image_6.jpg'), 'image_6.jpg', 'cli')
  itShouldTransform(path.join(__dirname, '/samples/image_7.jpg'), 'image_7.jpg', 'cli')
  itShouldTransform(path.join(__dirname, '/samples/image_8.jpg'), 'image_8.jpg', 'cli')
  itShouldTransform(path.join(__dirname, '/samples/image_exif.jpg'), 'image_exif.jpg', 'cli')
})

/**
 * Try to transform the given path/buffer, and checks data integrity (EXIF, dimensions)
 */
function itShouldTransform(originPathOrBuffer, label, mode) {
  it('Should rotate image (' + label + ') (' + mode + ')', function(done) {
    this.timeout(20000)
    const options = {quality: 82}
    if (mode === 'promise') {
      jo.rotate(originPathOrBuffer, options)
        .then(({buffer, orientation, dimensions, quality}) => {
          checkTransformation(done, originPathOrBuffer, buffer, orientation, dimensions, quality)
        })
        .catch((error) => {
          throw error
        })
    }
    if (mode === 'callback') {
      jo.rotate(originPathOrBuffer, options, function(error, buffer, orientation, dimensions, quality) {
        if (error) {
          throw error
        }
        checkTransformation(done, originPathOrBuffer, buffer, orientation, dimensions, quality)
      })
    }
    if (mode === 'cli') {
      transformWithCli(originPathOrBuffer, options.quality)
        .then(({buffer, orientation, dimensions, quality}) => {
          checkTransformation(done, originPathOrBuffer, buffer, orientation, dimensions, quality)
        })
        .catch((error) => {
          throw error
        })
    }
  })
}
