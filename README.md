# bare-exif

EXIF support for Bare.

```
npm i bare-exif
```

## Usage

```js
const exif = require('bare-exif')

const image = require('./my-image.jpg', { with: { type: 'binary' } })

// Read EXIF data
const data = new exif.Data(image)
const orientation = data.entry(exif.constants.tags.ORIENTATION)

orientation.read() // 1 (raw value)
orientation.value() // Top-left (human readable string)

// Remove a tag
data.removeEntry(exif.constants.tags.ORIENTATION)

// Serialize into raw EXIF
const exifBytes = data.saveData()
// <Uint8Array>
```

## License

Apache-2.0
