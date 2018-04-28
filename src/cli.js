#!/usr/bin/env node
'use strict'

const colors = require('colors')
const argv = require('yargs').argv
const async = require('async')
const fs = require('fs')
const glob = require('glob')

const jo = require('./main.js')
const manifest = require('../package.json')

if (argv.version) {
  console.log(manifest.name + ' ' + manifest.version)
  process.exit(0)
}

if (argv.help || typeof argv._ === 'undefined' || argv._.length === 0) {
  const help = [
    '',
    'Rotates JPEG images based on EXIF orientation',
    '',
    colors.underline('Usage'),
    'jpeg-autorotate <path>',
    '',
    colors.underline('Options'),
    '--quality=<0-100>   JPEG output quality',
    '--jobs=<number>     How many concurrent jobs to run (default is 10)',
    '--version           Outputs current version',
    '--help              Outputs help',
    '',
  ]
  console.log(help.join('\n'))
  process.exit(0)
}

const jobs =
  typeof argv.jobs !== 'undefined' && argv.jobs.toString().search(/^[0-9]+$/) === 0 ? parseInt(argv.jobs) : 10
const quality =
  typeof argv.quality !== 'undefined' && argv.quality.toString().search(/^[0-9]+$/) === 0 ? parseInt(argv.quality) : 100

const queue = async.queue(_processFile, jobs)
queue.drain = _onAllFilesProcessed
argv._.map(function(path) {
  glob(path, {}, function(error, files) {
    if (error) {
      _onFileProcessed(error, path, null)
      return
    }
    files.map(function(file) {
      queue.push({path: file}, _onFileProcessed)
    })
  })
})

/**
 * Processes a file
 * @param task
 * @param callback
 */
function _processFile(task, callback) {
  jo.rotate(task.path, {quality: quality}, function(error, buffer, orientation) {
    if (error) {
      callback(error, task.path, orientation)
      return
    }
    fs.writeFile(task.path, buffer, function(error) {
      callback(error, task.path, orientation)
    })
  })
}

/**
 * Logs a processed file
 * @param error
 * @param path
 * @param orientation
 */
function _onFileProcessed(error, path, orientation) {
  if (error) {
    console.log(
      path +
        ': ' +
        (error.code === jo.errors.correct_orientation ? colors.yellow(error.message) : colors.red(error.message))
    )
  } else {
    console.log(path + ': ' + colors.green('Processed (Orientation was ' + orientation + ')'))
  }
}

/**
 * Exits when all files have been processed
 */
function _onAllFilesProcessed() {
  process.exit(0)
}
