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

// Free the data when you're done (or use `using` to do it automatically)
data.destroy()
```

## API

### `const data = new exif.Data(buffer)`

Parse EXIF data from a buffer. `data` owns the whole EXIF tree, including every entry
returned by `data.entry()`.

### `data.destroy()`

Free the data and every entry it owns. Safe to call more than once. Prefer `using` to
call it automatically when `data` goes out of scope:

```js
using data = new exif.Data(image)
// data.destroy() runs for you at the end of the scope
```

### `const entry = data.entry(tag)`

Return the entry for `tag`, or `null` if absent. The entry is a **borrowed view** into
`data` — it stays valid until `data` is destroyed, and is freed together with it.

### `entry.destroy()`

Drop your handle to the entry. It does **not** free anything — the entry is owned by
`data`. To actually remove a tag from the tree, use `data.removeEntry(tag)`.

### `data.removeEntry(tag)`

Remove `tag` from the EXIF tree and free its entry.

### `data.saveData()`

Serialize the EXIF tree back into a raw `Uint8Array`.

## License

Apache-2.0
