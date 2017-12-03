![Version](https://img.shields.io/npm/v/jpeg-autorotate.svg)
[![Build Status](https://travis-ci.org/johansatge/jpeg-autorotate.svg?branch=master)](https://travis-ci.org/johansatge/jpeg-autorotate)
![Downloads](https://img.shields.io/npm/dm/jpeg-autorotate.svg)
![Dependencies](https://img.shields.io/david/johansatge/jpeg-autorotate.svg)
![devDependencies](https://img.shields.io/david/dev/johansatge/jpeg-autorotate.svg)

![Icon](icon.png)

> Rotates JPEG images based on EXIF orientation.

---

* [What does it do](#what-does-it-do)
* [Installation](#installation)
* [Usage](#usage)
    * [CLI](#cli)
    * [Node module](#node-module)
        * [Sample usage](#sample-usage)
        * [Error handling](#error-handling)
    * [Options](#options)
* [Changelog](#changelog)
* [License](#license)
* [Credits](#credits)

## What does it do

This tool applies the right orientation to a JPEG image, based on its EXIF tag. More precisely, it:

* Rotates the pixels
* Rotates the thumbnail, if there is one
* Writes `1` in the `Orientation` EXIF tag (this is the default orientation)
* Updates the `PixelXDimension` and `PixelYDimension` EXIF values
* Does **not** alter the other EXIF tags

It may be useful, if:

* You need to compress your image with a tool that strips EXIF data without rotating the pixels (like the great [ImageOptim](https://imageoptim.com/))
* You need to upload the image, but the destination application does not support EXIF orientation (like [WordPress](https://wordpress.org/))
* You just want to get rid of the orientation tag, while leaving the other tags **intact**

> More information about EXIF:
> * [EXIF Orientation Handling Is a Ghetto](http://www.daveperrett.com/articles/2012/07/28/exif-orientation-handling-is-a-ghetto/)
> * [Standard EXIF Tags](http://www.exiv2.org/tags.html)

## Installation

Install with [npm](https://www.npmjs.com/):

```bash
$ npm install jpeg-autorotate --global
# --global isn't required if you plan to use the node module
```

## Usage

### CLI

```bash
# Rotates a single image
$ jpeg-autorotate /Users/johan/IMG_1234.jpg
# Rotates a set of images
$ jpeg-autorotate /Users/johan/images/IMG_*.jpg
# Glob support
$ jpeg-autorotate "/Users/johan/images/IMG_*.{jpg,jpeg,JPG,JPEG}"
```

### Node module

The tool is available as a Node module. It will load the image, apply the rotation, and return the binary data as a [Buffer](https://nodejs.org/api/buffer.html), allowing you to:

* Save it on disk
* Load it in an image processing module (like [jimp](https://github.com/oliver-moran/jimp), [lwip](https://github.com/EyalAr/lwip), [gm](https://github.com/aheckmann/gm)...)
* ...

#### Sample usage

```javascript
var jo = require('jpeg-autorotate');
var options = {quality: 85};
var path = '/Users/johan/IMG_1234.jpg'; // You can use a Buffer, too
jo.rotate(path, options, function(error, buffer, orientation, dimensions)
{
    if (error)
    {
        console.log('An error occurred when rotating the file: ' + error.message);
        return;
    }
    console.log('Orientation was: ' + orientation);
    console.log('Height after rotation: ' + dimensions.height);
    console.log('Width after rotation: ' + dimensions.width);
    // ...
    // Do whatever you need with the resulting buffer
    // ...
});
```

#### Error handling

The `error` object returned in the callback contains a readable `message`, but also a `code` for better error handling. Available codes are the following:

```javascript
var jo = require('jpeg-autorotate');

jo.errors.read_file; // File could not be opened
jo.errors.read_exif; // EXIF data could not be read
jo.errors.no_orientation; // No orientation tag was found
jo.errors.unknown_orientation; // The orientation tag is unknown
jo.errors.correct_orientation; // The image orientation is already correct
jo.errors.rotate_file; // An error occurred when rotating the image
```

Sample usage:

```javascript
var jo = require('jpeg-autorotate');
jo.rotate('/image.jpg', function(error, buffer, orientation)
{
    if (error && error.code === jo.errors.correct_orientation)
    {
        console.log('The orientation of this image is already correct!');
    }
});
```

### Options

The following options are available.

| Option | Context | Default value | Description
| --- | --- | --- | --- |
| `quality` | *CLI, module* | 100 | Quality of the JPEG - Uncompressed by default, so the resulting image may be bigger than the original one |
| `jobs` | *CLI* | 10 | Max number of concurrent processes, when loading several images

To use options with the CLI:

```
$ jpeg-autorotate /image.jpg --jobs=100 --quality=85
```

## Changelog

This project uses [semver](http://semver.org/).

| Version | Date | Notes |
| --- | --- | --- |
| `3.1.0` | 2017-12-03 | Output dimensions after rotation (@tayler) |
| `3.0.1` | 2017-07-30 | Node 8 support<br>Update dependencies |
| `3.0.0` | 2017-02-11 | CLI supports `glob`<br>No more `node 0.12` support<br>Drop semicolons<br>Add eslint rules |
| `2.0.0` | 2016-06-03 | Supports buffers in entry<br>Returns a buffer even if there was an error<br>Improves tests |
| `1.1.0` | 2016-04-23 | Adds test suite, removes lwip dependency |
| `1.0.3` | 2016-03-29 | Displays help when no path given in CLI |
| `1.0.2` | 2016-03-21 | Adds missing options in CLI help |
| `1.0.1` | 2016-03-21 | Fixes NPM publishing fail ^_^ |
| `1.0.0` | 2016-03-21 | Initial version |

## License

This project is released under the [MIT License](license.md).

## Credits

* [piexifjs](https://github.com/hMatoba/piexifjs)
* [jpeg-js](https://github.com/eugeneware/jpeg-js)
* [exif-orientation-examples](https://github.com/recurser/exif-orientation-examples)
* [async](https://github.com/caolan/async)
* [colors](https://github.com/Marak/colors.js)
* [yargs](https://github.com/bcoe/yargs)
* [FontAwesome](http://fontawesome.io/)
* [Chai](http://chaijs.com/)
* [Mocha](http://mochajs.org)
* [eslint](http://eslint.org)
* [glob](https://github.com/isaacs/node-glob)
