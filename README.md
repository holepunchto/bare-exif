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

Parse EXIF data from a buffer. `data` owns the EXIF tree.

### `data.destroy()`

Destroy every entry handed out by `data`, then free the EXIF tree. Safe to call more
than once. If you never call it, a finalizer does it when `data` is garbage collected.
Prefer `using` to call it automatically when `data` goes out of scope:

```js
using data = new exif.Data(image)
// data.destroy() runs for you at the end of the scope
```

### `const entry = data.entry(tag)`

Return the entry for `tag`, or `null` if absent. The entry borrows from `data` and may
not outlive it: `entry.data` is a view into the tree, not a copy.

### `entry.destroy()`

Release the entry's view of the tree and detach `entry.data`. Safe to call more than
once. The entry itself is owned by `data`, so this frees nothing — to remove a tag
from the tree, use `data.removeEntry(tag)`.

### `data.removeEntry(tag)`

Destroy any live entry for `tag`, then remove it from the EXIF tree and free it.

### `data.saveData()`

Serialize the EXIF tree back into a raw `Uint8Array`.

## License

Apache-2.0
