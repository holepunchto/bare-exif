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
```

## License

Apache-2.0
