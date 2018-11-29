'use strict'

const jpegjs = require('jpeg-js')

const m = {}

/**
 * Decodes the given buffer and applies the right transformation
 * Depending on the orientation, it may be a rotation and / or an horizontal flip
 * @param buffer
 * @param orientation
 * @param quality
 * @param module_callback
 */
m.do = function(buffer, orientation, quality, module_callback) {
  let jpeg = null
  try {
    jpeg = jpegjs.decode(buffer)
  } catch (error) {
    module_callback(error, null, 0, 0)
    return
  }
  let new_buffer = jpeg.data

  const transformations = {
    2: {rotate: 0, flip: true},
    3: {rotate: 180, flip: false},
    4: {rotate: 180, flip: true},
    5: {rotate: 90, flip: true},
    6: {rotate: 90, flip: false},
    7: {rotate: 270, flip: true},
    8: {rotate: 270, flip: false},
  }

  if (transformations[orientation].rotate > 0) {
    new_buffer = _rotate(new_buffer, jpeg.width, jpeg.height, transformations[orientation].rotate)
  }

  const ratioWillChange = (transformations[orientation].rotate / 90) % 2 === 1
  const destWidth = ratioWillChange ? jpeg.height : jpeg.width
  const destHeight = ratioWillChange ? jpeg.width : jpeg.height

  if (transformations[orientation].flip) {
    new_buffer = _flip(new_buffer, destWidth, destHeight)
  }

  const new_jpeg = jpegjs.encode({data: new_buffer, width: destWidth, height: destHeight}, quality)
  module_callback(null, new_jpeg.data, destWidth, destHeight)
}

/**
 * Rotates a buffer (degrees must be a multiple of 90)
 * Inspired from Jimp (https://github.com/oliver-moran/jimp)
 * @param buffer
 * @param width
 * @param height
 * @param degrees
 */
const _rotate = function(buffer, width, height, degrees) {
  let loops = degrees / 90
  while (loops > 0) {
    const new_buffer = Buffer.alloc(buffer.length)
    let new_offset = 0
    for (let x = 0; x < width; x += 1) {
      for (let y = height - 1; y >= 0; y -= 1) {
        const offset = (width * y + x) << 2
        const pixel = buffer.readUInt32BE(offset, true)
        new_buffer.writeUInt32BE(pixel, new_offset, true)
        new_offset += 4
      }
    }
    buffer = new_buffer
    const new_height = width
    width = height
    height = new_height
    loops -= 1
  }
  return buffer
}

/**
 * Flips a buffer horizontally
 * @param buffer
 * @param width
 * @param height
 */
const _flip = function(buffer, width, height) {
  const new_buffer = Buffer.alloc(buffer.length)
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const offset = (width * y + x) << 2
      const new_offset = (width * y + width - 1 - x) << 2
      const pixel = buffer.readUInt32BE(offset, true)
      new_buffer.writeUInt32BE(pixel, new_offset, true)
    }
  }
  return new_buffer
}

module.exports = m
