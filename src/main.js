
'use strict'

var fs = require('fs')
var async = require('async')
var piexif = require('piexifjs')
var CustomError = require('./error.js')
var transform = require('./transform.js')

var m = {}

m.errors = {}
m.errors.read_file = 'read_file'
m.errors.read_exif = 'read_exif'
m.errors.no_orientation = 'no_orientation'
m.errors.unknown_orientation = 'unknown_orientation'
m.errors.correct_orientation = 'correct_orientation'
m.errors.rotate_file = 'rotate_file'

m.rotate = function(path_or_buffer, options, module_callback)
{
    var quality = typeof options === 'object' && typeof options.quality !== 'undefined' ? parseInt(options.quality) : 100
    quality = !isNaN(quality) && quality >= 0 && quality <= 100 ? quality : 100
    module_callback = typeof module_callback === 'function' ? module_callback : function(){}

    var jpeg_buffer = null
    var jpeg_exif_data = null
    var jpeg_orientation = null

    if (typeof path_or_buffer === 'string')
    {
        fs.readFile(path_or_buffer, _onReadFile)
    }
    else if (typeof path_or_buffer === 'object' && Buffer.isBuffer(path_or_buffer))
    {
        _onReadFile(null, path_or_buffer)
    }
    else
    {
        _onReadFile(new Error('Not a file path or buffer'), null)
    }

    /**
     * Tries to read EXIF data when the image has been loaded
     * @param error
     * @param buffer
     */
    function _onReadFile(error, buffer)
    {
        if (error)
        {
            module_callback(new CustomError(m.errors.read_file, 'Could not read file (' + error.message + ')'), null, null, null)
            return
        }
        try
        {
            jpeg_buffer = buffer
            jpeg_exif_data = piexif.load(jpeg_buffer.toString('binary'))
        }
        catch (error)
        {
            module_callback(new CustomError(m.errors.read_exif, 'Could not read EXIF data (' + error.message + ')'), null, null, null)
            return
        }
        if (typeof jpeg_exif_data['0th'] === 'undefined' || typeof jpeg_exif_data['0th'][piexif.ImageIFD.Orientation] === 'undefined')
        {
            module_callback(new CustomError(m.errors.no_orientation, 'No orientation tag found in EXIF'), buffer, null, null)
            return
        }
        jpeg_orientation = parseInt(jpeg_exif_data['0th'][piexif.ImageIFD.Orientation])
        if (isNaN(jpeg_orientation) || jpeg_orientation < 1 || jpeg_orientation > 8)
        {
            module_callback(new CustomError(m.errors.unknown_orientation, 'Unknown orientation (' + jpeg_orientation + ')'), buffer, null, null)
            return
        }
        if (jpeg_orientation === 1)
        {
            module_callback(new CustomError(m.errors.correct_orientation, 'Orientation already correct'), buffer, null, null)
            return
        }
        async.parallel({image: _rotateImage, thumbnail: _rotateThumbnail}, _onRotatedImages)
    }

    /**
     * Tries to rotate the main image
     * @param callback
     */
    function _rotateImage(callback)
    {
        transform.do(jpeg_buffer, jpeg_orientation, quality, function(error, buffer, width, height)
        {
            callback(error, {buffer: !error ? buffer : null, width: width, height: height})
        })
    }

    /**
     * Tries to rotate the thumbnail, if it exists
     * @param callback
     */
    function _rotateThumbnail(callback)
    {
        if (typeof jpeg_exif_data['thumbnail'] === 'undefined' || jpeg_exif_data['thumbnail'] === null)
        {
            callback(null, {buffer: null, width: 0, height: 0})
            return
        }
        transform.do(new Buffer(jpeg_exif_data['thumbnail'], 'binary'), jpeg_orientation, quality, function(error, buffer, width, height)
        {
            callback(null, {buffer: !error ? buffer : null, width: width, height: height})
        })
    }

    /**
     * Merges EXIF data in the rotated buffer and returns
     * @param error
     * @param buffers
     */
    function _onRotatedImages(error, images)
    {
        if (error)
        {
            module_callback(new CustomError(m.errors.rotate_file, 'Could not rotate image (' + error.message + ')'), null, null, null)
            return
        }
        jpeg_exif_data['0th'][piexif.ImageIFD.Orientation] = 1
        if (typeof jpeg_exif_data['Exif'][piexif.ExifIFD.PixelXDimension] !== 'undefined')
        {
            jpeg_exif_data['Exif'][piexif.ExifIFD.PixelXDimension] = images.image.width
        }
        if (typeof jpeg_exif_data['Exif'][piexif.ExifIFD.PixelYDimension] !== 'undefined')
        {
            jpeg_exif_data['Exif'][piexif.ExifIFD.PixelYDimension] = images.image.height
        }
        if (images.thumbnail.buffer !== null)
        {
            jpeg_exif_data['thumbnail'] = images.thumbnail.buffer.toString('binary')
        }
        var exif_bytes = piexif.dump(jpeg_exif_data)
        var updated_jpeg_buffer = new Buffer(piexif.insert(exif_bytes, images.image.buffer.toString('binary')), 'binary')
        var updated_jpeg_dimensions = {
            height: images.image.height,
            width: images.image.width
        }
        module_callback(null, updated_jpeg_buffer, jpeg_orientation, updated_jpeg_dimensions)
    }

}

module.exports = m
