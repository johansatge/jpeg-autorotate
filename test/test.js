
var should = require('chai').should();
var exec = require('child_process').exec;
var jo = require('../src/main.js');

describe('jpeg-autorotate', function()
{

    [2, 3, 4, 5, 6, 7, 8].map(function(o)
    {
        it('Should rotate image with orientation ' + o, function(done)
        {
            jo.rotate(__dirname + '/images/image_' + o + '.jpg', {}, function(error, buffer, orientation)
            {
                if (error)
                {
                    throw error;
                }
                done();
            });
        });
    });

    it('Should return an error if the orientation is 1', function(done)
    {
        jo.rotate(__dirname + '/images/image_1.jpg', {}, function(error, buffer, orientation)
        {
            error.should.have.property('code').equal(jo.errors.correct_orientation);
            done();
        });
    });

    it('Should return an error if the image can\'t be opened', function(done)
    {
        jo.rotate('foo.jpg', {}, function(error, buffer, orientation)
        {
            error.should.have.property('code').equal(jo.errors.read_file);
            done();
        });
    });

    it('Should return an error if the image has no orientation tag', function(done)
    {
        jo.rotate(__dirname + '/images/image_no_orientation.jpg', {}, function(error, buffer, orientation)
        {
            error.should.have.property('code').equal(jo.errors.no_orientation);
            done();
        });
    });

    it('Should return an error if the image has an unknown orientation tag', function(done)
    {
        jo.rotate(__dirname + '/images/image_unknown_orientation.jpg', {}, function(error, buffer, orientation)
        {
            error.should.have.property('code').equal(jo.errors.unknown_orientation);
            done();
        });
    });

    it('Should run on CLI', function(done)
    {
        var cli = __dirname + '/../src/cli.js';
        var ref = __dirname + '/images/image_2.jpg';
        var tmp = __dirname + '/images/image_2_cli.jpg';
        var command = 'cp ' + ref + ' ' + tmp + ' && ' + cli + ' ' + tmp + ' && rm ' + tmp;
        exec(command, function(error, stdout, stderr)
        {
            stdout.should.be.a('string').and.contain('Processed (Orientation was 2)');
            done();
        });
    });

    // @todo test jo.errors.read_exif (corrupted EXIF data ?)
    // @todo test jo.errors.rotate_file (corrupted JPEG ?)

});
