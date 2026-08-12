const binding = require('./binding')

exports.constants = {
  tags: binding.tags,
  ifds: binding.ifds,
  formats: binding.formats,
  byteOrders: binding.byteOrders
}

class EXIFEntry {
  // An entry borrows from the data tree it was read from. Holding on to the
  // parent keeps it reachable, so an entry can never be collected after the
  // tree it points into.
  constructor(data) {
    this._data = data
    this._destroyed = false

    this.tag = 0
    this.format = 0
    this.components = 0
    this.size = 0
    this.byteOrder = 0
    this.data = null
  }

  #readComponent(index) {
    const { formats, byteOrders } = binding
    const littleEndian = this.byteOrder === byteOrders.INTEL
    const view = new DataView(this.data)

    switch (this.format) {
      case formats.BYTE:
        return view.getUint8(index)

      case formats.SBYTE:
        return view.getInt8(index)

      case formats.SHORT:
        return view.getUint16(index * 2, littleEndian)

      case formats.SSHORT:
        return view.getInt16(index * 2, littleEndian)

      case formats.LONG:
        return view.getUint32(index * 4, littleEndian)

      case formats.SLONG:
        return view.getInt32(index * 4, littleEndian)

      case formats.FLOAT:
        return view.getFloat32(index * 4, littleEndian)

      case formats.DOUBLE:
        return view.getFloat64(index * 8, littleEndian)

      case formats.RATIONAL: {
        return {
          numerator: view.getUint32(index * 4, littleEndian),
          denominator: view.getUint32(index * 4 + 4, littleEndian)
        }
      }

      case formats.SRATIONAL: {
        return {
          numerator: view.getInt32(index * 4, littleEndian),
          denominator: view.getInt32(index * 4 + 4, littleEndian)
        }
      }

      case formats.ASCII: {
        let text = ''
        for (let i = 0; i < view.byteLength; i++) {
          const c = view.getUint8(i)
          if (c === 0) break
          text += String.fromCharCode(c)
        }
        return text
      }

      case formats.UNDEFINED:
        return Buffer.from(this.data)

      default:
        return null
    }
  }

  read() {
    if (this._destroyed) {
      throw new Error('EXIF entry has been destroyed')
    }

    if (!this.components || this.components < 0) return null

    if (
      this.components === 1 ||
      this.format === binding.formats.ASCII ||
      this.format === binding.formats.UNDEFINED
    ) {
      return this.#readComponent(0)
    }

    const values = []
    for (let i = 0; i < this.components; i++) {
      values.push(this.#readComponent(i))
    }
    return values
  }

  value() {
    return binding.entryValue(this)
  }

  destroy() {
    if (this._destroyed) return

    this._data._entries.delete(this)

    binding.destroyEntry(this, this.data)

    this.data = null
    this._destroyed = true
  }

  [Symbol.dispose]() {
    this.destroy()
  }
}

exports.Data = class EXIFData {
  constructor(data) {
    this._destroyed = false

    // The entries handed out so far. They borrow from the tree below, so they
    // are destroyed before it is.
    this._entries = new Set()

    binding.initData(this, data.buffer, data.byteOffset, data.byteLength)
  }

  entry(tag) {
    const entry = new EXIFEntry(this)

    if (binding.initEntry(entry, this, tag) === undefined) return null

    this._entries.add(entry)

    return entry
  }

  removeEntry(tag) {
    for (const entry of this._entries) {
      if (entry.tag === tag) entry.destroy()
    }

    binding.removeEntry(this, tag)
  }

  saveData() {
    return new Uint8Array(binding.saveData(this))
  }

  destroy() {
    if (this._destroyed) return

    for (const entry of [...this._entries]) entry.destroy()

    binding.destroyData(this)

    this._destroyed = true
  }

  [Symbol.dispose]() {
    this.destroy()
  }
}
