#!/usr/bin/env node

const argv = require('yargs').argv
const colors = require('colors')
const fs = require('fs')
const glob = require('glob')
const jo = require('./main.js')
const manifest = require('../package.json')
const promisify = require('util').promisify

if (argv.version) {
  console.log(manifest.name + ' ' + manifest.version)
  process.exit(0)
}

if (argv.help || typeof argv._ === 'undefined' || argv._.length === 0) {
  const help = [
    '',
    'Rotate JPEG images based on EXIF orientation',
    '',
    colors.underline('Usage'),
    'jpeg-autorotate <path>',
    '',
    colors.underline('Options'),
    '--quality=<0-100>   JPEG output quality',
    '--version           Output current version',
    '--help              Output help',
    '',
  ]
  console.log(help.join('\n'))
  process.exit(0)
}

listFiles()
  .then(processFiles)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.log(error.message)
    process.exit(1)
  })

function listFiles() {
  return Promise.all(argv._.map((arg) => promisify(glob)(arg, {}))).then((files) => {
    return [].concat.apply([], files)
  })
}

function processFiles(files, index = 0) {
  if (index + 1 > files.length) {
    return Promise.resolve()
  }
  return processFile(files[index])
    .then((buffer) => {
      return buffer ? promisify(fs.writeFile)(files[index], buffer) : Promise.resolve()
    })
    .then(() => {
      return processFiles(files, index + 1)
    })
}

function processFile(filePath) {
  return jo
    .rotate(filePath, {quality: argv.quality})
    .then(({orientation, quality}) => {
      const message = 'Processed (Orientation was ' + orientation + ') (Quality ' + quality + '%)'
      console.log(filePath + ': ' + colors.green(message))
    })
    .catch((error) => {
      const isFatal = error.code !== jo.errors.correct_orientation
      console.log(filePath + ': ' + (isFatal ? colors.red(error.message) : colors.yellow(error.message)))
    })
}
