const binding = require('./binding')

exports.constants = {
  tags: binding.tags,
  ifds: binding.ifds,
  formats: binding.formats,
  byteOrders: binding.byteOrders
}

exports.util = {
  entryRaw: require('./util').entryRaw
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
