const describe = require('mocha').describe
const it = require('mocha').it
const expect = require('chai').expect
const execPromise = require('util').promisify(require('child_process').exec)
const jo = require('../src/main.js')
const manifest = require('../package.json')
const path = require('path')
const crypto = require('crypto')
const fsp = require('fs').promises
const md5FromBuffer = (buffer) => crypto.createHash('md5').update(buffer.toString('binary')).digest('hex')

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

  it('Should default to the right quality (cli)', async () => {
    const originPath = path.join(__dirname, 'samples/image_5.jpg')
    const refBuffer = await fsp.readFile(path.join(__dirname, 'samples/image_5_ref100.jpg'))
    const destPath = path.join(__dirname, 'samples/image_5_cli_options.jpg')
    const command = ['cp ' + originPath + ' ' + destPath, './src/cli.js ' + destPath + ' --quality=invalid']
    await execPromise(command.join(' && '))
    const buffer = await fsp.readFile(destPath)
    await fsp.unlink(destPath)
    expect(md5FromBuffer(buffer)).to.equal(md5FromBuffer(refBuffer))
  })

  it('Should default to the right quality (promise)', async () => {
    const refBuffer = await fsp.readFile(path.join(__dirname, 'samples/image_5_ref100.jpg'))
    const originPath = path.join(__dirname, 'samples/image_5.jpg')
    const {buffer} = await jo.rotate(originPath, {quality: 'invalid'})
    expect(md5FromBuffer(buffer)).to.equal(md5FromBuffer(refBuffer))
  })
})
