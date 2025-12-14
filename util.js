const binding = require('./binding')

function readComponent(entry, index) {
  const { formats, byteOrders } = binding
  const littleEndian = entry.byteOrder === byteOrders.INTEL
  const view = new DataView(entry.data)

  switch (entry.format) {
    case formats.BYTE:
      return view.getUint8(0)

    case formats.SBYTE:
      return view.getInt8(0)

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
      return Buffer.from(entry.data)

    default:
      return null
  }
}

exports.entryRaw = function entryRaw(entry) {
  if (!entry.components || entry.components < 0) return null

  if (
    entry.components === 1 ||
    entry.format === binding.formats.ASCII ||
    entry.format === binding.formats.UNDEFINED
  ) {
    return readComponent(entry, 0)
  }

  const values = []
  for (let i = 0; i < entry.components; i++) {
    values.push(readComponent(entry, i))
  }
  return values
}
