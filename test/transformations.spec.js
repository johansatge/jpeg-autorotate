const describe = require('mocha').describe
const it = require('mocha').it
const expect = require('chai').expect
const fs = require('fs')
const fsp = require('fs').promises
const jo = require('../src/main.js')
const path = require('path')
const crypto = require('crypto')
const execPromise = require('util').promisify(require('child_process').exec)
const md5FromBuffer = (buffer) => crypto.createHash('md5').update(buffer.toString('binary')).digest('hex')

const images = [
  {fileName: 'image_2.jpg', width: 600, height: 450, orientation: 2},
  {fileName: 'image_3.jpg', width: 600, height: 450, orientation: 3},
  {fileName: 'image_4.jpg', width: 600, height: 450, orientation: 4},
  {fileName: 'image_5.jpg', width: 600, height: 450, orientation: 5},
  {fileName: 'image_6.jpg', width: 600, height: 450, orientation: 6},
  {fileName: 'image_7.jpg', width: 600, height: 450, orientation: 7},
  {fileName: 'image_8.jpg', width: 600, height: 450, orientation: 8},
  {fileName: 'image_exif.jpg', width: 2448, height: 3264, orientation: 6},
]

describe('transformations', function () {
  this.timeout(60 * 1000)
  for (let index = 0; index < images.length; index += 1) {
    const {fileName, width, height, orientation} = images[index]
    const filePath = path.join(__dirname, '/samples/' + fileName)
    const refBuffer = fs.readFileSync(filePath.replace('.jpg', '_ref82.jpg'))
    const refMd5 = md5FromBuffer(refBuffer)
    itShouldTransformWithCallback(filePath, fileName, width, height, orientation, refMd5)
    itShouldTransformWithPromise(filePath, fileName, width, height, orientation, refMd5)
    itShouldTransformWithCli(filePath, fileName, width, height, orientation, refMd5)
  }
  const buffer = fs.readFileSync(path.join(__dirname, '/samples/image_8.jpg'))
  const refBuffer = fs.readFileSync(path.join(__dirname, '/samples/image_8_ref82.jpg'))
  const refMd5 = md5FromBuffer(refBuffer)
  itShouldTransformWithCallback(buffer, 'image_8 buffer', 600, 450, 8, refMd5)
  itShouldTransformWithPromise(buffer, 'image_8 buffer', 600, 450, 8, refMd5)
})

function itShouldTransformWithCallback(originPathOrBuffer, label, refWidth, refHeight, refOrientation, refMd5) {
  it('Should rotate image (' + label + ') (callback)', (done) => {
    jo.rotate(originPathOrBuffer, {quality: 82}, (error, buffer, orientation, dimensions, quality) => {
      expect(error).to.equal(null)
      expect(quality).to.equal(82)
      expect(dimensions.width).to.equal(refWidth)
      expect(dimensions.height).to.equal(refHeight)
      expect(orientation).to.equal(refOrientation)
      expect(crypto.createHash('md5').update(buffer.toString('binary')).digest('hex')).to.equal(refMd5)
      done()
    })
  })
}

function itShouldTransformWithPromise(originPathOrBuffer, label, refWidth, refHeight, refOrientation, refMd5) {
  it('Should rotate image (' + label + ') (promise)', async () => {
    const {buffer, orientation, dimensions, quality} = await jo.rotate(originPathOrBuffer, {quality: 82})
    expect(quality).to.equal(82)
    expect(dimensions.width).to.equal(refWidth)
    expect(dimensions.height).to.equal(refHeight)
    expect(orientation).to.equal(refOrientation)
    expect(crypto.createHash('md5').update(buffer.toString('binary')).digest('hex')).to.equal(refMd5)
  })
}

function itShouldTransformWithCli(originPath, label, refWidth, refHeight, refOrientation, refMd5) {
  it('Should rotate image (' + label + ') (cli)', async () => {
    const destPath = originPath.replace('.jpg', '_cli.jpg')
    const command = ['cp ' + originPath + ' ' + destPath, './src/cli.js ' + destPath + ' --quality=82']
    const {stdout} = await execPromise(command.join(' && '))
    const output = stdout.match(
      /Processed \(Orientation: ([0-9]{1})\) \(Quality: ([0-9]+)%\) \(Dimensions: ([0-9]+)x([0-9]+)\)/
    )
    const buffer = await fsp.readFile(destPath)
    await fsp.unlink(destPath)
    expect(parseInt(output[2])).to.equal(82)
    expect(parseInt(output[3])).to.equal(refWidth)
    expect(parseInt(output[4])).to.equal(refHeight)
    expect(parseInt(output[1])).to.equal(refOrientation)
    expect(md5FromBuffer(buffer)).to.equal(refMd5)
  })
}
