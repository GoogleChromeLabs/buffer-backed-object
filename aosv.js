/**
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Like `isNaN` but returns `true` for symbols.
function betterIsNaN(s) {
  if (typeof s === "symbol") {
    return true;
  }
  return isNaN(s);
}

export function structSize(descriptors) {
  let stride = 0;
  for (const { size } of Object.values(descriptors)) {
    stride += size;
  }
  return stride;
}

export function ArrayOfStructsView(
  buffer,
  descriptors,
  { byteOffset = 0, length = 0 } = {}
) {
  const dataView = new DataView(buffer, byteOffset);
  // Accumulate the size of one struct
  let stride = 0;
  // Copy
  descriptors = Object.assign({}, descriptors);
  for (const [name, descriptor] of Object.entries(descriptors)) {
    // Copy second layer and add offset property
    descriptors[name] = Object.assign({}, descriptor, { offset: stride });
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
      if (!betterIsNaN(propName)) {
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
      if (betterIsNaN(propName)) {
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
      if (!target[idx]) {
        target[idx] = {};
        for (const [name, descriptor] of Object.entries(descriptors)) {
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
            }
          });
        }
        Object.freeze(target[idx]);
      }
      return target[idx];
    }
  });
}

[
  "Uint16",
  "Uint32",
  "Int16",
  "Int32",
  "Float32",
  "Float64",
  "BigInt64",
  "BigUint64"
].forEach(name => {
  ArrayOfStructsView[name] = ({ endianess = "big" } = {}) => {
    if (endianess !== "big" && endianess !== "little") {
      throw Error("Endianess needs to be either 'big' or 'little'");
    }
    const littleEndian = endianess === "little";
    return {
      size: self[`${name}Array`].BYTES_PER_ELEMENT,
      get: (dataView, byteOffset) =>
        dataView[`get${name}`](byteOffset, littleEndian),
      set: (dataView, byteOffset, value) =>
        dataView[`set${name}`](byteOffset, value, littleEndian)
    };
  };
});

ArrayOfStructsView.Uint8 = () => ({
  size: 1,
  get: (dataView, byteOffset) => dataView.getUint8(byteOffset),
  set: (dataView, byteOffset, value) => dataView.setUint8(byteOffset, value)
});

ArrayOfStructsView.reserved = size => ({ size });

export default ArrayOfStructsView;
