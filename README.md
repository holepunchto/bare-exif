# bare-exif

EXIF support for Bare.

```
npm i bare-exif
```

## Usage

```js
const exif = require('bare-exif')

const image = require('./my-image.jpg', { with: { type: 'binary' } })

const data = new exif.Data(image)

const orientation = data.entry(exif.constants.tags.ORIENTATION)

console.log(orientation.value())
// Top-left
```

## License

Apache-2.0
