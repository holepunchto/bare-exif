const test = require('brittle')
const exif = require('.')

test('load .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  using data = new exif.Data(image)

  t.comment(data)
})

test('entry has raw data', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  using data = new exif.Data(image)
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

  using data = new exif.Data(image)

  t.is(data.entry(tags.COLOR_SPACE).read(), 1, 'COLOR_SPACE')
  t.is(data.entry(tags.ORIENTATION).read(), 1, 'ORIENTATION')
  t.is(data.entry(tags.PIXEL_X_DIMENSION).read(), 332, 'PIXEL_X_DIMENSION')
  t.is(data.entry(tags.PIXEL_Y_DIMENSION).read(), 332, 'PIXEL_Y_DIMENSION')
  t.is(data.entry(tags.RESOLUTION_UNIT).read(), 2, 'RESOLUTION_UNIT')
  t.alike(data.entry(tags.X_RESOLUTION).read(), { numerator: 72, denominator: 1 }, 'X_RESOLUTION')
  t.alike(data.entry(tags.Y_RESOLUTION).read(), { numerator: 72, denominator: 1 }, 'Y_RESOLUTION')
})

test('data.removeEntry()', (t) => {
  const { tags } = exif.constants
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  using data = new exif.Data(image)

  t.ok(data.entry(tags.ORIENTATION))
  t.is(data.entry(tags.ORIENTATION).read(), 1)

  data.removeEntry(tags.ORIENTATION)

  t.is(data.entry(tags.ORIENTATION), null)
})

test('data.removeEntry() does not throw when the tag is absent', (t) => {
  const { tags } = exif.constants
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  using data = new exif.Data(image)

  t.absent(data.entry(tags.MAKE))

  data.removeEntry(tags.MAKE)
})

test('data.saveData() - save data into raw exif', (t) => {
  const { tags } = exif.constants
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  using data = new exif.Data(image)

  data.removeEntry(tags.ORIENTATION)

  const saved = data.saveData()
  using roundtrip = new exif.Data(saved)

  t.ok(saved instanceof Uint8Array)
  t.absent(roundtrip.entry(tags.ORIENTATION))
  t.is(roundtrip.entry(tags.COLOR_SPACE).read(), 1)
})

test('print all entries with entry.read()', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  using data = new exif.Data(image)

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

  using data = new exif.Data(image)

  for (let [key, value] of Object.entries(exif.constants.tags)) {
    const entry = data.entry(value)
    if (entry) {
      t.comment(`${key}: ${entry.value()}`)
    }
  }
})

test('entry.destroy() leaves the rest of the data tree usable', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  using data = new exif.Data(image)

  data.entry(exif.constants.tags.ORIENTATION).destroy()

  // A different, non-destroyed entry must still decode correctly.
  t.is(data.entry(exif.constants.tags.COLOR_SPACE).read(), 1)
})

test('entry disposes via using', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  using data = new exif.Data(image)

  {
    using entry = data.entry(exif.constants.tags.ORIENTATION)
    t.is(entry.read(), 1)
  }

  t.pass('entry disposed without crashing')
})

test('constructing from non-EXIF data does not crash', (t) => {
  using data = new exif.Data(Buffer.from('this is not a jpeg'))

  t.is(data.entry(exif.constants.tags.ORIENTATION), null)
})

test('data.destroy() cleans up and is safe to call twice', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const data = new exif.Data(image)

  data.destroy()
  data.destroy() // second call must be a no-op, not a double-free

  t.pass('data destroyed without crashing')
})
