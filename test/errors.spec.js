const describe = require('mocha').describe
const execPromise = require('util').promisify(require('child_process').exec)
const expect = require('chai').expect
const it = require('mocha').it
const jo = require('../src/main.js')
const path = require('path')

require('chai').should()

describe('errors', () => {
  it('Should expose error types', () => {
    const getTypeof = (thing) => typeof thing
    getTypeof(jo.errors).should.equals('object')
    getTypeof(jo.errors.read_file).should.equals('string')
    getTypeof(jo.errors.read_exif).should.equals('string')
    getTypeof(jo.errors.no_orientation).should.equals('string')
    getTypeof(jo.errors.unknown_orientation).should.equals('string')
    getTypeof(jo.errors.correct_orientation).should.equals('string')
    getTypeof(jo.errors.rotate_file).should.equals('string')
  })

  it('Should return a "correct_orientation" error if the orientation is 1 (callback)', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_1.jpg'), {}, (error, buffer) => {
      error.should.have.property('code').equal(jo.errors.correct_orientation)
      Buffer.isBuffer(buffer).should.be.ok
      done()
    })
  })

  it('Should return a "correct_orientation" error if the orientation is 1 (promise)', () => {
    return jo
      .rotate(path.join(__dirname, '/samples/image_1.jpg'), {})
      .then(() => {
        throw new Error('Should not succeed')
      })
      .catch((error) => {
        error.should.have.property('code').equal(jo.errors.correct_orientation)
      })
  })

  it('Should return a "correct_orientation" error if the orientation is 1 (cli)', () => {
    const command = './src/cli.js ' + path.join(__dirname, '/samples/image_1.jpg')
    return execPromise(command).then(({stdout}) => {
      stdout.should.contain('Orientation already correct')
    })
  })

  it('Should return a "read_file" error if the image does not exist', (done) => {
    jo.rotate('foo.jpg', {}, (error, buffer, orientation) => {
      error.should.have.property('code').equal(jo.errors.read_file)
      expect(buffer).to.equal(null)
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "read_file" error if the file is not an image', (done) => {
    jo.rotate(path.join(__dirname, '/samples/textfile.md'), {}, (error, buffer, orientation) => {
      error.should.have.property('code').equal(jo.errors.read_exif)
      expect(buffer).to.equal(null)
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "read_file" error if the path is not a string/buffer', (done) => {
    jo.rotate(['foo'], {}, (error, buffer, orientation) => {
      error.should.have.property('code').equal(jo.errors.read_file)
      expect(buffer).to.equal(null)
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should work if `options` is not an object', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_2.jpg'), 'options', (error, buffer, orientation) => {
      expect(error).to.equal(null)
      Buffer.isBuffer(buffer).should.be.ok
      expect(orientation).to.equal(2)
      done()
    })
  })

  it('Should return a "no_orientation" error if the image has no orientation tag', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_no_orientation.jpg'), {}, (error, buffer, orientation) => {
      error.should.have.property('code').equal(jo.errors.no_orientation)
      Buffer.isBuffer(buffer).should.be.ok
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return an "unknown_orientation" error if the image has an unknown orientation tag', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_unknown_orientation.jpg'), {}, (error, buffer, orientation) => {
      error.should.have.property('code').equal(jo.errors.unknown_orientation)
      Buffer.isBuffer(buffer).should.be.ok
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "rotate_file" error if the memory is exceeded when decoding the source image (callback)', (done) => {
    const options = {
      jpegjsMaxMemoryUsageInMB: 0.001,
    }
    jo.rotate(path.join(__dirname, '/samples/image_2.jpg'), options, (error, buffer, orientation) => {
      error.should.have.property('code').equal(jo.errors.rotate_file)
      Buffer.isBuffer(buffer).should.be.ok
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "rotate_file" error if the memory is exceeded when decoding the source image (cli)', () => {
    const command = './src/cli.js --jpegjsMaxMemoryUsageInMB=0.001 ' + path.join(__dirname, '/samples/image_2.jpg')
    return execPromise(command).then(({stdout}) => {
      stdout.should.contain('Could not rotate image')
    })
  })

  it('Should return a "rotate_file" error if the image is too big (callback)', (done) => {
    const options = {
      jpegjsMaxResolutionInMP: 0.001,
    }
    jo.rotate(path.join(__dirname, '/samples/image_2.jpg'), options, (error, buffer, orientation) => {
      error.should.have.property('code').equal(jo.errors.rotate_file)
      Buffer.isBuffer(buffer).should.be.ok
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "rotate_file" error if the memory is exceeded when decoding the source image (cli)', () => {
    const command = './src/cli.js --jpegjsMaxResolutionInMP=0.001 ' + path.join(__dirname, '/samples/image_2.jpg')
    return execPromise(command).then(({stdout}) => {
      stdout.should.contain('Could not rotate image')
    })
  })
})
