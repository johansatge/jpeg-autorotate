![Version](https://img.shields.io/npm/v/jpeg-autorotate.svg)
![Downloads](https://img.shields.io/npm/dm/jpeg-autorotate.svg)
![Last commit](https://badgen.net/github/last-commit/johansatge/jpeg-autorotate)
[![Build Status](https://travis-ci.org/johansatge/jpeg-autorotate.svg?branch=master)](https://travis-ci.org/johansatge/jpeg-autorotate)
![Coverage](https://badgen.net/codecov/c/github/johansatge/jpeg-autorotate)
[![Install size](https://badgen.net/packagephobia/install/jpeg-autorotate)](https://packagephobia.com/result?p=jpeg-autorotate)

![Icon](icon.png)

> A node module to rotate JPEG images based on EXIF orientation.

---

* [What does it do](#what-does-it-do)
* [Installation](#installation)
* [Usage](#usage)
  * [Options](#options)
  * [CLI](#cli)
  * [Node module](#node-module)
    * [Sample usage](#sample-usage)
    * [Error handling](#error-handling)
* [Troubleshooting](#troubleshooting)
  * [Thumbnail too large](#thumbnail-too-large)
* [Changelog](#changelog)
* [License](#license)
* [Credits](#credits)

## What does it do

This module applies the right orientation to a JPEG image, based on its EXIF tag. More precisely, it:

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
>
> * [EXIF Orientation Handling Is a Ghetto](http://www.daveperrett.com/articles/2012/07/28/exif-orientation-handling-is-a-ghetto/)
> * [Standard EXIF Tags](http://www.exiv2.org/tags.html)

## Installation

_This module needs Node `>=10`._

Install with [npm](https://www.npmjs.com/):

```bash
$ npm install jpeg-autorotate --global
# --global isn't required if you plan to use the node module
```

## Usage

### Options

| Option | Default value | Description |
| --- | --- | --- |
| `quality` | `100` | Quality of the JPEG. Uncompressed by default, so the resulting image may be bigger than the original one. |
| `jpegjsMaxResolutionInMP` | `jpeg-js` default | `maxResolutionInMP` option in `jpeg-js` ([doc](https://github.com/eugeneware/jpeg-js#decode-options)) |
| `jpegjsMaxMemoryUsageInMB` | `jpeg-js` default | `maxMemoryUsageInMB` option in `jpeg-js` ([doc](https://github.com/eugeneware/jpeg-js#decode-options)) |

### CLI

Rotate a single image:

```bash
$ jpeg-autorotate /Users/johan/IMG_1234.jpg
```

Rotate a set of images:

```bash
$ jpeg-autorotate /Users/johan/images/IMG_*.jpg
```

Glob support:

```bash
$ jpeg-autorotate "/Users/johan/images/IMG_*.{jpg,jpeg,JPG,JPEG}"
```

Passing options:

```
$ jpeg-autorotate /Users/johan/IMG_1234.jpg --quality=85 --jpegjsMaxResolutionInMP=1234
```

### Node module

The Node module will load the image, apply the rotation, and return the binary data as a [Buffer](https://nodejs.org/api/buffer.html), allowing you to:

* Save it on disk
* Load it in an image processing module (like [jimp](https://github.com/oliver-moran/jimp), [lwip](https://github.com/EyalAr/lwip), [gm](https://github.com/aheckmann/gm)...)
* ...

#### Sample usage

```js
const jo = require('jpeg-autorotate')
const options = {
  quality: 8,
  jpegjsMaxResolutionInMP: 1234,
}
const path = '/Users/johan/IMG_1234.jpg' // You can use a Buffer too

//
// With a callback:
//
jo.rotate(path, options, (error, buffer, orientation, dimensions, quality) => {
  if (error) {
    console.log('An error occurred when rotating the file: ' + error.message)
    return
  }
  console.log(`Orientation was ${orientation}`)
  console.log(`Dimensions after rotation: ${dimensions.width}x${dimensions.height}`)
  console.log(`Quality: ${quality}`)
  // ...Do whatever you need with the resulting buffer...
})

//
// With a Promise:
//
jo.rotate(path, options)
  .then(({buffer, orientation, dimensions, quality}) => {
    console.log(`Orientation was ${orientation}`)
    console.log(`Dimensions after rotation: ${dimensions.width}x${dimensions.height}`)
    console.log(`Quality: ${quality}`)
    // ...Do whatever you need with the resulting buffer...
  })
  .catch((error) => {
    console.log('An error occurred when rotating the file: ' + error.message)
  })
```

#### Error handling

The `error` object returned by the module contains a readable `message`, but also a `code` for better error handling. Available codes are the following:

```js
const jo = require('jpeg-autorotate')

jo.errors.read_file // File could not be opened
jo.errors.read_exif // EXIF data could not be read
jo.errors.no_orientation // No orientation tag was found
jo.errors.unknown_orientation // The orientation tag is unknown
jo.errors.correct_orientation // The image orientation is already correct
jo.errors.rotate_file // An error occurred when rotating the image
```

Example:

```js
const jo = require('jpeg-autorotate')
jo.rotate('/image.jpg')
  .catch((error) => {
    if (error.code === jo.errors.correct_orientation) {
      console.log('The orientation of this image is already correct!')
    }
  })
```

## Troubleshooting

### Thumbnail too large

The [piexifjs](https://github.com/hMatoba/piexifjs/) module has a [64kb limit](https://github.com/hMatoba/piexifjs/blob/7b9140ab8ebb8ff620bb20f6319a337dd150092b/piexif.js#L236-L243) when reading thumbnails.
If you get the _Given thumbnail is too large_ error, you can try to remove the thumbnail from the image before rotating it:

```js
import piexif from 'piexifjs'

function deleteThumbnailFromExif(imageBuffer) {
  const imageString = imageBuffer.toString('binary')
  const exifObj = piexif.load(imageString)
  delete exifObj['thumbnail']
  delete exifObj['1st']
  const exifBytes = piexif.dump(exifObj)
  return Buffer.from(piexif.insert(exifBytes, imageString), 'binary')
}
```

## Changelog

This project uses [semver](http://semver.org/).

| Version | Date | Notes |
| --- | --- | --- |
| `7.1.1` | 2020-10-11 | Introduce code coverage<br>Fix an error if `options` are not passed |
| `7.1.0` | 2020-10-10 | Introduce `jpegjsMaxResolutionInMP` & `jpegjsMaxMemoryUsageInMB` options (#26) |
| `7.0.0` | 2020-09-19 | Don't publish test and linting files on NPM |
| `6.0.0` | 2020-05-30 | Dependencies update<br>Drop support for Node < 10<br>From `jpeg-js` update: _images larger than 100 megapixels or requiring more than 512MB of memory to decode will throw_ |
| `5.0.3` | 2019-12-24 | Fix multiple file support in CLI<br>Dependencies update |
| `5.0.2` | 2019-09-28 | Dependencies update |
| `5.0.1` | 2019-06-08 | Fix CLI support |
| `5.0.0` | 2019-03-03 | Drop `--jobs` CLI option<br>Drop support for Node 6 & 7<br>Introduce new `quality` property in the `jo.rotate` callback<br>Public API now supports both callbacks and Promises<br>Update documentation accordingly<br>Update dependencies |
| `4.0.1` | 2018-11-29 | Fix rotations `5` and `7` (issue #11) |
| `4.0.0` | 2018-07-15 | Drop support for Node 4 & 5<br>Unpublish lockfile<br>Use prettier for code formatting<br>Update documentation<br>Update dependencies |
| `3.1.0` | 2017-12-03 | Output dimensions after rotation |
| `3.0.1` | 2017-07-30 | Node 8 support<br>Update dependencies |
| `3.0.0` | 2017-02-11 | CLI supports `glob`<br>No more `node 0.12` support<br>Drop semicolons<br>Add eslint rules |
| `2.0.0` | 2016-06-03 | Supports buffers in entry<br>Returns a buffer even if there was an error<br>Improves tests |
| `1.1.0` | 2016-04-23 | Adds test suite, removes lwip dependency |
| `1.0.3` | 2016-03-29 | Displays help when no path given in CLI |
| `1.0.2` | 2016-03-21 | Adds missing options in CLI help |
| `1.0.1` | 2016-03-21 | Fixes NPM publishing fail ^\_^ |
| `1.0.0` | 2016-03-21 | Initial version |

## License

This project is released under the [MIT License](license.md).

## Credits

* [piexifjs](https://github.com/hMatoba/piexifjs)
* [jpeg-js](https://github.com/eugeneware/jpeg-js)
* [exif-orientation-examples](https://github.com/recurser/exif-orientation-examples)
* [colors](https://github.com/Marak/colors.js)
* [yargs](https://github.com/bcoe/yargs)
* [FontAwesome](http://fontawesome.io/)
* [Chai](http://chaijs.com/)
* [Mocha](http://mochajs.org)
* [eslint](http://eslint.org)
* [glob](https://github.com/isaacs/node-glob)
* [prettier](https://prettier.io/)
