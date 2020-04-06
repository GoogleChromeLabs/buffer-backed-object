# `ArrayOfStructsView`

or `Structured DataView`?

Example:
```js
const {buffer} = new Uint8Array([
  ... new Array(18  * 4).fill(0),
  1, 2,
  0, 0,
  0, 0, 128, 63,
  0, 0, 0, 64,
  0, 0, 64, 64,
  3,
  0
]);

self.arrayOfStructs = new ArrayOfStructsView(
  buffer, 
  {
    "id": ArrayOfStructsView.Uint16({endianess: 'little'}),
    "_reserved1": ArrayOfStructsView.reserved(2),
    "x": ArrayOfStructsView.Float32({endianess: 'little'}),
    "y": ArrayOfStructsView.Float32({endianess: 'little'}),
    "z": ArrayOfStructsView.Float32({endianess: 'little'}),
    "textureId": ArrayOfStructsView.Uint8(),
    "_reserved2": ArrayOfStructsView.reserved(1)
  }
);

JSON.stringify(arrayofStructs, null, "  ")
/*
[
  {
    "id": 0,
    "x": 0,
    "y": 0,
    "z": 0,
    "textureId": 0
  },
  {
    "id": 0,
    "x": 0,
    "y": 0,
    "z": 0,
    "textureId": 0
  },
  {
    "id": 0,
    "x": 0,
    "y": 0,
    "z": 0,
    "textureId": 0
  },
  {
    "id": 0,
    "x": 0,
    "y": 0,
    "z": 0,
    "textureId": 0
  },
  {
    "id": 513,
    "x": 1,
    "y": 2,
    "z": 3,
    "textureId": 3
  }
]"
*/
```