import { assert, IsExact } from "conditional-type-checks";

import { BufferBackedObject, ArrayOfBufferBackedObjects } from ".";

const view = new BufferBackedObject(null as any, {
  id: BufferBackedObject.Uint16({ endianness: "little" }),
  name: BufferBackedObject.UTF8String(32),
  data: BufferBackedObject.ArrayBuffer(100),
  position: BufferBackedObject.NestedBufferBackedObject({
    x: BufferBackedObject.Float64(),
    y: BufferBackedObject.Float64(),
    z: BufferBackedObject.Float64(),
  }),
});

assert<IsExact<typeof view.id, number>>(true);
assert<IsExact<typeof view.name, string>>(true);
assert<IsExact<typeof view.data, ArrayBuffer>>(true);
assert<IsExact<typeof view.position.x, number>>(true);

const descriptors = {
  id: BufferBackedObject.Uint16({ endianness: "little" }),
  name: BufferBackedObject.UTF8String(32),
};
const view2 = new ArrayOfBufferBackedObjects(null as any, descriptors);

assert<IsExact<typeof view2, Array<{ id: number; name: string }>>>(true);
