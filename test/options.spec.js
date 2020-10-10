const describe = require('mocha').describe
const it = require('mocha').it
const expect = require('chai').expect
const execPromise = require('util').promisify(require('child_process').exec)
const jo = require('../src/main.js')
const manifest = require('../package.json')
const path = require('path')

describe('options', () => {
  it('Should display version number with --version (cli)', async () => {
    const {stdout} = await execPromise('./src/cli.js --version')
    expect(stdout).to.contain(manifest.version)
  })

  it('Should display help with --help (cli)', async () => {
    const {stdout} = await execPromise('./src/cli.js --help')
    expect(stdout).to.contain('Usage')
    expect(stdout).to.contain('Options')
  })

  it('Should display help if invalid input (cli)', async () => {
    const {stdout} = await execPromise('./src/cli.js')
    expect(stdout).to.contain('Usage')
    expect(stdout).to.contain('Options')
  })

  it('Should work with undefined options (callback)', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_2.jpg'), null, (error, buffer, orientation) => {
      expect(error).to.equal(null)
      expect(Buffer.isBuffer(buffer)).to.equal(true)
      expect(orientation).to.equal(2)
      done()
    })
  })

  it('Should work with invalid options (callback)', (done) => {
    jo.rotate(path.join(__dirname, '/samples/image_2.jpg'), 'invalid', (error, buffer, orientation) => {
      expect(error).to.equal(null)
      expect(Buffer.isBuffer(buffer)).to.equal(true)
      expect(orientation).to.equal(2)
      done()
    })
  })

  it('Should read the jpegjsMaxMemoryUsageInMB option (cli)', async () => {
    const command = './src/cli.js --jpegjsMaxMemoryUsageInMB=0.001 ' + path.join(__dirname, '/samples/image_2.jpg')
    const {stdout} = await execPromise(command)
    expect(stdout).to.contain('Could not rotate image')
  })

  it('Should read the jpegjsMaxMemoryUsageInMB option (promise)', async () => {
    try {
      await jo.rotate(path.join(__dirname, '/samples/image_2.jpg'), {jpegjsMaxMemoryUsageInMB: 0.001})
      throw new Error('Should not succeed')
    } catch (error) {
      expect(error).to.have.property('code').equal(jo.errors.rotate_file)
    }
  })

  it('Should read the jpegjsMaxResolutionInMP option (cli)', async () => {
    const command = './src/cli.js --jpegjsMaxResolutionInMP=0.001 ' + path.join(__dirname, '/samples/image_2.jpg')
    const {stdout} = await execPromise(command)
    expect(stdout).to.contain('Could not rotate image')
  })

  it('Should read the jpegjsMaxResolutionInMP option (promise)', async () => {
    try {
      await jo.rotate(path.join(__dirname, '/samples/image_2.jpg'), {jpegjsMaxResolutionInMP: 0.001})
      throw new Error('Should not succeed')
    } catch (error) {
      expect(error).to.have.property('code').equal(jo.errors.rotate_file)
    }
  })

  // @todo quality with cli

  // @todo jpegjsMaxMemoryUsageInMB with module
  // @todo jpegjsMaxResolutionInMP with module
  // @todo quality with module

  // @todo jpegjsMaxMemoryUsageInMB default
  // @todo jpegjsMaxResolutionInMP default
  // @todo quality default
})
