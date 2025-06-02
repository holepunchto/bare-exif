const binding = require('./binding')

exports.constants = {
  tags: binding.tags,
  ifds: binding.ifds
}

exports.Data = class EXIFData {
  constructor(data) {
    this._handle = binding.initData(
      data.buffer,
      data.byteOffset,
      data.byteLength
    )
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
