import { assert, IsExact } from "conditional-type-checks";

import * as BBO from "./buffer-backed-object.js";

const view = BBO.BufferBackedObject(null as any, {
  id: BBO.Uint16({ endianness: "little" }),
  name: BBO.UTF8String(32),
  position: BBO.NestedBufferBackedObject({
    x: BBO.Float64(),
    y: BBO.Float64(),
    z: BBO.Float64(),
  }),
});

assert<IsExact<typeof view.id, number>>(true);
assert<IsExact<typeof view.name, string>>(true);
assert<IsExact<typeof view.position.x, number>>(true);

const descriptors = {
  id: BBO.Uint16({ endianness: "little" }),
  name: BBO.UTF8String(32),
};
const view2 = BBO.ArrayOfBufferBackedObjects(null as any, descriptors);

assert<IsExact<typeof view2, Array<{ id: number; name: string }>>>(true);
