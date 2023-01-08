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
      x: BufferBackedObject.Float64({ endianness: "big" }),
      y: BufferBackedObject.Float64({ endianness: "little" }),
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
    dataView.setInt32(0 + 17, 9, true);
    dataView.setInt32(22 + 17, 10, true);
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

  it("handles nested BBO with nested arrays", function () {
    const PathNodeDescription = {
      type: BufferBackedObject.Uint8(),
      x: BufferBackedObject.Uint32(),
      y: BufferBackedObject.Uint32(),
    };

    const EnemyDescription = {
      type: BufferBackedObject.Uint8(),
      x: BufferBackedObject.Float32(),
      y: BufferBackedObject.Float32(),
      path: BufferBackedObject.NestedArrayOfBufferBackedObjects(
        1,
        PathNodeDescription
      ),
    };

    const GameStateDescription = {
      gametime: BufferBackedObject.Uint32(),
      season: BufferBackedObject.Uint8(),
      enemies: BufferBackedObject.NestedArrayOfBufferBackedObjects(
        1,
        EnemyDescription
      ),
    };
    const gameStateBuffer = new ArrayBuffer(structSize(GameStateDescription));
    const gameState = new BufferBackedObject(
      gameStateBuffer,
      GameStateDescription
    );

    gameState.gametime = 12345;
    gameState.season = 3;

    expect(gameState.enemies.length).toBe(1);
    gameState.enemies[0].type = 1;
    gameState.enemies[0].x = 512;
    gameState.enemies[0].y = 0;
    expect(gameState.enemies.length).toBe(1);
    expect(JSON.stringify(gameState.enemies[0])).toBe(
      JSON.stringify({ type: 1, x: 512, y: 0, path: [{ type: 0, x: 0, y: 0 }] })
    );
    expect(JSON.stringify(gameState)).toBe(
      JSON.stringify({
        gametime: 12345,
        season: 3,
        enemies: [{ type: 1, x: 512, y: 0, path: [{ type: 0, x: 0, y: 0 }] }],
      })
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
    expect(dataView.getFloat64(1, true)).toBe(10);
    expect(dataView.getFloat64(11, true)).toBe(20);
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
});

describe("StructuredDataView", function () {
  it("decodes items correctly", function () {
    const descriptor = {
      id: BufferBackedObject.Uint8(),
      x: BufferBackedObject.Float64({ endianness: "big" }),
      y: BufferBackedObject.Float64({ endianness: "little" }),
      texture: BufferBackedObject.Int32(),
      _: BufferBackedObject.reserved(1),
    };

    const buffer = new ArrayBuffer(structSize(descriptor));
    const dataView = new DataView(buffer);
    dataView.setUint8(0 + 0, 1);
    dataView.setFloat64(0 + 1, 20, false);
    dataView.setFloat64(0 + 9, 30, true);
    dataView.setInt32(0 + 17, 9, true);
    const sdv = new BufferBackedObject(buffer, descriptor);
    expect(sdv.id).toBe(1);
    expect(sdv.x).toBe(20);
    expect(sdv.y).toBe(30);
    expect(sdv.texture).toBe(9);
  });
});
