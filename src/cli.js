#!/usr/bin/env node

const yargsParser = require('yargs-parser')
const colors = require('colors')
const fsp = require('fs').promises
const glob = require('glob')
const jo = require('./main.js')
const manifest = require('../package.json')
const promisify = require('util').promisify

const argv = yargsParser(process.argv.slice(2), {
  boolean: ['version', 'help'],
  number: ['quality', 'jpegjsMaxResolutionInMP', 'jpegjsMaxMemoryUsageInMB'],
})

if (argv.version) {
  console.log(manifest.name + ' ' + manifest.version)
  process.exit(0)
}

if (argv.help || argv._.length === 0) {
  const help = [
    '',
    'Rotate JPEG images based on EXIF orientation',
    '',
    colors.underline('Usage'),
    'jpeg-autorotate <path>',
    '',
    colors.underline('Options'),
    '--quality=<1-100>                  JPEG output quality',
    '--jpegjsMaxResolutionInMP=<num>    jpeg-js maxResolutionInMP option',
    '--jpegjsMaxMemoryUsageInMB=<num>   jpeg-js maxMemoryUsageInMB option',
    '--version                          Output current version',
    '--help                             Output help',
    '',
  ]
  console.log(help.join('\n'))
  process.exit(0)
}

// eslint-disable-next-line no-extra-semi
;(async () => {
  const files = await Promise.all(argv._.map((arg) => promisify(glob)(arg))).then((files) => [].concat.apply([], files))
  for (const filePath of files) {
    const options = {
      quality: argv.quality,
      jpegjsMaxResolutionInMP: argv.jpegjsMaxResolutionInMP,
      jpegjsMaxMemoryUsageInMB: argv.jpegjsMaxMemoryUsageInMB,
    }
    try {
      const {buffer, orientation, quality, dimensions} = await jo.rotate(filePath, options)
      await fsp.writeFile(filePath, buffer)
      const readableDimensions = `${dimensions.width}x${dimensions.height}`
      const message = `Processed (Orientation: ${orientation}) (Quality: ${quality}%) (Dimensions: ${readableDimensions})`
      console.log(`${filePath}: ${colors.green(message)}`)
    } catch (error) {
      const isFatal = error.code !== jo.errors.correct_orientation
      console.log(`${filePath}: ${isFatal ? colors.red(error.message) : colors.yellow(error.message)}`)
    }
  }
})()
