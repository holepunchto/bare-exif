const test = require('brittle')
const exif = require('.')

test('load .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const data = new exif.Data(image)

  t.comment(data)
})

test('entry has raw data', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const data = new exif.Data(image)
  const entry = data.entry(exif.constants.tags.ORIENTATION)
  const buffer = Buffer.from(entry.data)

  t.is(entry.tag, 274)
  t.is(entry.format, 3)
  t.is(entry.components, 1)
  t.is(entry.size, 2)
  t.is(entry.byteOrder, 0)
  t.is(buffer.length, 2)
  t.is(buffer[0], 0)
  t.is(buffer[1], 1)
})

test('entry.read()', (t) => {
  const { tags } = exif.constants
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const data = new exif.Data(image)

  t.is(data.entry(tags.COLOR_SPACE).read(), 1, 'COLOR_SPACE')
  t.is(data.entry(tags.ORIENTATION).read(), 1, 'ORIENTATION')
  t.is(data.entry(tags.PIXEL_X_DIMENSION).read(), 332, 'PIXEL_X_DIMENSION')
  t.is(data.entry(tags.PIXEL_Y_DIMENSION).read(), 332, 'PIXEL_Y_DIMENSION')
  t.is(data.entry(tags.RESOLUTION_UNIT).read(), 2, 'RESOLUTION_UNIT')
  t.alike(data.entry(tags.X_RESOLUTION).read(), { numerator: 72, denominator: 1 }, 'X_RESOLUTION')
  t.alike(data.entry(tags.Y_RESOLUTION).read(), { numerator: 72, denominator: 1 }, 'Y_RESOLUTION')
})

test('print all entries with entry.read()', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const data = new exif.Data(image)

  for (let [key, value] of Object.entries(exif.constants.tags)) {
    const entry = data.entry(value)
    if (entry) {
      t.comment(`${key}:`, entry.read())
    }
  }
})

test('print all entries with entry.value()', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const data = new exif.Data(image)

  for (let [key, value] of Object.entries(exif.constants.tags)) {
    const entry = data.entry(value)
    if (entry) {
      t.comment(`${key}: ${entry.value()}`)
    }
  }
})
