# `StructuredDataView`

**`StructuredDataView` gives you buffer-backed objects**. It takes a schema definition to make [`ArrayBuffer`][arraybuffer]s more convenient to use and utilizes [`DataView`][dataview] under the hood.

```
npm i -S @surma/structured-data-view
```

## Why?

### Web Workers

When using [Web Workers], the performance of `postMessage()` (or the [structured clone algorithm][structured clone] to be exact) is often a concern. While [`postMessage()` is faster than most people give it credit for][is postmessage slow], it can be a bottle-neck, especially with bigger payloads. `ArrayBuffer` and their [views][arraybufferview] are incredibly quick to clone, or can even be [transferred][transferable]. However, getting data in and out of `ArrayBuffer`s can be quite cumbersome. `StructuredDataView` makes this easy by giving you a (seemingly) normal JavaScript object that reads and write values from the `ArrayBuffer` on demand.

### WebGL

[WebGL Buffers][webgl buffer] can store multiple attribute with different types per vertex using [`vertexAttribPointer()`][vertexattribpointer]. A vertex can have a 3D position, but also other additional data like a normal, a color or a texture ID. These buffers contain all the data for all the vertices in an interleaved format, which can make manipulating that data quite cumbersome. With `ArrayOfStructuredDataViews` you can manipulate the data of invidivual vertices very easily. Additionally, `ArrayOfStructuredDataViews` is lazy (see more below), allowing you to handle big numbers of vertices efficiently.

## Example

`StructuredDataView` interprets the given `ArrayBuffer` as an object with the given schema:

```js
import {StructuredDataView} from "@surma/structured-data-view";

const {buffer} = new ArrayBuffer(100);
const view = new StructuredDataView(buffer, {
  id: StructuredDataView.Uint16({endianess: 'little'}),
  position: StructuredDataView.NestedStructuredDataView({
    x: StructuredDataView.Float32(),
    y: StructuredDataView.Float32(),
    z: StructuredDataView.Float32()
  }),
  normal: StructuredDataView.NestedStructuredDataView({
    x: StructuredDataView.Float32(),
    y: StructuredDataView.Float32(),
    z: StructuredDataView.Float32()
  })
  textureId: ArrayOfStructsView.Uint8(),
});

view.id = 3;
console.log(JSON.stringify(view)); // {"id": 3, ...}
```

`ArrayOfStructuredDataView` interprets the given `ArrayBuffer` as an _array_ of objects with the given schema:

```js
import {ArrayOfStructuredDataViews, StructuredDataView} from "@surma/structured-data-view";

const {buffer} = new ArrayBuffer(100);
const view = new ArrayOfStructuredDataViews(buffer, {
  id: StructuredDataView.Uint16({endianess: 'little'}),
  position: StructuredDataView.NestedStructuredDataView({
    x: StructuredDataView.Float32(),
    y: StructuredDataView.Float32(),
    z: StructuredDataView.Float32()
  }),
  normal: StructuredDataView.NestedStructuredDataView({
    x: StructuredDataView.Float32(),
    y: StructuredDataView.Float32(),
    z: StructuredDataView.Float32()
  })
  textureId: ArrayOfStructsView.Uint8(),
});

// The struct takes up a total of 27 bytes, so
// 3 structs fit into a 100 byte `ArrayBuffer`.
console.log(view.length) // 3
view.id = 3;
JSON.stringify(view); // [{"id": 0, ...}, {"id": 0, ...}, {"id": 3, ...}]
```

## API

The module has the following exports:

### `new StructuredDataView(buffer, descriptors, {byteOffset = 0})`

Returns an object that works on `buffer` at the given `byteOffset`. The properties in the `descriptors` object must be in the same order as they are laid out in the buffer. The returned object has getters and setters for each of these properties. The following descriptor types are provided:

- `StructuredDataView.reserved(numBytes)`: Unused bytes. This field will now show up in the object.
- `StructuredDataView.Int8()`: An 8-bit signed integer
- `StructuredDataView.Uint8()`: An 8-bit unsigned integer
- `StructuredDataView.Int16({endianess = 'big'})`: An 16-bit signed integer
- `StructuredDataView.Uint16({endianess = 'big'})`: An 16-bit unsigned integer
- `StructuredDataView.Int32({endianess = 'big'})`: An 32-bit signed integer
- `StructuredDataView.Uint32({endianess = 'big'})`: An 32-bit unsigned integer
- `StructuredDataView.BigInt64({endianess = 'big'})`: An 64-bit signed [`BigInt`][bigint]
- `StructuredDataView.BigUint64({endianess = 'big'})`: An 64-bit unsigned [`BigInt`][bigint]
- `StructuredDataView.Float32({endianess = 'big'})`: An 32-bit IEEE754 float
- `StructuredDataView.Float64({endianess = 'big'})`: An 64-bit IEEE754 float (“double”)
- `StructuredDataView.UTF8String(maxBytes)`: A UTF-8 encoded string with the given maximum number of bytes. Trailing NULL bytes will be trimmed after decoding.
- `StructuredDataView.ArrayBuffer(size)`: An `ArrayBuffer` of the given size
- `StructuredDataView.NestedStructuredDataView(descriptors)`: A nested `StructuredDataView` with the given descriptors
- `StructuredDataView.NestedArrayOfStructuredDataViews(descriptors)`: A nested `ArrayOfStructuredDataViews` with the given descriptors

### `new ArrayOfStructuredDataViews(buffer, descriptors, {byteOffset = 0, length = 0})`

Like `StructuredDataView`, but returns an _array_ of `StructuredDataView`s. If `length` is 0, as much of the buffer is used as possible. The array is populated lazily under the hood so the `StructuredDataView` objects will only be created when accessed.

### `structSize(descriptors)`

Returns the number of bytes used by the schema outlined by `descriptors`.

## Defining your own descriptor types

All the descriptor functions return an object with the following structure:

```js
{
  size: 4, // Size required by the type
  get(dataView, byteOffset) {
    // Decode the value at byteOffset using
    // `dataView` or `dataView.buffer` and
    // return it.
  },
  set(dataView, byteOffset, value) {
    // Store `value` at `byteOffset` using
    // `dataView` or `dataView.buffer`.
  }
}
```

---

License Apache-2.0

[dataview]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView
[arraybuffer]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
[web workers]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
[structured clone]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
[is postmessage slow]: https://surma.dev/things/is-postmessage-slow/
[arraybufferview]: https://developer.mozilla.org/en-US/docs/Web/API/ArrayBufferView
[transferable]: https://developer.mozilla.org/en-US/docs/Web/API/Transferable
[bigint]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
[webgl buffer]: https://developer.mozilla.org/en-US/docs/Web/API/WebGLBuffer
[vertexattribpointer]: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer
