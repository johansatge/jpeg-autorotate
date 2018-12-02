'use strict'

const before = require('mocha').before
const describe = require('mocha').describe
const expect = require('chai').expect
const fs = require('fs-extra')
const it = require('mocha').it
const jo = require('../src/main.js')
const jpegjs = require('jpeg-js')
const path = require('path')
const piexif = require('piexifjs')
const pixelmatch = require('pixelmatch')
const PNG = require('pngjs').PNG

const tmp_path = path.join(__dirname, '.tmp')

require('chai').should()

describe('transformations', function() {
  before(function() {
    return fs.emptyDir(tmp_path)
  })
  itShouldTransform(path.join(__dirname, '/samples/image_2.jpg'), 'image_2.jpg')
  itShouldTransform(path.join(__dirname, '/samples/image_3.jpg'), 'image_3.jpg')
  itShouldTransform(path.join(__dirname, '/samples/image_4.jpg'), 'image_4.jpg')
  itShouldTransform(path.join(__dirname, '/samples/image_5.jpg'), 'image_5.jpg')
  itShouldTransform(path.join(__dirname, '/samples/image_6.jpg'), 'image_6.jpg')
  itShouldTransform(path.join(__dirname, '/samples/image_7.jpg'), 'image_7.jpg')
  itShouldTransform(path.join(__dirname, '/samples/image_8.jpg'), 'image_8.jpg')
  itShouldTransform(path.join(__dirname, '/samples/image_exif.jpg'), 'image_exif.jpg')
  itShouldTransform(fs.readFileSync(path.join(__dirname, '/samples/image_8.jpg')), 'From a buffer')
})

/**
 * Try to transform the given path/buffer, and checks data integrity (EXIF, dimensions)
 */
function itShouldTransform(path_or_buffer, label) {
  it('Should rotate image (' + label + ')', function(done) {
    this.timeout(20000)
    jo.rotate(path_or_buffer, {}, function(error, buffer, orientation, dimensions) {
      if (error) {
        throw error
      }
      const orig_buffer = typeof path_or_buffer === 'string' ? fs.readFileSync(path_or_buffer) : path_or_buffer
      const orig_exif = piexif.load(orig_buffer.toString('binary'))
      const orig_jpeg = jpegjs.decode(orig_buffer)
      compareDimensions(orig_jpeg, orientation, dimensions)
      compareExif(orig_exif, piexif.load(buffer.toString('binary')))
      if (typeof path_or_buffer === 'string') {
        comparePixels(path_or_buffer, buffer)
        fs.writeFileSync(path_or_buffer.replace('samples/', '.tmp/'), buffer)
      }
      done()
    })
  })
}

/**
 * Compare origin and destination pixels with pixelmatch, and save the diff on disk
 */
function comparePixels(path_or_buffer, buffer) {
  const target_buffer = fs.readFileSync(path_or_buffer.replace('.jpg', '_dest.jpg'))
  const target_jpeg = jpegjs.decode(target_buffer)
  const diff_png = new PNG({width: target_jpeg.width, height: target_jpeg.height})
  const diff_pixels = pixelmatch(
    jpegjs.decode(buffer).data,
    target_jpeg.data,
    diff_png.data,
    target_jpeg.width,
    target_jpeg.height,
    {
      threshold: 0.25,
    }
  )
  const diff_path = path.join(tmp_path, path.parse(path_or_buffer).base.replace('.jpg', '.diff.png'))
  diff_png.pack().pipe(fs.createWriteStream(diff_path))
  expect(diff_pixels).to.equal(0)
}

/**
 * Compare origin and destination dimensions
 * Depending on the original orientation, they may be switched
 */
function compareDimensions(orig_jpeg, orientation, dimensions) {
  if (orientation < 5 && (orig_jpeg.width !== dimensions.width || orig_jpeg.height !== dimensions.height)) {
    throw new Error('Dimensions do not match')
  }
  if (orientation >= 5 && (orig_jpeg.width !== dimensions.height || orig_jpeg.height !== dimensions.width)) {
    throw new Error('Dimensions do not match')
  }
}

/**
 * Compare EXIF arrays
 * The properties allowed to differ between origin and destination images are set to 0
 */
function compareExif(orig, dest) {
  orig['thumbnail'] = 0 // The thumbnail
  dest['thumbnail'] = 0
  orig['0th'][piexif.ImageIFD.Orientation] = 0 // Orientation
  dest['0th'][piexif.ImageIFD.Orientation] = 0
  orig['0th'][piexif.ImageIFD.ExifTag] = 0 // Pointer to the Exif IFD
  dest['0th'][piexif.ImageIFD.ExifTag] = 0
  orig['Exif'][piexif.ExifIFD.PixelXDimension] = 0 // Image width
  dest['Exif'][piexif.ExifIFD.PixelXDimension] = 0
  orig['Exif'][piexif.ExifIFD.PixelYDimension] = 0 // Image height
  dest['Exif'][piexif.ExifIFD.PixelYDimension] = 0
  orig['1st'][piexif.ImageIFD.JPEGInterchangeFormat] = 0 // Offset to the start byte of the thumbnail
  dest['1st'][piexif.ImageIFD.JPEGInterchangeFormat] = 0
  orig['1st'][piexif.ImageIFD.JPEGInterchangeFormatLength] = 0 // Number of bytes of the thumbnail
  dest['1st'][piexif.ImageIFD.JPEGInterchangeFormatLength] = 0

  if (JSON.stringify(orig) !== JSON.stringify(dest)) {
    throw new Error('EXIF do not match')
  }
}
