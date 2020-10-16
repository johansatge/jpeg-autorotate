const CustomError = require('./customerror.js')
const rotateBuffer = require('./transform.js').rotateBuffer
const fsp = require('fs').promises
const piexif = require('piexifjs')

const m = {}
module.exports = m

m.errors = {
  read_file: 'read_file',
  read_exif: 'read_exif',
  no_orientation: 'no_orientation',
  unknown_orientation: 'unknown_orientation',
  correct_orientation: 'correct_orientation',
  rotate_file: 'rotate_file',
}

/**
 * Read the input, rotate the image, return the result (updated buffer, dimensions, etc)
 */
m.rotate = (pathOrBuffer, options, callback) => {
  const hasCallback = typeof callback === 'function'
  const quality = getNumberFromOptions(options, 'quality', 100, 100)
  const maxResolutionInMP = getNumberFromOptions(options, 'jpegjsMaxResolutionInMP', null, null)
  const maxMemoryUsageInMB = getNumberFromOptions(options, 'jpegjsMaxMemoryUsageInMB', null, null)
  const promise = rotateImageAndThumbnail(pathOrBuffer, quality, maxResolutionInMP, maxMemoryUsageInMB)
    .then(({updatedBuffer, orientation, updatedDimensions}) => {
      if (!hasCallback) {
        return {buffer: updatedBuffer, orientation, dimensions: updatedDimensions, quality}
      }
      callback(null, updatedBuffer, orientation, updatedDimensions, quality)
    })
    .catch((customError) => {
      const buffer = customError.buffer
      delete customError.buffer
      if (!hasCallback) {
        throw customError
      }
      callback(customError, buffer, null, null, null)
    })
  if (!hasCallback) {
    return promise
  }
}

async function rotateImageAndThumbnail(pathOrBuffer, quality, maxResolutionInMP, maxMemoryUsageInMB) {
  // Read input buffer & EXIF data
  const buffer = await readBuffer(pathOrBuffer)
  const exifData = await readExifFromBuffer(buffer)
  const orientation = parseOrientationTag({buffer, exifData})
  // Rotate image and thumbnail
  const [rotatedImage, rotatedThumbnail] = await Promise.all([
    rotateImage(buffer, orientation, quality, maxResolutionInMP, maxMemoryUsageInMB),
    rotateThumbnail(buffer, exifData, orientation, quality, maxResolutionInMP, maxMemoryUsageInMB),
  ])
  // Compute final buffer by updating the original EXIF data and linking it to the rotated buffer
  exifData['0th'][piexif.ImageIFD.Orientation] = 1
  if (typeof exifData['Exif'][piexif.ExifIFD.PixelXDimension] !== 'undefined') {
    exifData['Exif'][piexif.ExifIFD.PixelXDimension] = rotatedImage.width
  }
  if (typeof exifData['Exif'][piexif.ExifIFD.PixelYDimension] !== 'undefined') {
    exifData['Exif'][piexif.ExifIFD.PixelYDimension] = rotatedImage.height
  }
  if (rotatedThumbnail.buffer) {
    exifData['thumbnail'] = rotatedThumbnail.buffer.toString('binary')
  }
  const exifBytes = piexif.dump(exifData)
  return {
    updatedBuffer: Buffer.from(piexif.insert(exifBytes, rotatedImage.buffer.toString('binary')), 'binary'),
    orientation,
    updatedDimensions: {
      height: rotatedImage.height,
      width: rotatedImage.width,
    },
  }
}

function getNumberFromOptions(options, name, defaultValue, maxValue) {
  if (typeof options !== 'object' || options === null || typeof options[name] !== 'number') {
    return defaultValue
  }
  if (options[name] > 0 && (maxValue === null || options[name] <= maxValue)) {
    return options[name]
  }
  return defaultValue
}

/**
 * Transform the given input to a buffer
 * (May be a string or a buffer)
 */
async function readBuffer(pathOrBuffer) {
  if (typeof pathOrBuffer === 'string') {
    try {
      return await fsp.readFile(pathOrBuffer)
    } catch (error) {
      throw new CustomError(m.errors.read_file, `Could not read file (${error.message})`)
    }
  }
  if (typeof pathOrBuffer === 'object' && Buffer.isBuffer(pathOrBuffer)) {
    return pathOrBuffer
  }
  throw new CustomError(m.errors.read_file, 'Not a file path or buffer')
}

async function readExifFromBuffer(buffer) {
  try {
    return await piexif.load(buffer.toString('binary'))
  } catch (error) {
    throw new CustomError(m.errors.read_exif, `Could not read EXIF data (${error})`)
  }
}

/**
 * Extract the orientation tag from the given EXIF data
 */
function parseOrientationTag({buffer, exifData}) {
  let orientation = null
  if (exifData['0th'] && exifData['0th'][piexif.ImageIFD.Orientation]) {
    orientation = parseInt(exifData['0th'][piexif.ImageIFD.Orientation])
  }
  if (orientation === null) {
    throw new CustomError(m.errors.no_orientation, 'No orientation tag found in EXIF', buffer)
  }
  if (isNaN(orientation) || orientation < 1 || orientation > 8) {
    throw new CustomError(m.errors.unknown_orientation, `Unknown orientation (${orientation})`, buffer)
  }
  if (orientation === 1) {
    throw new CustomError(m.errors.correct_orientation, 'Orientation already correct', buffer)
  }
  return orientation
}

async function rotateImage(buffer, orientation, quality, maxResolutionInMP, maxMemoryUsageInMB) {
  try {
    return await rotateBuffer(buffer, orientation, quality, maxResolutionInMP, maxMemoryUsageInMB)
  } catch (error) {
    throw new CustomError(m.errors.rotate_file, `Could not rotate image (${error.message})`, buffer)
  }
}

async function rotateThumbnail(buffer, exifData, orientation, quality, maxResolutionInMP, maxMemoryUsageInMB) {
  if (typeof exifData['thumbnail'] === 'undefined' || exifData['thumbnail'] === null) {
    return {}
  }
  try {
    const thumbBuffer = Buffer.from(exifData['thumbnail'], 'binary')
    const rotatedBuffer = await rotateBuffer(thumbBuffer, orientation, quality, maxResolutionInMP, maxMemoryUsageInMB)
    return rotatedBuffer
  } catch (error) {
    throw new CustomError(m.errors.rotate_file, `Could not rotate thumbnail (${error.message})`, buffer)
  }
}
