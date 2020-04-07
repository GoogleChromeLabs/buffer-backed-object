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
  ArrayOfStructuredDataViews,
  StructuredDataView,
  structSize
} from "./structured-data-view.js";

describe("ArrayOfStructuredDataViews", function() {
  it("calculates the size of a struct correctly", function() {
    const size = structSize({
      id: StructuredDataView.Uint8(),
      x: StructuredDataView.Float64(),
      y: StructuredDataView.Int16(),
      z: StructuredDataView.BigUint64(),
      _: StructuredDataView.reserved(1)
    });
    expect(size).toBe(20);
  });

  it("calculates length correctly", function() {
    // Add one stray byte
    const { buffer } = new Uint8Array([0, 0, 1, 0, 2, 0, 1]);
    const aosv = new ArrayOfStructuredDataViews(buffer, {
      id: StructuredDataView.Uint8(),
      _: StructuredDataView.reserved(1)
    });
    expect(aosv.length).toBe(3);
  });

  it("decodes items correctly", function() {
    const descriptor = {
      id: StructuredDataView.Uint8(),
      x: StructuredDataView.Float64({ endianess: "big" }),
      y: StructuredDataView.Float64({ endianess: "little" }),
      texture: StructuredDataView.Int32(),
      _: StructuredDataView.reserved(1)
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
    const aosv = new ArrayOfStructuredDataViews(buffer, descriptor);
    expect(aosv[0].id).toBe(1);
    expect(aosv[1].id).toBe(2);
    expect(aosv[0].x).toBe(20);
    expect(aosv[1].x).toBe(40);
    expect(aosv[0].y).toBe(30);
    expect(aosv[1].y).toBe(50);
    expect(aosv[0].texture).toBe(9);
    expect(aosv[1].texture).toBe(10);
  });

  it("can have an offset", function() {
    const descriptor = {
      id: StructuredDataView.Uint8(),
      _: StructuredDataView.reserved(1)
    };
    const buffer = new ArrayBuffer(structSize(descriptor) * 4 + 1);
    const dataView = new DataView(buffer);
    const aosv = new ArrayOfStructuredDataViews(buffer, descriptor, {
      byteOffset: 1,
      length: 2
    });
    expect(aosv.length).toBe(2);
    aosv[0].id = 1;
    aosv[1].id = 1;
    expect(dataView.getUint8(1)).toBe(1);
  });

  it("handles nested AOSV", function() {
    const descriptors = {
      id: StructuredDataView.Uint8(),
      vertices: StructuredDataView.ArrayOfStructuredDataViews(3, {
        x: StructuredDataView.Float64(),
        y: StructuredDataView.Float64()
      })
    };
    const buffer = new ArrayBuffer(structSize(descriptors) * 3);
    const aosv = new ArrayOfStructuredDataViews(buffer, descriptors);
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
        vertices: [{ x: 0, y: 1 }, { x: 2, y: 3 }, { x: 4, y: 5 }]
      })
    );
  });

  it("handles nested structures", function() {
    const descriptors = {
      id: StructuredDataView.Uint8(),
      pos: StructuredDataView.StructuredDataView({
        x: StructuredDataView.Float64(),
        y: StructuredDataView.Float64()
      })
    };
    const buffer = new ArrayBuffer(structSize(descriptors) * 3);
    const aosv = new ArrayOfStructuredDataViews(buffer, descriptors);
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
        { id: 1, pos: { x: 3, y: 2 } }
      ])
    );
  });

  it("can return the buffer", function() {
    const buffer = new ArrayBuffer(22);
    const aosv = new ArrayOfStructuredDataViews(buffer, {
      x: StructuredDataView.Uint8()
    });
    expect(aosv.buffer).toBe(buffer);
  });

  it("encodes to JSON", function() {
    const { buffer } = new Uint8Array([0, 0, 1, 0, 2, 0, 1]);
    const aosv = new ArrayOfStructuredDataViews(buffer, {
      id: StructuredDataView.Uint8(),
      _: StructuredDataView.reserved(1)
    });
    expect(JSON.stringify(aosv)).toBe(
      JSON.stringify([{ id: 0 }, { id: 1 }, { id: 2 }])
    );
  });

  it("can write items", function() {
    const descriptor = {
      id: StructuredDataView.Uint8(),
      x: StructuredDataView.Float64(),
      _: StructuredDataView.reserved(1)
    };
    const buffer = new ArrayBuffer(structSize(descriptor) * 2);
    const dataView = new DataView(buffer);
    const aosv = new ArrayOfStructuredDataViews(buffer, descriptor);
    aosv[0].x = 10;
    aosv[1].x = 20;
    expect(dataView.getFloat64(1)).toBe(10);
    expect(dataView.getFloat64(11)).toBe(20);
  });

  it("handles filter()", function() {
    const descriptor = {
      id: StructuredDataView.Uint8(),
      data: StructuredDataView.Uint8(1)
    };
    const { buffer } = new Uint8Array([0, 10, 1, 11, 2, 12, 3, 13]);
    const aosv = new ArrayOfStructuredDataViews(buffer, descriptor);
    const even = aosv.filter(({ id }) => id % 2 == 0);
    expect(even.length).toBe(2);
    even[1].data = 99;
    expect(aosv[2].data).toBe(99);
  });

  it("rejects new properties", function() {
    const descriptor = {
      id: StructuredDataView.Uint8(),
      data: StructuredDataView.Uint8(1)
    };
    const { buffer } = new Uint8Array([0, 10, 1, 11, 2, 12, 3, 13]);
    const aosv = new ArrayOfStructuredDataViews(buffer, descriptor);
    expect(() => {
      aosv[0].lol = 4;
    }).toThrow();
  });
});

describe("StructuredDataView", function() {
  it("decodes items correctly", function() {
    const descriptor = {
      id: StructuredDataView.Uint8(),
      x: StructuredDataView.Float64({ endianess: "big" }),
      y: StructuredDataView.Float64({ endianess: "little" }),
      texture: StructuredDataView.Int32(),
      _: StructuredDataView.reserved(1)
    };

    const buffer = new ArrayBuffer(structSize(descriptor));
    const dataView = new DataView(buffer);
    dataView.setUint8(0 + 0, 1);
    dataView.setFloat64(0 + 1, 20, false);
    dataView.setFloat64(0 + 9, 30, true);
    dataView.setInt32(0 + 17, 9);
    const sdv = new StructuredDataView(buffer, descriptor);
    expect(sdv.id).toBe(1);
    expect(sdv.x).toBe(20);
    expect(sdv.y).toBe(30);
    expect(sdv.texture).toBe(9);
  });
});
