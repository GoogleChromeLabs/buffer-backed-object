export type Descriptor<T = any> = {
  size: number;
  get(dataview: DataView, byteOffset: number): T;
  set(dataview: DataView, byteOffset: number, value: T): void;
};

type ExtendedDescriptor<T = any> = Descriptor<T> & { offset: number };

export type Descriptors<T = Descriptor<any>> = {
  [key: string]: T;
};

export type DecodedBuffer<E extends Descriptors> = {
  [K in keyof E]: ReturnType<E[K]["get"]>;
};

// Like `isNaN` but handles symbols
function isNumber(s: any): s is number {
  if (typeof s === "symbol") {
    return false;
  }
  return !isNaN(s);
}

export function structSize(descriptors: Descriptors): number {
  let stride = 0;
  for (const { size } of Object.values(descriptors)) {
    stride += size;
  }
  return stride;
}

export function ArrayOfBufferBackedObjects<T extends Descriptors>(
  buffer: ArrayBuffer,
  descriptors: T,
  { byteOffset = 0, length = 0 } = {}
): Array<DecodedBuffer<T>> {
  const dataView = new DataView(buffer, byteOffset);
  // Accumulate the size of one struct
  let stride = 0;
  // Copy the descriptors.
  // @ts-ignore We will fix up the missing `offset` below
  const extendedDescriptors: Descriptors<ExtendedDescriptor<any>> =
    Object.assign({}, descriptors);
  for (const [name, descriptor] of Object.entries(descriptors)) {
    // Copy second layer and add offset property
    extendedDescriptors[name] = Object.assign({}, descriptor, {
      offset: stride,
    });
    stride += descriptor.size;
  }
  if (!length) {
    length = Math.floor((buffer.byteLength - byteOffset) / stride);
  }
  return new Proxy(new Array(length), {
    has(target, propName) {
      // The underlying array is hole-y, but we want to pretend that it is not.
      // So we need to return `true` for all indices so that `map` et al. work
      // as expected.
      if (isNumber(propName)) {
        return propName < length;
      }
      if (propName === "buffer") {
        return true;
      }
      return propName in target;
    },
    get(target, propName, proxy) {
      if (propName === "buffer") {
        return buffer;
      }
      if (!isNumber(propName)) {
        let prop = target[propName];
        if (typeof prop === "function") {
          prop = prop.bind(proxy);
        }
        return prop;
      }
      const idx = parseInt(propName);
      const itemOffset = idx * stride;
      // Just like real arrays, we return `undefined`
      // outside the boundaries.
      if (idx >= target.length) {
        return undefined;
      }
      // If there is a hole at the given index, we need to create a new value
      // there that has the correct getter and setter functions.
      if (!target[idx]) {
        target[idx] = {};
        for (const [name, descriptor] of Object.entries(extendedDescriptors)) {
          if (!("get" in descriptor)) {
            continue;
          }
          Object.defineProperty(target[idx], name, {
            enumerable: true,
            get() {
              return descriptor.get(dataView, itemOffset + descriptor.offset);
            },
            set(value) {
              return descriptor.set(
                dataView,
                itemOffset + descriptor.offset,
                value
              );
            },
          });
        }
        Object.freeze(target[idx]);
      }
      return target[idx];
    },
  });
}

export function BufferBackedObject<T extends Descriptors>(
  buffer: ArrayBuffer,
  descriptors: T,
  { byteOffset = 0 } = {}
): DecodedBuffer<T> {
  return ArrayOfBufferBackedObjects(buffer, descriptors, { byteOffset })[0];
}

export function Uint16({ endianness = "little" } = {}): Descriptor<number> {
  if (endianness !== "big" && endianness !== "little") {
    throw Error("Endianness needs to be either 'big' or 'little'");
  }
  const littleEndian = endianness === "little";
  return {
    size: Uint16Array.BYTES_PER_ELEMENT,
    get: (dataView, byteOffset) => dataView.getUint16(byteOffset, littleEndian),
    set: (dataView, byteOffset, value) =>
      dataView.setUint16(byteOffset, value, littleEndian),
  };
}

export function Uint32({ endianness = "little" } = {}): Descriptor<number> {
  if (endianness !== "big" && endianness !== "little") {
    throw Error("Endianness needs to be either 'big' or 'little'");
  }
  const littleEndian = endianness === "little";
  return {
    size: Uint32Array.BYTES_PER_ELEMENT,
    get: (dataView, byteOffset) => dataView.getUint32(byteOffset, littleEndian),
    set: (dataView, byteOffset, value) =>
      dataView.setUint32(byteOffset, value, littleEndian),
  };
}

export function Int16({ endianness = "little" } = {}): Descriptor<number> {
  if (endianness !== "big" && endianness !== "little") {
    throw Error("Endianness needs to be either 'big' or 'little'");
  }
  const littleEndian = endianness === "little";
  return {
    size: Int16Array.BYTES_PER_ELEMENT,
    get: (dataView, byteOffset) => dataView.getInt16(byteOffset, littleEndian),
    set: (dataView, byteOffset, value) =>
      dataView.setInt16(byteOffset, value, littleEndian),
  };
}

export function Int32({ endianness = "little" } = {}): Descriptor<number> {
  if (endianness !== "big" && endianness !== "little") {
    throw Error("Endianness needs to be either 'big' or 'little'");
  }
  const littleEndian = endianness === "little";
  return {
    size: Int32Array.BYTES_PER_ELEMENT,
    get: (dataView, byteOffset) => dataView.getInt32(byteOffset, littleEndian),
    set: (dataView, byteOffset, value) =>
      dataView.setInt32(byteOffset, value, littleEndian),
  };
}

export function Float32({ endianness = "little" } = {}): Descriptor<number> {
  if (endianness !== "big" && endianness !== "little") {
    throw Error("Endianness needs to be either 'big' or 'little'");
  }
  const littleEndian = endianness === "little";
  return {
    size: Float32Array.BYTES_PER_ELEMENT,
    get: (dataView, byteOffset) =>
      dataView.getFloat32(byteOffset, littleEndian),
    set: (dataView, byteOffset, value) =>
      dataView.setFloat32(byteOffset, value, littleEndian),
  };
}

export function Float64({ endianness = "little" } = {}): Descriptor<number> {
  if (endianness !== "big" && endianness !== "little") {
    throw Error("Endianness needs to be either 'big' or 'little'");
  }
  const littleEndian = endianness === "little";
  return {
    size: Float64Array.BYTES_PER_ELEMENT,
    get: (dataView, byteOffset) =>
      dataView.getFloat64(byteOffset, littleEndian),
    set: (dataView, byteOffset, value) =>
      dataView.setFloat64(byteOffset, value, littleEndian),
  };
}

export function BigInt64({ endianness = "little" } = {}): Descriptor<bigint> {
  if (endianness !== "big" && endianness !== "little") {
    throw Error("Endianness needs to be either 'big' or 'little'");
  }
  const littleEndian = endianness === "little";
  return {
    size: BigInt64Array.BYTES_PER_ELEMENT,
    get: (dataView, byteOffset) =>
      dataView.getBigInt64(byteOffset, littleEndian),
    set: (dataView, byteOffset, value) =>
      dataView.setBigInt64(byteOffset, value, littleEndian),
  };
}

export function BigUint64({ endianness = "little" } = {}): Descriptor<bigint> {
  if (endianness !== "big" && endianness !== "little") {
    throw Error("Endianness needs to be either 'big' or 'little'");
  }
  const littleEndian = endianness === "little";
  return {
    size: BigUint64Array.BYTES_PER_ELEMENT,
    get: (dataView, byteOffset) =>
      dataView.getBigUint64(byteOffset, littleEndian),
    set: (dataView, byteOffset, value) =>
      dataView.setBigUint64(byteOffset, value, littleEndian),
  };
}

export function Uint8(): Descriptor<number> {
  return {
    size: 1,
    get: (dataView, byteOffset) => dataView.getUint8(byteOffset),
    set: (dataView, byteOffset, value) => dataView.setUint8(byteOffset, value),
  };
}

export function Int8(): Descriptor<number> {
  return {
    size: 1,
    get: (dataView, byteOffset) => dataView.getInt8(byteOffset),
    set: (dataView, byteOffset, value) => dataView.setInt8(byteOffset, value),
  };
}

export function NestedBufferBackedObject<T extends Descriptors>(
  descriptors: T
): Descriptor<DecodedBuffer<T>> {
  const size = structSize(descriptors);
  return {
    size,
    get: (dataView, byteOffset) =>
      ArrayOfBufferBackedObjects(dataView.buffer, descriptors, {
        byteOffset,
        length: 1,
      })[0],
    set: (dataView, byteOffset, value) => {
      throw Error("Can’t set an entire struct");
    },
  };
}

export function NestedArrayOfBufferBackedObjects<T extends Descriptors>(
  length: number,
  descriptors: T
): Descriptor<Array<DecodedBuffer<T>>> {
  const size = structSize(descriptors) * length;
  return {
    size,
    get: (dataView, byteOffset) =>
      ArrayOfBufferBackedObjects(dataView.buffer, descriptors, {
        byteOffset: byteOffset + dataView.byteOffset,
        length,
      }),
    set: (dataView, byteOffset, value) => {
      throw Error("Can’t set an entire array");
    },
  };
}

export function UTF8String(maxBytes: number): Descriptor<string> {
  return {
    size: maxBytes,
    get: (dataView, byteOffset) =>
      new TextDecoder()
        .decode(new Uint8Array(dataView.buffer, byteOffset, maxBytes))
        .replace(/\u0000+$/, ""),
    set: (dataView, byteOffset, value) => {
      const encoding = new TextEncoder().encode(value);
      const target = new Uint8Array(dataView.buffer, byteOffset, maxBytes);
      target.fill(0);
      target.set(encoding.subarray(0, maxBytes));
    },
  };
}

export function reserved(size: number): Descriptor<void> {
  return { size, get() {}, set() {} };
}
