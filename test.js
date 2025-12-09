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

  t.is(entry.tag, 274)
  t.is(entry.format, 3)
  t.is(entry.components, 1)
  t.is(entry.data.length, 2)
  t.is(entry.data[0], 0)
  t.is(entry.data[1], 1)
  t.is(entry.size, 2)
})

test('print all entries', (t) => {
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

