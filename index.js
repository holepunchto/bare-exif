const binding = require('./binding')

exports.constants = {
  tags: binding.tags,
  ifds: binding.ifds,
  formats: binding.formats,
  byteOrders: binding.byteOrders
}

class EXIFEntry {
  constructor(data) {
    this._handle = data.handle
    this.tag = data.tag
    this.format = data.format
    this.components = data.components
    this.data = data.data
    this.size = data.size
    this.byteOrder = data.byte_order
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
    return binding.entryValue(this._handle)
  }

  destroy() {
    if (this._handle === null) return
    binding.destroyEntry(this._handle)
    this._handle = null
  }

  [Symbol.dispose]() {
    this.destroy()
  }
}

exports.Data = class EXIFData {
  constructor(data) {
    this._handle = binding.initData(data.buffer, data.byteOffset, data.byteLength)
  }

  entry(tag) {
    const data = binding.entry(this._handle, tag)
    if (!data) return null
    return new EXIFEntry(data)
  }

  destroy() {
    if (this._handle === null) return
    binding.destroyData(this._handle)
    this._handle = null
  }

  [Symbol.dispose]() {
    this.destroy()
  }
}
