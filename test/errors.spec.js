const describe = require('mocha').describe
const it = require('mocha').it
const expect = require('chai').expect
const execPromise = require('util').promisify(require('child_process').exec)
const jo = require('../src/main.js')
const path = require('path')

describe('errors', () => {
  it('Should expose error types', () => {
    expect(typeof jo.errors).to.equal('object')
    expect(typeof jo.errors.correct_orientation).to.equal('string')
    expect(typeof jo.errors.read_file).to.equal('string')
    expect(typeof jo.errors.read_exif).to.equal('string')
    expect(typeof jo.errors.no_orientation).to.equal('string')
    expect(typeof jo.errors.unknown_orientation).to.equal('string')
    expect(typeof jo.errors.rotate_file).to.equal('string')
  })

  it('Should return a "correct_orientation" error if the orientation is 1 (callback)', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_1.jpg'), {}, (error, buffer) => {
      expect(error).to.have.property('code').equal(jo.errors.correct_orientation)
      expect(Buffer.isBuffer(buffer)).to.equal(true)
      done()
    })
  })

  it('Should return a "correct_orientation" error if the orientation is 1 (promise)', async () => {
    try {
      await jo.rotate(path.join(__dirname, '/samples/image_1.jpg'))
      throw new Error('Should not succeed')
    } catch (error) {
      expect(error).to.have.property('code').equal(jo.errors.correct_orientation)
    }
  })

  it('Should return a "correct_orientation" error if the orientation is 1 (cli)', async () => {
    const {stdout} = await execPromise('./src/cli.js ' + path.join(__dirname, '/samples/image_1.jpg'))
    expect(stdout).to.contain('Orientation already correct')
  })

  it('Should return a "read_file" error if the image does not exist', (done) => {
    jo.rotate('foo.jpg', {}, (error, buffer, orientation) => {
      expect(error).to.have.property('code').equal(jo.errors.read_file)
      expect(buffer).to.equal(null)
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "read_file" error if the path is not a string/buffer', (done) => {
    jo.rotate(['foo'], {}, (error, buffer, orientation) => {
      expect(error).to.have.property('code').equal(jo.errors.read_file)
      expect(buffer).to.equal(null)
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "read_exif" error if the file is not an image', (done) => {
    jo.rotate(path.join(__dirname, '/samples/textfile.md'), {}, (error, buffer, orientation) => {
      expect(error).to.have.property('code').equal(jo.errors.read_exif)
      expect(buffer).to.equal(null)
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "no_orientation" error if the image has no orientation tag', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_no_orientation.jpg'), {}, (error, buffer, orientation) => {
      expect(error).to.have.property('code').equal(jo.errors.no_orientation)
      expect(Buffer.isBuffer(buffer)).to.equal(true)
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return an "unknown_orientation" error if the image has an unknown orientation tag', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_unknown_orientation.jpg'), {}, (error, buffer, orientation) => {
      expect(error).to.have.property('code').equal(jo.errors.unknown_orientation)
      expect(Buffer.isBuffer(buffer)).to.equal(true)
      expect(orientation).to.equal(null)
      done()
    })
  })

  it('Should return a "rotate_file" error if the image could not be rotated', (done) => {
    const options = {jpegjsMaxMemoryUsageInMB: 0.001}
    jo.rotate(path.join(__dirname, '/samples/image_2.jpg'), options, (error, buffer, orientation) => {
      expect(error).to.have.property('code').equal(jo.errors.rotate_file)
      expect(Buffer.isBuffer(buffer)).to.equal(true)
      expect(orientation).to.equal(null)
      done()
    })
  })
})
