const exec = require('child_process').exec
const expect = require('chai').expect
const fs = require('fs-extra')
const jpegjs = require('jpeg-js')
const path = require('path')
const piexif = require('piexifjs')
const pixelmatch = require('pixelmatch')
const PNG = require('pngjs').PNG

module.exports = {
  checkTransformation,
  transformWithCli,
}

function checkTransformation(done, originPathOrBuffer, transformedBuffer, orientation, dimensions, quality) {
  const origBuffer = typeof originPathOrBuffer === 'string' ? fs.readFileSync(originPathOrBuffer) : originPathOrBuffer
  const origExif = piexif.load(origBuffer.toString('binary'))
  const origJpeg = jpegjs.decode(origBuffer)
  compareDimensions(origJpeg, orientation, dimensions)
  compareExif(origExif, piexif.load(transformedBuffer.toString('binary')))
  if (typeof originPathOrBuffer === 'string') {
    comparePixels(originPathOrBuffer, transformedBuffer)
    fs.writeFileSync(originPathOrBuffer.replace('samples/', '.tmp/'), transformedBuffer)
  }
  expect(quality).to.equal(82)
  done()
}

/**
 * Compare origin and destination pixels with pixelmatch, and save the diff on disk
 */
function comparePixels(originPathOrBuffer, transformedBuffer) {
  const targetBuffer = fs.readFileSync(originPathOrBuffer.replace('.jpg', '_dest.jpg'))
  const targetJpeg = jpegjs.decode(targetBuffer)
  const diffPng = new PNG({width: targetJpeg.width, height: targetJpeg.height})
  const diffPixels = pixelmatch(
    jpegjs.decode(transformedBuffer).data,
    targetJpeg.data,
    diffPng.data,
    targetJpeg.width,
    targetJpeg.height,
    {
      threshold: 0.25,
    }
  )
  const diffPath = path.join(
    path.join(__dirname, '.tmp'),
    path.parse(originPathOrBuffer).base.replace('.jpg', '.diff.png')
  )
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

function transformWithCli(originPathOrBuffer, quality) {
  return new Promise((resolve, reject) => {
    const destPath = originPathOrBuffer.replace('.jpg', '_cli.jpg')
    const command = ['cp ' + originPathOrBuffer + ' ' + destPath, './src/cli.js ' + destPath + ' --quality=' + quality]
    exec(command.join(' && '), function(error, stdout) {
      if (error) {
        return reject(error)
      }
      const output = stdout.match(
        /Processed \(Orientation: ([0-9]{1})\) \(Quality: ([0-9]+)%\) \(Dimensions: ([0-9]+)x([0-9]+)\)/
      )
      fs.readFile(destPath)
        .then((buffer) => {
          return fs.remove(destPath).then(() => {
            resolve({
              buffer,
              orientation: parseInt(output[1]),
              quality: parseInt(output[2]),
              dimensions: {width: parseInt(output[3]), height: parseInt(output[4])},
            })
          })
        })
        .catch(reject)
    })
  })
}
