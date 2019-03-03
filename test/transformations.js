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

const tmpPath = path.join(__dirname, '.tmp')

require('chai').should()

describe('transformations', function() {
  before(function() {
    return fs.emptyDir(tmpPath)
  })
  const isPromisedBased = [true, false]
  isPromisedBased.forEach((value) => {
    itShouldTransform(path.join(__dirname, '/samples/image_2.jpg'), 'image_2.jpg', value)
    itShouldTransform(path.join(__dirname, '/samples/image_2.jpg'), 'image_2.jpg', value)
    itShouldTransform(path.join(__dirname, '/samples/image_3.jpg'), 'image_3.jpg', value)
    itShouldTransform(path.join(__dirname, '/samples/image_4.jpg'), 'image_4.jpg', value)
    itShouldTransform(path.join(__dirname, '/samples/image_5.jpg'), 'image_5.jpg', value)
    itShouldTransform(path.join(__dirname, '/samples/image_6.jpg'), 'image_6.jpg', value)
    itShouldTransform(path.join(__dirname, '/samples/image_7.jpg'), 'image_7.jpg', value)
    itShouldTransform(path.join(__dirname, '/samples/image_8.jpg'), 'image_8.jpg', value)
    itShouldTransform(path.join(__dirname, '/samples/image_exif.jpg'), 'image_exif.jpg', value)
    itShouldTransform(fs.readFileSync(path.join(__dirname, '/samples/image_8.jpg')), 'From a buffer', value)
  })
})

/**
 * Try to transform the given path/buffer, and checks data integrity (EXIF, dimensions)
 */
function itShouldTransform(pathOrBuffer, label, isPromisedBased) {
  it('Should rotate image (' + label + ') (' + (isPromisedBased ? 'Promise' : 'Callback') + '-based)', function(done) {
    this.timeout(20000)
    const options = {quality: 82}
    if (isPromisedBased) {
      jo.rotate(pathOrBuffer, options).then(({buffer, orientation, dimensions, quality}) => {
        checkTransformation(done, pathOrBuffer, null, buffer, orientation, dimensions, quality)
      })
    } else {
      jo.rotate(pathOrBuffer, options, function(error, buffer, orientation, dimensions, quality) {
        checkTransformation(done, pathOrBuffer, error, buffer, orientation, dimensions, quality)
      })
    }
  })
}

function checkTransformation(done, pathOrBuffer, error, buffer, orientation, dimensions, quality) {
  if (error) {
    throw error
  }
  const origBuffer = typeof pathOrBuffer === 'string' ? fs.readFileSync(pathOrBuffer) : pathOrBuffer
  const origExif = piexif.load(origBuffer.toString('binary'))
  const origJpeg = jpegjs.decode(origBuffer)
  compareDimensions(origJpeg, orientation, dimensions)
  compareExif(origExif, piexif.load(buffer.toString('binary')))
  if (typeof pathOrBuffer === 'string') {
    comparePixels(pathOrBuffer, buffer)
    fs.writeFileSync(pathOrBuffer.replace('samples/', '.tmp/'), buffer)
  }
  expect(quality).to.equal(82)
  done()
}

/**
 * Compare origin and destination pixels with pixelmatch, and save the diff on disk
 */
function comparePixels(pathOrBuffer, buffer) {
  const targetBuffer = fs.readFileSync(pathOrBuffer.replace('.jpg', '_dest.jpg'))
  const targetJpeg = jpegjs.decode(targetBuffer)
  const diffPng = new PNG({width: targetJpeg.width, height: targetJpeg.height})
  const diffPixels = pixelmatch(
    jpegjs.decode(buffer).data,
    targetJpeg.data,
    diffPng.data,
    targetJpeg.width,
    targetJpeg.height,
    {
      threshold: 0.25,
    }
  )
  const diffPath = path.join(tmpPath, path.parse(pathOrBuffer).base.replace('.jpg', '.diff.png'))
  diffPng.pack().pipe(fs.createWriteStream(diffPath))
  expect(diffPixels).to.equal(0)
}

/**
 * Compare origin and destination dimensions
 * Depending on the original orientation, they may be switched
 */
function compareDimensions(origJpeg, orientation, dimensions) {
  if (orientation < 5 && (origJpeg.width !== dimensions.width || origJpeg.height !== dimensions.height)) {
    throw new Error('Dimensions do not match')
  }
  if (orientation >= 5 && (origJpeg.width !== dimensions.height || origJpeg.height !== dimensions.width)) {
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
