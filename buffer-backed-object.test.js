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

import {
  ArrayOfBufferBackedObjects,
  BufferBackedObject,
  structSize,
} from "./buffer-backed-object.js";

describe("structSize", function () {
  it("calculates the size of a struct correctly", function () {
    const size = structSize({
      id: BufferBackedObject.Uint8(),
      x: BufferBackedObject.Float64(),
      y: BufferBackedObject.Int16(),
      z: BufferBackedObject.BigUint64(),
      _: BufferBackedObject.reserved(1),
    });
    expect(size).toBe(20);
  });
});

describe("ArrayOfBufferBackedObjects", function () {
  it("calculates length correctly", function () {
    // Add one stray byte
    const { buffer } = new Uint8Array([0, 0, 1, 0, 2, 0, 1]);
    const aosv = new ArrayOfBufferBackedObjects(buffer, {
      id: BufferBackedObject.Uint8(),
      _: BufferBackedObject.reserved(1),
    });
    expect(aosv.length).toBe(3);
  });

  it("decodes items correctly", function () {
    const descriptor = {
      id: BufferBackedObject.Uint8(),
      x: BufferBackedObject.Float64({ endianess: "big" }),
      y: BufferBackedObject.Float64({ endianess: "little" }),
      texture: BufferBackedObject.Int32(),
      _: BufferBackedObject.reserved(1),
    };

    const buffer = new ArrayBuffer(structSize(descriptor) * 2);
    const dataView = new DataView(buffer);
    dataView.setUint8(0 + 0, 1);
    dataView.setUint8(22 + 0, 2);
    dataView.setFloat64(0 + 1, 20, false);
    dataView.setFloat64(0 + 9, 30, true);
    dataView.setFloat64(22 + 1, 40, false);
    dataView.setFloat64(22 + 9, 50, true);
    dataView.setInt32(0 + 17, 9);
    dataView.setInt32(22 + 17, 10);
    const aosv = new ArrayOfBufferBackedObjects(buffer, descriptor);
    expect(aosv[0].id).toBe(1);
    expect(aosv[1].id).toBe(2);
    expect(aosv[0].x).toBe(20);
    expect(aosv[1].x).toBe(40);
    expect(aosv[0].y).toBe(30);
    expect(aosv[1].y).toBe(50);
    expect(aosv[0].texture).toBe(9);
    expect(aosv[1].texture).toBe(10);
  });

  it("can have an offset", function () {
    const descriptor = {
      id: BufferBackedObject.Uint8(),
      _: BufferBackedObject.reserved(1),
    };
    const buffer = new ArrayBuffer(structSize(descriptor) * 4 + 1);
    const dataView = new DataView(buffer);
    const aosv = new ArrayOfBufferBackedObjects(buffer, descriptor, {
      byteOffset: 1,
      length: 2,
    });
    expect(aosv.length).toBe(2);
    aosv[0].id = 1;
    aosv[1].id = 1;
    expect(dataView.getUint8(1)).toBe(1);
  });

  it("handles nested Array of BBOs", function () {
    const descriptors = {
      id: BufferBackedObject.Uint8(),
      vertices: BufferBackedObject.NestedArrayOfBufferBackedObjects(3, {
        x: BufferBackedObject.Float64(),
        y: BufferBackedObject.Float64(),
      }),
    };
    const buffer = new ArrayBuffer(structSize(descriptors) * 3);
    const aosv = new ArrayOfBufferBackedObjects(buffer, descriptors);
    expect(aosv.length).toBe(3);
    aosv[2].id = 1;
    aosv[2].vertices[0].x = 0;
    aosv[2].vertices[0].y = 1;
    aosv[2].vertices[1].x = 2;
    aosv[2].vertices[1].y = 3;
    aosv[2].vertices[2].x = 4;
    aosv[2].vertices[2].y = 5;
    expect(aosv.length).toBe(3);
    expect(JSON.stringify(aosv[2])).toBe(
      JSON.stringify({
        id: 1,
        vertices: [
          { x: 0, y: 1 },
          { x: 2, y: 3 },
          { x: 4, y: 5 },
        ],
      })
    );
  });

  it("handles nested BBO", function () {
    const descriptors = {
      id: BufferBackedObject.Uint8(),
      pos: BufferBackedObject.NestedBufferBackedObject({
        x: BufferBackedObject.Float64(),
        y: BufferBackedObject.Float64(),
      }),
    };
    const buffer = new ArrayBuffer(structSize(descriptors) * 3);
    const aosv = new ArrayOfBufferBackedObjects(buffer, descriptors);
    expect(aosv.length).toBe(3);
    aosv[2].id = 1;
    aosv[2].pos.x = 3;
    aosv[2].pos.y = 2;
    expect(aosv.length).toBe(3);
    expect(JSON.stringify(aosv[2])).toBe(
      JSON.stringify({ id: 1, pos: { x: 3, y: 2 } })
    );
    expect(JSON.stringify(aosv)).toBe(
      JSON.stringify([
        { id: 0, pos: { x: 0, y: 0 } },
        { id: 0, pos: { x: 0, y: 0 } },
        { id: 1, pos: { x: 3, y: 2 } },
      ])
    );
  });

  it("can return the buffer", function () {
    const buffer = new ArrayBuffer(22);
    const aosv = new ArrayOfBufferBackedObjects(buffer, {
      x: BufferBackedObject.Uint8(),
    });
    expect(aosv.buffer).toBe(buffer);
  });

  it("encodes to JSON", function () {
    const { buffer } = new Uint8Array([0, 0, 1, 0, 2, 0, 1]);
    const aosv = new ArrayOfBufferBackedObjects(buffer, {
      id: BufferBackedObject.Uint8(),
      _: BufferBackedObject.reserved(1),
    });
    expect(JSON.stringify(aosv)).toBe(
      JSON.stringify([{ id: 0 }, { id: 1 }, { id: 2 }])
    );
  });

  it("can write items", function () {
    const descriptor = {
      id: BufferBackedObject.Uint8(),
      x: BufferBackedObject.Float64(),
      _: BufferBackedObject.reserved(1),
    };
    const buffer = new ArrayBuffer(structSize(descriptor) * 2);
    const dataView = new DataView(buffer);
    const aosv = new ArrayOfBufferBackedObjects(buffer, descriptor);
    aosv[0].x = 10;
    aosv[1].x = 20;
    expect(dataView.getFloat64(1)).toBe(10);
    expect(dataView.getFloat64(11)).toBe(20);
  });

  it("handles filter()", function () {
    const descriptor = {
      id: BufferBackedObject.Uint8(),
      data: BufferBackedObject.Uint8(),
    };
    const { buffer } = new Uint8Array([0, 10, 1, 11, 2, 12, 3, 13]);
    const aosv = new ArrayOfBufferBackedObjects(buffer, descriptor);
    const even = aosv.filter(({ id }) => id % 2 == 0);
    expect(even.length).toBe(2);
    even[1].data = 99;
    expect(aosv[2].data).toBe(99);
  });

  it("rejects new properties", function () {
    const descriptor = {
      id: BufferBackedObject.Uint8(),
      data: BufferBackedObject.Uint8(),
    };
    const { buffer } = new Uint8Array([0, 10, 1, 11, 2, 12, 3, 13]);
    const aosv = new ArrayOfBufferBackedObjects(buffer, descriptor);
    expect(() => {
      aosv[0].lol = 4;
    }).toThrow();
  });

  it("can handle UTF8 strings", function () {
    const descriptor = {
      name: BufferBackedObject.UTF8String(32),
      id: BufferBackedObject.Uint8(),
    };
    const buffer = new ArrayBuffer(structSize(descriptor) * 2);
    const aosv = new ArrayOfBufferBackedObjects(buffer, descriptor);
    aosv[0].name = "Surma";
    aosv[1].name = "Jason";
    const name1 = new TextDecoder().decode(new Uint8Array(buffer, 0, 5));
    const name2 = new TextDecoder().decode(new Uint8Array(buffer, 33, 5));
    expect(name1).toBe("Surma");
    expect(name2).toBe("Jason");
  });

  it("can be sorted", function () {
    const descriptors = {
      firstKey: BufferBackedObject.UTF8String(80),
      middleKey: BufferBackedObject.ArrayBuffer(10),
    };

    const descriptorSize = structSize(descriptors);

    let randomNames = [
      "bill",
      "mike",
      "dave",
      "kat",
      "brian",
      "adam",
      "sammy",
      "martin",
      "yanaris",
    ];

    const buffer = new ArrayBuffer(descriptorSize * randomNames.length);
    const boar = new ArrayOfBufferBackedObjects(buffer, descriptors);

    // this may be unnecessary for testing
    let randomNumberArrays = [
      [61, 129, 35, 3, 65, 151, 190, 139, 89, 212],
      [43, 196, 83, 213, 118, 216, 142, 132, 220, 85],
      [223, 245, 232, 30, 114, 42, 254, 129, 112, 59],
      [159, 73, 73, 38, 199, 212, 60, 100, 181, 248],
      [22, 197, 38, 37, 46, 139, 77, 202, 181, 183], // dupe
      [178, 69, 33, 61, 59, 53, 116, 117, 66, 81],
      [232, 97, 56, 20, 140, 122, 162, 88, 242, 58],
      [24, 147, 73, 201, 205, 253, 200, 191, 99, 183],
      [22, 197, 38, 37, 46, 139, 77, 202, 181, 183], // dupe
      [190, 154, 53, 52, 94, 109, 131, 101, 43, 172],
      [168, 220, 117, 172, 64, 219, 129, 80, 207, 43],
    ];

    // fill in the BBOs
    for (let i = 0; i < randomNames.length; ++i) {
      // fill the strings
      const bbo = boar[i];
      bbo.firstKey = randomNames[i];

      // fill the arraybuffers
      // let dataView = new DataView(bbo.middleKey);
      // for(let j=0;j<10;++j){
      //   dataView.setUint8(j, randomNumberArrays[i][j]);
      // }
    }

    // our compare function
    function compareFirst(itemA, itemB) {
      if (itemA.firstKey < itemB.firstKey) {
        return -1;
      }
      if (itemA.firstKey > itemB.firstKey) {
        return 1;
      }
      return 0;
    }

    // sort it and get the list of names
    boar.sort(compareFirst);
    let sortedNames = boar.map((bbo) => {
      console.log("mapping name:", bbo.firstKey);
      return bbo.firstKey;
    });
    console.log("sortedNames", sortedNames);

    // the expected order of the names
    let firstKeyOrderedNames = [
      "adam",
      "bill",
      "brian",
      "dave",
      "kat",
      "martin",
      "mike",
      "sammy",
      "yanaris",
    ];

    // check that the boar is sorted via the normal 'get' routine
    for (let i = 0; i < sortedNames; ++i) {
      expect(sortedNames[i]).toBe(firstKeyOrderedNames[i]);
    }

    // check that the boar is sorted via pulling directly from the buffer.
    for (let i = 0; i < boar.length; ++i) {
      let nameInBuffer = new TextDecoder()
        .decode(new Uint8Array(boar.buffer, i * 100, 80))
        .replace(/\u0000+$/, "");
      console.log("name in buffer", nameInBuffer);
      expect(nameInBuffer).toBe(firstKeyOrderedNames[i]);
    }
  });
});

describe("StructuredDataView", function () {
  it("decodes items correctly", function () {
    const descriptor = {
      id: BufferBackedObject.Uint8(),
      x: BufferBackedObject.Float64({ endianess: "big" }),
      y: BufferBackedObject.Float64({ endianess: "little" }),
      texture: BufferBackedObject.Int32(),
      _: BufferBackedObject.reserved(1),
    };

    const buffer = new ArrayBuffer(structSize(descriptor));
    const dataView = new DataView(buffer);
    dataView.setUint8(0 + 0, 1);
    dataView.setFloat64(0 + 1, 20, false);
    dataView.setFloat64(0 + 9, 30, true);
    dataView.setInt32(0 + 17, 9);
    const sdv = new BufferBackedObject(buffer, descriptor);
    expect(sdv.id).toBe(1);
    expect(sdv.x).toBe(20);
    expect(sdv.y).toBe(30);
    expect(sdv.texture).toBe(9);
  });
});
