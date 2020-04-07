// Like `isNaN` but returns `true` for symbols.
function betterIsNaN(s) {
  if (typeof s === "symbol") {
    return true;
  }
  return isNaN(s);
}

export function ArrayOfStructsView(buffer, descriptors) {
  const dataView = new DataView(buffer);
  let stride = 0;
  // Copy
  descriptors = Object.assign({}, descriptors);
  for (const [name, descriptor] of Object.entries(descriptors)) {
    descriptor.offset = stride;
    stride += descriptor.size;
  }

  const length = Math.floor(buffer.byteLength / stride);
  return new Proxy(new Array(length), {
    get(target, prop, proxy) {
      switch (prop) {
        case 'buffer':
          return buffer;
        case 'toJSON':
          return JSON.stringify(
            Array.from({ length }, (_, i) => proxy[i])
          );
        case 'length': return length;
      }
      // If it wasn’t handled by the switch-case above
      // and is not a number, than it’s a prop we don’t support yet.
      if (betterIsNaN(prop)) {
        throw Error(`Accessing "${prop}" is unsupported for now lol`);
      }
      const idx = parseInt(prop);
      const itemOffset = idx * stride;
      if (!target[idx]) {
        target[idx] = {};
        for (const [name, descriptor] of Object.entries(descriptors)) {
          Object.defineProperty(target[idx], name, {
            enumerable: true,
            get() {
              return descriptor.get(dataView, itemOffset + descriptor.offset)
            },
            set(value) {
              return descriptor.set(dataView, itemOffset + descriptor.offset, value)
            }
          })
        }
      }
      return target[idx];
    }
  })
}

["Uint16", "Uint32", "Int16", "Int32", "Float32", "Float64", "BigInt64", "BigUint64"].forEach(name => {
  ArrayOfStructsView[name] = ({ endianess = 'big' } = {}) => {
    if (endianess !== 'big' && endianess !== 'little') {
      throw Error("Endianess needs to be either 'big' or 'little'");
    }
    const littleEndian = endianess === 'little';
    return {
      size: self[`${name}Array`].BYTES_PER_ELEMENT,
      get: (dataView, byteOffset) => dataView[`get${name}`](byteOffset, littleEndian),
      set: (dataView, byteOffset, value) => dataView[`set${name}`](byteOffset, value, littleEndian)
    }
  }
})

ArrayOfStructsView.Uint8 = () => ({
  size: 1,
  get: (dataView, byteOffset) => dataView.getUint8(byteOffset),
  set: (dataView, byteOffset, value) => dataView.setUint8(byteOffset, value),
});

ArrayOfStructsView.reserved = (size) => ({ size });

export default ArrayOfStructsView;