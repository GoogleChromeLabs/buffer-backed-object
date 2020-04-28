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

export type Descriptor<T = any> = {
  size: number;
  get(dataview: DataView, byteOffset: number): T;
  set(dataview: DataView, byteOffset: number, value: T): void;
};

export type Descriptors = {
  [key: string]: Descriptor<any>;
};

export type DecodedBuffer<E extends Descriptors> = {
  [K in keyof E]: ReturnType<E[K]["get"]>;
};

export function structSize(descriptors: Descriptors): number;

export interface BufferBackedObjectOptions {
  byteOffset?: number;
}

type EndianOption = {
  endianess?: "big" | "little";
};

export const BufferBackedObject: {
  new <T extends Descriptors>(
    buffer: ArrayBuffer,
    descriptor: T,
    opts?: BufferBackedObjectOptions
  ): DecodedBuffer<T>;
  reserved(numBytes: number): Descriptor<number>;
  Int8(): Descriptor<number>;
  Uint8(): Descriptor<number>;
  Int16(options?: EndianOption): Descriptor<number>;
  Uint16(options?: EndianOption): Descriptor<number>;
  Int32(options?: EndianOption): Descriptor<number>;
  Uint32(options?: EndianOption): Descriptor<number>;
  BigInt64(options?: EndianOption): Descriptor<number>;
  BigUint64(options?: EndianOption): Descriptor<number>;
  Float32(options?: EndianOption): Descriptor<number>;
  Float64(options?: EndianOption): Descriptor<number>;
  UTF8String(maxBytes: number): Descriptor<string>;
  ArrayBuffer(size: number): Descriptor<ArrayBuffer>;
  NestedBufferBackedObject<E extends Descriptors>(
    descriptors: E
  ): Descriptor<DecodedBuffer<E>>;
  NestedArrayOfBufferBackedObjects<A extends Descriptors>(
    numItems: number,
    descriptors: A
  ): Descriptor<Array<DecodedBuffer<A>>>;
};

export interface ArrayOfBufferBackedObjectsOptions {
  byteOffset?: number;
  length?: number;
}

export const ArrayOfBufferBackedObjects: {
  new <T extends Descriptors>(
    buffer: ArrayBuffer,
    descriptors: T,
    options?: ArrayOfBufferBackedObjectsOptions
  ): Array<DecodedBuffer<T>>;
};

export default BufferBackedObject;