#!/usr/bin/env node
(function(process)
{

    'use strict';

    var colors = require('colors');
    var argv = require('yargs').argv;
    var async = require('async');

    var jpegautorotate = require('./main.js');
    var manifest = require('../package.json');

    if (argv.version)
    {
        console.log(manifest.name + ' ' + manifest.version);
        process.exit(0);
    }

    if (argv.help)
    {
        var help = [
            '',
            'Rotates JPEG images based on EXIF orientation',
            '',
            colors.underline('Usage'),
            'jpeg-autorotate <path>',
            '',
            colors.underline('Options'),
            '--jobs=<number>   How many concurrent jobs to run (default is 10)',
            '--version         Outputs current version',
            '--help            Outputs help',
            ''
        ];
        console.log(help.join('\n'));
        process.exit(0);
    }

    if (typeof argv._ === 'undefined' || argv._.length === 0)
    {
        console.log('Nothing to do');
        process.exit(0);
    }

    var jobs = typeof argv.jobs !== 'undefined' && argv.jobs.toString().search(/^[0-9]+$/) === 0 ? parseInt(argv.jobs) : 10
    var queue = async.queue(_processFile, jobs);
    queue.drain = _onAllFilesProcessed;
    argv._.map(function(path)
    {
        queue.push({path: path}, _onFileProcessed);
    });

    /**
     * Processes a file
     * @param task
     * @param callback
     */
    function _processFile(task, callback)
    {
        jpegautorotate.rotate(task.path, function(error, orientation)
        {
            callback(error, task.path, orientation);
        });
    }

    /**
     * Logs a processed file
     * @param error
     * @param path
     * @param orientation
     */
    function _onFileProcessed(error, path, orientation)
    {
        if (error)
        {
            console.log(path + ': ' + colors.yellow(error.message));
        }
        else
        {
            console.log(path + ': ' + colors.green('Processed (Orientation was ' + orientation + ')'));
        }
    }

    /**
     * Exits when all files have been processed
     */
    function _onAllFilesProcessed()
    {
        process.exit(0);
    }

})(process);
