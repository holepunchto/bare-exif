const test = require('brittle')
const exif = require('.')

test('load .jpg', (t) => {
  const image = require('./test/fixtures/grapefruit.jpg', {
    with: { type: 'binary' }
  })

  const data = new exif.Data(image)

  t.comment(data)
})
