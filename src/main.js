'use strict';

var fs = require('fs');
var async = require('async');
var piexif = require('piexifjs');
var lwip = require('lwip');
var CustomError = require('./error.js');

var m = {};

m.rotate = function(path, module_callback)
{

    var jpeg_buffer = null;
    var jpeg_exif_data = null;
    var jpeg_orientation = null;

    fs.readFile(path, _onReadFile);

    /**
     * Tries to read EXIF data when the image has been loaded
     * @param error
     * @param buffer
     */
    function _onReadFile(error, buffer)
    {
        if (error)
        {
            module_callback(new CustomError('read_file', 'Could not read file (' + error.message + ')'), null);
            return;
        }
        try
        {
            jpeg_buffer = buffer;
            jpeg_exif_data = piexif.load(jpeg_buffer.toString('binary'));
        }
        catch (error)
        {
            module_callback(new CustomError('read_exif', 'Could not read EXIF data (' + error.message + ')'), null);
            return;
        }

        _checkAndUpdateOrientation();
    }

    /**
     * Checks the orientation in the EXIF tags, and starts the update process if needed
     */
    function _checkAndUpdateOrientation()
    {
        if (typeof jpeg_exif_data['0th'] === 'undefined' || typeof jpeg_exif_data['0th'][piexif.ImageIFD.Orientation] === 'undefined')
        {
            module_callback(new CustomError('no_orientation', 'No orientation tag found in EXIF'), null);
            return;
        }
        jpeg_orientation = parseInt(jpeg_exif_data['0th'][piexif.ImageIFD.Orientation]);
        if (isNaN(jpeg_orientation) || jpeg_orientation < 1 || jpeg_orientation > 8)
        {
            module_callback(new CustomError('unknown_orientation', 'Unknown orientation (' + jpeg_orientation + ')'), null);
            return;
        }
        if (jpeg_orientation === 1)
        {
            module_callback(new CustomError('correct_orientation', 'Orientation already correct'), null);
            return;
        }

        async.parallel({image: _rotateImage, thumbnail: _rotateThumbnail}, _onRotatedImages);
    }

    /**
     * Tries to rotate the main image
     * @param callback
     */
    function _rotateImage(callback)
    {
        _rotateFromOrientation(jpeg_buffer, function(error, buffer)
        {
            callback(error, !error ? buffer : null);
        });
    }

    /**
     * Tries to rotate the thumbnail, if it exists
     * @param callback
     */
    function _rotateThumbnail(callback)
    {
        if (typeof jpeg_exif_data['thumbnail'] === 'undefined' || jpeg_exif_data['thumbnail'] === null)
        {
            callback(null, null);
            return;
        }
        _rotateFromOrientation(new Buffer(jpeg_exif_data['thumbnail'], 'binary'), function(error, buffer)
        {
            callback(null, !error ? buffer : null);
        });
    }

    /**
     * Opens an image buffer and applies the rotation
     * @param buffer
     * @param callback
     */
    function _rotateFromOrientation(buffer, callback)
    {
        lwip.open(buffer, 'jpg', function(error, image)
        {
            if (error)
            {
                callback(error, null);
                return;
            }
            var batch = image.batch();
            switch (jpeg_orientation)
            {
                case 2:
                    batch.flip('x');
                    break;
                case 3:
                    batch.rotate(180);
                    break;
                case 4:
                    batch.flip('y');
                    break;
                case 5:
                    batch.rotate(90).flip('x');
                    break;
                case 6:
                    batch.rotate(90);
                    break;
                case 7:
                    batch.rotate(270).flip('x');
                    break;
                case 8:
                    batch.rotate(270);
                    break;
            }
            batch.toBuffer('jpg', callback);
        });
    }

    /**
     * Updates EXIF data and writes, when the image and its thumbnail have been rotated
     * @param error
     * @param buffers
     */
    function _onRotatedImages(error, buffers)
    {
        if (error)
        {
            module_callback(new CustomError('rotate_file', 'Could not rotate image (' + error.message + ')', null));
            return;
        }

        if (jpeg_orientation !== 2 && jpeg_orientation !== 4)
        {
            var exif_width = typeof jpeg_exif_data['Exif'][piexif.ExifIFD.PixelXDimension] !== 'undefined' ? jpeg_exif_data['Exif'][piexif.ExifIFD.PixelXDimension] : false;
            var exif_height = typeof jpeg_exif_data['Exif'][piexif.ExifIFD.PixelYDimension] !== 'undefined' ? jpeg_exif_data['Exif'][piexif.ExifIFD.PixelYDimension] : false;
            if (exif_width !== false && exif_height !== false)
            {
                jpeg_exif_data['Exif'][piexif.ExifIFD.PixelXDimension] = exif_height;
                jpeg_exif_data['Exif'][piexif.ExifIFD.PixelYDimension] = exif_width;
            }
        }
        jpeg_exif_data['0th'][piexif.ImageIFD.Orientation] = 1;
        if (buffers.thumbnail !== null)
        {
            jpeg_exif_data['thumbnail'] = buffers.thumbnail.toString('binary');
        }
        var exif_bytes = piexif.dump(jpeg_exif_data);

        var updated_jpeg_buffer = new Buffer(piexif.insert(exif_bytes, buffers.image.toString('binary')), 'binary');
        fs.writeFile(path.replace(/\.jpg$/, '-output.jpg'), updated_jpeg_buffer, function(error)
        {
            module_callback(error ? new CustomError('write_file', 'Could not write file (' + error.message + ')') : null, !error ? jpeg_orientation : null);
        });
    }

};

module.exports = m;