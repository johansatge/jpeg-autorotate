
'use strict'

var jpegjs = require('jpeg-js')

var m = {}

/**
 * Decodes the given buffer and applies the right transformation
 * Depending on the orientation, it may be a rotation and / or an horizontal flip
 * @param buffer
 * @param orientation
 * @param quality
 * @param module_callback
 */
m.do = function(buffer, orientation, quality, module_callback)
{
    try
    {
        var jpeg = jpegjs.decode(buffer)
    }
    catch(error)
    {
        module_callback(error, null, 0, 0)
        return
    }
    var new_buffer = jpeg.data

    var transformations = {
        2: {rotate: 0, flip: true},
        3: {rotate: 180, flip: false},
        4: {rotate: 180, flip: true},
        5: {rotate: 90, flip: true},
        6: {rotate: 90, flip: false},
        7: {rotate: 270, flip: true},
        8: {rotate: 270, flip: false},
    }

    if (transformations[orientation].rotate > 0)
    {
        new_buffer = _rotate(new_buffer, jpeg.width, jpeg.height, transformations[orientation].rotate)
    }
    if (transformations[orientation].flip)
    {
        new_buffer = _flip(new_buffer, jpeg.width, jpeg.height)
    }
    var width = orientation < 5 ? jpeg.width : jpeg.height
    var height = orientation < 5 ? jpeg.height : jpeg.width

    var new_jpeg = jpegjs.encode({data: new_buffer, width: width, height: height}, quality)
    module_callback(null, new_jpeg.data, width, height)
}

/**
 * Rotates a buffer (degrees must be a multiple of 90)
 * Inspired from Jimp (https://github.com/oliver-moran/jimp)
 * @param buffer
 * @param width
 * @param height
 * @param degrees
 */
var _rotate = function(buffer, width, height, degrees)
{
    var loops = degrees / 90
    while (loops > 0)
    {
        var new_buffer = new Buffer(buffer.length)
        var new_offset = 0
        for (var x = 0; x < width; x += 1)
        {
            for (var y = height - 1; y >= 0; y -= 1)
            {
                var offset = (width * y + x) << 2
                var pixel = buffer.readUInt32BE(offset, true)
                new_buffer.writeUInt32BE(pixel, new_offset, true)
                new_offset += 4
            }
        }
        buffer = new_buffer
        var new_height = width
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
var _flip = function(buffer, width, height)
{
    var new_buffer = new Buffer(buffer.length)
    for(var x = 0; x < width; x += 1)
    {
        for(var y = 0; y < height; y += 1)
        {
            var offset = (width * y + x) << 2
            var new_offset = (width * y + width - 1 - x) << 2
            var pixel = buffer.readUInt32BE(offset, true)
            new_buffer.writeUInt32BE(pixel, new_offset, true)
        }
    }
    return new_buffer
}

module.exports = m
